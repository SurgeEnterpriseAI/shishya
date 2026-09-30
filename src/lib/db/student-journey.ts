// Cross-session memory layer for the tutor.
//
// Every chat call gets a compact "Recent journey" snapshot so Shishya can
// reference what the student has been working on across previous chat
// sessions, mocks, and overnight briefs. Without this the tutor only sees
// the current session's transcript and feels like a stateless wrapper.
//
// Cost: ~700 tokens added to the dynamic (uncached) block per call. Capped
// at hard limits below so we never explode the budget.
//
// 30 Sep 2026 ("the tutor remembers"; why and rules in src/lib/tutor-memory.ts):
// 30 days instead of 14, the student's own typed questions (up to 8 threads)
// marked answered or not, mistake-review openers folded into one line, the
// weak topics they chose to ask about. `examCode` null = a general chat: the
// memory is loaded by userId only, with no brief, mock, topic codes or
// actions. The conversation being continued is left out (its turns are
// already the history), and so are school sessions — a Class 8-12 chat stays
// inside the school chat. Reads: the sessions (no message text), the
// student's own rows' text, and the tutor rows' metadata (never their text).

import { prisma } from "./prisma";
import { NOT_SCHOOL_WHERE, realExamKey } from "./exam-scope";
import { istDayNumber } from "@/lib/exam-phase";
import { MEMORY_WINDOW_DAYS, summariseChatMemory, type MemorySession, type TutorJourney } from "@/lib/tutor-memory";

/** Sessions scanned for memory (most recently active first). */
const MAX_SESSIONS = 30;
/** Rows read across those sessions (metadata / the student's text only). */
const MAX_ROWS = 600;

export type StudentJourney = TutorJourney;

export async function getStudentJourney(
  userId: string,
  examCode: string | null,
  opts: { excludeSessionId?: string | null } = {},
): Promise<StudentJourney> {
  const since = new Date(Date.now() - MEMORY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  // The daily brief's key: the IST day (midnight UTC of that calendar day).
  const todayUtc = new Date(istDayNumber(new Date()) * 86_400_000);

  const exam = examCode
    ? await prisma.exam.findUnique({
        where: realExamKey({ code: examCode }),
        select: { id: true },
      })
    : null;
  if (examCode && !exam) {
    return {
      examCode,
      threads: [],
      topAskedTopics: [],
      todayBrief: null,
      lastMock: null,
      openActions: [],
    };
  }

  const [sessions, todayBrief, lastMock] = await Promise.all([
    // The student's conversations active in the window (updatedAt moves
    // when a saved chat is continued — src/app/api/chat/route.ts), real
    // exams and general only.
    prisma.chatSession.findMany({
      where: {
        userId,
        updatedAt: { gte: since },
        ...(opts.excludeSessionId ? { id: { not: opts.excludeSessionId } } : {}),
        OR: [{ examId: null }, { exam: NOT_SCHOOL_WHERE }],
      },
      select: { id: true, updatedAt: true, exam: { select: { shortName: true } } },
      orderBy: { updatedAt: "desc" },
      take: MAX_SESSIONS,
    }),
    // Today's brief for the active exam (the cron writes one per user-exam
    // overnight; we surface its reflection so the tutor can pick up on it).
    exam
      ? prisma.dailyBrief.findFirst({
          where: { userId, examId: exam.id, briefDate: todayUtc },
          include: { mock: { select: { title: true } } },
        })
      : Promise.resolve(null),
    // Last submitted attempt for this exam — used for "earlier today you
    // scored X on Y mock" style references.
    examCode
      ? prisma.attempt.findFirst({
          where: {
            userId,
            mock: { exam: { code: examCode } },
            status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
            scorePct: { not: null },
          },
          orderBy: { startedAt: "desc" },
          select: {
            startedAt: true,
            scorePct: true,
            mock: { select: { title: true, exam: { select: { shortName: true } } } },
          },
        })
      : Promise.resolve(null),
  ]);

  const ids = sessions.map((s) => s.id);
  const [rows, userText] = ids.length
    ? await Promise.all([
        // Every row's role, time and metadata — no text (the tutor's replies are long).
        prisma.chatMessage.findMany({
          where: { sessionId: { in: ids } },
          orderBy: { createdAt: "desc" },
          take: MAX_ROWS,
          select: { sessionId: true, role: true, createdAt: true, metadata: true },
        }),
        // The student's own messages (at most 2,000 characters each).
        prisma.chatMessage.findMany({
          where: { sessionId: { in: ids }, role: "USER" },
          orderBy: { createdAt: "desc" },
          take: MAX_ROWS,
          select: { sessionId: true, content: true },
        }),
      ])
    : [[], []];

  // Newest rows were read first (so a cut drops the oldest); walk them oldest first.
  rows.reverse();
  userText.reverse();

  const bySession = new Map<string, MemorySession>();
  for (const s of sessions) {
    bySession.set(s.id, {
      id: s.id,
      lastAt: s.updatedAt,
      examShort: s.exam?.shortName ?? "",
      userRows: [],
      lastRole: null,
      assistantMeta: [],
    });
  }
  for (const r of rows) {
    const m = bySession.get(r.sessionId);
    if (!m) continue;
    m.lastRole = r.role;
    if (r.createdAt > m.lastAt) m.lastAt = r.createdAt;
    if (r.role === "ASSISTANT") m.assistantMeta.push(r.metadata);
  }
  for (const u of userText) bySession.get(u.sessionId)?.userRows.push({ content: u.content });

  const memory = summariseChatMemory(
    [...bySession.values()].filter((s) => s.lastRole != null),
    { exam: examCode != null },
  );

  return {
    examCode,
    ...memory,
    todayBrief: todayBrief
      ? {
          reflection: todayBrief.reflection ?? "",
          mockTitle: todayBrief.mock?.title ?? null,
        }
      : null,
    lastMock: lastMock
      ? {
          date: lastMock.startedAt.toISOString(),
          scorePct: lastMock.scorePct ?? 0,
          mockTitle: lastMock.mock.title,
          examShort: lastMock.mock.exam.shortName,
        }
      : null,
  };
}

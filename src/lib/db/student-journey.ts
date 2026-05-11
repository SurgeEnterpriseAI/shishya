// Cross-session memory layer for the tutor.
//
// Every chat call gets a compact "Recent journey" snapshot so Shishya can
// reference what the student has been working on across previous chat
// sessions, mocks, and overnight briefs. Without this the tutor only sees
// the current session's transcript and feels like a stateless wrapper.
//
// Cost: ~700 tokens added to the dynamic (uncached) block per call. Capped
// at hard limits below so we never explode the budget.

import { prisma } from "./prisma";

const MAX_THREADS = 5;            // how many recent sessions to surface
const MAX_TOPICS = 8;             // how many distinct topics to list
const MAX_ACTIONS = 4;            // how many open recommended actions
const JOURNEY_WINDOW_DAYS = 14;   // look-back window for chat memory
const OPENING_CHARS = 140;        // how many chars of the opening message to keep

export interface StudentJourney {
  examCode: string;
  threads: Array<{
    sessionId: string;
    startedAt: string;
    examShort: string;
    openingMessage: string;
    topicCodes: string[];
  }>;
  topAskedTopics: Array<{ topicCode: string; count: number }>;
  todayBrief: { reflection: string; mockTitle: string | null } | null;
  lastMock: { date: string; scorePct: number; mockTitle: string; examShort: string } | null;
  openActions: Array<{ kind: string; topicCode?: string; reason: string }>;
}

export async function getStudentJourney(
  userId: string,
  examCode: string,
): Promise<StudentJourney> {
  const since = new Date(Date.now() - JOURNEY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const todayUtc = (() => {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  })();

  const exam = await prisma.exam.findUnique({
    where: { code: examCode },
    select: { id: true },
  });
  if (!exam) {
    return {
      examCode,
      threads: [],
      topAskedTopics: [],
      todayBrief: null,
      lastMock: null,
      openActions: [],
    };
  }

  const [chatThreads, todayBrief, lastMock] = await Promise.all([
    // Chat threads in the look-back window. Pull the opening user message
    // and up to a few assistant messages so we can mine tool_use topic codes
    // and any pending suggestedActions.
    prisma.chatSession.findMany({
      where: { userId, createdAt: { gte: since } },
      include: {
        exam: { select: { shortName: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 8,
          select: { role: true, content: true, metadata: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: MAX_THREADS,
    }),
    // Today's brief for the active exam (the cron writes one per user-exam
    // overnight; we surface its reflection so the tutor can pick up on it).
    prisma.dailyBrief.findFirst({
      where: { userId, examId: exam.id, briefDate: todayUtc },
      include: { mock: { select: { title: true } } },
    }),
    // Last submitted attempt for this exam — used for "earlier today you
    // scored X on Y mock" style references.
    prisma.attempt.findFirst({
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
    }),
  ]);

  const threads: StudentJourney["threads"] = [];
  const topicCounts = new Map<string, number>();
  const seenActions = new Map<string, { kind: string; topicCode?: string; reason: string }>();

  for (const t of chatThreads) {
    const opener = t.messages.find((m) => m.role === "USER");
    const topicCodes = new Set<string>();
    for (const m of t.messages) {
      const md = m.metadata as any;
      const calls = (md?.toolCalls ?? []) as Array<{ args?: any }>;
      for (const c of calls) {
        const code = c?.args?.topic_code;
        if (typeof code === "string") {
          topicCodes.add(code);
          topicCounts.set(code, (topicCounts.get(code) ?? 0) + 1);
        }
      }
      const actions = (md?.actions ?? []) as Array<{
        kind?: string;
        topicCode?: string;
        reason?: string;
      }>;
      for (const a of actions) {
        if (!a?.kind || !a?.reason) continue;
        const key = `${a.kind}|${a.topicCode ?? ""}|${a.reason}`;
        if (!seenActions.has(key)) {
          seenActions.set(key, {
            kind: a.kind,
            topicCode: a.topicCode,
            reason: a.reason,
          });
        }
      }
    }
    threads.push({
      sessionId: t.id,
      startedAt: t.createdAt.toISOString(),
      examShort: t.exam?.shortName ?? "",
      openingMessage:
        (opener?.content ?? "").slice(0, OPENING_CHARS) +
        ((opener?.content?.length ?? 0) > OPENING_CHARS ? "…" : ""),
      topicCodes: [...topicCodes].slice(0, 4),
    });
  }

  const topAskedTopics = [...topicCounts.entries()]
    .map(([topicCode, count]) => ({ topicCode, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_TOPICS);

  return {
    examCode,
    threads,
    topAskedTopics,
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
    openActions: [...seenActions.values()].slice(0, MAX_ACTIONS),
  };
}

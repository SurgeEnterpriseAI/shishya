// DB reads behind "Pick up where you left off" (30 Sep 2026) — rules and why
// in src/lib/pickup.ts. Every read is the member's OWN rows (userId in every
// where); nothing here writes. No school session and no school attempt is
// ever read: the chat reads and the attempt read keep to general chats and
// ACTIVE real exams (REAL_EXAM_WHERE / REAL_EXAM_SQL — a school container is
// never one), and a keyed exam scope (the hub strip) is an exam the caller
// already resolved through realExamKey.

import { prisma } from "./prisma";
import { REAL_EXAM_SQL, REAL_EXAM_WHERE, isSchoolCategory } from "./exam-scope";
import { isTypedQuestion } from "@/lib/tutor-memory";
import { reviewTagOf } from "@/lib/recent-chats";
import {
  PICKUP_ANSWERED_DAYS,
  PICKUP_CHAT_DAYS,
  PICKUP_MOCK_DAYS,
  EMAIL_QUOTE_MAX_DAYS,
  pickEmailQuestion,
  pickLateAnswer,
  type EmailQuestionRow,
  type PickupData,
  type PickupLateAnswer,
  type PickupMock,
  type PickupThread,
} from "@/lib/pickup";
import { LATE_HARD_STOP_MS } from "@/lib/tutor-late-answer";

const DAY_MS = 86_400_000;
/** The student's own rows read back from the newest conversation, to find their last typed one. */
const USER_ROWS_READ = 10;
/** Rows per member the mail loader reads, newest first. */
const EMAIL_ROWS_PER_USER = 12;

export interface PickupScope {
  /** One real exam (the hub strip); omitted = general chats and every active real exam. */
  examId?: string | null;
  now?: Date;
}

/** The conversation of the member's latest question (PICKUP_CHAT_DAYS), or null. */
export async function loadPickupThread(userId: string, scope: PickupScope = {}): Promise<PickupThread | null> {
  const now = scope.now ?? new Date();
  const since = new Date(now.getTime() - PICKUP_CHAT_DAYS * DAY_MS);
  const latest = await prisma.chatMessage.findFirst({
    where: {
      role: "USER",
      createdAt: { gte: since },
      session: {
        userId,
        ...(scope.examId ? { examId: scope.examId } : { OR: [{ examId: null }, { exam: REAL_EXAM_WHERE }] }),
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      sessionId: true,
      session: {
        select: {
          userId: true,
          contextSnapshot: true,
          exam: { select: { code: true, shortName: true, category: true } },
        },
      },
    },
  });
  if (!latest || latest.session.userId !== userId) return null;
  // Second guard for the where above: never a school conversation.
  if (latest.session.exam && isSchoolCategory(latest.session.exam.category)) return null;
  const sessionId = latest.sessionId;
  const [userRows, lastRow, opener] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { sessionId, role: "USER" },
      orderBy: { createdAt: "desc" },
      take: USER_ROWS_READ,
      select: { content: true },
    }),
    prisma.chatMessage.findFirst({
      where: { sessionId, role: { in: ["USER", "ASSISTANT"] } },
      orderBy: { createdAt: "desc" },
      select: { role: true, content: true, createdAt: true },
    }),
    prisma.chatMessage.findFirst({
      where: { sessionId, role: "USER" },
      orderBy: { createdAt: "asc" },
      select: { content: true },
    }),
  ]);
  if (!lastRow || userRows.length === 0) return null;
  return {
    sessionId,
    examCode: latest.session.exam?.code ?? null,
    examShort: latest.session.exam?.shortName ?? null,
    lastAt: lastRow.createdAt,
    lastRole: String(lastRow.role),
    lastContent: lastRow.content ?? "",
    opener: opener?.content ?? null,
    lastUser: userRows[0].content,
    lastTyped: userRows.find((r) => isTypedQuestion(r.content))?.content ?? null,
    reviewMockTitle: reviewTagOf(latest.session.contextSnapshot)?.mockTitle ?? null,
  };
}

/** The member's last finished mock (PICKUP_MOCK_DAYS) on an active real exam — or on `examId` — or null.
 *  30 Sep 2026 (review): ACTIVE real exams, as the thread read — not every
 *  non-school exam. A mock on a since-retired exam put "Ask the tutor" links
 *  to /chat?examCode=<retired>, which the chat does not open for that exam
 *  (no auto-enrol), so the weak-topic seed landed in another chat. */
export async function loadPickupMock(userId: string, scope: PickupScope = {}): Promise<PickupMock | null> {
  const now = scope.now ?? new Date();
  const since = new Date(now.getTime() - PICKUP_MOCK_DAYS * DAY_MS);
  const a = await prisma.attempt.findFirst({
    where: {
      userId,
      status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
      finishedAt: { gte: since },
      mock: scope.examId ? { examId: scope.examId } : { exam: REAL_EXAM_WHERE },
    },
    orderBy: { finishedAt: "desc" },
    select: {
      id: true,
      userId: true,
      scorePct: true,
      finishedAt: true,
      topicScores: true,
      mock: { select: { title: true, exam: { select: { code: true, shortName: true, category: true } } } },
    },
  });
  if (!a || a.userId !== userId || !a.finishedAt) return null;
  if (isSchoolCategory(a.mock.exam.category)) return null;
  return {
    attemptId: a.id,
    mockTitle: a.mock.title,
    scorePct: a.scorePct == null ? null : Number(a.scorePct),
    finishedAt: a.finishedAt,
    examCode: a.mock.exam.code,
    examShort: a.mock.exam.shortName,
    topicScores: a.topicScores,
  };
}

/**
 * The member's latest late answer they have not opened (1 Oct 2026, rules in
 * src/lib/pickup.ts pickLateAnswer), with the question it answers, or null.
 * Same scope as the thread read: general chats and active real exams (or the
 * hub's one exam), never a school chat. The reply row is dated right after
 * its question, so the read looks back PICKUP_ANSWERED_DAYS plus the longest
 * a question can wait for its late answer, and judges by
 * metadata.lateAnsweredAt.
 * 2 Oct 2026 (review of build 7b): that wait was the 72-hour window
 * (LATE_WINDOW_MS). Since 7b the 72 hours run from the student's last send,
 * so an answer can come up to 7 days after the question was first stored
 * (LATE_HARD_STOP_MS). With the old floor an answer given 3 to 7 days after
 * the question left the card early, and one given after day 6 never showed
 * on it (the chat note and the mail still told the student).
 */
export async function loadPickupLateAnswer(userId: string, scope: PickupScope = {}): Promise<PickupLateAnswer | null> {
  const now = scope.now ?? new Date();
  const since = new Date(now.getTime() - PICKUP_ANSWERED_DAYS * DAY_MS - LATE_HARD_STOP_MS);
  const rows = await prisma.chatMessage.findMany({
    where: {
      role: "ASSISTANT",
      createdAt: { gte: since },
      metadata: { path: ["lateAnswer"], equals: true },
      session: {
        userId,
        ...(scope.examId ? { examId: scope.examId } : { OR: [{ examId: null }, { exam: REAL_EXAM_WHERE }] }),
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      sessionId: true,
      createdAt: true,
      metadata: true,
      session: { select: { userId: true, exam: { select: { code: true, shortName: true, category: true } } } },
    },
  });
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const pick = pickLateAnswer(
    rows
      .filter((r) => r && r.session)
      .map((r) => ({
        sessionId: r.sessionId,
        metadata: r.metadata,
        ownerId: r.session.userId,
        examCode: r.session.exam?.code ?? null,
        examShort: r.session.exam?.shortName ?? null,
        examCategory: r.session.exam ? String(r.session.exam.category) : null,
      })),
    userId,
    now,
  );
  if (!pick) return null;
  const reply = rows.find((r) => r.sessionId === pick.sessionId && (r.metadata as Record<string, unknown> | null)?.lateAnsweredAt === pick.answeredAt.getTime());
  const question = reply
    ? await prisma.chatMessage.findFirst({
        where: { sessionId: pick.sessionId, role: "USER", createdAt: { lt: reply.createdAt } },
        orderBy: { createdAt: "desc" },
        select: { content: true },
      })
    : null;
  return { ...pick, question: question?.content ?? null };
}

/** The halves of the card, read in parallel; each best-effort (a failed read shows none). */
export async function loadPickup(userId: string, scope: PickupScope = {}): Promise<PickupData> {
  const [thread, mock, lateAnswer] = await Promise.all([
    loadPickupThread(userId, scope).catch((err) => {
      console.error("[pickup] thread read failed:", err);
      return null;
    }),
    loadPickupMock(userId, scope).catch((err) => {
      console.error("[pickup] mock read failed:", err);
      return null;
    }),
    loadPickupLateAnswer(userId, scope).catch((err) => {
      console.error("[pickup] late answer read failed:", err);
      return null;
    }),
  ]);
  return { thread, mock, lateAnswer };
}

type EmailRow = {
  userId: string;
  sessionId: string;
  code: string | null;
  content: string;
  createdAt: Date;
  answered: boolean;
  isLastUser: boolean;
};

/**
 * The mail line's question for each member: their latest TYPED question in
 * the last EMAIL_QUOTE_MAX_DAYS + 1 days (general chats and active real
 * exams only), with whether a non-empty tutor reply is stored after it and
 * whether it is still its conversation's last student turn (isLastUser —
 * only then can the chat's Retry ask it again; review, 30 Sep 2026). One
 * query for the whole batch; members with none are absent from the map. A
 * failed read returns an empty map (the mails go out without the line).
 */
export async function loadEmailQuestions(userIds: readonly string[], now: Date = new Date()): Promise<Map<string, EmailQuestionRow>> {
  const out = new Map<string, EmailQuestionRow>();
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return out;
  const since = new Date(now.getTime() - (EMAIL_QUOTE_MAX_DAYS + 1) * DAY_MS);
  const rows = await prisma
    .$queryRaw<EmailRow[]>`
      SELECT x."userId", x."sessionId", x.code, x.content, x."createdAt", x.answered, x."isLastUser"
      FROM (
        SELECT s."userId", m."sessionId", e.code, m.content, m."createdAt",
          EXISTS (
            SELECT 1 FROM "ChatMessage" r
            WHERE r."sessionId" = m."sessionId" AND r.role = 'ASSISTANT'
              AND r."createdAt" > m."createdAt" AND btrim(r.content) <> ''
          ) AS answered,
          NOT EXISTS (
            SELECT 1 FROM "ChatMessage" u
            WHERE u."sessionId" = m."sessionId" AND u.role = 'USER'
              AND u."createdAt" > m."createdAt"
          ) AS "isLastUser",
          ROW_NUMBER() OVER (PARTITION BY s."userId" ORDER BY m."createdAt" DESC) AS rn
        FROM "ChatSession" s
        JOIN "ChatMessage" m ON m."sessionId" = s.id
        LEFT JOIN "Exam" e ON e.id = s."examId"
        WHERE s."userId" = ANY(${ids}) AND m.role = 'USER' AND m."createdAt" >= ${since}
          AND (s."examId" IS NULL OR (${REAL_EXAM_SQL}))
      ) x
      WHERE x.rn <= ${EMAIL_ROWS_PER_USER}
      ORDER BY x."userId", x."createdAt" DESC
    `.catch((err) => {
      console.error("[pickup] mail question read failed:", err);
      return [] as EmailRow[];
    });
  const byUser = new Map<string, EmailQuestionRow[]>();
  for (const r of rows) {
    const list = byUser.get(r.userId) ?? [];
    list.push({
      sessionId: r.sessionId,
      examCode: r.code ?? null,
      content: r.content,
      createdAt: new Date(r.createdAt),
      answered: r.answered === true,
      isLastUser: r.isLastUser === true,
    });
    byUser.set(r.userId, list);
  }
  for (const [userId, list] of byUser) {
    const q = pickEmailQuestion(list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    if (q) out.set(userId, q);
  }
  return out;
}

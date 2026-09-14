// Today's 5 — the picker, the resume lookup and the "would the morning
// mail reach this student" predicate (11 Sep 2026, one-daily-loop build).
//
// pickDailyFive() is the dashboard's DailyFiveCard picker, lifted verbatim
// (src/app/dashboard/page.tsx: weaknessMap take 30 by lastSeenAt, keep
// attemptsCount ≥ 3, lowest masteryScore wins; otherwise the newest active
// enrollment). The dashboard imports it (15 Sep 2026), so the card, /today
// and the results page's "tomorrow" line name the same topic.
//
// Rotation (15 Sep 2026): the weakest topic wins only while it still holds
// 5 validated questions the student has not had on screen in the seen
// window; otherwise the next weakest topic that does (chooseDailyFiveTopic).
// Students were served the same thin topic's few questions every morning.
// `rotated` tells the copy not to call such a topic "your weakest".
//
// Zero-LLM by construction: TOPIC and DIAGNOSTIC requests are rule-based
// in src/lib/ai/generator.ts (pickByDifficulty over the validated pool).
// ADAPTIVE is deliberately NOT the fallback — /api/mocks routes ADAPTIVE
// to the CAT engine only after ≥ 20 responses and otherwise to a Claude
// call (mock-adaptive), which is exactly the new-student case. A student
// with no weakest topic yet gets a 5-question DIAGNOSTIC baseline instead.

import { prisma } from "@/lib/db/prisma";
import { istDay, istDayStartUtc } from "@/lib/study-day";
import { seenCutoff } from "@/lib/seen-questions";

export const DAILY_FIVE_COUNT = 5;

/** How many of the weakest topics rotation may choose from. */
export const ROTATION_DEPTH = 5;

/** The body POST /api/mocks receives as `request` for today's 5. */
export type DailyFiveRequest =
  | { type: "TOPIC"; topicCode: string; questionCount: typeof DAILY_FIVE_COUNT }
  | { type: "DIAGNOSTIC"; questionCount: typeof DAILY_FIVE_COUNT };

export interface DailyFivePick {
  examCode: string;
  examShort: string;
  /** Null when no topic has ≥ 3 attempts yet — request is then DIAGNOSTIC. */
  topicCode: string | null;
  topicName: string | null;
  /** True when a weaker topic had run out of unseen questions and this one —
   *  the next weakest with fresh questions — was picked. Copy must then not
   *  call it "your weakest topic". */
  rotated: boolean;
  request: DailyFiveRequest;
}

export interface TopicFreshness {
  /** Validated questions in the topic and its child topics. */
  total: number;
  /** Of those, not on this student's screen inside the seen window. */
  unseen: number;
}

/**
 * Today's topic from the weakest-first list. The weakest topic keeps the day
 * while it holds DAILY_FIVE_COUNT unseen questions; otherwise the next of the
 * ROTATION_DEPTH weakest that does. If none does, the one with the most
 * unseen questions (ties go to the weaker). If all are exhausted, or
 * freshness is unknown (null — a DB error), it's the weakest, as before, and
 * /api/mocks serves its least-recently-seen questions.
 */
export function chooseDailyFiveTopic<T extends { topicId: string }>(
  weakestFirst: readonly T[],
  fresh: ReadonlyMap<string, TopicFreshness> | null,
): { pick: T; rotated: boolean } | null {
  if (weakestFirst.length === 0) return null;
  const head = weakestFirst[0];
  if (!fresh) return { pick: head, rotated: false };
  const pool = weakestFirst.slice(0, ROTATION_DEPTH);
  const unseen = (w: T) => fresh.get(w.topicId)?.unseen ?? 0;
  const enough = pool.find((w) => unseen(w) >= DAILY_FIVE_COUNT);
  if (enough) return { pick: enough, rotated: enough !== head };
  let best = head;
  for (const w of pool) if (unseen(w) > unseen(best)) best = w;
  return { pick: best, rotated: best !== head };
}

/** Validated questions per topic — with its child topics, the scope
 *  /api/mocks gives a TOPIC set — and how many the student has not had on
 *  screen in the seen window (any opened attempt, the getSeenQuestions rule).
 *  One query. Null on a DB error: no rotation, never a guess. */
async function topicFreshness(userId: string, topicIds: string[]): Promise<Map<string, TopicFreshness> | null> {
  if (topicIds.length === 0) return new Map();
  try {
    const rows = await prisma.$queryRaw<{ topicId: string; total: number; unseen: number }[]>`
      WITH scope AS (
        SELECT t.id AS root, t.id AS tid FROM "Topic" t WHERE t.id = ANY(${topicIds})
        UNION ALL
        SELECT c."parentId" AS root, c.id AS tid FROM "Topic" c WHERE c."parentId" = ANY(${topicIds})
      ),
      seen AS (
        SELECT DISTINCT u.qid
        FROM "Attempt" a
        JOIN "Mock" m ON m.id = a."mockId"
        CROSS JOIN LATERAL unnest(m."questionIds") AS u(qid)
        WHERE a."userId" = ${userId} AND a."startedAt" >= ${seenCutoff()}
      )
      SELECT s.root AS "topicId",
             COUNT(q.id)::int AS total,
             (COUNT(q.id) FILTER (WHERE se.qid IS NULL))::int AS unseen
      FROM scope s
      JOIN "Question" q ON q."topicId" = s.tid AND q.validated = TRUE
      LEFT JOIN seen se ON se.qid = q.id
      GROUP BY s.root`;
    return new Map(rows.map((r) => [r.topicId, { total: Number(r.total), unseen: Number(r.unseen) }]));
  } catch (err) {
    console.error("[daily-five] topic freshness failed — weakest topic, no rotation:", err);
    return null;
  }
}

/** Same selection as the dashboard's Daily 5 card. Null = not enrolled anywhere. */
export async function pickDailyFive(userId: string): Promise<DailyFivePick | null> {
  const weakness = await prisma.weaknessMap.findMany({
    where: { userId },
    include: {
      topic: { select: { code: true, name: true } },
      exam: { select: { code: true, shortName: true } },
    },
    orderBy: { lastSeenAt: "desc" },
    take: 30,
  });
  // Noise filter identical to the dashboard: only topics with ≥ 3 attempts.
  const ranked = weakness
    .filter((w) => w.attemptsCount >= 3)
    .sort((a, b) => a.masteryScore - b.masteryScore);
  if (ranked.length > 0) {
    const fresh = await topicFreshness(userId, ranked.slice(0, ROTATION_DEPTH).map((w) => w.topicId));
    const chosen = chooseDailyFiveTopic(ranked, fresh);
    if (chosen) {
      const w = chosen.pick;
      return {
        examCode: w.exam.code,
        examShort: w.exam.shortName,
        topicCode: w.topic.code,
        topicName: w.topic.name,
        rotated: chosen.rotated,
        request: { type: "TOPIC", topicCode: w.topic.code, questionCount: DAILY_FIVE_COUNT },
      };
    }
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: { userId, active: true },
    orderBy: { createdAt: "desc" },
    select: { exam: { select: { code: true, shortName: true } } },
  });
  if (!enrollment) return null;
  return {
    examCode: enrollment.exam.code,
    examShort: enrollment.exam.shortName,
    topicCode: null,
    topicName: null,
    rotated: false,
    request: { type: "DIAGNOSTIC", questionCount: DAILY_FIVE_COUNT },
  };
}

/**
 * Pure half of findTodaysDailyFive: the EARLIEST of today's candidate
 * mocks that is a daily-5-sized set, i.e. 1..DAILY_FIVE_COUNT ids — not
 * exactly 5. /api/mocks answers 400 only when the validated pool is EMPTY
 * (route.ts:66/98); otherwise it stores whatever the scope allows, and its
 * post-generator top-up is scoped to the same topic / exam, so a thin
 * topic (3-4 validated questions incl. children) or a thin exam yields a
 * 3-4 id set. An exact-5 match missed those, so every further tap on
 * /today built ANOTHER set the same day and the results block kept
 * showing "Open today's 5 →" after the set was done. Empty questionIds
 * never resume (nothing for /mocks/{id} to show; the route never stores
 * them anyway).
 */
export function selectTodaysDailyFive<T extends { id: string; questionIds: string[] }>(
  mocksOldestFirst: readonly T[],
): string | null {
  return (
    mocksOldestFirst.find((m) => m.questionIds.length > 0 && m.questionIds.length <= DAILY_FIVE_COUNT)?.id ??
    null
  );
}

/**
 * Today's (IST) 5-question set, if one already exists — so /today resumes
 * instead of stacking a second set. Matches any ≤5-question TOPIC /
 * DIAGNOSTIC / ADAPTIVE mock the student created today (see
 * selectTodaysDailyFive for why ≤ and not =): there is no "daily five"
 * marker in Mock.config (that lives in /api/mocks, outside this build),
 * so a dashboard-created Daily 5 or a results-page confidence-5 resumes
 * too. /mocks/{id} then resumes an in-progress attempt or bounces to
 * results when it was submitted.
 */
export async function findTodaysDailyFive(userId: string): Promise<string | null> {
  const dayStart = istDayStartUtc(istDay(new Date()));
  const mocks = await prisma.mock.findMany({
    where: {
      userId,
      createdAt: { gte: dayStart },
      type: { in: ["TOPIC", "DIAGNOSTIC", "ADAPTIVE"] },
      // A coach drill is a TOPIC set too; it must never pose as today's 5.
      generatedBy: { not: "coach-drill" },
    },
    select: { id: true, questionIds: true },
    orderBy: { createdAt: "asc" },
  });
  return selectTodaysDailyFive(mocks);
}

/**
 * Mirrors the Daily-5 cron's recipient selection for ONE student
 * (src/app/api/cron/daily-five/route.ts): an AnalyticsEvent in the last 3
 * days, a non-empty email, not opted out, an active enrollment. What it
 * cannot know is tomorrow morning — the cron also skips anyone who has
 * already been on the site that day — so copy built on this must say so.
 * Fails closed (false → the honest "ready at /today" line, never a
 * promised mail).
 */
export async function wouldGetDailyFiveMail(userId: string): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<
      { has_email: boolean; opted_out: boolean; enrolled: boolean; active3: boolean }[]
    >`
      SELECT (COALESCE(u.email, '') <> '') AS has_email,
             COALESCE(u."emailOptOut", FALSE) AS opted_out,
             EXISTS (SELECT 1 FROM "Enrollment" e WHERE e."userId" = u.id AND e.active) AS enrolled,
             EXISTS (
               SELECT 1 FROM "AnalyticsEvent" a
                WHERE a."userId" = u.id AND a."createdAt" >= NOW() - INTERVAL '3 days'
             ) AS active3
        FROM "User" u
       WHERE u.id = ${userId}`;
    const r = rows[0];
    return !!r && r.has_email && !r.opted_out && r.enrolled && r.active3;
  } catch {
    return false;
  }
}

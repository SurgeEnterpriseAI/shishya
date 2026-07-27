// All-India Live Test engine.
// createWeeklyLiveTests() builds next Sunday's shared papers — one per
// top-enrolled exam — as system Mocks (userId NULL, open to every
// signed-in student). Called by the Saturday cron and by the local
// seed script. LiveTest rows are raw SQL (generated client on dev
// machines predates the table).

import { prisma } from "@/lib/db/prisma";

export const LIVE_TEST_QUESTIONS = 25;
export const LIVE_TEST_DURATION_MIN = 20;
const TOP_EXAMS = 6;

/** Next Sunday's window: 6:00 AM – 11:00 PM IST (00:30 – 17:30 UTC). */
export function nextSundayWindowUTC(now = new Date()): { opensAt: Date; closesAt: Date } {
  // Work in IST to find "next Sunday" as aspirants experience it.
  const istNow = new Date(now.getTime() + 5.5 * 3600_000);
  const day = istNow.getUTCDay(); // 0 = Sunday
  const daysAhead = day === 0 ? 7 : 7 - day; // always a FUTURE Sunday
  const istSunday = new Date(
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() + daysAhead),
  );
  // IST 06:00 = UTC 00:30 the same date; IST 23:00 = UTC 17:30.
  const opensAt = new Date(istSunday.getTime() + 30 * 60_000);
  const closesAt = new Date(istSunday.getTime() + 17.5 * 3600_000);
  return { opensAt, closesAt };
}

async function pickPaper(examId: string): Promise<string[]> {
  // Balanced difficulty mix, excluding questions used by past live
  // tests of this exam (a returning champion shouldn't see repeats).
  const pick = async (difficulty: string, n: number) =>
    (
      await prisma.$queryRaw<{ id: string }[]>`
        SELECT q.id FROM "Question" q
        WHERE q."examId" = ${examId} AND q.validated = TRUE
          AND q.difficulty = ${difficulty}::"Difficulty"
          AND q.id NOT IN (
            SELECT unnest(m."questionIds") FROM "Mock" m
            WHERE m."examId" = ${examId} AND m."generatedBy" = 'live-test'
          )
        ORDER BY random() LIMIT ${n}`
    ).map((r) => r.id);

  const ids = [
    ...(await pick("EASY", 8)),
    ...(await pick("MEDIUM", 12)),
    ...(await pick("HARD", 5)),
  ];
  if (ids.length < LIVE_TEST_QUESTIONS) {
    const fill = await prisma.$queryRaw<{ id: string }[]>`
      SELECT q.id FROM "Question" q
      WHERE q."examId" = ${examId} AND q.validated = TRUE
        AND NOT (q.id = ANY(${ids}))
      ORDER BY random() LIMIT ${LIVE_TEST_QUESTIONS - ids.length}`;
    ids.push(...fill.map((r) => r.id));
  }
  return ids.slice(0, LIVE_TEST_QUESTIONS);
}

export async function createWeeklyLiveTests(): Promise<
  { examCode: string; mockId: string; created: boolean }[]
> {
  const { opensAt, closesAt } = nextSundayWindowUTC();

  // Top exams by recent enrollment; falls back to all-time when a
  // quiet month starves the 30-day window.
  let top = await prisma.$queryRaw<{ examId: string; code: string; short: string }[]>`
    SELECT e.id AS "examId", e.code, e."shortName" AS short
    FROM "Enrollment" en JOIN "Exam" e ON e.id = en."examId" AND e.active = TRUE
    WHERE en."createdAt" > NOW() - INTERVAL '30 days'
    GROUP BY e.id, e.code, e."shortName"
    ORDER BY COUNT(*) DESC LIMIT ${TOP_EXAMS}`;
  if (top.length < 3) {
    top = await prisma.$queryRaw<{ examId: string; code: string; short: string }[]>`
      SELECT e.id AS "examId", e.code, e."shortName" AS short
      FROM "Enrollment" en JOIN "Exam" e ON e.id = en."examId" AND e.active = TRUE
      GROUP BY e.id, e.code, e."shortName"
      ORDER BY COUNT(*) DESC LIMIT ${TOP_EXAMS}`;
  }

  const results: { examCode: string; mockId: string; created: boolean }[] = [];
  for (const t of top) {
    const existing = await prisma.$queryRaw<{ mockId: string }[]>`
      SELECT "mockId" FROM "LiveTest" WHERE "examId" = ${t.examId} AND "opensAt" = ${opensAt}`;
    if (existing[0]) {
      results.push({ examCode: t.code, mockId: existing[0].mockId, created: false });
      continue;
    }

    const questionIds = await pickPaper(t.examId);
    if (questionIds.length < 10) continue; // not enough bank for a fair paper

    const dateLabel = new Date(opensAt.getTime() + 5.5 * 3600_000).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
    const mock = await prisma.mock.create({
      data: {
        userId: null,
        examId: t.examId,
        type: "FULL",
        title: `🇮🇳 All-India Live Test — ${t.short} — Sunday ${dateLabel}`,
        config: {
          count: questionIds.length,
          durationMin: LIVE_TEST_DURATION_MIN,
          liveTest: true,
        },
        questionIds,
        generatedBy: "live-test",
      },
    });
    await prisma.$executeRaw`
      INSERT INTO "LiveTest" (id, "examId", "mockId", "opensAt", "closesAt", "createdAt")
      VALUES (gen_random_uuid()::text, ${t.examId}, ${mock.id}, ${opensAt}, ${closesAt}, NOW())
      ON CONFLICT ("examId", "opensAt") DO NOTHING`;
    results.push({ examCode: t.code, mockId: mock.id, created: true });
  }
  return results;
}

/** Rank of an attempt among first-submitted-attempts on a live-test
 *  mock. Returns null when the mock isn't a live test. */
export async function liveTestRank(
  mockId: string,
  userId: string,
): Promise<{ rank: number; of: number } | null> {
  const lt = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "LiveTest" WHERE "mockId" = ${mockId} LIMIT 1`;
  if (!lt[0]) return null;

  const rows = await prisma.$queryRaw<{ userId: string; pct: number | null }[]>`
    SELECT DISTINCT ON ("userId") "userId", "scorePct" AS pct
    FROM "Attempt"
    WHERE "mockId" = ${mockId} AND status IN ('SUBMITTED', 'AUTO_SUBMITTED')
    ORDER BY "userId", "startedAt" ASC`;
  const mine = rows.find((r) => r.userId === userId);
  if (mine?.pct == null) return null;
  const better = rows.filter((r) => r.pct != null && r.pct! > mine.pct!).length;
  return { rank: better + 1, of: rows.length };
}

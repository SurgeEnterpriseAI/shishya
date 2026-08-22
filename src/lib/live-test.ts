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

  // Exam selection (6 Aug 2026 founder rule): a live test should
  // rehearse an exam that is actually COMING — not one whose paper is
  // long over. Priority order:
  //   1. exams whose next exam day falls 7-75 days out (the window
  //      where a full mock genuinely changes preparation), most
  //      enrolled first;
  //   2. fill remaining slots by popularity, but NEVER include an exam
  //      whose exam day passed within the last 6 months and has no
  //      upcoming date (that cohort has already sat the paper).
  const imminent = await prisma.$queryRaw<{ examId: string; code: string; short: string }[]>`
    SELECT e.id AS "examId", e.code, e."shortName" AS short
    FROM "Exam" e
    JOIN "ExamImportantDate" d
      ON d."examId" = e.id AND d."isExamDay" = TRUE AND d."archivedAt" IS NULL AND d.date > NOW()
    LEFT JOIN "Enrollment" en ON en."examId" = e.id AND en.active = TRUE
    WHERE e.active = TRUE
    GROUP BY e.id, e.code, e."shortName"
    HAVING (MIN(d.date)::date - CURRENT_DATE) BETWEEN 7 AND 75
    ORDER BY COUNT(en.id) DESC, MIN(d.date) ASC
    LIMIT ${TOP_EXAMS}`;

  let top = imminent;
  if (top.length < TOP_EXAMS) {
    const have = top.map((t) => t.examId);
    const filler = await prisma.$queryRaw<{ examId: string; code: string; short: string }[]>`
      SELECT e.id AS "examId", e.code, e."shortName" AS short
      FROM "Enrollment" en JOIN "Exam" e ON e.id = en."examId" AND e.active = TRUE
      WHERE NOT (e.id = ANY(${have}))
        -- exclude exams already written in the last 6 months with nothing upcoming
        AND NOT EXISTS (
          SELECT 1 FROM "ExamImportantDate" d
          WHERE d."examId" = e.id AND d."isExamDay" = TRUE AND d."archivedAt" IS NULL
            AND d.date < NOW() AND d.date > NOW() - INTERVAL '6 months'
            AND NOT EXISTS (
              SELECT 1 FROM "ExamImportantDate" d2
              WHERE d2."examId" = e.id AND d2."isExamDay" = TRUE AND d2."archivedAt" IS NULL AND d2.date > NOW()
            )
        )
      GROUP BY e.id, e.code, e."shortName"
      ORDER BY COUNT(*) DESC
      LIMIT ${TOP_EXAMS}`;
    top = [...top, ...filler].slice(0, TOP_EXAMS);
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
  const lt = await prisma.$queryRaw<{ id: string; opensAt: Date; closesAt: Date }[]>`
    SELECT id, "opensAt", "closesAt" FROM "LiveTest" WHERE "mockId" = ${mockId} LIMIT 1`;
  if (!lt[0]) return null;

  // Only attempts STARTED inside the live window AND FINISHED by close
  // (+60 min grace) count toward the national rank — a practice run
  // after close, or a Monday resume-submit, must never rewrite the board
  // everyone was emailed on Sunday night (audit 18 Aug + review 22 Aug).
  const freeze = new Date(lt[0].closesAt.getTime() + 60 * 60_000);
  const rows = await prisma.$queryRaw<{ userId: string; pct: number | null }[]>`
    SELECT DISTINCT ON ("userId") "userId", "scorePct" AS pct
    FROM "Attempt"
    WHERE "mockId" = ${mockId} AND status IN ('SUBMITTED', 'AUTO_SUBMITTED')
      AND "startedAt" >= ${lt[0].opensAt} AND "startedAt" <= ${lt[0].closesAt}
      AND "finishedAt" <= ${freeze}
    ORDER BY "userId", "startedAt" ASC`;
  const mine = rows.find((r) => r.userId === userId);
  if (mine?.pct == null) return null;
  const better = rows.filter((r) => r.pct != null && r.pct! > mine.pct!).length;
  return { rank: better + 1, of: rows.length };
}

/** Final leaderboard for a closed live test: every in-window participant
 *  with their rank + email, for the Sunday-night results email. */
export async function liveTestFinalBoard(
  mockId: string,
): Promise<{ userId: string; email: string; name: string | null; pct: number; rank: number; of: number }[]> {
  const lt = await prisma.$queryRaw<{ opensAt: Date; closesAt: Date }[]>`
    SELECT "opensAt", "closesAt" FROM "LiveTest" WHERE "mockId" = ${mockId} LIMIT 1`;
  if (!lt[0]) return [];
  const freeze = new Date(lt[0].closesAt.getTime() + 60 * 60_000);
  const rows = await prisma.$queryRaw<{ userId: string; email: string; name: string | null; pct: number }[]>`
    SELECT DISTINCT ON (a."userId") a."userId", u.email, u.name, a."scorePct" AS pct
    FROM "Attempt" a JOIN "User" u ON u.id = a."userId"
    WHERE a."mockId" = ${mockId} AND a.status IN ('SUBMITTED','AUTO_SUBMITTED')
      AND a."scorePct" IS NOT NULL AND u.email <> ''
      AND a."startedAt" >= ${lt[0].opensAt} AND a."startedAt" <= ${lt[0].closesAt}
      AND a."finishedAt" <= ${freeze}
    ORDER BY a."userId", a."startedAt" ASC`;
  const sorted = [...rows].sort((a, b) => b.pct - a.pct);
  const of = sorted.length;
  return sorted.map((r) => ({
    ...r,
    rank: sorted.filter((x) => x.pct > r.pct).length + 1,
    of,
  }));
}

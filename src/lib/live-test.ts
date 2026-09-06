// All-India Live Test engine.
// createWeeklyLiveTests() builds next Sunday's shared papers — one per
// top-enrolled exam — as system Mocks (userId NULL, open to every
// signed-in student). Called by the daily (idempotent) cron and by the
// local seed script. LiveTest rows are raw SQL (generated client on dev
// machines predates the table).
//
// Exam Week Mode, wave 2 (6 Sep 2026, play 16): the same run also creates
// a REHEARSAL live test for every exam whose ANNOUNCED (official /
// reported — never expected) exam day is 3–7 days out: 25 easy-leaning
// questions (EASY 40 / MEDIUM 45 / HARD 15), 20 min, open the moment it is
// created and closing 8 PM IST the evening before the exam day. One per
// (exam, exam day) — Mock.config.rehearsalFor carries the IST exam day and
// is the idempotency key. Rehearsals keep generatedBy = 'live-test' so the
// ranked-attempt gate, the results-page rank and the question exclusion
// treat them exactly like the Sunday paper. Opening immediately keeps every
// "next Sunday" reader (opensAt > NOW(): SundayLiveTestBanner, the Friday
// invite, the reminder flow) blind to them by construction.

import { prisma } from "@/lib/db/prisma";
import { loadExamWeekExams } from "@/lib/exam-week-aeo";
import { whenWithTier } from "@/lib/exam-week-mail";

export const LIVE_TEST_QUESTIONS = 25;
export const LIVE_TEST_DURATION_MIN = 20;
const TOP_EXAMS = 6;

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;
/** Rehearsal window: announced exam day this many days out (inclusive). */
const REHEARSAL_MIN_DAYS = 3;
const REHEARSAL_MAX_DAYS = 7;
/** Closes at this IST hour on the evening before the exam day. */
const REHEARSAL_CLOSE_IST_HOUR = 20;

type DifficultyMix = { EASY: number; MEDIUM: number; HARD: number };
/** Sunday paper: balanced. */
const SUNDAY_MIX: DifficultyMix = { EASY: 8, MEDIUM: 12, HARD: 5 };
/** Rehearsal: easy-leaning (40 / 45 / 15 of 25) — confidence, not a scare, days before the paper. */
const REHEARSAL_MIX: DifficultyMix = { EASY: 10, MEDIUM: 11, HARD: 4 };

export interface LiveTestCreateResult {
  examCode: string;
  mockId: string;
  created: boolean;
  /** true for an exam-week rehearsal paper (absent on Sunday papers). */
  rehearsal?: boolean;
}

/** UTC instant of REHEARSAL_CLOSE_IST_HOUR on the IST day before `examDayIso`. */
export function rehearsalCloseUTC(examDayIso: string): Date {
  const eveMidnightUtc = Date.parse(examDayIso + "T00:00:00Z") - DAY_MS - IST_OFFSET_MS;
  return new Date(eveMidnightUtc + REHEARSAL_CLOSE_IST_HOUR * 3600_000);
}

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

async function pickPaper(examId: string, mix: DifficultyMix = SUNDAY_MIX): Promise<string[]> {
  // Difficulty mix per `mix`, excluding questions used by past live
  // tests of this exam — Sunday papers AND rehearsals share the
  // 'live-test' generatedBy, so neither repeats the other (a returning
  // champion shouldn't see repeats).
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
    ...(await pick("EASY", mix.EASY)),
    ...(await pick("MEDIUM", mix.MEDIUM)),
    ...(await pick("HARD", mix.HARD)),
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

/**
 * Exam-week rehearsal papers (play 16). For every active exam whose
 * announced exam day (official / reported) is REHEARSAL_MIN_DAYS..
 * REHEARSAL_MAX_DAYS out per the shared state machine (phase "week",
 * daysTo = days to the window's FIRST day), create one 25-question
 * easy-leaning LiveTest that opens now and closes the evening before the
 * exam day. Idempotent per (exam, exam day) via Mock.config.rehearsalFor.
 * Never throws — a failure on one exam is logged and the loop moves on.
 */
export async function createRehearsalLiveTests(now: Date = new Date()): Promise<LiveTestCreateResult[]> {
  const results: LiveTestCreateResult[] = [];
  const exams = await loadExamWeekExams({ now }).catch((err) => {
    console.error("[live-test] rehearsal exam selection failed", err);
    return [];
  });
  for (const ex of exams) {
    const s = ex.state;
    if (s.phase !== "week" || s.daysTo == null || s.daysTo < REHEARSAL_MIN_DAYS || s.daysTo > REHEARSAL_MAX_DAYS) continue;
    // Announced dates only — a rehearsal for an estimated day is a promise
    // the tracker never made.
    if (!s.focus || !s.focusDay || (s.tier !== "official" && s.tier !== "reported")) continue;
    const examDay = s.focusDay;
    const closesAt = rehearsalCloseUTC(examDay);
    if (closesAt.getTime() <= now.getTime()) continue;

    try {
      // Once per (exam, exam day).
      const existing = await prisma.$queryRaw<{ mockId: string }[]>`
        SELECT lt."mockId" FROM "LiveTest" lt
        JOIN "Mock" m ON m.id = lt."mockId"
        WHERE lt."examId" = ${ex.id} AND m."generatedBy" = 'live-test'
          AND m.config->>'rehearsalFor' = ${examDay}
        LIMIT 1`;
      if (existing[0]) {
        results.push({ examCode: ex.code, mockId: existing[0].mockId, created: false, rehearsal: true });
        continue;
      }

      const questionIds = await pickPaper(ex.id, REHEARSAL_MIX);
      if (questionIds.length < 10) continue; // not enough bank for a fair paper

      const opensAt = now;
      const mock = await prisma.mock.create({
        data: {
          userId: null,
          examId: ex.id,
          type: "FULL",
          title: `${ex.shortName} rehearsal — ${whenWithTier(s.focus)}`,
          config: {
            count: questionIds.length,
            durationMin: LIVE_TEST_DURATION_MIN,
            liveTest: true,
            rehearsal: true,
            rehearsalFor: examDay,
            examDayTier: s.tier,
          },
          questionIds,
          generatedBy: "live-test",
        },
      });
      const inserted = await prisma.$executeRaw`
        INSERT INTO "LiveTest" (id, "examId", "mockId", "opensAt", "closesAt", "createdAt")
        VALUES (gen_random_uuid()::text, ${ex.id}, ${mock.id}, ${opensAt}, ${closesAt}, NOW())
        ON CONFLICT ("examId", "opensAt") DO NOTHING`;
      if (inserted === 0) {
        // (examId, opensAt) collided with a paper created in the same
        // instant — never leave an orphan system mock behind.
        await prisma.mock.delete({ where: { id: mock.id } }).catch(() => {});
        continue;
      }
      results.push({ examCode: ex.code, mockId: mock.id, created: true, rehearsal: true });
    } catch (err) {
      console.error(`[live-test] rehearsal for ${ex.code} failed`, err);
    }
  }
  return results;
}

export async function createWeeklyLiveTests(now: Date = new Date()): Promise<LiveTestCreateResult[]> {
  const { opensAt, closesAt } = nextSundayWindowUTC(now);

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

  const results: LiveTestCreateResult[] = [];
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

  // Exam-week rehearsals ride the same daily run; they never block the
  // Sunday papers above.
  const rehearsals = await createRehearsalLiveTests(now).catch((err) => {
    console.error("[live-test] rehearsal creation failed", err);
    return [] as LiveTestCreateResult[];
  });
  return [...results, ...rehearsals];
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

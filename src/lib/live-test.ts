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
// created and closing REHEARSAL_CLOSE_IST_HOUR (6 PM IST since 11 Sep
// 2026 — it was 8 PM, which had the rank mail landing at 23:30 IST on the
// night the eve mail says is for sleep) the evening before the exam day. One per
// (exam, exam day) — Mock.config.rehearsalFor carries the IST exam day and
// is the idempotency key. Rehearsals keep generatedBy = 'live-test' so the
// ranked-attempt gate, the results-page rank and the question exclusion
// treat them exactly like the Sunday paper. Opening immediately keeps every
// "next Sunday" reader (opensAt > NOW(): SundayLiveTestBanner, the Friday
// invite, the reminder flow) blind to them by construction.
//
// BUT a rehearsal is OPEN for 3–7 days, and every "open now / today"
// reader treated an open LiveTest as today's shared Sunday paper (review
// 6 Sep 2026). Those readers now filter on the same no-migration marker —
// see EXCLUDE_REHEARSAL_SQL in src/lib/live-test-today.ts.

import { prisma } from "@/lib/db/prisma";
import { loadExamWeekExams } from "@/lib/exam-week-aeo";
import { plainDay, tierWord, whenWithTier } from "@/lib/exam-week-mail";
import type { SourceTier } from "@/lib/exam-timeline";

export const LIVE_TEST_QUESTIONS = 25;
export const LIVE_TEST_DURATION_MIN = 20;
const TOP_EXAMS = 6;

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;
/** Rehearsal window: announced exam day this many days out (inclusive). */
const REHEARSAL_MIN_DAYS = 3;
const REHEARSAL_MAX_DAYS = 7;
/** Closes at this IST hour on the evening before the exam day. Exported so
 *  the hub's rehearsal card and the close cron's schedule (vercel.json:
 *  12:50 UTC = 18:20 IST) can say the same hour. Existing LiveTest rows keep
 *  the closesAt they were created with — this only shapes new rehearsals. */
export const REHEARSAL_CLOSE_IST_HOUR = 18;

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

/** Rolls the rehearsal transaction back when (examId, opensAt) collided —
 *  benign, never logged as a failure. */
class RehearsalCollision extends Error {}

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
    // Hoisted out of the guard above: narrowing does not survive into the
    // transaction closure below.
    const focus = s.focus;
    const closesAt = rehearsalCloseUTC(examDay);
    if (closesAt.getTime() <= now.getTime()) continue;

    try {
      // Once per (exam, exam day). The MOCK is the idempotency key, not the
      // LiveTest row: if the LiveTest INSERT ever failed after the Mock was
      // created, a check that needed the LiveTest row would miss the orphan
      // and the next daily run would build a SECOND rehearsal mock for the
      // same exam day, inflating the system-mock counts (review 6 Sep 2026).
      // No index covers this predicate, but only a handful of exams a day
      // reach this line (phase "week", announced, 3–7 days out).
      const existing = await prisma.$queryRaw<{ id: string }[]>`
        SELECT m.id FROM "Mock" m
        WHERE m."examId" = ${ex.id} AND m."generatedBy" = 'live-test'
          AND m.config->>'rehearsalFor' = ${examDay}
        LIMIT 1`;
      if (existing[0]) {
        results.push({ examCode: ex.code, mockId: existing[0].id, created: false, rehearsal: true });
        continue;
      }

      const questionIds = await pickPaper(ex.id, REHEARSAL_MIX);
      if (questionIds.length < 10) continue; // not enough bank for a fair paper

      const opensAt = now;
      // Both writes in ONE transaction — a mock without its LiveTest row is
      // an unreachable orphan, so either both land or neither does.
      const mockId = await prisma.$transaction(async (tx) => {
        const mock = await tx.mock.create({
          data: {
            userId: null,
            examId: ex.id,
            type: "FULL",
            title: `${ex.shortName} rehearsal — ${whenWithTier(focus)}`,
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
        const inserted = await tx.$executeRaw`
          INSERT INTO "LiveTest" (id, "examId", "mockId", "opensAt", "closesAt", "createdAt")
          VALUES (gen_random_uuid()::text, ${ex.id}, ${mock.id}, ${opensAt}, ${closesAt}, NOW())
          ON CONFLICT ("examId", "opensAt") DO NOTHING`;
        // (examId, opensAt) collided with a paper created in the same
        // instant — roll the mock back rather than leave it orphaned.
        if (inserted === 0) throw new RehearsalCollision();
        return mock.id;
      });
      results.push({ examCode: ex.code, mockId, created: true, rehearsal: true });
    } catch (err) {
      if (err instanceof RehearsalCollision) continue; // benign, already rolled back
      console.error(`[live-test] rehearsal for ${ex.code} failed`, err);
    }
  }
  return results;
}

export async function createWeeklyLiveTests(now: Date = new Date()): Promise<LiveTestCreateResult[]> {
  const { opensAt, closesAt } = nextSundayWindowUTC(now);
  const results: LiveTestCreateResult[] = [];

  // ROSTER FREEZE (review 6 Sep 2026). The create cron now runs DAILY, but
  // the "imminent" top-N below is recomputed from a MOVING day-range window
  // — so each morning could add another paper to the SAME Sunday as exams
  // churn in and out of the 7–75-day range, and one Sunday would end up
  // with far more than TOP_EXAMS papers. The first run that lands on a
  // Sunday fixes that Sunday's roster; later runs report it unchanged and
  // only the rehearsals below keep running. Accepted trade-off: if that
  // first run dies half-way, the week keeps the partial roster rather than
  // topping it up — a short roster is honest, a growing one is not.
  const frozen = await prisma.$queryRaw<{ mockId: string; code: string }[]>`
    SELECT lt."mockId", e.code
    FROM "LiveTest" lt JOIN "Exam" e ON e.id = lt."examId"
    WHERE lt."opensAt" = ${opensAt}
    ORDER BY e."shortName" ASC`;

  if (frozen.length > 0) {
    for (const f of frozen) results.push({ examCode: f.code, mockId: f.mockId, created: false });
  } else {
    results.push(...(await createSundayPapers(opensAt, closesAt)));
  }

  // Exam-week rehearsals ride the same daily run; they never block the
  // Sunday papers above.
  const rehearsals = await createRehearsalLiveTests(now).catch((err) => {
    console.error("[live-test] rehearsal creation failed", err);
    return [] as LiveTestCreateResult[];
  });
  return [...results, ...rehearsals];
}

/** This Sunday's shared papers — one per top-enrolled imminent exam.
 *  Only called on the first run that reaches a given Sunday (see the
 *  roster freeze above). */
async function createSundayPapers(opensAt: Date, closesAt: Date): Promise<LiveTestCreateResult[]> {
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
    // Defensive: a concurrent run could have claimed this (exam, Sunday)
    // between the freeze check and here.
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

// ── Final-result email copy ──────────────────────────────────────────
// The close cron now runs DAILY (review 7 Sep 2026) because rehearsals
// close on a weekday, so it delivers final ranks for BOTH kinds of paper
// and the copy has to know which one it is. The Sunday text below is
// unchanged. A rehearsal gets its own, because "your All-India rank in
// today's Live Test … next one is next Sunday" is wrong twice over for a
// student who wrote an exam-week warm-up and whose next paper is the
// actual exam.

/** The parts of a just-closed live test its result email needs.
 *  `rehearsalFor` is the Mock's config marker (see createRehearsalLiveTests)
 *  — null on the shared Sunday papers. */
export interface ClosedLiveTest {
  short: string;
  examCode: string;
  /** IST exam day (YYYY-MM-DD) this paper rehearsed; null = Sunday paper. */
  rehearsalFor: string | null;
  /** Tier of that exam day as recorded at creation ('official' | 'reported'). */
  examDayTier: string | null;
}

export interface LiveTestResultRow {
  name: string | null;
  pct: number;
  rank: number;
  of: number;
}

const SOURCE_TIERS: SourceTier[] = ["official", "reported", "expected"];

/** "12 Sep (official)" for a rehearsal's exam day, or null when the tier
 *  was not recorded — a date never ships to a student without its source
 *  tier word, so we drop the date rather than the word. */
function rehearsalExamDay(t: ClosedLiveTest): string | null {
  if (!t.rehearsalFor) return null;
  const tier = SOURCE_TIERS.find((w) => w === t.examDayTier);
  if (!tier) return null;
  const d = new Date(Date.parse(t.rehearsalFor + "T00:00:00Z"));
  if (Number.isNaN(d.getTime())) return null;
  return `${plainDay(d)} (${tierWord(tier)})`;
}

/** Subject + HTML for one participant's final result mail. */
export function liveTestResultEmail(
  t: ClosedLiveTest,
  p: LiveTestResultRow,
): { subject: string; html: string } {
  const first = (p.name ?? "").split(" ")[0] || "Aspirant";
  const topThird = p.rank <= Math.ceil(p.of / 3);
  const hub = `https://shishya.in/exams/${t.examCode}`;

  if (t.rehearsalFor) {
    const when = rehearsalExamDay(t);
    // No "All-India" and no "today's": a rehearsal is one exam's private
    // warm-up, open for days — not the country writing the same paper.
    return {
      subject: `🏆 Your rank in the ${t.short} exam-day rehearsal: #${p.rank} of ${p.of}`,
      html: `<p>${first}, the ${t.short} exam-day rehearsal has closed.</p>
<p style="font-size:16px"><b>Rank #${p.rank}</b> out of <b>${p.of}</b> aspirants who wrote this rehearsal — you scored ${Math.round(p.pct)}%.</p>
<p>${
        topThird
          ? "Top third of everyone who rehearsed — carry that into the hall."
          : "A rehearsal is the cheap place to find a weak area. Yours are already on your report — take the one that costs you most and give it an hour."
      }</p>
<p>This was the warm-up for your ${t.short} exam${when ? ` on ${when}` : ""}, so what comes next is the exam itself, not another paper from us. Your hub carries every date we hold, each with its source: <a href="${hub}">shishya.in/exams/${t.examCode}</a></p>
<p>— Shishya</p>`,
    };
  }

  return {
    subject: `🏆 Your All-India rank in today's ${t.short} Live Test: #${p.rank} of ${p.of}`,
    html: `<p>${first}, the results are in.</p>
<p style="font-size:16px"><b>All-India Rank #${p.rank}</b> out of <b>${p.of}</b> aspirants who took today's ${t.short} Live Test — you scored ${Math.round(p.pct)}%.</p>
<p>${
      topThird
        ? "Top third of the country today — that's real. Keep this rhythm and the rank sheet on exam day will look familiar."
        : "Every rank is a starting line. Your weak areas from today are already on your report — fix one this week and watch next Sunday's rank move."
    }</p>
<p>See the full breakdown: <a href="${hub}">shishya.in/exams/${t.examCode}</a><br/>
Next All-India Live Test is next Sunday — same time, fresh paper.</p>
<p>— Shishya</p>`,
  };
}

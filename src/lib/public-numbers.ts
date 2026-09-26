// Shishya's public numbers (27 Sep 2026) — the database half.
//
// Why: /shishya-in-numbers (and /press, read-only) print every number the
// market might quote about Shishya, each with its definition and date,
// computed from the production database when the page is built — never
// typed. Founder strategy (27 Sep 2026): the credible numbers come first
// (cohort return rates, 30-day actives, mocks per active account, the
// referrer-verified sign-up share, what the answer check changed); the big
// all-time counters come after, straight from getLiveCounts() with their
// LIVE_COUNT_DEFINITIONS text unchanged.
//
// How:
//   • the definitions, windows and builders are pure and live in
//     src/lib/public-numbers-rules.ts; this file only runs SELECTs and hands
//     the grouped rows to those builders;
//   • every loader is wrapped in unstable_cache (1 hour, tag
//     "public-numbers") and returns plain JSON (ISO strings, never Dates);
//   • a failed read returns null and the page prints "could not be computed
//     right now" — never 0;
//   • team accounts (ADMIN_EMAILS, the list src/lib/admin.ts reads) are left
//     out of every per-account number; their count is never returned;
//   • activity = src/lib/public-numbers-rules.ts's rule: signed-in analytics
//     events not tagged as bots, attempt starts, SUBMITTED/AUTO_SUBMITTED
//     finish times and USER chat messages — never the nightly cleanup job's
//     ABANDONED finish times (27 Sep 2026 probe: counting them turned a 29%
//     7-day return into ~45%).
//
// Read-only: SELECT statements only. Server-only (Prisma).

import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { GUEST_IMPORT_SOURCE, LIVE_COUNT_DEFINITIONS, getLiveCounts, type LiveCounts } from "@/lib/live-counts-server";
import { NOT_SCHOOL_SQL, REAL_EXAM_SQL, REAL_EXAM_WHERE, SCHOOL_CATEGORY } from "@/lib/db/exam-scope";
import { WITHDRAWN_TAG } from "@/lib/question-withdrawn";
import { examKind, type ExamKind } from "@/lib/exam-kind";
import { loadSchoolSurface, schoolSurfaceCounts } from "@/lib/school/surface";
import { countCheckedQuestions } from "@/lib/site-description-counts";
import { buildTimeline } from "@/lib/exam-timeline";
import { labelSaysExpected } from "@/lib/pulse-rules";
import { COLLEGES, NIRF_SOURCE_YEAR } from "@/lib/colleges-data";
import { SCHOLARSHIP_SCHEMES } from "@/lib/scholarship-schemes";
import { CAREERS } from "@/data/careers";
import { INDIAN_LANGUAGE_COUNT, LANGUAGE_COUNT } from "@/lib/languages";
import { type IsoWeek, IST_OFFSET_MS, istDayLabel, istDayRangeLabel, istDayString } from "@/lib/iso-week";
import { sourceFamilySql } from "@/lib/source-family";
import {
  DEFINITIONS,
  HUMAN_RULE_HAVING,
  SOURCES,
  addDays,
  buildActives30,
  buildAnswerCheck,
  buildCohortReturns,
  buildNewPeopleSources,
  buildReports,
  buildSignupSources,
  buildWeeklyUsage,
  numbersWindows,
  type Actives30,
  type AnswerCheck,
  type CohortReturns,
  type CountOf,
  type FamilyRow,
  type NumbersWindows,
  type PublicNumber,
  type SourceSplit,
  type WeeklyUsage,
} from "@/lib/public-numbers-rules";

export type { Actives30, AnswerCheck, CohortReturns, CountOf, PublicNumber, SourceSplit, WeeklyUsage } from "@/lib/public-numbers-rules";

/** Cache lifetime of every loader here (seconds) — the pages revalidate hourly too. */
export const PUBLIC_NUMBERS_REVALIDATE = 3600;
/** unstable_cache tag of every loader here. */
export const PUBLIC_NUMBERS_TAG = "public-numbers";

// ── SQL building blocks ───────────────────────────────────────────────

/** IST calendar day of a timestamp column (stored as UTC). */
const istDay = (col: string) => Prisma.raw(`((${col}) + interval '330 minutes')::date`);
/** IST ISO-week Monday of a timestamp column, as "YYYY-MM-DD" text. */
const istWeek = (col: string) => Prisma.raw(`to_char(date_trunc('week', (${col}) + interval '330 minutes')::date, 'YYYY-MM-DD')`);

const SUBMITTED = Prisma.sql`('SUBMITTED', 'AUTO_SUBMITTED')`;

/** Instant of 00:00 IST on a "YYYY-MM-DD" day. */
function istDayStartInstant(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MS);
}

/** Every signed-in activity (u = account id, d = IST day) since `since`.
 *  The rule is DEFINITIONS' ACTIVITY sentence in src/lib/public-numbers-rules.ts. */
function activitySql(since: Date): Prisma.Sql {
  return Prisma.sql`
    SELECT "userId" AS u, ${istDay(`"createdAt"`)} AS d FROM "AnalyticsEvent"
      WHERE "userId" IS NOT NULL AND ("client" IS NULL OR "client" <> 'bot') AND "createdAt" >= ${since}
    UNION
    SELECT "userId", ${istDay(`"startedAt"`)} FROM "Attempt" WHERE "startedAt" >= ${since}
    UNION
    SELECT "userId", ${istDay(`"finishedAt"`)} FROM "Attempt"
      WHERE status IN ${SUBMITTED} AND "finishedAt" >= ${since}
    UNION
    SELECT cs."userId", ${istDay(`cm."createdAt"`)} FROM "ChatMessage" cm
      JOIN "ChatSession" cs ON cs.id = cm."sessionId"
      WHERE cm.role = 'USER' AND cm."createdAt" >= ${since}`;
}

/** The "people who came" counter's human rule over all-time page views. */
const HUMAN_IDS = Prisma.sql`
  SELECT COALESCE("userId", "anonId") AS k
  FROM "AnalyticsEvent"
  WHERE kind = 'PAGE_VIEW' AND COALESCE("userId", "anonId") IS NOT NULL
  GROUP BY 1
  ${Prisma.raw(HUMAN_RULE_HAVING)}`;

/** ADMIN_EMAILS, parsed exactly as src/lib/admin.ts does. */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Account ids of the team (never returned to a page). A sentinel keeps the
 *  SQL array non-empty. */
async function teamIds(): Promise<string[]> {
  const emails = adminEmails();
  if (!emails.length) return ["-"];
  const rows = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "User" WHERE lower(email) = ANY(${emails}::text[])`;
  return rows.length ? rows.map((r) => r.id) : ["-"];
}

const num = (v: unknown): number => Number(v ?? 0);

function cached<T>(name: string, fn: () => Promise<T>): () => Promise<T | null> {
  const c = unstable_cache(fn, ["public-numbers", name, "v1"], { revalidate: PUBLIC_NUMBERS_REVALIDATE, tags: [PUBLIC_NUMBERS_TAG] });
  return async () => {
    try {
      return await c();
    } catch (err) {
      console.error(`[public-numbers] ${name} could not be read`, err);
      return null;
    }
  };
}

// ── Cohort returns ────────────────────────────────────────────────────

async function readCohortReturns(): Promise<CohortReturns> {
  const win = numbersWindows(new Date());
  const firsts = [win.cohortWeeks[0], win.pooled30Weeks[0]].filter(Boolean) as IsoWeek[];
  const from = new Date(Math.min(...firsts.map((w) => Date.parse(w.start))));
  const to = new Date(win.cohortWeeks[win.cohortWeeks.length - 1].end);
  const team = await teamIds();
  const rows = await prisma.$queryRaw<{ wk: string; cohort: number; ret7: number; ret30: number }[]>`
    WITH act AS (${activitySql(from)}),
    c AS (
      SELECT id, ${istWeek(`"createdAt"`)} AS wk, ${istDay(`"createdAt"`)} AS d0
      FROM "User"
      WHERE "createdAt" >= ${from} AND "createdAt" < ${to} AND NOT (id = ANY(${team}::text[]))
    ),
    r AS (
      SELECT c.id, c.wk,
        COALESCE(bool_or(a.d BETWEEN c.d0 + 1 AND c.d0 + 7), FALSE) AS r7,
        COALESCE(bool_or(a.d BETWEEN c.d0 + 8 AND c.d0 + 30), FALSE) AS r30
      FROM c LEFT JOIN act a ON a.u = c.id
      GROUP BY c.id, c.wk
    )
    SELECT wk, COUNT(*)::int AS cohort,
      (COUNT(*) FILTER (WHERE r7))::int AS ret7,
      (COUNT(*) FILTER (WHERE r30))::int AS ret30
    FROM r GROUP BY wk ORDER BY wk`;
  return buildCohortReturns(
    rows.map((r) => ({ wk: r.wk, cohort: num(r.cohort), ret7: num(r.ret7), ret30: num(r.ret30) })),
    win,
  );
}

/** Came back within 7 days / on days 8-30, pooled and by sign-up week. */
export const loadCohortReturns = cached("cohort-returns", readCohortReturns);

// ── 30-day actives ────────────────────────────────────────────────────

async function readActives30(): Promise<Actives30> {
  const win = numbersWindows(new Date());
  const firstDay = addDays(win.today, -29);
  const since = istDayStartInstant(firstDay);
  const team = await teamIds();
  const rows = await prisma.$queryRaw<{ accounts: number; active30: number; active30_after: number }[]>`
    WITH act AS (${activitySql(since)})
    SELECT
      (SELECT COUNT(*)::int FROM "User" WHERE NOT (id = ANY(${team}::text[]))) AS accounts,
      (SELECT COUNT(DISTINCT a.u)::int FROM act a
         WHERE a.d >= ${firstDay}::date AND a.d <= ${win.today}::date AND NOT (a.u = ANY(${team}::text[]))) AS active30,
      (SELECT COUNT(DISTINCT a.u)::int FROM act a JOIN "User" x ON x.id = a.u
         WHERE a.d >= ${firstDay}::date AND a.d <= ${win.today}::date AND a.d > ${istDay(`x."createdAt"`)}
           AND NOT (a.u = ANY(${team}::text[]))) AS active30_after`;
  const r = rows[0];
  return buildActives30({ accounts: num(r?.accounts), active30: num(r?.active30), active30After: num(r?.active30_after) }, win);
}

/** Accounts active in the last 30 IST days (and the stricter, sign-up-day-free version). */
export const loadActives30 = cached("actives-30", readActives30);

// ── Weekly usage ──────────────────────────────────────────────────────

type WkN = { wk: string; n: number };

async function readWeeklyUsage(): Promise<WeeklyUsage> {
  const win = numbersWindows(new Date());
  const weeks = win.usageWeeks;
  const from = new Date(weeks[0].start);
  const to = new Date(weeks[weeks.length - 1].end);
  const fromDay = weeks[0].startDay;
  const toDay = weeks[weeks.length - 1].endDay;
  const team = await teamIds();
  const [signups, mocks, tutor, actives, people] = await Promise.all([
    prisma.$queryRaw<WkN[]>`
      SELECT ${istWeek(`"createdAt"`)} AS wk, COUNT(*)::int AS n FROM "User"
      WHERE "createdAt" >= ${from} AND "createdAt" < ${to} AND NOT (id = ANY(${team}::text[]))
      GROUP BY 1`,
    prisma.$queryRaw<{ wk: string; n: number; takers: number }[]>`
      SELECT ${istWeek(`"finishedAt"`)} AS wk, COUNT(*)::int AS n, COUNT(DISTINCT "userId")::int AS takers FROM "Attempt"
      WHERE status IN ${SUBMITTED} AND "finishedAt" >= ${from} AND "finishedAt" < ${to}
        AND NOT ("userId" = ANY(${team}::text[]))
      GROUP BY 1`,
    prisma.$queryRaw<WkN[]>`
      SELECT wk, SUM(n)::int AS n FROM (
        SELECT ${istWeek(`cm."createdAt"`)} AS wk, COUNT(*) AS n
        FROM "ChatMessage" cm JOIN "ChatSession" cs ON cs.id = cm."sessionId"
        WHERE cm.role = 'USER' AND COALESCE(cs."contextSnapshot"->>'source', '') <> ${GUEST_IMPORT_SOURCE}
          AND cm."createdAt" >= ${from} AND cm."createdAt" < ${to}
          AND NOT (cs."userId" = ANY(${team}::text[]))
        GROUP BY 1
        UNION ALL
        SELECT ${istWeek(`"createdAt"`)}, COUNT(*) FROM "AnonTutorLog"
        WHERE "anonId" IS NOT NULL AND "createdAt" >= ${from} AND "createdAt" < ${to}
        GROUP BY 1
      ) t GROUP BY wk`,
    prisma.$queryRaw<WkN[]>`
      WITH act AS (${activitySql(from)})
      SELECT to_char(date_trunc('week', d)::date, 'YYYY-MM-DD') AS wk, COUNT(DISTINCT u)::int AS n
      FROM act
      WHERE d >= ${fromDay}::date AND d <= ${toDay}::date AND NOT (u = ANY(${team}::text[]))
      GROUP BY 1`,
    // People who came: the counter's human identities with a page view that
    // week (bots out), plus that week's identity-less browser landings. The
    // counter's gap-era overlap correction (identities born 31 Jul–16 Aug)
    // cannot touch these weeks: the column starts at PEOPLE_FIRST_WEEK.
    prisma.$queryRaw<WkN[]>`
      WITH human AS (${HUMAN_IDS}),
      ids AS (
        SELECT ${istWeek(`e."createdAt"`)} AS wk, COUNT(DISTINCT COALESCE(e."userId", e."anonId")) AS n
        FROM "AnalyticsEvent" e JOIN human h ON h.k = COALESCE(e."userId", e."anonId")
        WHERE e.kind = 'PAGE_VIEW' AND (e."client" IS NULL OR e."client" <> 'bot')
          AND e."createdAt" >= ${from} AND e."createdAt" < ${to}
          AND NOT (h.k = ANY(${team}::text[]))
        GROUP BY 1
      ),
      walk AS (
        SELECT ${istWeek(`"createdAt"`)} AS wk, COUNT(*) AS n FROM "AnalyticsEvent"
        WHERE kind = 'PAGE_VIEW' AND "client" = 'browser' AND "userId" IS NULL AND "anonId" IS NULL
          AND "createdAt" >= ${from} AND "createdAt" < ${to}
        GROUP BY 1
      )
      SELECT COALESCE(ids.wk, walk.wk) AS wk, (COALESCE(ids.n, 0) + COALESCE(walk.n, 0))::int AS n
      FROM ids FULL JOIN walk ON walk.wk = ids.wk`,
  ]);
  const clean = (rows: WkN[]) => rows.map((r) => ({ wk: r.wk, n: num(r.n) }));
  return buildWeeklyUsage(
    {
      signups: clean(signups),
      mocks: mocks.map((r) => ({ wk: r.wk, n: num(r.n), takers: num(r.takers) })),
      tutor: clean(tutor),
      actives: clean(actives),
      people: clean(people),
    },
    win,
  );
}

/** The last 8 complete weeks, plus mocks per active account in the last one. */
export const loadWeeklyUsage = cached("weekly-usage", readWeeklyUsage);

// ── Sources ───────────────────────────────────────────────────────────

function windowOf(weeks: readonly IsoWeek[]): { from: Date; to: Date } {
  return { from: new Date(weeks[0].start), to: new Date(weeks[weeks.length - 1].end) };
}

async function readSignupSources(): Promise<PublicNumber<SourceSplit> | null> {
  const win: NumbersWindows = numbersWindows(new Date());
  if (!win.signupSourceWeeks.length) return null;
  const { from, to } = windowOf(win.signupSourceWeeks);
  const team = await teamIds();
  const rows = await prisma.$queryRaw<FamilyRow[]>`
    WITH us AS (
      SELECT id, "signupReferrerHost" FROM "User"
      WHERE "createdAt" >= ${from} AND "createdAt" < ${to} AND NOT (id = ANY(${team}::text[]))
    ),
    s AS (
      SELECT DISTINCT ON (e."userId") e."userId", e."anonId", e."utmSource", e."utmMedium", e."refHost"
      FROM "AnalyticsEvent" e JOIN us ON us.id = e."userId"
      WHERE e.kind = 'SIGNUP'
      ORDER BY e."userId", e."createdAt"
    ),
    fa AS (
      SELECT DISTINCT ON (e."anonId") e."anonId", e."utmSource", e."utmMedium", e."refHost"
      FROM "AnalyticsEvent" e
      WHERE e.kind = 'PAGE_VIEW' AND e."anonId" IN (SELECT s."anonId" FROM s WHERE s."anonId" IS NOT NULL)
      ORDER BY e."anonId", e."createdAt"
    )
    SELECT
      CASE
        WHEN fa."anonId" IS NOT NULL THEN ${sourceFamilySql(`fa."utmSource"`, `fa."utmMedium"`, `fa."refHost"`)}
        WHEN s."utmSource" IS NOT NULL OR s."refHost" IS NOT NULL THEN ${sourceFamilySql(`s."utmSource"`, `s."utmMedium"`, `s."refHost"`)}
        WHEN us."signupReferrerHost" IS NOT NULL THEN ${sourceFamilySql(`us."signupReferrerHost"`, `NULL`, `us."signupReferrerHost"`)}
        ELSE 'direct'
      END AS fam,
      COUNT(*)::int AS n
    FROM us
    LEFT JOIN s ON s."userId" = us.id
    LEFT JOIN fa ON fa."anonId" = s."anonId"
    GROUP BY 1`;
  return buildSignupSources(rows.map((r) => ({ fam: r.fam, n: num(r.n) })), win);
}

/** Sign-ups by the source family of their browser's first visit. */
export const loadSignupSources = cached("signup-sources", readSignupSources);

async function readNewPeopleSources(): Promise<PublicNumber<SourceSplit> | null> {
  const win = numbersWindows(new Date());
  if (!win.newPeopleWeeks.length) return null;
  const { from, to } = windowOf(win.newPeopleWeeks);
  const team = await teamIds();
  const rows = await prisma.$queryRaw<FamilyRow[]>`
    WITH human AS (${HUMAN_IDS}),
    fv AS (
      SELECT DISTINCT ON (k) k, "createdAt" AS f, "utmSource", "utmMedium", "refHost"
      FROM (
        SELECT COALESCE("userId", "anonId") AS k, "createdAt", "utmSource", "utmMedium", "refHost"
        FROM "AnalyticsEvent"
        WHERE kind = 'PAGE_VIEW' AND ("client" IS NULL OR "client" <> 'bot') AND COALESCE("userId", "anonId") IS NOT NULL
      ) e
      ORDER BY k, "createdAt"
    )
    SELECT ${sourceFamilySql(`fv."utmSource"`, `fv."utmMedium"`, `fv."refHost"`)} AS fam, COUNT(*)::int AS n
    FROM fv JOIN human h ON h.k = fv.k
    WHERE fv.f >= ${from} AND fv.f < ${to} AND NOT (fv.k = ANY(${team}::text[]))
    GROUP BY 1`;
  return buildNewPeopleSources(rows.map((r) => ({ fam: r.fam, n: num(r.n) })), win);
}

/** New people (the counter's human identities) by the source family of their first visit. */
export const loadNewPeopleSources = cached("new-people-sources", readNewPeopleSources);

// ── Answer check and reports ──────────────────────────────────────────

async function readAnswerCheck(): Promise<PublicNumber<AnswerCheck>> {
  const today = istDayString(new Date());
  const [outcomes, unchecked] = await Promise.all([
    prisma.$queryRaw<
      {
        checked: number;
        accepted: number;
        key_corrected: number;
        withdrawn: number;
        live_before: number;
        live_kept: number;
        live_corrected: number;
        live_withdrawn: number;
        last_day: string | null;
      }[]
    >`
      WITH x AS (
        SELECT q.validated,
          q.metadata->'factoryVerify'->>'decision' AS decision,
          COALESCE((q.metadata->'factoryVerify'->>'keyCorrected')::boolean, FALSE) AS kc,
          COALESCE((q.metadata->'factoryVerify'->>'prevValidated')::boolean, FALSE) AS pv,
          CASE WHEN q.metadata->'factoryVerify'->>'at' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
               THEN (q.metadata->'factoryVerify'->>'at')::timestamptz END AS at
        FROM "Question" q
        WHERE q.metadata ? 'factoryVerify'
      )
      SELECT
        COUNT(*)::int AS checked,
        (COUNT(*) FILTER (WHERE validated AND decision = 'ACCEPT' AND NOT kc))::int AS accepted,
        (COUNT(*) FILTER (WHERE validated AND kc))::int AS key_corrected,
        (COUNT(*) FILTER (WHERE NOT validated))::int AS withdrawn,
        (COUNT(*) FILTER (WHERE pv))::int AS live_before,
        (COUNT(*) FILTER (WHERE pv AND validated AND NOT kc))::int AS live_kept,
        (COUNT(*) FILTER (WHERE pv AND validated AND kc))::int AS live_corrected,
        (COUNT(*) FILTER (WHERE pv AND NOT validated))::int AS live_withdrawn,
        to_char((MAX(at) AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS last_day
      FROM x`,
    // Served but never passed by the check — src/lib/exam-answer-check.ts's
    // rule, on the practice-question counter's scope (live real exams and
    // school chapters, withdrawn left out).
    prisma.$queryRaw<{ n: number; exams: number }[]>`
      SELECT COUNT(*)::int AS n, COUNT(DISTINCT q."examId")::int AS exams
      FROM "Question" q JOIN "Exam" e ON e.id = q."examId"
      WHERE q.validated = TRUE AND NOT (${WITHDRAWN_TAG} = ANY(q.tags))
        AND (${REAL_EXAM_SQL} OR e."category"::text = ${SCHOOL_CATEGORY})
        AND NOT (COALESCE(q."validatedBy", '') LIKE 'factory:%' AND COALESCE(q.metadata ? 'factoryVerify', FALSE))`,
  ]);
  const o = outcomes[0];
  return buildAnswerCheck(
    {
      checked: num(o?.checked),
      accepted: num(o?.accepted),
      keyCorrected: num(o?.key_corrected),
      withdrawn: num(o?.withdrawn),
      liveBefore: num(o?.live_before),
      liveKept: num(o?.live_kept),
      liveCorrected: num(o?.live_corrected),
      liveWithdrawn: num(o?.live_withdrawn),
      lastCheckDay: o?.last_day ?? null,
      uncheckedLive: num(unchecked[0]?.n),
      uncheckedExams: num(unchecked[0]?.exams),
    },
    today,
  );
}

/** What the automated answer check did to the question bank. */
export const loadAnswerCheck = cached("answer-check", readAnswerCheck);

async function readReports(): Promise<PublicNumber<CountOf>> {
  const rows = await prisma.$queryRaw<{ received: number; closed: number }[]>`
    SELECT COUNT(*)::int AS received, (COUNT(*) FILTER (WHERE resolved))::int AS closed FROM "QuestionReport"`;
  return buildReports(num(rows[0]?.received), num(rows[0]?.closed), istDayString(new Date()));
}

/** Student question reports received and closed, all time. Worded
 *  "closed", never "reviewed by a person" (27 Sep 2026: every closed report
 *  so far was closed by an automated process). */
export const loadReports = cached("question-reports", readReports);

// ── All-time counters (getLiveCounts, unchanged) ──────────────────────

export interface CounterRow {
  key: keyof LiveCounts;
  label: string;
  value: number;
  definition: string;
  /** Counts people or what people did (not supply) — printed through the
   *  K_MIN gate (src/lib/public-stats.ts cell()). */
  people: boolean;
}

/** The counters the page shows, in order, with plain labels. Left out:
 *  activeNow and the *Today counters (an hourly page cannot show a 30-minute
 *  or since-midnight number truthfully), walkIns (its own definition says
 *  "not shown") and signupsLast7Days (the weekly table covers it). */
export const COUNTER_ROWS: readonly { key: keyof LiveCounts; label: string; people: boolean }[] = [
  { key: "totalSignups", label: "Accounts", people: true },
  { key: "uniqueVisitors", label: "People who came (the home page strip's 'learners')", people: true },
  { key: "mocksTaken", label: "Mocks taken", people: true },
  { key: "tutorQuestions", label: "Questions to the AI tutor", people: true },
  { key: "questionsAnswered", label: "Questions answered in mocks", people: true },
  { key: "liveTestsTaken", label: "Live tests taken", people: true },
  { key: "examGoals", label: "Exam goals set", people: true },
  { key: "totalPageViews", label: "Page views", people: true },
  { key: "exams", label: "Exams covered", people: false },
  { key: "practiceQuestions", label: "Practice questions", people: false },
  { key: "topicNotes", label: "Topic notes", people: false },
  { key: "schoolChapters", label: "School chapters with notes or practice", people: false },
  { key: "languages", label: "Languages", people: false },
];

async function readCounters(): Promise<PublicNumber<CounterRow[]>> {
  const counts = await getLiveCounts();
  return {
    id: "all-time-counters",
    label: "All-time counters",
    value: COUNTER_ROWS.map((r) => ({ key: r.key, label: r.label, value: counts[r.key], definition: LIVE_COUNT_DEFINITIONS[r.key], people: r.people })),
    definition: "The site's live counters (the strip on the home page), each with its own definition, word for word.",
    asOf: istDayString(new Date()),
    period: "all time",
    source: SOURCES.counters,
  };
}

/** The all-time counters, from getLiveCounts() with LIVE_COUNT_DEFINITIONS. */
export const loadCounters = cached("counters", readCounters);

// ── Coverage ──────────────────────────────────────────────────────────

export interface CoverageRow {
  id: string;
  label: string;
  value: number;
  /** A second number or phrase ("on 31 exams"). */
  detail?: string;
  definition: string;
}

export interface CoverageGroup {
  title: string;
  rows: CoverageRow[];
}

export const EXAM_KIND_PLURAL: Record<ExamKind, string> = {
  government: "Government recruitment exams",
  entrance: "Entrance exams",
  olympiad: "Olympiads",
  professional: "Professional exams",
};

/** Days ahead the upcoming-dates row looks. */
export const UPCOMING_DAYS = 90;

async function readCoverage(): Promise<PublicNumber<CoverageGroup[]>> {
  const now = new Date();
  const today = istDayString(now);
  const todayStart = istDayStartInstant(today);
  const until = istDayStartInstant(addDays(today, UPCOMING_DAYS));
  const [exams, checked, surface, counters, schoolPending, official, dateRows] = await Promise.all([
    prisma.exam.findMany({ where: REAL_EXAM_WHERE, select: { code: true, category: true } }),
    countCheckedQuestions(),
    loadSchoolSurface(),
    loadCounters(),
    // 27 Sep 2026 (fixer review): school containers by CATEGORY, whatever
    // `active` is — every SCHOOL_BOARD row is inactive by design (the
    // SCHOOL entries of tests/unit/exam-scope-guard.test.ts), so SCHOOL_SQL
    // (active = TRUE) would print 0 here. NOT (NOT_SCHOOL_SQL) is exactly
    // `category = SCHOOL_BOARD` (the column is NOT NULL), said through the
    // scope helper the guard recognises.
    prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM "Question" q JOIN "Exam" e ON e.id = q."examId"
      WHERE NOT (${NOT_SCHOOL_SQL}) AND q.validated = FALSE
        AND NOT (${WITHDRAWN_TAG} = ANY(q.tags)) AND NOT COALESCE(q.metadata ? 'factoryVerify', FALSE)`,
    prisma.$queryRaw<{ papers: number; paper_exams: number; cutoffs: number; cutoff_exams: number }[]>`
      SELECT
        (SELECT COUNT(*)::int FROM "OfficialPaper" p JOIN "Exam" e ON e.id = p."examId" WHERE p."archivedAt" IS NULL AND ${REAL_EXAM_SQL}) AS papers,
        (SELECT COUNT(DISTINCT p."examId")::int FROM "OfficialPaper" p JOIN "Exam" e ON e.id = p."examId" WHERE p."archivedAt" IS NULL AND ${REAL_EXAM_SQL}) AS paper_exams,
        (SELECT COUNT(*)::int FROM "OfficialCutoff" c JOIN "Exam" e ON e.id = c."examId" WHERE c."archivedAt" IS NULL AND ${REAL_EXAM_SQL}) AS cutoffs,
        (SELECT COUNT(DISTINCT c."examId")::int FROM "OfficialCutoff" c JOIN "Exam" e ON e.id = c."examId" WHERE c."archivedAt" IS NULL AND ${REAL_EXAM_SQL}) AS cutoff_exams`,
    prisma.examImportantDate.findMany({
      where: { date: { gte: todayStart, lt: until }, archivedAt: null, exam: REAL_EXAM_WHERE },
      select: {
        id: true,
        examId: true,
        label: true,
        date: true,
        isExamDay: true,
        kind: true,
        confidence: true,
        url: true,
        notes: true,
        source: true,
        exam: { select: { eligibility: { select: { officialUrl: true } } } },
      },
    }),
  ]);

  // Exams by kind (src/lib/exam-kind.ts), largest first.
  const byKind = new Map<ExamKind, number>();
  for (const e of exams) {
    const k = examKind({ code: e.code, category: String(e.category) });
    byKind.set(k, (byKind.get(k) ?? 0) + 1);
  }
  const kindRows: CoverageRow[] = [...byKind.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => ({ id: `exams-${k}`, label: EXAM_KIND_PLURAL[k], value: n, definition: "Live exams of this kind (src/lib/exam-kind.ts)." }));

  // Upcoming dates by tier (buildTimeline per exam, the trackers' own rule).
  const perExam = new Map<string, typeof dateRows>();
  for (const r of dateRows) perExam.set(r.examId, [...(perExam.get(r.examId) ?? []), r]);
  const tierRows = { official: 0, reported: 0, expected: 0 };
  const tierExams = { official: new Set<string>(), reported: new Set<string>(), expected: new Set<string>() };
  for (const [examId, rows] of perExam) {
    const officialUrl = rows[0]?.exam.eligibility?.officialUrl ?? null;
    for (const t of buildTimeline(rows, now, officialUrl)) {
      // 27 Sep 2026 (integrator): an Official-tier date whose own label says
      // expected, tentative or likely is not an announcement; it is counted
      // nowhere, the same rule as Shishya Pulse (src/lib/pulse-rules.ts), so
      // the two pages agree.
      if (t.tier === "official" && labelSaysExpected(t.label)) continue;
      tierRows[t.tier]++;
      tierExams[t.tier].add(examId);
    }
  }

  const sc = schoolSurfaceCounts({ classes: surface.classes.filter((c) => c.curriculum === "NCERT") });
  const allSc = schoolSurfaceCounts(surface);
  const counterValue = (key: keyof LiveCounts): number | null => counters?.value.find((c) => c.key === key)?.value ?? null;
  const practice = counterValue("practiceQuestions");
  const notes = counterValue("topicNotes");
  const o = official[0];
  const onExams = (n: number) => `on ${n} exam${n === 1 ? "" : "s"}`;

  const groups: CoverageGroup[] = [
    {
      title: "Exams and practice",
      rows: [
        { id: "exams", label: "Exams covered", value: exams.length, definition: LIVE_COUNT_DEFINITIONS.exams },
        ...kindRows,
        ...(practice !== null ? [{ id: "practice-questions", label: "Practice questions", value: practice, definition: LIVE_COUNT_DEFINITIONS.practiceQuestions }] : []),
        {
          id: "checked-questions",
          label: "Practice questions that passed the answer check",
          value: checked,
          definition: "Validated, not withdrawn questions on live exams and school chapters that carry the answer check's pass record (validated by the check, with its verdict stored).",
        },
        ...(notes !== null ? [{ id: "topic-notes", label: "Topic notes", value: notes, definition: LIVE_COUNT_DEFINITIONS.topicNotes }] : []),
      ],
    },
    {
      title: "School",
      rows: [
        { id: "ncert-chapters", label: "NCERT chapters listed, each linking the official book", value: sc.chapters, definition: "Top-level NCERT chapters on the school pages; each links NCERT's own PDF on ncert.nic.in." },
        { id: "chapters-with-notes", label: "School chapters with Shishya's own notes", value: allSc.chaptersWithNotes, definition: "School chapters whose page carries Shishya's own chapter notes." },
        {
          id: "chapters-with-practice",
          label: "School chapters with checked practice",
          value: allSc.chaptersWithPractice,
          definition: "School chapters with enough validated, answer-checked questions for a practice quiz (the school quiz's own minimum).",
        },
        {
          id: "school-questions-awaiting-check",
          label: "School questions written, not yet through the answer check",
          value: num(schoolPending[0]?.n),
          definition: "Questions on school chapters that are not validated, not withdrawn and have no answer-check record yet. They are not shown to students until they pass.",
        },
      ],
    },
    {
      title: "Official sources",
      rows: [
        {
          id: "official-papers",
          label: "Official previous-year papers linked",
          value: num(o?.papers),
          detail: onExams(num(o?.paper_exams)),
          definition: "Links to question papers and answer keys on the conducting bodies' own sites, on live exams.",
        },
        {
          id: "official-cutoffs",
          label: "Official cutoff rows",
          value: num(o?.cutoffs),
          detail: onExams(num(o?.cutoff_exams)),
          definition: "Cutoff figures copied from the conducting bodies' own published documents, each with its source link, on live exams.",
        },
        {
          id: "dates-official",
          label: `Exam dates in the next ${UPCOMING_DAYS} days marked Official`,
          value: tierRows.official,
          detail: onExams(tierExams.official.size),
          definition: "Tracker dates announced and cited on the conducting body's own site (src/lib/official-source.ts). A date whose own label says expected, tentative or likely is left out, as on Shishya Pulse.",
        },
        {
          id: "dates-reported",
          label: `Exam dates in the next ${UPCOMING_DAYS} days marked Reported`,
          value: tierRows.reported,
          detail: onExams(tierExams.reported.size),
          definition: "Tracker dates that were announced but are cited through a secondary source such as a news or coaching site.",
        },
        {
          id: "dates-expected",
          label: `Exam dates in the next ${UPCOMING_DAYS} days marked Expected`,
          value: tierRows.expected,
          detail: onExams(tierExams.expected.size),
          definition: "Estimates from previous cycles, never presented as announcements.",
        },
      ],
    },
    {
      title: "Colleges, scholarships, careers and languages",
      rows: [
        { id: "colleges", label: `Colleges from the NIRF ${NIRF_SOURCE_YEAR} rankings`, value: COLLEGES.length, definition: "Entries in src/lib/colleges-data.ts." },
        { id: "scholarships", label: "Scholarships", value: SCHOLARSHIP_SCHEMES.length, definition: "Scholarship schemes, each linking its awarding body (the one outside aggregator is not counted)." },
        { id: "careers", label: "Career guides", value: CAREERS.length, definition: "Entries in src/data/careers.ts." },
        { id: "languages", label: "Languages", value: LANGUAGE_COUNT, detail: `English and ${INDIAN_LANGUAGE_COUNT} Indian languages`, definition: LIVE_COUNT_DEFINITIONS.languages },
      ],
    },
  ];

  return {
    id: "coverage",
    label: "What Shishya covers",
    value: groups,
    definition: "Counts of what Shishya holds, read from its database and data files when the page is built.",
    asOf: today,
    period: `as of ${istDayLabel(today)}; exam dates ${istDayRangeLabel(today, addDays(today, UPCOMING_DAYS - 1))}`,
    source: SOURCES.coverage,
  };
}

/** What Shishya holds: exams, questions, school, official sources, data files. */
export const loadCoverage = cached("coverage", readCoverage);

// ── Everything at once ────────────────────────────────────────────────

export interface PublicNumbers {
  /** IST day of this render. */
  today: string;
  cohorts: CohortReturns | null;
  actives: Actives30 | null;
  weekly: WeeklyUsage | null;
  signupSources: PublicNumber<SourceSplit> | null;
  newPeople: PublicNumber<SourceSplit> | null;
  answerCheck: PublicNumber<AnswerCheck> | null;
  reports: PublicNumber<CountOf> | null;
  counters: PublicNumber<CounterRow[]> | null;
  coverage: PublicNumber<CoverageGroup[]> | null;
}

/** Every loader in parallel; each part is null when its read failed. */
export async function loadPublicNumbers(): Promise<PublicNumbers> {
  const [cohorts, actives, weekly, signupSources, newPeople, answerCheck, reports, counters, coverage] = await Promise.all([
    loadCohortReturns(),
    loadActives30(),
    loadWeeklyUsage(),
    loadSignupSources(),
    loadNewPeopleSources(),
    loadAnswerCheck(),
    loadReports(),
    loadCounters(),
    loadCoverage(),
  ]);
  return { today: istDayString(new Date()), cohorts, actives, weekly, signupSources, newPeople, answerCheck, reports, counters, coverage };
}

export { DEFINITIONS };

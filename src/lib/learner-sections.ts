// Who the learners are — the live strip's learners counter split by the
// section of Shishya each person studies in (30 Sep 2026, founder: "divide
// the learners into school students, entrance, government exam aspirants,
// graduates, postgraduates …, you decide the names").
//
// Every learner (src/lib/live-counts-server.ts uniqueVisitors: engaged
// persons + identity-less landings − the gap-era overlap; the keys are
// src/lib/learner-count.ts's) is counted in exactly ONE group, so the groups
// add up to the learners count:
//   • a person goes to the section where it has the most page views
//     (a tie goes to the section it viewed last); pages that belong to no
//     section (home, Ask, dashboard, sign-in …) do not vote, and a person
//     with only such pages is "general pages only" (key: exploring);
//   • an identity-less landing (3 Oct 2026: one per device per IST day, not
//     one per page view) goes to its most-viewed section the same way;
//   • the gap-era overlap is taken from the identity's own group.
// Checked on production on 30 Sep 2026: the groups summed to 16,035 = the
// learners counter, and today's groups to +76 = its "+N today". Again on
// 3 Oct 2026 with the person / device keys (scripts/tmp-strip-5.ts): 14,902
// and +97 on both sides.
//
// Sections come from the page path, and for exam pages from the exam's own
// row: government recruitment and eligibility exams (SSC, banking, railways,
// police, state PSCs, UPSC, TET / CTET), current affairs, jobs map, typing,
// descriptive, the government-exam finder → govt exam aspirants; admission
// tests after Class 12 (engineering, medical, law, management, university,
// NDA, the state CETs, CA / CS foundation — the strip files CA / CS with
// admission tests, where src/lib/exam-kind.ts calls them "professional") →
// entrance aspirants; olympiads and /schooling → school students; PG
// entrance tests (src/lib/pg-entrances.ts: CAT, NEET PG, CUET PG, IIT JAM,
// every GATE paper, and the state MBA / MCA tests AP ICET, TS ICET, MAH-CET
// MBA) and /post-graduation → PG entrance aspirants; UGC NET / CSIR NET
// (lectureship, JRF, PhD admission) → NET aspirants; scholarships, colleges,
// careers → scholarship & college seekers. A mock or result page counts for
// its exam (/mocks/{id}, /attempts/{id}). Pages that list every kind of exam
// (/exams, browse, state, category and level lists, the exam calendar,
// results, alerts, live tests) do not vote, like home and Ask.
//
// 30 Sep 2026 (P1 build 1, founder decision P1-D3): the life-stage hubs vote
// — /after-10th with the school students (the option pages after Class 10,
// /schooling/streams/{option}, already do, being /schooling), /after-12th
// with the entrance aspirants. COUNTER CHANGE (metric-reconciliation rule):
// before this they were unknown paths and voted "exploring"; the learners
// total is unchanged, only the split between the groups moves. Say so in the
// commit message.
//
// Labels name what people look at, not who they are: a PG entrance group
// holds final-year students too, a school group holds parents. Review
// (30 Sep 2026): totals are exact; the per-group split carries a small
// unmeasured bias, because a gap-era identity's orphan landing is added to
// the group of the page it landed on while its overlap comes off the
// identity's own group.
//
// The read scans every page view (1.6–3.6 s on 30 Sep 2026), so the strip
// memoises it (src/lib/live-counts-server.ts getSectionCounts): the groups
// can trail the live learners count by a few minutes. Pure: constants + SQL
// text, no DB.

import { Prisma } from "@prisma/client";
import { SIGNUP_LINK_CTE, landingKeySql, personKeySql, signupJoinSql, walkInWhereSql } from "@/lib/learner-count";
import { ENTRANCE_EXCEPTION_CODES, STATE_CET_CODES } from "@/lib/exam-kind";
import { PG_ENTRANCE_CODES } from "@/lib/pg-entrances";

export const LEARNER_SECTIONS = ["govt", "school", "entrance", "college", "graduate", "postgraduate", "exploring"] as const;
export type LearnerSection = (typeof LEARNER_SECTIONS)[number];

/** Exams that need a master's already (lectureship, JRF, PhD admission) — the
 *  research exams /post-graduation lists apart from PG entrance tests. */
export const POSTGRAD_CODES = ["UGC_NET", "CSIR_NET"] as const;

/** Degree-level admission tests the shared PG list leaves out: the state MBA /
 *  MCA tests. (Every GATE paper is matched by prefix.) Kept here, not in
 *  src/lib/pg-entrances.ts, because /post-graduation lists that one. */
export const PG_ENTRANCE_EXTRA_CODES = ["AP_ICET", "TS_ICET", "MH_MAHCET_MBA"] as const;

export const SECTION_TTL_MS = 5 * 60_000;

const CODE = /^[A-Z0-9_]+$/;
function codeList(codes: readonly string[]): string {
  for (const c of codes) if (!CODE.test(c)) throw new Error(`learner-sections: bad exam code ${c}`);
  return codes.map((c) => `'${c}'`).join(", ");
}

/** SQL CASE: the section of one page view, from sp (the path without its
 *  /hi or /te prefix), ecode and ecat (its exam's code and category, when
 *  the page belongs to an exam). */
export function sectionCaseSql(): string {
  return `CASE
      WHEN sp ~ '^/(schooling|after-10th)(/|$)' THEN 'school'
      WHEN sp ~ '^/after-12th(/|$)' THEN 'entrance'
      WHEN sp ~ '^/post-graduation(/|$)' THEN 'graduate'
      WHEN sp ~ '^/(colleges|scholarships|distance-learning|worldwide|careers|career-map|jobs|soft-skills|alumni-stories|internships)(/|$)' THEN 'college'
      WHEN sp ~ '^/exams/?$' OR sp ~ '^/exams/(browse|state|category|after)(/|$)'
        OR sp ~ '^/(exam-calendar|results|exam-alerts|live-test)(/|$)' THEN 'exploring'
      WHEN ecode IS NOT NULL THEN CASE
        WHEN ecode IN (${codeList(POSTGRAD_CODES)}) THEN 'postgraduate'
        WHEN ecode ~ '^GATE_' OR ecode IN (${codeList([...PG_ENTRANCE_CODES, ...PG_ENTRANCE_EXTRA_CODES])}) THEN 'graduate'
        WHEN ecat IN ('OLYMPIAD', 'SCHOOL_BOARD') THEN 'school'
        WHEN ecode IN (${codeList([...ENTRANCE_EXCEPTION_CODES, ...STATE_CET_CODES])})
          OR ecat IN ('ENGINEERING', 'MEDICAL', 'LAW', 'MBA', 'UNIVERSITY', 'OTHER') THEN 'entrance'
        ELSE 'govt' END
      WHEN sp ~ '^/exams/entrance(/|$)' THEN 'entrance'
      WHEN sp ~ '^/(exams|current-affairs|jobs-map|find-your-exam|typing|descriptive)(/|$)' THEN 'govt'
      ELSE 'exploring' END`;
}

/** One query, rows of (sec, part, n, today): part 'engaged' / 'walkin' /
 *  'overlap', n all-time, today since dayStart. The learner rule, the
 *  person key (a new account and its pre-sign-in anonymous id are one
 *  person, for accounts made since 11 Sep 2026 — earlier SIGNUP rows carry
 *  no browser id), the landing key (one per device per IST day) and the overlap
 *  window are the uniqueVisitors counter's own (src/lib/learner-count.ts).
 *  A landing key goes to its most-viewed section like a person does (a
 *  device may open several pages the same day). */
export function learnerSectionsSql(dayStart: Date): Prisma.Sql {
  return Prisma.sql`
    WITH ${Prisma.raw(SIGNUP_LINK_CTE)}, pv AS MATERIALIZED (
      SELECT ${Prisma.raw(personKeySql("a"))} AS k,
        CASE WHEN ${Prisma.raw(walkInWhereSql("a"))} THEN ${Prisma.raw(landingKeySql("a"))} END AS lk,
        a."createdAt", a."refHost", a."utmSource",
        regexp_replace(a.path, '^/(hi|te)(/|$)', '/') AS sp
      FROM "AnalyticsEvent" a ${Prisma.raw(signupJoinSql("a"))} WHERE a.kind = 'PAGE_VIEW'
    ), pv2 AS (
      SELECT pv.*, COALESCE(e1.code, e2.code, e3.code) AS ecode, COALESCE(e1.category, e2.category, e3.category)::text AS ecat
      FROM pv
      LEFT JOIN "Exam" e1 ON e1.code = substring(pv.sp from '^/exams/([A-Z0-9_]+)')
      LEFT JOIN "Mock" m ON pv.sp LIKE '/mocks/%' AND m.id = substring(pv.sp from '^/mocks/([a-z0-9]+)')
      LEFT JOIN "Exam" e2 ON e2.id = m."examId"
      LEFT JOIN "Attempt" at ON pv.sp LIKE '/attempts/%' AND at.id = substring(pv.sp from '^/attempts/([a-z0-9]+)')
      LEFT JOIN "Mock" m3 ON m3.id = at."mockId"
      LEFT JOIN "Exam" e3 ON e3.id = m3."examId"
    ), s AS (
      SELECT pv2.*, ${Prisma.raw(sectionCaseSql())} AS sec FROM pv2
    ), ids AS (
      SELECT k, COUNT(*) AS c, bool_or("refHost" IS NOT NULL) AS r, bool_or("utmSource" IS NOT NULL) AS u, MIN("createdAt") AS first_at,
        COUNT(*) FILTER (WHERE "createdAt" < ${dayStart}) AS cb,
        COALESCE(bool_or("refHost" IS NOT NULL) FILTER (WHERE "createdAt" < ${dayStart}), FALSE) AS rb,
        COALESCE(bool_or("utmSource" IS NOT NULL) FILTER (WHERE "createdAt" < ${dayStart}), FALSE) AS ub
      FROM s WHERE k IS NOT NULL GROUP BY k
    ), secs AS (
      SELECT k, sec, COUNT(*) AS n, MAX("createdAt") AS last_at FROM s WHERE k IS NOT NULL AND sec <> 'exploring' GROUP BY k, sec
    ), prim AS (
      SELECT DISTINCT ON (k) k, sec FROM secs ORDER BY k, n DESC, last_at DESC
    ), learners AS (
      SELECT i.*, COALESCE(pr.sec, 'exploring') AS sec FROM ids i LEFT JOIN prim pr ON pr.k = i.k
      WHERE i.c >= 2 OR (i.c = 1 AND (i.r OR i.u))
    ), wsecs AS (
      SELECT lk, sec, COUNT(*) AS n, MAX("createdAt") AS last_at FROM s WHERE lk IS NOT NULL AND sec <> 'exploring' GROUP BY lk, sec
    ), wprim AS (
      SELECT DISTINCT ON (lk) lk, sec FROM wsecs ORDER BY lk, n DESC, last_at DESC
    ), walkins AS (
      SELECT w.lk, w.today, COALESCE(wp.sec, 'exploring') AS sec
      FROM (SELECT lk, bool_or("createdAt" >= ${dayStart}) AS today FROM s WHERE lk IS NOT NULL GROUP BY lk) w
      LEFT JOIN wprim wp ON wp.lk = w.lk
    ), learner_sections AS (
      SELECT sec, 'engaged' AS part, COUNT(*)::int AS n,
        COUNT(*) FILTER (WHERE NOT (cb >= 2 OR (cb = 1 AND (rb OR ub))))::int AS today
      FROM learners GROUP BY sec
      UNION ALL
      SELECT sec, 'overlap', COUNT(*)::int, COUNT(*) FILTER (WHERE cb < 2)::int
      FROM learners WHERE c >= 2 AND first_at >= '2026-07-30T20:00:00Z' AND first_at < '2026-08-16T17:00:00Z' GROUP BY sec
      UNION ALL
      SELECT sec, 'walkin', COUNT(*)::int, COUNT(*) FILTER (WHERE today)::int
      FROM walkins GROUP BY sec
    )
    SELECT sec, part, n, today FROM learner_sections
  `;
}

export interface SectionCount {
  total: number;
  today: number;
}
export type LearnerSectionCounts = Record<LearnerSection, SectionCount>;

export function zeroSectionCounts(): LearnerSectionCounts {
  return Object.fromEntries(LEARNER_SECTIONS.map((s) => [s, { total: 0, today: 0 }])) as LearnerSectionCounts;
}

/** Fold the query's rows: engaged + walk-ins − overlap per section, each at
 *  least 0. An unknown section name is ignored (never guessed into a group). */
export function foldSectionRows(rows: readonly { sec: string; part: string; n: number | bigint; today: number | bigint }[]): LearnerSectionCounts {
  const out = zeroSectionCounts();
  for (const r of rows) {
    if (!(LEARNER_SECTIONS as readonly string[]).includes(r.sec)) continue;
    const sign = r.part === "overlap" ? -1 : r.part === "engaged" || r.part === "walkin" ? 1 : 0;
    const b = out[r.sec as LearnerSection];
    b.total += sign * Number(r.n);
    b.today += sign * Number(r.today);
  }
  // Totals only: a group's "today" can dip below 0 (a gap-era overlap that closed
  // today) and must stay unclamped so the seven "today"s still add up to the
  // learners' own "+N today"; the strip shows a today pill only when it is > 0.
  for (const s of LEARNER_SECTIONS) out[s].total = Math.max(0, out[s].total);
  return out;
}

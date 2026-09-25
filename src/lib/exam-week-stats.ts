// Exam Week Mode — founder readout numbers behind /admin/exam-week
// (6 Sep 2026, wave 2). No cron: the founder opens the page and the
// queries run then. Raw SQL throughout; every timestamp is bucketed into
// IST calendar days (+330 minutes), the same convention as istDay() in
// src/lib/exam-week.ts, so "D0" here is the same day the hub block calls
// exam day.
//
// Two lists share one enrichment pass:
//   current — one row per exam the shared state machine puts in phase
//             week…post (typed exam-day row within [-7, +7]); D0 = the
//             state's focus day, window = its windowDays;
//   past    — one row per (exam, typed exam day) 8–30 days ago, so the
//             founder sees the full D-7..D+3 curve of finished exam days.
//
// Neon rule: never two heavy queries in parallel — every read below is a
// sequential await, and each one degrades to "no numbers" on error so the
// page still renders.
//
// Definitions (all "people" = distinct COALESCE(userId, anonId) on
// PAGE_VIEW rows with client IS DISTINCT FROM 'bot' — identified humans;
// unidentified rows are where stealth crawlers land and are excluded):
//   people[d]        people on the exam's pages (/exams/{CODE} and below,
//                    incl. the /hi and /te twins) on IST day D0+d
//   cutoffD0         people on /exams/{CODE}/cutoff on D0
//   cutoffLandersD0  of those, people whose FIRST exam-page view that day
//                    was the cutoff page (arrived there, not via the hub)
//   d1Return         people on the exam's pages on D0 who had ANY page view
//                    on D0+1
//   verdicts         ExamVerdict rows pooled like the hub tally
//                    ([windowFirst-14, max(windowLast, today)] — see
//                    loadExamWeekTally); past rows: examDate = that day
//   alerts           ExamAlert rows created on IST days D-7..D+3
//   enrolled/shift   active enrollments / of those with a shiftDate set
//   eve              EmailTouch 'exam-eve-{CODE}' on D-1 — the EXAM-SCOPED
//                    tag the eve cron writes, so the send is attributed to
//                    the exam it was actually about
//   dayAfter         EmailTouch 'sent:exam-day-after' on D+1. That cron has
//                    no scoped tag, so this one still goes through the
//                    user's active enrollment — a user enrolled in two
//                    exams that week is counted under both (approximate)
//   resultSends      EmailTouch 'sent:result-day-{CODE}' on/after D0, again
//                    the exam-scoped tag
//
// A loader that fails (Neon timeout) does NOT render as 0 — its columns go
// to null / "–" and the page prints which sources are missing. A row of
// zeros reads as "nobody came", which is a different and much worse claim
// than "we could not count" (review 6 Sep 2026).

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { REAL_EXAM_SQL } from "@/lib/db/exam-scope";
import { istDay, type ExamWeekPhase } from "@/lib/exam-week";
import { buildTimeline, type SourceTier, type TimelineInput } from "@/lib/exam-timeline";
import { loadExamWeekExams } from "@/lib/exam-week-aeo";

const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 330 * 60_000;
/** Same pooling span as loadExamWeekTally (exam-week-aeo.ts). */
const WINDOW_GAP_DAYS = 14;
const PAST_FROM_DAYS = 30;
const PAST_TO_DAYS = 8;

/** Column offsets relative to D0. */
export const DAY_OFFSETS = [-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3] as const;
const MIN_OFFSET = DAY_OFFSETS[0];
const MAX_OFFSET = DAY_OFFSETS[DAY_OFFSETS.length - 1];

export interface VerdictCounts {
  n: number;
  easy: number;
  moderate: number;
  tough: number;
}

/** One read that can fail on its own; its columns then render "–". */
export type StatSource =
  | "seeds"
  | "pastDays"
  | "people"
  | "d1Return"
  | "verdicts"
  | "alerts"
  | "enrolments"
  | "mail";

/** Founder-readable name of each source, for the "could not load" notice. */
export const SOURCE_LABEL: Record<StatSource, string> = {
  seeds: "the exam list",
  pastDays: "past exam days",
  people: "people / cutoff / landers",
  d1Return: "D+1 return",
  verdicts: "verdicts",
  alerts: "alerts",
  enrolments: "enrolled / shift set",
  mail: "eve / day-after / result sends",
};

export interface ExamWeekStatRow {
  examId: string;
  code: string;
  short: string;
  /** State-machine phase for current rows; "past" for the 8–30-day table. */
  phase: ExamWeekPhase | "past";
  tier: SourceTier;
  /** IST day "YYYY-MM-DD" of the exam day in focus (D0). */
  d0: string;
  /** Window span (both equal d0 for a single-day exam). */
  windowFirst: string;
  windowLast: string;
  /** d0 − today in days (negative = past). */
  daysTo: number;
  /** One entry per DAY_OFFSETS; null = that IST day has not started yet,
   *  OR the read that feeds it failed (see ExamWeekStats.failed). Every
   *  nullable field below is null for the same two reasons — never 0. */
  people: (number | null)[];
  cutoffD0: number | null;
  cutoffLandersD0: number | null;
  d1Return: number | null;
  verdicts: VerdictCounts | null;
  alerts: number | null;
  enrolled: number | null;
  shiftSet: number | null;
  eveSends: number | null;
  dayAfterSends: number | null;
  resultSends: number | null;
}

interface Seed {
  examId: string;
  code: string;
  short: string;
  phase: ExamWeekPhase | "past";
  tier: SourceTier;
  d0: string;
  windowFirst: string;
  windowLast: string;
}

function shiftDay(iso: string, days: number): string {
  return new Date(Date.parse(iso + "T00:00:00Z") + days * DAY_MS).toISOString().slice(0, 10);
}

function dayDiff(fromDay: string, toDay: string): number {
  return Math.round((Date.parse(toDay + "T00:00:00Z") - Date.parse(fromDay + "T00:00:00Z")) / DAY_MS);
}

/** UTC instant at which the IST calendar day `iso` begins. */
function istDayStart(iso: string): Date {
  return new Date(Date.parse(iso + "T00:00:00Z") - IST_OFFSET_MS);
}

function minDay(days: string[]): string {
  return days.reduce((a, b) => (b < a ? b : a));
}
function maxDay(days: string[]): string {
  return days.reduce((a, b) => (b > a ? b : a));
}

// ── Seeds ─────────────────────────────────────────────────────────────

/** `ok: false` = the read failed, so an empty list means "unknown", not
 *  "none" — the page says so instead of printing a confident zero. */
interface Loaded<T> {
  rows: T;
  ok: boolean;
}

async function currentSeeds(now: Date): Promise<Loaded<Seed[]>> {
  let ok = true;
  const exams = await loadExamWeekExams({ now }).catch((err) => {
    console.error("[exam-week-stats] loadExamWeekExams failed", err);
    ok = false;
    return [];
  });
  const seeds: Seed[] = [];
  for (const e of exams) {
    const s = e.state;
    if (!s.focusDay || !s.tier || s.phase === "none") continue;
    const days = s.windowDays.map((r) => r.day);
    seeds.push({
      examId: e.id,
      code: e.code,
      short: e.shortName,
      phase: s.phase,
      tier: s.tier,
      d0: s.focusDay,
      windowFirst: days.length ? minDay(days) : s.focusDay,
      windowLast: days.length ? maxDay(days) : s.focusDay,
    });
  }
  seeds.sort((a, b) => a.d0.localeCompare(b.d0) || a.code.localeCompare(b.code));
  return { rows: seeds, ok };
}

interface PastDateRow extends TimelineInput {
  id: string;
  examId: string;
  code: string;
  short: string;
  officialUrl: string | null;
  label: string;
  date: Date;
  isExamDay: boolean;
  kind: string | null;
  confidence: string | null;
  url: string | null;
  source: string | null;
  notes: string | null;
}

const TIER_RANK: Record<SourceTier, number> = { official: 0, reported: 1, expected: 2 };

/** One seed per (active exam, typed exam day) with the day 8–30 days ago.
 *  25 Sep 2026: "active exam" = real exam (REAL_EXAM_SQL, src/lib/db/exam-scope.ts). */
async function pastSeeds(now: Date): Promise<Loaded<Seed[]>> {
  const today = istDay(now);
  const fromDay = shiftDay(today, -PAST_FROM_DAYS);
  const toDay = shiftDay(today, -PAST_TO_DAYS);
  let ok = true;
  const rows = await prisma.$queryRaw<PastDateRow[]>`
    SELECT d.id, d."examId", e.code, e."shortName" AS short, el."officialUrl",
           d.label, d.date, d."isExamDay", d.kind, d.confidence, d.url, d.source, d.notes
    FROM "ExamImportantDate" d
    JOIN "Exam" e ON e.id = d."examId" AND ${REAL_EXAM_SQL}
    LEFT JOIN "ExamEligibility" el ON el."examId" = e.id
    WHERE d."archivedAt" IS NULL
      AND d.kind = 'EXAM'
      AND (d.date + INTERVAL '330 minutes')::date >= ${fromDay}::date
      AND (d.date + INTERVAL '330 minutes')::date <= ${toDay}::date
    ORDER BY d.date ASC`.catch((err) => {
    console.error("[exam-week-stats] past exam days failed", err);
    ok = false;
    return [] as PastDateRow[];
  });
  const byKey = new Map<string, Seed>();
  for (const r of rows) {
    const t = buildTimeline([r], now, r.officialUrl)[0];
    if (!t) continue;
    const key = `${r.examId}|${t.day}`;
    const prev = byKey.get(key);
    if (prev && TIER_RANK[prev.tier] <= TIER_RANK[t.tier]) continue;
    byKey.set(key, {
      examId: r.examId,
      code: r.code,
      short: r.short,
      phase: "past",
      tier: t.tier,
      d0: t.day,
      windowFirst: t.day,
      windowLast: t.day,
    });
  }
  return {
    rows: [...byKey.values()].sort((a, b) => b.d0.localeCompare(a.d0) || a.code.localeCompare(b.code)),
    ok,
  };
}

// ── Enrichment (sequential reads) ─────────────────────────────────────

interface PageDayRow {
  code: string;
  day: string;
  people: number;
  cutoff: number;
  landers: number;
}

/** People per (exam code, IST day) on the exam's pages in [from, to).
 *  null = the read failed (NOT "nobody came"). */
async function pageViewsByDay(codes: string[], from: Date, to: Date): Promise<PageDayRow[] | null> {
  if (codes.length === 0) return [];
  return prisma.$queryRaw<PageDayRow[]>`
    SELECT code, day,
           COUNT(DISTINCT k)::int AS people,
           COUNT(DISTINCT CASE WHEN sub = 'cutoff' THEN k END)::int AS cutoff,
           COUNT(DISTINCT CASE WHEN rn = 1 AND sub = 'cutoff' THEN k END)::int AS landers
    FROM (
      SELECT code, sub, day, k,
             ROW_NUMBER() OVER (PARTITION BY code, day, k ORDER BY "createdAt") AS rn
      FROM (
        SELECT split_part(p, '/', 3) AS code,
               split_part(p, '/', 4) AS sub,
               to_char(("createdAt" + INTERVAL '330 minutes')::date, 'YYYY-MM-DD') AS day,
               COALESCE("userId", "anonId") AS k,
               "createdAt"
        FROM (
          SELECT CASE WHEN path LIKE '/hi/%' OR path LIKE '/te/%' THEN substr(path, 4) ELSE path END AS p,
                 "userId", "anonId", "createdAt"
          FROM "AnalyticsEvent"
          WHERE kind = 'PAGE_VIEW'::"EventKind"
            AND client IS DISTINCT FROM 'bot'
            AND COALESCE("userId", "anonId") IS NOT NULL
            AND "createdAt" >= ${from} AND "createdAt" < ${to}
            AND (path LIKE '/exams/%' OR path LIKE '/hi/exams/%' OR path LIKE '/te/exams/%')
        ) e
      ) v
      WHERE code IN (${Prisma.join(codes)})
    ) w
    GROUP BY code, day`.catch((err) => {
    console.error("[exam-week-stats] page views failed", err);
    return null;
  });
}

/** People on the exam's pages on D0 who had any page view on D0+1.
 *  null = the read failed. */
async function d1Returns(seeds: { code: string; d0: string }[]): Promise<Map<string, number> | null> {
  const out = new Map<string, number>();
  if (seeds.length === 0) return out;
  const from = istDayStart(minDay(seeds.map((s) => s.d0)));
  const to = istDayStart(shiftDay(maxDay(seeds.map((s) => s.d0)), 1));
  const values = Prisma.join(seeds.map((s) => Prisma.sql`(${s.code}, ${s.d0}::date)`));
  const rows = await prisma.$queryRaw<{ code: string; d0: string; returned: number }[]>`
    WITH seeds(code, d0) AS (VALUES ${values}),
    cohort AS (
      SELECT DISTINCT s.code, s.d0, COALESCE(e."userId", e."anonId") AS k
      FROM "AnalyticsEvent" e
      JOIN seeds s
        ON e."createdAt" >= (s.d0::timestamp - INTERVAL '330 minutes')
       AND e."createdAt" <  (s.d0::timestamp + INTERVAL '1 day' - INTERVAL '330 minutes')
       AND split_part(CASE WHEN e.path LIKE '/hi/%' OR e.path LIKE '/te/%' THEN substr(e.path, 4) ELSE e.path END, '/', 3) = s.code
      WHERE e.kind = 'PAGE_VIEW'::"EventKind"
        AND e.client IS DISTINCT FROM 'bot'
        AND COALESCE(e."userId", e."anonId") IS NOT NULL
        AND e."createdAt" >= ${from} AND e."createdAt" < ${to}
        AND (e.path LIKE '/exams/%' OR e.path LIKE '/hi/exams/%' OR e.path LIKE '/te/exams/%')
    )
    SELECT d.code, to_char(d.d0, 'YYYY-MM-DD') AS d0, COUNT(DISTINCT d.k)::int AS returned
    FROM cohort d
    WHERE EXISTS (
      SELECT 1 FROM "AnalyticsEvent" r
      WHERE r.kind = 'PAGE_VIEW'::"EventKind"
        AND r.client IS DISTINCT FROM 'bot'
        AND (r."userId" = d.k OR r."anonId" = d.k)
        AND r."createdAt" >= (d.d0::timestamp + INTERVAL '1 day' - INTERVAL '330 minutes')
        AND r."createdAt" <  (d.d0::timestamp + INTERVAL '2 days' - INTERVAL '330 minutes')
    )
    GROUP BY d.code, d.d0`.catch((err) => {
    console.error("[exam-week-stats] D+1 return failed", err);
    return null;
  });
  if (rows == null) return null;
  for (const r of rows) out.set(`${r.code}|${r.d0}`, Number(r.returned));
  return out;
}

interface VerdictRow {
  examId: string;
  day: string;
  verdict: string;
  n: number;
}

async function verdictRows(examIds: string[], fromDay: string, toDay: string): Promise<VerdictRow[] | null> {
  if (examIds.length === 0) return [];
  return prisma.$queryRaw<VerdictRow[]>`
    SELECT "examId", to_char("examDate", 'YYYY-MM-DD') AS day, verdict, COUNT(*)::int AS n
    FROM "ExamVerdict"
    WHERE "examId" IN (${Prisma.join(examIds)})
      AND "examDate" >= ${fromDay}::date AND "examDate" <= ${toDay}::date
    GROUP BY 1, 2, 3`.catch((err) => {
    console.error("[exam-week-stats] verdicts failed", err);
    return null;
  });
}

interface DayCountRow {
  examId: string;
  day: string;
  n: number;
}

async function alertRows(examIds: string[], from: Date, to: Date): Promise<DayCountRow[] | null> {
  if (examIds.length === 0) return [];
  return prisma.$queryRaw<DayCountRow[]>`
    SELECT "examId", to_char(("createdAt" + INTERVAL '330 minutes')::date, 'YYYY-MM-DD') AS day, COUNT(*)::int AS n
    FROM "ExamAlert"
    WHERE "examId" IN (${Prisma.join(examIds)})
      AND "createdAt" >= ${from} AND "createdAt" < ${to}
    GROUP BY 1, 2`.catch((err) => {
    console.error("[exam-week-stats] alerts failed", err);
    return null;
  });
}

async function enrollmentRows(
  examIds: string[],
): Promise<{ examId: string; enrolled: number; shiftSet: number }[] | null> {
  if (examIds.length === 0) return [];
  return prisma.$queryRaw<{ examId: string; enrolled: number; shiftSet: number }[]>`
    SELECT "examId",
           COUNT(*) FILTER (WHERE active)::int AS enrolled,
           COUNT(*) FILTER (WHERE active AND "shiftDate" IS NOT NULL)::int AS "shiftSet"
    FROM "Enrollment"
    WHERE "examId" IN (${Prisma.join(examIds)})
    GROUP BY 1`.catch((err) => {
    console.error("[exam-week-stats] enrollments failed", err);
    return null;
  });
}

interface TouchRow {
  examId: string;
  kind: "eve" | "after" | "result";
  day: string;
  n: number;
}

/** Same normalisation the eve / result-day crons apply when they write the
 *  exam-scoped EmailTouch tag (src/app/api/cron/exam-eve, .../result-day). */
function tagCode(code: string): string {
  return code.replace(/[^A-Za-z0-9_-]/g, "-");
}

/**
 * Exam-week mail sends per (exam, kind, IST day).
 *
 * The eve and result-day tags CARRY the exam code, so those two are matched
 * on the scoped tag. Attributing them through "any active enrollment" (as
 * this did) credited an SSC CGL eve mail to the same reader's NDA row too,
 * inflating both columns (review 6 Sep 2026). The day-after cron writes no
 * scoped tag — only 'sent:exam-day-after' — so that one still goes through
 * the enrollment join and stays approximate, as the header says.
 * null = the read failed.
 */
async function touchRows(
  exams: { examId: string; code: string }[],
  from: Date,
  to: Date,
): Promise<TouchRow[] | null> {
  if (exams.length === 0) return [];
  const examIds = exams.map((e) => e.examId);
  const scoped = Prisma.join(
    exams.map(
      (e) =>
        Prisma.sql`(${e.examId}::text, ${"exam-eve-" + tagCode(e.code)}::text, ${"sent:result-day-" + tagCode(e.code)}::text)`,
    ),
  );
  const allScoped = Prisma.join(
    exams.flatMap((e) => ["exam-eve-" + tagCode(e.code), "sent:result-day-" + tagCode(e.code)]),
  );
  // EmailTouch is indexed on (userId, tag, sentAt), so a tag+sentAt filter
  // scans; the CTE is referenced twice, so Postgres materialises it and we
  // pay for exactly ONE scan (Neon rule: keep the heavy read singular).
  return prisma.$queryRaw<TouchRow[]>`
    WITH ex(exam_id, eve_tag, result_tag) AS (VALUES ${scoped}),
    touch AS (
      SELECT t."userId", t.tag,
             to_char((t."sentAt" + INTERVAL '330 minutes')::date, 'YYYY-MM-DD') AS day
      FROM "EmailTouch" t
      WHERE t."sentAt" >= ${from} AND t."sentAt" < ${to}
        AND (t.tag = 'sent:exam-day-after' OR t.tag IN (${allScoped}))
    )
    SELECT ex.exam_id AS "examId",
           (CASE WHEN tc.tag = ex.eve_tag THEN 'eve' ELSE 'result' END)::text AS kind,
           tc.day, COUNT(DISTINCT tc."userId")::int AS n
    FROM touch tc
    JOIN ex ON tc.tag = ex.eve_tag OR tc.tag = ex.result_tag
    GROUP BY 1, 2, 3
    UNION ALL
    SELECT en."examId", 'after'::text AS kind,
           tc.day, COUNT(DISTINCT tc."userId")::int AS n
    FROM touch tc
    JOIN "Enrollment" en ON en."userId" = tc."userId" AND en.active = TRUE
      AND en."examId" IN (${Prisma.join(examIds)})
    WHERE tc.tag = 'sent:exam-day-after'
    GROUP BY en."examId", tc.day`.catch((err) => {
    console.error("[exam-week-stats] email touches failed", err);
    return null;
  });
}

async function enrich(seeds: Seed[], now: Date): Promise<{ rows: ExamWeekStatRow[]; failed: StatSource[] }> {
  if (seeds.length === 0) return { rows: [], failed: [] };
  const today = istDay(now);
  const codes = [...new Set(seeds.map((s) => s.code))];
  const examIds = [...new Set(seeds.map((s) => s.examId))];
  const byExam = new Map(seeds.map((s) => [s.examId, s.code]));
  const d0s = seeds.map((s) => s.d0);
  const firstDays = seeds.map((s) => s.windowFirst);
  const lastDays = seeds.map((s) => s.windowLast);
  // Each null below means "we could not count", which the row renders as
  // "–". Printing 0 instead would read as "nobody came" — a claim we have
  // no evidence for (review 6 Sep 2026).
  const failed: StatSource[] = [];

  // 1) page views — the heavy one; bounded to the columns we render.
  const pvFrom = istDayStart(shiftDay(minDay(d0s), MIN_OFFSET));
  const pvToDay = shiftDay(maxDay(d0s), MAX_OFFSET + 1);
  const pvTo = istDayStart(pvToDay < shiftDay(today, 1) ? pvToDay : shiftDay(today, 1));
  const pv = pvTo > pvFrom ? await pageViewsByDay(codes, pvFrom, pvTo) : [];
  if (pv == null) failed.push("people");
  const pvMap = new Map<string, PageDayRow>();
  for (const r of pv ?? []) pvMap.set(`${r.code}|${r.day}`, r);

  // 2) D+1 return — only for exam days whose D+1 has begun, one seed per (code, D0).
  const retSeeds = new Map<string, { code: string; d0: string }>();
  for (const s of seeds) if (s.d0 < today) retSeeds.set(`${s.code}|${s.d0}`, { code: s.code, d0: s.d0 });
  const ret = await d1Returns([...retSeeds.values()]);
  if (ret == null) failed.push("d1Return");

  // 3) verdicts — pooled like the hub tally.
  const vFrom = shiftDay(minDay(firstDays), -WINDOW_GAP_DAYS);
  const vTo = maxDay([...lastDays, today]);
  const verdicts = await verdictRows(examIds, vFrom, vTo);
  if (verdicts == null) failed.push("verdicts");

  // 4) alert subscriptions D-7..D+3.
  const aFrom = istDayStart(shiftDay(minDay(d0s), MIN_OFFSET));
  const aTo = istDayStart(shiftDay(maxDay(d0s), MAX_OFFSET + 1));
  const alerts = await alertRows(examIds, aFrom, aTo);
  if (alerts == null) failed.push("alerts");

  // 5) enrollments + shift dates.
  const enr = await enrollmentRows(examIds);
  if (enr == null) failed.push("enrolments");
  const enrMap = new Map((enr ?? []).map((r) => [r.examId, r]));

  // 6) exam-week mail sends: eve of the first window day … now.
  const tFrom = istDayStart(shiftDay(minDay(firstDays), -2));
  const touches = await touchRows(
    examIds.map((id) => ({ examId: id, code: byExam.get(id)! })),
    tFrom,
    new Date(now.getTime() + DAY_MS),
  );
  if (touches == null) failed.push("mail");

  const rows = seeds.map((s) => {
    const people = DAY_OFFSETS.map((off) => {
      const day = shiftDay(s.d0, off);
      if (day > today || pv == null) return null;
      return pvMap.get(`${s.code}|${day}`)?.people ?? 0;
    });
    const d0Started = s.d0 <= today && pv != null;
    const d0Row = pvMap.get(`${s.code}|${s.d0}`);

    const vFromRow = s.phase === "past" ? s.d0 : shiftDay(s.windowFirst, -WINDOW_GAP_DAYS);
    const vToRow = s.phase === "past" ? s.d0 : maxDay([s.windowLast, today]);
    const vc: VerdictCounts = { n: 0, easy: 0, moderate: 0, tough: 0 };
    for (const v of verdicts ?? []) {
      if (v.examId !== s.examId || v.day < vFromRow || v.day > vToRow) continue;
      const n = Number(v.n);
      if (v.verdict === "EASY") vc.easy += n;
      else if (v.verdict === "MODERATE") vc.moderate += n;
      else if (v.verdict === "TOUGH") vc.tough += n;
      else continue;
      vc.n += n;
    }

    const aFromRow = shiftDay(s.d0, MIN_OFFSET);
    const aToRow = shiftDay(s.d0, MAX_OFFSET);
    let alertN = 0;
    for (const a of alerts ?? []) if (a.examId === s.examId && a.day >= aFromRow && a.day <= aToRow) alertN += Number(a.n);

    const eveFrom = shiftDay(s.windowFirst, -1);
    const eveTo = shiftDay(s.windowLast, -1);
    const afterFrom = shiftDay(s.windowFirst, 1);
    const afterTo = shiftDay(s.windowLast, 1);
    let eve = 0;
    let after = 0;
    let result = 0;
    for (const t of touches ?? []) {
      if (t.examId !== s.examId) continue;
      const n = Number(t.n);
      if (t.kind === "eve" && t.day >= eveFrom && t.day <= eveTo) eve += n;
      else if (t.kind === "after" && t.day >= afterFrom && t.day <= afterTo) after += n;
      else if (t.kind === "result" && t.day >= s.d0) result += n;
    }

    const e = enrMap.get(s.examId);
    return {
      examId: s.examId,
      code: s.code,
      short: s.short,
      phase: s.phase,
      tier: s.tier,
      d0: s.d0,
      windowFirst: s.windowFirst,
      windowLast: s.windowLast,
      daysTo: dayDiff(today, s.d0),
      people,
      cutoffD0: d0Started ? (d0Row?.cutoff ?? 0) : null,
      cutoffLandersD0: d0Started ? (d0Row?.landers ?? 0) : null,
      d1Return: ret != null && s.d0 < today ? (ret.get(`${s.code}|${s.d0}`) ?? 0) : null,
      verdicts: verdicts == null ? null : vc,
      alerts: alerts == null ? null : alertN,
      enrolled: enr == null ? null : e ? Number(e.enrolled) : 0,
      shiftSet: enr == null ? null : e ? Number(e.shiftSet) : 0,
      eveSends: touches == null ? null : eve,
      dayAfterSends: touches == null ? null : after,
      resultSends: touches == null ? null : result,
    };
  });
  return { rows, failed };
}

// ── Public API ────────────────────────────────────────────────────────

export interface ExamWeekStats {
  today: string;
  /** Exams in phase week…post right now, earliest exam day first. */
  current: ExamWeekStatRow[];
  /** One row per (exam, exam day) 8–30 days ago, most recent first. */
  past: ExamWeekStatRow[];
  pastFromDay: string;
  pastToDay: string;
  /** Reads that failed on this open. Their columns are "–", NOT 0, and the
   *  page prints the list — a full row of zeros reads as "nobody came". */
  failed: StatSource[];
}

/** Everything /admin/exam-week renders. Sequential reads; never throws. */
export async function loadExamWeekStats(now: Date = new Date()): Promise<ExamWeekStats> {
  const today = istDay(now);
  const failed = new Set<StatSource>();

  const cur = await currentSeeds(now);
  if (!cur.ok) failed.add("seeds");
  const current = await enrich(cur.rows, now);
  for (const f of current.failed) failed.add(f);

  const pastSeedList = await pastSeeds(now);
  if (!pastSeedList.ok) failed.add("pastDays");
  const past = await enrich(pastSeedList.rows, now);
  for (const f of past.failed) failed.add(f);

  return {
    today,
    current: current.rows,
    past: past.rows,
    pastFromDay: shiftDay(today, -PAST_FROM_DAYS),
    pastToDay: shiftDay(today, -PAST_TO_DAYS),
    failed: [...failed],
  };
}

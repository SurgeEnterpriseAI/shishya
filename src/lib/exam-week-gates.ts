// When the exam-day pages are worth Google's index (26 Sep 2026, G1 index
// hygiene) — ONE rule the pages' robots and src/app/sitemap.ts both read, so
// a page is in the sitemap exactly when Google may index it.
//
// Why: /exams/{code}/live, /reactions, /checklist and /score-estimate render
// for every active exam all year, but they only hold something a searcher
// needs around a real paper. Out of season they are near-empty shells ("not
// announced yet", a poll with no votes) — the exam-week shells Search
// Console lists as crawled-not-indexed. Until today /checklist was in the
// sitemap for all 180 real exams, and the other three were listed (and marked
// indexable for every engine, src/lib/exam-phase-indexable.ts) around exam
// days of ANY tier, including expected dates nobody announced. On 26 Sep 2026
// (scripts/tmp-w2-g1-gates.ts) the new windows list checklist 20 (was 180),
// score-estimate 3 (was 50), live 23 (was 38) and reactions 23 (was 50).
//
// The windows (IST calendar days, inclusive):
//   • /live, /reactions — examWeek: a TYPED exam-day row (kind "EXAM") of
//     tier official or reported (src/lib/official-source.ts sourceTier —
//     an estimate never counts; a denylisted citation reads as an estimate)
//     from EXAM_DAY_INDEX_BEFORE_DAYS before it to EXAM_DAY_INDEX_AFTER_DAYS
//     after it: the eve, the paper, and the answer-key / cutoff weeks.
//   • /checklist — an official/reported exam day in the next
//     CHECKLIST_INDEX_AHEAD_DAYS or the last CHECKLIST_INDEX_AFTER_DAYS.
//   • /score-estimate — examWeek AND a typed official-tier ANSWER_KEY row
//     (kind ANSWER_KEY, or OTHER labelled "answer key"; cited on the
//     conducting body's site or the exam's portal — "reported" does not
//     count) dated on or after that window's exam day and not in the future:
//     the estimator is for counting marks against a released key.
//   Rows with no kind (the May 2026 seed) never count: the sitemap reads
//   typed rows only, and a guessed kind must not open an index window.
//
// Outside its window a page still renders; its robots are Google-only
// noindex,follow (GOOGLE_ONLY_NOINDEX, src/lib/news-index-policy.ts) and the
// sitemap leaves it out. Bing and OAI-SearchBot fetch these pages heavily
// (28 days to 26 Sep 2026: checklist Bingbot 980 / OAI 86, score-estimate
// 1,538 / 49, reactions 269 / 228, live 253 / 59) and ChatGPT answers from
// Bing's index, so every other engine keeps index,follow (the quality
// critic's veto of an all-engine noindex).
//
// Inputs: the exam's non-archived tracker rows and its portal URL — the
// pages pass getExamWeekInputs (all live rows, capped at 60 per exam; no exam
// had more than 60 on 26 Sep 2026), the sitemap passes one SQL read of every
// real exam's rows between GATE_ROWS_PAST_DAYS ago and GATE_ROWS_AHEAD_DAYS
// ahead — a superset of every row these windows can look at, so both reach
// the same verdict.
//
// Pure: no DB, no Next imports.

import { buildTimeline, type TimelineInput } from "@/lib/exam-timeline";
import { GOOGLE_ONLY_NOINDEX } from "@/lib/news-index-policy";

export const EXAM_DAY_INDEX_BEFORE_DAYS = 3;
export const EXAM_DAY_INDEX_AFTER_DAYS = 30;
export const CHECKLIST_INDEX_AHEAD_DAYS = 21;
export const CHECKLIST_INDEX_AFTER_DAYS = 3;

/** SQL pre-filter range for the sitemap read, with a day of slack each side
 *  for the IST/UTC boundary: it must hold every row the windows above read
 *  (exam days back to AFTER_DAYS, ahead to max(BEFORE, AHEAD); answer keys
 *  from the window's exam day to today). */
export const GATE_ROWS_PAST_DAYS = EXAM_DAY_INDEX_AFTER_DAYS + 2;
export const GATE_ROWS_AHEAD_DAYS = Math.max(EXAM_DAY_INDEX_BEFORE_DAYS, CHECKLIST_INDEX_AHEAD_DAYS) + 2;

export interface ExamPageIndexGates {
  /** /live and /reactions. */
  examWeek: boolean;
  checklist: boolean;
  scoreEstimate: boolean;
}

export const NO_GATES_OPEN: ExamPageIndexGates = { examWeek: false, checklist: false, scoreEstimate: false };

/** The index verdicts for one exam's exam-day pages at `now`. */
export function examPageIndexGates(
  rows: readonly TimelineInput[],
  officialUrl?: string | null,
  now: Date = new Date(),
): ExamPageIndexGates {
  const timeline = buildTimeline([...rows], now, officialUrl);
  // Typed, announced exam days: kind declared as EXAM (never guessed from a
  // legacy label) and tier official or reported.
  const examDays = timeline.filter((r) => r.kind === "EXAM" && r.kindDeclared && r.tier !== "expected");
  const inWeek = examDays.filter(
    (r) => r.daysFromToday >= -EXAM_DAY_INDEX_AFTER_DAYS && r.daysFromToday <= EXAM_DAY_INDEX_BEFORE_DAYS,
  );
  const examWeek = inWeek.length > 0;
  const checklist = examDays.some(
    (r) => r.daysFromToday >= -CHECKLIST_INDEX_AFTER_DAYS && r.daysFromToday <= CHECKLIST_INDEX_AHEAD_DAYS,
  );
  const firstWindowDay = examWeek ? Math.min(...inWeek.map((r) => r.daysFromToday)) : Infinity;
  const scoreEstimate =
    examWeek &&
    timeline.some(
      (r) => r.kind === "ANSWER_KEY" && r.kindDeclared && r.tier === "official" && r.daysFromToday <= 0 && r.daysFromToday >= firstWindowDay,
    );
  return { examWeek, checklist, scoreEstimate };
}

/** robots metadata for a gated page: undefined (the site default,
 *  index,follow everywhere) when indexable, else Google-only noindex,follow. */
export function examPageRobots(indexable: boolean): typeof GOOGLE_ONLY_NOINDEX | undefined {
  return indexable ? undefined : GOOGLE_ONLY_NOINDEX;
}

/** One exam's rows grouped from a flat read (the sitemap's single SQL). */
export function groupGateRows<T extends TimelineInput & { code: string }>(rows: readonly T[]): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const r of rows) {
    const list = out.get(r.code);
    if (list) list.push(r);
    else out.set(r.code, [r]);
  }
  return out;
}

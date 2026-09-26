// One rule for the exam-day pages' index and sitemap (26 Sep 2026).
//
// /exams/[code]/score-estimate, /live and /reactions render for every active
// exam, but src/app/sitemap.ts lists them only around the paper — and the
// pages themselves said index,follow all year. Crawlers kept fetching the
// out-of-season, near-empty copies: BotVisit over the last 30 days had 52
// exam-day paths that the sitemap leaves out crawled 729 times (/exams/CTET/
// score-estimate 56 times with the paper on 12 Dec and no answer key out).
// These helpers are the sitemap's inclusion rules, copied exactly, so a page
// is indexable precisely when the sitemap lists it; out of season a page is
// noindex,follow and still renders (the school section already shares one
// rule between robots and sitemap, isSchoolChapterIndexable). The sitemap
// (group B's file) can switch to the same helpers.
//
// Sitemap rules copied (src/app/sitemap.ts, 26 Sep 2026):
//   • score-estimate: a TYPED exam-day row (kind = 'EXAM', not archived)
//     dated within ±30 days of now — `d.date >= NOW() - INTERVAL '30 days'
//     AND d.date <= NOW() + INTERVAL '30 days'` — or a sitting open for
//     comparison after its official answer key (standingSitting, which the
//     sitemap evaluates for exams with an official ANSWER_KEY row in the
//     last 45 days);
//   • live / reactions: an active (archivedAt IS NULL) ExamPhaseArticle row
//     with that slug, or the exam inside exam week (loadExamWeekExams: a
//     phase in ACTIVE_EXAM_WEEK_PHASES).
//
// Pure: no DB. The pages read the inputs.

export const SCORE_ESTIMATE_EXAM_DAY_WINDOW_DAYS = 30;

const DAY_MS = 86_400_000;

/** Score estimator: indexable when a typed exam-day row falls within ±30
 *  days of `now` (inclusive), or the answer-key comparison is open. */
export function isScoreEstimateIndexable(i: {
  /** Dates of the exam's non-archived rows with kind "EXAM" (typed). */
  examDays: readonly (Date | string)[];
  /** standingSitting(exam, inputs) !== null. */
  answerKeyOpen: boolean;
  now?: Date;
}): boolean {
  if (i.answerKeyOpen) return true;
  const t = (i.now ?? new Date()).getTime();
  const lo = t - SCORE_ESTIMATE_EXAM_DAY_WINDOW_DAYS * DAY_MS;
  const hi = t + SCORE_ESTIMATE_EXAM_DAY_WINDOW_DAYS * DAY_MS;
  return i.examDays.some((d) => {
    const ms = (d instanceof Date ? d : new Date(d)).getTime();
    return Number.isFinite(ms) && ms >= lo && ms <= hi;
  });
}

/** Typed exam-day dates from tracker rows: kind exactly "EXAM" (the
 *  sitemap's `d.kind = 'EXAM'`; untyped legacy rows never count). */
export function typedExamDays(rows: readonly { kind?: string | null; date: Date | string }[]): (Date | string)[] {
  return rows.filter((r) => r.kind === "EXAM").map((r) => r.date);
}

/** /live and /reactions: indexable with an active article of that slug, or
 *  while the exam is in exam week. */
export function isPhasePageIndexable(i: { hasActiveArticle: boolean; inExamWeek: boolean }): boolean {
  return i.hasActiveArticle || i.inExamWeek;
}

/** The robots value for a page this rule keeps out of the index; undefined
 *  (the site default, index,follow) otherwise. */
export function examDayRobots(indexable: boolean): { index: false; follow: true } | undefined {
  return indexable ? undefined : { index: false, follow: true };
}

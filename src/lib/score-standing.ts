// Where a score estimate stands among the Shishya candidates who chose to
// add theirs (14 Sep 2026). Pure rules, safe on the client and the server;
// storage in src/lib/score-standing-db.ts, the page is
// /exams/[code]/score-estimate.
//
// Why: on answer-key day every candidate asks two things — "how many marks
// did I get?" (the calculator already answers that) and "is that good?".
// A list of real candidates' scores for the same sitting answers the second
// honestly, and "estimate yours" is the most natural thing to forward.
//
// Honesty rules:
//   • Opt-in. The calculator itself still keeps nothing; a score is kept
//     only when the candidate taps "add my score", and the page says what.
//   • The score is recomputed on the server from the counts, under the
//     exam's own marking scheme and only when that scheme can be stated —
//     a number typed into the browser is never stored.
//   • Anonymous: no account, no analytics id. A random key kept in the
//     browser lets a second entry replace the first.
//   • A position appears only once STANDING_MIN_ENTRIES candidates have
//     added a score, always with the count, and worded as "among Shishya
//     candidates who added a score" — never a rank in the exam: entries
//     are self-reported and unverified.

export const STANDING_MIN_ENTRIES = 30;

export interface EstimateCounts {
  attempted: number;
  correct: number;
  wrong: number;
}

export interface EstimateScheme {
  marksPerQ: number;
  negativeMark: number;
  /** Questions that count towards the total (scoredCount). */
  scored: number;
}

/** Counts that can describe a real answer sheet for this paper, else null. */
export function validCounts(c: EstimateCounts, scored: number): EstimateCounts | null {
  if ([c.attempted, c.correct, c.wrong].some((n) => !Number.isInteger(n) || n < 0)) return null;
  if (c.attempted > scored || c.correct + c.wrong > c.attempted) return null;
  return { attempted: c.attempted, correct: c.correct, wrong: c.wrong };
}

/** Marks under the scheme, rounded to 2 decimals — the calculator's own arithmetic. */
export function estimateScore(c: EstimateCounts, s: EstimateScheme): number {
  return Math.round((c.correct * s.marksPerQ - c.wrong * s.negativeMark) * 100) / 100;
}

/** "2026-09-07|special-tet-2026-exam": the IST day and stage label of the sitting a score is for. */
export function sittingKey(row: { day: string; label: string } | null | undefined): string | null {
  if (!row?.day) return null;
  const slug = row.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${row.day}|${slug}`;
}

export type StandingView =
  | { kind: "hidden" }
  | { kind: "count"; n: number }
  | { kind: "position"; n: number; higher: number; lower: number };

/**
 * What the page may say. `tied` counts entries with exactly this score,
 * the candidate's own included; below the threshold only the count is
 * shown, and with no entries nothing is.
 */
export function standingView(p: { n: number; higher: number; tied: number }): StandingView {
  if (p.n < 1) return { kind: "hidden" };
  if (p.n < STANDING_MIN_ENTRIES) return { kind: "count", n: p.n };
  return { kind: "position", n: p.n, higher: p.higher, lower: Math.max(0, p.n - p.higher - p.tied) };
}

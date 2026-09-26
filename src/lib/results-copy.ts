// /results window and intro line (26 Sep 2026).
//
// The page said "All declared government and entrance exam results in one
// place" and "Every declared result across government and entrance exams",
// while it lists only the results we extracted in the last 60 days (8 of the
// 52 ExamResult rows on 26 Sep 2026). The window and the row cap now live
// here, the SQL uses them, and the intro states the computed count.

export const RESULTS_WINDOW_DAYS = 60;
export const RESULTS_LIMIT = 100;

const fmt = (n: number) => n.toLocaleString("en-IN");
const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

const PROMISE = "the official link, an honest cutoff read and exactly what to do next. Updated every morning.";

/** Intro under the H1: computed from the rows the page actually lists. */
export function resultsIntro(rows: readonly { code: string }[]): string {
  const n = rows.length;
  if (n === 0) {
    return `Declared government and entrance exam results we track land here with ${PROMISE}`;
  }
  const exams = new Set(rows.map((r) => r.code)).size;
  const lead = n >= RESULTS_LIMIT ? `The latest ${fmt(n)} results` : `${fmt(n)} ${plural(n, "result")}`;
  return `${lead} declared in the last ${RESULTS_WINDOW_DAYS} days, across ${fmt(exams)} government and entrance ${plural(exams, "exam")} — each with ${PROMISE}`;
}

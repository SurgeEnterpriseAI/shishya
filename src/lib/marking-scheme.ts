// Can we state ONE marking scheme for this paper, and do the arithmetic
// under it? (7 Sep 2026.)
//
// Extracted from /exams/[code]/score-estimate so the CUTOFF page can ask the
// same question before it offers the estimator. It could not before, and on
// IOQM — the single biggest cutoff lander, 90 arrivals in 7 days — the
// "Estimate my score" pill led straight to a page that says we cannot.
//
// Not every exam can be stated: some store Exam.marksPerQ as a WEIGHTED
// AVERAGE across papers that carry different marks per question —
// scripts/seed-ap-amvi.ts says it in as many words ("marksPerQ: 1.5, //
// weighted average" over a 150 Q / 150 mark Paper-I and a 150 Q / 300 mark
// Paper-II). For those exams the printed line is false and every number the
// calculator returns is wrong. The schema has no per-paper marking, so we
// test what the Exam row can prove:
//
//   1. A per-question value an exam notice could actually print: a whole
//      number, a half, a third or a quarter (1, 2, 1.5, 4/3 stored 1.33,
//      2.5). 1.4, 1.6, 3.6 are fifths — nobody prints those, they are
//      averages (NSEP is 3 marks in Part A1 and 6 in Part A2 → "3.6").
//   2. A paper where every question carries m marks tops out at m × (the
//      number of questions that SCORE). When that does not equal totalMarks
//      the paper is NOT uniform — different papers or sections score
//      differently (NDA, UPPSC PCS, JEE Advanced, the SOF olympiads'
//      Achievers section) and "+m per correct, T marks" cannot both be true.
//      The scored count is Exam.scoredQuestions where the paper asks more
//      than it scores and totalQuestions otherwise, so NEET UG (200 asked,
//      180 scored, a uniform +4 → 720) and CUET UG (175 asked, 140 scored,
//      a uniform +5 → 700) state honestly.
//   3. The exam's own description listing two or more DIFFERENT part totals
//      ("Mathematics (300 marks…)" + "General Ability Test (600 marks…)")
//      is the tracker itself saying the papers do not score alike — this is
//      what catches AP AMVI, whose averaged numbers are self-consistent.
//
// A false positive costs a calculator and keeps an honest page; a false
// negative is a wrong score in a student's hands the evening of the exam.
// So this errs towards not stating.

export interface MarkingSchemeInput {
  totalQuestions: number;
  scoredQuestions: number | null;
  totalMarks: number;
  marksPerQ: number;
  description: string;
}

/** Questions that actually count towards totalMarks. */
export function scoredCount(exam: { totalQuestions: number; scoredQuestions: number | null }): number {
  const s = exam.scoredQuestions;
  return s != null && s > 0 && s <= exam.totalQuestions ? s : exam.totalQuestions;
}

export function markingSchemeStatable(exam: MarkingSchemeInput): boolean {
  const { totalQuestions: q, totalMarks: total, marksPerQ: m } = exam;
  if (!(m > 0) || !(q > 0) || !(total > 0)) return false;
  // 1 — a value a notice could print: halves, thirds, quarters (0.02 slack
  // for 4/3 stored as "1.33"). Anything else is an average of its papers.
  if (![1, 2, 3, 4].some((d) => Math.abs(m * d - Math.round(m * d)) < 0.02)) return false;
  // 2 — full marks under the printed scheme must be the printed total, over
  // the questions that SCORE.
  if (Math.abs(m * scoredCount(exam) - total) > Math.max(1, total * 0.005)) return false;
  // 3 — part totals the exam's own description lists.
  const partTotals = new Set(
    [...(exam.description ?? "").matchAll(/(\d[\d,]*)\s*marks/gi)]
      .map((x) => Number(x[1].replace(/,/g, "")))
      .filter((n) => n > 0 && n < total),
  );
  return partTotals.size < 2;
}

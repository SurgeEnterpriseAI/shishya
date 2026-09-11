// Can we state ONE marking scheme for this paper, and do the arithmetic
// under it? (7 Sep 2026; stage + per-exam guards 11 Sep 2026.)
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
// Two guards the numbers alone cannot give (11 Sep 2026, the SBI PO Mains /
// CDS weekend):
//
//   4. STAGE MISMATCH. The Exam row describes ONE stage of a multi-stage
//      exam — SBI_PO is 'SBI Probationary Officer (Prelims)': 100 Q, 100
//      marks, +1/−0.25. Its 12 Sep 2026 tracker row is 'Mains Exam', a
//      200-mark objective paper with unequal section weights. The stored
//      scheme is self-consistent, so rules 1–3 pass it, and the estimator
//      printed the Prelims arithmetic for a Mains sitting. So when the
//      exam's NAME declares a stage (Prelims / Tier 1 / Paper I / Phase 1 …)
//      and the relevant EXAM row's LABEL declares a different one (Mains /
//      Tier 2 / Paper II …), the scheme is not statable for that sitting.
//      Callers pass the label of the exam-day row the exam-week state has
//      in focus (next or just-held).
//   5. PER-EXAM LIST. CDS stores 300 Q / 300 marks / −0.333 — self-
//      consistent, passes 1–3 — but the real papers score unequally
//      (English 120 Q and GK 120 Q for 100 marks each; Maths 100 Q for 100
//      marks), so a single per-question mark cannot be stated. STOP-GAP
//      until the schema carries per-paper marks: UNEQUAL_PAPER_EXAMS names
//      such exams by code with the reason we print.
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
  /** Exam.code — keys the per-exam UNEQUAL_PAPER_EXAMS list (rule 5). */
  code?: string | null;
  /** Exam.name / Exam.shortName — the stage the stored pattern describes
   *  is read from these ("SBI Probationary Officer (Prelims)") (rule 4). */
  name?: string | null;
  shortName?: string | null;
}

export interface MarkingSchemeOptions {
  /** Label of the EXAM row the sitting in question belongs to — the row
   *  the exam-week state has in focus (next or just-held), e.g. 'Mains
   *  Exam'. Omit when no tracker row is known: rules 1–3 and 5 still run. */
  rowLabel?: string | null;
  /** Date of that row (midnight-UTC of the IST day, repo convention) —
   *  only used to word the reason ("the 12 Sept sitting"). */
  rowDate?: Date | string | null;
}

export interface MarkingSchemeVerdict {
  ok: boolean;
  /** Student-facing English sentence saying WHY the scheme cannot be
   *  stated; null when ok. Surfaces print it instead of a scheme. */
  reason: string | null;
}

/**
 * Exams whose papers score unequally although the stored Exam row is
 * self-consistent (rule 5). Keyed by Exam.code; the value is the reason
 * printed to students and machines. STOP-GAP until the schema carries
 * per-paper marks — when it does, delete this and read the papers.
 */
export const UNEQUAL_PAPER_EXAMS: Readonly<Record<string, string>> = {
  CDS: "CDS papers score unequally — English and GK: 120 questions for 100 marks each; Maths: 100 for 100 — one per-question mark cannot be stated.",
};

/**
 * What we can say about a sitting whose stage differs from the stored
 * pattern (rule 4), keyed by Exam.code then stage key. Verified from the
 * conducting body's own notice before being added; quoted inside the
 * refusal so the student learns what the sitting IS, not only what it is
 * not. SBI PO: SBI handout CRPD/PO/2026-27/09 (sbi.bank.in) — Online Main
 * Exam, objective tests 200 marks in 4 sections with separate timings,
 * penalty one-fourth of the marks assigned to the question (questions
 * carry unequal marks). STOP-GAP with UNEQUAL_PAPER_EXAMS above.
 */
export const SITTING_NOTES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  SBI_PO: { mains: "200 marks across 4 sections with unequal per-question marks" },
};

/** Questions that actually count towards totalMarks. */
export function scoredCount(exam: { totalQuestions: number; scoredQuestions: number | null }): number {
  const s = exam.scoredQuestions;
  return s != null && s > 0 && s <= exam.totalQuestions ? s : exam.totalQuestions;
}

// ── Rule 4: stage words ────────────────────────────────────────────────
//
// One canonical key per stage so "Tier-I", "Tier 1" and "Tier I" agree.
// The roman forms are anchored with \b so "Tier I" never matches inside
// "Tier II". Only stage words that name a DIFFERENT paper are listed;
// shift / slot / day words are not stages.
const STAGE_WORDS: ReadonlyArray<{ key: string; label: string; re: RegExp }> = [
  { key: "prelims", label: "Prelims", re: /\bprelim(?:s|inary)?\b/i },
  { key: "mains", label: "Mains", re: /\bmains?\b/i },
  { key: "tier1", label: "Tier 1", re: /\btier[\s-]*(?:1|i)\b/i },
  { key: "tier2", label: "Tier 2", re: /\btier[\s-]*(?:2|ii)\b/i },
  { key: "tier3", label: "Tier 3", re: /\btier[\s-]*(?:3|iii)\b/i },
  { key: "paper1", label: "Paper 1", re: /\bpaper[\s-]*(?:1|i)\b/i },
  { key: "paper2", label: "Paper 2", re: /\bpaper[\s-]*(?:2|ii)\b/i },
  { key: "paper3", label: "Paper 3", re: /\bpaper[\s-]*(?:3|iii)\b/i },
  { key: "phase1", label: "Phase 1", re: /\bphase[\s-]*(?:1|i)\b/i },
  { key: "phase2", label: "Phase 2", re: /\bphase[\s-]*(?:2|ii)\b/i },
  { key: "phase3", label: "Phase 3", re: /\bphase[\s-]*(?:3|iii)\b/i },
  { key: "stage1", label: "Stage 1", re: /\bstage[\s-]*(?:1|i)\b/i },
  { key: "stage2", label: "Stage 2", re: /\bstage[\s-]*(?:2|ii)\b/i },
  { key: "stage3", label: "Stage 3", re: /\bstage[\s-]*(?:3|iii)\b/i },
  { key: "cbt1", label: "CBT 1", re: /\bcbt[\s-]*(?:1|i)\b/i },
  { key: "cbt2", label: "CBT 2", re: /\bcbt[\s-]*(?:2|ii)\b/i },
];

/** Stage keys a piece of text declares ("SBI PO (Prelims)" → {prelims}). */
export function declaredStages(text: string | null | undefined): Set<string> {
  const out = new Set<string>();
  if (!text) return out;
  for (const s of STAGE_WORDS) if (s.re.test(text)) out.add(s.key);
  return out;
}

function stageLabel(key: string): string {
  return STAGE_WORDS.find((s) => s.key === key)?.label ?? key;
}

/** "12 Sept" from a midnight-UTC-of-IST-day date; null when unparseable. */
function shortDay(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  if (!Number.isFinite(date.getTime())) return null;
  // Repo convention: the stored instant is midnight-UTC of the IST
  // calendar day, so format in UTC and the day never shifts.
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

/**
 * Rule 4. The exam's name declares the stage its stored pattern belongs
 * to; the sitting's row label declares the stage being held. When both
 * speak and disagree, the stored scheme is the wrong one for this sitting.
 * Returns the reason, or null when there is no mismatch (either side
 * silent counts as no mismatch — we cannot know, and rules 1–3 still run).
 */
export function stageMismatchReason(
  exam: { code?: string | null; name?: string | null; shortName?: string | null; totalQuestions?: number; totalMarks?: number },
  rowLabel: string | null | undefined,
  rowDate?: Date | string | null,
): string | null {
  if (!rowLabel) return null;
  const named = declaredStages(exam.name);
  // The short name rarely carries a stage, but when it does it is the
  // same claim ("SSC CGL Tier 1").
  for (const k of declaredStages(exam.shortName)) named.add(k);
  if (named.size === 0) return null;
  const row = declaredStages(rowLabel);
  if (row.size === 0) return null;
  for (const k of row) if (named.has(k)) return null; // same stage — fine
  const stored = [...named].map(stageLabel).join(" / ");
  const rowKeys = [...row];
  const sitting = rowKeys.map(stageLabel).join(" / ");
  const when = shortDay(rowDate);
  // Quote the stored pattern's own numbers so the student sees which paper
  // the (withheld) scheme belongs to.
  const figures =
    exam.totalQuestions && exam.totalMarks ? ` (${exam.totalQuestions} questions, ${num(exam.totalMarks)} marks)` : "";
  const note = rowKeys.map((k) => SITTING_NOTES[(exam.code ?? "").toUpperCase()]?.[k]).find(Boolean);
  const sittingClause = note ? `is ${sitting} — ${note}` : `is ${sitting}, which is scored differently`;
  return `The stored pattern is the ${stored} paper${figures}; the ${when ? `${when} sitting` : "sitting in question"} ${sittingClause}, so one per-question mark cannot be stated.`;
}

/** 2 → "2", 0.25 → "0.25", 1.33 → "1.33". */
function num(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, "");
}

/**
 * The full verdict: ok, or not ok with the reason a surface can print.
 * `opts.rowLabel` is the label of the exam-day row for the sitting the
 * caller is talking about (rule 4); omit it when none is known.
 */
export function markingSchemeVerdict(exam: MarkingSchemeInput, opts: MarkingSchemeOptions = {}): MarkingSchemeVerdict {
  const { totalQuestions: q, totalMarks: total, marksPerQ: m } = exam;
  const short = exam.shortName || exam.name || "this exam";
  const no = (reason: string): MarkingSchemeVerdict => ({ ok: false, reason });

  // 4 — the sitting is a different stage from the stored pattern. Checked
  // first: it is the most specific thing we can say, and it is the one
  // that bites on exam night (SBI PO Mains on a Prelims row).
  const stage = stageMismatchReason(exam, opts.rowLabel, opts.rowDate);
  if (stage) return no(stage);

  // 5 — exams we know score unequally although the row is self-consistent.
  const code = (exam.code ?? "").toUpperCase();
  if (code && UNEQUAL_PAPER_EXAMS[code]) return no(UNEQUAL_PAPER_EXAMS[code]);

  if (!(m > 0) || !(q > 0) || !(total > 0)) {
    return no(`The ${short} marking scheme is not on our records — take it from the official notice.`);
  }
  // 1 — a value a notice could print: halves, thirds, quarters (0.02 slack
  // for 4/3 stored as "1.33"). Anything else is an average of its papers.
  if (![1, 2, 3, 4].some((d) => Math.abs(m * d - Math.round(m * d)) < 0.02)) {
    return no(
      `On our records ${short} carries ${num(m)} marks per question, which is an average across papers that score differently — one per-question mark cannot be stated.`,
    );
  }
  // 2 — full marks under the printed scheme must be the printed total, over
  // the questions that SCORE.
  const scored = scoredCount(exam);
  if (Math.abs(m * scored - total) > Math.max(1, total * 0.005)) {
    return no(
      `On our records +${num(m)} per question over ${scored} scored questions does not add up to the paper's ${num(total)} marks — different papers or sections of ${short} score differently.`,
    );
  }
  // 3 — part totals the exam's own description lists.
  const partTotals = new Set(
    [...(exam.description ?? "").matchAll(/(\d[\d,]*)\s*marks/gi)]
      .map((x) => Number(x[1].replace(/,/g, "")))
      .filter((n) => n > 0 && n < total),
  );
  if (partTotals.size >= 2) {
    const parts = [...partTotals].sort((a, b) => a - b).map((n) => `${n} marks`).join(", ");
    return no(`The ${short} pattern lists parts with different totals (${parts}) — the papers do not score alike, so one per-question mark cannot be stated.`);
  }
  return { ok: true, reason: null };
}

/** Boolean form for existing callers. Pass `opts.rowLabel` (the exam-day
 *  row in focus) wherever one is known — without it rule 4 cannot run. */
export function markingSchemeStatable(exam: MarkingSchemeInput, opts: MarkingSchemeOptions = {}): boolean {
  return markingSchemeVerdict(exam, opts).ok;
}

// The PYQ year page's FAQ (26 Sep 2026, discoverability wave 2 G3).
//
// /exams/[code]/pyq/[year] emitted a FAQPage of four questions that no
// reader could see — structured data describing content that is not on the
// page. The questions now come from this one builder, and the page renders
// them as a visible list AND as its only FAQPage, from the same items. The
// wording is the 11/15/25 Sep honest wording unchanged: PYQ-pattern, never
// "the paper"; the N-of-M depth; the official paper named only when linked.
// English only: the structured data was always English (inLanguage en-IN,
// canonical → the English URL), and the /hi and /te bodies render neither.
// Pure (tests/unit/faq-visible.test.ts).
//
// 27 Sep 2026 (repair, adversarial review): the visible FAQ and the question
// block printed the real paper's length for THAT year ("the 2025 paper had
// 200") from Exam.totalQuestions — one undated number, wrong wherever the
// pattern changed (NEET UG 2025 had 180 questions, JEE Main 2021-24 had 90,
// SSC GD 2021-22 had 100). No source holds a paper's length per year, so
// these two surfaces now state only the set's own count.

import type { FaqItem } from "@/lib/hub-faq";

export interface PyqFaqInput {
  short: string;
  year: number;
  pageUrl: string;
  /** pyqModelledEn(…) — "23 PYQ-pattern questions modelled on the 2024
   *  paper", no paper length. */
  modelledEn: string;
  partial: boolean;
  /** Questions this year holds (validated). */
  held: number;
  /** officialYearFaqNote(…) — "" when no official paper is linked. */
  officialPaperNote: string;
  /** fullMockFaqNote(…) — "" when no full-length pattern mock exists. */
  fullMockNote: string;
}

/** "23 PYQ-pattern questions modelled on the 2024 paper" — the set's own
 *  count and year, never the paper's length (no per-year source). */
export function pyqModelledEn(held: number, year: number): string {
  return `${held} PYQ-pattern ${held === 1 ? "question" : "questions"} modelled on the ${year} paper`;
}

export function pyqFaqItems(i: PyqFaqInput): FaqItem[] {
  return [
    {
      q: `Where can I solve the ${i.short} ${i.year} previous year paper (PYQ) free online?`,
      a:
        `At ${i.pageUrl} you can solve ${i.short} ${i.modelledEn} free. Shishya does not reproduce the original paper: every question is freshly worded in that year's pattern — same topics, style and difficulty, new wording and numbers` +
        (i.partial ? `, and this set holds ${i.held} ${i.held === 1 ? "question" : "questions"}, not the whole paper` : ", at the real paper's full length") +
        `. They run as a timed mock with instant scoring, step-by-step solutions and topic-wise weak-area analysis. No fee and no coaching enrolment needed.` +
        i.officialPaperNote,
    },
    {
      q: `Are these the actual ${i.short} ${i.year} paper questions?`,
      a: `No. They are PYQ-pattern questions modelled on the ${i.short} ${i.year} paper — freshly worded practice questions in the same pattern, not the original questions, which Shishya does not reproduce. This set holds ${i.held} ${i.held === 1 ? "question" : "questions"}.${i.officialPaperNote}${i.fullMockNote}`,
    },
    {
      q: `Do these ${i.short} ${i.year} pattern questions come with solutions and analysis?`,
      a: `Yes — every question carries a worked solution, and on submitting you get an instant score with a topic-wise breakdown showing exactly which areas to revise. Wrong answers are auto-collected into a free Mistake Notebook for one-tap re-practice until cleared.`,
    },
    {
      q: `Are previous year papers enough to crack ${i.short}?`,
      a: `Previous-year papers are the best signal of what the exam actually tests, but they work best with targeted practice and a plan. On Shishya (all free): solve PYQ-pattern sets year-wise, drill weak topics via the Mistake Notebook, follow a day-by-day plan from the Personal Coach at https://shishya.in/coach, and sit the Sunday All-India Live Test at https://shishya.in/live-test to see where you stand nationally.`,
    },
  ];
}

// ── Question text on the page (26 Sep 2026, stretch) ─────────────────────

/** How many of the set's questions the page prints as text. */
export const PYQ_TEXT_QUESTIONS = 10;

export interface PyqTextQuestion {
  id: string;
  body: string;
  options: { key: string; text: string }[];
  answerKey: string;
  solution: string;
}

/** Options as stored ([{ key, text }]), tolerating a malformed row. */
export function pyqOptions(raw: unknown): { key: string; text: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o) => ({ key: String((o as { key?: unknown })?.key ?? "").trim(), text: String((o as { text?: unknown })?.text ?? "").trim() }))
    .filter((o) => o.key && o.text);
}

/** "Showing 10 of the 23 PYQ-pattern questions in this set — …" (no paper
 *  length: see the header). */
export function pyqTextShownLine(shown: number, held: number): string {
  return `Showing ${shown} of the ${held} PYQ-pattern ${held === 1 ? "question" : "questions"} in this set — freshly worded in that year's pattern, not the original questions. Answers and solutions open under each question.`;
}

// Surge admission aptitude test — shared config + types.
//
// Questions are NOT a fixed list any more: they're generated per-candidate
// in src/lib/aptitude/generate.ts (different numbers/words every time), so
// no two students get the same paper. The generated answer key is sealed
// into an encrypted token (src/lib/aptitude/seal.ts) and scored server-side.

export type AptitudeSection = "QUANT" | "REASONING" | "VERBAL";

/** What the browser sees — never carries the answer. */
export interface PublicAptitudeQuestion {
  id: string;
  section: AptitudeSection;
  question: string;
  options: string[];
}

/** One entry of the sealed answer key. */
export interface KeyItem {
  id: string;
  section: AptitudeSection;
  answer: number; // 0-based index of the correct option
}

export const APTITUDE_CONFIG = {
  durationMinutes: 30,
  totalQuestions: 30,
  // Per-section counts in a served test (must sum to totalQuestions).
  perSection: { QUANT: 12, REASONING: 10, VERBAL: 8 } as Record<AptitudeSection, number>,
  // Pass mark — a candidate clearing this is shortlisted for the Surge
  // admission process. 60% is a typical IT-services aptitude cutoff.
  passPercent: 60,
} as const;

export const SECTION_LABEL: Record<AptitudeSection, string> = {
  QUANT: "Quantitative Aptitude",
  REASONING: "Logical Reasoning",
  VERBAL: "Verbal Ability",
};

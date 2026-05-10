// Shared types for PYQ (Previous Year Question) seeds.
// One file per exam-year (e.g. ssc-cgl-2024.ts). Each file exports a
// PYQPaper object describing the questions of one shift of one paper.
//
// Why per-paper-shift rather than per-year-flat? Because real PYQ data
// arrives that way — one shift PDF at a time — and we want re-runs to
// upsert without surprise.

import type { Difficulty, QuestionType } from "@prisma/client";

export interface PYQQuestion {
  /** Stable per-question slug, unique within the paper. Used for upsert. */
  slug: string;
  topicCode: string;
  difficulty: Difficulty;
  type?: QuestionType;
  body: string;
  options: { key: string; text: string }[];
  answerKey: string;
  solution: string;
  tags?: string[];
}

export interface PYQPaper {
  /** Exam code in our DB, e.g. "SSC_CGL". Must already be seeded. */
  examCode: string;
  /** PYQ year, e.g. 2024. */
  year: number;
  /** Exam variant when more than one is conducted in a year. */
  shift?: string; // e.g. "Tier 1 — Shift 1"
  /** Date the paper was conducted (best-effort). */
  conductedOn?: string; // ISO date
  /** Source PDF or page where these were transcribed from (commission/board only). */
  sourceUrl?: string;
  questions: PYQQuestion[];
}

// Types for the verified content factory.
//
// Pipeline:  generate → solve (blind, self-consistent) → verify (adjudicate)
//            → calibrate → gate
//
// Every question that comes out carries a `QuestionProvenance` record so we
// can audit *exactly* how it was produced and why it was accepted/rejected.
// That provenance is what lets a student (and an SME) trust the bank.

import type { Difficulty } from "../types";

/** A freshly generated candidate, before any verification. */
export interface CandidateQuestion {
  body: string;
  options: { key: string; text: string }[];
  /** The generator's *claimed* correct answer. Never shown to the solver. */
  answerKey: string;
  solution: string;
  difficulty: Difficulty;
  tags: string[];
}

/** One independent blind-solve of a candidate (no access to answerKey/solution). */
export interface SolveRun {
  chosen: string; // "A".."D"
  reasoning: string;
  confidence: number; // 0..1, the solver's own confidence
}

/** Aggregated result of N blind solves (self-consistency). */
export interface SolveResult {
  runs: SolveRun[];
  /** Most common answer across runs. */
  majority: string;
  /** Fraction of runs that agreed on the majority answer. 1.0 = unanimous. */
  agreement: number;
  /** Distribution, e.g. { A: 0, B: 3, C: 0, D: 0 }. */
  distribution: Record<string, number>;
}

export type Verdict =
  | "CORRECT" // single unambiguous answer, matches the generator's key
  | "MISMATCH" // a single answer is correct, but it's NOT the generator's key
  | "AMBIGUOUS" // more than one option defensible, or wording unclear
  | "FLAWED"; // no correct option, broken stem, insufficient data, etc.

/** The adjudicator's (strong model) verdict on a candidate. */
export interface VerifyVerdict {
  verdict: Verdict;
  /** The answer the verifier believes is correct (if any). */
  correctKey: string | null;
  /** 0..1 — how confident the verifier is in its verdict. */
  confidence: number;
  /** Re-estimated difficulty (the generator's label is just a request). */
  difficulty: Difficulty;
  /** One-line, student-readable reason. Surfaced to SME and stored. */
  rationale: string;
  /** Concrete issues found, if any (used to improve the generator prompt). */
  issues: string[];
}

export type GateDecision = "ACCEPT" | "REVIEW" | "REJECT";

/** Why the gate landed where it did — auditable. */
export interface GateResult {
  decision: GateDecision;
  /** 0..1 composite quality score (solver agreement × verifier confidence × penalties). */
  score: number;
  reasons: string[];
}

/** Provenance written to Question.metadata. The audit trail for one question. */
export interface QuestionProvenance {
  pipeline: "factory-v1";
  generatedBy: string; // model id
  solvedBy: string; // model id
  verifiedBy: string; // model id
  solve: { majority: string; agreement: number; distribution: Record<string, number> };
  verify: VerifyVerdict;
  gate: GateResult;
  groundedSources: string[]; // source ids/labels the generation was grounded in
  producedAt: string; // ISO
}

/** The full result for one candidate as it exits the pipeline. */
export interface FactoryQuestion {
  candidate: CandidateQuestion;
  /** The answer key we will store — the verifier's correctKey when it overrides. */
  finalAnswerKey: string;
  finalDifficulty: Difficulty;
  provenance: QuestionProvenance;
}

export interface FactoryRunStats {
  generated: number;
  accepted: number;
  needsReview: number;
  rejected: number;
  costUsd: number;
  byVerdict: Record<Verdict, number>;
}

export interface FactoryConfig {
  /** Blind solves per candidate for self-consistency. Default 3. */
  solveRuns: number;
  /** Min solver agreement to be eligible for ACCEPT. Default 0.66. */
  minAgreement: number;
  /** Min verifier confidence to ACCEPT. Default 0.8. */
  minVerifyConfidence: number;
  /**
   * When true, ACCEPT-tier questions are written with validated:true
   * (auto-validated). When false (default), even ACCEPT goes to the SME
   * queue as validated:false — the machine narrows the queue, a human still
   * signs off. Flip per-exam by stakes.
   */
  autoValidateOnAccept: boolean;
}

export const DEFAULT_CONFIG: FactoryConfig = {
  solveRuns: 3,
  minAgreement: 0.66,
  minVerifyConfidence: 0.8,
  autoValidateOnAccept: false,
};

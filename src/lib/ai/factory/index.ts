// Public surface of the verified content factory.
//
// The factory turns raw candidate questions (from AI generation, PYQ ingestion,
// or SME drafts) into trustworthy items by running each through an independent
// blind solver and a strong-model adjudicator before a gate decides
// ACCEPT / REVIEW / REJECT — recording full provenance on every one.
//
// See ./README.md for the architecture and how the rest of the domain AI
// system builds on this.

export { runFactory, verifyCandidates, type VerifyResult } from "./pipeline";
export { generateCandidates, type GenerateArgs } from "./generator";
export { solveBlind } from "./solver";
export { verify } from "./verifier";
export { gate } from "./gate";
export {
  DEFAULT_CONFIG,
  type CandidateQuestion,
  type SolveResult,
  type VerifyVerdict,
  type Verdict,
  type GateResult,
  type GateDecision,
  type QuestionProvenance,
  type FactoryQuestion,
  type FactoryRunStats,
  type FactoryConfig,
} from "./types";

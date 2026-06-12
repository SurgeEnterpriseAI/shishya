// Gate — the accept/review/reject decision. Pure and deterministic so it is
// unit-testable and its behaviour is auditable. No model calls here.
//
// Philosophy: the machine NARROWS the human's queue, it doesn't replace the
// human (unless autoValidateOnAccept is on for a low-stakes exam). So:
//   ACCEPT  → high confidence the item is sound and keyed correctly
//   REVIEW  → plausibly fine but something is soft → send to SME
//   REJECT  → demonstrably broken or mis-keyed → don't waste SME time

import type { SolveResult, VerifyVerdict, GateResult, FactoryConfig } from "./types";

export function gate(
  solve: SolveResult,
  verify: VerifyVerdict,
  cfg: FactoryConfig,
): GateResult {
  const reasons: string[] = [];

  // FLAWED is always a reject — no correct option / broken stem.
  if (verify.verdict === "FLAWED") {
    return { decision: "REJECT", score: 0, reasons: ["verifier: FLAWED — " + verify.rationale] };
  }

  // AMBIGUOUS goes to a human; the machine should not auto-publish judgement calls.
  if (verify.verdict === "AMBIGUOUS") {
    reasons.push("verifier: AMBIGUOUS — needs human judgement");
    return { decision: "REVIEW", score: 0.4 * verify.confidence, reasons };
  }

  // Composite score: solver agreement × verifier confidence.
  const base = solve.agreement * verify.confidence;

  if (verify.verdict === "MISMATCH") {
    // The verifier says the author's key is wrong. We can still salvage the
    // item by storing the verifier's correctKey — but a human should confirm
    // the override before it goes live, and only if solver agrees with it.
    if (verify.correctKey && solve.majority === verify.correctKey && solve.agreement >= cfg.minAgreement) {
      reasons.push(`key corrected ${"?"} → ${verify.correctKey} (solver + verifier agree)`);
      return { decision: "REVIEW", score: base * 0.9, reasons };
    }
    reasons.push("verifier: MISMATCH — author key disputed, solver inconclusive");
    return { decision: "REJECT", score: base * 0.5, reasons };
  }

  // verdict === CORRECT
  const agreementOk = solve.agreement >= cfg.minAgreement;
  const confidenceOk = verify.confidence >= cfg.minVerifyConfidence;
  // Solver should have independently landed on the same key.
  const solverMatchesKey = verify.correctKey ? solve.majority === verify.correctKey : true;

  if (agreementOk && confidenceOk && solverMatchesKey) {
    reasons.push(
      `accept: solver agreement ${(solve.agreement * 100).toFixed(0)}% ≥ ${(cfg.minAgreement * 100).toFixed(0)}%, ` +
        `verifier confidence ${(verify.confidence * 100).toFixed(0)}% ≥ ${(cfg.minVerifyConfidence * 100).toFixed(0)}%`,
    );
    return { decision: "ACCEPT", score: base, reasons };
  }

  if (!agreementOk) reasons.push(`solver agreement ${(solve.agreement * 100).toFixed(0)}% below threshold`);
  if (!confidenceOk) reasons.push(`verifier confidence ${(verify.confidence * 100).toFixed(0)}% below threshold`);
  if (!solverMatchesKey) reasons.push("independent solver did not match the verified key");
  return { decision: "REVIEW", score: base, reasons };
}

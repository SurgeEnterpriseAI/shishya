// Tests for the content-factory gate — the pure accept/review/reject logic.
// The gate is the trust boundary: these cases pin its behaviour so a change
// to thresholds or verdict handling can't silently let bad questions through.

import { describe, it, expect } from "vitest";
import { gate } from "@/lib/ai/factory/gate";
import { DEFAULT_CONFIG, type SolveResult, type VerifyVerdict } from "@/lib/ai/factory/types";

function solve(majority: string, agreement: number): SolveResult {
  const n = 3;
  const agree = Math.round(agreement * n);
  const distribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  distribution[majority] = agree;
  // scatter the rest onto a different option
  const other = majority === "A" ? "B" : "A";
  distribution[other] = n - agree;
  return {
    runs: [],
    majority,
    agreement,
    distribution,
  };
}

function verdict(v: Partial<VerifyVerdict>): VerifyVerdict {
  return {
    verdict: "CORRECT",
    correctKey: "B",
    confidence: 0.95,
    difficulty: "MEDIUM",
    rationale: "ok",
    issues: [],
    ...v,
  };
}

describe("factory gate", () => {
  it("accepts a sound, high-agreement, high-confidence, key-matching question", () => {
    const r = gate(solve("B", 1.0), verdict({ verdict: "CORRECT", correctKey: "B", confidence: 0.95 }), DEFAULT_CONFIG);
    expect(r.decision).toBe("ACCEPT");
    expect(r.score).toBeGreaterThan(0.8);
  });

  it("always rejects FLAWED regardless of confidence", () => {
    const r = gate(solve("B", 1.0), verdict({ verdict: "FLAWED", correctKey: null, confidence: 0.99 }), DEFAULT_CONFIG);
    expect(r.decision).toBe("REJECT");
  });

  it("sends AMBIGUOUS to human review, never auto-accept", () => {
    const r = gate(solve("B", 1.0), verdict({ verdict: "AMBIGUOUS", confidence: 0.9 }), DEFAULT_CONFIG);
    expect(r.decision).toBe("REVIEW");
  });

  it("downgrades CORRECT to REVIEW when solver agreement is low", () => {
    const r = gate(solve("B", 0.33), verdict({ verdict: "CORRECT", correctKey: "B", confidence: 0.95 }), DEFAULT_CONFIG);
    expect(r.decision).toBe("REVIEW");
    expect(r.reasons.join(" ")).toMatch(/agreement/i);
  });

  it("downgrades CORRECT to REVIEW when verifier confidence is below threshold", () => {
    const r = gate(solve("B", 1.0), verdict({ verdict: "CORRECT", correctKey: "B", confidence: 0.5 }), DEFAULT_CONFIG);
    expect(r.decision).toBe("REVIEW");
    expect(r.reasons.join(" ")).toMatch(/confidence/i);
  });

  it("salvages a MISMATCH to REVIEW when solver and verifier agree on the real key", () => {
    // author claimed something else; verifier + solver both say C
    const r = gate(solve("C", 1.0), verdict({ verdict: "MISMATCH", correctKey: "C", confidence: 0.9 }), DEFAULT_CONFIG);
    expect(r.decision).toBe("REVIEW");
  });

  it("rejects a MISMATCH when the solver is inconclusive", () => {
    const r = gate(solve("A", 0.34), verdict({ verdict: "MISMATCH", correctKey: "C", confidence: 0.6 }), DEFAULT_CONFIG);
    expect(r.decision).toBe("REJECT");
  });
});

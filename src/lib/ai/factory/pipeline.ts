// Pipeline orchestrator — wires generate → solve → verify → gate and emits
// FactoryQuestions with full provenance + run stats.
//
// Two entry points:
//   - verifyCandidates(): take candidates from ANY source and run the firewall.
//   - runFactory(): generate grounded candidates, then run the firewall.
//
// The orchestrator is storage-agnostic: it returns results; the caller (a
// script, a cron, or an admin action) decides how to persist them. That keeps
// the firewall reusable for PYQ ingestion, SME drafts, and AI generation alike.

import { estimateCostUsd, type CallStats } from "../client";
import { solveBlind } from "./solver";
import { verify } from "./verifier";
import { gate } from "./gate";
import { generateCandidates, type GenerateArgs } from "./generator";
import {
  DEFAULT_CONFIG,
  type CandidateQuestion,
  type FactoryConfig,
  type FactoryQuestion,
  type FactoryRunStats,
  type Verdict,
} from "./types";

function emptyStats(): FactoryRunStats {
  return {
    generated: 0,
    accepted: 0,
    needsReview: 0,
    rejected: 0,
    costUsd: 0,
    byVerdict: { CORRECT: 0, MISMATCH: 0, AMBIGUOUS: 0, FLAWED: 0 },
  };
}

export interface VerifyResult {
  /** Items that passed the firewall (ACCEPT or REVIEW). Rejected items dropped. */
  questions: FactoryQuestion[];
  /** Every candidate's decision, including rejects — for logging/eval. */
  decisions: Array<{ candidate: CandidateQuestion; question: FactoryQuestion | null; decision: string }>;
  stats: FactoryRunStats;
}

/** Run the verification firewall over a set of candidates. */
export async function verifyCandidates(
  candidates: CandidateQuestion[],
  groundedSources: string[],
  config: Partial<FactoryConfig> = {},
): Promise<VerifyResult> {
  const cfg: FactoryConfig = { ...DEFAULT_CONFIG, ...config };
  const stats = emptyStats();
  stats.generated = candidates.length;
  const onCost = (s: CallStats) => {
    stats.costUsd += estimateCostUsd(s);
  };

  const questions: FactoryQuestion[] = [];
  const decisions: VerifyResult["decisions"] = [];

  for (const candidate of candidates) {
    // 1) blind solve (self-consistency)
    const solve = await solveBlind(candidate, { runs: cfg.solveRuns, onCost });
    // 2) adjudicate
    const v = await verify(candidate, solve, { onCost });
    stats.byVerdict[v.verdict as Verdict] += 1;
    // 3) gate
    const g = gate(solve, v, cfg);

    if (g.decision === "REJECT") {
      stats.rejected += 1;
      decisions.push({ candidate, question: null, decision: "REJECT" });
      continue;
    }

    // For an accepted/review item, store the verifier's correctKey when it
    // overrode a MISMATCH; otherwise keep the author's key.
    const finalAnswerKey =
      v.verdict === "MISMATCH" && v.correctKey ? v.correctKey : candidate.answerKey;

    const fq: FactoryQuestion = {
      candidate,
      finalAnswerKey,
      finalDifficulty: v.difficulty,
      provenance: {
        pipeline: "factory-v1",
        generatedBy: "router:generate",
        solvedBy: "router:solve",
        verifiedBy: "router:verify",
        solve: { majority: solve.majority, agreement: solve.agreement, distribution: solve.distribution },
        verify: v,
        gate: g,
        groundedSources,
        producedAt: new Date().toISOString(),
      },
    };

    if (g.decision === "ACCEPT") stats.accepted += 1;
    else stats.needsReview += 1;
    questions.push(fq);
    decisions.push({ candidate, question: fq, decision: g.decision });
  }

  return { questions, decisions, stats };
}

/** Generate grounded candidates for a topic and run them through the firewall. */
export async function runFactory(
  genArgs: GenerateArgs,
  config: Partial<FactoryConfig> = {},
): Promise<VerifyResult> {
  const stats0 = emptyStats();
  const onCost = (s: CallStats) => {
    stats0.costUsd += estimateCostUsd(s);
  };
  const { candidates, groundedSources } = await generateCandidates(genArgs, { onCost });
  const result = await verifyCandidates(candidates, groundedSources, config);
  // fold generation cost into the run total
  result.stats.costUsd += stats0.costUsd;
  return result;
}

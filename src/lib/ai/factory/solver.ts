// Blind solver — solves a candidate question from scratch, with NO access to
// the generator's claimed answer key or solution. Run N times for
// self-consistency: if independent solves disagree, the question is shaky.
//
// This is the first half of the verification firewall. A generator that
// confidently writes a wrong answer key gets caught here, because the solver
// reasons the problem independently and lands somewhere else.
//
// Shape (22 Sep 2026): buildSolveRequest() and parseSolveRun() are pure, so
// the same request can go through messages.create (solveBlind, below) or
// through the Message Batches API at half price (scripts/verify-question-bank.ts
// via src/lib/ai/batch.ts). solveBlind is the live path and sends exactly
// what the builder returns.

import type Anthropic from "@anthropic-ai/sdk";
import { callClaude, extractText, parseJson, type CallStats, type MessageParams } from "../client";
import { modelFor } from "../router";
import type { CandidateQuestion, SolveRun, SolveResult } from "./types";

/**
 * Ledger label for blind solves when the caller passes none. Until 22 Sep
 * 2026 such a caller (pipeline.verifyCandidates, used by generate-questions
 * --verify and run-evals) fell through to callClaude's "other": 4,745 opus
 * rows on 15 Sep 2026 that /admin/ai-spend could not attribute. The label
 * is workload-neutral on purpose: the bank script passes its own
 * "bank-solve", so generator verification and the bank run stay separable
 * in the ledger.
 */
export const SOLVE_FEATURE = "factory-solve";

const SOLVER_SYSTEM = `You are an expert solver for Indian competitive-exam multiple-choice questions.
You are given ONLY a question and its options — never the intended answer.
Solve it independently and rigorously:
- Work the problem step by step. For math, show the arithmetic.
- Pick exactly one option (A, B, C, or D) that is correct.
- If the question is broken (no correct option, multiple correct, missing data, ambiguous wording), still pick the closest option but set low confidence and say why.
Return STRICT JSON only, no markdown:
{ "chosen": "A|B|C|D", "reasoning": "concise working, 2-5 sentences", "confidence": 0.0-1.0 }`;

// Each run gets a different solving directive so the reasoning paths are
// genuinely independent rather than the same chain repeated. (Prompt-level
// variation, not temperature — newer models deprecate the temperature
// param, and varied instructions diversify better anyway.)
const RUN_DIRECTIVES = [
  "Solve it directly and carefully.",
  "Solve it using a different method than the most obvious one (e.g. work backwards from the options, or use estimation first, then verify exactly).",
  "Solve it by first eliminating options that are clearly impossible, then verify the remaining candidate(s) precisely.",
  "Solve it twice with two different approaches and only answer once both agree; if they disagree, reconcile before answering.",
];

function renderProblem(q: CandidateQuestion): string {
  const opts = q.options.map((o) => `${o.key}. ${o.text}`).join("\n");
  return `Question:\n${q.body}\n\nOptions:\n${opts}\n\nSolve it. Return JSON only.`;
}

/**
 * The messages.create body of one blind solve, identical for the live path
 * and a batch request. Everything callClaude would send: model, max_tokens,
 * system, messages. No temperature (see RUN_DIRECTIVES).
 */
export function buildSolveRequest(
  q: CandidateQuestion,
  runIndex: number,
  opts: { model?: string } = {},
): MessageParams {
  const directive = RUN_DIRECTIVES[runIndex % RUN_DIRECTIVES.length];
  return {
    model: opts.model ?? modelFor("solve"),
    // 2000 (15 Sep 2026): 1200 cut long reasoning off mid-JSON.
    max_tokens: 2000,
    system: [{ type: "text", text: SOLVER_SYSTEM }],
    messages: [{ role: "user", content: `${renderProblem(q)}\n\nApproach for this attempt: ${directive}` }],
  };
}

/**
 * One solve reply → SolveRun, or null when the reply is unusable (not JSON,
 * JSON cut off at max_tokens, or an option outside A-D). A null run is
 * simply dropped by the caller — fewer valid runs lowers agreement.
 */
export function parseSolveRun(message: Anthropic.Messages.Message): SolveRun | null {
  try {
    const parsed = parseJson<Partial<SolveRun>>(extractText(message));
    const chosen = String(parsed.chosen ?? "").trim().toUpperCase().slice(0, 1);
    if (!["A", "B", "C", "D"].includes(chosen)) return null;
    return {
      chosen,
      reasoning: String(parsed.reasoning ?? "").trim(),
      confidence: clamp01(Number(parsed.confidence ?? 0.5)),
    };
  } catch {
    return null;
  }
}

/** Solve one candidate N times independently and aggregate. */
export async function solveBlind(
  q: CandidateQuestion,
  opts: { runs: number; onCost?: (stats: CallStats) => void; feature?: string; ref?: string | null },
): Promise<SolveResult> {
  const runs: SolveRun[] = [];
  for (let i = 0; i < opts.runs; i++) {
    const params = buildSolveRequest(q, i);
    const { response, stats } = await callClaude({
      model: params.model,
      maxTokens: params.max_tokens,
      system: params.system,
      messages: params.messages,
      feature: opts.feature ?? SOLVE_FEATURE,
      ref: opts.ref,
    });
    opts.onCost?.(stats);

    const run = parseSolveRun(response);
    // A malformed solve is simply dropped — fewer valid runs lowers agreement.
    if (run) runs.push(run);
  }

  return aggregate(runs);
}

/**
 * Majority + agreement over the valid runs. Ties resolve to the earliest
 * option in A-D order. Exported (22 Sep 2026) because the batch path
 * aggregates after collecting results out of order.
 */
export function aggregate(runs: SolveRun[]): SolveResult {
  const distribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const r of runs) distribution[r.chosen] = (distribution[r.chosen] ?? 0) + 1;

  let majority = "A";
  let max = -1;
  for (const k of ["A", "B", "C", "D"]) {
    if (distribution[k] > max) {
      max = distribution[k];
      majority = k;
    }
  }
  const agreement = runs.length ? max / runs.length : 0;
  return { runs, majority, agreement, distribution };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

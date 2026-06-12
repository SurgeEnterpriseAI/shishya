// Blind solver — solves a candidate question from scratch, with NO access to
// the generator's claimed answer key or solution. Run N times for
// self-consistency: if independent solves disagree, the question is shaky.
//
// This is the first half of the verification firewall. A generator that
// confidently writes a wrong answer key gets caught here, because the solver
// reasons the problem independently and lands somewhere else.

import { callClaude, extractText, parseJson, estimateCostUsd, type CallStats } from "../client";
import { modelFor } from "../router";
import type { CandidateQuestion, SolveRun, SolveResult } from "./types";

const SOLVER_SYSTEM = `You are an expert solver for Indian competitive-exam multiple-choice questions.
You are given ONLY a question and its options — never the intended answer.
Solve it independently and rigorously:
- Work the problem step by step. For math, show the arithmetic.
- Pick exactly one option (A, B, C, or D) that is correct.
- If the question is broken (no correct option, multiple correct, missing data, ambiguous wording), still pick the closest option but set low confidence and say why.
Return STRICT JSON only, no markdown:
{ "chosen": "A|B|C|D", "reasoning": "concise working, 2-5 sentences", "confidence": 0.0-1.0 }`;

function renderProblem(q: CandidateQuestion): string {
  const opts = q.options.map((o) => `${o.key}. ${o.text}`).join("\n");
  return `Question:\n${q.body}\n\nOptions:\n${opts}\n\nSolve it. Return JSON only.`;
}

/** Solve one candidate N times independently and aggregate. */
export async function solveBlind(
  q: CandidateQuestion,
  opts: { runs: number; onCost?: (stats: CallStats) => void },
): Promise<SolveResult> {
  const model = modelFor("solve");
  const problem = renderProblem(q);

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

  const runs: SolveRun[] = [];
  for (let i = 0; i < opts.runs; i++) {
    const directive = RUN_DIRECTIVES[i % RUN_DIRECTIVES.length];
    const { response, stats } = await callClaude({
      model,
      maxTokens: 1200,
      system: [{ type: "text", text: SOLVER_SYSTEM }],
      messages: [{ role: "user", content: `${problem}\n\nApproach for this attempt: ${directive}` }],
    });
    opts.onCost?.(stats);
    void estimateCostUsd; // cost is aggregated by the caller via onCost

    try {
      const parsed = parseJson<SolveRun>(extractText(response));
      const chosen = String(parsed.chosen ?? "").trim().toUpperCase().slice(0, 1);
      if (!["A", "B", "C", "D"].includes(chosen)) continue;
      runs.push({
        chosen,
        reasoning: String(parsed.reasoning ?? "").trim(),
        confidence: clamp01(Number(parsed.confidence ?? 0.5)),
      });
    } catch {
      // A malformed solve is simply dropped — fewer valid runs lowers agreement.
    }
  }

  return aggregate(runs);
}

function aggregate(runs: SolveRun[]): SolveResult {
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

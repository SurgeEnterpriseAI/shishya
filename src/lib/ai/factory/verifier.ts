// Verifier — the adjudicator and second half of the firewall.
//
// It sees everything: the candidate, the generator's claimed answer + solution,
// and the independent blind-solve distribution. Its job is NOT to re-solve from
// scratch (the solver did that) but to *adjudicate*: is there exactly one
// correct option? Is it the generator's key? Is the item sound enough to put in
// front of a student? It runs on the strong tier (see router.ts) at temp 0.

import { callClaude, extractText, parseJson, type CallStats } from "../client";
import { modelFor } from "../router";
import type { CandidateQuestion, SolveResult, VerifyVerdict } from "./types";
import type { Difficulty } from "../types";

const VERIFIER_SYSTEM = `You are a senior subject-matter examiner auditing a multiple-choice question before it is shown to students preparing for Indian competitive exams. Be strict: a wrong answer key that reaches a student destroys trust.

You are given the question, the author's claimed answer + solution, and the answers an independent solver produced WITHOUT seeing the key. Adjudicate:

- "CORRECT": exactly one option is correct AND it matches the author's claimed key.
- "MISMATCH": exactly one option is correct, but it is NOT the author's key (state the real one in correctKey).
- "AMBIGUOUS": more than one option is defensible, or the wording is unclear enough that a well-prepared student could justifiably disagree.
- "FLAWED": no option is correct, the stem is broken, data is insufficient/contradictory, or it is a duplicate-style trick.

Also re-estimate difficulty from the actual cognitive load (EASY = one-step direct; MEDIUM = 2-3 steps; HARD = multi-concept/multi-step), independent of the author's label.

Return STRICT JSON only:
{
  "verdict": "CORRECT|MISMATCH|AMBIGUOUS|FLAWED",
  "correctKey": "A|B|C|D" or null,
  "confidence": 0.0-1.0,
  "difficulty": "EASY|MEDIUM|HARD",
  "rationale": "one student-readable sentence",
  "issues": ["specific problems, empty array if none"]
}`;

function renderAudit(q: CandidateQuestion, solve: SolveResult): string {
  const opts = q.options.map((o) => `${o.key}. ${o.text}`).join("\n");
  const dist = Object.entries(solve.distribution)
    .map(([k, n]) => `${k}:${n}`)
    .join(" ");
  const sampleReasoning = solve.runs
    .slice(0, 2)
    .map((r, i) => `  solve ${i + 1} (chose ${r.chosen}): ${r.reasoning}`)
    .join("\n");

  return `# Question
${q.body}

# Options
${opts}

# Author's claimed answer
key: ${q.answerKey}
solution: ${q.solution}

# Independent blind solver (${solve.runs.length} runs, did NOT see the key)
distribution: ${dist}
majority: ${solve.majority} (agreement ${(solve.agreement * 100).toFixed(0)}%)
${sampleReasoning}

Adjudicate. Return JSON only.`;
}

export async function verify(
  q: CandidateQuestion,
  solve: SolveResult,
  opts: { onCost?: (stats: CallStats) => void },
): Promise<VerifyVerdict> {
  const model = modelFor("verify");
  const { response, stats } = await callClaude({
    model,
    maxTokens: 1000,
    system: [{ type: "text", text: VERIFIER_SYSTEM }],
    messages: [{ role: "user", content: renderAudit(q, solve) }],
  });
  opts.onCost?.(stats);

  const parsed = parseJson<Partial<VerifyVerdict>>(extractText(response));
  const verdict = ["CORRECT", "MISMATCH", "AMBIGUOUS", "FLAWED"].includes(String(parsed.verdict))
    ? (parsed.verdict as VerifyVerdict["verdict"])
    : "FLAWED";
  const difficulty = ["EASY", "MEDIUM", "HARD"].includes(String(parsed.difficulty))
    ? (parsed.difficulty as Difficulty)
    : q.difficulty;
  const correctKeyRaw = parsed.correctKey ? String(parsed.correctKey).trim().toUpperCase().slice(0, 1) : null;
  const correctKey = correctKeyRaw && ["A", "B", "C", "D"].includes(correctKeyRaw) ? correctKeyRaw : null;

  return {
    verdict,
    correctKey,
    confidence: clamp01(Number(parsed.confidence ?? 0)),
    difficulty,
    rationale: String(parsed.rationale ?? "").trim() || "No rationale provided.",
    issues: Array.isArray(parsed.issues) ? parsed.issues.map(String) : [],
  };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

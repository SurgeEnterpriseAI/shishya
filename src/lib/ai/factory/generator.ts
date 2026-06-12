// Grounded generator — produces candidate questions for a topic.
//
// "Grounded" means the prompt is anchored to authoritative context we already
// curate: the topic's syllabusText and study notes, plus a few already-validated
// questions as style anchors. The generator is told to stay within that
// material and never invent real exam-year claims. Output is unverified
// candidates — they only become trustworthy after the solver + verifier pass.

import { callClaude, extractText, parseJson, type CallStats } from "../client";
import { modelFor } from "../router";
import type { CandidateQuestion } from "./types";
import type { Difficulty } from "../types";

const GENERATOR_SYSTEM = `You write high-quality multiple-choice questions for Indian competitive-exam preparation. Each question:
- Tests one concept clearly. No trick questions.
- Has exactly 4 options labelled A, B, C, D, with exactly one unambiguously correct answer.
- Has a step-by-step solution a student can follow without prior knowledge.
- Uses plain-text math (e.g. "x² + 1"), no LaTeX.
- Matches the requested difficulty (easy = direct application; medium = 2-3 steps; hard = multi-concept).
- Stays strictly within the provided syllabus/source material. Do NOT invent claims about specific real exam years or real answer keys.
- Never produces harmful, biased, or controversial content.`;

const OUTPUT_SCHEMA = `Return STRICT JSON — a single array, no markdown:
[
  {
    "body": "Full question stem.",
    "options": [{ "key": "A", "text": "..." }, { "key": "B", "text": "..." }, { "key": "C", "text": "..." }, { "key": "D", "text": "..." }],
    "answerKey": "B",
    "solution": "Step-by-step. Show all working. 3-6 short sentences.",
    "difficulty": "EASY|MEDIUM|HARD",
    "tags": ["short-kebab-tag"]
  }
]
Rules: output an ARRAY; exactly the count requested; answerKey ∈ {A,B,C,D} matching an option; options keyed A,B,C,D in order.`;

export interface GenerateArgs {
  examName: string;
  examCode: string;
  /** Pre-rendered syllabus block (cached across calls). */
  syllabusBlock: string;
  topic: { code: string; name: string; description?: string | null; syllabusText?: string | null; notes?: string | null };
  /** Already-validated questions on this topic, as style anchors. */
  fewShot: Array<{ body: string; options: { key: string; text: string }[]; answerKey: string; solution: string; difficulty: string }>;
  /** Recent stems to avoid duplicating. */
  avoid: string[];
  count: number;
  difficulty: Record<Difficulty, number>;
}

/** Generate `count` candidate questions. Returns raw candidates + the source
 *  labels they were grounded in (for provenance). */
export async function generateCandidates(
  args: GenerateArgs,
  opts: { onCost?: (stats: CallStats) => void },
): Promise<{ candidates: CandidateQuestion[]; groundedSources: string[] }> {
  const model = modelFor("generate");
  const groundedSources: string[] = [`syllabus:${args.examCode}`];

  // Authoritative source context — the reliability anchor.
  let sourceBlock = "";
  if (args.topic.syllabusText) {
    sourceBlock += `\n# Authoritative syllabus detail for ${args.topic.name}\n${args.topic.syllabusText}\n`;
    groundedSources.push(`topic.syllabusText:${args.topic.code}`);
  }
  if (args.topic.notes) {
    sourceBlock += `\n# Curated study notes for ${args.topic.name} (ground questions in these)\n${args.topic.notes.slice(0, 6000)}\n`;
    groundedSources.push(`topic.notes:${args.topic.code}`);
  }

  const fewShotBlock = args.fewShot.length
    ? "# Style anchors (already validated — match this style and rigor)\n" +
      args.fewShot
        .map((q, i) => {
          const o = q.options.map((x) => `${x.key}. ${x.text}`).join("  ");
          return `Example ${i + 1} [${q.difficulty}]\nQ: ${q.body}\n${o}\nAnswer: ${q.answerKey}\nSolution: ${q.solution}`;
        })
        .join("\n\n")
    : "";

  const avoidBlock = args.avoid.length
    ? "# Do NOT duplicate the stems of these existing questions\n" +
      args.avoid.map((b, i) => `${i + 1}. ${b.slice(0, 180)}`).join("\n")
    : "";

  const userPrompt = `Generate exactly ${args.count} questions on this topic.

# Topic
- Exam: ${args.examName} (${args.examCode})
- Topic: ${args.topic.name} [\`${args.topic.code}\`]
${args.topic.description ? `- Description: ${args.topic.description}` : ""}
${sourceBlock}
# Difficulty distribution
- EASY: ${args.difficulty.EASY} · MEDIUM: ${args.difficulty.MEDIUM} · HARD: ${args.difficulty.HARD}

${fewShotBlock}

${avoidBlock}

${OUTPUT_SCHEMA}`;

  const { response, stats } = await callClaude({
    model,
    maxTokens: 8000,
    system: [
      { type: "text", text: GENERATOR_SYSTEM, cache_control: { type: "ephemeral" } },
      { type: "text", text: args.syllabusBlock, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });
  opts.onCost?.(stats);

  const parsed = parseJson<unknown>(extractText(response));
  if (!Array.isArray(parsed)) throw new Error("generator must return a JSON array");

  const candidates = parsed
    .map(coerceCandidate)
    .filter((c): c is CandidateQuestion => c !== null);

  return { candidates, groundedSources };
}

/** Shape-validate one raw candidate; return null if structurally invalid. */
function coerceCandidate(raw: unknown): CandidateQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const q = raw as Record<string, unknown>;
  const body = typeof q.body === "string" ? q.body.trim() : "";
  if (body.length < 10) return null;
  if (!Array.isArray(q.options) || q.options.length !== 4) return null;
  const options = (q.options as unknown[]).map((o) => {
    const oo = o as Record<string, unknown>;
    return { key: String(oo.key ?? "").trim(), text: String(oo.text ?? "").trim() };
  });
  if (options.map((o) => o.key).join("") !== "ABCD") return null;
  if (options.some((o) => o.text.length === 0)) return null;
  const answerKey = String(q.answerKey ?? "").trim().toUpperCase().slice(0, 1);
  if (!["A", "B", "C", "D"].includes(answerKey)) return null;
  const solution = typeof q.solution === "string" ? q.solution.trim() : "";
  if (solution.length < 20) return null;
  const difficulty = ["EASY", "MEDIUM", "HARD"].includes(String(q.difficulty))
    ? (q.difficulty as Difficulty)
    : "MEDIUM";
  const tags = Array.isArray(q.tags) ? q.tags.filter((t): t is string => typeof t === "string") : [];
  return { body, options, answerKey, solution, difficulty, tags };
}

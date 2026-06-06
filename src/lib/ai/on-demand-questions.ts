// On-demand question generation — Depth Lever 3.
//
// When a strong user exhausts the pool or wants to grind a specific
// topic, this generates a fresh batch of MCQs LIVE (no web search, so
// it returns in ~5-8s while the user waits) tuned to their level, and
// the caller persists them back into the question pool. Depth becomes
// effectively infinite + personalised — a serious aspirant can never
// run out.
//
// Cost: ~₹1-2 per batch of 10 (single Claude call, ~3k in + 4k out).
// The endpoint that calls this rate-limits per user per day.

import { anthropic, MODEL } from "./client";

export interface FreshQuestion {
  body: string;
  options: { A: string; B: string; C: string; D: string };
  answerKey: "A" | "B" | "C" | "D";
  solution: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
}

const TOOL = {
  name: "publish_questions",
  description: "Submit the generated MCQ batch.",
  input_schema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        minItems: 3,
        maxItems: 20,
        items: {
          type: "object",
          properties: {
            body: { type: "string", description: "Question stem, plain text, 1-3 sentences." },
            options: {
              type: "object",
              properties: {
                A: { type: "string" },
                B: { type: "string" },
                C: { type: "string" },
                D: { type: "string" },
              },
              required: ["A", "B", "C", "D"],
            },
            answerKey: { type: "string", enum: ["A", "B", "C", "D"] },
            solution: { type: "string", description: "Worked step-by-step solution, 2-5 sentences. For quantitative items show the actual working." },
            difficulty: { type: "string", enum: ["EASY", "MEDIUM", "HARD"] },
          },
          required: ["body", "options", "answerKey", "solution", "difficulty"],
        },
      },
    },
    required: ["questions"],
  },
} as const;

function systemPrompt(difficulty: "MEDIUM" | "HARD"): string {
  const diffLine =
    difficulty === "HARD"
      ? "TARGET DIFFICULTY: HARD. These are for a strong student who is already scoring 70%+. Make them genuinely challenging — multi-step reasoning, common traps, exam-level rigor. Do NOT write trivial recall questions."
      : "TARGET DIFFICULTY: MEDIUM, with ~30% HARD mixed in. Exam-realistic, not trivial.";
  return `You are writing fresh MCQ practice questions for an Indian competitive exam.

${diffLine}

RULES
- Single-correct-answer MCQ, exactly 4 options.
- Every question tests a real concept; include a worked solution.
- Use authentic Indian exam context and phrasing.
- Vary the sub-concepts within the topic — don't write 10 near-identical questions.
- NO ambiguous answers, NO trick questions with two defensible options.
- NO questions that go stale with time (no "current minister", "this year's…").
- NO verbatim copyrighted passages.

Output via the publish_questions tool only.`;
}

/**
 * Generate a fresh batch. Returns [] on any failure — the caller treats
 * generation as best-effort and falls back to the existing pool.
 */
export async function generateFreshQuestions(opts: {
  examShortName: string;
  examName: string;
  /** Optional topic focus. When omitted, spread across the exam. */
  topicName?: string;
  difficulty: "MEDIUM" | "HARD";
  count: number;
}): Promise<FreshQuestion[]> {
  const focus = opts.topicName
    ? `TOPIC FOCUS: every question must be on "${opts.topicName}".`
    : `Spread the questions across the core topics of this exam.`;
  const userPrompt = `EXAM: ${opts.examName} (${opts.examShortName})
${focus}

Generate ${Math.min(opts.count, 20)} questions via publish_questions.`;

  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 6000,
      system: systemPrompt(opts.difficulty),
      messages: [{ role: "user", content: userPrompt }],
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
    });
    const tu = res.content.find((b) => b.type === "tool_use");
    if (!tu || tu.type !== "tool_use") return [];
    const input = tu.input as { questions?: FreshQuestion[] };
    if (!Array.isArray(input.questions)) return [];
    return input.questions
      .filter(
        (q) =>
          q &&
          typeof q.body === "string" &&
          q.options &&
          ["A", "B", "C", "D"].includes(q.answerKey),
      )
      .slice(0, opts.count);
  } catch (err) {
    console.error("[on-demand-questions] generation failed:", err);
    return [];
  }
}

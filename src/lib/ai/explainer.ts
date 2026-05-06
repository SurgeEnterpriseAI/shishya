// Solution Explainer
// ───────────────────
// Given a question + the student's chosen answer, produce a clear,
// step-by-step explanation. Used on the post-attempt review screen.
//
// We prefer to reuse Question.solution from the DB when available and only
// call Claude when:
//   - solution is missing or short, OR
//   - the student requested DEEP detail, OR
//   - the student got it wrong and we want a "why your choice was wrong" hook.

import { callClaude, cachedSystem, extractText, TOKEN_LIMITS } from "./client";
import { PLATFORM_PERSONA, ANSWER_FORMAT_RULES, SAFETY_RULES } from "./prompts";
import type { ExplainInput, ExplainOutput } from "./types";

export async function explainSolution(input: ExplainInput): Promise<ExplainOutput> {
  const { question, studentChosen, language, detailLevel = "STANDARD" } = input;

  const systemBlocks = cachedSystem(PLATFORM_PERSONA, SAFETY_RULES, ANSWER_FORMAT_RULES);

  const userPrompt = `Explain this question step-by-step.

Question:
${question.body}

Options:
${question.options.map((o) => `${o.key}. ${o.text}`).join("\n")}

Correct answer: ${question.answerKey}
Student chose: ${studentChosen ?? "(no answer / left blank)"}
Existing solution (may be brief):
${question.solution || "(none)"}

Detail level: ${detailLevel}
Reply language: ${language}

Return STRICT JSON:
{
  "stepByStep": ["step 1...", "step 2...", "step 3..."],
  "whyChosenIsWrong": "only if studentChosen is wrong; one short paragraph; else null",
  "similarConcepts": ["short tag", "short tag"],
  "practiceTopicCode": "the topic.code most relevant for follow-up practice"
}

Rules:
- Each step is one sentence or one short equation.
- Be precise. No filler ("Let's see", "First we need to").
- For numeric steps, show the arithmetic.
- ${detailLevel === "BRIEF" ? "Use 2–3 steps max." : detailLevel === "DEEP" ? "Use up to 8 steps and include intuition." : "Use 4–6 steps."}`;

  const { response } = await callClaude({
    system: systemBlocks,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: TOKEN_LIMITS.explainer,
  });

  const parsed = safeParseJson(extractText(response));
  return {
    stepByStep: parsed.stepByStep ?? [],
    whyChosenIsWrong: parsed.whyChosenIsWrong ?? undefined,
    similarConcepts: parsed.similarConcepts ?? undefined,
    practiceTopicCode: parsed.practiceTopicCode ?? undefined,
  };
}

function safeParseJson(text: string): any {
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

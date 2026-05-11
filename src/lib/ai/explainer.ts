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

  const userPrompt = `Explain why option ${question.answerKey} is the correct answer to this question. Produce ONLY structured JSON — no chain-of-thought, no "let me reconsider", no fabricating alternate questions.

Question:
${question.body}

Options:
${question.options.map((o) => `${o.key}. ${o.text}`).join("\n")}

Marked correct answer: ${question.answerKey}
Student chose: ${studentChosen ?? "(skipped)"}
Existing solution (may be brief):
${question.solution || "(none)"}

Detail level: ${detailLevel}
Reply language: ${language}

CRITICAL — if you find the marked answer key doesn't actually follow from the question (e.g. the jumbled words don't contain a word the solution treats as present, the data is insufficient for the marked answer, the option text is internally inconsistent), DO NOT fabricate a workaround and DO NOT invent a different question. Instead set keyDisputed=true, explain in one short sentence what's inconsistent, and leave stepByStep empty.

Return STRICT JSON only (no markdown fences, no preamble):
{
  "keyDisputed": false,                          // true ONLY if the marked answer key doesn't fit the question as written
  "keyDisputeReason": null,                      // one short sentence if keyDisputed=true; otherwise null
  "stepByStep": ["step 1...", "step 2..."],      // empty array if keyDisputed=true
  "whyChosenIsWrong": null,                      // one short sentence ONLY if studentChosen differs from answerKey and is wrong; else null
  "similarConcepts": ["short tag"],
  "practiceTopicCode": "topic.code or null"
}

Style for stepByStep:
- One sentence or one short equation per step. No filler ("Let's see", "First we need to", "Wait", "Actually").
- For numeric steps, show the arithmetic inline.
- ${detailLevel === "BRIEF" ? "2–3 steps max." : detailLevel === "DEEP" ? "Up to 8 steps; include intuition." : "4–6 steps."}`;

  const { response } = await callClaude({
    system: systemBlocks,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: TOKEN_LIMITS.explainer,
  });

  const raw = extractText(response);
  const parsed = safeParseJson(raw);

  // Sanitise stepByStep: drop entries that look like chain-of-thought leakage
  // (the model sometimes ignores the "no 'wait'/'actually'" rule). Each step
  // should be at most one sentence; trim aggressively.
  const cleanedSteps = sanitiseSteps(parsed.stepByStep);

  return {
    stepByStep: cleanedSteps,
    whyChosenIsWrong:
      typeof parsed.whyChosenIsWrong === "string" && parsed.whyChosenIsWrong.trim()
        ? parsed.whyChosenIsWrong.trim()
        : undefined,
    similarConcepts: Array.isArray(parsed.similarConcepts) ? parsed.similarConcepts : undefined,
    practiceTopicCode:
      typeof parsed.practiceTopicCode === "string" && parsed.practiceTopicCode.trim()
        ? parsed.practiceTopicCode
        : undefined,
    keyDisputed: parsed.keyDisputed === true,
    keyDisputeReason:
      typeof parsed.keyDisputeReason === "string" && parsed.keyDisputeReason.trim()
        ? parsed.keyDisputeReason.trim()
        : undefined,
  };
}

// Drops chain-of-thought leakage. The model sometimes ignores the
// "no 'wait'/'actually'/'let me reconsider'" rule and floods steps with
// hedge prose. We split each step on sentence boundaries, drop ones that
// start with hedge words, and cap at the first crisp sentence.
function sanitiseSteps(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const hedgeStart = /^(wait|actually|hmm|let me|hold on|on second thought|reconsider|but wait|i think|let's|first we|now let)/i;
  const banned = /(let me create|different question|fabricate)/i;
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    if (banned.test(raw)) continue;
    // Take the first sentence-ish chunk if the step is multi-sentence rambling.
    const trimmed = raw.trim();
    const firstSentence = trimmed.split(/(?<=[.!?])\s+/)[0] ?? trimmed;
    if (hedgeStart.test(firstSentence)) continue;
    if (firstSentence.length < 3) continue;
    out.push(firstSentence.length < trimmed.length ? firstSentence : trimmed);
  }
  return out;
}

function safeParseJson(text: string): any {
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

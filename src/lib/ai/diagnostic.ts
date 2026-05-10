// Diagnostic Analyzer
// ───────────────────
// Input:  a student's mock attempt + the exam syllabus
// Output: weakness map, readable summary, recommended next actions
//
// Used right after the student submits their first ("diagnostic") mock,
// and re-run after every subsequent mock to refresh the WeaknessMap rows.

import { callClaude, cachedSystem, extractText, TOKEN_LIMITS } from "./client";
import { PLATFORM_PERSONA, ANSWER_FORMAT_RULES, SAFETY_RULES, syllabusBlock } from "./prompts";
import type { DiagnosticInput, DiagnosticOutput, TopicMastery } from "./types";

export async function runDiagnostic(input: DiagnosticInput): Promise<DiagnosticOutput> {
  const { attempt, syllabus, language } = input;

  // ── Step 1: deterministic mastery computation (no LLM needed) ────────────
  // The LLM should NOT invent numbers. We compute mastery rigorously, then
  // ask the LLM only for the human-readable framing.
  const topicMastery = computeTopicMastery(attempt);

  // ── Step 2: ask Claude for the narrative + recommendations ──────────────
  const STATIC_PROMPT = `${PLATFORM_PERSONA}\n\n${SAFETY_RULES}\n\n${ANSWER_FORMAT_RULES}`;
  const systemBlocks = cachedSystem(STATIC_PROMPT, syllabusBlock(syllabus));

  const userPrompt = `A student just completed a diagnostic mock for ${syllabus.examName}.

Their results:
- Score: ${attempt.scoreRaw}/${attempt.scoreMax} (${attempt.scorePct.toFixed(1)}%)
- Time taken: ${attempt.durationSec ? Math.round(attempt.durationSec / 60) : "?"} min
- Total questions: ${attempt.answers.length}
- Correct: ${attempt.answers.filter((a) => a.correct).length}

Per-topic performance (computed):
${topicMastery
  .map(
    (t) =>
      `- ${t.topicName} [\`${t.topicCode}\`]: ${t.correctCount}/${t.attemptsCount} correct → mastery ${(t.masteryScore * 100).toFixed(0)}%${t.avgTimeSec ? ` (avg ${t.avgTimeSec.toFixed(0)}s/Q)` : ""}`
  )
  .join("\n")}

Respond in language: ${language}

Return STRICT JSON matching this shape (no markdown, no commentary outside JSON):
{
  "summary": "2–3 sentence overall read of where the student stands",
  "weaknessHighlights": ["short bullet", "short bullet", ...],   // 3–5 bullets
  "recommendedActions": [
    { "kind": "TAKE_MOCK"|"STUDY_TOPIC"|"ASK_TUTOR"|"REVISE_MISTAKES",
      "topicCode": "optional",
      "reason": "one short sentence",
      "priority": 1 }
  ],
  "estimatedReadiness": 0
}

Rules:
- Base everything strictly on the data above. Do NOT invent stats.
- "estimatedReadiness" is your honest 0–100 estimate of how ready they are TODAY for the real exam, considering their score AND that this is one mock.
- Recommend at most 4 actions, ordered by priority (1 highest).
- Be honest. If the score is low, say so kindly and frame the path forward.`;

  const { response, stats } = await callClaude({
    system: systemBlocks,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: TOKEN_LIMITS.diagnostic,
  });

  const raw = extractText(response).trim();
  const parsed = safeParseJson(raw);

  return {
    summary: parsed.summary ?? "",
    topicMastery,
    weaknessHighlights: parsed.weaknessHighlights ?? [],
    recommendedActions: parsed.recommendedActions ?? [],
    estimatedReadiness: parsed.estimatedReadiness ?? 0,
    // Attach observability data via a non-enumerable side channel if desired
    // — left to the caller to log via stats.
  } as DiagnosticOutput & { _stats?: typeof stats };
}

// ─────────────────────────────────────────────────────────────────────────
// Deterministic mastery computation
// ─────────────────────────────────────────────────────────────────────────
function computeTopicMastery(attempt: DiagnosticInput["attempt"]): TopicMastery[] {
  // Bucket answers by topic. The Question record has topicId; we expect the
  // caller to denormalize topicCode/topicName onto each answer via a lookup
  // before invoking this — see service layer in src/lib/db/attempts.ts.
  const buckets = new Map<
    string,
    { topicCode: string; topicName: string; correct: number; total: number; timeSum: number }
  >();

  for (const a of attempt.answers) {
    const tid = (a as any).topicId as string | undefined;
    const tcode = (a as any).topicCode as string | undefined;
    const tname = (a as any).topicName as string | undefined;
    if (!tid || !tcode) continue;
    const b = buckets.get(tid) ?? {
      topicCode: tcode,
      topicName: tname ?? tcode,
      correct: 0,
      total: 0,
      timeSum: 0,
    };
    b.total += 1;
    if (a.correct) b.correct += 1;
    b.timeSum += a.timeSec || 0;
    buckets.set(tid, b);
  }

  const result: TopicMastery[] = [];
  for (const [topicId, b] of buckets) {
    result.push({
      topicId,
      topicCode: b.topicCode,
      topicName: b.topicName,
      attemptsCount: b.total,
      correctCount: b.correct,
      masteryScore: b.total === 0 ? 0 : b.correct / b.total,
      avgTimeSec: b.total === 0 ? undefined : b.timeSum / b.total,
    });
  }
  result.sort((a, b) => a.masteryScore - b.masteryScore);
  return result;
}

function safeParseJson(text: string): any {
  try {
    // Sometimes models wrap in code fences despite instructions
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

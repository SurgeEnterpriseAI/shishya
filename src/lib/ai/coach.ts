// Progress Coach
// ───────────────
// Periodic (weekly) summary call. Reads the student's recent attempts +
// state, produces a short coaching note: trends, what improved, what's stuck,
// goal for next week, motivational nudge.
//
// Called by a scheduled job, not on the request hot path.

import { callClaude, cachedSystem, extractText, TOKEN_LIMITS } from "./client";
import { PLATFORM_PERSONA, ANSWER_FORMAT_RULES, SAFETY_RULES, syllabusBlock, studentStateBlock } from "./prompts";
import type { CoachInput, CoachOutput, SyllabusContext } from "./types";

export async function generateWeeklyCoach(
  input: CoachInput & { syllabus: SyllabusContext }
): Promise<CoachOutput> {
  const { studentState, recentAttempts, windowDays, language, syllabus } = input;

  const systemBlocks = cachedSystem(
    PLATFORM_PERSONA,
    SAFETY_RULES,
    ANSWER_FORMAT_RULES,
    syllabusBlock(syllabus)
  );

  const attemptsBlock = recentAttempts
    .map(
      (a, i) =>
        `Attempt ${i + 1}: ${a.scoreRaw}/${a.scoreMax} (${a.scorePct.toFixed(1)}%) on ${a.startedAt}`
    )
    .join("\n");

  const userPrompt = `${studentStateBlock(studentState)}

Recent attempts (last ${windowDays} days):
${attemptsBlock || "(none)"}

Reply language: ${language}

Return STRICT JSON:
{
  "weeklySummary": "3–4 sentence read on this week",
  "trendInsights": ["bullet", "bullet", "bullet"],   // 2–4 bullets
  "goalForNextWeek": "one concrete, achievable goal",
  "motivationalNudge": "1–2 sentences. Honest, not saccharine."
}

Rules:
- Ground every claim in the data above. No invented stats.
- If the student took zero mocks this window, the goal must be something tiny and achievable (e.g., one 10-Q drill on weakest topic).
- The nudge must NOT be generic ("you can do it!"). Tie it to something specific from their data.`;

  const { response } = await callClaude({
    system: systemBlocks,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: TOKEN_LIMITS.coach,
  });

  const parsed = safeParseJson(extractText(response));
  return {
    weeklySummary: parsed.weeklySummary ?? "",
    trendInsights: parsed.trendInsights ?? [],
    goalForNextWeek: parsed.goalForNextWeek ?? "",
    motivationalNudge: parsed.motivationalNudge ?? "",
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

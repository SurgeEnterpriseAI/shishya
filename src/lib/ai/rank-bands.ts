// AI rank-band generator. Given an exam, produces 5-8 score→rank→outcome
// tiers that map a mock-test percentage to a plausible real-exam rank window
// and the colleges/posts/cadres typically reachable at that band.
//
// IMPORTANT: this is approximation from Claude's training knowledge of
// historic cut-offs and outcomes. Bands are coarse on purpose — the goal
// is motivation and goal-setting, not pinpoint rank prediction. Rows are
// flagged with source = "ai-generated:claude" so an admin can override
// per exam with curated, more-recent data.

import Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL } from "./client";

export interface RankBandInput {
  examCode: string;
  examName: string;
  examShortName: string;
  category: string;
}

export interface RankBand {
  scorePctMin: number;
  scorePctMax: number;
  rankMin: number | null;
  rankMax: number | null;
  label: string;
  outcomes: string; // markdown bullet list
}

export interface RankBandsResult {
  bands: RankBand[];
  inputTokens: number;
  outputTokens: number;
}

const SYSTEM = `You are generating a score→rank→outcome mapping for ONE Indian entrance exam, for use in a free exam-prep platform (Shishya).

GOAL: When a student finishes a mock test and sees their percentage score, they want one immediate human-readable card telling them: "If you scored this in the real exam, you'd likely get this rank, and that would put you in contention for these colleges / posts."

OUTPUT RULES:
1. Return 5-8 bands covering the full 0-100% score range with no gaps and no overlaps.
2. Each band has:
   - scorePctMin / scorePctMax (% of mock test score; 0-100)
   - rankMin / rankMax (expected real-exam rank window; lower number = better rank; null if the exam isn't rank-based, e.g. SSC where you get a post not a rank)
   - label: a short tier name in 2-6 words ("Top 1% — IIT contenders", "All-India top 1000", "Group B posts", "Tier 2 NIT range")
   - outcomes: a markdown bullet list (3-6 bullets) of REAL, NAMED outcomes. Each bullet should be:
     • a specific institution name (e.g. "IIT Bombay — CSE", "AIIMS Delhi MBBS", "JNU MA Economics") OR
     • a specific post + cadre (e.g. "ITI Inspector (CBI cadre)", "Assistant Section Officer (CSS)", "Sub-Inspector (Delhi Police, executive cadre)")
     Where you're confident, also append a one-line context after a "—" with one of: location, typical fee/stipend, accepted branches/specialisations, last year's approximate cut-off. Examples:
     - "IIT Madras — Mechanical Engineering (cut-off ~2400 OBC, ~1800 General)"
     - "AIIMS Bhopal MBBS — last year's General category cut-off ~95 percentile"
     - "Income Tax Inspector (CBDT cadre) — Group B Non-Gazetted, pay level 7"
3. Lower scorePctMin must always also mean worse (numerically higher) rankMin. Don't invert.
4. For SSC / RRB / state-PSC / police-constable type exams where outcome is a POST and not a rank, set rankMin=rankMax=null and put post names + cadre in outcomes.
5. For JEE, NEET, GATE, CAT, CLAT and other rank-based exams, fill rankMin / rankMax.
6. Be conservative on numbers you're not sure about — say "approximately" or omit specific cut-offs rather than fabricating exact figures.

OUTPUT: STRICT JSON only, no markdown fences, no preamble:

{
  "bands": [
    {
      "scorePctMin": 0,
      "scorePctMax": 30,
      "rankMin": 400000,
      "rankMax": null,
      "label": "Needs more prep",
      "outcomes": "- Unlikely to clear cut-off this cycle\\n- Focus on basics for next attempt"
    },
    ...
  ]
}`;

export async function generateRankBands(input: RankBandInput): Promise<RankBandsResult> {
  const userPrompt = `Generate the score→rank→outcome bands for this exam.

Exam code:   ${input.examCode}
Exam name:   ${input.examName}
Short name:  ${input.examShortName}
Category:    ${input.category}

Return STRICT JSON per the schema in the system prompt. 5-8 bands, full 0-100 score coverage, no gaps.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3500,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const parsed = extractJson(text);
  if (!parsed || !Array.isArray(parsed.bands)) {
    throw new Error(`rank-bands JSON parse failed for ${input.examCode}: ${text.slice(0, 200)}`);
  }

  const bands: RankBand[] = parsed.bands
    .filter((b: any) =>
      Number.isFinite(b?.scorePctMin) &&
      Number.isFinite(b?.scorePctMax) &&
      typeof b?.label === "string" &&
      typeof b?.outcomes === "string",
    )
    .map((b: any) => ({
      scorePctMin: clampNum(b.scorePctMin, 0, 100),
      scorePctMax: clampNum(b.scorePctMax, 0, 100),
      rankMin: Number.isFinite(b.rankMin) ? Math.max(1, Math.round(Number(b.rankMin))) : null,
      rankMax: Number.isFinite(b.rankMax) ? Math.max(1, Math.round(Number(b.rankMax))) : null,
      label: String(b.label).slice(0, 120),
      outcomes: String(b.outcomes).slice(0, 2000),
    }))
    // Sort highest-score-band first (orderIdx 0).
    .sort((a: RankBand, b: RankBand) => b.scorePctMin - a.scorePctMin);

  return {
    bands,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

function clampNum(v: any, lo: number, hi: number): number {
  const n = Number.isFinite(v) ? Number(v) : 0;
  return Math.max(lo, Math.min(hi, n));
}

function extractJson(text: string): any | null {
  let body = text.trim();
  if (body.startsWith("```")) {
    body = body.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  try {
    return JSON.parse(body);
  } catch {
    const first = body.indexOf("{");
    const last = body.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) return null;
    try {
      return JSON.parse(body.slice(first, last + 1));
    } catch {
      return null;
    }
  }
}

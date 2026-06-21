// The Gemini growth analyst. Takes the weekly metrics snapshot (+ last
// week's suggestions and their outcome) and returns a prose read plus a
// prioritized list of growth suggestions, each with a concrete brief that
// Claude can pick up and implement. SERVER-ONLY.
//
// Uses the Gemini REST API directly (no SDK dependency). Needs GEMINI_API_KEY
// in the environment; without it this is a no-op that returns null so the
// cron still persists + emails the raw metrics.
//
//   GEMINI_API_KEY   from Google AI Studio (aistudio.google.com → API keys)
//   GEMINI_MODEL     optional, defaults to gemini-2.5-flash

import type { GrowthMetrics } from "./metrics";

export interface GrowthSuggestion {
  id: string;
  title: string;
  category: "conversion" | "distribution" | "content" | "retention" | "performance" | "other";
  hypothesis: string; // why this should help, tied to the data
  expectedImpact: string; // the metric it should move
  effort: "S" | "M" | "L";
  claudeTask: string; // self-contained brief Claude can implement
  status: "open" | "done" | "skipped";
}

export interface GrowthAnalysis {
  narrative: string;
  priorReview: string; // how last week's shipped suggestions look against this week's data
  suggestions: GrowthSuggestion[];
  model: string;
}

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const SYSTEM = `You are the growth strategist for Shishya — a free, community-driven Indian exam-prep platform (163 entrance/government exams: UPSC, SSC, NEET, JEE, state PSCs, banking, etc.). A separate AI engineer ("Claude") implements your suggestions in a Next.js + Postgres codebase and ships them. Your job each week: read the real metrics, say plainly what's working and what's leaking, and hand Claude a prioritized, concrete build list to grow traffic AND conversion.

Rules:
- Ground EVERYTHING in the numbers provided. Quote the metric. No generic growth-blog advice.
- Diagnose the binding constraint first (acquisition? activation/signup conversion? retention? distribution?). Don't spread thin.
- Each suggestion's claudeTask must be a self-contained engineering brief: what to build, where, and how to measure it moved the metric. Assume Claude knows the codebase.
- Prefer a few high-leverage moves over many small ones. 3-6 suggestions max.
- Respect what already exists: per-exam SEO content, phase articles, an aptitude test, an AI tutor (now ungated), a try-one-question hook, WhatsApp share, welcome/nudge emails.
- If you reviewed prior suggestions, say which the data validates or refutes.
- Return STRICT JSON only, matching the requested schema.`;

export async function analyzeGrowth(
  metrics: GrowthMetrics,
  priorSuggestions: GrowthSuggestion[] | null
): Promise<GrowthAnalysis | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("[growth] GEMINI_API_KEY not set — skipping analysis, persisting raw metrics only.");
    return null;
  }

  const prompt = `${SYSTEM}

=== THIS WEEK'S METRICS (JSON) ===
${JSON.stringify(metrics, null, 2)}

=== LAST WEEK'S SUGGESTIONS YOU GAVE (with status) ===
${priorSuggestions && priorSuggestions.length ? JSON.stringify(priorSuggestions, null, 2) : "(none — this is the first run)"}

Return STRICT JSON with this exact shape:
{
  "narrative": "3-6 sentence read of the week, grounded in the numbers (quote them).",
  "priorReview": "1-3 sentences on whether last week's shipped items moved the metric (or 'first run').",
  "suggestions": [
    {
      "id": "kebab-case-slug",
      "title": "short imperative title",
      "category": "conversion|distribution|content|retention|performance|other",
      "hypothesis": "why this helps, tied to a specific metric",
      "expectedImpact": "the metric it should move and roughly how much",
      "effort": "S|M|L",
      "claudeTask": "a concrete, self-contained engineering brief Claude can implement and measure"
    }
  ]
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, responseMimeType: "application/json", maxOutputTokens: 4096 },
      }),
    });
    if (!res.ok) {
      console.error("[growth] Gemini API error:", res.status, (await res.text()).slice(0, 400));
      return null;
    }
    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("[growth] Gemini returned no text:", JSON.stringify(data).slice(0, 300));
      return null;
    }
    const parsed = JSON.parse(text);
    const suggestions: GrowthSuggestion[] = (parsed.suggestions ?? [])
      .filter((s: any) => s && s.title && s.claudeTask)
      .map((s: any, i: number) => ({
        id: String(s.id || `sugg-${i + 1}`),
        title: String(s.title),
        category: ["conversion", "distribution", "content", "retention", "performance", "other"].includes(s.category) ? s.category : "other",
        hypothesis: String(s.hypothesis ?? ""),
        expectedImpact: String(s.expectedImpact ?? ""),
        effort: ["S", "M", "L"].includes(s.effort) ? s.effort : "M",
        claudeTask: String(s.claudeTask),
        status: "open" as const,
      }));
    return {
      narrative: String(parsed.narrative ?? ""),
      priorReview: String(parsed.priorReview ?? ""),
      suggestions,
      model: MODEL,
    };
  } catch (err) {
    console.error("[growth] Gemini call failed:", err);
    return null;
  }
}

// AI-driven exam-info generator. Produces news bullets + important date
// rows for any Indian entrance exam, given the exam code + canonical name.
//
// Used by:
//   - scripts/seed-news-dates-all.ts (one-off seed across 163 exams)
//   - /api/cron/refresh-exam-data (daily refresh of a rotating subset)
//
// IMPORTANT: this is approximation from Claude's training knowledge — not
// scraped live from official sites. We mark generated rows with
// source = "ai-generated:claude" so the UI can flag them and an admin can
// override with verified entries.

import Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL } from "./client";

export interface ExamInfoInput {
  examCode: string;
  examName: string;
  examShortName: string;
  category: string;
}

export interface NewsItem {
  title: string;
  body: string;
  daysAgo: number;
  source?: string | null;
}

export interface ImportantDate {
  label: string;
  daysFromNow: number;
  isExamDay: boolean;
  notes?: string | null;
}

export interface ExamInfoResult {
  news: NewsItem[];
  dates: ImportantDate[];
  inputTokens: number;
  outputTokens: number;
}

const SYSTEM = `You are a research assistant generating up-to-date exam-prep context for a free Indian entrance-exam tutoring platform (Shishya).

Your output: STRICT JSON describing recent news items + an annual important-dates calendar for ONE Indian entrance exam.

RULES:
1. Be conservative and factually plausible. NEVER invent specific vacancy counts, cut-off marks, or absolute future dates that can be fact-checked and proven wrong. Prefer relative-time language like "in the coming weeks" or "this cycle's" rather than concrete year-bound claims you can't verify.
2. Use the exam's typical annual schedule (April-June application, July-September Tier 1, etc.) when you know it, expressed as days-from-now offsets so dates auto-shift each month the data is refreshed.
3. Each news item title MUST be exam-specific (don't write "Important update" — write "Tier 1 admit card window confirmed by SSC"). Body 1-3 sentences.
4. Each important date MUST be a single concrete milestone with a clear label ("Application portal opens", "Tier 1 exam date", "Result announcement"). Use the isExamDay flag on actual exam-day rows.
5. If the exam is a state-level or low-coverage entrance and you don't have confident detail, return shorter arrays (1-2 news items, 3-4 dates) rather than padding with vague filler.
6. Output STRICTLY this JSON shape — no markdown fences, no preamble:

{
  "news": [
    { "title": "...", "body": "...", "daysAgo": 3, "source": "https://..." | null }
  ],
  "dates": [
    { "label": "...", "daysFromNow": 30, "isExamDay": false, "notes": "..." | null }
  ]
}

daysAgo: positive integer = how many days ago a news bullet would have been published. 1-30.
daysFromNow: integer; can be negative (recent) or positive (upcoming). −30 to 365.`;

export async function generateExamInfo(input: ExamInfoInput): Promise<ExamInfoResult> {
  const userPrompt = `Generate news + important dates for this Indian entrance exam.

Exam code:   ${input.examCode}
Exam name:   ${input.examName}
Short name:  ${input.examShortName}
Category:    ${input.category}

Today's date: ${new Date().toISOString().slice(0, 10)}.

Return 3-5 news items and 5-8 important dates as STRICT JSON per the schema in the system prompt.`;

  const start = Date.now();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2500,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userPrompt }],
  });
  void start;

  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const parsed = extractJson(text);
  if (!parsed) {
    throw new Error(`exam-info JSON parse failed for ${input.examCode}: ${text.slice(0, 200)}`);
  }

  const news = Array.isArray(parsed.news)
    ? parsed.news
        .filter((n: any) => typeof n?.title === "string" && typeof n?.body === "string")
        .map((n: any) => ({
          title: String(n.title).slice(0, 160),
          body: String(n.body).slice(0, 1200),
          daysAgo: clampInt(n.daysAgo, 0, 60),
          source: typeof n.source === "string" && n.source.length > 0 ? n.source : null,
        }))
    : [];

  const dates = Array.isArray(parsed.dates)
    ? parsed.dates
        .filter((d: any) => typeof d?.label === "string" && Number.isFinite(d?.daysFromNow))
        .map((d: any) => ({
          label: String(d.label).slice(0, 120),
          daysFromNow: clampInt(d.daysFromNow, -120, 540),
          isExamDay: Boolean(d.isExamDay),
          notes: typeof d.notes === "string" ? d.notes.slice(0, 600) : null,
        }))
    : [];

  return {
    news,
    dates,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

function clampInt(v: any, lo: number, hi: number): number {
  const n = Number.isFinite(v) ? Math.round(Number(v)) : 0;
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

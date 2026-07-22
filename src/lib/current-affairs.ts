// Daily current-affairs generation.
//
// "Current affairs today" is the single highest-frequency return search
// in Indian exam prep — aspirants look it up every single day. This
// produces a dated digest of the day's exam-relevant events using Claude
// + the web_search server tool (same pattern as the exam-news cron), so
// the items are genuinely current, not training-memory.
//
// Storage is raw SQL against CurrentAffair so it works before/without a
// Prisma client regen (Windows DLL-lock pattern used across the repo).

import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "./ai/client";
import { parseJson } from "./ai/client";
import { prisma } from "./db/prisma";

const MODEL = "claude-sonnet-4-5-20250929";

export interface CurrentAffairItem {
  title: string;
  summary: string;
  category: string;
  examTags: string[];
  whyItMatters?: string | null;
  source?: string | null;
}

const CATEGORIES =
  "National, International, Economy, Sci-Tech, Environment, Sports, Awards, Appointments, Schemes, Defence";

const SYSTEM = `You are the current-affairs editor for Shishya, a free Indian government-exam prep platform. You produce a daily digest of the most exam-relevant current affairs for aspirants (UPSC, SSC, banking, railways, state PSCs, defence).

Use your web_search tool to find TODAY's and the last 1-2 days' genuinely important news for Indian competitive exams. Prioritise: government schemes & policy, appointments & resignations, economy & RBI, international relations & summits, defence & ISRO/science, major awards, important reports/indices, sports milestones, environment. Skip celebrity/entertainment gossip and pure local crime.

Return STRICT JSON — no fences, no preamble:
{
  "items": [
    {
      "title": "concise factual headline",
      "summary": "2-4 factual sentences an aspirant can revise from",
      "category": "one of: ${CATEGORIES}",
      "examTags": ["UPSC","SSC",...],
      "whyItMatters": "one line on exam relevance, or null",
      "source": "https://... real source url, or null"
    }
  ]
}

RULES: 8-12 items. Be factual and verifiable — every item must come from a real search result; never invent a story. Keep summaries neutral and exam-useful (names, dates, numbers, places). examTags from: UPSC, SSC, Banking, Railways, State PSC, Defence, Teaching, General.`;

/**
 * Generate the current-affairs digest for "now" (IST) and upsert each
 * item under the given IST date. Returns the items written + token usage.
 */
export async function generateDailyCurrentAffairs(opts: {
  istDate: string; // "YYYY-MM-DD"
} ): Promise<{ items: CurrentAffairItem[]; inputTokens: number; outputTokens: number }> {
  const tools: Anthropic.Messages.Tool[] = [
    { type: "web_search_20250305", name: "web_search", max_uses: 6 } as unknown as Anthropic.Messages.Tool,
  ];
  const res = await anthropic.messages.create(
    {
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      tools,
      messages: [
        {
          role: "user",
          content: `Produce the exam-relevant current-affairs digest for ${opts.istDate} (India). Search the web for the latest developments, then return the STRICT JSON.`,
        },
      ],
    },
    { timeout: 180_000, maxRetries: 2 },
  );

  const text = res.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const parsed = parseJson<{ items: CurrentAffairItem[] }>(text);
  const items = (parsed.items ?? []).filter((i) => i.title && i.summary).slice(0, 14);

  for (const it of items) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "CurrentAffair" (id, date, title, summary, category, "examTags", "whyItMatters", source, "generatedAt")
       VALUES (gen_random_uuid()::text, $1::date, $2, $3, $4, $5::text[], $6, $7, NOW())
       ON CONFLICT (date, title) DO UPDATE SET summary = $3, category = $4, "examTags" = $5::text[], "whyItMatters" = $6, source = $7`,
      opts.istDate,
      it.title.slice(0, 300),
      it.summary,
      it.category?.slice(0, 40) || "National",
      Array.isArray(it.examTags) ? it.examTags.slice(0, 8) : [],
      it.whyItMatters ?? null,
      it.source ?? null,
    );
  }

  return { items, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens };
}

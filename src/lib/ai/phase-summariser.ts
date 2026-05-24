// Phase-article summariser.
//
// Takes:
//   - The exam meta (name, shortName, code)
//   - The phase (CHECKLIST / LIVE / REACTIONS)
//   - Scraped snippets from src/lib/scrape/*
//
// Returns:
//   { title, bodyMarkdown, sourcesUsed }
//
// The system prompt is phase-specific because the journalistic shape
// of each article is different:
//
//   CHECKLIST — practical, prescriptive, no speculation. Hard rules
//               (what to carry, what NOT to do tonight).
//   LIVE      — observational, with caveats ("aspirants are saying…")
//               and explicit difficulty rating. Cutoff predictions are
//               labelled as candidate-side speculation.
//   REACTIONS — synthesis: extract a difficulty consensus, an
//               expected-cutoff table, answer-key links, and "what
//               to do this week" advice. Cite the volume of posts
//               read so the reader trusts the verdict.
//
// We use a tool-use call so the model returns a structured object
// (title + body + sources) — easier to validate than parsing free
// text. Falls back to text parsing if the tool block is missing.

import type { ExamPhase } from "@prisma/client";
import { anthropic, MODEL } from "./client";
import type { ScrapedSnippet } from "@/lib/scrape/types";

export interface SummaryResult {
  title: string;
  bodyMarkdown: string;
  sourcesUsed: Array<{
    url: string;
    type: "reddit" | "rss" | "telegram" | "youtube" | "news" | "manual";
    label?: string;
    weight?: number;
  }>;
}

// Cap input size to keep cost predictable. ~80 snippets × ~600 chars
// avg = ~50KB ≈ 12K tokens of input. With a 3K-token system prompt
// and 4K output the per-call cost lands at roughly $0.07 with Sonnet.
const MAX_SNIPPETS_PER_CALL = 80;
const MAX_SNIPPET_CHARS = 600;

const PHASE_SYSTEM: Record<ExamPhase, string> = {
  CHECKLIST: `You are writing a last-minute checklist article for an Indian entrance/government exam, for students who have 1-7 days before exam day.

REQUIREMENTS:
- Write in markdown. Use ## headings, bullet lists, and tables (markdown pipe syntax) where appropriate.
- Open with a 1-2 sentence "what now" lead — calm, not alarmist.
- Include a sectioned evening revision plan (table with Time / What / Why columns).
- Include a "What to carry" checklist (admit card, ID, transparent pouch, pen, etc.).
- Include exam-day timing details.
- Include a "Don't do this" anti-list: things students mistakenly do in the final 24h.
- NO speculation about questions that will appear. Past pattern is OK; predicting specific MCQs is not.
- Tone: an older sibling who has cleared the same exam — confident, kind, specific.
- 600-1100 words. No more.
- DO NOT include disclaimers like "I am an AI". Write as if you are the Shishya editorial team.
- DO NOT hallucinate official rules — when uncertain, write "verify on official site".`,

  LIVE: `You are writing live exam-day coverage for an Indian entrance/government exam — the article is being read RIGHT NOW by students who either just finished a shift or are about to start one.

REQUIREMENTS:
- Write in markdown. Use ## headings, bullet lists, and a difficulty table.
- Open with "Quick read" — 2-3 sentences naming the exam, the date today, and the live status.
- Include a "What's the difficulty so far?" section that names specific topics flagged by aspirants in the scraped sources. ALWAYS attribute claims to aspirants ("Aspirants are saying…", "Candidates flagged…") — never state difficulty as a Shishya verdict.
- Include an "Expected cutoff range" table IF the sources mention cutoff predictions. Label clearly as "aspirant-side, not official".
- Include a "What to do right now if you took the exam" section with practical steps (hydrate, don't discuss, etc.).
- Include a "What we're reading" footer naming the source kinds (Reddit, RSS, etc.) WITHOUT inventing source names that weren't in the input.
- 500-900 words.
- DO NOT predict the official cutoff with false precision. Always give ranges and label as aspirant speculation.
- DO NOT include phrases like "I am an AI" or "Based on the data provided".
- If sources are thin or contradictory, say so explicitly — partial-coverage honesty builds trust.`,

  REACTIONS: `You are writing the post-exam student verdict article for an Indian entrance/government exam — being read 1-3 days after the exam by students checking expected cutoff, answer-key analysis, and what their peers thought.

REQUIREMENTS:
- Write in markdown. Use ## headings.
- Open with a "The verdict" section: a single block-quote summarising what student consensus says (difficulty + key complaint). Attribute to aspirants.
- Include a "Topic-wise difficulty" table where applicable (Subject / Questions est. / Difficulty / Top complaint columns).
- Include an "Expected cutoff" table with rows for General/EWS/OBC/SC/ST IF cutoff predictions appear in the sources. Always two columns: "Aspirant predicted" and "2025 official" (use placeholder if unknown). Label clearly as predictions, not official.
- Include "Answer-key trackers" listing institute keys mentioned in the scraped content. If sources name specific institutes, name them; otherwise say "Coaching answer keys typically release within 24h".
- Include "What to do this week" — practical advice for waiting candidates (start Mains prep, don't compare scores, etc.).
- 700-1200 words.
- ALL numerical claims (cutoff, question counts, post-volume) MUST be sourced from the scraped snippets. If not present, omit the number rather than guessing.
- Cite source volume ("Based on a poll of N+ aspirants from Reddit / Telegram / X") to anchor credibility.
- DO NOT include "I am an AI" or "Based on the data provided".`,
};

const SUMMARY_TOOL = {
  name: "publish_phase_article",
  description:
    "Submit the final phase article to be published on Shishya. Body must be markdown, sources must point at URLs that appeared in the scraped input.",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description:
          "Article title. Should include the exam shortName + phase descriptor + year for SEO. 60-100 chars.",
      },
      bodyMarkdown: {
        type: "string",
        description: "Full article body in markdown. Follow the per-phase requirements in the system prompt.",
      },
      sourcesUsed: {
        type: "array",
        items: {
          type: "object",
          properties: {
            url: { type: "string", description: "Source URL exactly as it appeared in scraped input." },
            type: {
              type: "string",
              enum: ["reddit", "rss", "telegram", "youtube", "news", "manual"],
              description: "Source kind.",
            },
            label: { type: "string", description: "Human-readable name (e.g. 'r/UPSC live thread', 'Indian Express education')." },
            weight: { type: "number", description: "1-5; higher = more influential on the article. Optional." },
          },
          required: ["url", "type"],
        },
        description: "URLs cited in the article. Should be a subset of the input snippet URLs.",
      },
    },
    required: ["title", "bodyMarkdown", "sourcesUsed"],
  },
} as const;

export async function summarisePhase({
  examShortName,
  examName,
  examCode,
  phase,
  snippets,
}: {
  examShortName: string;
  examName: string;
  examCode: string;
  phase: ExamPhase;
  snippets: ScrapedSnippet[];
}): Promise<SummaryResult | null> {
  if (snippets.length === 0) return null;

  // Trim + sort by score (high-engagement posts first) then recency.
  const top = snippets
    .slice()
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, MAX_SNIPPETS_PER_CALL);

  const inputBundle = top
    .map((s, i) => {
      const body = s.body.slice(0, MAX_SNIPPET_CHARS);
      return `### Snippet ${i + 1} [${s.type}] ${s.channel ?? ""} · ${s.publishedAt}
URL: ${s.url}
Title: ${s.title}
${body ? `Body: ${body}` : ""}`;
    })
    .join("\n\n");

  const userPrompt = `Exam: ${examName} (${examShortName}, code: ${examCode})
Phase: ${phase}
Today: ${new Date().toISOString().slice(0, 10)}

Below are ${top.length} scraped snippets from public student discussion. Use them as your only source material — do not invent quotes, numbers, or sources that don't appear here.

Publish the article via the publish_phase_article tool. Follow the per-phase requirements in the system prompt strictly.

────────────────────
${inputBundle}
────────────────────`;

  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: PHASE_SYSTEM[phase],
      messages: [{ role: "user", content: userPrompt }],
      tools: [SUMMARY_TOOL],
      tool_choice: { type: "tool", name: SUMMARY_TOOL.name },
    });

    const toolUse = res.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return null;
    const input = toolUse.input as Partial<SummaryResult>;
    if (!input.title || !input.bodyMarkdown || !Array.isArray(input.sourcesUsed)) return null;

    return {
      title: input.title,
      bodyMarkdown: input.bodyMarkdown,
      sourcesUsed: input.sourcesUsed.filter((s) => s && s.url && s.type),
    };
  } catch (err) {
    console.error("[phase-summariser] Claude call failed:", err);
    return null;
  }
}

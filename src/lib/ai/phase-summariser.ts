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
  /**
   * 1-2 sentence plain-text teaser shown in the homepage sidebar so
   * students see the article's value-prop before they click.
   * ≤ 200 chars. No markdown. Conversational.
   */
  summarySnippet: string;
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
      summarySnippet: {
        type: "string",
        description:
          "1-2 sentence PLAIN-TEXT teaser shown in the homepage sidebar — students see this BEFORE clicking through, so it must hook them. ≤ 200 chars. No markdown, no quote marks. Example for UPSC LIVE: 'Aspirants flagging polity-heavy paper; CSAT easier than 2024. Early cutoff prediction: 88-94 (Gen).' Example for JEE CHECKLIST: '24 hours to go. Tonight: revise formula sheet, inorganic exceptions, conics shortcuts. No new topics. Sleep by 22:30.'",
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
    required: ["title", "summarySnippet", "bodyMarkdown", "sourcesUsed"],
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
  // LIVE and REACTIONS are real-time, source-grounded phases. Reddit/
  // RSS covers national exams well (UPSC, RRB, banking) but STATE-exam
  // aspirants discuss on Telegram, YouTube and local-language news that
  // our scrapers don't reach — for them the snippet pile is empty and
  // we used to bail, leaving the "no data yet" placeholder exactly when
  // students come checking cutoffs (found 14 Aug 2026: AP TET, GSSSB,
  // Punjab PCS all placeholder). Now: with thin snippets (<3) we hand
  // Claude the web_search tool to find reactions itself — coaching
  // sites, local news, answer-key coverage. Same honesty rules apply;
  // if the search genuinely finds nothing, no article is published.
  // CHECKLIST needs no chatter at all — it's evergreen prep knowledge.
  const knowledgeOnly = snippets.length === 0;
  const webGrounded = phase !== "CHECKLIST" && snippets.length < 3;

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

  const userPrompt = webGrounded
    ? `Exam: ${examName} (${examShortName}, code: ${examCode})
Phase: ${phase}
Today: ${new Date().toISOString().slice(0, 10)}

Our scrapers found ${top.length === 0 ? "NO" : `only ${top.length}`} student-discussion snippets for this exam${top.length ? ` (included below)` : ""}. Use the web_search tool (up to 6 searches) to find what students and educators are ACTUALLY saying about the just-held paper: difficulty reactions, section-wise reviews, expected-cutoff predictions, answer-key releases. Prioritise Indian coaching sites, local and regional-language news, and exam-specific portals. Search with the exam's real name and year, not just the acronym.

Hard rules:
- Every numerical claim (cutoffs, question counts) must come from a source you actually found — cite it in sourcesUsed with type "news".
- Attribute difficulty claims to their sources; never state them as Shishya's own verdict.
- Cutoffs are RANGES labelled as predictions, never official.
- If after searching you find NOTHING substantive about this specific exam sitting, do NOT call publish_phase_article — end your turn without publishing instead of padding a hollow article.
${top.length ? `\n────────────────────\n${inputBundle}\n────────────────────\n` : ""}
Otherwise, publish via the publish_phase_article tool, following the ${phase} requirements in the system prompt strictly.`
    : knowledgeOnly
    ? `Exam: ${examName} (${examShortName}, code: ${examCode})
Phase: CHECKLIST
Today: ${new Date().toISOString().slice(0, 10)}

There is NO scraped student discussion available for this exam right now. Write an evergreen last-minute checklist from your own knowledge of this exam's official pattern and standard Indian exam-day logistics.

Hard rules for this no-sources case:
- Do NOT invent exam-specific cutoff numbers, expected question counts, or student quotes.
- For any official detail you are not certain of (reporting time, permitted items, marking scheme), write "verify on the official site / your admit card" instead of stating a number you might be wrong about.
- The evening revision plan, "what to carry", exam-day timing best-practices, and "don't do this" anti-list are all evergreen — write those confidently and specifically.
- Pass an empty array for sourcesUsed (there are no scraped sources to cite).

Publish the article via the publish_phase_article tool. Follow the CHECKLIST requirements in the system prompt strictly.`
    : `Exam: ${examName} (${examShortName}, code: ${examCode})
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
      max_tokens: webGrounded ? 6000 : 4096,
      system: PHASE_SYSTEM[phase],
      messages: [{ role: "user", content: userPrompt }],
      // webGrounded: tool_choice must stay auto so the model can search
      // BEFORE publishing (forcing the publish tool would skip search).
      tools: webGrounded
        ? ([{ type: "web_search_20250305", name: "web_search", max_uses: 6 }, SUMMARY_TOOL] as any)
        : [SUMMARY_TOOL],
      ...(webGrounded ? {} : { tool_choice: { type: "tool" as const, name: SUMMARY_TOOL.name } }),
    });

    const toolUse = res.content.find((b) => b.type === "tool_use" && b.name === SUMMARY_TOOL.name);
    if (!toolUse || toolUse.type !== "tool_use") return null;
    const input = toolUse.input as Partial<SummaryResult>;
    if (!input.title || !input.bodyMarkdown || !Array.isArray(input.sourcesUsed)) return null;

    // Snippet is required by the tool schema but if Claude omits it
    // (e.g. on a retry path) we fall back to the first non-heading
    // sentence of the body so the sidebar still has something to show.
    const snippet =
      input.summarySnippet?.slice(0, 220).trim() ||
      firstSentenceFromMarkdown(input.bodyMarkdown);

    return {
      title: input.title,
      summarySnippet: snippet,
      bodyMarkdown: input.bodyMarkdown,
      sourcesUsed: input.sourcesUsed.filter((s) => s && s.url && s.type),
    };
  } catch (err) {
    console.error("[phase-summariser] Claude call failed:", err);
    return null;
  }
}

/**
 * Fallback for when Claude forgets to emit a summarySnippet — grabs
 * the first paragraph-like sentence from the markdown body, stripped
 * of markdown formatting and capped at ~200 chars.
 */
function firstSentenceFromMarkdown(md: string): string {
  // Skip headings, bullets, table rows — find a real prose paragraph.
  const lines = md.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;
    if (line.startsWith("|") || line.startsWith("- ")) continue;
    if (line.startsWith(">")) {
      // Block-quote — strip the marker and use the content.
      const after = line.replace(/^>\s*/, "");
      if (after) return clip(after);
      continue;
    }
    // Strip inline markdown then clip to first sentence end.
    return clip(line);
  }
  return "";
}

function clip(s: string): string {
  const plain = s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1")
    .replace(/`(.+?)`/g, "$1");
  // First sentence boundary or 200 chars, whichever comes first.
  const cap = plain.slice(0, 220);
  const m = cap.match(/^(.+?[.!?])(\s|$)/);
  return (m ? m[1] : cap).trim();
}

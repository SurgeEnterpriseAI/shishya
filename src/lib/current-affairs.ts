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
//
// 6 Oct 2026 (B2, root cause of the empty days). The Vercel runtime logs of
// the 06:30 IST runs (27 and 28 Sep, 2 and 3 Oct) show two failures, and the
// AiUsage ledger matches them:
//   - 27 Sep: the model answered in prose, no JSON — it took the date to be
//     2024 and the 2026 search results to be "simulated/hypothetical";
//   - 3 Oct: prose again — "unable to find sufficient genuinely fresh news
//     specifically from October 3, 2026 (today)" at 06:30 IST.
//   Both were paid (568 and 645 output tokens, against 2,870-3,869 on a
//   stored day). 12 and 17 Sep and 6 Oct have the same short paid reply
//   (734, 823, 759 tokens); their text was not logged.
//   - 28 Sep and 2 Oct: "Your credit balance is too low" (400) — no ledger
//     row. 11, 13, 15, 22 and 25 Sep also have no ledger row and no AiUsage
//     row of ANY feature between 01:00 and 02:00 UTC (the API answered
//     nobody then), the same shape as the two logged credit days.
// So: the prompt now states the date as fact and asks for the 48 hours up to
// the run (a 06:30 IST run cannot find much of "today"), and always for the
// JSON object, never prose; a reply with fewer than MIN_DIGEST_ITEMS usable,
// sourced items stores nothing (no empty or thin day is ever written); the
// day's rows are written in one transaction or not at all; the SDK makes no
// hidden second request (maxRetries 0 — a timed-out request may still have
// been billed; the next cron slot is the retry). The cron runs the call inside
// a locked transaction (src/lib/current-affairs-slot.ts) and passes it in as
// `tx`: the ledger row is awaited before the write, so it has landed before
// that lock is released and a run that takes the lock next counts the call.

import Anthropic from "@anthropic-ai/sdk";
import type { Prisma } from "@prisma/client";
import { recordAiUsageAwaited } from "@/lib/ai/usage";
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

/** Fewer usable items than this and the reply stores nothing (the day stays
 *  empty and the next cron slot tries again). Every day stored since 1 Sep
 *  2026 has 10-12 rows (24 Jul has 2 and 26 Jul 8). */
export const MIN_DIGEST_ITEMS = 5;
/** Most items one day stores. */
export const MAX_DIGEST_ITEMS = 14;

/** The model call's own limit. On a stored day the ledger row landed 77-102 s
 *  after the 01:00 UTC slot (7 Sep-5 Oct 2026) and the day's first row 58-169 s
 *  after it (since 22 Jul). Below CA_CALL_TX_TIMEOUT_MS (280 s) and the DB's
 *  5-minute idle-in-transaction limit: the cron holds its locked transaction
 *  open while the model answers. */
export const CA_MODEL_TIMEOUT_MS = 240_000;

/** What the writer needs from a transaction client. */
export type DigestTx = Pick<Prisma.TransactionClient, "$queryRaw" | "$executeRawUnsafe">;

const CATEGORIES =
  "National, International, Economy, Sci-Tech, Environment, Sports, Awards, Appointments, Schemes, Defence, Pay & Jobs";

const SYSTEM = `You are the current-affairs editor for Shishya, a free Indian government-exam prep platform. You produce a daily digest of the most exam-relevant current affairs for aspirants (UPSC, SSC, banking, railways, state PSCs, defence).

The user message gives today's date. It is the real current date: your training data ends before it, so news and search results dated after your training are real and current — never treat them as simulated or hypothetical, and never question the date.

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
      "source": "https://... the real source url this item was taken from"
    }
  ]
}

RULES: 8-12 items. Be factual and verifiable — every item must come from a real search result, with that result's URL as its source; never invent a story. Keep summaries neutral and exam-useful (names, dates, numbers, places). examTags from: UPSC, SSC, Banking, Railways, State PSC, Defence, Teaching, General.

OUTPUT: your final message is the JSON object and nothing else, always — no explanation before or after it, even when you found less than you hoped. If you could verify fewer than 8 items, return the ones you verified. If you could verify none, return {"items": []}.

PAY & JOBS (mandatory lens): every day include 1-3 items with category exactly "Pay & Jobs" — the news that motivates aspirants about the government career itself: pay-commission developments (8th CPC), DA/DR announcements, salary/allowance revisions for govt posts, and MAJOR new recruitment notifications with their vacancy counts and pay scales. Always state the concrete numbers (₹, %, vacancy counts). If a day genuinely has no fresh pay/jobs news, one item may recap the most recent still-current development (e.g. the latest DA rate) — factual, sourced, never invented.`;

/** "Tuesday, 6 October 2026" for a YYYY-MM-DD date. */
function longDate(isoDay: string): string {
  return new Date(`${isoDay}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The day before a YYYY-MM-DD date. */
function dayBefore(isoDay: string): string {
  return new Date(Date.parse(`${isoDay}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
}

/** The user turn: today's date stated as fact, and the 48-hour window. */
export function digestRequest(istDate: string): string {
  return [
    `Today is ${longDate(istDate)} in India (IST). This is the real current date.`,
    `Produce the exam-relevant current-affairs digest for ${longDate(istDate)}: news published on ${longDate(dayBefore(istDate))} or ${longDate(istDate)}. This may run early in the Indian morning, so most items may be from ${longDate(dayBefore(istDate))}; that is expected.`,
    `Search the web for the latest developments, then reply with the STRICT JSON object only.`,
  ].join("\n");
}

/** Why a reply stored nothing. */
export type ReplyFailure = "unparseable" | "too-few-items";

/** A model reply that cannot become a day: nothing was written. */
export class CurrentAffairsReplyError extends Error {
  constructor(
    readonly reason: ReplyFailure,
    message: string,
    readonly detail: { stopReason: string | null; chars: number; usable?: number; returned?: number },
  ) {
    super(message);
    this.name = "CurrentAffairsReplyError";
  }
}

/** The text the model wrote after its last search: the final answer. With
 *  web_search the reply interleaves text ("I'll search for…") with search
 *  blocks; the JSON is the last text. Falls back to all the text joined when
 *  no text follows the last search. */
export function finalReplyText(content: readonly { type: string; text?: string }[]): string {
  let lastTool = -1;
  content.forEach((b, i) => {
    if (b.type !== "text") lastTool = i;
  });
  // Joined with "": one answer split into several text blocks (citations
  // split text) must not get a newline inside a JSON string.
  const after = content.slice(lastTool + 1).filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
  if (after) return after;
  return content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n").trim();
}

function isHttpUrl(s: unknown): s is string {
  if (typeof s !== "string") return false;
  try {
    const u = new URL(s.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

const normTitle = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/** The items that may be stored: a title, a summary and an http(s) source
 *  each (an item without the URL it came from is dropped), titles unique,
 *  at most MAX_DIGEST_ITEMS. */
export function usableItems(raw: unknown): CurrentAffairItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: CurrentAffairItem[] = [];
  for (const r of raw as Partial<CurrentAffairItem>[]) {
    if (!r || typeof r !== "object") continue;
    const title = typeof r.title === "string" ? r.title.replace(/\s+/g, " ").trim() : "";
    const summary = typeof r.summary === "string" ? r.summary.trim() : "";
    if (!title || !summary || !isHttpUrl(r.source)) continue;
    const key = normTitle(title.slice(0, 300));
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      title,
      summary,
      category: typeof r.category === "string" && r.category.trim() ? r.category.trim() : "National",
      examTags: Array.isArray(r.examTags) ? r.examTags.filter((t): t is string => typeof t === "string") : [],
      whyItMatters: typeof r.whyItMatters === "string" && r.whyItMatters.trim() ? r.whyItMatters.trim() : null,
      source: (r.source as string).trim(),
    });
    if (out.length >= MAX_DIGEST_ITEMS) break;
  }
  return out;
}

/**
 * Write a day's items inside the caller's transaction, under the per-day lock
 * (the PIB backfill takes the same one), only while the day has no rows: all
 * of them or none, as the transaction commits or rolls back. Returns how many
 * were written (0 = another run wrote the day first; nothing of ours is mixed
 * into it).
 */
export async function writeDigestRows(tx: DigestTx, istDate: string, items: readonly CurrentAffairItem[]): Promise<number> {
  // The lock's own value is void; only the outer 1 is read back.
  await tx.$queryRaw`SELECT 1 AS ok FROM (SELECT pg_advisory_xact_lock(hashtext(${`current-affairs-day:${istDate}`}))) AS l`;
  const [{ n }] = await tx.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM "CurrentAffair" WHERE date = ${istDate}::date`;
  if (Number(n) > 0) return 0;
  let written = 0;
  for (const it of items) {
    written += await tx.$executeRawUnsafe(
      `INSERT INTO "CurrentAffair" (id, date, title, summary, category, "examTags", "whyItMatters", source, "generatedAt")
       VALUES (gen_random_uuid()::text, $1::date, $2, $3, $4, $5::text[], $6, $7, NOW())
       ON CONFLICT (date, title) DO NOTHING`,
      istDate,
      it.title.slice(0, 300),
      it.summary,
      it.category.slice(0, 40) || "National",
      it.examTags.slice(0, 8),
      it.whyItMatters ?? null,
      it.source ?? null,
    );
  }
  return written;
}

/** writeDigestRows in a transaction of its own (for a caller that holds none). */
export async function writeDigestDay(istDate: string, items: readonly CurrentAffairItem[]): Promise<number> {
  return prisma.$transaction((tx) => writeDigestRows(tx, istDate, items), { maxWait: 10_000, timeout: 20_000 });
}

/**
 * Generate the current-affairs digest for "now" (IST) and store it under
 * the given IST date. Returns the items written + token usage. Throws
 * CurrentAffairsReplyError (nothing written) when the reply holds no usable
 * digest. With `tx` the rows are written inside that transaction (the cron's
 * locked one); without it, in a transaction of their own. The ledger row of a
 * paid call is awaited before anything else (it never throws).
 */
export async function generateDailyCurrentAffairs(opts: {
  istDate: string; // "YYYY-MM-DD"
  tx?: DigestTx;
} ): Promise<{ items: CurrentAffairItem[]; written: number; inputTokens: number; outputTokens: number }> {
  const tools: Anthropic.Messages.Tool[] = [
    { type: "web_search_20250305", name: "web_search", max_uses: 6 } as unknown as Anthropic.Messages.Tool,
  ];
  const res = await anthropic.messages.create(
    {
      model: MODEL,
      max_tokens: 4000,
      // cache_control breakpoint: with caching enabled on the request, the
      // API caches the growing context between web_search iterations
      // instead of re-billing all of it at full price on every turn.
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      tools,
      messages: [{ role: "user", content: digestRequest(opts.istDate) }],
    },
    // One request per run: no SDK retry (a timed-out request may still be
    // billed). Timings: CA_MODEL_TIMEOUT_MS.
    { timeout: CA_MODEL_TIMEOUT_MS, maxRetries: 0 },
  );
  // Awaited, not fire-and-forget: the cron counts these rows to allow one
  // paid call per slot, so the row must land before its lock is released.
  await recordAiUsageAwaited("current-affairs", res, { model: MODEL, ref: opts.istDate });

  const text = finalReplyText(res.content as { type: string; text?: string }[]);
  const stopReason = res.stop_reason ?? null;
  // 3 Oct 2026 (fix C15): on a reply that does not parse, log why the model
  // stopped, how long the reply was and (6 Oct) how it began — the model's
  // own words say why it gave no digest — then fail (nothing is written).
  let parsed: { items?: unknown };
  try {
    parsed = parseJson<{ items?: unknown }>(text);
  } catch (err) {
    console.error("[current-affairs] reply did not parse", JSON.stringify({ stop_reason: stopReason, chars: text.length, head: text.slice(0, 300) }));
    throw new CurrentAffairsReplyError("unparseable", (err as Error).message, { stopReason, chars: text.length });
  }
  const returned = Array.isArray(parsed?.items) ? parsed.items.length : 0;
  const items = usableItems(parsed?.items);
  if (items.length < MIN_DIGEST_ITEMS) {
    console.error(
      "[current-affairs] too few usable items; nothing stored",
      JSON.stringify({ stop_reason: stopReason, returned, usable: items.length, min: MIN_DIGEST_ITEMS }),
    );
    throw new CurrentAffairsReplyError(
      "too-few-items",
      `${items.length} usable item(s) of ${returned} returned; at least ${MIN_DIGEST_ITEMS} are needed`,
      { stopReason, chars: text.length, usable: items.length, returned },
    );
  }

  const written = opts.tx ? await writeDigestRows(opts.tx, opts.istDate, items) : await writeDigestDay(opts.istDate, items);
  return { items, written, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens };
}

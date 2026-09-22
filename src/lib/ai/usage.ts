// Per-call AI usage log (6 Sep 2026).
//
// Until now no Shishya call recorded what it cost: the Anthropic console
// showed ~$20/day with no way to attribute it to a feature, so the spend
// audit had to be rebuilt from prompt sizes and activity counts. Every
// production call site now passes its response through recordAiUsage(),
// which writes one AiUsage row (feature, model, tokens, cache, web
// searches, USD). Fire-and-forget: a logging failure never fails the
// student-facing call. /admin/ai-spend reads it.

import { after } from "next/server";
import { prisma } from "@/lib/db/prisma";

/** Approximate USD per 1M tokens by tier substring; web_search billed per request.
 *  Opus row = Opus 4.8 list price (the only opus id the router can pick). */
export const PRICING: Record<string, { in: number; out: number; cacheW: number; cacheR: number }> = {
  haiku: { in: 1.0, out: 5.0, cacheW: 1.25, cacheR: 0.1 },
  sonnet: { in: 3.0, out: 15.0, cacheW: 3.75, cacheR: 0.3 },
  opus: { in: 5.0, out: 25.0, cacheW: 6.25, cacheR: 0.5 },
};
export const WEB_SEARCH_USD = 0.01;

/**
 * Message Batches API price factor (22 Sep 2026): every token of a batch
 * result — input, output, cache write, cache read — bills at 50% of the
 * list price. Callers that ledger a batch result pass { batch: true } so the
 * row carries what the batch actually cost, not the synchronous price.
 */
export const BATCH_PRICE_FACTOR = 0.5;

export interface UsageLike {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  // cache_creation_input_tokens split by TTL; a 1-hour write bills 2x base input.
  cache_creation?: { ephemeral_5m_input_tokens?: number | null; ephemeral_1h_input_tokens?: number | null } | null;
  // Server-side tools (web_search) report their request count here.
  server_tool_use?: { web_search_requests?: number | null } | null;
}

export function usageCostUsd(model: string, u: UsageLike): { cost: number; searches: number } {
  const tier = model.includes("haiku") ? "haiku" : model.includes("opus") ? "opus" : "sonnet";
  const p = PRICING[tier];
  const searches = Number(u.server_tool_use?.web_search_requests ?? 0) || 0;
  const writes = u.cache_creation_input_tokens ?? 0;
  const writes1h = Math.min(writes, Number(u.cache_creation?.ephemeral_1h_input_tokens ?? 0) || 0);
  const cost =
    (u.input_tokens / 1e6) * p.in +
    (u.output_tokens / 1e6) * p.out +
    ((writes - writes1h) / 1e6) * p.cacheW +
    (writes1h / 1e6) * p.in * 2 +
    ((u.cache_read_input_tokens ?? 0) / 1e6) * p.cacheR +
    searches * WEB_SEARCH_USD;
  return { cost, searches };
}

export interface RecordAiUsageOpts {
  ref?: string | null;
  model?: string;
  latencyMs?: number;
  /**
   * The response came back from the Message Batches API (22 Sep 2026): the
   * row's costUsd is the list price × BATCH_PRICE_FACTOR. Existing callers
   * never set it, so their rows are unchanged.
   */
  batch?: boolean;
}

/** The AiUsage row for one response, and the cost it carries. Null when there is no usage to log. */
function usageRow(feature: string, response: { usage: UsageLike; model?: string }, opts: RecordAiUsageOpts) {
  const model = opts.model ?? response.model ?? "unknown";
  const u = response.usage;
  if (!u) return null;
  const priced = usageCostUsd(model, u);
  const cost = opts.batch ? priced.cost * BATCH_PRICE_FACTOR : priced.cost;
  return {
    cost,
    data: {
      feature: feature.slice(0, 60),
      ref: opts.ref ? String(opts.ref).slice(0, 120) : null,
      model: model.slice(0, 80),
      inputTokens: u.input_tokens ?? 0,
      outputTokens: u.output_tokens ?? 0,
      cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
      cacheReadTokens: u.cache_read_input_tokens ?? 0,
      webSearches: priced.searches,
      costUsd: cost,
      latencyMs: opts.latencyMs ?? null,
    },
  };
}

function insertUsageRow(feature: string, data: NonNullable<ReturnType<typeof usageRow>>["data"]): Promise<void> {
  return prisma.aiUsage
    .create({ data })
    .then(() => undefined)
    .catch((err: unknown) => {
      console.warn(`[ai-usage] log failed for ${feature}: ${String((err as Error)?.message).slice(0, 120)}`);
    });
}

/**
 * Log one model response. Never throws, never awaited by callers (returns
 * the estimated cost synchronously for callers that keep a running total).
 */
export function recordAiUsage(
  feature: string,
  response: { usage: UsageLike; model?: string },
  opts: RecordAiUsageOpts = {},
): number {
  try {
    const row = usageRow(feature, response, opts);
    if (!row) return 0;
    const run = () => insertUsageRow(feature, row.data);
    // Inside a request/cron scope, after() keeps the Vercel function alive
    // until the insert lands (a plain fire-and-forget can be frozen with
    // the response on short routes like /api/ask). Outside a request scope
    // (tsx scripts) after() throws — fall back to fire-and-forget.
    try {
      after(run);
    } catch {
      void run();
    }
    return row.cost;
  } catch (err) {
    console.warn(`[ai-usage] skipped for ${feature}: ${String((err as Error)?.message).slice(0, 120)}`);
    return 0;
  }
}

/**
 * Same row as recordAiUsage, but resolves once the insert has landed (it
 * still never rejects). For bulk collectors (22 Sep 2026): a batch of
 * 10,000 results arrives in seconds, and 10,000 fire-and-forget inserts
 * would queue past Prisma's 10-second pool timeout and be dropped with
 * P2024, losing the ledger for the run. A collector awaits these a few at
 * a time instead.
 */
export async function recordAiUsageAwaited(
  feature: string,
  response: { usage: UsageLike; model?: string },
  opts: RecordAiUsageOpts = {},
): Promise<number> {
  try {
    const row = usageRow(feature, response, opts);
    if (!row) return 0;
    await insertUsageRow(feature, row.data);
    return row.cost;
  } catch (err) {
    console.warn(`[ai-usage] skipped for ${feature}: ${String((err as Error)?.message).slice(0, 120)}`);
    return 0;
  }
}

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

export interface UsageLike {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  // Server-side tools (web_search) report their request count here.
  server_tool_use?: { web_search_requests?: number | null } | null;
}

export function usageCostUsd(model: string, u: UsageLike): { cost: number; searches: number } {
  const tier = model.includes("haiku") ? "haiku" : model.includes("opus") ? "opus" : "sonnet";
  const p = PRICING[tier];
  const searches = Number(u.server_tool_use?.web_search_requests ?? 0) || 0;
  const cost =
    (u.input_tokens / 1e6) * p.in +
    (u.output_tokens / 1e6) * p.out +
    ((u.cache_creation_input_tokens ?? 0) / 1e6) * p.cacheW +
    ((u.cache_read_input_tokens ?? 0) / 1e6) * p.cacheR +
    searches * WEB_SEARCH_USD;
  return { cost, searches };
}

/**
 * Log one model response. Never throws, never awaited by callers (returns
 * the estimated cost synchronously for callers that keep a running total).
 */
export function recordAiUsage(
  feature: string,
  response: { usage: UsageLike; model?: string },
  opts: { ref?: string | null; model?: string; latencyMs?: number } = {},
): number {
  try {
    const model = opts.model ?? response.model ?? "unknown";
    const u = response.usage;
    if (!u) return 0;
    const { cost, searches } = usageCostUsd(model, u);
    const run = () =>
      prisma.aiUsage
        .create({
          data: {
            feature: feature.slice(0, 60),
            ref: opts.ref ? String(opts.ref).slice(0, 120) : null,
            model: model.slice(0, 80),
            inputTokens: u.input_tokens ?? 0,
            outputTokens: u.output_tokens ?? 0,
            cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
            cacheReadTokens: u.cache_read_input_tokens ?? 0,
            webSearches: searches,
            costUsd: cost,
            latencyMs: opts.latencyMs ?? null,
          },
        })
        .then(() => undefined)
        .catch((err: unknown) => {
          console.warn(`[ai-usage] log failed for ${feature}: ${String((err as Error)?.message).slice(0, 120)}`);
        });
    // Inside a request/cron scope, after() keeps the Vercel function alive
    // until the insert lands (a plain fire-and-forget can be frozen with
    // the response on short routes like /api/ask). Outside a request scope
    // (tsx scripts) after() throws — fall back to fire-and-forget.
    try {
      after(run);
    } catch {
      void run();
    }
    return cost;
  } catch (err) {
    console.warn(`[ai-usage] skipped for ${feature}: ${String((err as Error)?.message).slice(0, 120)}`);
    return 0;
  }
}

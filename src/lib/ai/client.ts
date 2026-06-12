// Shared Anthropic client + helpers.
// All AI services route through this to ensure consistent caching, logging, and config.

import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  // Don't throw at import time — let route handlers fail loudly only when invoked.
  console.warn("[shishya/ai] ANTHROPIC_API_KEY is not set. AI services will fail.");
}

export const anthropic = new Anthropic({ apiKey: apiKey ?? "" });

export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";

// Default token budgets per service. Tune as we measure real usage.
export const TOKEN_LIMITS = {
  diagnostic: 2000,
  generator: 4000,
  tutor: 2500,
  explainer: 1500,
  coach: 1500,
} as const;

/**
 * Build a system prompt block with cache_control. The first call seeds the
 * cache; subsequent calls within ~5 min are charged ~10% for these tokens.
 *
 * Strategy:
 *  - Static blocks (platform persona, exam syllabus, question bank shard) → cached
 *  - Dynamic blocks (student state, current attempt) → uncached
 */
export function cachedSystem(...blocks: string[]) {
  return blocks.map((text) => ({
    type: "text" as const,
    text,
    cache_control: { type: "ephemeral" as const },
  }));
}

/**
 * Convenience wrapper around messages.create that:
 *  - sets model + max_tokens (model defaults to the standard tier; pass
 *    `model` to route a call to a faster/stronger tier — see ai/router.ts)
 *  - records latency + cache stats for observability
 */
export async function callClaude(opts: {
  system: Anthropic.Messages.TextBlockParam[];
  messages: Anthropic.Messages.MessageParam[];
  maxTokens: number;
  model?: string;
  temperature?: number;
  tools?: Anthropic.Messages.Tool[];
  toolChoice?: Anthropic.Messages.ToolChoice;
  metadata?: Record<string, string>;
}) {
  const model = opts.model ?? MODEL;
  const start = Date.now();
  const params = {
    model,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: opts.messages,
    ...(opts.temperature != null && { temperature: opts.temperature }),
    ...(opts.tools && { tools: opts.tools }),
    ...(opts.toolChoice && { tool_choice: opts.toolChoice }),
  };
  let response: Anthropic.Messages.Message;
  try {
    response = await anthropic.messages.create(params);
  } catch (err: any) {
    // Newer models (Opus 4.8+) reject the temperature param as deprecated.
    // Strip it and retry once so callers don't need per-model knowledge.
    const msg = String(err?.message ?? "");
    if (opts.temperature != null && msg.includes("temperature") && (msg.includes("deprecated") || msg.includes("not supported"))) {
      const { temperature: _omit, ...rest } = params as any;
      response = await anthropic.messages.create(rest);
    } else {
      throw err;
    }
  }
  const latencyMs = Date.now() - start;

  return {
    response,
    stats: {
      model,
      latencyMs,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
    },
  };
}

/**
 * Parse a JSON object/array out of a Claude text response, tolerating
 * ```json fences and leading/trailing prose. Throws with a readable snippet
 * on failure so callers can retry.
 */
export function parseJson<T = unknown>(text: string): T {
  const cleaned = text
    .replace(/^[\s\S]*?```(?:json)?\s*/i, (m) => (m.includes("```") ? "" : m))
    .replace(/```[\s\S]*$/i, "")
    .trim();
  const candidate = cleaned.startsWith("{") || cleaned.startsWith("[")
    ? cleaned
    : sliceFirstJson(cleaned);
  try {
    return JSON.parse(candidate) as T;
  } catch (err) {
    throw new Error(
      `Failed to parse JSON from model output: ${(err as Error).message}\nSnippet: ${candidate.slice(0, 400)}`,
    );
  }
}

/** Grab the first balanced {...} or [...] block from a string. */
function sliceFirstJson(s: string): string {
  const startObj = s.indexOf("{");
  const startArr = s.indexOf("[");
  const start = startArr === -1 ? startObj : startObj === -1 ? startArr : Math.min(startObj, startArr);
  if (start === -1) return s;
  const open = s[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === open) depth++;
    else if (s[i] === close) {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return s.slice(start);
}

export interface CallStats {
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

/** Approximate USD pricing per 1M tokens, keyed by tier substring in the model id. */
const PRICING: Record<string, { in: number; out: number; cacheW: number; cacheR: number }> = {
  haiku: { in: 1.0, out: 5.0, cacheW: 1.25, cacheR: 0.1 },
  sonnet: { in: 3.0, out: 15.0, cacheW: 3.75, cacheR: 0.3 },
  opus: { in: 15.0, out: 75.0, cacheW: 18.75, cacheR: 1.5 },
};

/** Estimate USD cost of one call from its stats. Used for spend observability. */
export function estimateCostUsd(stats: CallStats): number {
  const tier = stats.model.includes("haiku")
    ? "haiku"
    : stats.model.includes("opus")
      ? "opus"
      : "sonnet";
  const p = PRICING[tier];
  return (
    (stats.inputTokens / 1e6) * p.in +
    (stats.outputTokens / 1e6) * p.out +
    (stats.cacheCreationTokens / 1e6) * p.cacheW +
    (stats.cacheReadTokens / 1e6) * p.cacheR
  );
}

/** Extract first text block from a Claude response. */
export function extractText(response: Anthropic.Messages.Message): string {
  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return text;
}

/** Extract first tool_use block from a Claude response, if present. */
export function extractToolUse(response: Anthropic.Messages.Message) {
  return response.content.find(
    (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
  );
}

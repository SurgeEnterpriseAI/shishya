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
 *  - sets model + max_tokens
 *  - records latency + cache stats for observability
 */
export async function callClaude(opts: {
  system: Anthropic.Messages.TextBlockParam[];
  messages: Anthropic.Messages.MessageParam[];
  maxTokens: number;
  tools?: Anthropic.Messages.Tool[];
  toolChoice?: Anthropic.Messages.ToolChoice;
  metadata?: Record<string, string>;
}) {
  const start = Date.now();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: opts.messages,
    ...(opts.tools && { tools: opts.tools }),
    ...(opts.toolChoice && { tool_choice: opts.toolChoice }),
  });
  const latencyMs = Date.now() - start;

  return {
    response,
    stats: {
      latencyMs,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
    },
  };
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

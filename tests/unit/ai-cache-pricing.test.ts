import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/server", () => ({ after: () => {} }));

import { cachedSystemHourFirst } from "@/lib/ai/client";
import { usageCostUsd } from "@/lib/ai/usage";

const SONNET = "claude-sonnet-4-5-20250929";

describe("usageCostUsd cache pricing", () => {
  it("bills 5-minute writes at 1.25x and reads at 0.1x base input", () => {
    const { cost } = usageCostUsd(SONNET, {
      input_tokens: 1_000_000,
      output_tokens: 0,
      cache_creation_input_tokens: 1_000_000,
      cache_read_input_tokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(3 + 3.75 + 0.3, 6);
  });

  it("bills the 1-hour share of cache writes at 2x base input", () => {
    const { cost } = usageCostUsd(SONNET, {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 1_500_000,
      cache_creation: { ephemeral_5m_input_tokens: 500_000, ephemeral_1h_input_tokens: 1_000_000 },
    });
    expect(cost).toBeCloseTo(0.5 * 3.75 + 1 * 6, 6);
  });

  it("never bills more 1-hour writes than the reported total", () => {
    const { cost } = usageCostUsd("claude-haiku-4-5", {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 100_000,
      cache_creation: { ephemeral_1h_input_tokens: 400_000 },
    });
    expect(cost).toBeCloseTo(0.1 * 2, 6);
  });

  it("adds web searches at $0.01 each", () => {
    const { cost, searches } = usageCostUsd(SONNET, {
      input_tokens: 0,
      output_tokens: 0,
      server_tool_use: { web_search_requests: 5 },
    });
    expect(searches).toBe(5);
    expect(cost).toBeCloseTo(0.05, 6);
  });
});

describe("cachedSystemHourFirst", () => {
  it("puts the 1-hour block ahead of every 5-minute block (the API refuses the reverse)", () => {
    const blocks = cachedSystemHourFirst("static prompt", "syllabus");
    expect(blocks.map((b) => b.text)).toEqual(["static prompt", "syllabus"]);
    expect(blocks.map((b) => (b.cache_control as { ttl?: string }).ttl ?? "5m")).toEqual(["1h", "5m"]);
  });

  it("works with the static block alone (general mode)", () => {
    const blocks = cachedSystemHourFirst("static prompt");
    expect(blocks).toHaveLength(1);
    expect((blocks[0].cache_control as { ttl?: string }).ttl).toBe("1h");
  });
});

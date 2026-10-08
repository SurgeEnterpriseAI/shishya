// Reserve credit pool (7 Oct 2026, build B4) — Ask Shishya (src/lib/ask-engine.ts).
//
// Ask's ledger label "ask" is shared by POST /api/ask (a person waiting) and
// the teacher-request-sla cron (runAsk(question), no options), so the label
// alone cannot decide: runAsk uses the reserve only with { reserve: true }.
// Pinned, on both the JSON and the streamed path:
//   1. reserve: true + an empty main balance → the same turn once on the
//      reserve key; the answer is the reserve's; the ledger row is "ask:reserve";
//   2. no option (the cron) → the main error, no reserve;
//   3. reserve: true but no key set → the main error, as before.
// The model and the DB are mocked; the index is the fixture. No network.
// Run: npx vitest run tests/unit/ai-reserve-ask.test.ts

import Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/client", () => ({
  anthropic: { messages: { create: vi.fn() } },
  MODEL: "claude-test-model",
  cachedSystem: (...blocks: string[]) => blocks.map((text) => ({ type: "text", text, cache_control: { type: "ephemeral" } })),
}));
vi.mock("@/lib/ai/usage", () => ({ recordAiUsage: vi.fn(() => 0.0125) }));
vi.mock("@/lib/db/prisma", () => ({ prisma: { $queryRaw: vi.fn(async () => []) } }));
vi.mock("@/lib/search/index-build", async () => {
  const { fixtureIndex } = await import("../fixtures/search-index-fixture");
  return { loadSearchIndex: vi.fn(async () => fixtureIndex("deep")) };
});

import { fixtureIndex } from "../fixtures/search-index-fixture";
import { anthropic } from "@/lib/ai/client";
import { recordAiUsage } from "@/lib/ai/usage";
import { reserveClient } from "@/lib/ai/reserve";
import { runAsk } from "@/lib/ask-engine";

const idx = fixtureIndex("deep");
const mainCreate = vi.mocked(anthropic.messages.create);
const QUESTION = "ssc cgl cutoff kitna gaya?";
const ANSWER = "The SSC CGL cutoff page has the marks.";
const CREDIT = "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const creditError = () => Anthropic.APIError.generate(400, { type: "error", error: { type: "invalid_request_error", message: CREDIT } }, CREDIT, {} as any);

const usage = { input_tokens: 1000, output_tokens: 200 };
const messageOf = (text: string) =>
  ({ id: "m", type: "message", role: "assistant", model: "claude-test-model", content: [{ type: "text", text, citations: null }], stop_reason: "end_turn", usage }) as never;

/** The raw events of one streamed text turn. */
async function* streamOf(text: string) {
  yield { type: "message_start", message: { id: "m", type: "message", role: "assistant", model: "claude-test-model", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1000, output_tokens: 1 } } };
  yield { type: "content_block_start", index: 0, content_block: { type: "text", text: "", citations: null } };
  yield { type: "content_block_delta", index: 0, delta: { type: "text_delta", text } };
  yield { type: "content_block_stop", index: 0 };
  yield { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 200 } };
  yield { type: "message_stop" };
}

const ENV = ["ANTHROPIC_RESERVE_API_KEY", "ANTHROPIC_API_KEY", "NEXT_RUNTIME"] as const;
const saved = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));

let reserveCreate: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env.ANTHROPIC_RESERVE_API_KEY = "sk-ant-test-reserve";
  process.env.ANTHROPIC_API_KEY = "sk-ant-test-main";
  process.env.NEXT_RUNTIME = "nodejs";
  vi.clearAllMocks();
  mainCreate.mockReset();
  mainCreate.mockImplementation((async () => {
    throw creditError();
  }) as never);
  reserveCreate = vi.spyOn(reserveClient()!.messages, "create").mockImplementation((async (body: { stream?: boolean }) =>
    body.stream ? streamOf(ANSWER) : messageOf(ANSWER)) as never);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

const labels = () => vi.mocked(recordAiUsage).mock.calls.map((c) => c[0]);

describe("runAsk and the reserve", () => {
  it("POST /api/ask (reserve: true): an empty main balance is answered from the reserve, ledgered as ask:reserve", async () => {
    const r = await runAsk(QUESTION, { index: idx, reserve: true });
    expect(r.answer).toContain(ANSWER);
    expect(mainCreate).toHaveBeenCalledTimes(1);
    expect(reserveCreate).toHaveBeenCalledTimes(1);
    expect(reserveCreate.mock.calls[0]).toEqual(mainCreate.mock.calls[0]);
    expect(labels()).toEqual(["ask:reserve"]);
  });

  it("the streamed answer too: the same words on screen, ledgered as ask:reserve", async () => {
    let text = "";
    const r = await runAsk(QUESTION, {
      index: idx,
      reserve: true,
      onEvent: (e) => {
        if (e.type === "delta") text += e.text;
        if (e.type === "reset") text = e.text;
      },
    });
    expect(r.answer).toContain(ANSWER);
    expect(text).toContain(ANSWER);
    expect(reserveCreate).toHaveBeenCalledTimes(1);
    expect((reserveCreate.mock.calls[0][0] as { stream?: boolean }).stream).toBe(true);
    expect(labels()).toEqual(["ask:reserve"]);
  });

  it("the teacher-request-sla cron (runAsk with no options) never touches the reserve", async () => {
    await expect(runAsk(QUESTION, { index: idx })).rejects.toThrow(CREDIT);
    expect(mainCreate).toHaveBeenCalledTimes(1);
    expect(reserveCreate).not.toHaveBeenCalled();
    expect(labels()).toEqual([]);
  });

  it("reserve unset: the route's call fails exactly as before", async () => {
    delete process.env.ANTHROPIC_RESERVE_API_KEY;
    await expect(runAsk(QUESTION, { index: idx, reserve: true })).rejects.toThrow(CREDIT);
    expect(reserveCreate).not.toHaveBeenCalled();
  });

  it("a working main key: the plain 'ask' row, no reserve", async () => {
    mainCreate.mockImplementation((async () => messageOf(ANSWER)) as never);
    await runAsk(QUESTION, { index: idx, reserve: true });
    expect(reserveCreate).not.toHaveBeenCalled();
    expect(labels()).toEqual(["ask"]);
  });
});

// Claude's tutor answer streams (13 Oct 2026): the turn asks for
// stream: true, shows each text piece as it arrives, runs tools between
// turns, and the pieces add up to the stored reply with the <<ACTIONS>>
// block held back. No network: messages.create is spied.
// Run: npx vitest run tests/unit/tutor-claude-stream.test.ts

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/ai/usage", () => ({ recordAiUsage: vi.fn(() => 0), usageCostUsd: () => ({ cost: 0, searches: 0 }), PRICING: {} }));
vi.mock("@/lib/ai/tools", async (orig) => ({
  ...(await orig<typeof import("@/lib/ai/tools")>()),
  executeTool: vi.fn(async () => ({ ok: true, data: { topics: [{ topic_name: "Percentage", mastery_pct: 0 }] } })),
}));

import { anthropic } from "@/lib/ai/client";
import { recordAiUsage } from "@/lib/ai/usage";
import { tutorStream } from "@/lib/ai/tutor";

afterEach(() => vi.restoreAllMocks());

/** A raw Claude event stream: text pieces, optionally a tool call, then the stop. */
function events(texts: string[], tool?: { id: string; name: string; json: string[] }) {
  const ev: any[] = [{ type: "message_start", message: { id: "m", type: "message", role: "assistant", model: "claude", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 50, output_tokens: 0 } } }];
  if (texts.length) {
    ev.push({ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } });
    for (const t of texts) ev.push({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: t } });
    ev.push({ type: "content_block_stop", index: 0 });
  }
  if (tool) {
    const i = texts.length ? 1 : 0;
    ev.push({ type: "content_block_start", index: i, content_block: { type: "tool_use", id: tool.id, name: tool.name, input: {} } });
    for (const j of tool.json) ev.push({ type: "content_block_delta", index: i, delta: { type: "input_json_delta", partial_json: j } });
    ev.push({ type: "content_block_stop", index: i });
  }
  ev.push({ type: "message_delta", delta: { stop_reason: tool ? "tool_use" : "end_turn", stop_sequence: null }, usage: { output_tokens: 20 } });
  ev.push({ type: "message_stop" });
  return { async *[Symbol.asyncIterator]() { for (const e of ev) yield e; } };
}

const input = (extra: Record<string, unknown> = {}) =>
  ({
    studentState: { userId: "u1", examCode: "SSC_CGL", examName: "SSC CGL", preferredLang: "EN", enrolledAt: "2026-09-01", weaknesses: [], strengths: [], totalMocksTaken: 0 },
    syllabus: null,
    history: [],
    userMessage: "भारत का संविधान कब लागू हुआ?",
    language: "HI",
    generalMode: true,
    ...extra,
  }) as unknown as Parameters<typeof tutorStream>[0];

describe("Claude's tutor answer streams", () => {
  it("shows pieces as they come, holds back ACTIONS, and they add up to the reply", async () => {
    const create = vi.spyOn(anthropic.messages, "create").mockImplementation((async () =>
      events(["26 जनवरी", " 1950 को।", "\n<<ACTIONS>>{\"actions\":[]}<<END>>"])) as never);
    const pieces: string[] = [];
    let done: any = null;
    for await (const c of tutorStream(input())) {
      if ("delta" in c) pieces.push(c.delta);
      if ("done" in c) done = c.done;
    }
    expect(create.mock.calls[0][0]).toMatchObject({ stream: true });
    expect(pieces.length).toBeGreaterThan(1);
    expect(pieces.join("")).toBe("26 जनवरी 1950 को।");
    expect(done.reply).toBe("26 जनवरी 1950 को।");
    expect(pieces.join("")).not.toContain("ACTIONS");
    expect(vi.mocked(recordAiUsage).mock.calls.at(-1)?.[1]).toMatchObject({ usage: { input_tokens: 50, output_tokens: 20 } });
  });

  it("runs a tool between two streamed turns and joins their text like the stored reply", async () => {
    const turns = [
      events(["Let me check."], { id: "tu1", name: "get_my_mastery", json: ["{\"lim", "it\":3}"] }),
      events(["Your weakest topic is Percentage."]),
    ];
    const create = vi.spyOn(anthropic.messages, "create").mockImplementation((async () => turns.shift()) as never);
    const pieces: string[] = [];
    const tools: any[] = [];
    let done: any = null;
    for await (const c of tutorStream(input({ ctx: { userId: "u1", examCode: "SSC_CGL" }, generalMode: false, syllabus: { examCode: "SSC_CGL", examName: "SSC CGL", examShortName: "SSC CGL", subjects: [] }, userMessage: "My weak topics?", language: "EN" }))) {
      if ("delta" in c) pieces.push(c.delta);
      if ("tool" in c) tools.push(c.tool);
      if ("done" in c) done = c.done;
    }
    expect(create).toHaveBeenCalledTimes(2);
    expect(tools.map((t) => [t.name, t.args])).toEqual([["get_my_mastery", { limit: 3 }]]);
    const second = create.mock.calls[1][0] as any;
    expect(second.messages[1].content.at(-1)).toMatchObject({ type: "tool_use", id: "tu1", input: { limit: 3 } });
    expect(second.messages[2].content[0]).toMatchObject({ type: "tool_result", tool_use_id: "tu1" });
    expect(pieces.join("")).toBe("Let me check.\nYour weakest topic is Percentage.");
    expect(done.reply).toBe(pieces.join(""));
  });

  it("a client that returns a finished message still works (passes through whole)", async () => {
    vi.spyOn(anthropic.messages, "create").mockImplementation((async () => ({
      id: "m", type: "message", role: "assistant", model: "claude", stop_reason: "end_turn", stop_sequence: null,
      content: [{ type: "text", text: "A whole answer." }], usage: { input_tokens: 1, output_tokens: 1 },
    })) as never);
    let text = "";
    for await (const c of tutorStream(input())) if ("delta" in c) text += c.delta;
    expect(text).toBe("A whole answer.");
  });
});

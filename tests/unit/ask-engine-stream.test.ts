// Ask Shishya's engine, streamed (26 Sep 2026, founder: "yes show them word
// by word") — src/lib/ask-engine.ts runAsk with opts.onEvent.
//
// Pinned, with a scripted raw event stream in place of the model:
//   1. the streamed path returns the SAME result as the non-streamed path for
//      the same model output (answer, pages, next, web sources, turns, tools);
//   2. only user-facing words are streamed: a tool_use turn's narration never
//      shows, words written before a tool call are reset, words before a web
//      search never show, and the deltas add up to the final raw text;
//   3. status lines: the question, the prefetched page, each tool (named from
//      the index once its input is complete), the web search, later turns;
//   4. the raw events are accumulated right where the installed SDK (0.40)
//      is not: a tool's and a web search's input from input_json_delta (sent
//      back on tool_use / pause_turn), usage merged from message_delta
//      (AiUsage per turn, as the JSON path), empty text blocks not sent back;
//   5. abort: the request's signal stops the stream, runAsk rejects, and the
//      aborted turn's known usage is still ledgered (ref "aborted");
//   6. Class 1-7 never streams or calls the model; no onEvent → no stream.
// The model, the DB and the usage ledger are mocked; the resolver and the
// index are real (tests/fixtures/search-index-fixture.ts). No network.
// Run: npx vitest run tests/unit/ask-engine-stream.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

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

import Anthropic from "@anthropic-ai/sdk";
import { fixtureIndex } from "../fixtures/search-index-fixture";
import { anthropic } from "@/lib/ai/client";
import { recordAiUsage } from "@/lib/ai/usage";
import { createTurnAccumulator, finalText, runAsk, toolStatus, visibleTurnText } from "@/lib/ask-engine";
import type { AskStreamEvent } from "@/lib/ask-stream";

const idx = fixtureIndex("deep");
const create = vi.mocked(anthropic.messages.create);

// ── A scripted model ───────────────────────────────────────────────────

type Block =
  | { type: "text"; text: string; citations?: unknown[] }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "server_tool_use"; id: string; name: string; input: unknown }
  | { type: "web_search_tool_result"; tool_use_id: string; content: unknown };
interface Turn {
  blocks: Block[];
  stop: string;
  usage?: Record<string, unknown>;
}

const START_USAGE = { input_tokens: 1000, output_tokens: 1, cache_read_input_tokens: 800, cache_creation_input_tokens: 0 };
const END_USAGE = { output_tokens: 200 };

/** The raw events the streaming API sends for one turn: words split small, tool inputs as JSON pieces. */
function eventsOf(t: Turn): any[] {
  const ev: any[] = [
    { type: "message_start", message: { id: "m", type: "message", role: "assistant", model: "claude-test-model", content: [], stop_reason: null, stop_sequence: null, usage: { ...START_USAGE } } },
  ];
  t.blocks.forEach((b, index) => {
    if (b.type === "text") {
      ev.push({ type: "content_block_start", index, content_block: { type: "text", text: "", citations: null } });
      for (const c of b.citations ?? []) ev.push({ type: "content_block_delta", index, delta: { type: "citations_delta", citation: c } });
      for (const piece of b.text.match(/\S+\s*|\s+/g) ?? []) ev.push({ type: "content_block_delta", index, delta: { type: "text_delta", text: piece } });
    } else if (b.type === "tool_use" || b.type === "server_tool_use") {
      ev.push({ type: "content_block_start", index, content_block: { type: b.type, id: b.id, name: b.name, input: {} } });
      const json = JSON.stringify(b.input);
      const cut = Math.floor(json.length / 2);
      ev.push({ type: "content_block_delta", index, delta: { type: "input_json_delta", partial_json: json.slice(0, cut) } });
      ev.push({ type: "content_block_delta", index, delta: { type: "input_json_delta", partial_json: json.slice(cut) } });
    } else {
      ev.push({ type: "content_block_start", index, content_block: b });
    }
    ev.push({ type: "content_block_stop", index });
  });
  ev.push({ type: "message_delta", delta: { stop_reason: t.stop, stop_sequence: null }, usage: t.usage ?? END_USAGE });
  ev.push({ type: "message_stop" });
  return ev;
}

/** The same turn as messages.create returns it. */
const messageOf = (t: Turn) =>
  ({
    id: "m",
    type: "message",
    role: "assistant",
    model: "claude-test-model",
    content: t.blocks.map((b) => (b.type === "text" ? { ...b, citations: b.citations ?? null } : b)),
    stop_reason: t.stop,
    usage: { ...START_USAGE, ...(t.usage ?? END_USAGE) },
  }) as never;

async function* streamOf(events: any[]) {
  for (const e of events) yield e;
}

/** Scripts the model: streamed calls get raw events, plain calls get the Message. */
function script(turns: Turn[]) {
  let i = 0;
  create.mockImplementation((async (body: { stream?: boolean }) => {
    const t = turns[Math.min(i++, turns.length - 1)];
    return body.stream ? streamOf(eventsOf(t)) : messageOf(t);
  }) as never);
}

function sink() {
  const events: AskStreamEvent[] = [];
  let text = "";
  const onEvent = (e: AskStreamEvent) => {
    events.push(e);
    if (e.type === "delta") text += e.text;
    if (e.type === "reset") text = e.text;
  };
  return { events, onEvent, text: () => text, statuses: () => events.filter((e) => e.type === "status") };
}

const FINAL =
  "The **SSC CGL cutoff** page has the marks.\n\n📌 Pages on Shishya for this:\n- [Cutoff](https://shishya.in/exams/SSC_CGL/cutoff) — marks\n➡️ Open next: [Cutoff](https://shishya.in/exams/SSC_CGL/cutoff)";
const TWO_TURNS: Turn[] = [
  { blocks: [{ type: "text", text: "Let me look that up." }, { type: "tool_use", id: "t1", name: "get_exam_details", input: { code: "SSC_CGL" } }], stop: "tool_use" },
  { blocks: [{ type: "text", text: FINAL }], stop: "end_turn" },
];

beforeEach(() => {
  vi.clearAllMocks();
  create.mockReset();
});

// ── 1-3. Same result, only the answer's words, status lines ────────────

describe("runAsk with onEvent", () => {
  it("returns exactly what the non-streamed path returns for the same model output", async () => {
    script(TWO_TURNS);
    const plain = await runAsk("ssc cgl cutoff kitna gaya?", { index: idx });
    expect(create.mock.calls.every((c) => !(c[0] as { stream?: boolean }).stream)).toBe(true);
    create.mockReset();
    script(TWO_TURNS);
    const s = sink();
    const streamed = await runAsk("ssc cgl cutoff kitna gaya?", { index: idx, onEvent: s.onEvent });
    expect(create.mock.calls.every((c) => (c[0] as { stream?: boolean }).stream === true)).toBe(true);
    const pick = (r: typeof plain) => ({ answer: r.answer, pages: r.pages, links: r.links, next: r.next, webSources: r.webSources, usedWeb: r.usedWeb, toolsUsed: r.toolsUsed, turns: r.turns, costUsd: r.costUsd });
    expect(pick(streamed)).toEqual(pick(plain));
    expect(streamed.next?.url).toBe("/exams/SSC_CGL/cutoff");
  });

  it("streams only the answer: the tool turn's narration never shows; the words add up to the final text", async () => {
    script(TWO_TURNS);
    const s = sink();
    await runAsk("ssc cgl cutoff kitna gaya?", { index: idx, onEvent: s.onEvent });
    const deltas = s.events.filter((e) => e.type === "delta");
    expect(deltas.length).toBeGreaterThan(10); // word by word, not one lump
    expect(s.events.some((e) => e.type === "reset")).toBe(false);
    expect(s.events.some((e) => e.type === "delta" && /Let me/.test(e.text))).toBe(false);
    expect(s.text()).toBe(finalText([{ type: "text", text: FINAL }]));
  });

  it("status lines: the question, the prefetched page, the tool named from the index, then the next turn", async () => {
    script(TWO_TURNS);
    const s = sink();
    await runAsk("ssc cgl cutoff kitna gaya?", { index: idx, onEvent: s.onEvent });
    const st = s.statuses() as Extract<AskStreamEvent, { type: "status" }>[];
    expect(st[0]).toEqual({ type: "status", key: "question" });
    const exam = idx.docs.find((d) => d.path === "/exams/SSC_CGL")!.title;
    expect(st).toContainEqual({ type: "status", key: "page", subject: exam });
    expect(st.at(-1)).toEqual({ type: "status", key: "thinking" });
    // Every status precedes the first word.
    const firstDelta = s.events.findIndex((e) => e.type === "delta");
    expect(s.events.slice(firstDelta).some((e) => e.type === "status")).toBe(false);
  });

  it("the tool input streamed as JSON pieces reaches the tool, and goes back in the assistant turn", async () => {
    script([
      { blocks: [{ type: "tool_use", id: "t1", name: "find_pages", input: { query: "ssc cgl cutoff" } }], stop: "tool_use" },
      { blocks: [{ type: "text", text: FINAL }], stop: "end_turn" },
    ]);
    const s = sink();
    await runAsk("ssc cgl cutoff kitna gaya?", { index: idx, onEvent: s.onEvent });
    const second = (create.mock.calls[1] as unknown as [Record<string, any>])[0];
    expect(second.messages[1]).toEqual({ role: "assistant", content: [{ type: "tool_use", id: "t1", name: "find_pages", input: { query: "ssc cgl cutoff" } }] });
    expect(second.messages[2].content[0]).toMatchObject({ type: "tool_result", tool_use_id: "t1" });
    expect(second.messages[2].content[0].content).toContain("https://shishya.in/exams/SSC_CGL/cutoff");
    expect(s.statuses()).toContainEqual({ type: "status", key: "pages" });
  });

  it("words written before a tool call in the same turn are reset; the answer then streams alone", async () => {
    script([
      { blocks: [{ type: "text", text: "Shishya has a page on this exam." }, { type: "tool_use", id: "t1", name: "find_pages", input: { query: "x" } }], stop: "tool_use" },
      { blocks: [{ type: "text", text: FINAL }], stop: "end_turn" },
    ]);
    const s = sink();
    const r = await runAsk("ssc cgl cutoff kitna gaya?", { index: idx, onEvent: s.onEvent });
    const resetAt = s.events.findIndex((e) => e.type === "reset");
    expect(resetAt).toBeGreaterThan(0);
    expect(s.events[resetAt]).toEqual({ type: "reset", text: "" });
    expect(s.text()).toBe(FINAL);
    expect(r.answer).toContain("SSC CGL cutoff");
  });

  it("web search: the narration before it never shows, the search query goes back on pause_turn, usage comes from message_delta", async () => {
    const result = { type: "web_search_tool_result", tool_use_id: "s1", content: [{ type: "web_search_result", url: "https://indianrailways.gov.in/rrb-je", title: "RRB JE" }] } as const;
    const answerBlocks: Block[] = [
      { type: "text", text: "Shishya does not track RRB JE yet. " },
      { type: "text", text: "The board lists the JE notice", citations: [{ type: "web_search_result_location", url: "https://indianrailways.gov.in/rrb-je", title: "RRB JE notice", cited_text: "…" }] },
      { type: "text", text: ".\n\n📌 Pages on Shishya for this:\n- [RRB NTPC](https://shishya.in/exams/RRB_NTPC)\n➡️ Open next: [RRB NTPC](https://shishya.in/exams/RRB_NTPC)" },
    ];
    script([
      {
        blocks: [{ type: "text", text: "Let me search the web for this." }, { type: "server_tool_use", id: "s1", name: "web_search", input: { query: "rrb je 2026 notification" } }, result],
        stop: "pause_turn",
        usage: { output_tokens: 90, input_tokens: 1500, server_tool_use: { web_search_requests: 1 } },
      },
      { blocks: answerBlocks, stop: "end_turn" },
    ]);
    const s = sink();
    const r = await runAsk("rrb je", { index: idx, onEvent: s.onEvent });
    expect(s.statuses()).toContainEqual({ type: "status", key: "web" });
    expect(s.events.some((e) => (e.type === "delta" || e.type === "reset") && /Let me search/.test(e.text))).toBe(false);
    // The paused turn goes back with the search query it ran (the SDK's own stream helper would send {}).
    const second = (create.mock.calls[1] as unknown as [Record<string, any>])[0];
    const back = second.messages[1];
    expect(back.role).toBe("assistant");
    expect(back.content.find((b: { type: string }) => b.type === "server_tool_use")).toMatchObject({ id: "s1", input: { query: "rrb je 2026 notification" } });
    expect(back.content.find((b: { type: string }) => b.type === "web_search_tool_result")).toEqual(result);
    // AiUsage: one row per turn, the paused turn's usage merged from message_delta.
    const rows = vi.mocked(recordAiUsage).mock.calls;
    expect(rows).toHaveLength(2);
    expect(rows[0][0]).toBe("ask");
    expect((rows[0][1] as unknown as { usage: Record<string, unknown> }).usage).toMatchObject({ input_tokens: 1500, output_tokens: 90, cache_read_input_tokens: 800, server_tool_use: { web_search_requests: 1 } });
    expect(typeof (rows[0][2] as { latencyMs?: number }).latencyMs).toBe("number");
    expect(r.usedWeb).toBe(true);
    expect(r.answer.startsWith("Shishya does not track RRB JE yet. The board lists the JE notice.")).toBe(true);
    // The words on screen add up to the raw final text, cited fragments joined as written.
    expect(s.text()).toBe(finalText(answerBlocks));
    expect(r.webSources).toEqual([{ title: "RRB JE notice", url: "https://indianrailways.gov.in/rrb-je", official: true, source: "Indian Railways" }]);
  });

  it("the last turn may not call tools, and the canned line comes back when every turn called one", async () => {
    script([{ blocks: [{ type: "tool_use", id: "t", name: "find_pages", input: { query: "x" } }], stop: "tool_use" }]);
    const s = sink();
    const r = await runAsk("ssc cgl syllabus in detail please", { index: idx, onEvent: s.onEvent });
    expect(create).toHaveBeenCalledTimes(5);
    expect((create.mock.calls[4] as unknown as [Record<string, any>])[0].tool_choice).toEqual({ type: "none" });
    expect(r.answer).toMatch(/more digging than expected/);
    expect(s.events.some((e) => e.type === "delta")).toBe(false);
  });
});

// ── 4. Accumulation details ────────────────────────────────────────────

describe("createTurnAccumulator", () => {
  it("builds the Message; the stream's own objects are never shared or double-applied", () => {
    const acc = createTurnAccumulator();
    const events = eventsOf({ blocks: [{ type: "text", text: "Hello world" }, { type: "tool_use", id: "t", name: "page_facts", input: { url: "https://shishya.in/exams/SSC_CGL" } }], stop: "tool_use" });
    for (const e of events) acc.push(e);
    // An SDK that mutates the same event objects afterwards changes nothing here.
    (events[1].content_block as { text: string }).text = "MUTATED";
    const m = acc.message()!;
    expect(m.content[0]).toMatchObject({ type: "text", text: "Hello world" });
    expect(m.content[1]).toMatchObject({ type: "tool_use", input: { url: "https://shishya.in/exams/SSC_CGL" } });
    expect(m.stop_reason).toBe("tool_use");
    expect(m.usage).toMatchObject({ input_tokens: 1000, output_tokens: 200 });
    expect(visibleTurnText(m.content)).toBe("");
  });

  it("a cut-off tool input keeps {}; events before message_start are ignored", () => {
    const acc = createTurnAccumulator();
    acc.push({ type: "content_block_start", index: 0, content_block: { type: "text", text: "x" } });
    expect(acc.message()).toBeNull();
    acc.push(eventsOf({ blocks: [], stop: "end_turn" })[0]);
    acc.push({ type: "content_block_start", index: 0, content_block: { type: "tool_use", id: "t", name: "find_pages", input: {} } });
    acc.push({ type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: '{"query": "ss' } });
    acc.push({ type: "content_block_stop", index: 0 });
    expect(acc.message()!.content[0]).toMatchObject({ input: {} });
  });

  it("toolStatus names pages and exams from the index only", () => {
    const exam = idx.docs.find((d) => d.path === "/exams/SSC_CGL")!.title;
    expect(toolStatus("get_exam_details", { code: "ssc_cgl" }, idx)).toEqual({ type: "status", key: "page", subject: exam });
    expect(toolStatus("exam_page_facts", { code: "SSC_CGL" }, idx)).toEqual({ type: "status", key: "examPages", subject: exam });
    expect(toolStatus("get_exam_details", { code: "NOT_AN_EXAM" }, idx)).toEqual({ type: "status", key: "exams" });
    expect(toolStatus("page_facts", { url: "https://shishya.in/exams/SSC_CGL/cutoff" }, idx)).toEqual({ type: "status", key: "page", subject: `${exam} · Cutoff` });
    expect(toolStatus("page_facts", { url: "https://shishya.in/scholarships/nmmss" }, idx)).toMatchObject({ key: "page", subject: idx.docs.find((d) => d.path === "/scholarships/nmmss")!.title });
    expect(toolStatus("page_facts", { url: "https://evil.example/<script>" }, idx)).toEqual({ type: "status", key: "pages" });
    expect(toolStatus("search_content", { query: "anything the person typed" }, idx)).toEqual({ type: "status", key: "guides" });
    expect(toolStatus("get_vacancy_stats", {}, idx).key).toBe("vacancies");
    expect(toolStatus("search_topics", {}, idx).key).toBe("topics");
    expect(toolStatus("search_exams", { keyword: "daroga" }, idx)).toEqual({ type: "status", key: "exams" });
  });
});

// ── 5-6. Abort, Class 1-7, no sink ─────────────────────────────────────

describe("abort and the paths that never stream", () => {
  // 26 Sep 2026 (fixer): the REAL SDK (0.40.1) over a fake fetch, not a generator that throws on
  // abort. The SDK's Stream catches an AbortError and just ENDS the iteration (streaming.js) — the
  // earlier mock threw, so the test passed while production resolved runAsk with half an answer.
  function realSdk(events: any[], opts: { close?: boolean } = {}) {
    const enc = new TextEncoder();
    const fakeFetch = async (_url: unknown, init: { signal?: AbortSignal | null } = {}) => {
      const body = new ReadableStream<Uint8Array>({
        start(c) {
          for (const e of events) c.enqueue(enc.encode(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`));
          if (opts.close) return c.close(); // the body ends after these events
          // What undici / node-fetch do to the body when the request's signal aborts.
          const fail = () => {
            try {
              c.error(new DOMException("This operation was aborted", "AbortError"));
            } catch {
              /* already closed */
            }
          };
          if (init.signal?.aborted) fail();
          else init.signal?.addEventListener("abort", fail, { once: true });
        },
      });
      return new Response(body, { status: 200, headers: { "content-type": "text/event-stream", "request-id": "req_test" } });
    };
    const client = new Anthropic({ apiKey: "sk-ant-test", fetch: fakeFetch as never, maxRetries: 0 });
    create.mockImplementationOnce(((body: unknown, reqOpts: unknown) => client.messages.create(body as never, reqOpts as never)) as never);
  }

  it("Stop / a closed tab mid-answer (real SDK: the stream just ends): runAsk rejects, the known usage is ledgered once as 'aborted'", async () => {
    const ctrl = new AbortController();
    realSdk(eventsOf({ blocks: [{ type: "text", text: "The SSC CGL cutoff was high this year." }], stop: "end_turn" }).slice(0, 4));
    const s = sink();
    const p = runAsk("ssc cgl cutoff kitna gaya?", {
      index: idx,
      signal: ctrl.signal,
      onEvent: (e) => {
        s.onEvent(e);
        if (e.type === "delta") ctrl.abort();
      },
    });
    await expect(p).rejects.toThrow(/abort/i);
    expect(create).toHaveBeenCalledTimes(1);
    expect((create.mock.calls[0] as unknown as [unknown, { signal: AbortSignal }])[1].signal).toBe(ctrl.signal);
    expect(s.events.some((e) => e.type === "delta")).toBe(true);
    const rows = vi.mocked(recordAiUsage).mock.calls;
    expect(rows).toHaveLength(1);
    expect(rows[0][2]).toMatchObject({ ref: "aborted" });
    expect((rows[0][1] as unknown as { usage: Record<string, unknown> }).usage).toMatchObject({ input_tokens: 1000 });
  });

  it("a body that ends before message_delta is not an answer: runAsk rejects, usage ledgered as 'aborted'", async () => {
    realSdk(eventsOf({ blocks: [{ type: "text", text: "The SSC CGL cutoff was high this year." }], stop: "end_turn" }).slice(0, 5), { close: true });
    await expect(runAsk("ssc cgl cutoff kitna gaya?", { index: idx, onEvent: () => {} })).rejects.toThrow(/ended before message_stop/);
    const rows = vi.mocked(recordAiUsage).mock.calls;
    expect(rows).toHaveLength(1);
    expect(rows[0][2]).toMatchObject({ ref: "aborted" });
  });

  it("the real SDK path still answers a complete stream (the same fake fetch, all events)", async () => {
    realSdk(eventsOf({ blocks: [{ type: "text", text: FINAL }], stop: "end_turn" }), { close: true });
    const s = sink();
    const r = await runAsk("ssc cgl cutoff kitna gaya?", { index: idx, onEvent: s.onEvent });
    expect(r.next?.url).toBe("/exams/SSC_CGL/cutoff");
    expect(s.text()).toBe(FINAL);
    expect(vi.mocked(recordAiUsage).mock.calls.map((c) => (c[2] as { ref?: string }).ref)).toEqual([undefined]);
  });

  it("Class 1-7: no model call and no events, streamed or not", async () => {
    const s = sink();
    const r = await runAsk("class 5 maths", { index: idx, onEvent: s.onEvent });
    expect(create).not.toHaveBeenCalled();
    expect(s.events).toEqual([]);
    expect(r.notice).toBe("no-ai-young-class");
  });

  it("a sink that throws never breaks the answer", async () => {
    script(TWO_TURNS);
    const r = await runAsk("ssc cgl cutoff kitna gaya?", {
      index: idx,
      onEvent: () => {
        throw new Error("reader gone");
      },
    });
    expect(r.next?.url).toBe("/exams/SSC_CGL/cutoff");
  });

  it("empty text blocks are not sent back (the API refuses them)", async () => {
    script([
      { blocks: [{ type: "text", text: "" }, { type: "tool_use", id: "t1", name: "find_pages", input: { query: "q" } }], stop: "tool_use" },
      { blocks: [{ type: "text", text: FINAL }], stop: "end_turn" },
    ]);
    await runAsk("ssc cgl cutoff kitna gaya?", { index: idx, onEvent: () => {} });
    const second = (create.mock.calls[1] as unknown as [Record<string, any>])[0];
    expect(second.messages[1].content.map((b: { type: string }) => b.type)).toEqual(["tool_use"]);
  });
});

describe("study only, for every caller (26 Sep 2026, fixer)", () => {
  it("an off-topic question never reaches the model: one study-only line and real section pages", async () => {
    for (const onEvent of [undefined, () => {}]) {
      create.mockReset();
      const r = await runAsk("tell me a joke", { index: idx, onEvent });
      expect(create).not.toHaveBeenCalled();
      expect(r).toMatchObject({ notice: "off-topic", usedWeb: false, turns: 0, costUsd: 0, webSources: [] });
      expect(r.answer).toMatch(/^I'm Shishya's AI, and I answer study questions only/);
      expect(r.next?.url).toBe("/exams/browse");
    }
  });

  it("distress (the teacher-request cron calls runAsk(question) with no options): the helplines, no pages, no model", async () => {
    const r = await runAsk("[Student preparing for SSC_CGL] i want to kill myself");
    expect(create).not.toHaveBeenCalled();
    expect(r.notice).toBe("distress");
    expect(r.answer).toContain("14416");
    expect(r.answer).toContain("1098");
    expect(r.pages).toEqual([]);
    expect(r.next).toBeNull();
  });
});

describe("official sources (26 Sep 2026, fixer — founder: keep as many official sources as possible)", () => {
  const cite = (url: string, title: string) => ({ type: "web_search_result_location", url, title, cited_text: "…" });

  it("every official source is kept, first, on the wide list (CISCE on cisce.org); only other sites fill up to 6", async () => {
    const others = Array.from({ length: 7 }, (_, i) => `https://aggregator-${i}.example.com/icse`);
    const officialUrl = "https://cisce.org/icse-2027-dates";
    const all = [...others.slice(0, 6), officialUrl, others[6]];
    const blocks: Block[] = [
      { type: "server_tool_use", id: "s1", name: "web_search", input: { query: "icse 2027 date sheet" } },
      { type: "web_search_tool_result", tool_use_id: "s1", content: all.map((url) => ({ type: "web_search_result", url, title: url })) },
      ...all.map((url, i): Block => ({ type: "text", text: `Fact ${i}.`, citations: [cite(url, `Source ${i}`)] })),
      { type: "text", text: "\n\n📌 Pages on Shishya for this:\n- [SSC CGL](https://shishya.in/exams/SSC_CGL)\n➡️ Open next: [SSC CGL](https://shishya.in/exams/SSC_CGL)" },
    ];
    script([{ blocks, stop: "end_turn" }]);
    const r = await runAsk("icse 2027 date sheet", { index: idx });
    expect(r.webSources[0]).toMatchObject({ url: officialUrl, official: true, source: "CISCE" });
    expect(r.webSources).toHaveLength(6);
    expect(r.webSources.slice(1).every((w) => (w as { official?: boolean }).official === false)).toBe(true);
  });

  it("a link the model labels 'Official — …' on a site that is not official is relabelled 'Other source — <site>'; a real official one keeps its label", async () => {
    const agg = "https://www.sarkariresult.com/ssc/cgl";
    const off = "https://ssc.gov.in/notice";
    script([
      {
        blocks: [
          { type: "server_tool_use", id: "s1", name: "web_search", input: { query: "ssc cgl 2026" } },
          { type: "web_search_tool_result", tool_use_id: "s1", content: [agg, off].map((url) => ({ type: "web_search_result", url, title: url })) },
          {
            type: "text",
            text: `Shishya has no page on this yet.\n\n🌐 From the web (tentative — verify before acting):\n- [Official — Staff Selection Commission](${off}) lists the notice.\n- [Official — Staff Selection Commission](${agg}) reports the date.\n\n📌 Pages on Shishya for this:\n- [SSC CGL](https://shishya.in/exams/SSC_CGL)\n➡️ Open next: [SSC CGL](https://shishya.in/exams/SSC_CGL)`,
          },
        ],
        stop: "end_turn",
      },
    ]);
    const r = await runAsk("ssc cgl 2026 notice", { index: idx });
    expect(r.answer).toContain(`[Official — Staff Selection Commission](${off})`);
    expect(r.answer).toContain(`[Other source — sarkariresult.com](${agg})`);
    expect(r.answer).not.toContain(`[Official — Staff Selection Commission](${agg})`);
    expect(r.webSources).toEqual([
      { title: "Official — Staff Selection Commission", url: off, official: true, source: "Staff Selection Commission (SSC)" },
      { title: "Other source — sarkariresult.com", url: agg, official: false, source: "sarkariresult.com" },
    ]);
  });
});

describe("a distress reply (26 Sep 2026 founder decision)", () => {
  const HELP = "You are not alone. Please talk to a parent or a teacher you trust right now.\n\nTele-MANAS **14416** (free, 24 hours). Childline **1098**. In an emergency, **112**.";

  it("gets no study pages appended and no Open next, streamed or not", async () => {
    for (const onEvent of [undefined, () => {}]) {
      create.mockReset();
      script([{ blocks: [{ type: "text", text: HELP }], stop: "end_turn" }]);
      const r = await runAsk("ssc cgl cutoff kitna gaya?", { index: idx, onEvent });
      expect(r.answer).toBe(HELP);
      expect(r.answer).not.toContain("📌");
      expect(r.pages).toEqual([]);
      expect(r.next).toBeNull();
    }
  });

  it("an exam-stress answer that names its own pages keeps them", async () => {
    script([
      {
        blocks: [
          {
            type: "text",
            text: "Boards feel big — plan one chapter a day. If it feels too heavy, Tele-MANAS 14416 is free.\n\n📌 Pages on Shishya for this:\n- [Cutoff](https://shishya.in/exams/SSC_CGL/cutoff) — marks\n➡️ Open next: [Cutoff](https://shishya.in/exams/SSC_CGL/cutoff)",
          },
        ],
        stop: "end_turn",
      },
    ]);
    const r = await runAsk("ssc cgl cutoff kitna gaya?", { index: idx });
    expect(r.pages.map((p) => p.url)).toEqual(["/exams/SSC_CGL/cutoff"]);
    expect(r.next?.url).toBe("/exams/SSC_CGL/cutoff");
  });
});

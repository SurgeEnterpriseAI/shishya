// Local model route (12 Oct 2026): English, tool-free calls of a listed
// feature try Surge's own server; every Indian-language call stays on
// Claude; any local failure falls back to Claude. No network: fetch is stubbed.
// Run: npx vitest run tests/unit/ai-local-llm.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sys = (text: string) => [{ type: "text" as const, text }];
const user = (content: string) => [{ role: "user" as const, content }];

async function load(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import("../../src/lib/ai/local-llm");
}

const BULK_ENV = { LOCAL_LLM_URL: "https://surgeai.example.ts.net/v1/", LOCAL_LLM_KEY: "k", LOCAL_LLM_FEATURES: "explain, tutor-anon" };
const ON = { LOCAL_LLM_URL: "https://surgeai.example.ts.net/v1/", LOCAL_LLM_KEY: "k", LOCAL_LLM_FEATURES: "explain, tutor-anon" };

beforeEach(() => vi.unstubAllEnvs());
afterEach(() => vi.unstubAllGlobals());

describe("isEnglishOnly", () => {
  it("accepts plain English with an English reply line", async () => {
    const m = await load(ON);
    expect(m.isEnglishOnly(sys("Persona"), user("What is Article 21?\nReply language: EN"))).toBe(true);
  });
  it("rejects any Indian-language script", async () => {
    const m = await load(ON);
    expect(m.isEnglishOnly(sys("Persona"), user("अनुच्छेद 21 क्या है?"))).toBe(false);
    expect(m.isEnglishOnly(sys("Persona"), user("ఆర్టికల్ 21 అంటే ఏమిటి?"))).toBe(false);
  });
  it("ignores Indian script inside Shishya's own system prompt", async () => {
    const m = await load(ON);
    const persona = sys('Site map: /exams/{CODE}/topics/{TOPIC}/hi — "हिंदी में पढ़ें"');
    expect(m.isEnglishOnly(persona, user("What is Article 21?"))).toBe(true);
    expect(m.isEnglishOnly(sys("Persona\nReply language: TE"), user("What is Article 21?"))).toBe(false);
  });
  it("rejects a non-English reply language even when the text is Latin", async () => {
    const m = await load(ON);
    expect(m.isEnglishOnly(sys("Persona"), user("Article 21 kya hai?\nReply language: HI"))).toBe(false);
  });
  it("rejects tool and image blocks", async () => {
    const m = await load(ON);
    const msgs = [{ role: "user" as const, content: [{ type: "tool_result" as const, tool_use_id: "t", content: "{}" }] }];
    expect(m.isEnglishOnly(sys("Persona"), msgs)).toBe(false);
  });
});

describe("localEligible", () => {
  it("needs the URL, the key and a listed feature", async () => {
    const req = { system: sys("Persona"), messages: user("Hi") };
    expect((await load({})).localEligible("explain", req)).toBe(false);
    const m = await load(ON);
    expect(m.localEligible("explain", req)).toBe(true);
    expect(m.localEligible("tutor-anon", req)).toBe(true);
    expect(m.localEligible("tutor", req)).toBe(false);
    expect(m.localEligible(undefined, req)).toBe(false);
  });
  it("never takes a call that carries tools", async () => {
    const m = await load(ON);
    expect(m.localEligible("explain", { system: sys("P"), messages: user("Hi"), tools: [] })).toBe(false);
  });
});

describe("localFirst", () => {
  const req = { system: sys("Persona"), messages: user("What is Article 21?"), maxTokens: 100 };
  const claudeMsg = { content: [{ type: "text", text: "from claude" }], model: "claude", usage: { input_tokens: 1, output_tokens: 1 } } as any;

  it("serves from the local server and shapes the reply like a Claude message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "x", choices: [{ message: { content: "Right to life." }, finish_reason: "stop" }], usage: { prompt_tokens: 9, completion_tokens: 4 },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const m = await load(ON);
    const claude = vi.fn().mockResolvedValue(claudeMsg);
    const { value, local } = await m.localFirst("explain", req, claude);
    expect(local).toBe(true);
    expect(claude).not.toHaveBeenCalled();
    expect(value.model).toBe("local:qwen3.5-9b");
    expect((value.content[0] as any).text).toBe("Right to life.");
    expect(value.usage.output_tokens).toBe(4);
    expect(fetchMock.mock.calls[0][0]).toBe("https://surgeai.example.ts.net/v1/chat/completions");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages[0]).toEqual({ role: "system", content: "Persona" });
    expect(body.chat_template_kwargs).toEqual({ enable_thinking: false });
  });

  it("falls back to Claude when the server is down, errors or replies empty", async () => {
    for (const f of [
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
      vi.fn().mockResolvedValue(new Response("busy", { status: 503 })),
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "  " } }] }), { status: 200 })),
    ]) {
      vi.stubGlobal("fetch", f);
      const m = await load(ON);
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const claude = vi.fn().mockResolvedValue(claudeMsg);
      const { value, local } = await m.localFirst("explain", req, claude);
      expect(local).toBe(false);
      expect(value).toBe(claudeMsg);
    }
  });

  it("goes straight to Claude for a Hindi question", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const m = await load(ON);
    const claude = vi.fn().mockResolvedValue(claudeMsg);
    const { local } = await m.localFirst("explain", { ...req, messages: user("अनुच्छेद 21 क्या है?") }, claude);
    expect(local).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("cost", () => {
  it("prices a local call at zero", async () => {
    const { usageCostUsd } = await import("../../src/lib/ai/usage");
    expect(usageCostUsd("local:qwen3.5-9b", { input_tokens: 5000, output_tokens: 800 }).cost).toBe(0);
  });
});

describe("bulk route (12 Oct 2026)", () => {
  const BULK = { ...ON, LOCAL_LLM_BULK_URL: "https://surgeai.example.ts.net/bulk/v1", LOCAL_LLM_BULK_FEATURES: "bank-solve,daily-brief" };
  const ok = () => vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "ok" }, finish_reason: "stop" }] }), { status: 200 }));
  const req = { system: sys("Persona"), messages: user("Solve: 2+2"), maxTokens: 50 };
  const claudeMsg = { content: [{ type: "text", text: "claude" }], model: "claude", usage: { input_tokens: 1, output_tokens: 1 } } as any;

  it("sends a bulk feature to the bulk server and a live feature to the live server", async () => {
    const f = ok(); vi.stubGlobal("fetch", f);
    const m = await load(BULK);
    await m.localFirst("bank-solve", req, vi.fn());
    await m.localFirst("explain", req, vi.fn());
    expect(f.mock.calls[0][0]).toBe("https://surgeai.example.ts.net/bulk/v1/chat/completions");
    expect(f.mock.calls[1][0]).toBe("https://surgeai.example.ts.net/v1/chat/completions");
  });

  it("keeps an unlisted bulk feature (bank-verify) on Claude", async () => {
    const f = ok(); vi.stubGlobal("fetch", f);
    const m = await load(BULK);
    const claude = vi.fn().mockResolvedValue(claudeMsg);
    const { local } = await m.localFirst("bank-verify", req, claude);
    expect(local).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it("falls back to the live server address when no bulk URL is set", async () => {
    const f = ok(); vi.stubGlobal("fetch", f);
    const m = await load({ ...ON, LOCAL_LLM_BULK_FEATURES: "daily-brief" });
    await m.localFirst("daily-brief", req, vi.fn());
    expect(f.mock.calls[0][0]).toBe("https://surgeai.example.ts.net/v1/chat/completions");
  });

  it("createLocalFirst takes a string system prompt and labels the ledger model", async () => {
    const f = ok(); vi.stubGlobal("fetch", f);
    const m = await load(BULK);
    const client = { messages: { create: vi.fn() } } as any;
    const r = await m.createLocalFirst("daily-brief", client, { model: "claude-x", max_tokens: 50, system: "Brief writer", messages: user("Write a note") });
    expect(client.messages.create).not.toHaveBeenCalled();
    expect(JSON.parse(f.mock.calls[0][1].body).messages[0]).toEqual({ role: "system", content: "Brief writer" });
    expect(m.ledgerModel(r, "claude-x")).toBe("local:qwen3.5-9b");
    expect(m.ledgerModel({ model: "claude-sonnet" }, "claude-x")).toBe("claude-x");
  });
});

describe("streaming (12 Oct 2026)", () => {
  const sse = (frames: string[]) =>
    new Response(new ReadableStream({
      start(c) {
        const enc = new TextEncoder();
        for (const f of frames) c.enqueue(enc.encode(f));
        c.close();
      },
    }), { status: 200 });
  const piece = (t: string) => `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`;

  it("ReplyStreamFilter shows the reply as it arrives and never the ACTIONS block", async () => {
    const { ReplyStreamFilter } = await load(ON);
    const f = new ReplyStreamFilter();
    const raw = ["\n  Article", " 32 gives", " the right.\n\n<<ACT", "IONS>>{\"actions\":[]}<<END>>"];
    const shown = raw.map((p) => f.push(p)).join("");
    expect(shown).toBe("Article 32 gives the right.");
    expect(f.finish("Article 32 gives the right.")).toBe("");
  });

  it("ReplyStreamFilter holds a '<' that turns out to be ordinary text, then shows it", async () => {
    const { ReplyStreamFilter } = await load(ON);
    const f = new ReplyStreamFilter();
    expect(f.push("x <")).toBe("x");
    expect(f.push(" y")).toBe(" < y");
    expect(f.finish("x < y")).toBe("");
  });

  it("streamLocal yields pieces then usage, from split SSE frames", async () => {
    const usage = `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 7, completion_tokens: 3 } })}\n\n`;
    const frames = [piece("Art"), piece("icle").slice(0, 10), piece("icle").slice(10), piece(" 32"), usage, "data: [DONE]\n\n"];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(sse(frames)));
    const m = await load(ON);
    const out: any[] = [];
    for await (const ev of m.streamLocal({ system: sys("P"), messages: user("Q"), maxTokens: 50 }, { url: "https://x/v1", timeoutMs: 5000 })) out.push(ev);
    expect(out.filter((e) => "delta" in e).map((e) => e.delta).join("")).toBe("Article 32");
    expect(out.at(-1)).toEqual({ usage: { input_tokens: 7, output_tokens: 3 } });
    const body = JSON.parse((fetch as any).mock.calls[0][1].body);
    expect(body.stream).toBe(true);
  });

  it("streamLocal throws on a server error so the tutor can fall back", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("busy", { status: 503 })));
    const m = await load(ON);
    const it = m.streamLocal({ system: sys("P"), messages: user("Q"), maxTokens: 50 }, { url: "https://x/v1", timeoutMs: 5000 });
    await expect(it.next()).rejects.toThrow(/503/);
  });

  it("localRouteFor gives the route only for an eligible call", async () => {
    const m = await load(BULK_ENV);
    expect(m.localRouteFor("tutor-anon", { system: sys("P"), messages: user("Hi") })?.url).toBe("https://surgeai.example.ts.net/v1");
    expect(m.localRouteFor("tutor-anon", { system: sys("P"), messages: user("नमस्ते") })).toBeNull();
    expect(m.localRouteFor("tutor", { system: sys("P"), messages: user("Hi"), tools: [] })).toBeNull();
  });
});

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

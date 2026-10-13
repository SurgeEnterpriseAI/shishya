// Local route acceptance check (13 Oct 2026): a feature can reject a reply
// from Surge's own server (the quality guards from the 12-13 Oct Qwen-vs-
// Claude audit); a rejected reply runs the Claude path once, and a call
// without a check behaves exactly as before. No network: fetch is stubbed.
// Run: npx vitest run tests/unit/local-llm-accept.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("@/lib/ai/usage", () => ({
  recordAiUsage: vi.fn(() => 0),
  PRICING: {
    haiku: { in: 1, out: 5, cacheW: 1.25, cacheR: 0.1 },
    sonnet: { in: 3, out: 15, cacheW: 3.75, cacheR: 0.3 },
    opus: { in: 5, out: 25, cacheW: 6.25, cacheR: 0.5 },
  },
}));

const ON = { LOCAL_LLM_URL: "https://surgeai.example.ts.net/v1/", LOCAL_LLM_KEY: "k", LOCAL_LLM_FEATURES: "explain" };
const sys = (text: string) => [{ type: "text" as const, text }];
const user = (content: string) => [{ role: "user" as const, content }];
const req = { system: sys("Persona"), messages: user("Why is B right?"), maxTokens: 100 };
const claudeMsg = { content: [{ type: "text", text: "from claude" }], model: "claude", usage: { input_tokens: 1, output_tokens: 1 } } as any;
// A fresh Response per call: a body can be read once.
const localReply = (text: string) =>
  vi.fn().mockImplementation(async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: text }, finish_reason: "stop" }], usage: { prompt_tokens: 5, completion_tokens: 3 } }), { status: 200 }),
  );

async function load() {
  vi.resetModules();
  for (const [k, v] of Object.entries(ON)) vi.stubEnv(k, v);
  return import("../../src/lib/ai/local-llm");
}

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.unstubAllEnvs();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("localFirst with an acceptance check", () => {
  it("serves an accepted local reply and never calls Claude", async () => {
    vi.stubGlobal("fetch", localReply("good"));
    const m = await load();
    const claude = vi.fn().mockResolvedValue(claudeMsg);
    const accept = vi.fn().mockReturnValue(null);
    const { value, local } = await m.localFirst("explain", req, claude, accept);
    expect(local).toBe(true);
    expect((value.content[0] as any).text).toBe("good");
    expect(accept).toHaveBeenCalledTimes(1);
    expect((accept.mock.calls[0][0] as any).model).toBe("local:qwen3.5-9b");
    expect(claude).not.toHaveBeenCalled();
  });

  it("runs Claude once when the check rejects the local reply, and logs one line", async () => {
    vi.stubGlobal("fetch", localReply('{"keyDisputed": true}'));
    const m = await load();
    const claude = vi.fn().mockResolvedValue(claudeMsg);
    const { value, local } = await m.localFirst("explain", req, claude, () => "key disputed");
    expect(local).toBe(false);
    expect(value).toBe(claudeMsg);
    expect(claude).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toBe("[local-llm] explain: rejected (key disputed), Claude");
  });

  it("a check that throws counts as a local failure: Claude once", async () => {
    vi.stubGlobal("fetch", localReply("x"));
    const m = await load();
    const claude = vi.fn().mockResolvedValue(claudeMsg);
    const { local } = await m.localFirst("explain", req, claude, () => {
      throw new Error("bad check");
    });
    expect(local).toBe(false);
    expect(claude).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("fell back to Claude (bad check)");
  });

  it("without a check nothing changes: the local reply is served as before", async () => {
    vi.stubGlobal("fetch", localReply('{"keyDisputed": true}'));
    const m = await load();
    const claude = vi.fn().mockResolvedValue(claudeMsg);
    const { local } = await m.localFirst("explain", req, claude);
    expect(local).toBe(true);
    expect(claude).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("is never applied to Claude's reply (unlisted feature or server down)", async () => {
    const accept = vi.fn().mockReturnValue("always rejects");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const m = await load();
    const claude = vi.fn().mockResolvedValue(claudeMsg);
    expect((await m.localFirst("explain", req, claude, accept)).value).toBe(claudeMsg);
    expect((await m.localFirst("tutor", req, claude, accept)).value).toBe(claudeMsg);
    expect(accept).not.toHaveBeenCalled();
    expect(claude).toHaveBeenCalledTimes(2);
  });
});

describe("createLocalFirst threads acceptLocal", () => {
  it("rejected local reply → client.messages.create once; accepted → never", async () => {
    vi.stubGlobal("fetch", localReply("local text"));
    const m = await load();
    const params = { model: "claude-x", max_tokens: 50, system: "Writer", messages: user("Write") };
    const rejecting = { messages: { create: vi.fn().mockResolvedValue(claudeMsg) } } as any;
    expect(await m.createLocalFirst("explain", rejecting, params, { acceptLocal: () => "no" })).toBe(claudeMsg);
    expect(rejecting.messages.create).toHaveBeenCalledTimes(1);
    const accepting = { messages: { create: vi.fn() } } as any;
    const r = await m.createLocalFirst("explain", accepting, params, { acceptLocal: () => null });
    expect((r.content[0] as any).text).toBe("local text");
    expect(accepting.messages.create).not.toHaveBeenCalled();
  });
});

describe("callClaude threads acceptLocal", () => {
  async function loadClient() {
    vi.resetModules();
    for (const [k, v] of Object.entries(ON)) vi.stubEnv(k, v);
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-main");
    return import("../../src/lib/ai/client");
  }
  const opts = { feature: "explain", system: sys("Persona"), messages: user("Why is B right?"), maxTokens: 100 };

  it("a rejected local reply is answered by Claude, once, and booked on Claude's model", async () => {
    vi.stubGlobal("fetch", localReply('{"keyDisputed": true}'));
    const c = await loadClient();
    const create = vi.spyOn(c.anthropic.messages, "create").mockResolvedValue(claudeMsg as never);
    const { response, stats } = await c.callClaude({ ...opts, acceptLocal: () => "key disputed" });
    expect(response).toBe(claudeMsg);
    expect(create).toHaveBeenCalledTimes(1);
    expect(stats.model).toBe(c.MODEL);
    // The check never reaches the API request body.
    expect(Object.keys(create.mock.calls[0][0] as object)).not.toContain("acceptLocal");
  });

  it("an accepted local reply is served with no Claude call", async () => {
    vi.stubGlobal("fetch", localReply("fine"));
    const c = await loadClient();
    const create = vi.spyOn(c.anthropic.messages, "create");
    const { response, stats } = await c.callClaude({ ...opts, acceptLocal: () => null });
    expect((response.content[0] as any).text).toBe("fine");
    expect(stats.model).toBe("local:qwen3.5-9b");
    expect(create).not.toHaveBeenCalled();
  });
});

// Server-down breaker (14 Oct 2026): when Surge's server cannot be reached,
// every local route is skipped for a while so Claude answers at once instead
// of after a 25-120 s timeout. No network: fetch is stubbed.
// Run: npx vitest run tests/unit/local-llm-breaker.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sys = (text: string) => [{ type: "text" as const, text }];
const user = (content: string) => [{ role: "user" as const, content }];
const req = { system: sys("Persona"), messages: user("What is Article 21?"), maxTokens: 50 };

const ON = {
  LOCAL_LLM_URL: "https://surgeai.example.ts.net/v1",
  LOCAL_LLM_KEY: "k",
  LOCAL_LLM_FEATURES: "explain",
  LOCAL_LLM_BULK_FEATURES: "coach-day",
  LOCAL_LLM_RESEARCH_FEATURES: "akr-check",
};

async function load(env: Record<string, string> = ON) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import("../../src/lib/ai/local-llm");
}

const unreachable = () => Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });
const okReply = () =>
  new Response(JSON.stringify({ choices: [{ message: { content: "Article 21 protects life." }, finish_reason: "stop" }], usage: {} }), { status: 200 });
const claudeMsg = { content: [{ type: "text", text: "from Claude" }] } as any;

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-14T06:10:00Z"));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("isUnreachable", () => {
  it("counts network errors, timeouts and gateway statuses, not bad requests", async () => {
    const m = await load();
    expect(m.isUnreachable(unreachable())).toBe(true);
    expect(m.isUnreachable(Object.assign(new Error("timed out"), { name: "TimeoutError" }))).toBe(true);
    expect(m.isUnreachable(new Error("local-llm: no first token in time"))).toBe(true);
    expect(m.isUnreachable(new Error("local-llm 503: Service Unavailable"))).toBe(true);
    expect(m.isUnreachable(new Error("local-llm 400: maximum context length"))).toBe(false);
    expect(m.isUnreachable(new Error("local-llm: empty reply"))).toBe(false);
    expect(m.isUnreachable(null)).toBe(false);
  });
});

describe("the breaker", () => {
  it("an unreachable server turns every local route off, so the next call goes straight to Claude", async () => {
    const m = await load();
    const fetchMock = vi.fn().mockRejectedValue(unreachable());
    vi.stubGlobal("fetch", fetchMock);
    const first = await m.localFirst("explain", req, async () => claudeMsg);
    expect(first.local).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(m.localServerDown()).toBe(true);
    expect(m.localRouteFor("explain", req)).toBeNull();
    expect(m.localEligible("coach-day", req)).toBe(false);
    const second = await m.localFirst("explain", req, async () => claudeMsg);
    expect(second.local).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no second wait on the dead server
  });

  it("probes again after a minute, and a reply resets it", async () => {
    const m = await load();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(unreachable()));
    await m.localFirst("explain", req, async () => claudeMsg);
    expect(m.localServerDown()).toBe(true);
    vi.setSystemTime(new Date("2026-10-14T06:11:01Z"));
    expect(m.localServerDown()).toBe(false);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okReply()));
    const r = await m.localFirst("explain", req, async () => claudeMsg);
    expect(r.local).toBe(true);
    expect(m.localServerDown()).toBe(false);
  });

  it("doubles the pause on each further miss, up to 10 minutes", async () => {
    const m = await load();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(unreachable()));
    const t0 = Date.parse("2026-10-14T06:10:00Z");
    await m.localFirst("explain", req, async () => claudeMsg); // 1 min
    vi.setSystemTime(t0 + 61_000);
    await m.localFirst("explain", req, async () => claudeMsg); // 2 min
    expect(m.localServerDown(t0 + 61_000 + 119_000)).toBe(true);
    expect(m.localServerDown(t0 + 61_000 + 121_000)).toBe(false);
    let now = t0 + 61_000 + 121_000;
    for (let i = 0; i < 6; i++) {
      vi.setSystemTime(now);
      await m.localFirst("explain", req, async () => claudeMsg);
      now += 11 * 60_000;
    }
    const last = now - 11 * 60_000;
    expect(m.localServerDown(last + 9 * 60_000)).toBe(true);
    expect(m.localServerDown(last + 10 * 60_000 + 1)).toBe(false);
  });

  it("a 502/503/504 from the Funnel trips it; a 400 (bad request) does not", async () => {
    const m = await load();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad", { status: 400 })));
    await m.localFirst("explain", req, async () => claudeMsg);
    expect(m.localServerDown()).toBe(false);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("gone", { status: 502 })));
    await m.localFirst("explain", req, async () => claudeMsg);
    expect(m.localServerDown()).toBe(true);
  });

  it("the web-research route is off while the server is down", async () => {
    const m = await load();
    const r = await import("../../src/lib/ai/local-research");
    expect(r.localResearchOn("akr-check")).toBe(true);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(unreachable()));
    await m.localFirst("explain", req, async () => claudeMsg);
    expect(r.localResearchOn("akr-check")).toBe(false);
  });
});

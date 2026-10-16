// Server-down breaker (14 Oct 2026): when Surge's server cannot be reached,
// every local route is skipped for a while so Claude answers at once instead
// of after a 25-120 s timeout; a slow but healthy server must NOT trip it.
// No network: fetch is stubbed per URL.
// Run: npx vitest run tests/unit/local-llm-breaker.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sys = (text: string) => [{ type: "text" as const, text }];
const user = (content: string) => [{ role: "user" as const, content }];
const req = { system: sys("Persona"), messages: user("What is Article 21?"), maxTokens: 50 };

const BASE = "https://surgeai.example.ts.net/v1";
const ON = {
  LOCAL_LLM_URL: BASE,
  LOCAL_LLM_KEY: "k",
  LOCAL_LLM_FEATURES: "explain",
  LOCAL_LLM_BULK_FEATURES: "coach-day",
  LOCAL_LLM_RESEARCH_FEATURES: "akr-check",
  LOCAL_LLM_NETWORK_RETRY_MS: "0",
};

async function load(env: Record<string, string> = ON) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import("../../src/lib/ai/local-llm");
}

const netError = () => Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });
const timeout = () => Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
const okReply = () =>
  new Response(JSON.stringify({ choices: [{ message: { content: "Article 21 protects life." }, finish_reason: "stop" }], usage: {} }), { status: 200 });
const models = () => new Response(JSON.stringify({ data: [{ id: "qwen3.8-27b" }] }), { status: 200 });
const claudeMsg = { content: [{ type: "text", text: "from Claude" }] } as any;
const claude = async () => claudeMsg;

/** fetch stub: chat completions and /models answered separately. */
function server(chat: () => Promise<Response>, modelsCheck: () => Promise<Response>) {
  const calls = { chat: 0, models: 0 };
  const fn = vi.fn(async (url: string) => {
    if (String(url).endsWith("/models")) {
      calls.models++;
      return modelsCheck();
    }
    calls.chat++;
    return chat();
  });
  vi.stubGlobal("fetch", fn);
  return calls;
}
const flush = () => new Promise((r) => setImmediate(r));

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-14T06:10:00Z"));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("error classes", () => {
  it("a network error is proof; a timeout is not; a bad request is neither", async () => {
    const m = await load();
    expect(m.isNetworkError(netError())).toBe(true);
    expect(m.isNetworkError(timeout())).toBe(false);
    expect(m.isLocalTimeout(timeout())).toBe(true);
    expect(m.isLocalTimeout(new Error("local-llm: no first token in time"))).toBe(true);
    expect(m.isLocalTimeout(new Error("local-llm 400: maximum context length"))).toBe(false);
    expect(m.isNetworkError(Object.assign(new Error("aborted"), { name: "AbortError" }))).toBe(false);
    expect(m.isLocalTimeout(Object.assign(new Error("aborted"), { name: "AbortError" }))).toBe(false);
  });
});

describe("the breaker", () => {
  it("a network error turns every local route off, so the next call goes straight to Claude", async () => {
    const m = await load();
    const calls = server(() => Promise.reject(netError()), () => Promise.reject(netError()));
    expect((await m.localFirst("explain", req, claude)).local).toBe(false);
    expect(m.localServerDown()).toBe(true);
    expect(m.localRouteFor("explain", req)).toBeNull();
    expect(m.localEligible("coach-day", req)).toBe(false);
    expect((await m.localFirst("explain", req, claude)).local).toBe(false);
    expect(calls.chat).toBe(2); // the first call and its one retry; no wait at all on the second call
  });

  it("a slow but healthy answer (timeout) does not trip it: the quick check finds the server", async () => {
    const m = await load();
    const calls = server(() => Promise.reject(timeout()), () => Promise.resolve(models()));
    expect((await m.localFirst("explain", req, claude)).local).toBe(false);
    await flush();
    expect(calls.models).toBe(1);
    expect(m.localServerDown()).toBe(false);
    expect(m.localRouteFor("explain", req)).not.toBeNull();
  });

  it("a timeout whose quick check also fails trips it", async () => {
    const m = await load();
    server(() => Promise.reject(timeout()), () => Promise.reject(timeout()));
    await m.localFirst("explain", req, claude);
    await flush();
    expect(m.localServerDown()).toBe(true);
  });

  it("several requests failing in the same outage count once (1-minute pause, not 10)", async () => {
    const m = await load();
    server(() => Promise.reject(netError()), () => Promise.reject(netError()));
    const started = Date.now();
    const routes = [1, 2, 3, 4, 5].map(() => m.localRouteFor("explain", req)!);
    vi.setSystemTime(started + 2_000);
    await Promise.all(routes.map((r) => m.callLocal(req, r).catch(() => null)));
    expect(m.localServerDown(started + 2_000 + 59_000)).toBe(true);
    expect(m.localServerDown(started + 2_000 + 61_000)).toBe(true); // half-open: a check, not a student, decides
  });

  it("after the pause one quick check decides; students never probe", async () => {
    const m = await load();
    let up = false;
    let release: (r: Response) => void = () => {};
    const pendingCheck = new Promise<Response>((r) => (release = r));
    const calls = server(
      () => (up ? Promise.resolve(okReply()) : Promise.reject(netError())),
      () => (up ? pendingCheck : Promise.reject(netError())),
    );
    await m.localFirst("explain", req, claude);
    vi.setSystemTime(new Date("2026-10-14T06:11:05Z"));
    up = true;
    const chatBefore = calls.chat;
    // While the one check is still out, every student goes to Claude.
    for (let i = 0; i < 8; i++) expect((await m.localFirst("explain", req, claude)).local).toBe(false);
    expect(calls.chat).toBe(chatBefore); // no student request went to the server
    expect(calls.models).toBe(1); // one check, not eight
    release(models());
    await flush();
    expect(m.localServerDown()).toBe(false);
    expect((await m.localFirst("explain", req, claude)).local).toBe(true);
  });

  it("doubles the pause on each failed check, up to 10 minutes", async () => {
    const m = await load();
    server(() => Promise.reject(netError()), () => Promise.reject(netError()));
    const t0 = Date.parse("2026-10-14T06:10:00Z");
    await m.localFirst("explain", req, claude); // open: 1 min
    let now = t0;
    let pause = 60_000;
    for (let i = 0; i < 6; i++) {
      now += pause + 1_000;
      vi.setSystemTime(now);
      m.localServerDown(); // starts the check
      await flush();
      pause = Math.min(pause * 2, 10 * 60_000);
      expect(m.localServerDown(now + pause - 1_000)).toBe(true);
    }
    expect(pause).toBe(10 * 60_000);
  });

  it("a 502/503/504 from the model server trips it; a 400 (bad request) does not", async () => {
    const m = await load();
    server(() => Promise.resolve(new Response("bad", { status: 400 })), () => Promise.resolve(models()));
    await m.localFirst("explain", req, claude);
    expect(m.localServerDown()).toBe(false);
    server(() => Promise.resolve(new Response("gone", { status: 502 })), () => Promise.resolve(models()));
    await m.localFirst("explain", req, claude);
    expect(m.localServerDown()).toBe(true);
  });

  it("a tools-gateway failure (one government page) never touches the model route", async () => {
    const m = await load();
    const r = await import("../../src/lib/ai/local-research");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "upstream timeout" }), { status: 502 })));
    await expect(r.fetchPage("https://ssc.gov.in/x.pdf")).rejects.toThrow(/502/);
    expect(m.localServerDown()).toBe(false);
    expect(r.localResearchOn("akr-check")).toBe(true);
  });

  it("the web-research route is off while the model server is down", async () => {
    const m = await load();
    const r = await import("../../src/lib/ai/local-research");
    expect(r.localResearchOn("akr-check")).toBe(true);
    server(() => Promise.reject(netError()), () => Promise.reject(netError()));
    await m.localFirst("explain", req, claude);
    expect(r.localResearchOn("akr-check")).toBe(false);
  });
});

describe("a check frozen by the platform does not hold the breaker open (14 Oct 2026)", () => {
  it("a check older than twice its timeout is dropped and a fresh one runs", async () => {
    const m = await load();
    // 1st chat call fails at the network → breaker opens.
    let frozen = true;
    const calls = server(
      async () => {
        throw netError();
      },
      () => (frozen ? new Promise<Response>(() => {}) : Promise.resolve(models())), // the first check never settles
    );
    await m.localFirst("explain", req as any, claude).catch(() => null);
    expect(m.localServerDown()).toBe(true);
    // Pause over → a check starts and hangs (as a frozen background promise would).
    vi.setSystemTime(new Date(Date.now() + 61_000));
    expect(m.localServerDown()).toBe(true);
    await flush();
    expect(calls.models).toBe(1);
    // Later the server is back; the stale check must not block a new one.
    frozen = false;
    vi.setSystemTime(new Date(Date.now() + 15_000));
    m.localServerDown();
    await flush();
    await flush();
    expect(calls.models).toBe(2);
    expect(m.localServerDown()).toBe(false);
  });
});

describe("one network blip is retried before Claude (16 Oct 2026)", () => {
  it("a single fetch failure, then a reply: served locally, breaker stays closed", async () => {
    const m = await load();
    let n = 0;
    const calls = server(async () => (n++ === 0 ? Promise.reject(netError()) : okReply()), async () => models());
    const out = await m.localFirst("explain", req, claude);
    expect(out.local).toBe(true);
    expect(calls.chat).toBe(2);
    expect(m.localServerDown()).toBe(false);
  });
  it("two failures in a row: Claude answers and the breaker opens", async () => {
    const m = await load();
    const calls = server(async () => Promise.reject(netError()), async () => models());
    const out = await m.localFirst("explain", req, claude);
    expect(out.local).toBe(false);
    expect(calls.chat).toBe(2);
    expect(m.localServerDown()).toBe(true);
  });
});

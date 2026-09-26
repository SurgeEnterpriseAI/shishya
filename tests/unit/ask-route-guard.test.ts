// POST /api/ask guard order (26 Sep 2026) — src/app/api/ask/route.ts and
// src/lib/search/ask-guard.ts as tests.
//
// Pinned: a signed-out bot never reaches the rate limiter, the index or the
// model (the chat route's 24 Sep rule); the rate limit comes before the body
// and the model; a Class 1-7 school question gets pages and no model call; a
// normal question hands runAsk the server's own resolution and the request's
// abort signal; the analytics row carries the client verdict and the anon id.
// Auth, rate limit, analytics and the engine are mocked; the resolver runs for
// real over the committed fixture index. No DB, no network, no model.
// Run: npx vitest run tests/unit/ask-route-guard.test.ts

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({ ok: true, limit: 15, remaining: 14, reset: Date.now() + 3_600_000 })),
  rateLimited: vi.fn(
    () => new Response(JSON.stringify({ error: "RATE_LIMITED", message: "Too many requests. Slow down." }), { status: 429, headers: { "retry-after": "60" } }),
  ),
}));
vi.mock("@/lib/analytics", () => ({ recordEvent: vi.fn(async () => undefined) }));
vi.mock("@/lib/ask-engine", () => ({ runAsk: vi.fn() }));
vi.mock("@/lib/search/index-build", async () => {
  const { fixtureIndex } = await import("../fixtures/search-index-fixture");
  return { loadSearchIndex: vi.fn(async () => fixtureIndex("deep")) };
});

import { POST } from "@/app/api/ask/route";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordEvent } from "@/lib/analytics";
import { runAsk } from "@/lib/ask-engine";
import { loadSearchIndex } from "@/lib/search/index-build";

const BROWSER = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

function req(body: unknown, ua: string | null = BROWSER, cookie = "shishya_anon=anon-123; other=x") {
  const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": "203.0.113.9, 10.0.0.1", cookie };
  if (ua !== null) headers["user-agent"] = ua;
  return new Request("https://shishya.in/api/ask", { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });
}

const ANSWER = {
  answer: "Answer.\n\n➡️ Open next: [SSC CGL · Cutoff](https://shishya.in/exams/SSC_CGL/cutoff)",
  usedWeb: false,
  toolsUsed: ["find_pages"],
  pages: [{ url: "/exams/SSC_CGL/cutoff", label: "SSC CGL · Cutoff", section: "government" }],
  links: [{ url: "/exams/SSC_CGL/cutoff", label: "SSC CGL · Cutoff", section: "government" }],
  next: { url: "/exams/SSC_CGL/cutoff", label: "SSC CGL · Cutoff", section: "government" },
  webSources: [],
  turns: 2,
  latencyMs: 4321,
  costUsd: 0.03,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue(null as never);
  vi.mocked(runAsk).mockResolvedValue(ANSWER as never);
});

describe("crawlers never reach the model", () => {
  it("signed-out + bot user-agent → 403 before the rate limit, the index and the model", async () => {
    const res = await POST(req({ question: "ssc cgl salary" }, GOOGLEBOT));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "BOT" });
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(loadSearchIndex).not.toHaveBeenCalled();
    expect(runAsk).not.toHaveBeenCalled();
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it("an empty or stub user-agent counts as a bot", async () => {
    expect((await POST(req({ question: "ssc cgl salary" }, null))).status).toBe(403);
    expect((await POST(req({ question: "ssc cgl salary" }, "curl/8.4"))).status).toBe(403);
    expect(runAsk).not.toHaveBeenCalled();
  });

  it("a signed-in student is never judged by their user-agent", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never);
    const res = await POST(req({ question: "what is the salary of an ssc cgl inspector?" }, GOOGLEBOT));
    expect(res.status).toBe(200);
    expect(checkRateLimit).toHaveBeenCalledWith("ask", "u1");
    expect(runAsk).toHaveBeenCalledTimes(1);
  });
});

describe("order: rate limit, body, resolver, model", () => {
  it("rate-limited → 429 with retry-after, no model call", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ ok: false, limit: 15, remaining: 0, reset: Date.now() + 60_000 } as never);
    const res = await POST(req({ question: "ssc cgl salary" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
    expect(checkRateLimit).toHaveBeenCalledWith("ask", "anon:203.0.113.9");
    expect(runAsk).not.toHaveBeenCalled();
  });

  it("a bad body → 400, no model call", async () => {
    expect((await POST(req({ question: "a" }))).status).toBe(400);
    expect((await POST(req("not json"))).status).toBe(400);
    expect((await POST(req({ question: "x".repeat(801) }))).status).toBe(400);
    expect(runAsk).not.toHaveBeenCalled();
  });

  it("Class 1-7 → pages only: 200, answer null, notice, no model call", async () => {
    const res = await POST(req({ question: "class 5 maths", via: "strip" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.answer).toBeNull();
    expect(body.notice).toBe("no-ai-young-class");
    expect(body.pages.length).toBeGreaterThan(0);
    expect(body.pages[0].url).toMatch(/^\/schooling\/cbse\/class-5/);
    expect(body.next).toEqual(body.pages[0]);
    expect(runAsk).not.toHaveBeenCalled();
    expect(vi.mocked(recordEvent).mock.calls[0][0]).toMatchObject({ client: "browser", anonId: "anon-123", props: { surface: "ask", notice: "no-ai-young-class" } });
  });

  it("a normal question: runAsk gets the server's resolution, the index, the locale, via and the abort signal", async () => {
    const r = req({ question: "  what is the salary of an ssc cgl inspector?  ", via: "strip", locale: "hi" });
    const res = await POST(r);
    expect(res.status).toBe(200);
    const [q, opts] = vi.mocked(runAsk).mock.calls[0];
    expect(q).toBe("what is the salary of an ssc cgl inspector?");
    expect(opts?.resolution?.q).toBe("what is the salary of an ssc cgl inspector?");
    expect(opts?.index).toBeTruthy();
    expect(opts).toMatchObject({ locale: "hi", via: "strip" });
    expect(opts?.signal).toBeInstanceOf(AbortSignal);
    const body = await res.json();
    expect(body).toMatchObject({ answer: ANSWER.answer, usedWeb: false, pages: ANSWER.pages, links: ANSWER.pages, next: ANSWER.next, webSources: [] });
    expect(body.toolsUsed).toBeUndefined();
  });

  it("the analytics row carries client, anon id, turns and latency (and no anon id once signed in)", async () => {
    await POST(req({ question: "ssc cgl salary", via: "button" }));
    expect(vi.mocked(recordEvent).mock.calls[0][0]).toMatchObject({
      kind: "CTA_CLICKED",
      userId: null,
      anonId: "anon-123",
      client: "browser",
      path: "/ask",
      props: { surface: "ask", via: "button", turns: 2, latencyMs: 4321, tools: "find_pages", webFallback: false, q: "ssc cgl salary" },
    });
    vi.mocked(auth).mockResolvedValue({ user: { id: "u2" } } as never);
    await POST(req({ question: "ssc cgl salary" }));
    expect(vi.mocked(recordEvent).mock.calls[1][0]).toMatchObject({ userId: "u2", anonId: null });
  });

  it("an engine failure → 502", async () => {
    vi.mocked(runAsk).mockRejectedValueOnce(new Error("boom"));
    const res = await POST(req({ question: "ssc cgl salary" }));
    expect(res.status).toBe(502);
  });
});

describe("source order", () => {
  const ROOT = process.cwd();
  it("ask-guard: the bot check sits before the rate limit", () => {
    const src = fs.readFileSync(path.join(ROOT, "src/lib/search/ask-guard.ts"), "utf8");
    const bot = src.indexOf('client === "bot"');
    const rl = src.indexOf("checkRateLimit(");
    expect(bot).toBeGreaterThan(0);
    expect(bot).toBeLessThan(rl);
  });
  it("route: the guard comes before the body, the resolver and the model; Class 1-7 returns before runAsk", () => {
    const src = fs.readFileSync(path.join(ROOT, "src/app/api/ask/route.ts"), "utf8");
    const at = (s: string) => src.indexOf(s);
    expect(at("await askGuard(req)")).toBeGreaterThan(0);
    expect(at("await askGuard(req)")).toBeLessThan(at("Body.safeParse"));
    expect(at("Body.safeParse")).toBeLessThan(at("resolveQuery(question"));
    expect(at('schoolScope === "class1to7"')).toBeLessThan(at("await runAsk("));
  });
  it("/ask no longer auto-fires the model on load: the old client is only an alias", () => {
    const src = fs.readFileSync(path.join(ROOT, "src/app/ask/AskClient.tsx"), "utf8");
    expect(src).not.toMatch(/fetch\(|useEffect/);
  });
});

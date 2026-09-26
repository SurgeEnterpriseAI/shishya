// POST /api/ask as a stream (26 Sep 2026, founder: "yes show them word by
// word") — src/app/api/ask/route.ts with src/lib/ask-stream.ts.
//
// Pinned:
//   1. `Accept: text/event-stream` or {stream:true} → SSE with the headers
//      that stop buffering; frames meta → status → delta… → done, the status
//      in the asker's language, the done body identical to the JSON path's
//      body for the same answer (web sources marked official or not);
//   2. every refusal still comes first and as before: a bot gets 403 JSON
//      and no model call, a rate limit 429, a bad body 400, and a Class 1-7
//      question its pages as JSON — never a stream, never the model;
//   3. an engine failure → one localised error frame and no done;
//   4. a closed tab (the request's signal) or a cancelled reader aborts the
//      signal runAsk holds, and no error frame is written for a reader that
//      has gone;
//   5. the analytics row is written once, on done, marked stream: true; the
//      JSON path is unchanged (no stream field, same body).
// Auth, rate limit, analytics and the engine are mocked; the resolver runs
// for real over the committed fixture index. No DB, no network, no model.
// Run: npx vitest run tests/unit/ask-route-stream.test.ts

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
import { loadSearchIndex } from "@/lib/search/index-build";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordEvent } from "@/lib/analytics";
import { runAsk, type AskOptions } from "@/lib/ask-engine";
import { createSseParser, type SseFrame } from "@/lib/ask-stream";
import { searchCopy } from "@/lib/search-copy";

const BROWSER = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

function req(body: unknown, opts: { ua?: string; accept?: string; signal?: AbortSignal } = {}) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-forwarded-for": "203.0.113.9",
    cookie: "shishya_anon=anon-123",
    "user-agent": opts.ua ?? BROWSER,
  };
  if (opts.accept) headers.accept = opts.accept;
  return new Request("https://shishya.in/api/ask", { method: "POST", headers, body: JSON.stringify(body), signal: opts.signal });
}
const SSE = "text/event-stream";

async function framesOf(res: Response): Promise<SseFrame[]> {
  const p = createSseParser();
  return [...p.push(await res.text()), ...p.flush()];
}
const data = (f: SseFrame) => JSON.parse(f.data);

const ANSWER = {
  answer: "The **cutoff** page.\n\n➡️ Open next: [SSC CGL · Cutoff](https://shishya.in/exams/SSC_CGL/cutoff)",
  usedWeb: true,
  toolsUsed: ["find_pages", "web_search"],
  pages: [{ url: "/exams/SSC_CGL/cutoff", label: "SSC CGL · Cutoff", section: "government" }],
  links: [{ url: "/exams/SSC_CGL/cutoff", label: "SSC CGL · Cutoff", section: "government" }],
  next: { url: "/exams/SSC_CGL/cutoff", label: "SSC CGL · Cutoff", section: "government" },
  webSources: [
    { title: "SSC notice", url: "https://ssc.gov.in/notice" },
    { title: "A blog", url: "https://example-news.com/ssc" },
  ],
  turns: 2,
  latencyMs: 4321,
  costUsd: 0.03,
};

/** An engine that reports like runAsk does, then answers. */
function streamingEngine() {
  vi.mocked(runAsk).mockImplementation((async (_q: string, opts: AskOptions = {}) => {
    opts.onEvent?.({ type: "status", key: "question" });
    opts.onEvent?.({ type: "status", key: "page", subject: "SSC CGL" });
    opts.onEvent?.({ type: "delta", text: "The " });
    opts.onEvent?.({ type: "delta", text: "**cutoff**" });
    opts.onEvent?.({ type: "delta", text: " page." });
    return ANSWER;
  }) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  streamingEngine();
});

// ── 1. The stream ──────────────────────────────────────────────────────

describe("the stream", () => {
  it("Accept: text/event-stream → SSE headers and meta → status → delta… → done", async () => {
    const res = await POST(req({ question: "ssc cgl cutoff kitna gaya?", via: "strip" }, { accept: SSE }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^text\/event-stream/);
    expect(res.headers.get("cache-control")).toBe("no-cache, no-transform");
    expect(res.headers.get("x-accel-buffering")).toBe("no");
    const frames = await framesOf(res);
    expect(frames.map((f) => f.event)).toEqual(["meta", "status", "status", "delta", "delta", "delta", "done"]);
    const meta = data(frames[0]);
    expect(meta).toMatchObject({ locale: "en" });
    expect(Array.isArray(meta.pages)).toBe(true);
    expect(meta.pages.length).toBeGreaterThan(0);
    expect(data(frames[1])).toEqual({ key: "question", text: "Reading your question…" });
    expect(data(frames[2])).toEqual({ key: "page", text: "Reading Shishya's SSC CGL page…", subject: "SSC CGL" });
    expect(frames.filter((f) => f.event === "delta").map(data).join("")).toBe("The **cutoff** page.");
    const [, opts] = vi.mocked(runAsk).mock.calls[0];
    expect(opts).toMatchObject({ locale: "en", via: "strip" });
    expect(opts?.signal).toBeInstanceOf(AbortSignal);
    expect(typeof opts?.onEvent).toBe("function");
  });

  it("{stream: true} in the body streams too; status lines follow the page's language", async () => {
    const res = await POST(req({ question: "ssc cgl cutoff kitna gaya?", locale: "hi", stream: true }));
    expect(res.headers.get("content-type")).toMatch(/^text\/event-stream/);
    const frames = await framesOf(res);
    expect(data(frames[2]).text).toBe(searchCopy("hi").stream.status.page.replace("{x}", "SSC CGL"));
    expect(/[ऀ-ॿ]/.test(data(frames[1]).text)).toBe(true);
  });

  it("done carries exactly the JSON path's body, web sources marked official or not", async () => {
    const streamed = data((await framesOf(await POST(req({ question: "ssc cgl cutoff kitna gaya?" }, { accept: SSE })))).at(-1)!);
    vi.mocked(runAsk).mockResolvedValueOnce(ANSWER as never);
    const json = await (await POST(req({ question: "ssc cgl cutoff kitna gaya?" }))).json();
    expect(streamed).toEqual(json);
    expect(streamed.webSources).toEqual([
      { title: "SSC notice", url: "https://ssc.gov.in/notice", official: true },
      { title: "A blog", url: "https://example-news.com/ssc", official: false },
    ]);
    expect(streamed).toMatchObject({ answer: ANSWER.answer, usedWeb: true, pages: ANSWER.pages, links: ANSWER.links, next: ANSWER.next });
    // A label the engine already set is kept (a wider official-domain list may decide there).
    vi.mocked(runAsk).mockResolvedValueOnce({ ...ANSWER, webSources: [{ title: "CISCE", url: "https://cisce.org/x", official: true, source: "CISCE" }] } as never);
    const labelled = await (await POST(req({ question: "ssc cgl cutoff kitna gaya?" }))).json();
    expect(labelled.webSources).toEqual([{ title: "CISCE", url: "https://cisce.org/x", official: true, source: "CISCE" }]);
    expect(streamed.toolsUsed).toBeUndefined();
    expect(streamed.costUsd).toBeUndefined();
  });

  it("the analytics row is written once, on done, marked stream: true", async () => {
    await framesOf(await POST(req({ question: "ssc cgl cutoff kitna gaya?", via: "button" }, { accept: SSE })));
    expect(recordEvent).toHaveBeenCalledTimes(1);
    expect(vi.mocked(recordEvent).mock.calls[0][0]).toMatchObject({
      kind: "CTA_CLICKED",
      anonId: "anon-123",
      client: "browser",
      path: "/ask",
      props: { surface: "ask", via: "button", stream: true, turns: 2, latencyMs: 4321, tools: "find_pages,web_search", webFallback: true },
    });
  });
});

// ── 2. Refusals first, as before ───────────────────────────────────────

describe("refusals come before any stream or model call", () => {
  it("a signed-out bot asking for a stream gets 403 JSON and no model call", async () => {
    const res = await POST(req({ question: "ssc cgl salary", stream: true }, { ua: GOOGLEBOT, accept: SSE }));
    expect(res.status).toBe(403);
    expect(res.headers.get("content-type")).toMatch(/json/);
    expect(await res.json()).toMatchObject({ error: "BOT" });
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(runAsk).not.toHaveBeenCalled();
  });

  it("rate limit → 429 and a bad body → 400, streamed or not", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ ok: false, limit: 15, remaining: 0, reset: Date.now() + 60_000 } as never);
    expect((await POST(req({ question: "ssc cgl salary" }, { accept: SSE }))).status).toBe(429);
    expect((await POST(req({ question: "a", stream: true }))).status).toBe(400);
    expect(runAsk).not.toHaveBeenCalled();
  });

  it("Class 1-7 → its pages as JSON even when a stream was asked for; no model call", async () => {
    const res = await POST(req({ question: "class 5 maths", stream: true }, { accept: SSE }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/json/);
    const body = await res.json();
    expect(body).toMatchObject({ answer: null, notice: "no-ai-young-class" });
    expect(body.pages[0].url).toMatch(/^\/schooling\/cbse\/class-5/);
    expect(runAsk).not.toHaveBeenCalled();
  });
});

// ── 3-4. Failure and abort ─────────────────────────────────────────────

describe("failure and abort", () => {
  it("an engine failure → one localised error frame, no done, no analytics row", async () => {
    vi.mocked(runAsk).mockImplementationOnce((async (_q: string, opts: AskOptions = {}) => {
      opts.onEvent?.({ type: "delta", text: "Half" });
      throw new Error("overloaded");
    }) as never);
    const frames = await framesOf(await POST(req({ question: "ssc cgl cutoff kitna gaya?", locale: "te" }, { accept: SSE })));
    expect(frames.map((f) => f.event)).toEqual(["meta", "delta", "error"]);
    expect(data(frames[2])).toEqual({ error: searchCopy("te").failed, code: "failed" });
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it("a closed tab aborts runAsk's signal, and nothing is written for the reader that left", async () => {
    const tab = new AbortController();
    let engineSignal: AbortSignal | undefined;
    vi.mocked(runAsk).mockImplementationOnce((async (_q: string, opts: AskOptions = {}) => {
      engineSignal = opts.signal;
      opts.onEvent?.({ type: "delta", text: "Partial " });
      await new Promise((_, reject) => opts.signal!.addEventListener("abort", () => reject(new Error("Request was aborted."))));
    }) as never);
    const res = await POST(req({ question: "ssc cgl cutoff kitna gaya?" }, { accept: SSE, signal: tab.signal }));
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let seen = "";
    while (!seen.includes("Partial")) seen += dec.decode((await reader.read()).value, { stream: true });
    tab.abort();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      seen += dec.decode(value, { stream: true });
    }
    expect(engineSignal?.aborted).toBe(true);
    expect(seen).not.toContain("event: error");
    expect(seen).not.toContain("event: done");
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it("an answer that completes after the reader left writes no answered-question row and no done (26 Sep 2026, fixer)", async () => {
    const tab = new AbortController();
    vi.mocked(runAsk).mockImplementationOnce((async (_q: string, opts: AskOptions = {}) => {
      opts.onEvent?.({ type: "delta", text: "Partial " });
      await new Promise((resolve) => opts.signal!.addEventListener("abort", resolve));
      return ANSWER; // what the engine did before the fixer's stream-end check
    }) as never);
    const res = await POST(req({ question: "ssc cgl cutoff kitna gaya?" }, { accept: SSE, signal: tab.signal }));
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let seen = "";
    while (!seen.includes("Partial")) seen += dec.decode((await reader.read()).value, { stream: true });
    tab.abort();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      seen += dec.decode(value, { stream: true });
    }
    expect(seen).not.toContain("event: done");
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it("a cancelled reader (the panel's Stop) aborts runAsk's signal too", async () => {
    let engineSignal: AbortSignal | undefined;
    vi.mocked(runAsk).mockImplementationOnce((async (_q: string, opts: AskOptions = {}) => {
      engineSignal = opts.signal;
      await new Promise((_, reject) => opts.signal!.addEventListener("abort", () => reject(new Error("aborted"))));
    }) as never);
    const res = await POST(req({ question: "ssc cgl cutoff kitna gaya?" }, { accept: SSE }));
    const reader = res.body!.getReader();
    await reader.read(); // meta
    await reader.cancel();
    await vi.waitFor(() => expect(engineSignal?.aborted).toBe(true));
  });
});

// ── Study only (26 Sep 2026, fixer — founder: "anonymous teenager answers is fine as we will be
//    showing only study related content for them") ────────────────────────────────────────────────

describe("off-topic and distress never reach the model", () => {
  it("off-topic → the study-only JSON reply (even to a stream request); no index load, no model call", async () => {
    const res = await POST(req({ question: "tell me a joke", via: "strip", stream: true }, { accept: SSE }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/json/);
    const body = await res.json();
    expect(body).toMatchObject({ notice: "off-topic", usedWeb: false, webSources: [] });
    expect(body.answer).toMatch(/^I'm Shishya's AI, and I answer study questions only/);
    expect(body.next.url).toBe("/exams/browse");
    expect(runAsk).not.toHaveBeenCalled();
    expect(loadSearchIndex).not.toHaveBeenCalled();
    expect(recordEvent).toHaveBeenCalledTimes(1);
    expect(vi.mocked(recordEvent).mock.calls[0][0]).toMatchObject({
      kind: "CTA_CLICKED",
      path: "/ask",
      props: { surface: "ask", via: "strip", notice: "off-topic", scope: "jokes", q: "tell me a joke" },
    });
  });

  it("distress → the helplines, no pages, no Open next; the analytics row keeps no text", async () => {
    for (const question of ["i want to kill myself", "నాకు చనిపోవాలని ఉంది", "mujhe marna hai"]) {
      vi.clearAllMocks();
      const res = await POST(req({ question, stream: true }, { accept: SSE }));
      expect(res.headers.get("content-type")).toMatch(/json/);
      const body = await res.json();
      expect(body).toMatchObject({ notice: "distress", pages: [], links: [], next: null });
      expect(body.answer).toContain("14416");
      expect(body.answer).toContain("1098");
      expect(runAsk).not.toHaveBeenCalled();
      expect(vi.mocked(recordEvent).mock.calls[0][0].props).toMatchObject({ notice: "distress", scope: "distress", q: null });
    }
  });

  it("a Class 1-7 child in distress gets the helplines, not the class's study pages", async () => {
    const body = await (await POST(req({ question: "class 6 i want to die" }))).json();
    expect(body.notice).toBe("distress");
    expect(body.pages).toEqual([]);
    expect(runAsk).not.toHaveBeenCalled();
  });

  it("a study question with a risky-looking word still reaches the engine", async () => {
    vi.mocked(runAsk).mockResolvedValueOnce(ANSWER as never);
    await POST(req({ question: "durkheim theory of suicide sociology upsc" }));
    expect(runAsk).toHaveBeenCalledTimes(1);
  });
});

// ── 5. The JSON path and the source order ──────────────────────────────

describe("the JSON path is unchanged", () => {
  it("no Accept header and no stream field → JSON; runAsk gets no onEvent", async () => {
    vi.mocked(runAsk).mockResolvedValueOnce(ANSWER as never);
    const res = await POST(req({ question: "ssc cgl cutoff kitna gaya?" }, { accept: "application/json" }));
    expect(res.headers.get("content-type")).toMatch(/json/);
    const body = await res.json();
    expect(body.answer).toBe(ANSWER.answer);
    expect(vi.mocked(runAsk).mock.calls[0][1]?.onEvent).toBeUndefined();
    expect(vi.mocked(recordEvent).mock.calls[0][0].props).not.toHaveProperty("stream");
  });

  it("source order: guard, body, resolver and the Class 1-7 answer all come before the stream branch", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src/app/api/ask/route.ts"), "utf8");
    const at = (s: string) => src.indexOf(s);
    expect(at("await askGuard(req)")).toBeLessThan(at("Body.safeParse"));
    // 26 Sep 2026 (fixer): the study-only check sits after the body and before the index and the Class 1-7 answer.
    expect(at("Body.safeParse")).toBeLessThan(at("askScopeOf(question)"));
    expect(at("askScopeOf(question)")).toBeLessThan(at('await loadSearchIndex("deep")'));
    expect(at("askScopeOf(question)")).toBeLessThan(at('schoolScope === "class1to7"'));
    expect(at('schoolScope === "class1to7"')).toBeLessThan(at("if (wantsStream) return streamAnswer("));
    expect(at("if (wantsStream) return streamAnswer(")).toBeLessThan(at("await runAsk(question"));
    expect(src).toMatch(/export const maxDuration = 60;/);
  });

  it("the /ask panel asks for the stream, can stop it and respects reduced motion", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src/app/ask/AskAnswer.tsx"), "utf8");
    expect(src).toMatch(/accept: "text\/event-stream"/);
    expect(src).toMatch(/stream: true/);
    expect(src).toMatch(/\.abort\(\)/);
    expect(src).toMatch(/prefers-reduced-motion: reduce/);
    expect(src).toMatch(/draftForDisplay\(/);
    // Still no model call on load without the human intent token.
    expect(src).toMatch(/takeIntentToken\(q\)/);
    // 26 Sep 2026 (fixer): one live region, mounted from the first render (errors and whole JSON
    // replies are announced), held busy while words are typed; the card itself is not a live region.
    expect(src).toMatch(/<section[^>]*data-ask-answer aria-live="polite" aria-busy=\{typing\}/);
    expect(src).not.toMatch(/rounded-xl border border-ink-200 bg-white p-4" aria-live/);
    // The status row stands alone only before the first word; then it is the card's footer.
    expect(src).toMatch(/\{live && !showDraft && /);
  });

  it("/ask shows the helplines for a distress query before resolving, redirecting or offering the AI (26 Sep 2026, fixer)", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src/app/ask/page.tsx"), "utf8");
    const at = (s: string) => src.indexOf(s);
    expect(at("askScopeOf(q).distress")).toBeGreaterThan(0);
    expect(at("askScopeOf(q).distress")).toBeLessThan(at("await resolveQueryServer(q, locale)"));
    expect(at("askScopeOf(q).distress")).toBeLessThan(at("redirect(r.best.url)"));
    expect(src).toMatch(/offTopicReply\(locale, \{ question: q, distress: true \}\)/);
  });
});

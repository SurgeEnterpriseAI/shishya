// Web research on Surge's server (13 Oct 2026): the loop that replaces Claude's web_search
// tool. No network: fetch is stubbed for the model (chat/completions) and the tools gateway.
// Run: npx vitest run tests/unit/local-research.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV = { LOCAL_LLM_URL: "https://surgeai.example.ts.net/v1", LOCAL_LLM_KEY: "k", LOCAL_LLM_RESEARCH_FEATURES: "akr-check" };

async function load(env: Record<string, string> = ENV) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import("../../src/lib/ai/local-research");
}

type Turn = { content?: string; calls?: Array<{ name: string; args: unknown }>; finish?: string };
function stubNet(turns: Turn[], pages: Record<string, unknown> = {}, hits: unknown[] = []) {
  const seenBodies: any[] = [];
  let i = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: any) => {
    const body = JSON.parse(init.body);
    if (url.endsWith("/chat/completions")) {
      seenBodies.push(body);
      const t = turns[Math.min(i++, turns.length - 1)];
      const tool_calls = (t.calls ?? []).map((c, j) => ({ id: `c${i}-${j}`, type: "function", function: { name: c.name, arguments: JSON.stringify(c.args) } }));
      return new Response(JSON.stringify({ choices: [{ message: { content: t.content ?? "", tool_calls }, finish_reason: t.finish ?? (tool_calls.length ? "tool_calls" : "stop") }], usage: { prompt_tokens: 10, completion_tokens: 5 } }));
    }
    if (url.endsWith("/tools/search")) return new Response(JSON.stringify({ results: hits }));
    if (url.endsWith("/tools/fetch")) {
      const p = pages[body.url];
      return p ? new Response(JSON.stringify(p)) : new Response(JSON.stringify({ error: "HTTP 404" }), { status: 400 });
    }
    throw new Error(`unexpected ${url}`);
  }));
  return seenBodies;
}

beforeEach(() => vi.unstubAllEnvs());
afterEach(() => vi.unstubAllGlobals());

describe("localResearchOn", () => {
  it("is on only for a listed feature with the model and gateway set", async () => {
    expect((await load()).localResearchOn("akr-check")).toBe(true);
    expect((await load()).localResearchOn("exam-info")).toBe(false);
    expect((await load({ LOCAL_LLM_RESEARCH_FEATURES: "akr-check", LOCAL_LLM_URL: "", LOCAL_LLM_KEY: "" })).localResearchOn("akr-check")).toBe(false);
  });
});

describe("localResearch", () => {
  const page = { url: "https://ssc.gov.in/home/answer-key", final_url: "https://ssc.gov.in/home/answer-key", status: 200, content_type: "text/html", title: "Answer key", text: "CGL 2026 Tier-I tentative answer key", links: [{ text: "CGL 2026 key", url: "https://ssc.gov.in/key/cgl2026.pdf" }], truncated: false };
  it("searches, fetches, answers; seen holds hits, pages and their links", async () => {
    stubNet(
      [
        { calls: [{ name: "web_search", args: { query: "site:ssc.gov.in cgl 2026 answer key" } }] },
        { calls: [{ name: "fetch_page", args: { url: page.url } }] },
        { content: '{"candidates":[{"kind":"ANSWER_KEY","url":"https://ssc.gov.in/key/cgl2026.pdf","listingUrl":"https://ssc.gov.in/home/answer-key"}]}' },
      ],
      { [page.url]: page },
      [{ url: "https://ssc.gov.in/home/answer-key", title: "Answer key", snippet: "" }],
    );
    const m = await load();
    const r = await m.localResearch({ system: "S", prompt: "P", allowedDomains: ["ssc.gov.in"], expectJson: true });
    expect(r.text).toContain("cgl2026.pdf");
    expect(r.seen.has(m.normUrl("https://ssc.gov.in/key/cgl2026.pdf"))).toBe(true);
    expect(r.seen.has(m.normUrl("https://www.ssc.gov.in/home/answer-key/"))).toBe(true);
    expect(r.seen.has(m.normUrl("https://ssc.gov.in/invented.pdf"))).toBe(false);
    expect(r.usage.input_tokens).toBe(30);
  });
  it("offers only tools with budget left, then asks for the answer with no tools", async () => {
    const bodies = stubNet(
      [
        { calls: [{ name: "web_search", args: { query: "a" } }] },
        { calls: [{ name: "fetch_page", args: { url: page.url } }] },
        { content: '{"candidates":[]}' },
      ],
      { [page.url]: page },
    );
    const m = await load();
    await m.localResearch({ system: "S", prompt: "P", maxSearches: 1, maxFetches: 1, expectJson: true });
    expect(bodies[0].tools.map((t: any) => t.function.name)).toEqual(["web_search", "fetch_page"]);
    expect(bodies[1].tools.map((t: any) => t.function.name)).toEqual(["fetch_page"]);
    expect(bodies[2].tools).toBeUndefined();
    expect(bodies[2].messages.at(-1).content).toMatch(/budget is used up/);
  });
  it("asks once more for JSON when the answer is prose, and fails if it stays prose", async () => {
    stubNet([{ content: "Nothing is published yet." }, { content: '{"candidates":[]}' }]);
    expect((await (await load()).localResearch({ system: "S", prompt: "P", expectJson: true })).text).toBe('{"candidates":[]}');
    stubNet([{ content: "Nothing." }, { content: "Still nothing." }]);
    await expect((await load()).localResearch({ system: "S", prompt: "P", expectJson: true })).rejects.toThrow(/no JSON/);
  });
  it("an empty answer is asked again once; a cut-off answer fails", async () => {
    stubNet([{ content: "" }, { content: "ok" }]);
    expect((await (await load()).localResearch({ system: "S", prompt: "P" })).text).toBe("ok");
    stubNet([{ content: "half an ans", finish: "length" }]);
    await expect((await load()).localResearch({ system: "S", prompt: "P" })).rejects.toThrow(/cut off/);
  });
});

describe("fitContext", () => {
  it("shortens the oldest tool results first and keeps the newest whole", async () => {
    const m = await load();
    const big = "x".repeat(20_000);
    const msgs: any[] = [{ role: "system", content: "S" }, { role: "tool", content: big }, { role: "tool", content: big }, { role: "tool", content: big }];
    m.fitContext(msgs, 12_000);
    expect(msgs[1].content.length).toBeLessThan(2_000);
    expect(msgs[3].content.length).toBe(20_000);
  });
});

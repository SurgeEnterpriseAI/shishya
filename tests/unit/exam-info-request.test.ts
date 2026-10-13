// exam-info request shape + Shishya's own domain (13 Oct 2026).
//
// 1. generateExamInfo sends no cache_control: with one, the API caches the
//    web_search results after the single batch of searches and nobody reads
//    them back (~33k tokens a call written at 1.25x the input price).
// 2. Claude never cites shishya.in for a fact: exam-info drops a shishya.in
//    citation (isOwnSiteUrl), and every web_search call whose results become
//    student-facing facts goes through the shared helper (or searches an
//    official-host allow-list). The helper's blocked_domains is OFF by default
//    (13 Oct 2026 review: +34% search tokens for 0 shishya.in results seen);
//    turning it on is one founder switch, BLOCK_OWN_SITE_DEFAULT.
// No DB, no model call.

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ create: vi.fn(), recordAiUsage: vi.fn(() => 0) }));
vi.mock("@/lib/ai/client", () => ({ anthropic: { messages: { create: h.create } }, MODEL: "claude-sonnet-4-5-20250929" }));
vi.mock("@/lib/ai/usage", () => ({ recordAiUsage: h.recordAiUsage, recordAiUsageAwaited: vi.fn(async () => 0) }));

import { generateExamInfo } from "@/lib/ai/exam-info";
import { BLOCK_OWN_SITE_DEFAULT, OWN_SITE_DOMAINS, isOwnSiteUrl, webSearchTool } from "@/lib/ai/web-search";

const ROOT = path.resolve(__dirname, "..", "..");

const INPUT = {
  examCode: "SSC_CGL",
  examName: "SSC Combined Graduate Level",
  examShortName: "SSC CGL",
  category: "GOVT_JOBS",
  officialUrl: "https://ssc.gov.in",
  officialName: "Staff Selection Commission",
};

function reply(json: unknown) {
  return {
    model: "claude-sonnet-4-5-20250929",
    stop_reason: "end_turn",
    content: [
      { type: "text", text: "I'll search the official site." },
      { type: "server_tool_use", id: "s1", name: "web_search", input: { query: "site:ssc.gov.in SSC CGL 2026" } },
      { type: "web_search_tool_result", tool_use_id: "s1", content: [{ type: "web_search_result", url: "https://ssc.gov.in/notice", title: "Notice" }] },
      { type: "text", text: JSON.stringify(json) },
    ],
    usage: { input_tokens: 40_000, output_tokens: 2_000, server_tool_use: { web_search_requests: 1 } },
  };
}

const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

beforeEach(() => {
  h.create.mockReset();
  h.recordAiUsage.mockClear();
});

describe("webSearchTool", () => {
  it("is the plain web_search tool by default: blocked_domains costs ~34% more search tokens and is a founder opt-in", () => {
    expect(BLOCK_OWN_SITE_DEFAULT).toBe(false);
    expect(webSearchTool(5)).toEqual({ type: "web_search_20250305", name: "web_search", max_uses: 5 });
    expect(webSearchTool(5, { blockOwnSite: false })).toEqual({ type: "web_search_20250305", name: "web_search", max_uses: 5 });
  });

  it("blocks Shishya's own domain when a caller opts in", () => {
    expect(OWN_SITE_DOMAINS).toEqual(["shishya.in"]);
    expect(webSearchTool(5, { blockOwnSite: true })).toEqual({ type: "web_search_20250305", name: "web_search", max_uses: 5, blocked_domains: ["shishya.in"] });
  });

  it("hands each caller its own list (a caller's edit never leaks into the next request)", () => {
    const a = webSearchTool(2, { blockOwnSite: true });
    a.blocked_domains!.push("example.com");
    expect(webSearchTool(2, { blockOwnSite: true }).blocked_domains).toEqual(["shishya.in"]);
  });

  it("isOwnSiteUrl matches the domain and its subdomains only", () => {
    expect(isOwnSiteUrl("https://shishya.in/exams/CDS/updates")).toBe(true);
    expect(isOwnSiteUrl("https://www.shishya.in/exams/CDS")).toBe(true);
    expect(isOwnSiteUrl("http://SHISHYA.IN")).toBe(true);
    expect(isOwnSiteUrl("https://notshishya.in/x")).toBe(false);
    expect(isOwnSiteUrl("https://shishya.in.example.com/x")).toBe(false);
    expect(isOwnSiteUrl("https://ssc.gov.in/notice")).toBe(false);
    expect(isOwnSiteUrl(null)).toBe(false);
    expect(isOwnSiteUrl("not a url")).toBe(false);
  });
});

describe("generateExamInfo request", () => {
  it("sends no cache_control anywhere, the plain system prompt, and the plain web_search tool (no blocked_domains)", async () => {
    h.create.mockResolvedValueOnce(reply({ news: [], dates: [] }));
    await generateExamInfo(INPUT, { useWebSearch: true, usageFeature: "exam-info" });
    expect(h.create).toHaveBeenCalledTimes(1);
    const body = h.create.mock.calls[0][0];
    expect(JSON.stringify(body)).not.toContain("cache_control");
    expect(typeof body.system).toBe("string");
    expect(body.system).toContain("HONESTY ABOUT CERTAINTY");
    expect(body.tools).toEqual([{ type: "web_search_20250305", name: "web_search", max_uses: 5 }]);
    expect(JSON.stringify(body)).not.toContain("blocked_domains");
    expect(body.max_tokens).toBe(4500);
    expect(body.model).toBe("claude-sonnet-4-5-20250929");
    expect(h.recordAiUsage).toHaveBeenCalledWith("exam-info", expect.anything(), expect.objectContaining({ ref: "SSC_CGL" }));
  });

  it("without web search: no tools and still no cache_control", async () => {
    h.create.mockResolvedValueOnce(reply({ news: [], dates: [] }));
    await generateExamInfo(INPUT, { useWebSearch: false });
    const body = h.create.mock.calls[0][0];
    expect(body.tools).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("cache_control");
  });
});

describe("generateExamInfo never keeps shishya.in as a source", () => {
  it("drops a news item citing our own page and strips the source from a date (it can only be expected)", async () => {
    h.create.mockResolvedValueOnce(
      reply({
        news: [
          { title: "Tier 1 admit card out", body: "SSC posted the admit card.", daysAgo: 1, source: "https://ssc.gov.in/notice" },
          { title: "Result date fixed", body: "Echo of our own page.", daysAgo: 2, source: "https://shishya.in/exams/SSC_CGL/updates" },
        ],
        dates: [
          { label: "Tier 1 exam", kind: "EXAM", date: future(20), isExamDay: true, confidence: "official", source: "https://ssc.gov.in/notice", notes: null },
          { label: "Tier 1 result", kind: "RESULT", date: future(80), isExamDay: false, confidence: "official", source: "https://www.shishya.in/exams/SSC_CGL/updates", notes: null },
        ],
      }),
    );
    const info = await generateExamInfo(INPUT, { useWebSearch: true });
    expect(info.news.map((n) => n.title)).toEqual(["Tier 1 admit card out"]);
    const exam = info.dates.find((d) => d.kind === "EXAM")!;
    expect(exam).toMatchObject({ confidence: "official", source: "https://ssc.gov.in/notice" });
    const result = info.dates.find((d) => d.kind === "RESULT")!;
    expect(result).toMatchObject({ confidence: "expected", source: null });
  });
});

describe("every web_search call that feeds a student-facing fact uses the shared helper", () => {
  // A web_search tool literal must be the shared helper's own, or search an
  // official-host allow-list (the API refuses blocked + allowed together), so
  // one switch in src/lib/ai/web-search.ts reaches every fact caller.
  // These callers state no fact from the results (they borrow a paper's style
  // or pick videos) and keep a literal on purpose: they would never take the
  // block, which makes each search return ~34% more page text (measured 13 Oct 2026).
  const PLAIN_TOOL_OK = new Set(["src/lib/ai/pyq-generator.ts", "src/lib/ai/vernacular-mock-generator.ts", "scripts/generate-inspiration-videos.ts"]);
  const HELPER = "src/lib/ai/web-search.ts";

  function walk(dir: string, out: string[] = []): string[] {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) {
        // scripts/ai-eval is untracked eval code, never shipped.
        if (e.name === "node_modules" || rel === "scripts/ai-eval") continue;
        walk(rel, out);
      } else if (/\.(ts|tsx|mts|cts|js|mjs|cjs)$/.test(e.name)) out.push(rel);
    }
    return out;
  }

  it("finds no raw web_search tool outside the helper, the allow-list callers and the style-only callers", () => {
    const offenders: string[] = [];
    let helperUsers = 0;
    for (const file of [...walk("src"), ...walk("scripts")]) {
      const src = fs.readFileSync(path.join(ROOT, file), "utf8");
      if (src.includes("webSearchTool(")) helperUsers++;
      if (file === HELPER || PLAIN_TOOL_OK.has(file)) continue;
      src.split(/\r?\n/).forEach((line, i) => {
        if (/type:\s*["']web_search_\d+["']/.test(line) && !line.includes("allowed_domains")) offenders.push(`${file}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
    // exam-info, vacancies, current-affairs, phase articles, ask, and the
    // official-source + eligibility scripts.
    expect(helperUsers).toBeGreaterThanOrEqual(7);
  });
});

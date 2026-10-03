// IndexNow — written content and a log line (3 Oct 2026, fix C16).
//
// Topic notes, Hindi notes, guides and tricks change only when a generator
// writes a row, and none of them was ever pinged. The news cron now reads the
// rows written in its window and sends their pages
// (src/lib/indexnow-content.ts); both IndexNow crons print one "[indexnow]"
// log line per run (read by hand; no table, nothing watches it); and the
// hand-run submit script gets --sections, --dry and a 2,000-URL refusal
// without --all. No DB and no network: the routes are read as text and the
// script runs against a stubbed fetch.

import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { CONTENT_CAP, contentUpdateUrls } from "@/lib/indexnow-content";
import { MAX_WITHOUT_ALL, main as submitMain, sizeRefusal } from "../../scripts/indexnow-submit";

const ROOT = path.resolve(__dirname, "../..");
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const S = "https://shishya.in";
const EMPTY = { guides: [], tricks: [], notes: [], hindi: [] };

describe("contentUpdateUrls", () => {
  it("the four URL shapes, guides and tricks first", () => {
    const { urls, overCap } = contentUpdateUrls({
      notes: [{ exam: "SSC_CGL", topic: "quant.percentage" }],
      hindi: [{ exam: "SSC_CGL", topic: "quant.time_speed_distance" }],
      guides: ["SSC_CGL"],
      tricks: ["IBPS_PO"],
    });
    expect(urls).toEqual([
      `${S}/exams/SSC_CGL/guide`,
      `${S}/exams/IBPS_PO/tricks`,
      `${S}/exams/SSC_CGL/topics/quant.percentage`,
      `${S}/exams/SSC_CGL/topics/quant.time_speed_distance/hi`,
    ]);
    expect(overCap).toBe(0);
  });

  it("duplicates collapse", () => {
    const { urls } = contentUpdateUrls({
      guides: ["SSC_CGL", "SSC_CGL"],
      tricks: ["SSC_CGL"],
      notes: [
        { exam: "SSC_CGL", topic: "quant.percentage" },
        { exam: "SSC_CGL", topic: "quant.percentage" },
      ],
      hindi: [
        { exam: "SSC_CGL", topic: "quant.percentage" },
        { exam: "SSC_CGL", topic: "quant.percentage" },
      ],
    });
    expect(urls).toEqual([
      `${S}/exams/SSC_CGL/guide`,
      `${S}/exams/SSC_CGL/tricks`,
      `${S}/exams/SSC_CGL/topics/quant.percentage`,
      `${S}/exams/SSC_CGL/topics/quant.percentage/hi`,
    ]);
  });

  it("1,200 notes against a cap of 1,000 → 1,000 URLs, 200 over the cap", () => {
    const notes = Array.from({ length: 1_200 }, (_, i) => ({ exam: "SSC_CGL", topic: `t.${i}` }));
    const { urls, overCap } = contentUpdateUrls({ ...EMPTY, notes }, 1_000);
    expect(urls).toHaveLength(1_000);
    expect(overCap).toBe(200);
    expect(urls[0]).toBe(`${S}/exams/SSC_CGL/topics/t.0`);
    expect(urls[999]).toBe(`${S}/exams/SSC_CGL/topics/t.999`);
  });

  it("the default cap is CONTENT_CAP = 1,000, and guides and tricks are never the ones cut", () => {
    expect(CONTENT_CAP).toBe(1_000);
    const notes = Array.from({ length: 1_000 }, (_, i) => ({ exam: "X", topic: `t.${i}` }));
    const { urls, overCap } = contentUpdateUrls({ guides: ["A"], tricks: ["B"], notes, hindi: [] });
    expect(urls).toHaveLength(1_000);
    expect(urls.slice(0, 2)).toEqual([`${S}/exams/A/guide`, `${S}/exams/B/tricks`]);
    expect(overCap).toBe(2);
  });

  it("empty input → no URL", () => {
    expect(contentUpdateUrls(EMPTY)).toEqual({ urls: [], overCap: 0 });
  });

  it("a row with an empty code adds nothing", () => {
    expect(contentUpdateUrls({ guides: [""], tricks: [""], notes: [{ exam: "", topic: "t" }], hindi: [{ exam: "X", topic: "" }] }).urls).toEqual([]);
  });
});

describe("the news cron reads the four kinds in its own window", () => {
  const src = read("src/app/api/cron/indexnow/route.ts");
  const reads = [...src.matchAll(/const (noteRows|hindiRows|guideRows|tricksRows) = await prisma\.(\w+)\s*\.findMany\(\{([\s\S]*?)\}\)\s*\.catch\(\(\) => \[\]\);/g)];

  it("four reads, one per kind, each with its own empty fallback", () => {
    expect(reads.map((m) => [m[1], m[2]])).toEqual([
      ["noteRows", "topicTeachingNote"],
      ["hindiRows", "topicNoteTranslation"],
      ["guideRows", "examGuide"],
      ["tricksRows", "examTricks"],
    ]);
  });

  it("each read: written since the window start, real exams only, oldest first, one row over the cap", () => {
    for (const m of reads) {
      const body = m[3];
      expect(body, m[1]).toMatch(/generatedAt: \{ gte: since \}/);
      expect(body, m[1]).toMatch(/REAL_EXAM_WHERE/);
      expect(body, m[1]).toMatch(/orderBy: \{ generatedAt: "asc" \}/);
      expect(body, m[1]).toMatch(/take: CONTENT_CAP \+ 1/);
    }
  });

  it("Hindi notes are the hi locale; guides and tricks need content", () => {
    const by = new Map(reads.map((m) => [m[1], m[3]]));
    expect(by.get("hindiRows")).toMatch(/locale: "hi"/);
    expect(by.get("guideRows")).toMatch(/content: \{ not: "" \}/);
    expect(by.get("tricksRows")).toMatch(/content: \{ not: "" \}/);
  });

  it("the news / current-affairs / school set is unchanged; the content URLs are added to it and sent together", () => {
    expect(src).toMatch(/const urls = \[\.\.\.newsUrls, \.\.\.caUrls, \.\.\.schoolUrls\];/);
    expect(src).toMatch(/const allUrls = \[\.\.\.urls, \.\.\.content\.urls\];/);
    expect(src).toMatch(/await pingIndexNow\(allUrls\)/);
    expect(src).toMatch(/const totalChunks = Math\.ceil\(allUrls\.length \/ CHUNK\);/);
    expect(src).toMatch(/submittedContent: content\.urls\.length,/);
    expect(src).toMatch(/contentOverCap: content\.overCap,/);
  });
});

describe("one log line per run, in both IndexNow crons", () => {
  it("the news scope logs scope, since, window, count, chunks and the first 10 URLs", () => {
    const src = read("src/app/api/cron/indexnow/route.ts");
    expect(src).toContain('console.log("[indexnow]"');
    expect(src).toMatch(/scope: "news", since: since\.toISOString\(\), windowHours, urls: allUrls\.length, acceptedChunks, totalChunks, sample: allUrls\.slice\(0, 10\)/);
    expect(src).toMatch(/const windowHours = Math\.round\(windowMs \/ 360_000\) \/ 10;/);
  });

  it("the exam-week scope logs the same shape", () => {
    const src = read("src/app/api/cron/indexnow-examweek/route.ts");
    expect(src).toContain('console.log("[indexnow]"');
    expect(src).toMatch(/scope: "examweek", since: null, windowHours: null, urls: urls\.length, acceptedChunks, totalChunks, sample: urls\.slice\(0, 10\)/);
  });

  it("no table and no alert: the log line is the only record added", () => {
    for (const f of ["src/app/api/cron/indexnow/route.ts", "src/app/api/cron/indexnow-examweek/route.ts"]) {
      const src = read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      expect(src, f).not.toMatch(/IndexNowSend/);
      expect(src, f).not.toMatch(/\$executeRaw|\.create\(|\.upsert\(|sendEmail|alert/i);
    }
  });
});

describe("scripts/indexnow-submit.ts", () => {
  const sitemap = (n: number) =>
    `<urlset>${Array.from({ length: n }, (_, i) => `<url><loc>${S}/p/${i}</loc></url>`).join("")}</urlset>`;
  let calls: { url: string; body?: string }[];
  const fakeFetch = (n: number) => async (input: string, init?: RequestInit) => {
    calls.push({ url: input, body: init?.body ? String(init.body) : undefined });
    return input.endsWith("/sitemap.xml") ? new Response(sitemap(n)) : new Response("", { status: 202 });
  };
  const posts = () => calls.filter((c) => c.url === "https://api.indexnow.org/IndexNow");

  beforeEach(() => {
    calls = [];
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refuses more than 2,000 URLs without --all", () => {
    expect(MAX_WITHOUT_ALL).toBe(2_000);
    expect(sizeRefusal(2_000, false)).toBeNull();
    expect(sizeRefusal(2_001, false)).toMatch(/refusing to send 2001 URLs/);
    expect(sizeRefusal(2_001, true)).toBeNull();
  });

  it("2,001 sitemap URLs without --all → exit code 1 and nothing sent", async () => {
    expect(await submitMain(["node", "indexnow-submit.ts"], fakeFetch(2_001))).toBe(1);
    expect(posts()).toHaveLength(0);
  });

  it("2,001 URLs with --all → sent, exit code 0", async () => {
    expect(await submitMain(["node", "indexnow-submit.ts", "--all"], fakeFetch(2_001))).toBe(0);
    expect(posts()).toHaveLength(1);
    expect(JSON.parse(posts()[0].body!).urlList).toHaveLength(2_001);
  });

  it("--match narrows below the limit and sends", async () => {
    expect(await submitMain(["node", "indexnow-submit.ts", "--match", "/p/1\\d$"], fakeFetch(2_001))).toBe(0);
    expect(JSON.parse(posts()[0].body!).urlList).toHaveLength(10);
  });

  it("--dry prints and sends nothing, even over the limit", async () => {
    expect(await submitMain(["node", "indexnow-submit.ts", "--dry"], fakeFetch(2_001))).toBe(0);
    expect(posts()).toHaveLength(0);
  });

  it("--sections reads no sitemap: the section hubs, machine files and life-stage pages", async () => {
    const log = vi.mocked(console.log);
    expect(await submitMain(["node", "indexnow-submit.ts", "--sections", "--dry"], fakeFetch(0))).toBe(0);
    expect(calls).toHaveLength(0);
    const printed = log.mock.calls.map((c) => String(c[0]));
    for (const u of [S, `${S}/schooling`, `${S}/llms.txt`, `${S}/context.md`]) expect(printed).toContain(u);
  });
});

// The life-stage pages on the sitemap and the other lists that name or count
// them (30 Sep 2026, P1 build 1, spec §2.6 / §7). No DB, no network.
//
// Pinned:
//   1. sitemap rows = the indexable set exactly — the hubs through
//      EXTRA_SITEMAP_PROVIDERS (path-sitemap.ts), the option pages after
//      Class 10 ONLY through src/lib/school/landings.ts (the schooling-honesty
//      rule: sitemap.ts names no /schooling URL); no noindex URL, no invented
//      lastModified; the hub verdict does not depend on which exams are live;
//   2. IndexNow submits only indexable life-stage pages and their context files;
//   3. the middleware tags a hub landing and keeps it out of the /hi, /te
//      twins (spec F7);
//   4. the counters file /after-10th as school and /after-12th as entrance
//      (founder decision P1-D3), in the learners strip and in Pulse.
// Run: npx vitest run tests/unit/paths-sitemap.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

// The DB-backed providers the extra sitemap also runs (tests/unit/sitemap-families.test.ts pattern).
vi.mock("@/lib/exam-list-rows", () => ({ getExamListRows: async () => [] }));
vi.mock("@/lib/db/mock-catalogue-db", () => ({ loadNewestSharedMockAt: async () => null }));
vi.mock("@/lib/db/subject-hubs-db", () => ({ loadSubjectHubs: async () => new Map() }));

import { NextRequest } from "next/server";
import { LABEL_ONLY_EXAM_CODES, PATH_EXAMS, STREAM_OPTION_SLUGS } from "@/data/paths";
import { STAGE_HUB_IDS, indexableStageHubs, lifeStageIndexablePaths, stageHubMachineModel, stageHubSitemapEntries, streamPageSitemapRows } from "@/lib/paths/path-sitemap";
import { afterTenthModel, afterTwelfthModel, isStageHubIndexable } from "@/lib/paths/stage-pages";
import { indexableStreamSlugs, isStreamPageIndexable } from "@/lib/paths/stream-pages";
import { schoolLandingSitemapEntries } from "@/lib/school/landings";
import { EMPTY_SCHOOL_SURFACE } from "@/lib/school/surface";
import { EXTRA_SITEMAP_PROVIDERS, extraSitemapEntries } from "@/lib/sitemap-sections";
import { MACHINE_FILE_PATHS, SECTION_HUB_PATHS, lifeStageUrls } from "@/lib/indexnow";
import { config, middleware } from "@/middleware";
import { TWIN_PUBLIC_RE } from "@/lib/search/targets";
import { sectionCaseSql } from "@/lib/learner-sections";
import { pulseSectionOfPath } from "@/lib/pulse-rules";

const ROOT = process.cwd();
const BASE = "https://shishya.in";
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const ALL_LIVE: ReadonlySet<string> = new Set(PATH_EXAMS.map((e) => e.code).filter((c) => !LABEL_ONLY_EXAM_CODES.includes(c)));

describe("the stage hubs on the sitemap (EXTRA_SITEMAP_PROVIDERS)", () => {
  it("rows = the indexable hubs exactly, by the page's own gate, with no lastModified", () => {
    const rows = stageHubSitemapEntries(BASE);
    const expected = STAGE_HUB_IDS.filter((id) => isStageHubIndexable(id === "after-10th" ? afterTenthModel(ALL_LIVE) : afterTwelfthModel(ALL_LIVE))).map((id) => `${BASE}/${id}`);
    expect(rows.map((r) => r.url)).toEqual(expected);
    // Both hubs clear the gate today (≥ 5 options with a page to open).
    expect(expected).toEqual([`${BASE}/after-10th`, `${BASE}/after-12th`]);
    for (const r of rows) {
      expect(r.lastModified).toBeUndefined();
      expect(r.url.startsWith(`${BASE}/schooling`)).toBe(false);
    }
  });

  it("the hub verdict does not depend on which exams are live (an option opens its own page, never an exam hub)", () => {
    for (const id of STAGE_HUB_IDS) {
      const none = stageHubMachineModel(id);
      const all = id === "after-10th" ? afterTenthModel(ALL_LIVE) : afterTwelfthModel(ALL_LIVE);
      expect(none.options.map((o) => o.href)).toEqual(all.options.map((o) => o.href));
      expect(isStageHubIndexable(none)).toBe(isStageHubIndexable(all));
      for (const o of none.options) if (o.href) expect(o.href, o.id).not.toMatch(/^\/exams\/[A-Z]/);
    }
    expect(indexableStageHubs().map((m) => m.path)).toEqual(stageHubSitemapEntries(BASE).map((r) => r.url.replace(BASE, "")));
  });

  it("is registered lazily in sitemap-sections.ts and reaches the extra sitemap", async () => {
    const src = read("src/lib/sitemap-sections.ts");
    expect(src).toContain('async (base) => (await import("@/lib/paths/path-sitemap")).stageHubSitemapEntries(base)');
    expect(src).not.toMatch(/^import .*paths\/path-sitemap/m);
    const urls = (await extraSitemapEntries(BASE)).map((e) => e.url);
    for (const r of stageHubSitemapEntries(BASE)) expect(urls).toContain(r.url);
    expect(EXTRA_SITEMAP_PROVIDERS.length).toBeGreaterThan(0);
  });
});

describe("the option pages after Class 10 — only through school/landings.ts", () => {
  it("schoolLandingSitemapEntries lists exactly the indexable option pages, with no lastModified", () => {
    const rows = schoolLandingSitemapEntries(EMPTY_SCHOOL_SURFACE, BASE).filter((r) => r.url.startsWith(`${BASE}/schooling/streams/`));
    expect(rows.map((r) => r.url)).toEqual(indexableStreamSlugs().map((s) => `${BASE}/schooling/streams/${s}`));
    expect(rows).toEqual(streamPageSitemapRows(BASE));
    for (const r of rows) expect(r.lastModified).toBeUndefined();
  });

  it("no noindex option page is ever listed", () => {
    const urls = new Set(schoolLandingSitemapEntries(EMPTY_SCHOOL_SURFACE, BASE).map((r) => r.url));
    for (const slug of STREAM_OPTION_SLUGS) {
      expect(urls.has(`${BASE}/schooling/streams/${slug}`), slug).toBe(isStreamPageIndexable(slug));
    }
    // Today every option clears its gate (two boards, or one official fact).
    expect(indexableStreamSlugs()).toEqual([...STREAM_OPTION_SLUGS]);
  });

  it("no other door lists them: the extra sitemap and sitemap.ts name no /schooling/streams/ URL", async () => {
    const extra = (await extraSitemapEntries(BASE)).map((e) => e.url);
    // (CBSE's board-exam hubs are /schooling URLs of the extra sitemap by design; no option page is.)
    expect(extra.some((u) => u.startsWith(`${BASE}/schooling/streams/`))).toBe(false);
    const sitemap = stripComments(read("src/app/sitemap.ts"));
    expect(sitemap).not.toContain("/schooling/streams/");
    expect(sitemap).not.toContain("path-sitemap");
    expect(sitemap).not.toMatch(/@\/data\/paths/);
    // landings.ts reads the page's own gate, never a typed list of slugs.
    const landings = stripComments(read("src/lib/school/landings.ts"));
    expect(landings).toContain("out.push(...streamPageSitemapRows(base));");
    for (const slug of STREAM_OPTION_SLUGS) expect(landings).not.toContain(`"${slug}"`);
  });
});

describe("IndexNow: only indexable life-stage pages and their context files", () => {
  it("lifeStageUrls = every indexable page, each with its context file", () => {
    const paths = lifeStageIndexablePaths();
    expect(paths).toEqual([...indexableStageHubs().map((m) => m.path), ...indexableStreamSlugs().map((s) => `/schooling/streams/${s}`)]);
    expect(lifeStageUrls()).toEqual(paths.flatMap((p) => [`${BASE}${p}`, `${BASE}${p}/context.md`]));
  });

  it("the section hubs and machine files carry the hubs while they are indexable", () => {
    for (const m of indexableStageHubs()) {
      expect(SECTION_HUB_PATHS).toContain(m.path);
      expect(MACHINE_FILE_PATHS).toContain(`${m.path}/context.md`);
    }
    expect(new Set(SECTION_HUB_PATHS).size).toBe(SECTION_HUB_PATHS.length);
    expect(new Set(MACHINE_FILE_PATHS).size).toBe(MACHINE_FILE_PATHS.length);
  });
});

describe("middleware: tagged landings, no twins (spec F7)", () => {
  const event = { waitUntil() {}, sourcePage: "" } as never;
  const CHROME = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
  const run = (url: string) => middleware(new NextRequest(url, { headers: new Headers({ "user-agent": CHROME }) }), event);

  it.each(["/after-10th", "/after-12th"])("%s runs the section rule: a ChatGPT arrival sets the attribution cookie", (p) => {
    expect(config.matcher).toContain(p);
    // …and its context file reaches the middleware too (AI-crawler logging).
    expect(config.matcher).toContain(`${p}/:path*`);
    const res = run(`${BASE}${p}?utm_source=chatgpt.com`);
    expect(res.cookies.get("shishya_attrib")).toBeDefined();
    expect(res.headers.get("location")).toBeNull();
  });

  it("an option page after Class 10 is under /schooling/:path* already", () => {
    expect(config.matcher).toContain("/schooling/:path*");
    expect(run(`${BASE}/schooling/streams/mpc-pcm?utm_source=chatgpt.com`).cookies.get("shishya_attrib")).toBeDefined();
  });

  it("no Hindi / Telugu twin: /hi/after-10th goes to the English page", () => {
    expect(TWIN_PUBLIC_RE.test("/after-10th")).toBe(false);
    expect(TWIN_PUBLIC_RE.test("/after-12th")).toBe(false);
    const res = run(`${BASE}/hi/after-10th`);
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/after-10th");
  });
});

describe("the counters (P1-D3): after 10th = school, after 12th = entrance", () => {
  it("learners by section: the hubs vote before the 'exploring' rules", () => {
    const sql = sectionCaseSql();
    expect(sql).toContain("WHEN sp ~ '^/(schooling|after-10th)(/|$)' THEN 'school'");
    expect(sql).toContain("WHEN sp ~ '^/after-12th(/|$)' THEN 'entrance'");
    expect(sql.indexOf("'^/after-12th(/|$)'")).toBeLessThan(sql.indexOf("THEN 'exploring'"));
    expect(sql.indexOf("'^/after-12th(/|$)'")).toBeLessThan(sql.indexOf("WHEN ecode IS NOT NULL"));
  });

  it("Pulse sign-ups by first page: the same rule, twins included", () => {
    const cats = new Map<string, string>();
    expect(pulseSectionOfPath("/after-10th", cats)).toBe("school");
    expect(pulseSectionOfPath("/after-12th?utm_source=chatgpt.com", cats)).toBe("entrance");
    expect(pulseSectionOfPath("/hi/after-12th", cats)).toBe("entrance");
    expect(pulseSectionOfPath("/schooling/streams/mpc-pcm", cats)).toBe("school");
    // Not a prefix match: a different page stays where it was.
    expect(pulseSectionOfPath("/after-10th-something", cats)).toBe("other");
  });
});

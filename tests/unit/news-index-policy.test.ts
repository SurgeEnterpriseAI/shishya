// News permalinks and Google (26 Sep 2026, G1 index hygiene) —
// src/lib/news-index-policy.ts and its wiring in the permalink page, the
// sitemap and /sitemap-news.xml. Pure helpers + source pins; no DB.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  GOOGLE_ONLY_NOINDEX,
  INDEX_EVERYWHERE,
  NEWS_DUPLICATE_MAX_SPAN_DAYS,
  NEWS_GOOGLE_NOINDEX,
  newsCanonicalId,
  newsCanonicalMap,
  newsInMainSitemap,
  newsRobots,
  normaliseNewsTitle,
  selfCanonicalNewsRows,
  type NewsCanonicalRow,
} from "@/lib/news-index-policy";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
function stripComments(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const DAY = 86_400_000;
const T0 = Date.parse("2026-08-01T06:00:00Z");
const row = (id: string, title: string, day: number, o: { archived?: boolean; url?: string | null } = {}): NewsCanonicalRow => ({
  id,
  title,
  publishedAt: new Date(T0 + day * DAY),
  archivedAt: o.archived ? new Date(T0 + (day + 1) * DAY) : null,
  url: o.url ?? null,
});

describe("the founder flag and the robots it sets", () => {
  it("is on by default, pending the founder's approval before deploy", () => {
    expect(NEWS_GOOGLE_NOINDEX).toBe(false); // 27 Sep 2026: off pending the founder's decision
    const src = read("src/lib/news-index-policy.ts");
    expect(src).toMatch(/FOUNDER APPROVAL REQUIRED BEFORE DEPLOY/);
    // Both Google numbers the founder decides on (the quality critic's note).
    expect(src).toMatch(/280 Google first landings in July 2026, 15 in August and\s*\n\/\/ 3 in September \(297 in 90 days/);
  });

  it("flag on: Google alone gets noindex,follow — every other engine keeps index,follow", () => {
    expect(newsRobots(true)).toEqual({ index: true, follow: true, googleBot: { index: false, follow: true } });
    expect(newsRobots(true)).toBe(GOOGLE_ONLY_NOINDEX);
    expect(newsInMainSitemap(true)).toBe(false);
  });

  it("flag off: index,follow everywhere and back in /sitemap.xml (today's behaviour)", () => {
    expect(newsRobots(false)).toEqual({ index: true, follow: true });
    expect(newsRobots(false)).toBe(INDEX_EVERYWHERE);
    expect(newsRobots(false)).not.toHaveProperty("googleBot");
    expect(newsInMainSitemap(false)).toBe(true);
  });

  it("the default follows the flag", () => {
    expect(newsRobots()).toBe(newsRobots(NEWS_GOOGLE_NOINDEX));
    expect(newsInMainSitemap()).toBe(!NEWS_GOOGLE_NOINDEX);
  });
});

describe("duplicate-title canonicals", () => {
  it("normalises case and whitespace only", () => {
    expect(normaliseNewsTitle("  CTET  Result\tDeclared \n")).toBe("ctet result declared");
    expect(normaliseNewsTitle("CTET result declared!")).not.toBe(normaliseNewsTitle("CTET result declared"));
  });

  it("a unique title is self-canonical; an empty title never groups", () => {
    const rows = [row("a", "SSC CGL Tier 1 admit card out", 0), row("b", "SSC CGL answer key out", 1), row("c", "   ", 2), row("d", "", 3)];
    expect(newsCanonicalMap(rows).size).toBe(0);
    expect(newsCanonicalId("a", rows)).toBe("a");
  });

  it("targets the earliest LIVE row with an official citation", () => {
    const rows = [
      row("old", "UPSC CSE prelims result declared", 0, { archived: true, url: "https://upsc.gov.in/x" }),
      row("live-coaching", "UPSC CSE Prelims Result Declared", 3, { url: "https://testbook.com/x" }),
      row("live-official", "UPSC  CSE prelims result declared", 5, { url: "https://upsc.gov.in/y" }),
      row("live-official-2", "upsc cse prelims result declared", 7, { url: "https://www.upsc.gov.in/z" }),
    ];
    const m = newsCanonicalMap(rows);
    expect(m.get("old")).toBe("live-official");
    expect(m.get("live-coaching")).toBe("live-official");
    expect(m.get("live-official-2")).toBe("live-official");
    expect(m.has("live-official")).toBe(false);
  });

  it("the exam's own portal counts as official; a denylisted host never does", () => {
    const rows = [
      row("a", "MPESB RAEO admit card released", 0, { url: "https://sarkariresult.com.cm/raeo" }),
      row("b", "MPESB RAEO admit card released", 2, { url: "https://esb.mp.gov.in/raeo" }),
    ];
    expect(newsCanonicalId("a", rows)).toBe("b");
    const portal = [
      row("a", "IBPS PO result out", 0, { url: "https://coaching.example.com/x" }),
      row("b", "IBPS PO result out", 1, { url: "https://www.examportal.co/notice" }),
    ];
    expect(newsCanonicalId("a", portal, "https://examportal.co")).toBe("b");
    expect(newsCanonicalId("b", portal)).toBe("a"); // without the portal, neither is official → earliest live
  });

  it("with no official live row: the earliest live row — a live story is never pointed at an archived one", () => {
    const rows = [
      row("archived-first", "CTET admit card released", 0, { archived: true }),
      row("live-1", "CTET admit card released", 4, { url: "https://testbook.com/ctet" }),
      row("live-2", "CTET admit card released", 6),
    ];
    const m = newsCanonicalMap(rows);
    expect(m.get("archived-first")).toBe("live-1");
    expect(m.get("live-2")).toBe("live-1");
    expect(m.has("live-1")).toBe(false);
  });

  it("with every copy archived: the earliest row", () => {
    const rows = [row("b", "JEE Main session 2 dates out", 3, { archived: true }), row("a", "JEE Main session 2 dates out", 1, { archived: true })];
    expect(newsCanonicalId("b", rows)).toBe("a");
    expect(newsCanonicalId("a", rows)).toBe("a");
  });

  it("a group spanning more than 60 days keeps every row self-canonical (a different cycle's story)", () => {
    expect(NEWS_DUPLICATE_MAX_SPAN_DAYS).toBe(60);
    const wide = [row("a", "CGPSC result declared", 0, { archived: true }), row("b", "CGPSC result declared", 61)];
    expect(newsCanonicalMap(wide).size).toBe(0);
    const edge = [row("a", "CGPSC result declared", 0, { archived: true }), row("b", "CGPSC result declared", 60)];
    expect(newsCanonicalId("a", edge)).toBe("b");
  });

  // 27 Sep 2026 (integration): a sitemap lists canonical permalinks only.
  it("selfCanonicalNewsRows drops the copies, keeps the row they point at, and groups per exam", () => {
    const e1 = (r: NewsCanonicalRow) => ({ ...r, examId: "e1" });
    const e2 = (r: NewsCanonicalRow) => ({ ...r, examId: "e2" });
    const rows = [
      e1(row("a", "CTET admit card released", 0, { archived: true })),
      e1(row("b", "CTET admit card released", 4)),
      e1(row("c", "CTET admit card released", 6)),
      e1(row("u", "CTET answer key out", 8)),
      // Same title in another exam: a different story, never grouped with e1.
      e2(row("x", "CTET admit card released", 1)),
    ];
    const kept = selfCanonicalNewsRows(rows).map((r) => r.id);
    expect(kept).toEqual(["b", "u", "x"]);
    // Every dropped row's canonical target is kept.
    for (const [copy, target] of newsCanonicalMap(rows.filter((r) => r.examId === "e1"))) {
      expect(kept).not.toContain(copy);
      expect(kept).toContain(target);
    }
  });

  it("selfCanonicalNewsRows reads the exam's portal as the page does", () => {
    const rows = [
      { ...row("a", "IBPS PO result out", 0, { url: "https://coaching.example.com/x" }), examId: "ibps" },
      { ...row("b", "IBPS PO result out", 1, { url: "https://www.examportal.co/notice" }), examId: "ibps" },
    ];
    expect(selfCanonicalNewsRows(rows).map((r) => r.id)).toEqual(["a"]);
    expect(selfCanonicalNewsRows(rows, new Map([["ibps", "https://examportal.co"]])).map((r) => r.id)).toEqual(["b"]);
  });

  it("the pick never depends on read order (ties broken by id)", () => {
    const rows = [row("z", "NEET UG counselling round 1", 2), row("m", "NEET UG counselling round 1", 2), row("q", "NEET UG counselling round 1", 2)];
    const a = newsCanonicalMap(rows);
    const b = newsCanonicalMap([...rows].reverse());
    expect([...a.entries()].sort()).toEqual([...b.entries()].sort());
    expect(a.get("z")).toBe("m");
  });
});

describe("wiring", () => {
  const page = stripComments(read("src/app/exams/[code]/news/[id]/page.tsx"));

  it("the permalink page reads its robots from the flag and its canonical from the per-exam map", () => {
    expect(page).toMatch(/robots: newsRobots\(\),/);
    expect(page).not.toMatch(/robots: \{ index: true, follow: true \}/);
    expect(page).toMatch(/const canonical = `https:\/\/shishya\.in\/exams\/\$\{code\}\/news\/\$\{canonicals\[id\] \?\? id\}`;/);
    expect(page).toMatch(/alternates: \{ canonical \}/);
    expect(page).toMatch(/newsCanonicalMap\(rows, elig\?\.officialUrl \?\? null\)/);
    expect(page).toMatch(/unstable_cache\(/);
  });

  it("Article with author + publisher = the Organization node; dateModified is publishedAt, never archivedAt", () => {
    expect(page).toMatch(/"@type": "Article",/);
    expect(page).not.toMatch(/"@type": "NewsArticle"/);
    expect(page).toMatch(/author: SHISHYA_ORG_REF,/);
    expect(page).toMatch(/publisher: SHISHYA_ORG_REF,/);
    expect(page).toMatch(/dateModified: row\.publishedAt\.toISOString\(\),/);
    expect(page).not.toMatch(/archivedAt \?\? row\.publishedAt/);
  });

  it("sitemap.ts lists news only when the flag is off, with lastmod publishedAt; results are their own family", () => {
    const sm = stripComments(read("src/app/sitemap.ts"));
    expect(sm).toMatch(/const newsItems = newsInMainSitemap\(\)\s*\?/);
    expect(sm).toMatch(/lastModified: n\.publishedAt \?\? n\.createdAt,/);
    expect(sm).not.toMatch(/n\.archivedAt \?\? n\.publishedAt/);
    expect(sm).toMatch(/\.\.\.resultUrls,/);
    expect(sm).not.toMatch(/newsUrls\.push\(/);
  });

  it("both sitemaps list canonical permalinks only (27 Sep 2026, integration)", () => {
    const route = stripComments(read("src/app/sitemap-news.xml/route.ts"));
    expect(route).toMatch(/selfCanonicalNewsRows\(rows, officialUrlByExam\)/);
    expect(route).toMatch(/listed\.map\(/);
    const sm = stripComments(read("src/app/sitemap.ts"));
    expect(sm).toMatch(/selfCanonicalNewsRows\(newsItems, newsOfficialUrls\)/);
    expect(sm).toMatch(/const newsUrls: MetadataRoute\.Sitemap = newsListed\.map\(/);
  });

  it("/sitemap-news.xml serves the permalinks and is named neither in robots.txt nor in /sitemap.xml", () => {
    const route = stripComments(read("src/app/sitemap-news.xml/route.ts"));
    expect(route).toMatch(/newsSitemapXml\(/);
    expect(route).toMatch(/source: \{ not: SUPPRESSED_SOURCE \}/);
    expect(route).toMatch(/exam: REAL_EXAM_WHERE/);
    expect(stripComments(read("src/app/robots.ts"))).not.toMatch(/sitemap-news/);
    expect(stripComments(read("src/app/sitemap.ts"))).not.toMatch(/sitemap-news/);
  });
});

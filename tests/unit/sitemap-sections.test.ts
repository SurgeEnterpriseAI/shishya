// Sitemap XML builders (26 Sep 2026, G1 index hygiene) —
// src/lib/sitemap-sections.ts, the body of /sitemap-news.xml. Pure; no DB.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  EXTRA_SITEMAP_PROVIDERS,
  SITEMAP_URL_CAP,
  dedupeSitemap,
  extraSitemapEntries,
  newsSitemapXml,
  urlsetXml,
  xmlEscape,
} from "@/lib/sitemap-sections";

describe("urlsetXml", () => {
  it("a valid <urlset>: absolute URLs, escaped, first occurrence only, lastmod only from a real date", () => {
    const xml = urlsetXml([
      { url: "https://shishya.in/a?x=1&y=<2>", lastModified: new Date("2026-09-20T05:00:00Z") },
      { url: "https://shishya.in/a?x=1&y=<2>", lastModified: new Date("2026-09-21T05:00:00Z") },
      { url: "/relative", lastModified: new Date("2026-09-20T05:00:00Z") },
      { url: "https://shishya.in/b", lastModified: null },
      { url: "https://shishya.in/c", lastModified: "not a date" },
      { url: "https://shishya.in/d", lastModified: "2026-09-19T00:00:00.000Z" },
    ]);
    expect(xml).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        "<url><loc>https://shishya.in/a?x=1&amp;y=&lt;2&gt;</loc><lastmod>2026-09-20T05:00:00.000Z</lastmod></url>",
        "<url><loc>https://shishya.in/b</loc></url>",
        "<url><loc>https://shishya.in/c</loc></url>",
        "<url><loc>https://shishya.in/d</loc><lastmod>2026-09-19T00:00:00.000Z</lastmod></url>",
        "</urlset>",
      ].join("\n"),
    );
  });

  it("never more than the protocol cap in one file", () => {
    expect(SITEMAP_URL_CAP).toBe(50_000);
    const many = Array.from({ length: SITEMAP_URL_CAP + 5 }, (_, i) => ({ url: `https://shishya.in/n/${i}` }));
    const xml = urlsetXml(many);
    expect(xml.match(/<url>/g)).toHaveLength(SITEMAP_URL_CAP);
  });

  it("an empty list is still a valid, empty urlset (the failed-read fallback)", () => {
    expect(urlsetXml([])).toBe('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>');
  });

  it("xmlEscape covers the five XML entities", () => {
    expect(xmlEscape(`&<>'"`)).toBe("&amp;&lt;&gt;&apos;&quot;");
  });
});

describe("newsSitemapXml — /sitemap-news.xml", () => {
  it("one permalink per row, lastmod = publishedAt", () => {
    const xml = newsSitemapXml(
      [
        { code: "SSC_CGL", id: "cmabc123", publishedAt: new Date("2026-09-01T04:30:00Z") },
        { code: "UPSC_CSE", id: "cmdef456", publishedAt: null },
      ],
      "https://shishya.in",
    );
    expect(xml).toContain("<url><loc>https://shishya.in/exams/SSC_CGL/news/cmabc123</loc><lastmod>2026-09-01T04:30:00.000Z</lastmod></url>");
    expect(xml).toContain("<url><loc>https://shishya.in/exams/UPSC_CSE/news/cmdef456</loc></url>");
    expect(xml.match(/<url>/g)).toHaveLength(2);
  });
});

describe("the extension point for other groups' families", () => {
  // 27 Sep 2026 (integration): the wave's six new families are registered;
  // their output is pinned in tests/unit/sitemap-families.test.ts (DB mocked).
  it("registers the six new families, each imported lazily (no DB import at load)", () => {
    expect(EXTRA_SITEMAP_PROVIDERS).toHaveLength(6);
    const src = fs.readFileSync(path.resolve(__dirname, "../../src/lib/sitemap-sections.ts"), "utf8");
    for (const m of ["scholarship-lists", "board-exams", "exam-categories", "exam-qualification", "mock-catalogue", "db/mock-catalogue-db", "subject-hubs", "db/subject-hubs-db"]) {
      expect(src, m).toContain(`import("@/lib/${m}")`);
    }
    expect(src).not.toMatch(/^import .*(prisma|\/db\/)/m);
  });

  it("collects every provider's entries; a provider that throws contributes nothing", async () => {
    const out = await extraSitemapEntries("https://shishya.in", [
      (b) => [{ url: `${b}/exams/category/banking` }],
      async (b) => [{ url: `${b}/scholarships/for/girls`, lastModified: new Date("2026-09-20T00:00:00Z") }],
      () => {
        throw new Error("Neon hiccup");
      },
      async () => Promise.reject(new Error("timeout")),
    ]);
    expect(out.map((e) => e.url)).toEqual(["https://shishya.in/exams/category/banking", "https://shishya.in/scholarships/for/girls"]);
    expect(await extraSitemapEntries("https://shishya.in", [])).toEqual([]);
  });

  it("dedupeSitemap keeps the first family's entry for a URL, in order", () => {
    const out = dedupeSitemap([
      { url: "https://shishya.in/a", priority: 0.9 },
      { url: "https://shishya.in/b" },
      { url: "https://shishya.in/a", priority: 0.1 },
    ]);
    expect(out).toEqual([{ url: "https://shishya.in/a", priority: 0.9 }, { url: "https://shishya.in/b" }]);
  });

  it("sitemap.ts spreads the extra families last and de-duplicates the whole list", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../../src/app/sitemap.ts"), "utf8").replace(/\r\n/g, "\n");
    expect(src).toMatch(/const extraUrls: MetadataRoute\.Sitemap = await extraSitemapEntries\(base\);/);
    expect(src).toMatch(/return dedupeSitemap\(\[/);
    expect(src).toMatch(/\.\.\.userProfileUrls,\n\s*\.\.\.extraUrls,\n\s*\]\);/);
  });
});

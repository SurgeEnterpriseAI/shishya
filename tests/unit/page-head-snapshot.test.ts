// src/lib/page-head-snapshot.ts (27 Sep 2026, cache wave 2): the byte-for-byte
// before/after read that scripts/cache-check.ts runs around a caching change.
// Pinned: tags are read wherever they sit (a per-request render streams
// metadata after </head>, a cached one has it in <head>), nothing inside an
// inline script is taken for a tag, and every change a crawler could see —
// canonical, hreflang, robots, title, description, JSON-LD, body text — is
// reported.

import { describe, it, expect } from "vitest";
import {
  CACHE_CHECK_UA,
  cacheableByHeader,
  compareSnapshots,
  extractHeadSnapshot,
  mainVisibleText,
  summarizeSnapshot,
} from "@/lib/page-head-snapshot";
import { aiBotName } from "@/middleware";

const TAGS = [
  `<meta charSet="utf-8"/>`,
  `<title>SSC CGL Syllabus 2026 | Shishya</title>`,
  `<meta name="description" content="SSC CGL syllabus: 4 subjects &amp; 120 topics."/>`,
  `<link rel="canonical" href="https://shishya.in/exams/SSC_CGL/syllabus"/>`,
  `<meta property="og:locale" content="en_IN"/>`,
].join("");
const LD = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","inLanguage":"en-IN"}</script>`;
const MAIN = `<main class="min-h-screen">${LD}<h1>SSC CGL Syllabus 2026 — every subject &amp; topic</h1><p>Quantitative <b>Aptitude</b></p></main>`;

/** A cached (blocking-metadata) render: tags in <head>. */
const cached = `<!DOCTYPE html><html lang="en"><head>${TAGS}</head><body><header><svg><title>menu</title></svg></header>${MAIN}<script>self.__next_f.push([1,"<title>not a tag</title><meta name=\\"robots\\" content=\\"noindex\\"/>"])</script></body></html>`;
/** The same page streamed to a non-bot UA: metadata after </head>, inside a hidden div. */
const streamed = `<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/></head><body><header><svg><title>menu</title></svg></header>${MAIN}<div hidden id="S:0">${TAGS.replace(`<meta charSet="utf-8"/>`, "")}</div><script>$RC("B:0","S:0")</script></body></html>`;

describe("extractHeadSnapshot", () => {
  it("reads the crawler-facing tags, raw, in document order", () => {
    const s = extractHeadSnapshot(cached);
    expect(s.htmlLang).toBe("en");
    expect(s.titles).toEqual(["SSC CGL Syllabus 2026 | Shishya"]);
    expect(s.metas).toEqual([
      `<meta name="description" content="SSC CGL syllabus: 4 subjects &amp; 120 topics."/>`,
      `<meta property="og:locale" content="en_IN"/>`,
    ]);
    expect(s.links).toEqual([`<link rel="canonical" href="https://shishya.in/exams/SSC_CGL/syllabus"/>`]);
    expect(s.jsonLd).toEqual([`{"@context":"https://schema.org","@type":"Article","inLanguage":"en-IN"}`]);
    expect(s.mainText).toBe("SSC CGL Syllabus 2026 — every subject &amp; topic Quantitative Aptitude");
  });

  it("never takes a string inside an inline script, or an icon's <svg><title>, for a tag", () => {
    const s = extractHeadSnapshot(cached);
    expect(s.titles).not.toContain("not a tag");
    expect(s.titles).not.toContain("menu");
    expect(s.metas.some((m) => m.includes("noindex"))).toBe(false);
  });

  it("streamed and blocking metadata compare equal: placement is not a change", () => {
    // The charset meta has no name/property, so it is not collected either way.
    expect(compareSnapshots(extractHeadSnapshot(cached), extractHeadSnapshot(streamed))).toEqual([]);
  });
});

describe("compareSnapshots reports every change a crawler could see", () => {
  const before = extractHeadSnapshot(cached);

  it("a canonical that moved (the twin gate's output)", () => {
    const after = extractHeadSnapshot(
      cached.replace("https://shishya.in/exams/SSC_CGL/syllabus", "https://shishya.in/hi/exams/SSC_CGL/syllabus"),
    );
    const d = compareSnapshots(before, after);
    expect(d.map((x) => x.field)).toEqual(["links"]);
    expect(d[0].removed[0]).toContain('href="https://shishya.in/exams/SSC_CGL/syllabus"');
    expect(d[0].added[0]).toContain('href="https://shishya.in/hi/exams/SSC_CGL/syllabus"');
  });

  it("an hreflang block that appeared, and a robots line", () => {
    const after = extractHeadSnapshot(
      cached.replace(
        "</head>",
        `<link rel="alternate" hrefLang="hi-IN" href="https://shishya.in/hi/exams/SSC_CGL/syllabus"/><meta name="robots" content="noindex, follow"/></head>`,
      ),
    );
    const d = compareSnapshots(before, after);
    expect(d.map((x) => x.field)).toEqual(["metas", "links"]);
    expect(d[0].added).toEqual([`<meta name="robots" content="noindex, follow"/>`]);
    expect(d[1].added[0]).toContain('hrefLang="hi-IN"');
    const sum = summarizeSnapshot(after);
    expect(sum.hreflang).toEqual([{ lang: "hi-IN", href: "https://shishya.in/hi/exams/SSC_CGL/syllabus" }]);
    expect(sum.robots).toEqual(["robots: noindex, follow"]);
  });

  it("a title, a description, <html lang> and a JSON-LD change", () => {
    const after = extractHeadSnapshot(
      cached
        .replace("SSC CGL Syllabus 2026 | Shishya", "SSC CGL Syllabus 2027 | Shishya")
        .replace("4 subjects", "5 subjects")
        .replace('<html lang="en">', '<html lang="hi">')
        .replace('"inLanguage":"en-IN"', '"inLanguage":"hi-IN"'),
    );
    expect(compareSnapshots(before, after).map((x) => x.field)).toEqual(["htmlLang", "titles", "metas", "jsonLd"]);
  });

  it("the same tags in another order are a difference (a crawler reads the first canonical)", () => {
    const two = `<link rel="canonical" href="https://a/"/><link rel="canonical" href="https://b/"/>`;
    const swapped = `<link rel="canonical" href="https://b/"/><link rel="canonical" href="https://a/"/>`;
    const d = compareSnapshots(
      extractHeadSnapshot(`<html><head>${two}</head></html>`),
      extractHeadSnapshot(`<html><head>${swapped}</head></html>`),
    );
    expect(d.map((x) => x.field)).toEqual(["links"]);
  });

  it("body text: the window around the first differing character", () => {
    const after = extractHeadSnapshot(cached.replace("Quantitative <b>Aptitude</b>", "Quantitative <b>Reasoning</b>"));
    const d = compareSnapshots(before, after);
    expect(d.map((x) => x.field)).toEqual(["mainText"]);
    expect(d[0].removed[0]).toContain("Aptitude");
    expect(d[0].added[0]).toContain("Reasoning");
    expect(d[0].removed[0]).toMatch(/^@\d+: …/);
  });

  it("no difference, no report", () => {
    expect(compareSnapshots(before, extractHeadSnapshot(cached))).toEqual([]);
  });
});

describe("mainVisibleText", () => {
  it("drops scripts, styles, templates and comments; null without a <main>", () => {
    expect(mainVisibleText(`<main><style>.a{}</style><template id="B:0"><p>x</p></template><!-- c --><p>A</p>\n  <p>B</p></main>`)).toBe("A B");
    expect(mainVisibleText(`<div>no main</div>`)).toBeNull();
  });
});

describe("cacheableByHeader", () => {
  it("private or no-store is not cacheable; the ISR header is", () => {
    expect(cacheableByHeader("private, no-cache, no-store, max-age=0, must-revalidate")).toBe(false);
    expect(cacheableByHeader("public, max-age=0, must-revalidate")).toBe(true);
    expect(cacheableByHeader("s-maxage=600, stale-while-revalidate=31535400")).toBe(true);
    expect(cacheableByHeader(null)).toBe(false);
  });
});

describe("the checker's user agent", () => {
  it("is not a crawler the middleware logs to BotVisit, and names no search engine", () => {
    expect(aiBotName(CACHE_CHECK_UA)).toBeNull();
    expect(CACHE_CHECK_UA).not.toMatch(/google|bing|bot\b|crawler|spider|slurp|gpt|claude|perplexity/i);
  });
});

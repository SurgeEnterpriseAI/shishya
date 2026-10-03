// Notes renderer: the cases the 3 Oct 2026 crawl audit found printed raw
// (fix plan C6, PTF-1B / PTF-1C).
//
// a. Bold inside italic: "*He **don't** know the answer.*" printed
//    "<em>He *</em>don't** know the answer.*" (13 topic notes, 2 Hindi).
// b. "• " lines are a bullet list (99 topic notes, 16 Hindi, 5 tricks printed
//    them joined into one paragraph).
// c. An unpaired "**" (a text cut off mid-bold) is not printed; "2**3" stays.
// d. The insights articles render through the same renderer, so their pipe
//    tables are tables (11 of 23 printed "| Metric | … |" as text).
// Pure: no DB, no network. The page wiring is checked on its source.
// Run: npx vitest run tests/unit/notes-markdown-cases.test.ts

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { inlineHtml, notesMarkdownHtml } from "@/lib/notes-markdown";
import { INSIGHTS_ARTICLES } from "@/data/insights-articles";

describe("inline cases", () => {
  it("bold inside italic is bold inside the italic span", () => {
    expect(inlineHtml("*He **don't** know the answer.*")).toBe("<em>He <strong>don&#39;t</strong> know the answer.</em>");
    expect(inlineHtml("**Example 1**: *She is **the** best player.*")).toBe(
      "<strong>Example 1</strong>: <em>She is <strong>the</strong> best player.</em>",
    );
  });

  it("an unpaired '**' is not printed", () => {
    const out = inlineHtml("E xploitation (against), **");
    expect(out).not.toContain("*");
    expect(out).toBe("E xploitation (against), ");
    expect(inlineHtml("**Distance Formula")).toBe("Distance Formula");
    expect(inlineHtml("**Hands at 90°:** 22 times; Hands at 180° in 12 hours:** 11 times.")).toBe(
      "<strong>Hands at 90°:</strong> 22 times; Hands at 180° in 12 hours: 11 times.",
    );
  });

  it("arithmetic stays as typed", () => {
    expect(inlineHtml("2**3 = 8 and 2 * 3 * 4")).toBe("2**3 = 8 and 2 * 3 * 4");
    expect(inlineHtml("**bold** and *italic* and `code` and snake_case_words")).toBe(
      "<strong>bold</strong> and <em>italic</em> and <code>code</code> and snake_case_words",
    );
  });
});

describe("block cases", () => {
  it("a run of '• ' lines is one <ul> with one <li> per line", () => {
    const html = notesMarkdownHtml("Intro\n\n• **ISRO** — space agency\n• **DRDO** — defence\n\nAfter");
    expect(html).toBe(
      "<p>Intro</p>\n<ul><li><strong>ISRO</strong> — space agency</li><li><strong>DRDO</strong> — defence</li></ul>\n<p>After</p>",
    );
    expect((html.match(/<ul>/g) ?? []).length).toBe(1);
    expect((html.match(/<li>/g) ?? []).length).toBe(2);
    expect(html).not.toContain("•");
  });

  it("### heading, a bold line, a rule and a spaced numbered list each render as themselves", () => {
    const html = notesMarkdownHtml("### A\n**B**\n\n---\n\n1. x\n\n2. y", { demoteH1: true });
    expect((html.match(/<h3>/g) ?? []).length).toBe(1);
    expect(html).toContain("<h3>A</h3>");
    expect(html).toContain("<p><strong>B</strong></p>");
    expect((html.match(/<hr>/g) ?? []).length).toBe(1);
    expect((html.match(/<ol>/g) ?? []).length).toBe(1);
    expect((html.match(/<li>/g) ?? []).length).toBe(2);
    expect(html).not.toContain("###");
    expect(html).not.toContain("**");
  });
});

describe("insights articles", () => {
  const WITH_TABLES = [
    "ssc-cgl-vs-chsl-salary-and-career",
    "jee-main-january-vs-april-strategy",
    "uppsc-pcs-vs-upsc-cse-which-to-target-first",
    "sbi-po-vs-ibps-po-salary-prestige-effort",
    "mbbs-abroad-vs-indian-honest-comparison",
    "gate-for-iit-mtech-vs-psu-recruitment",
    "tamil-nadu-government-jobs-2026",
    "bihar-police-salary-chart-2026",
    "maharashtra-government-job-salary-structure",
    "up-government-jobs-after-class-12",
    "karnataka-government-recruitment-by-department",
  ];

  it("no article body renders a paragraph that starts with a pipe", () => {
    expect(INSIGHTS_ARTICLES.length).toBeGreaterThan(0);
    for (const a of INSIGHTS_ARTICLES) {
      const html = notesMarkdownHtml(a.body);
      expect(html, a.slug).not.toMatch(/<p>\s*\|/);
      expect(html, a.slug).not.toContain("| --- |");
    }
  });

  it("the 11 articles with tables each render a <table>", () => {
    for (const slug of WITH_TABLES) {
      const a = INSIGHTS_ARTICLES.find((x) => x.slug === slug);
      expect(a, slug).toBeDefined();
      expect(notesMarkdownHtml(a!.body), slug).toContain("<table>");
    }
  });

  it("no wrapped continuation line starts with '+ ', '* ' or '• ' (it would render as a new bullet)", () => {
    // 3 Oct 2026 review: "Canadian\n  + Australian universities …" and "advisory\n  + IFRS-specialist
    // roles immune" rendered as nested bullets and split their sentences; the "+" now ends the line before.
    for (const a of INSIGHTS_ARTICLES) {
      const bad = a.body.split(/\r?\n/).filter((l) => /^\s+[+*•]\s/.test(l));
      expect(bad, a.slug).toEqual([]);
    }
    const html = (slug: string) => notesMarkdownHtml(INSIGHTS_ARTICLES.find((x) => x.slug === slug)!.body);
    expect(html("indian-students-abroad-shift")).toContain("Canadian + Australian universities have explicit");
    expect(html("ai-disruption-indian-careers-2030")).toContain("tax strategy + advisory + IFRS-specialist roles immune.");
  });

  it("the insights page draws its body with NotesMarkdown (rich); the local renderer is gone", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "src/app/insights/[slug]/page.tsx"), "utf8");
    expect(page).toContain("<NotesMarkdown markdown={a.body} rich />");
    expect(page).not.toContain("function Markdown(");
    expect(page).not.toContain("function InlineMd(");
  });
});

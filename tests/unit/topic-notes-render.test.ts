// Topic notes render as notes (26 Sep 2026, discoverability wave 2 G3).
//
// The topic page's local renderer knew "## ", "# " and "- " only: on prod
// (4,469 notes) every note opens with "# " (a second <h1>), 3,280 carry a GFM
// table, 2,312 an ordered list, 1,437 "### " headings and 2,963 *italic*
// spans — all printed raw, "**" and "|---|" included. The page now renders
// through src/components/NotesMarkdown (rich + demoteH1), whose HTML comes
// from src/lib/notes-markdown.ts. Pure (vitest cannot import TSX here, so
// the component wiring is checked on its source). No DB, no network.
// Run: npx vitest run tests/unit/topic-notes-render.test.ts

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { inlineHtml, notesMarkdownHtml } from "@/lib/notes-markdown";

// The real note shape (a MAHA TET history note, 26 Sep read): a "# " title,
// six "## " sections, "---" rules, bold bullets, a GFM table, "### "
// sub-heads, numbered lists (one spaced by blank lines), *italic*, `code`.
const NOTE = `# Harappan and Vedic Civilisations

## Overview

The Harappan (Indus Valley) and Vedic civilisations form the **foundational chapters** of Indian history.

---

## Key Concepts

- **Harappan civilisation (c. 2600–1900 BCE)** was a Bronze Age urban civilisation.
- **Town planning** was the hallmark — grid streets, burnt-brick buildings.
  - Citadel and Lower Town

---

## Formulas / Key Facts

| Aspect | Harappan Civilisation | Vedic Civilisation |
|--------|:---------------------:|-------------------:|
| **Period** | c. 2600–1900 BCE | c. 1500–600 BCE |
| **Source** | Archaeology (sites, artefacts) | Literature (Vedas) |

### Must-Remember Site Details

1. **Mohenjo-daro** (Sindh) — Great Bath, granary.
2. **Harappa** (Punjab, Pakistan) — First discovered site (1921).
3. **Lothal** (Gujarat) — Dockyard.

## Worked Examples

### Example 1: Site Identification

**Question:** Which Harappan site has a dockyard?

**Solution:**
- Dockyard evidence → Lothal.
- **Answer: Lothal**

## Common Mistakes

1. **Confusing Mohenjo-daro and Harappa** — *Correct:* the Great Bath is at Mohenjo-daro.

2. **Assuming Harappans used iron** — iron is a Later Vedic introduction; see \`iron-age\`.

3. **Believing the script has been read** — it remains undeciphered.

## Quick Revision

Remember <script>alert(1)</script> is text here, and 2 * 3 * 4 is arithmetic, and snake_case_words stay whole.
`;

const html = notesMarkdownHtml(NOTE, { demoteH1: true });

describe("notesMarkdownHtml — the real note shape", () => {
  it("no literal '**', a <table>, an <ol>, and no <h1>", () => {
    expect(html).not.toContain("**");
    expect(html).toContain("<table>");
    expect(html).toContain("<ol>");
    expect(html).not.toMatch(/<h1[\s>]/);
  });

  it("the note's '# ' title is an <h2>; six '## ' sections and '### ' sub-heads render", () => {
    expect(html).toContain("<h2>Harappan and Vedic Civilisations</h2>");
    expect((html.match(/<h2>/g) ?? []).length).toBe(7);
    expect(html).toContain("<h3>Must-Remember Site Details</h3>");
    expect(html).toContain("<h3>Example 1: Site Identification</h3>");
    expect(html).not.toMatch(/(^|>)#{1,6} /m);
  });

  it("the table has a head, a body, alignment and inline bold; a phone scrolls the table, not the page", () => {
    expect(html).toContain('<div class="overflow-x-auto"><table><thead><tr><th>Aspect</th><th style="text-align:center">Harappan Civilisation</th><th style="text-align:right">Vedic Civilisation</th></tr></thead>');
    expect(html).toContain("<td><strong>Period</strong></td>");
    expect(html).not.toContain("|---");
    expect(html).not.toContain("| ");
  });

  it("numbered items spaced by blank lines stay ONE list; a nested bullet nests", () => {
    const mistakes = html.slice(html.indexOf("<h2>Common Mistakes</h2>"));
    expect((mistakes.match(/<ol>/g) ?? []).length).toBe(1);
    expect((mistakes.slice(0, mistakes.indexOf("</ol>")).match(/<li>/g) ?? []).length).toBe(3);
    expect(html).toContain("<ul><li>Citadel and Lower Town</li></ul>");
  });

  it("italic, code, rules", () => {
    expect(html).toContain("<em>Correct:</em>");
    expect(html).toContain("<code>iron-age</code>");
    expect(html).toContain("<hr>");
    expect(html).toContain("2 * 3 * 4 is arithmetic");
    expect(html).toContain("snake_case_words stay whole");
  });

  it("no raw HTML from a note reaches the page", () => {
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(inlineHtml('a "quote" & <b>')).toBe("a &quot;quote&quot; &amp; &lt;b&gt;");
    expect(inlineHtml("[site](javascript:alert(1))")).not.toContain("<a ");
    expect(inlineHtml("[NTA](https://nta.ac.in/x)")).toBe('<a href="https://nta.ac.in/x" rel="nofollow noopener" target="_blank">NTA</a>');
  });

  it("without demoteH1 the '# ' heading stays an <h1> (other callers unchanged)", () => {
    expect(notesMarkdownHtml("# Title\n\nText")).toBe("<h1>Title</h1>\n<p>Text</p>");
  });
});

describe("wiring", () => {
  const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

  it("the topic page renders its notes through NotesMarkdown (rich, demoteH1); the local renderer is gone", () => {
    const page = read("src/app/exams/[code]/topics/[topicCode]/page.tsx");
    expect(page).toContain("<NotesMarkdown markdown={notes} rich demoteH1 />");
    expect(page).not.toMatch(/function NotesRenderer/);
    expect(page).not.toContain("<NotesRenderer");
  });

  it("NotesMarkdown: both props optional and off by default; rich mode uses the escaped HTML", () => {
    const c = read("src/components/NotesMarkdown.tsx");
    expect(c).toContain("rich = false,");
    expect(c).toContain("demoteH1 = false,");
    expect(c).toContain("rich?: boolean;");
    expect(c).toContain("demoteH1?: boolean;");
    expect(c).toContain("notesMarkdownHtml(markdown, { demoteH1 })");
    // The other callers pass neither prop.
    for (const p of [
      "src/app/exams/[code]/topics/[topicCode]/hi/page.tsx",
      "src/app/exams/[code]/guide/page.tsx",
      "src/app/exams/[code]/tricks/page.tsx",
      "src/app/schooling/[slug]/[classSlug]/[subject]/[chapter]/page.tsx",
    ]) {
      expect(read(p), p).not.toMatch(/<NotesMarkdown[^>]*\b(rich|demoteH1)\b/);
    }
  });
});

// School chapter notes render through the full renderer (3 Oct 2026, school
// growth; fix plan R2 / PTF-1A).
//
// The chapter page called NotesMarkdown without `rich`, whose plain branch
// draws only "#"/"##" headings, "-" bullets and **bold** and joins every
// other line into the paragraph around it: a live Class 12 note printed
// "### Example 1 …" as text. Read 3 Oct 2026 over every stored chapter note
// (scripts/check-school-notes-render.ts, read-only, through the lock): 161 of
// 230 notes showed raw markdown with the plain branch (108 a heading mark,
// 107 a rule), 0 with `rich demoteH1`.
// Pinned here: the raw-markdown detector the script uses
// (src/lib/notes-raw-check.ts), a stored-shape school note rendered both
// ways, the page's tag, and that the script only reads.
// No DB, no network. Run: npx vitest run tests/unit/school-notes-render.test.ts

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as notesMarkdown from "@/lib/notes-markdown";
import { rawMarkdownLeft, renderedTextLines } from "@/lib/notes-raw-check";
import { prepareSchoolNotes } from "@/lib/school/notes";

const ROOT = process.cwd();
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");

function loadTsx(rel: string): Record<string, unknown> {
  const file = path.join(ROOT, rel);
  const out = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  const stubs: Record<string, unknown> = { react: React, "react/jsx-runtime": jsxRuntime, "@/lib/notes-markdown": notesMarkdown };
  const req = (spec: string): unknown => {
    if (spec in stubs) return stubs[spec];
    throw new Error(`${rel} imports an unexpected module: ${spec}`);
  };
  new Function("require", "module", "exports", "process", out)(req, mod, mod.exports, process);
  return mod.exports;
}
const { NotesMarkdown } = loadTsx("src/components/NotesMarkdown.tsx") as {
  NotesMarkdown: (p: { markdown: string; rich?: boolean; demoteH1?: boolean }) => React.ReactElement;
};
const plain = (md: string) => renderToStaticMarkup(React.createElement(NotesMarkdown, { markdown: md }));
const rich = (md: string) => renderToStaticMarkup(React.createElement(NotesMarkdown, { markdown: md, rich: true, demoteH1: true }));

// A stored school note's shape (scripts/school-content-batch.ts): the title as "# ", the
// sections as "## ", worked examples as "### ", "---" between them, a tally table, a fenced
// column sum, the official-link section and the provenance comment.
const STORED = `# Current Electricity

## Key ideas

- **Electric current** is the rate of flow of charge: I = Q / t.
- Resistance of a wire grows with its length.

### Example 1: Finding the current

A charge of 30 C flows through a wire in 1 minute. Find the current.

Step 1: Write t in seconds, 60 s. Step 2: I = 30 / 60 = 0.5 A.

---

### Example 2: Reading a tally

| Colour | Tally | Frequency |
|---|---|---|
| Red | |||| | 4 |
| Blue | || | 2 |

The resistance R = ______ when the current doubles at a fixed voltage.

\`\`\`
  50.00
- 32.75
-------
  17.25
\`\`\`

## Read the official chapter

Read the chapter in the official NCERT book: https://ncert.nic.in/textbook/pdf/leph103.pdf

<!-- shishya:provenance school-notes v1 -->`;

describe("the raw-markdown detector (src/lib/notes-raw-check.ts)", () => {
  it("finds a heading mark, a rule, '**' and a pipe row left in rendered text", () => {
    const html = "<p>Intro ### Example 1: Finding the current</p><p>text --- more</p><p>a **b</p><p>| Colour | Tally | |---|---| | Red | 4 |</p>";
    expect(rawMarkdownLeft(html).map((h) => h.kind)).toEqual(["heading", "rule", "bold", "pipe-row"]);
    expect(rawMarkdownLeft("<p>| a | b |</p>").map((h) => h.kind)).toEqual(["pipe-row"]);
  });

  it("leaves content alone: a tally inside a sentence, a magnitude, a fill-in blank, a code block, an em dash, C#", () => {
    const html =
      "<ul><li><strong>Red</strong> · Tally: |||| · Frequency: 4</li></ul><p>|a| = 13 for the vector a.</p><p>R = ______ when I doubles.</p>" +
      "<pre><code>  50.00\n- 32.75\n-------\n  17.25</code></pre><p>Ohm — the unit — and C# code.</p><h3>Example 1</h3><hr>";
    expect(rawMarkdownLeft(html)).toEqual([]);
  });

  it("reads block by block and decodes entities", () => {
    expect(renderedTextLines("<h2>A &amp; B</h2><p>x &lt; y</p><ul><li>one</li><li>two</li></ul>")).toEqual(["A & B", "x < y", "one", "two"]);
  });
});

describe("a stored-shape school note, prepared as the page prepares it", () => {
  const notes = prepareSchoolNotes(STORED)!;

  it("prepareSchoolNotes keeps its job: no title, no official-link section, no provenance, the table as bullets", () => {
    expect(notes.markdown).not.toMatch(/^# Current Electricity/);
    expect(notes.markdown).not.toContain("Read the official chapter");
    expect(notes.markdown).not.toContain("provenance");
    expect(notes.officialUrl).toBe("https://ncert.nic.in/textbook/pdf/leph103.pdf");
    expect(notes.markdown).toContain("- Colour: **Red** · Tally: |||| · Frequency: 4");
  });

  it("the plain branch (the page until 3 Oct 2026) prints '###' and '---' as text", () => {
    const kinds = new Set(rawMarkdownLeft(plain(notes.markdown)).map((h) => h.kind));
    expect(kinds.has("heading")).toBe(true);
    expect(kinds.has("rule")).toBe(true);
    expect(plain(notes.markdown)).toContain("### Example 1: Finding the current");
  });

  it("rich + demoteH1 (the page now) leaves nothing raw: <h3> examples, a rule, a list, the column sum verbatim, no <h1>", () => {
    const html = rich(notes.markdown);
    expect(rawMarkdownLeft(html)).toEqual([]);
    expect(html).toContain("<h2>Key ideas</h2>");
    expect(html).toContain("<h3>Example 1: Finding the current</h3>");
    expect(html).toContain("<h3>Example 2: Reading a tally</h3>");
    expect(html).toContain("<hr>");
    expect(html).toContain("<li>Colour: <strong>Red</strong> · Tally: |||| · Frequency: 4</li>");
    expect(html).toContain("<pre><code>  50.00\n- 32.75\n-------\n  17.25</code></pre>");
    expect(html).toContain("R = ______ when");
    expect(html).not.toMatch(/<h1[\s>]/);
    expect(html.replace(/<[^>]+>/g, "")).not.toMatch(/\*\*|###/);
  });
});

describe("wiring", () => {
  it("the chapter page renders its notes with rich demoteH1 — one tag, no plain one", () => {
    const page = read("src/app/schooling/[slug]/[classSlug]/[subject]/[chapter]/page.tsx");
    const tags = page.match(/<NotesMarkdown[^>]*\/>/g) ?? [];
    expect(tags).toEqual(["<NotesMarkdown markdown={notes.markdown} rich demoteH1 />"]);
    // prepareSchoolNotes stays (the official-link section and the provenance comment never render).
    expect(read("src/lib/school/db.ts")).toContain("hasUsableNotes(content) ? prepareSchoolNotes(content) : null");
  });

  it("the check script only reads (SELECT), renders the page's way, and fails when anything raw is left", () => {
    const src = read("scripts/check-school-notes-render.ts");
    expect(src).not.toMatch(/\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\(|\$executeRaw|\$queryRaw|anthropic|fetch\(/i);
    expect(src).toContain("prisma.topic.findMany(");
    expect(src).toContain("subject: { exam: SCHOOL_CONTAINER_WHERE }");
    expect(src).toContain("if (!hasUsableNotes(content)) continue;");
    expect(src).toContain("const notes = prepareSchoolNotes(content);");
    expect(src).toContain("React.createElement(NotesMarkdown, { markdown: notes.markdown, rich: true, demoteH1: true })");
    expect(src).toContain("process.exitCode = 1;");
  });
});

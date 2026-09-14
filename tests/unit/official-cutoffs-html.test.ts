// Published cutoff table rows rendered as one HTML string (14 Sep 2026) —
// escaping and link safety. Pure — no DB, no network.
// Run: npx vitest run tests/unit/official-cutoffs-html.test.ts

import { describe, it, expect } from "vitest";
import { cutoffCategoryRowsHtml, cutoffRowsHtml, groupCutoffTables, type OfficialCutoffRow } from "@/lib/official-cutoffs";

const stored = (over: Partial<OfficialCutoffRow>): OfficialCutoffRow => ({
  cycle: "CEN 01/2024",
  stage: "CBT 1",
  post: "Assistant Loco Pilot",
  region: "",
  gender: "",
  category: "UR",
  categoryLabel: "UR",
  marks: "50",
  maxMarks: "",
  scoreType: "normalised marks",
  sourceUrl: "https://rrb.indianrailways.gov.in/cutoff.pdf",
  sourceTitle: "CBT 1 cutoff",
  publisher: "RRB",
  publishedOn: "2025-02-26",
  ...over,
});

describe("cutoffRowsHtml", () => {
  const [t] = groupCutoffTables([
    stored({ region: "RRB <Ajmer>", category: "UR", categoryLabel: "UR", marks: "54.3", sourceUrl: "https://rrb.gov.in/a.pdf", publisher: "RRB Ajmer" }),
    stored({ region: "RRB Kolkata", category: "SC", categoryLabel: "SC", marks: "36.2", sourceUrl: "javascript:alert(1)", publisher: 'Evil "x"' }),
  ]);
  const html = cutoffRowsHtml(t, {
    sourceColumn: true,
    sourceText: (i) => t.sources[i].publisher,
    sourceSuffix: (i) => (i === 1 ? " (reported)" : ""),
    linkClass: "underline",
  });

  it("escapes every value and links only https documents", () => {
    expect(html).toContain('<th scope="row">RRB &lt;Ajmer&gt;</th>');
    expect(html).toContain('<a href="https://rrb.gov.in/a.pdf" target="_blank" rel="noopener nofollow" class="underline">RRB Ajmer ↗</a>');
    expect(html).not.toContain("javascript:");
    expect(html).toContain("Evil &quot;x&quot; (reported)");
  });

  it("prints one row per table row and a dash for a missing figure", () => {
    expect(html.match(/<tr>/g)).toHaveLength(2);
    expect(html).toContain("<td>—</td>");
  });

  it("leaves the source column out when every row shares one document", () => {
    const [one] = groupCutoffTables([stored({ region: "RRB Ajmer", marks: "54.3" }), stored({ region: "RRB Kolkata", marks: "63.4" })]);
    const rows = cutoffRowsHtml(one, { sourceColumn: false, sourceText: () => "x", sourceSuffix: () => "", linkClass: "" });
    expect(rows).toBe('<tr><th scope="row">RRB Ajmer</th><td>54.3</td></tr><tr><th scope="row">RRB Kolkata</th><td>63.4</td></tr>');
  });
});

describe("cutoffCategoryRowsHtml", () => {
  it("prints a one-row table as category | cutoff pairs in reservation order", () => {
    const [simple] = groupCutoffTables([stored({ categoryLabel: "UR", marks: "79.1" }), stored({ category: "OBC", categoryLabel: "OBC", marks: "72.3" })]);
    expect(cutoffCategoryRowsHtml(simple)).toBe('<tr><th scope="row">UR</th><td>79.1</td></tr><tr><th scope="row">OBC</th><td>72.3</td></tr>');
  });
});

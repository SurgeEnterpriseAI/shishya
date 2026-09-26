// School chapter notes — what the chapter page renders (26 Sep 2026).
//
// A stored school note (scripts/school-content-batch.ts, content-plan.ts) is
// markdown with:
//   * a leading "# <chapter title>" H1 — the page prints the title itself;
//   * the six sections of content-prompts.ts NOTES_HEADINGS;
//   * a fixed last section "## Read the official chapter" whose one line is
//     OFFICIAL_LINK_PREFIX + the NCERT chapter PDF URL — the page renders
//     that as a real link in its own block (NotesMarkdown prints text only);
//   * a trailing HTML provenance comment (src/lib/school/provenance.ts).
// Pure: no DB, no React. The two literals below are content-prompts.ts's
// OFFICIAL_LINK_PREFIX and the last NOTES_HEADINGS entry; that file is not
// imported here because it pulls the Anthropic client into a page bundle
// (tests/unit/school-pages.test.ts pins them equal).
//
// 26 Sep 2026 (fixer): the shared renderer (src/components/NotesMarkdown.tsx)
// draws only "#"/"##" headings, "-"/"*" bullets, paragraphs and **bold**; it
// joins any other consecutive lines into one paragraph. Two stored notes
// already carry what it cannot draw — pipe tables (Class 6 Maths ch 4, tally
// and frequency tables) and single-asterisk italics ("*Solution:*", ch 2) —
// and the notes prompt does not forbid either, so every future batch can.
// The page must not change the shared renderer for school-only content, so
// the conversion happens here, on the school note only: a table block
// becomes one bullet per row ("Colour: **Red** · Tally: |||| · Frequency:
// 4"), *italics* become **bold**. Nothing is added, nothing dropped: every
// cell of every row lands in its bullet.

import { stripProvenanceComment } from "./provenance";

export const OFFICIAL_LINK_PREFIX = "Read the chapter in the official NCERT book: ";
export const OFFICIAL_LINK_HEADING = "## Read the official chapter";

export interface PreparedSchoolNotes {
  /** Markdown to render: no H1, no official-link section, no provenance. */
  markdown: string;
  /** The URL the note's own official-link line carried; null when absent. */
  officialUrl: string | null;
  wordCount: number;
}

/** A table separator row: "|---|:--:|". */
const TABLE_SEPARATOR = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

/** The cells of one "| a | b | c |" row. A pipe is a separator only when
 *  whitespace surrounds it; a run of pipes ("||||", a tally mark) is
 *  content. When that still leaves more cells than the header has, an
 *  empty cell after a pipe-only cell was a lone tally stroke between two
 *  separators ("|||| |") and is folded back into it. */
function tableCells(row: string, width: number): string[] {
  const inner = row.trim().replace(/^\|/, "").replace(/\|\s*$/, "");
  const cells = inner.split(/(?<=\s)\|(?=\s)/).map((c) => c.trim());
  while (cells.length > width) {
    const i = cells.findIndex((c, k) => k > 0 && c === "" && /^[|\s]+$/.test(cells[k - 1]));
    if (i < 0) break;
    cells.splice(i - 1, 2, `${cells[i - 1]} |`);
  }
  if (cells.length > width) cells.splice(width - 1, cells.length - width + 1, cells.slice(width - 1).join(" | "));
  return cells;
}

/** A pipe-table block (header, separator, rows) → one bullet per row, every
 *  cell named by its column: "- Colour: **Red** · Tally: |||| · Frequency: 4". */
function tableToBullets(block: string[]): string[] {
  const rows = block.filter((l) => !TABLE_SEPARATOR.test(l));
  if (rows.length === 0) return [];
  const header = tableCells(rows[0], Number.MAX_SAFE_INTEGER);
  const out: string[] = [];
  for (const r of rows.slice(1)) {
    const cells = tableCells(r, header.length);
    const parts = cells.map((c, i) => {
      const h = header[i] ?? "";
      const v = i === 0 && c ? `**${c}**` : c;
      return h ? `${h}: ${v}` : v;
    });
    out.push(`- ${parts.join(" · ")}`);
  }
  // A header-only table has nothing to list; print the header as a line.
  return out.length > 0 ? out : [header.join(" · ")];
}

/** "*Solution:*" → "**Solution:**"; leaves **bold**, "* " bullets and
 *  arithmetic ("3 * 4", "2*3") alone. */
export function italicsToBold(line: string): string {
  return line.replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)(?<!\s)\*(?![*\w])/g, "$1**$2**");
}

/** What the shared NotesMarkdown cannot draw, rewritten into what it can. */
export function normalizeSchoolMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let table: string[] = [];
  const flush = () => {
    if (table.length === 0) return;
    // A table is its own block: a blank line on each side keeps it out of a paragraph.
    if (out.length > 0 && out[out.length - 1].trim() !== "") out.push("");
    out.push(...tableToBullets(table));
    out.push("");
    table = [];
  };
  for (const raw of lines) {
    if (raw.trim().startsWith("|")) {
      table.push(raw);
      continue;
    }
    flush();
    out.push(italicsToBold(raw));
  }
  flush();
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Stored note content → what the page renders. Null for empty content. */
export function prepareSchoolNotes(content: string | null | undefined): PreparedSchoolNotes | null {
  if (!content) return null;
  let md = stripProvenanceComment(content).replace(/\r\n/g, "\n").trim();
  // The leading H1 is the chapter title, which the page already prints as <h1>.
  md = md.replace(/^#\s+[^\n]*\n*/, "");
  let officialUrl: string | null = null;
  const i = md.lastIndexOf(OFFICIAL_LINK_HEADING);
  if (i >= 0) {
    const section = md.slice(i);
    const m = section.match(new RegExp(`${OFFICIAL_LINK_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(https?:\\/\\/\\S+)`));
    officialUrl = m?.[1] ?? null;
    md = md.slice(0, i).trimEnd();
  }
  md = normalizeSchoolMarkdown(md.trim());
  if (!md) return null;
  return { markdown: md, officialUrl, wordCount: md.split(/\s+/).filter(Boolean).length };
}

// Raw markdown left in rendered notes (3 Oct 2026, school chapter notes).
//
// Why: the school chapter page rendered its notes with NotesMarkdown's plain
// branch, which draws only "#"/"##" headings, "-" bullets and **bold** and
// joins every other line into the paragraph around it — so a live Class 12
// note printed "### Example 1 …" as text. This reads RENDERED HTML (what a
// reader and a crawler get) and names what is still raw markdown in its
// text: a heading mark ("###"), a rule ("---", "***"), a bold mark ("**")
// or a pipe-table row ("| a | b |", "|---|"). A tally mark inside a
// sentence ("Tally: ||||"), a magnitude ("|a| = 13"), a fill-in blank
// ("______") and a fenced block's verbatim lines are content, not markdown.
// Used by scripts/check-school-notes-render.ts over every stored school
// note; tests/unit/school-notes-render.test.ts pins it.
// Pure: no DOM, no React.

export type RawMarkdownKind = "heading" | "rule" | "bold" | "pipe-row";

export interface RawMarkdownHit {
  kind: RawMarkdownKind;
  /** The text line it was found on (trimmed, at most 120 characters). */
  line: string;
}

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&#x27;": "'", "&nbsp;": " " };

/** The text of rendered HTML, one line per block (paragraph, list item, heading, cell, rule). */
export function renderedTextLines(html: string): string[] {
  const text = (html ?? "")
    .replace(/<(?:br|hr)\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|li|h[1-6]|td|th|tr|blockquote|pre|div|ul|ol|table)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(?:amp|lt|gt|quot|#39|#x27|nbsp);/g, (e) => ENTITIES[e] ?? e);
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

const HEADING = /(^|\s)#{1,6}\s+\S/;
// Dashes and stars only: "______" is a fill-in blank in a school note, not a rule.
const RULE = /(^|\s)(?:-{3,}|\*{3,})(\s|$)/;
// "**" only: "__" is part of a blank ("______").
const BOLD = /\*\*/;
const PIPE_ROW = /^\|.*\|$|\|\s*:?-{3,}:?\s*\|/;

/** Every raw markdown mark left in the text of rendered HTML (see the header).
 *  A <pre> block is skipped: the renderer prints a fenced block verbatim on
 *  purpose (a column subtraction's "-------" line is the working). */
export function rawMarkdownLeft(html: string): RawMarkdownHit[] {
  const hits: RawMarkdownHit[] = [];
  for (const line of renderedTextLines((html ?? "").replace(/<pre[\s>][\s\S]*?<\/pre>/gi, "\n"))) {
    const short = line.slice(0, 120);
    if (HEADING.test(line)) hits.push({ kind: "heading", line: short });
    if (RULE.test(line)) hits.push({ kind: "rule", line: short });
    if (BOLD.test(line)) hits.push({ kind: "bold", line: short });
    if (PIPE_ROW.test(line)) hits.push({ kind: "pipe-row", line: short });
  }
  return hits;
}

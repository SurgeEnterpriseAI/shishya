// scripts/annual-calendar-evidence.ts — the pure checks behind
// scripts/import-annual-calendars.ts (27 Sep 2026): how a downloaded
// official document is turned into comparable text / lines / table cells,
// and how one piece of evidence from data/official-calendars-2026-27.json is
// checked against it. No I/O here, so tests/unit/annual-calendar-evidence
// .test.ts can pin the rules:
//   • HTML: comments, scripts and struck-through text (<del>, <s>, <strike>)
//     are dropped before anything is read — GATE 2027's page keeps its
//     superseded dates struck out, TNPSC keeps old planner rows in comments.
//     Block tags become spaces, inline tags (<sup> in "2<sup>nd</sup>")
//     vanish, so "2nd September 2026" reads as printed.
//   • Every comparison is on norm(): NFKC, one space, plain dashes/quotes,
//     lower case.
//   • "cell": a table row holding `row`; the nearest header row ABOVE it that
//     names `col` (first column left to right — "Officer Scale I" before
//     "Officer Scale II and III"); that row's cell in that column must hold
//     `value`.
//   • "line": all tokens on one printed line; "phrase": one contiguous run.

export type Evidence =
  | { type: "cell"; row: string; col: string; value: string }
  | { type: "line"; tokens: string[] }
  | { type: "phrase"; text: string };

export interface EvidenceDoc {
  /** norm()-ed full text. */
  text: string;
  /** norm()-ed printed lines (PDF layout text); empty for HTML. */
  lines: string[];
  /** norm()-ed table cells: tables → rows → cells. */
  tables: string[][][];
}

/** Lower-case, one space, plain dashes and quotes — the form every check compares in. */
export function norm(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[‐-―−]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "-",
  mdash: "-",
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n: string) => NAMED[n.toLowerCase()] ?? m);
}

const BLOCK_TAG = /<\/?(?:p|div|li|tr|td|th|table|tbody|thead|tfoot|caption|h[1-6]|ul|ol|section|article|header|footer|main|nav|br)\b[^>]*>/gi;

/** HTML → plain text and tables (not yet norm()-ed). */
export function readHtml(html: string): { text: string; tables: string[][][] } {
  const h = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(del|s|strike)\b[\s\S]*?<\/\1>/gi, " ");
  const plain = (x: string) =>
    decodeEntities(x.replace(BLOCK_TAG, " ").replace(/<[^>]+>/g, ""))
      .replace(/\s+/g, " ")
      .trim();
  const tables = Array.from(h.matchAll(/<table\b[\s\S]*?<\/table>/gi), (t) =>
    Array.from(t[0].matchAll(/<tr\b[\s\S]*?<\/tr>/gi), (r) => Array.from(r[0].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi), (c) => plain(c[1]))),
  );
  return { text: plain(h), tables };
}

/** An HTML page as an EvidenceDoc. */
export function htmlDoc(html: string): EvidenceDoc {
  const { text, tables } = readHtml(html);
  return { text: norm(text), lines: [], tables: tables.map((t) => t.map((r) => r.map(norm))) };
}

/** A PDF's own bytes: some servers append their HTML page after the final
 *  %%EOF (UPPSC's Open_PDF_DB.aspx). Only such a tail is cut — a file that
 *  ends in %%EOF plus line breaks is returned whole, so its hash is the
 *  hash of the file as served (NTA). */
export function pdfBytes(buf: Buffer): Buffer {
  const i = buf.lastIndexOf("%%EOF");
  if (i < 0) return buf;
  const tail = buf.subarray(i + 5);
  return tail.toString("latin1").trim() === "" ? buf : buf.subarray(0, i + 5);
}

/** Checks one evidence item; returns null when it holds, else why not. */
export function checkEvidence(doc: EvidenceDoc, ev: Evidence): string | null {
  if (ev.type === "phrase") return doc.text.includes(norm(ev.text)) ? null : `phrase not in document: "${ev.text}"`;
  if (ev.type === "line") {
    const toks = ev.tokens.map(norm);
    return doc.lines.some((l) => toks.every((t) => l.includes(t))) ? null : `no printed line holds all of: ${ev.tokens.map((t) => `"${t}"`).join(", ")}`;
  }
  const row = norm(ev.row);
  const col = norm(ev.col);
  const value = norm(ev.value);
  const seen: string[] = [];
  for (const t of doc.tables) {
    for (let r = 0; r < t.length; r++) {
      if (!t[r].some((c) => c.includes(row))) continue;
      for (let h = r - 1; h >= 0; h--) {
        const j = t[h].findIndex((c) => c.includes(col));
        if (j < 0) continue;
        const cell = t[r][j] ?? "";
        if (cell.includes(value)) return null;
        seen.push(cell);
        break;
      }
    }
  }
  return seen.length
    ? `cell under "${ev.col}" in row "${ev.row}" reads "${seen.join(" | ")}", not "${ev.value}"`
    : `no table row "${ev.row}" under a "${ev.col}" header`;
}

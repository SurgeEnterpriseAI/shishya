// Scanned official PDFs: the reviewed second-reading path (27 Sep 2026).
//
// Why: NTA publishes the NEET (UG) and JEE (Main) category-wise cut-offs only
// as scanned page images — no text layer — so the importer's text and grid
// proofs (src/lib/official-cutoffs.ts) can never pass them, and the two most
// searched entrance exams showed no published cut-off at all. The founder
// approved a reviewed path: a figure a researcher typed from the scan is
// stored only when an INDEPENDENT second reading of the same pages agrees
// with it digit for digit.
//
// The second reading (scripts/scanned-cutoff-read.ts) renders each page of
// the re-downloaded PDF and asks a vision model to transcribe every table
// row verbatim — without showing it the researcher's figures or labels. This
// file holds the pure parts: the prompt, parsing that transcription, the
// matching rule, spend arithmetic and the page's disclosure line.
//
// Matching rule (matchScannedRow). A row passes only when its category
// agrees with its own label (a "UR-PwBD" label filed as UR, or "UR-ALL" filed
// as PWD, fails before any reading is looked at) and ONE transcribed table row
//   • has a cell that is the row's category label (same letters and digits);
//   • marks no character as unreadable ("[?]" anywhere in the row);
//   • holds the row's figure, digit for digit, in exactly one cell;
//   • holds every figure of the researcher's evidence line, digit for digit
//     and in the same order (so the candidates count and the rest of the row
//     agree too — well-formed thousands separators are formatting, not digits);
//   • names a PwBD group (in a cell or the figure's column) exactly when the
//     row's category is PWD, and prints no year other than the row's cycle;
// and that cell's column is consistent with the row:
//   • it is not a count / serial column ("Total Candidates", "S.No");
//   • when the table's headers name years, the figure's column names the
//     row's cycle year and no other; otherwise the row itself prints that
//     year, or the table's title (or, when the title names no year, the
//     page) names that year and no other;
//   • a range cell ("715-213") or a From / To (Max / Min, Highest / Lowest,
//     Upper / Lower) column pair gives the LOWER end — a cut-off is the
//     lowest qualifying score.
// Anything else is a failure and is never written.
//
// Written rows carry SCANNED_EVIDENCE_PREFIX at the start of their evidence,
// which the cutoff page detects to disclose how the figure was read. No
// schema change. Unit-tested in tests/unit/scanned-cutoff.test.ts.

import { asciiDigits, CUTOFF_CATEGORIES, type CutoffCandidate } from "./official-cutoffs";

/** Evidence of a row written through this path starts with this line. */
export const SCANNED_EVIDENCE_PREFIX = "[scanned PDF — read twice, readings agree]";

/** The second reader. Named by the founder-approved task (27 Sep 2026). */
export const SCANNED_READ_MODEL = "claude-sonnet-5";
/** v2 (27 Sep 2026): v1's examples ("100.0000000", "Percentile > From")
 *  matched cells the JEE page prints, so v1 was not fully blind; v2 carries
 *  no digit and no example taken from any document. Journals from another
 *  version are archived and the pages read again (dry run only). */
export const SCANNED_READ_PROMPT_VERSION = "scanned-cutoff-read-v2";
/** Hard ceiling on NEW vision spend in one importer run (journal reuse is free). */
export const SCANNED_READ_MAX_USD = 2;
/** Pages read per source, from the first. */
export const SCANNED_READ_MAX_PAGES = 8;
/** Output ceiling per page; a truncated reply fails to parse and its rows fail. */
export const SCANNED_READ_MAX_TOKENS = 8000;
/** USD per million tokens for the spend cap. Deliberately the repo's ledger
 *  rate for the Sonnet tier (src/lib/ai/usage.ts, $3 / $15) — above Sonnet 5's
 *  list price ($2 / $10) — so the cap errs on the safe side. */
export const SCANNED_READ_PRICE = { in: 3, out: 15 } as const;
/** High-resolution vision tops out near this many tokens per image. */
export const IMAGE_TOKENS_MAX = 4784;

/** Does a research source's `kind` say it is a scan ("pdf (scanned page images, no text layer)")? */
export function isScannedSourceKind(kind: string | null | undefined): boolean {
  return /\bscann?ed\b/i.test(kind ?? "");
}

export function isScannedEvidence(evidence: string | null | undefined): boolean {
  return (evidence ?? "").startsWith(SCANNED_EVIDENCE_PREFIX);
}

/** The evidence stored for a row that passed: the marker, the researcher's
 *  lines as typed, and the second reading's row as transcribed. */
export function scannedEvidence(researcherEvidence: string, page: number, cells: readonly string[]): string {
  const second = cells.map((c) => c.replace(/\s+/g, " ").trim()).join(" | ");
  return `${SCANNED_EVIDENCE_PREFIX}\n${(researcherEvidence ?? "").trim()}\n[second reading, page ${page}] ${second}`;
}

// ── the prompt (never carries the researcher's figures or labels, and no
// digit at all — tests/unit/scanned-cutoff.test.ts checks) ─────────────

export const SCANNED_READ_PROMPT = `This image is one page of a scanned government document; it has no text layer. Transcribe exactly what is printed. Do not correct, round, reformat, complete, summarise or guess anything.

Return ONLY a JSON object, with no prose before or after it and no code fence:
{"tables":[{"title":"...","columns":["..."],"rows":[["..."]]}],"lines":["..."]}

- "tables": every table on the page (ruled, or text aligned in columns), top to bottom.
  - "title": the caption or heading printed just above the table, verbatim; "" if there is none.
  - "columns": one entry per column, left to right. When a column has several header rows, join the header cells above it from top to bottom with " > "; a header cell that spans several columns is repeated for each of them (for example "Section > Part A" and "Section > Part B").
  - "rows": one array per printed data row (including total rows), top to bottom, with exactly one string per column in column order; "" for an empty cell. Put a cell's text on one line even when it wraps on the page.
- "lines": every other line of printed text on the page (headings, paragraphs, notes, footers), in reading order, verbatim.
- Every value is a JSON string. Copy every number character for character as printed: every digit, decimal point, comma and dash, and every leading or trailing zero — never shorten, round or regroup a number. Copy symbols such as ≥ and < as printed.
- If a character cannot be read with certainty, write [?] in its place. Never guess a digit.`;

// ── parsing the transcription ─────────────────────────────────────────

export interface ScannedTable {
  title: string;
  columns: string[];
  rows: string[][];
}
export interface ScannedPageReading {
  page: number;
  tables: ScannedTable[];
  lines: string[];
}
export type ParsedReading = { ok: true; reading: ScannedPageReading } | { ok: false; reason: string };

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

/** The model's reply → one page's tables and lines. Fails closed: a number
 *  written as a JSON number (which would drop "100.0000000" to 100), a
 *  missing field or unparseable text rejects the whole page. */
export function parseScannedReading(page: number, raw: string): ParsedReading {
  const text = (raw ?? "").replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return { ok: false, reason: "no JSON object in the second reading" };
  let data: unknown;
  try {
    data = JSON.parse(text.slice(start, end + 1));
  } catch {
    return { ok: false, reason: "the second reading is not valid JSON (truncated?)" };
  }
  const obj = data as { tables?: unknown; lines?: unknown };
  if (!Array.isArray(obj.tables)) return { ok: false, reason: "the second reading has no tables array" };
  const tables: ScannedTable[] = [];
  for (const t of obj.tables as unknown[]) {
    const tt = t as { title?: unknown; columns?: unknown; rows?: unknown };
    if (!isStringArray(tt.columns)) return { ok: false, reason: "a table's columns are not all strings" };
    if (!Array.isArray(tt.rows) || !(tt.rows as unknown[]).every(isStringArray)) {
      return { ok: false, reason: "a table's cells are not all strings (a number written as a JSON number loses its printed digits)" };
    }
    tables.push({ title: typeof tt.title === "string" ? tt.title : "", columns: tt.columns, rows: tt.rows as string[][] });
  }
  const lines = isStringArray(obj.lines) ? obj.lines : [];
  return { ok: true, reading: { page, tables, lines } };
}

// ── tokens ────────────────────────────────────────────────────────────

/** Numbers as printed, in order: NFKC + ASCII digits, thousands separators
 *  dropped — only a well-formed grouping whose last group has three digits
 *  ("96,873", "13,55,293", "1,165,334" are one number each; "1,62" stays two
 *  numbers, never 162) — then every run of digits with an optional decimal
 *  part. "720-162" → 720, 162; "≥50th" → 50. An unreadable mark splits a
 *  number ("1[?]3" → 1, 3), and matchScannedRow refuses any row holding one:
 *  "16[?]" would otherwise read as 16. */
export function digitTokens(s: string): string[] {
  const t = asciiDigits((s ?? "").normalize("NFKC")).replace(/(?<![\d.,])\d{1,3}(?:,\d{2,3})*,\d{3}(?!\d|,\d)/g, (m) => m.replace(/,/g, ""));
  return [...t.matchAll(/\d+(?:\.\d+)?/g)].map((m) => m[0]);
}

/** Letters and digits only, lower case: "UR/EWS & PwBD" → "urewspwbd". */
export function scannedLabelKey(s: string): string {
  return asciiDigits((s ?? "").normalize("NFKC"))
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]/gu, "");
}

/** A cell as a category label: a leading serial ("1 UR-ALL", "2.") is not part of it. */
const cellLabelKey = (cell: string) => scannedLabelKey((cell ?? "").replace(/^\s*\d{1,3}[.)]?\s+(?=\S)/, ""));

const firstLabelPart = (label: string) => (label ?? "").split(" / ")[0];

function isSubsequence(needle: readonly string[], hay: readonly string[]): boolean {
  let i = 0;
  for (const h of hay) if (i < needle.length && h === needle[i]) i++;
  return i === needle.length;
}

const yearsIn = (s: string) => [...new Set([...asciiDigits(s ?? "").matchAll(/(?<!\d)(19|20)\d{2}(?!\d)/g)].map((m) => m[0]))];
/** A year printed in a table cell — not the digits inside 93.4120195 or 1,20,194. */
const cellYearsIn = (s: string) => [...new Set([...asciiDigits(s ?? "").matchAll(/(?<![\d.,])(19|20)\d{2}(?!\d|[.,]\d)/g)].map((m) => m[0]))];

/** Lower-case words of a label, cell or header: "UR/EWS & PwBD" → ur, ews, pwbd. */
const labelWords = (s: string) =>
  asciiDigits((s ?? "").normalize("NFKC"))
    .toLowerCase()
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean);
/** Words that name a persons-with-benchmark-disabilities group. */
const PWD_WORDS = new Set(["pwd", "pwbd", "pwds", "ph", "divyang", "divyangjan", "disabled", "disability", "disabilities"]);
const namesPwd = (s: string) => labelWords(s).some((w) => PWD_WORDS.has(w));
/** The words a label must use to be filed under each community category. */
const COMMUNITY_WORDS: Partial<Record<string, readonly string[]>> = {
  UR: ["ur", "gen", "general", "unreserved", "open", "gn", "oc"],
  EWS: ["ews"],
  OBC: ["obc", "bc"],
  SC: ["sc"],
  ST: ["st"],
};

/** Does the research row's category agree with its printed label? The page
 *  orders and heads columns by category, so "UR-PwBD" filed as UR would show
 *  a PwBD figure as the UR cut-off. null = consistent. */
export function categoryLabelProblem(category: string, label: string): string | null {
  const words = labelWords(label);
  const pwd = words.some((w) => PWD_WORDS.has(w));
  if (category === "PWD") return pwd ? null : `category PWD, but the label "${label}" names no PwBD group`;
  if (pwd) return `the label "${label}" is a PwBD group, but the category is ${category}`;
  const names = COMMUNITY_WORDS[category];
  if (names && !words.some((w) => names.includes(w))) return `the label "${label}" does not name category ${category}`;
  return null;
}

/** NTA prints NTA scores to 7 decimals (JEE Main 93.4123549). */
const SCANNED_MARKS_RE = /^\d{1,4}(\.\d{1,7})?$/;
/** Columns that hold counts or serials, never a cut-off. */
const COUNT_COLUMN_RE = /candidate|total|number|\bno\.?\s*of\b|count|vacanc|registered|appeared|qualified|\bs\.?\s*no\b|serial|roll|sl\.?\s*no/i;
const RANGE_CELL_RE = /^\s*\d+(?:\.\d+)?\s*[-–—]\s*\d+(?:\.\d+)?\s*$/;

const lastSegment = (header: string) => (header ?? "").split(">").pop()?.trim().toLowerCase() ?? "";
const parentPath = (header: string) =>
  (header ?? "")
    .split(">")
    .slice(0, -1)
    .map((s) => s.trim().toLowerCase())
    .join(">");
/** Column pairs that print one band's two ends; a cut-off is the lower end. */
const BAND_PAIR = new Map<string, string>([
  ["to", "from"],
  ["from", "to"],
  ["max", "min"],
  ["min", "max"],
  ["maximum", "minimum"],
  ["minimum", "maximum"],
  ["highest", "lowest"],
  ["lowest", "highest"],
  ["upper", "lower"],
  ["lower", "upper"],
]);
const bandEnd = (header: string) => lastSegment(header).replace(/[^a-z]/g, "");

// ── the rule ──────────────────────────────────────────────────────────

export interface ScannedVerdict {
  ok: boolean;
  reasons: string[];
  /** Where the agreeing row was read (ok only). */
  page?: number;
  /** The figure's column header as the second reading printed it. */
  column?: string;
  /** The second reading's row, cell by cell. */
  cells?: string[];
}

/** Check one research row against the second reading of its document. */
export function matchScannedRow(row: CutoffCandidate, pages: readonly ScannedPageReading[]): ScannedVerdict {
  const reasons: string[] = [];
  const marks = asciiDigits(row.marks ?? "").trim();
  if (!SCANNED_MARKS_RE.test(marks)) reasons.push(`marks "${row.marks}" is not a plain number`);
  if (!(CUTOFF_CATEGORIES as readonly string[]).includes(row.category)) reasons.push(`unknown category "${row.category}"`);
  if (!row.cycle?.trim()) reasons.push("no cycle");
  if (!row.stage?.trim()) reasons.push("no stage");
  const labelText = firstLabelPart(row.categoryLabel ?? "").trim();
  const label = scannedLabelKey(labelText);
  if (!label) reasons.push("no category label");
  else if ((CUTOFF_CATEGORIES as readonly string[]).includes(row.category)) {
    const clash = categoryLabelProblem(row.category, row.categoryLabel ?? "");
    if (clash) reasons.push(clash);
  }
  const dataLines = (row.evidence ?? "").split(/\r?\n/).filter((l) => l.trim());
  const dataLine = dataLines[dataLines.length - 1] ?? "";
  const evTokens = digitTokens(dataLine);
  if (!dataLine) reasons.push("no evidence line");
  else {
    if (SCANNED_MARKS_RE.test(marks) && !evTokens.includes(marks)) reasons.push("marks figure is not on the evidence line");
    if (label && !scannedLabelKey(dataLine).includes(label)) reasons.push(`category label "${labelText}" is not on the evidence line`);
  }
  if (reasons.length > 0) return { ok: false, reasons };
  if (pages.length === 0) return { ok: false, reasons: ["no second reading of the document"] };

  const cycleYears = yearsIn(row.cycle);
  // The closest miss is reported: a row holding the label AND the figure beats one holding only the label.
  let best: { score: number; reasons: string[] } = { score: -1, reasons: [`no table row in the second reading is labelled "${labelText}"`] };
  const miss = (score: number, why: string[]) => {
    if (score > best.score) best = { score, reasons: why };
  };

  for (const p of pages) {
    for (const t of p.tables) {
      const headerYears = new Set(t.columns.flatMap(yearsIn));
      for (const cells of t.rows) {
        if (!cells.some((c) => cellLabelKey(c) === label)) continue;
        const rowTokens = cells.flatMap(digitTokens);
        const shown = cells.join(" | ");
        // "[?]" = the reader could not see a character; "16[?]" must never agree with 16.
        if (cells.some((c) => c.includes("?"))) {
          miss(0, [`the second reading marks a character of its "${labelText}" row unreadable (it reads: ${shown})`]);
          continue;
        }
        if (!rowTokens.includes(marks)) {
          miss(0, [`the second reading's "${labelText}" row does not hold ${marks} (it reads: ${shown})`]);
          continue;
        }
        if (!isSubsequence(evTokens, rowTokens)) {
          miss(1, [`the second reading's "${labelText}" row differs from the evidence line (it reads: ${shown})`]);
          continue;
        }
        const figureCells = cells.map((c, j) => (digitTokens(c).includes(marks) ? j : -1)).filter((j) => j !== -1);
        if (figureCells.length !== 1) {
          miss(2, [`${marks} appears in ${figureCells.length} cells of the second reading's row; which column it is in cannot be told`]);
          continue;
        }
        const j = figureCells[0];
        if (cells.length !== t.columns.length) {
          miss(2, [`the second reading's row has ${cells.length} cells for ${t.columns.length} columns; the figure's column cannot be told`]);
          continue;
        }
        const header = t.columns[j] ?? "";
        const why: string[] = [];
        if (COUNT_COLUMN_RE.test(header)) why.push(`the figure is under "${header}", a count column`);
        // The page itself must agree on PwBD: a UR figure read off a row or
        // column that names PwBD (or a PWD figure off one that does not) fails.
        const pwdOnPage = cells.some(namesPwd) || namesPwd(header);
        if (pwdOnPage && row.category !== "PWD") why.push(`the second reading's row or column names a PwBD group, but the category is ${row.category}`);
        if (!pwdOnPage && row.category === "PWD") why.push("the category is PWD, but neither the second reading's row nor the figure's column names a PwBD group");
        // A table split by year in its rows: the row must not print another
        // year, and a row that prints the cycle year says which year it is.
        const rowYears = [...new Set(cells.filter((_, i) => !COUNT_COLUMN_RE.test(t.columns[i] ?? "")).flatMap(cellYearsIn))];
        const strayRowYears = rowYears.filter((y) => !cycleYears.includes(y));
        if (strayRowYears.length > 0) why.push(`the second reading's row prints ${strayRowYears.join(", ")}, not the cycle ${row.cycle}`);
        const rowNamesCycle = strayRowYears.length === 0 && rowYears.some((y) => cycleYears.includes(y));
        if (headerYears.size > 0) {
          const ys = yearsIn(header);
          if (ys.length === 0) why.push(`the table's columns are split by year but the figure's column ("${header}") names none`);
          else if (!ys.every((y) => cycleYears.includes(y))) why.push(`the figure is under "${header}", not the ${row.cycle} column`);
        } else if (!rowNamesCycle) {
          // No year in the columns or the row: the table's title says which
          // year it is — or, when the title names none, the page — and it
          // must name only one.
          const titleYears = yearsIn(t.title);
          const scope = titleYears.length > 0 ? titleYears : yearsIn(p.lines.join(" "));
          const where = titleYears.length > 0 ? "the table's title" : "the page";
          const other = scope.filter((y) => !cycleYears.includes(y));
          if (scope.length === 0) why.push(`neither the table's title nor its page names the cycle ${row.cycle}`);
          else if (other.length === scope.length) why.push(`${where} names ${scope.join(", ")}, not the cycle ${row.cycle}`);
          else if (other.length > 0) why.push(`${where} names ${other.join(", ")} as well as the cycle ${row.cycle}; which year the table gives cannot be told`);
        }
        const cell = cells[j];
        const cellTokens = digitTokens(cell);
        if (RANGE_CELL_RE.test(asciiDigits(cell.normalize("NFKC")))) {
          if (Number(marks) !== Math.min(...cellTokens.map(Number))) why.push(`the figure is the upper end of the printed range "${cell.trim()}"; a cut-off is the lower end`);
        } else if (cellTokens.length !== 1) {
          why.push(`the cell holding the figure prints several numbers ("${cell.trim()}")`);
        }
        // A From / To (Max / Min, …) column pair: the cut-off is the lower of the two.
        const pairWith = BAND_PAIR.get(bandEnd(header));
        if (pairWith) {
          const k = t.columns.findIndex((h, i) => i !== j && bandEnd(h) === pairWith && parentPath(h) === parentPath(header));
          const otherTokens = k === -1 ? [] : digitTokens(cells[k] ?? "");
          if (otherTokens.length === 1 && Number(marks) > Number(otherTokens[0])) {
            why.push(`the figure is the upper end of the "${header}" / "${t.columns[k]}" pair; a cut-off is the lower end`);
          }
        }
        if (why.length > 0) {
          miss(3, why);
          continue;
        }
        return { ok: true, reasons: [], page: p.page, column: header, cells: [...cells] };
      }
    }
  }
  return { ok: false, reasons: best.reasons };
}

// ── spend ─────────────────────────────────────────────────────────────

export interface ReadUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

/** What one reply cost at SCANNED_READ_PRICE (cache writes 1.25×, reads 0.1× input). */
export function readCostUsd(u: ReadUsage): number {
  const { in: pin, out } = SCANNED_READ_PRICE;
  return (
    ((u.input_tokens ?? 0) / 1e6) * pin +
    ((u.output_tokens ?? 0) / 1e6) * out +
    ((u.cache_creation_input_tokens ?? 0) / 1e6) * pin * 1.25 +
    ((u.cache_read_input_tokens ?? 0) / 1e6) * pin * 0.1
  );
}

/** Worst case of one page call: the image at the high-resolution maximum,
 *  the prompt at ~3 characters a token (generous), every output token used. */
export function worstCaseReadUsd(promptChars: number, maxTokens = SCANNED_READ_MAX_TOKENS): number {
  return readCostUsd({ input_tokens: IMAGE_TOKENS_MAX + Math.ceil(promptChars / 3) + 50, output_tokens: maxTokens });
}

/** May another call start? Only if its worst case still fits under the cap. */
export function withinCap(spentUsd: number, nextWorstUsd: number, capUsd = SCANNED_READ_MAX_USD): boolean {
  return spentUsd + nextWorstUsd <= capUsd + 1e-9;
}

// ── the page's disclosure line ────────────────────────────────────────

/** Next to a published table read this way (src/app/exams/[code]/cutoff/page.tsx).
 *  {publisher} is the document's publisher as stored. Honest wording: the
 *  second reading never saw the first; both readings are machine-assisted,
 *  and the line says so (27 Sep 2026: "by AI" — honesty, not implied human reading). */
export const SCANNED_DISCLOSURE: Record<"en" | "hi" | "te", { text: string; link: string }> = {
  en: {
    text: "Read from {publisher}'s scanned PDF (an image, no text layer) by AI, twice — the second reading made without seeing the first — and the two readings agree digit for digit.",
    link: "Check the PDF",
  },
  hi: {
    text: "{publisher} की स्कैन की गई PDF (केवल छवि, कोई टेक्स्ट नहीं) को AI ने दो बार पढ़ा — दूसरी बार पहले पाठ को देखे बिना — और दोनों पाठ अंक-दर-अंक मेल खाते हैं।",
    link: "PDF देखें",
  },
  te: {
    text: "{publisher} స్కాన్ చేసిన PDF (చిత్రం మాత్రమే, టెక్స్ట్ లేదు)ను AI రెండుసార్లు చదివింది — రెండోసారి మొదటి పఠనాన్ని చూడకుండా — రెండు పఠనాలు అంకె అంకెకూ సరిపోలాయి.",
    link: "PDF చూడండి",
  },
};

export function scannedDisclosure(locale: string, publisher: string): { text: string; link: string } {
  const copy = SCANNED_DISCLOSURE[(locale === "hi" || locale === "te" ? locale : "en") as "en" | "hi" | "te"];
  return { text: copy.text.replace("{publisher}", (publisher ?? "").trim() || "the publisher"), link: copy.link };
}

// Published previous-cycle cutoffs (13 Sep 2026, reach program #1).
//
// Why: in the 14 days to 13 Sep ChatGPT fetched our /cutoff pages 673 times
// while answering people — more than any other page family — and those
// pages held only AI-estimated ranges. A student asking "SSC GD cutoff 2024
// OBC" deserves the number the commission published, with the document.
//
// Honesty rules (the founder's, applied to cutoffs):
//   • a row is stored only if the published document PROVES it
//     (verifyCutoffRow): the quoted evidence lines are in the document; the
//     figure is on the row's line beside its category label; and when that
//     line holds several figures, the table's own column headings put THIS
//     figure under the column the row names (male / female / ex-serviceman),
//     or the line is a plain "label figure" pair. A figure whose column the
//     text cannot prove is refused, however likely it looks.
//     scripts/import-official-cutoffs.ts re-downloads every document before
//     it writes anything;
//   • every figure is shown with who published it and a link, and the tier
//     word comes from the source domain — official = the conducting body's
//     own site, anything else = reported;
//   • published cutoffs are never blended with the indicative estimates:
//     separate section, separate heading, separate note.
// Pure helpers, unit-tested in tests/unit/official-cutoffs.test.ts.

export const CUTOFF_CATEGORIES = ["UR", "EWS", "OBC", "SC", "ST", "ESM", "PWD", "OTHER"] as const;
export type CutoffCategory = (typeof CUTOFF_CATEGORIES)[number];

/** One stored row (the OfficialCutoff table). */
export interface OfficialCutoffRow {
  cycle: string;
  stage: string;
  post: string;
  region: string;
  gender: string;
  category: string;
  categoryLabel: string;
  marks: string;
  maxMarks: string;
  scoreType: string;
  sourceUrl: string;
  sourceTitle: string;
  publisher: string;
  publishedOn: Date | string | null;
}

/** A research row before verification (the JSON the sourcing step writes). */
export interface CutoffCandidate extends Omit<OfficialCutoffRow, "sourceUrl" | "sourceTitle" | "publisher" | "publishedOn"> {
  evidence: string;
}

// Zero code points of the Indic digit blocks: Devanagari, Bengali, Gurmukhi,
// Gujarati, Odia, Tamil, Telugu, Kannada, Malayalam.
const DIGIT_ZEROS = [0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66];

/** Indic digits → ASCII (the same number, written the way the page and AI
 *  engines read it). Everything else unchanged. */
export function asciiDigits(s: string): string {
  let out = "";
  for (const ch of s ?? "") {
    const cp = ch.codePointAt(0) ?? 0;
    const zero = DIGIT_ZEROS.find((z) => cp >= z && cp <= z + 9);
    out += zero === undefined ? ch : String(cp - zero);
  }
  return out;
}

/** Comparison form: NFKC, ASCII digits, table rules (| │) as spaces, one
 *  space for any whitespace run, lowercase. */
export function normaliseCutoffText(s: string): string {
  return asciiDigits((s ?? "").normalize("NFKC"))
    .replace(/[|│┃]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const MARKS_RE = /^\d{1,4}(\.\d{1,6})?$/;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Is `num` present in `text` as a whole number (not inside 182.08 or 82.081)? */
export function hasNumberToken(text: string, num: string): boolean {
  const n = asciiDigits(num ?? "").trim();
  if (!MARKS_RE.test(n)) return false;
  const re = new RegExp(`(^|[^0-9.])${escapeRe(n)}(?![0-9])`);
  return re.test(normaliseCutoffText(text));
}

const WORD_CHAR = /[\p{L}\p{M}\p{N}]/u;

/** Index of `needle` in `haystack` (at or after `from`) starting and ending
 *  on token boundaries — "ur 147.6" is not found inside "ur 147.64322".
 *  Both already normalised. -1 when absent. */
export function findAtBoundary(haystack: string, needle: string, from = 0): number {
  if (!needle) return -1;
  const first = needle[0];
  const last = needle[needle.length - 1];
  for (let i = haystack.indexOf(needle, from); i !== -1; i = haystack.indexOf(needle, i + 1)) {
    const before = haystack[i - 1];
    const after = haystack[i + needle.length];
    const afterNext = haystack[i + needle.length + 1];
    const startsOk = !before || !WORD_CHAR.test(before) || !WORD_CHAR.test(first);
    const continuesNumber = after === "." && /[0-9]/.test(afterNext ?? "") && /[0-9]/.test(last);
    const endsOk = (!after || !WORD_CHAR.test(after) || !WORD_CHAR.test(last)) && !continuesNumber;
    if (startsOk && endsOk) return i;
  }
  return -1;
}

export function containsAtBoundary(haystack: string, needle: string): boolean {
  return findAtBoundary(haystack, needle) !== -1;
}

const DATE_RE = /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/g;

/** Figures on an evidence line that could be a cutoff: every number except a
 *  date (a last-selected candidate's DoB), a year, a serial number (< 10
 *  without decimals), a percentage label ("5% OPEN"), a count with
 *  thousands separators, and the stated maximum marks. */
export function candidateFigures(evidence: string, maxMarks = ""): string[] {
  const text = normaliseCutoffText(evidence).replace(DATE_RE, " ");
  const max = asciiDigits(maxMarks ?? "").trim();
  const out: string[] = [];
  for (const m of text.matchAll(/(?<![\d,.])(\d{1,4}(?:\.\d+)?)(?![\d,]|\s?%)/g)) {
    const n = m[1];
    if (/^(19|20)\d{2}$/.test(n)) continue;
    if (!n.includes(".") && Number(n) < 10) continue;
    if (max && Number(n) === Number(max)) continue;
    const before = text.slice(Math.max(0, (m.index ?? 0) - 24), m.index ?? 0);
    if (/\b(max(imum)?|out of|total marks|full marks)\b[^0-9]*$/.test(before)) continue;
    out.push(n);
  }
  return out;
}

/** Distinct values, in the order they first appear on the line. */
function distinctFigures(figures: readonly string[]): number[] {
  const out: number[] = [];
  for (const f of figures) {
    const v = Number(f);
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

// ── the document as searchable lines ──────────────────────────────────

export interface CutoffSourceIndex {
  /** Normalised non-empty lines. */
  lines: string[];
  /** The lines joined by single spaces. */
  joined: string;
  /** Offset of each line in `joined`. */
  starts: number[];
}

/** Build once per document; verifyCutoffRow accepts it in place of the text. */
export function indexCutoffSource(sourceText: string): CutoffSourceIndex {
  const lines = (sourceText ?? "").split(/\r?\n/).map(normaliseCutoffText).filter(Boolean);
  const starts: number[] = [];
  let pos = 0;
  for (const l of lines) {
    starts.push(pos);
    pos += l.length + 1;
  }
  return { lines, joined: lines.join(" "), starts };
}

function lineAt(starts: readonly number[], offset: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (starts[mid] <= offset) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

/** How far before the data row a quoted heading line may sit. */
const EVIDENCE_WINDOW = 4000;

/** Line where the evidence's LAST line (the data row) starts, or -1. Every
 *  quoted line must be in the document on token boundaries, and any line
 *  quoted before the data row (a heading) must come before it, nearby. */
function locateEvidence(idx: CutoffSourceIndex, evidenceRaw: string): number {
  const segments = (evidenceRaw ?? "").split(/\r?\n/).map(normaliseCutoffText).filter(Boolean);
  if (segments.length === 0 || !idx.joined) return -1;
  const last = segments[segments.length - 1];
  for (let at = findAtBoundary(idx.joined, last); at !== -1; at = findAtBoundary(idx.joined, last, at + 1)) {
    let bound = at;
    let ok = true;
    for (let s = segments.length - 2; s >= 0 && ok; s--) {
      const seg = segments[s];
      let found = -1;
      for (
        let i = findAtBoundary(idx.joined, seg, Math.max(0, bound - EVIDENCE_WINDOW));
        i !== -1 && i + seg.length <= bound;
        i = findAtBoundary(idx.joined, seg, i + 1)
      ) {
        found = i;
      }
      if (found === -1) ok = false;
      else bound = found;
    }
    if (ok) return lineAt(idx.starts, at);
  }
  return -1;
}

// ── columns ───────────────────────────────────────────────────────────

/** Column headings we can recognise, in the languages cutoff tables are
 *  printed in. Deliberately small: an unrecognised heading means the column
 *  cannot be proven, and the row is refused. */
const HEADING_WORDS: ReadonlyArray<readonly [string, string]> = [
  ["female", "female|women|girls?|महिला|स्त्री|મહિલા|સ્ત્રી|మహిళ"],
  ["male", "male|men|boys?|पुरुष|પુરુષ|પુરૂષ|పురుష"],
  ["esm", "ex[- ]?service ?m[ae]n|ex[- ]?sm|esm|भूतपूर्व सैनिक|માજી સૈનિક"],
];
const HEADING_RE = new RegExp(`(?<![\\p{L}\\p{M}])(?:${HEADING_WORDS.map(([, w]) => `(${w})`).join("|")})(?![\\p{L}\\p{M}])`, "gu");

/** Recognised column-heading keys on a normalised line, in order. */
export function headingKeys(lineNorm: string): string[] {
  const keys: string[] = [];
  for (const m of (lineNorm ?? "").matchAll(HEADING_RE)) {
    const group = m.slice(1).findIndex((g) => g !== undefined);
    const key = HEADING_WORDS[group]?.[0];
    if (key && keys[keys.length - 1] !== key) keys.push(key);
  }
  return keys;
}

const firstLabelPart = (label: string) => (label ?? "").split(" / ")[0];

/** The column a row names: its gender, or the qualifier after " / " in a
 *  composite label ("GENERAL / Ex-serviceman"). null = names none;
 *  "unknown" = names one that is not a heading we can check. */
function rowColumnKey(row: CutoffCandidate): string | null {
  const named = normaliseCutoffText([row.gender ?? "", ...(row.categoryLabel ?? "").split(" / ").slice(1)].join(" "));
  if (!named) return null;
  const keys = headingKeys(named);
  return keys.length === 1 ? keys[0] : "unknown";
}

/** The nearest heading line (≥ 2 recognised column headings) at or above the row. */
function nearestHeading(idx: CutoffSourceIndex, rowLine: number): string[] | null {
  if (rowLine < 0) return null;
  for (let i = rowLine; i >= Math.max(0, rowLine - 60); i--) {
    const keys = headingKeys(idx.lines[i] ?? "");
    if (keys.length >= 2) return keys;
  }
  return null;
}

const PLACEHOLDER_RE = /(^|\s)-{2,}(?=\s|$)/;
const UNPROVEN = "several figures on the evidence line; the column this row reads could not be verified";

/** null when the document proves which column the figure sits in; else why not. */
function columnProblem(
  row: CutoffCandidate,
  evidenceNorm: string,
  figures: readonly string[],
  idx: CutoffSourceIndex,
  rowLine: number,
): string | null {
  const values = distinctFigures(figures);
  const marks = Number(asciiDigits(row.marks ?? "").trim());
  const placeholder = PLACEHOLDER_RE.test(evidenceNorm);
  const column = rowColumnKey(row);
  const heading = nearestHeading(idx, rowLine);

  if (column === null) {
    if (heading) return `the table splits into columns (${heading.join(" / ")}) but this row does not name its column`;
    if (placeholder) return "the line has empty-column placeholders (---); which column holds the figure could not be verified";
    if (values.length === 1) return null;
    // Several figures and no column named: accepted only as a "label figure"
    // pair — the category label immediately followed by this figure.
    const label = escapeRe(normaliseCutoffText(firstLabelPart(row.categoryLabel)));
    const pair = new RegExp(`(^|[^\\p{L}\\p{M}\\p{N}])${label}[\\s:=()-]{0,4}${escapeRe(asciiDigits(row.marks ?? "").trim())}(?![0-9])`, "u");
    return pair.test(evidenceNorm) ? null : UNPROVEN;
  }
  if (!heading) {
    // A gender or qualifier with no column headings around it is a row
    // attribute ("GM/W" = general merit, women) — fine with one figure.
    return values.length === 1 && !placeholder ? null : UNPROVEN;
  }
  if (column === "unknown") return `the column this row names ("${row.gender || row.categoryLabel}") is not a heading we can check`;
  if (heading.length !== values.length) return UNPROVEN;
  const at = heading.indexOf(column);
  if (at === -1) return `the table's headings (${heading.join(" / ")}) do not include this row's column`;
  return values[at] === marks ? null : "the figure is not under the column this row names";
}

export interface CutoffVerdict {
  ok: boolean;
  reasons: string[];
}

/** The one gate between research and the page. */
export function verifyCutoffRow(row: CutoffCandidate, source: string | CutoffSourceIndex): CutoffVerdict {
  const reasons: string[] = [];
  const idx = typeof source === "string" ? indexCutoffSource(source) : source;
  const marks = asciiDigits(row.marks ?? "").trim();
  if (!MARKS_RE.test(marks)) reasons.push(`marks "${row.marks}" is not a plain number`);
  if (!(CUTOFF_CATEGORIES as readonly string[]).includes(row.category)) reasons.push(`unknown category "${row.category}"`);
  if (!row.cycle?.trim()) reasons.push("no cycle");
  if (!row.stage?.trim()) reasons.push("no stage");
  if (!idx.joined) reasons.push("empty source text");

  // The data row is the evidence's LAST line; lines before it are quoted
  // headings. Label and figure must both sit on the data row: a label found
  // only in a heading line says nothing about which column the figure is in
  // (those tables go through the grid proof below).
  const dataRaw = evidenceDataLine(row.evidence);
  const data = normaliseCutoffText(dataRaw);
  if (!data) {
    reasons.push("no evidence line");
    return { ok: false, reasons };
  }
  const rowLine = locateEvidence(idx, row.evidence);
  if (idx.joined && rowLine === -1) reasons.push("evidence line not found in the source document");
  if (MARKS_RE.test(marks) && !hasNumberToken(data, marks)) reasons.push("marks figure is not on the evidence line");
  const label = normaliseCutoffText(firstLabelPart(row.categoryLabel ?? ""));
  if (!label) reasons.push("no category label");
  else if (!containsAtBoundary(data, label)) reasons.push(`category label "${firstLabelPart(row.categoryLabel)}" is not on the evidence line`);
  if (idx.joined && MARKS_RE.test(marks) && !hasNumberToken(idx.joined, marks)) reasons.push("marks figure not found in the source document");

  if (MARKS_RE.test(marks)) {
    const figures = candidateFigures(dataRaw, row.maxMarks);
    if (!distinctFigures(figures).includes(Number(marks))) {
      reasons.push("marks figure is not a cutoff figure on the evidence line (it reads as a date, serial, count or maximum)");
    } else {
      const problem = columnProblem(row, data, figures, idx, rowLine);
      if (problem) reasons.push(problem);
    }
  }
  return { ok: reasons.length === 0, reasons };
}

/** The evidence's data row: its last non-empty line. */
function evidenceDataLine(evidenceRaw: string): string {
  const lines = (evidenceRaw ?? "").split(/\r?\n/).filter((l) => l.trim());
  return lines[lines.length - 1] ?? "";
}

/** Is the evidence's data row printed in the document? The grid proof reads
 *  column headers off the table itself, so it does not need the quoted
 *  heading lines — which, for a long table, sit pages above the row. */
export function dataLineInDocument(row: Pick<CutoffCandidate, "evidence" | "marks">, source: string | CutoffSourceIndex): boolean {
  const idx = typeof source === "string" ? indexCutoffSource(source) : source;
  const data = normaliseCutoffText(figureLine(row));
  return data !== "" && findAtBoundary(idx.joined, data) !== -1;
}

/** The evidence line that holds the figure (the last, if several), else the last line. */
function figureLine(row: Pick<CutoffCandidate, "evidence" | "marks">): string {
  const lines = (row.evidence ?? "").split(/\r?\n/).filter((l) => l.trim());
  const withFigure = lines.filter((l) => hasNumberToken(l, row.marks ?? ""));
  return withFigure[withFigure.length - 1] ?? lines[lines.length - 1] ?? "";
}

// ── grids: the document's own ruled table cells ───────────────────────
//
// A text line cannot say which column a figure is in once a cell is empty:
// in "1 80.67967 … 52.59353 37.13724", is 37.13724 R-VI or R-HI? Commission
// PDFs mostly draw ruled tables; pdfplumber reads the rules into cells, keeps
// the empty ones, and (scripts/cutoff-grid.ts) spreads a merged cell's text
// over the columns and rows its box covers. The grid proof reads the column
// off the table itself:
//   • categories across the top — the header cells above the figure name the
//     row's category ("UR"; "LD ST" under a two-level heading; a row qualifier
//     such as "Open" or "Ex-SM" may lead the label), every other descriptor
//     the row prints left of its figures (a post number, "Level 2",
//     "Percentile Score") is named by the row, and the row holds marks — a
//     "Cut-off marks" label, or decimal figures in a document titled as
//     cut-offs;
//   • categories down the side — the row's category cell is the row's
//     category, and the figure is in the table's cutoff column: the first
//     marks column, or the one the document itself marks as revised / READ AS.
// Region, post and gender must match the table's own cells or title, and a
// table split by one of them needs the row to name it.
//
// Printed lines. pdftotext's layout mode can pull a label from the next row
// onto a figure's line (13 Sep 2026: SSC GD "Bengal BSF UR … 45.74222" where
// the page prints "BSF B EWS … 45.74222"). The extractor also returns every
// page's words grouped by the line they are printed on; a figure is accepted
// only with its row's label printed on that same line (verifyPrintedLine for
// the text proof; the category cell or a row descriptor for the grid proof).

export interface CutoffGridTable {
  /** Cells as extracted, "" for an empty cell; a merged cell's text repeated over what it covers. */
  rows: string[][];
  /** Per cell: "" its own text, "<" repeated from a cell merged across from the left, "^" from above. */
  spans?: string[][];
  /** Text between the previous table (or the page top) and this one. */
  above: string;
}
export interface CutoffGridPage {
  page: number;
  text: string;
  /** The page's words grouped by the line they are printed on, left to right. */
  lines?: string[];
  tables: CutoffGridTable[];
}

interface GridTable {
  page: number;
  pageText: string;
  rows: string[][];
  width: number;
  /** Header rows: the table's own, or those of the table it continues. */
  header: string[][];
  dataStart: number;
  /** Columns that hold a figure in some data row. */
  figureCols: Set<number>;
  /** male / female named by the title above this table (or the one it continues). */
  genders: string[];
  /** Titles above this table and the tables it continues. */
  context: string;
}
export interface CutoffGrid {
  tables: GridTable[];
  /** Normalised printed lines per page (empty when the extractor gave none). */
  lines: Map<number, string[]>;
}
export interface GridVerdict extends CutoffVerdict {
  /** The figure's column header as printed (categories-down-the-side tables). */
  scoreType?: string;
  /** The region cell the row was matched against, as printed. */
  regionCell?: string;
}

const labelKey = (s: string) => normaliseCutoffText(s).replace(/[^\p{L}\p{M}\p{N}]/gu, "");
const cellText = (c: string) => normaliseCutoffText(c).replace(/[*#†@]+$/, "");
const isNumericCell = (c: string) => /^\d[\d,]*(\.\d+)?%?$/.test(cellText(c));
const cellMarks = (c: string) => {
  const t = cellText(c);
  return MARKS_RE.test(t) ? t : null;
};

const MARKS_WORD_RE = /cut ?-?off|(^|[^a-z])marks?($|[^a-z])|score|normali[sz]|percentile|अंक|कट ?-?ऑफ|कटऑफ/;
const COUNT_ROW_RE = /vacanc|filled|available|allocat|shortlist|no\.? ?of|number|total|count|रिक्त|संख्या|कुल/;
// Word-bounded where a short word hides inside a longer one ("candiDATE").
const NOT_MARKS_COLUMN_RE = /vacanc|filled|available|allocat|shortlist|\bno\.? ?of\b|\bnumber of\b|\bdates?\b|\bbirth\b|\bdob\b|\broll\b|remark|रिक्त|संख्या|जन्म|तिथि|अनुक्रमांक/;
/** A marks column the document itself marks as superseding another. */
const REVISED_COLUMN_RE = /revised|actual|read as|corrected|modified|संशोधित/;
const CUTOFF_WORD_RE = /cut ?-?off|कट ?-?ऑफ|कटऑफ/;
const CATEGORY_HEAD_RE = /categor|श्रेणी|वर्ग|community|caste/;
/** Heading words that name no column in particular ("Category" over "UR"). */
const GENERIC_HEAD_RE = /^(category|categories|category-wise cut-?off|community|cut ?-?off|cut ?-?off marks?|marks?|श्रेणी|वर्ग|कट ?-?ऑफ)$/;
/** A row descriptor that only says "these are the cut-off marks". */
const GENERIC_DESCRIPTOR_RE = /^(cut ?-?off|cut ?-?off marks?|marks?|कट ?-?ऑफ|कट ?-?ऑफ अंक)$/;
const REGION_HEAD_RE = /(^|[^a-z])(state|ut|cca|zone|region|rrb|district|division|circle)($|[^a-z])|राज्य|जोन|जिला|मंडल|संभाग/;
const POST_HEAD_RE = /(^|[^a-z])(post|posts|force|cat_no|area)($|[^a-z])|पद|बल/;
const ID_HEAD_RE = /cat[._ ]*no|code/;
const TITLE_RE = /annexure|appendix|table|list|परिशिष्ट|सूची|तालिका/;
const PLACEHOLDER_CELL_RE = /^[-–—]+$|^(na|n\/a|nil)$/;

const genderKeys = (text: string) => [
  ...new Set(headingKeys(normaliseCutoffText(text)).filter((k) => k === "male" || k === "female")),
];
const sameRows = (a: readonly string[][], b: readonly string[][]) =>
  a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((c, j) => labelKey(c) === labelKey(b[i][j])));
const distinctText = (cells: readonly string[]) => [...new Set(cells.map((c) => c.replace(/\s+/g, " ").trim()).filter(Boolean))].join(" ");

/** Tables in reading order, each knowing its header rows and title — a table
 *  at the top of a page with no title of its own continues the previous one. */
export function prepareCutoffGrid(pages: readonly CutoffGridPage[]): CutoffGrid {
  const tables: GridTable[] = [];
  const lines = new Map<number, string[]>();
  let prev: GridTable | null = null;
  for (const p of pages ?? []) {
    if (p.lines?.length) lines.set(p.page, p.lines.map(normaliseCutoffText).filter(Boolean));
    let pendingTitle = "";
    let firstOnPage = true;
    for (const t of p.tables ?? []) {
      const rows = (t.rows ?? []).map((r) => (r ?? []).map((c) => c ?? ""));
      const width = rows.reduce((m, r) => Math.max(m, r.length), 0);
      if (width === 0) continue;
      const dataStart = rows.findIndex((r) => r.some(isNumericCell));
      if (dataStart === -1) {
        // A ruled title box ("RRB : AHMEDABAD") — context for the table below it.
        pendingTitle += ` ${t.above ?? ""} ${rows.map(distinctText).join(" ")}`;
        firstOnPage = false;
        continue;
      }
      // A leading row with one cell of its own is not a column heading: a
      // title across the table ("RAILWAY RECRUITMENT BOARD : BHUBANESWAR"),
      // or a wrapped name carried over a page break ("Bengal").
      const isTitleRow = (i: number) =>
        width >= 3 && rows[i].filter((c, j) => c.trim() && (t.spans?.[i]?.[j] ?? "") !== "<").length === 1;
      const lead = rows
        .slice(0, dataStart)
        .map((_, i) => i)
        .filter((i) => rows[i].some((c) => c.trim()));
      const own = lead.filter((i) => !isTitleRow(i)).map((i) => rows[i]);
      const titles = lead.filter(isTitleRow).map((i) => distinctText(rows[i]));
      const above = `${pendingTitle} ${t.above ?? ""} ${titles.join(" ")}`.trim();
      pendingTitle = "";
      const continues: boolean =
        prev !== null &&
        firstOnPage &&
        prev.width === width &&
        !TITLE_RE.test(normaliseCutoffText(above)) &&
        (own.length === 0 || sameRows(own, prev.header));
      const figureCols = new Set<number>();
      for (let i = dataStart; i < rows.length; i++) {
        rows[i].forEach((c, j) => {
          if (isNumericCell(c)) figureCols.add(j);
        });
      }
      const aboveGenders = genderKeys(above);
      const table: GridTable = {
        page: p.page,
        pageText: p.text ?? "",
        rows,
        width,
        header: own.length > 0 ? own : continues && prev ? prev.header : [],
        dataStart,
        figureCols,
        genders: aboveGenders.length > 0 ? aboveGenders : continues && prev ? prev.genders : [],
        context: continues && prev ? `${prev.context} ${above}` : above,
      };
      tables.push(table);
      prev = table;
      firstOnPage = false;
    }
  }
  return { tables, lines };
}

/** Is `text` (its first word, or all of it) printed on the same line as the figure? */
function printedWithFigure(lines: readonly string[], text: string, marks: string, whole: boolean): boolean {
  const norm = normaliseCutoffText(text);
  const needle = whole ? norm : norm.split(" ")[0];
  return needle !== "" && lines.some((l) => hasNumberToken(l, marks) && containsAtBoundary(l, needle));
}

/** For a row the text proof accepted from a PDF: its category label must be
 *  printed on the figure's line, not just share a pdftotext layout line. */
export function verifyPrintedLine(row: CutoffCandidate, grid: CutoffGrid): CutoffVerdict {
  const all = [...grid.lines.values()].flat();
  if (all.length === 0) return { ok: false, reasons: ["the document's printed lines could not be read"] };
  const label = firstLabelPart(row.categoryLabel ?? "");
  const marks = asciiDigits(row.marks ?? "").trim();
  return printedWithFigure(all, label, marks, true)
    ? { ok: true, reasons: [] }
    : { ok: false, reasons: [`"${label}" and ${marks} are not printed on one line (the text layout joined two rows)`] };
}

/** A column's header cells, top to bottom, without a merged cell's repeats. */
const headerCells = (t: GridTable, c: number) => {
  const out: string[] = [];
  for (const h of t.header) {
    const v = (h[c] ?? "").replace(/\s+/g, " ").trim();
    if (v && v !== out[out.length - 1]) out.push(v);
  }
  return out;
};
const headerMatches = (t: GridTable, c: number, re: RegExp) => headerCells(t, c).some((h) => re.test(normaliseCutoffText(h)));

/** The cell, or for a merged cell the nearest filled one above it in the data rows. */
function cellOrAbove(t: GridTable, r: number, c: number): string {
  for (let i = r; i >= t.dataStart; i--) {
    const v = (t.rows[i]?.[c] ?? "").trim();
    if (v) return v;
  }
  return "";
}

/** Does the attribute the row names include the table's cell? Short codes
 *  ("G", "C36", "1") must be whole tokens; names may differ in spacing. */
function namesCell(attribute: string, cell: string): boolean {
  const key = labelKey(cell);
  if (!key) return false;
  if (key.length <= 3) return normaliseCutoffText(attribute).split(/[^\p{L}\p{M}\p{N}]+/u).includes(key);
  const want = labelKey(attribute);
  return want.includes(key) || (want.length >= 4 && key.includes(want));
}

// We write a zone "RRB Ahmedabad"; the board prints "RAILWAY RECRUITMENT
// BOARD - AHMEDABAD", and some documents keep a renamed city's older name.
// These are spellings of the same name, not guesses.
const REGION_SPELLINGS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\brrb\b/, "railway recruitment board"],
  [/\brrc\b/, "railway recruitment cell"],
  [/\bprayagraj\b/, "allahabad"],
  [/\bbengaluru\b/, "bangalore"],
  [/\bthiruvananthapuram\b/, "trivandrum"],
];

function regionKeys(region: string): string[] {
  let variants = [normaliseCutoffText(region)];
  for (const [re, alt] of REGION_SPELLINGS) variants = variants.flatMap((v) => (re.test(v) ? [v, v.replace(re, alt)] : [v]));
  return [...new Set(variants.map(labelKey))].filter(Boolean);
}

/** Does a region cell — or, with no region column, the table's title and page — name the row's region? */
function regionNamed(region: string, text: string, asCell: boolean): boolean {
  if (asCell) return namesCell(region, text) || regionKeys(region).some((k) => namesCell(k, text));
  const hay = labelKey(text);
  return regionKeys(region).some((k) => hay.includes(k));
}

function isSubsequence(needle: readonly string[], hay: readonly string[]): boolean {
  let i = 0;
  for (const h of hay) if (i < needle.length && h === needle[i]) i++;
  return i === needle.length;
}

function proveColumn(
  t: GridTable,
  r: number,
  j: number,
  row: CutoffCandidate,
  label: string,
  marks: string,
  soleOnPage: boolean,
  pageLines: readonly string[] | undefined,
): GridVerdict {
  const cols = Array.from({ length: t.width }, (_, c) => c);
  const head = headerCells(t, j);
  const reasons: string[] = [];
  let shape: "across" | "down" | null = null;
  let scoreType: string | undefined;
  let categoryCol = -1;

  // Categories across the top. The column's name is all its header cells
  // ("LD" over "ST"), or only the lowest when those above are generic
  // ("Category" over "UR"). The row's descriptors are its cells left of the
  // figure columns — a label, a qualifier, a post number under CAT. NO.
  const columnNames =
    head.length === 0
      ? []
      : [head.join(" "), ...(head.length > 1 && head.slice(0, -1).every((h) => GENERIC_HEAD_RE.test(normaliseCutoffText(h))) ? [head[head.length - 1]] : [])];
  const idColumn = headerMatches(t, 0, ID_HEAD_RE);
  const descriptors = cols
    .filter((c) => c < j && (!t.figureCols.has(c) || (c === 0 && idColumn)))
    .map((c) => (c === 0 ? cellOrAbove(t, r, 0) : (t.rows[r][c] ?? "").trim()))
    .filter((d) => d !== "" && !PLACEHOLDER_CELL_RE.test(normaliseCutoffText(d)));
  const qualifiers = descriptors.filter((d) => !isNumericCell(d));
  const plain = columnNames.some((n) => labelKey(n) === label);
  const composite =
    !plain && columnNames.some((n) => qualifiers.some((d) => labelKey(`${d} ${n}`) === label || labelKey(`${n} ${d}`) === label));

  if (plain || composite) {
    const titledCutoff = CUTOFF_WORD_RE.test(normaliseCutoffText(`${t.context} ${t.pageText}`));
    // Normalised marks carry decimals; a whole number among them ("80") is one too.
    const decimal = marks.includes(".") || t.rows[r].some((c) => isNumericCell(c) && cellText(c).includes("."));
    const counts = descriptors.find((d) => COUNT_ROW_RE.test(normaliseCutoffText(d)));
    if (counts) reasons.push(`the table row "${counts}" holds counts, not marks`);
    else if (descriptors.length === 0) {
      if (t.rows.length - t.dataStart === 1 && soleOnPage && titledCutoff && decimal) shape = "across";
      else reasons.push("the figure's row has no label, and the table is not a lone row of cut-offs");
    } else if (descriptors.some((d) => MARKS_WORD_RE.test(normaliseCutoffText(d))) || (titledCutoff && decimal)) shape = "across";
    else reasons.push(`the table row "${descriptors.join(" ")}" does not say it holds cutoff marks`);
    if (shape) {
      // Every descriptor the row prints must be named by the row: "Open" by
      // its label, "Level 2" / CAT. NO. 1 by its post, "Percentile Score" by
      // its score type.
      const named = `${row.categoryLabel ?? ""} ${row.post ?? ""} ${row.scoreType ?? ""} ${row.stage ?? ""}`;
      for (const d of descriptors) {
        if (GENERIC_DESCRIPTOR_RE.test(normaliseCutoffText(d)) || namesCell(named, d)) continue;
        reasons.push(`the table row says "${d.replace(/\s+/g, " ")}"; the row does not name it`);
      }
      if (pageLines?.length && descriptors.length > 0 && !descriptors.some((d) => printedWithFigure(pageLines, d, marks, false))) {
        reasons.push("none of the row's labels is printed on the figure's line");
      }
    }
  } else {
    const categoryCols = cols.filter((c) => c !== j && headerMatches(t, c, CATEGORY_HEAD_RE));
    categoryCol = categoryCols.find((c) => labelKey(t.rows[r][c] ?? "") === label) ?? -1;
    if (categoryCol === -1) {
      reasons.push(
        categoryCols.length > 0
          ? "the table row's category cell is not the row's category"
          : `the column header above the figure ("${head.join(" ") || "none"}") is not the row's category`,
      );
    } else {
      // A corrigendum's "FOR … / READ AS …" columns: the FOR side is superseded.
      const marksCols = cols.filter(
        (c) =>
          c !== categoryCol &&
          headerMatches(t, c, MARKS_WORD_RE) &&
          !headerMatches(t, c, NOT_MARKS_COLUMN_RE) &&
          !headerCells(t, c).some((h) => normaliseCutoffText(h) === "for"),
      );
      const revised = marksCols.filter((c) => headerMatches(t, c, REVISED_COLUMN_RE));
      const cutoffCol = (revised.length > 0 ? revised : marksCols)[0];
      if (cutoffCol === undefined) reasons.push("the table has no marks column");
      else if (cutoffCol !== j) reasons.push(`the figure is not in the table's cutoff column ("${headerCells(t, cutoffCol).join(" ")}")`);
      else {
        shape = "down";
        scoreType = head.join(" ");
        if (pageLines?.length && !printedWithFigure(pageLines, t.rows[r][categoryCol], marks, false)) {
          reasons.push(`the category "${t.rows[r][categoryCol].replace(/\s+/g, " ")}" is not printed on the figure's line`);
        }
      }
    }
  }
  if (!shape) return { ok: false, reasons };

  const region = (row.region ?? "").trim();
  const regionCols = cols.filter((c) => c !== j && c !== categoryCol && headerMatches(t, c, REGION_HEAD_RE));
  let regionCell: string | undefined;
  if (regionCols.length > 0) {
    const matched = region ? regionCols.find((c) => regionNamed(region, cellOrAbove(t, r, c), true)) : undefined;
    if (!region) reasons.push("the table splits by region; the row does not name its region");
    else if (matched === undefined) reasons.push(`the table's region for this figure is not "${region}"`);
    else regionCell = cellOrAbove(t, r, matched);
  } else if (region && !regionNamed(region, `${t.context} ${t.pageText}`, false)) {
    reasons.push(`the table's page does not name the region "${region}"`);
  }

  const post = (row.post ?? "").trim();
  const postCols = cols.filter((c) => c !== j && c !== categoryCol && !regionCols.includes(c) && headerMatches(t, c, POST_HEAD_RE));
  for (const c of postCols) {
    const cell = cellOrAbove(t, r, c);
    if (!cell) continue;
    if (!post) {
      reasons.push("the table splits by post; the row does not name its post");
      break;
    }
    if (!namesCell(post, cell)) {
      reasons.push(`the table's ${headerCells(t, c).join(" ").slice(0, 40)} for this figure ("${cell.replace(/\s+/g, " ")}") is not in the row's post "${post}"`);
    }
  }

  const colGenders = genderKeys(head.join(" "));
  const tableGenders = colGenders.length > 0 ? colGenders : t.genders;
  const gender = (row.gender ?? "").trim();
  const want = gender ? genderKeys(gender) : [];
  if (gender && want.length !== 1) reasons.push(`gender "${gender}" is not one the checker can read`);
  else if (tableGenders.length > 1) reasons.push(`the table's title names ${tableGenders.join(" and ")}; which one this figure is for could not be verified`);
  else if (tableGenders.length === 1 && want[0] !== tableGenders[0]) {
    reasons.push(gender ? `the table lists ${tableGenders[0]} candidates, not ${gender}` : `the table lists ${tableGenders[0]} candidates; the row must say so`);
  } else if (gender && tableGenders.length === 0) reasons.push(`the table does not say it lists ${gender} candidates`);

  return { ok: reasons.length === 0, reasons, scoreType, regionCell };
}

/** The second gate, for tables the text cannot prove: the figure's cell in
 *  the document's ruled table, with its column header or category cell. */
export function verifyCutoffRowByGrid(row: CutoffCandidate, grid: CutoffGrid): GridVerdict {
  const marks = asciiDigits(row.marks ?? "").trim();
  const basics: string[] = [];
  if (!MARKS_RE.test(marks)) basics.push(`marks "${row.marks}" is not a plain number`);
  if (!(CUTOFF_CATEGORIES as readonly string[]).includes(row.category)) basics.push(`unknown category "${row.category}"`);
  if (!row.cycle?.trim()) basics.push("no cycle");
  if (!row.stage?.trim()) basics.push("no stage");
  const label = labelKey(firstLabelPart(row.categoryLabel ?? ""));
  if (!label) basics.push("no category label");
  const dataRaw = figureLine(row);
  if (MARKS_RE.test(marks) && !hasNumberToken(dataRaw, marks)) basics.push("marks figure is not on the evidence line");
  if (basics.length > 0) return { ok: false, reasons: basics };

  // The quoted data line must be the table row the figure is in: its
  // figures appear in that row, in order.
  const quoted = candidateFigures(dataRaw, row.maxMarks);
  const tablesOnPage = new Map<number, number>();
  for (const t of grid.tables) tablesOnPage.set(t.page, (tablesOnPage.get(t.page) ?? 0) + 1);
  const misses: string[] = [];
  const note = (m: string) => {
    if (!misses.includes(m)) misses.push(m);
  };
  for (const t of grid.tables) {
    for (let r = t.dataStart; r < t.rows.length; r++) {
      const cells = t.rows[r];
      let rowFigures: string[] | null = null;
      for (let j = 0; j < cells.length; j++) {
        if (cellMarks(cells[j]) !== marks) continue;
        rowFigures ??= candidateFigures(cells.join("  "), row.maxMarks);
        if (!isSubsequence(quoted, rowFigures)) {
          note("the quoted line is not the table row that holds the figure");
          continue;
        }
        const proof = proveColumn(t, r, j, row, label, marks, tablesOnPage.get(t.page) === 1, grid.lines.get(t.page));
        if (proof.ok) return proof;
        proof.reasons.forEach(note);
      }
    }
  }
  return { ok: false, reasons: misses.length > 0 ? misses.slice(0, 3) : ["the figure is not in any ruled table cell of the document"] };
}

// ── display ───────────────────────────────────────────────────────────

export interface CutoffSource {
  url: string;
  title: string;
  publisher: string;
  publishedOn: string | null;
}

/** One row of a page table: a zone / state and post, from one document. */
export interface CutoffTableRow {
  /** "RRB Ahmedabad · NTPC (Graduate) CAT_NO 1" — only what differs between
   *  rows; "" for a table of one unsplit row. */
  label: string;
  region: string;
  post: string;
  /** Index into the table's sources. */
  source: number;
  /** categoryLabel → marks as published. */
  cells: Record<string, string>;
}

/** One table on the page: one cycle + stage + gender + score type. Its rows
 *  are what the figures split by (zone / state, post) — so an RRB's 21 zone
 *  documents or SSC's post-wise list read as ONE matrix — and every row links
 *  the document it was copied from. */
export interface CutoffTable {
  key: string;
  cycle: string;
  stage: string;
  gender: string;
  scoreType: string;
  /** The stated maximum when the rows that state one agree, else "". */
  maxMarks: string;
  /** The post / region every row shares (it belongs in the title), else "". */
  post: string;
  region: string;
  splitBy: { region: boolean; post: boolean };
  rows: CutoffTableRow[];
  /** Category labels as printed, in reservation order. */
  categories: string[];
  /** Documents behind the table, in first-seen order. */
  sources: CutoffSource[];
}

/** Latest year named in a cycle string ("CEN 01/2019" → 2019, "2024-25" → 2025). */
export function cycleYear(cycle: string): number {
  // The "2024-25" form first, or the bare-year branch would claim "2024".
  const years = [...(cycle ?? "").matchAll(/\b20\d{2}-(\d{2})\b|\b(20\d{2})\b/g)].map((m) =>
    m[1] ? Number(`20${m[1]}`) : Number(m[2]),
  );
  return years.length ? Math.max(...years) : 0;
}

const categoryRank = (c: string) => {
  const i = (CUTOFF_CATEGORIES as readonly string[]).indexOf(c);
  return i === -1 ? CUTOFF_CATEGORIES.length : i;
};

const dayIso = (d: Date | string | null): string | null => {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toISOString().slice(0, 10);
};

// Indian states and union territories by their letters, so a name wrapped
// inside its cell ("Chhattisga rh"), "Jammu &Kashmir", "ANDHRA PRADESH" and
// "Orissa" all store as one spelling and read as one row across cycles.
const STATES_AND_UTS = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];
const REGION_ALIASES: Record<string, string> = {
  andamannicobar: "Andaman and Nicobar Islands",
  andamanandnicobar: "Andaman and Nicobar Islands",
  nctofdelhi: "Delhi",
  orissa: "Odisha",
  pondicherry: "Puducherry",
  uttaranchal: "Uttarakhand",
  uttrakhand: "Uttarakhand", // how SSC's CT GD 2024 final result prints it
};
const withoutAnd = (s: string) => (s ?? "").replace(/\band\b/gi, " ");
const REGION_BY_KEY = new Map<string, string>([
  ...STATES_AND_UTS.flatMap((name) => [[labelKey(name), name] as const, [labelKey(withoutAnd(name)), name] as const]),
  ...Object.entries(REGION_ALIASES),
]);

/** The state / UT a printed region names, in one spelling; null for anything else (an RRB zone, a CCA). */
export function canonicalRegion(printed: string): string | null {
  return REGION_BY_KEY.get(labelKey(printed ?? "")) ?? REGION_BY_KEY.get(labelKey(withoutAnd(printed))) ?? null;
}

const nameWords = (s: string) => (s ?? "").toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);

/** The one state / UT a cut-short region cell can be: its first word(s) ("Madhya", "West")
 *  or its first line broken inside the first word, six letters or more ("Chhattisga",
 *  "Uttarakhan"). Null when none or more than one fits ("Uttar" is Uttar Pradesh, never
 *  Uttarakhand; "Goa CGST" is not Goa). */
function stateFromFragment(printed: string): string | null {
  const words = nameWords(printed);
  if (words.length === 0) return null;
  const fits = STATES_AND_UTS.filter((name) => {
    const full = nameWords(name);
    if (words.length < full.length && words.every((w, i) => w === full[i])) return true;
    return words.length === 1 && words[0].length >= 6 && full[0].startsWith(words[0]) && full[0] !== words[0];
  });
  return fits.length === 1 ? fits[0] : null;
}

/** Cut-short state names to complete within ONE document's rows (14 Sep 2026). A wrapped
 *  state cell can reach the grid as its first line only; SSC GD stored 46 rows as "Madhya",
 *  "Chhattisga", "West"… Only a state-wise document qualifies (at least 80% of its region
 *  cells already a state / UT in full), so a zone printed "West" in a zone-wise table is
 *  never read as West Bengal. Returns printed → state for the fragments that complete. */
export function completeStateFragments(regions: readonly string[]): Map<string, string> {
  const named = regions.map((r) => (r ?? "").trim()).filter(Boolean);
  const fixes = new Map<string, string>();
  if (named.length === 0 || named.filter((r) => canonicalRegion(r) === r).length / named.length < 0.8) return fixes;
  for (const r of new Set(named)) {
    if (canonicalRegion(r)) continue;
    const state = stateFromFragment(r);
    if (state) fixes.set(r, state);
  }
  return fixes;
}

/** How a category column is headed on the page. Documents print one
 *  category several ways — "Open UR" / "Cut-Off UR", "EXSM" / "Ex-SM",
 *  "Pwd-Others" / "Others" / "OTH" — and a matrix across zones or posts
 *  needs one column per category. Stored labels stay as printed; every row
 *  still links the document it was copied from. */
export function displayCategoryLabel(label: string, category: string): string {
  let s = (label ?? "").replace(/\s+/g, " ").trim();
  const rest = s.replace(/^(open|cut ?-?off)\s+/i, "");
  if (rest && rest !== s) s = rest;
  s = s.replace(/\b(ex[-. ]?s\.?m\.?|ex-?servicem[ae]n)(?=\s|$)/gi, "ESM");
  if (category === "PWD" && /^(pw(b)?d[-_ ]*others?|others?(\s*\(pwd\))?|other[-_ ]pwd|oth)$/i.test(s)) s = "PwD-Others";
  return s;
}

const communityRank = (label: string) => {
  const last = (label ?? "").trim().split(/\s+/).pop()?.toUpperCase() ?? "";
  const i = ["UR", "EWS", "OBC", "SC", "ST"].indexOf(last);
  return i === -1 ? 99 : i;
};

/** Page tables, latest cycle first and, within a cycle, the smallest (the
 *  headline all-India table) before the long state- and post-wise lists. */
export function groupCutoffTables(rows: readonly OfficialCutoffRow[]): CutoffTable[] {
  interface Draft {
    table: CutoffTable;
    order: Map<string, number>;
    kinds: Map<string, string>;
    byRow: Map<string, CutoffTableRow>;
    maxima: Set<string>;
  }
  const drafts = new Map<string, Draft>();
  for (const r of rows) {
    const key = [r.cycle, r.stage, r.gender, r.scoreType].join("|");
    let d = drafts.get(key);
    if (!d) {
      d = {
        table: {
          key,
          cycle: r.cycle,
          stage: r.stage,
          gender: r.gender,
          scoreType: r.scoreType,
          maxMarks: "",
          post: "",
          region: "",
          splitBy: { region: false, post: false },
          rows: [],
          categories: [],
          sources: [],
        },
        order: new Map(),
        kinds: new Map(),
        byRow: new Map(),
        maxima: new Set(),
      };
      drafts.set(key, d);
    }
    const t = d.table;
    let source = t.sources.findIndex((s) => s.url === r.sourceUrl);
    if (source === -1) {
      t.sources.push({ url: r.sourceUrl, title: r.sourceTitle, publisher: r.publisher, publishedOn: dayIso(r.publishedOn) });
      source = t.sources.length - 1;
    }
    const rowKey = [r.region, r.post, source].join("|");
    let row = d.byRow.get(rowKey);
    if (!row) {
      row = { label: "", region: r.region, post: r.post, source, cells: {} };
      d.byRow.set(rowKey, row);
      t.rows.push(row);
    }
    row.cells[r.categoryLabel] = r.marks;
    if (r.maxMarks) d.maxima.add(r.maxMarks);
    if (!d.order.has(r.categoryLabel)) {
      d.order.set(r.categoryLabel, categoryRank(r.category));
      d.kinds.set(r.categoryLabel, r.category);
      t.categories.push(r.categoryLabel);
    }
  }
  const byLabel = new Intl.Collator("en", { numeric: true }).compare;
  return [...drafts.values()]
    .map(({ table: t, order, kinds, maxima }) => {
      const splitBy = { region: new Set(t.rows.map((x) => x.region)).size > 1, post: new Set(t.rows.map((x) => x.post)).size > 1 };
      // One column per category — unless some row prints two spellings as
      // two separate figures, which merging would hide.
      const display = new Map(t.categories.map((c) => [c, displayCategoryLabel(c, kinds.get(c) ?? "")]));
      const clash = t.rows.some((x) => {
        const names = Object.keys(x.cells).map((c) => display.get(c) ?? c);
        return new Set(names).size < names.length;
      });
      const name = (c: string) => (clash ? c : (display.get(c) ?? c));
      const rank = new Map<string, number>();
      for (const c of t.categories) rank.set(name(c), Math.min(rank.get(name(c)) ?? 99, order.get(c) ?? 99));
      // Within a reservation rank: sub-category groups ("LD …", "VI …") in the
      // order the document prints them, communities in reservation order.
      const group = (label: string) => label.trim().split(/\s+/).slice(0, -1).join(" ");
      const groupOrder = new Map<string, number>();
      for (const k of rank.keys()) if (!groupOrder.has(group(k))) groupOrder.set(group(k), groupOrder.size);
      return {
        ...t,
        maxMarks: maxima.size === 1 ? [...maxima][0] : "",
        region: splitBy.region ? "" : (t.rows[0]?.region ?? ""),
        post: splitBy.post ? "" : (t.rows[0]?.post ?? ""),
        splitBy,
        rows: t.rows
          .map((x) => ({
            ...x,
            label: [splitBy.region ? x.region : "", splitBy.post ? x.post : ""].filter(Boolean).join(" · "),
            cells: Object.fromEntries(Object.entries(x.cells).map(([c, v]) => [name(c), v])),
          }))
          .sort((a, b) => byLabel(a.label, b.label) || a.source - b.source),
        categories: [...rank.keys()].sort(
          (a, b) =>
            (rank.get(a) ?? 99) - (rank.get(b) ?? 99) ||
            (groupOrder.get(group(a)) ?? 0) - (groupOrder.get(group(b)) ?? 0) ||
            communityRank(a) - communityRank(b),
        ),
      };
    })
    .sort((a, b) => cycleYear(b.cycle) - cycleYear(a.cycle) || a.rows.length - b.rows.length || a.stage.localeCompare(b.stage));
}

const escapeHtml = (s: string) =>
  (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

export interface CutoffRowsHtmlOptions {
  /** A source-link cell on every row (a table whose rows come from several documents). */
  sourceColumn: boolean;
  /** Link text for a source: its publisher, else its host. */
  sourceText: (source: number) => string;
  /** Text after a row's source link (" (reported)"), or "". */
  sourceSuffix: (source: number) => string;
  linkClass: string;
}

/** The <tbody> rows of a published-cutoff table as one HTML string.
 *  Why a string (14 Sep 2026): rendered as React elements, a 300-row
 *  state-wise table is paid for again, several times over, in the page's
 *  RSC payload — SSC GD's cutoff page weighed 738 KB, 523 KB of it payload.
 *  As one string the payload carries the rows about once. Every value is
 *  escaped; a source is linked only when its URL is https. */
export function cutoffRowsHtml(table: CutoffTable, opts: CutoffRowsHtmlOptions): string {
  return table.rows
    .map((row) => {
      const cells = table.categories.map((c) => `<td>${escapeHtml(row.cells[c] ?? "—")}</td>`).join("");
      const source = table.sources[row.source];
      let sourceCell = "";
      if (opts.sourceColumn && source) {
        const text = escapeHtml(opts.sourceText(row.source));
        const link = /^https:\/\//.test(source.url)
          ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener nofollow" class="${escapeHtml(opts.linkClass)}">${text} ↗</a>`
          : text;
        sourceCell = `<td>${link}${escapeHtml(opts.sourceSuffix(row.source))}</td>`;
      }
      return `<tr><th scope="row">${escapeHtml(row.label || source?.publisher || "")}</th>${cells}${sourceCell}</tr>`;
    })
    .join("");
}

/** The <tbody> of a one-row, unsplit table: a "category | cutoff" row per category. */
export function cutoffCategoryRowsHtml(table: CutoffTable): string {
  const row = table.rows[0];
  return table.categories.map((c) => `<tr><th scope="row">${escapeHtml(c)}</th><td>${escapeHtml(row?.cells[c] ?? "")}</td></tr>`).join("");
}

/** Machine-readable lines for context.md / llms-full: every figure leaves
 *  with its tier word and the document link. */
export function cutoffContextLines(
  tables: readonly CutoffTable[],
  tierOf: (url: string) => "official" | "reported",
  maxLines = 30,
): string[] {
  const line = (t: CutoffTable, row: CutoffTableRow): string | null => {
    const figures = t.categories
      .filter((c) => row.cells[c] != null)
      .map((c) => `${c} ${row.cells[c]}`)
      .join(", ");
    if (!figures) return null;
    const source = t.sources[row.source];
    const head = [t.cycle, t.stage, row.post, t.gender, row.region].filter(Boolean).join(" · ");
    const scale = [t.scoreType, t.maxMarks ? `out of ${t.maxMarks}` : ""].filter(Boolean).join(", ");
    return `- ${head}: ${figures}${scale ? ` (${scale})` : ""} — ${tierOf(source.url)}, published by ${source.publisher || "source"}: ${source.url}`;
  };
  // Rows from every table in turn: one long state-wise table must not fill
  // the whole budget and hide the other cycles and stages.
  const lines: string[] = [];
  const next = tables.map(() => 0);
  for (let progressed = true; progressed && lines.length < maxLines; ) {
    progressed = false;
    tables.forEach((t, i) => {
      while (next[i] < t.rows.length && lines.length < maxLines) {
        const l = line(t, t.rows[next[i]++]);
        progressed = true;
        if (l) {
          lines.push(l);
          break;
        }
      }
    });
  }
  return lines;
}

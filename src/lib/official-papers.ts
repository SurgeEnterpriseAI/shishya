// Official previous-year question papers and answer keys (14 Sep 2026).
//
// Shishya's own year-wise sets are PYQ-pattern questions, freshly worded in
// each year's pattern and never the paper (11 Sep 2026 honesty pass).
// Students, and ChatGPT answering them, look for the real papers, so the exam
// hub and each year's page link the files a conducting body publishes on its
// own site, with year, paper, kind and publisher: a link to the body's file,
// never a copy. Rows are written only by scripts/import-official-papers.ts,
// which downloads every file, confirms it is a PDF on an official host linked
// from the body's listing page, and finds its year beside that link or on the
// file's first page. The pure rules the importer and the pages share live here.

export const PAPER_KINDS = ["question paper", "question paper with answer key", "answer key", "listing page"] as const;
export type PaperKind = (typeof PAPER_KINDS)[number];

export interface OfficialPaperRow {
  year: string;
  paper: string;
  kind: string;
  language: string;
  url: string;
  listingUrl: string;
  publisher: string;
  bytes: number;
  pages: number;
  scan: boolean;
}

// ── hosts ─────────────────────────────────────────────────────────────

const TWO_PART_SUFFIXES = new Set(["gov.in", "nic.in", "ac.in", "edu.in", "res.in", "co.in", "org.in", "net.in", "gen.in", "ind.in"]);
/** Indian government and public academic domains: where conducting bodies publish. */
const OFFICIAL_SUFFIXES = ["gov.in", "nic.in", "ac.in", "edu.in", "res.in"];

/** Lower-case host of an http(s) URL; null for anything else (javascript:, mailto:, garbage). */
export function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** "rpsc.rajasthan.gov.in" → "rajasthan.gov.in"; "www.tslprb.in" → "tslprb.in". */
export function baseDomain(host: string): string {
  const labels = (host ?? "").toLowerCase().replace(/\.$/, "").split(".").filter(Boolean);
  return labels.slice(TWO_PART_SUFFIXES.has(labels.slice(-2).join(".")) ? -3 : -2).join(".");
}

/** Official when the host is an Indian government / public academic domain, or shares its
 *  domain with the exam's official portal (a body such as TSLPRB publishing from its own .in). */
export function isOfficialHost(host: string | null, officialPortalHost: string | null): boolean {
  if (!host) return false;
  const h = host.toLowerCase();
  if (OFFICIAL_SUFFIXES.some((s) => h === s || h.endsWith(`.${s}`))) return true;
  return !!officialPortalHost && baseDomain(h) === baseDomain(officialPortalHost);
}

// ── years ─────────────────────────────────────────────────────────────

// Zero code points of the Indic digit blocks listing pages print years in:
// Devanagari, Bengali, Gurmukhi, Gujarati, Oriya, Tamil, Telugu, Kannada, Malayalam.
const DIGIT_ZEROS = [0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66];

export function asciiDigits(s: string): string {
  return (s ?? "").replace(/[०-९০-৯੦-੯૦-૯୦-୯௦-௯౦-౯೦-೯൦-൯]/g, (ch) => {
    const cp = ch.codePointAt(0) ?? 0;
    const zero = DIGIT_ZEROS.find((z) => cp >= z && cp <= z + 9) ?? cp;
    return String(cp - zero);
  });
}

/** The four-digit year a label names: "2024" and "2024-25" → "2024"; none → null. */
export function paperYear(label: string): string | null {
  const m = asciiDigits(label ?? "").match(/(?<!\d)(?:19|20)\d{2}(?!\d)/);
  return m ? m[0] : null;
}

/** Is that year printed in the text as a whole number? */
export function yearPrinted(text: string, year: string): boolean {
  return /^\d{4}$/.test(year) && new RegExp(`(?<!\\d)${year}(?!\\d)`).test(asciiDigits(text ?? ""));
}

// ── listing page check ────────────────────────────────────────────────

function textOf(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** How a listing page's HTML can spell a link to the file: its path (absolute or relative,
 *  percent-encoded or not), or its file name when that name is distinctive. */
function linkNeedles(fileUrl: string): string[] {
  let path = "";
  try {
    path = new URL(fileUrl).pathname;
  } catch {
    return [];
  }
  const decoded = (() => {
    try {
      return decodeURIComponent(path);
    } catch {
      return path;
    }
  })();
  const needles = new Set<string>();
  for (const p of [path, decoded, decoded.replace(/ /g, "%20")]) {
    const rel = p.replace(/^\/+/, "");
    if (rel.length >= 6) needles.add(rel.toLowerCase());
    const name = rel.split("/").pop() ?? "";
    if (name.length >= 12) needles.add(name.toLowerCase());
  }
  return [...needles];
}

/** A paragraph, box, list or table holding more links than this is a page section, not one entry. */
const MAX_LINKS_IN_GROUP = 6;
const linkCount = (lowerHtml: string) => (lowerHtml.match(/<a\s/g) ?? []).length;

/** [open, close) of the nearest enclosing element with that tag, within maxSpan characters. */
function enclosing(lower: string, at: number, tag: string, maxSpan: number): [number, number] | null {
  const open = Math.max(lower.lastIndexOf(`<${tag}>`, at), lower.lastIndexOf(`<${tag} `, at));
  if (open === -1 || at - open > maxSpan) return null;
  const closedBefore = lower.indexOf(`</${tag}>`, open);
  if (closedBefore !== -1 && closedBefore < at) return null;
  const close = lower.indexOf(`</${tag}>`, at);
  return close === -1 || close - open > maxSpan ? null : [open, close];
}

/** Text of the table row or list item holding the link, or of a paragraph / box with only a few links. */
function entryText(html: string, lower: string, at: number): string {
  for (const tag of ["tr", "li", "p", "div"]) {
    const span = enclosing(lower, at, tag, 6000);
    if (!span) continue;
    if ((tag === "p" || tag === "div") && linkCount(lower.slice(span[0], span[1])) > MAX_LINKS_IN_GROUP) continue;
    return textOf(html.slice(span[0], span[1]));
  }
  return "";
}

/** The heading just before a short list or table holding the link ("… (Published on 05/07/2019):"),
 *  back to the previous link. A long table's heading is never credited to every row in it. */
function groupHeadingText(html: string, lower: string, at: number): string {
  for (const tag of ["ul", "ol", "table"]) {
    const span = enclosing(lower, at, tag, 20000);
    if (!span) continue;
    if (linkCount(lower.slice(span[0], span[1])) > MAX_LINKS_IN_GROUP) return "";
    const floor = Math.max(0, span[0] - 1500);
    const previousLink = lower.lastIndexOf("</a>", span[0]);
    return textOf(html.slice(previousLink >= floor ? previousLink + 4 : floor, span[0]));
  }
  return "";
}

export interface ListingCheck {
  /** The listing's HTML links the file. */
  linked: boolean;
  /** The year is printed in the link's own row / item, or in the heading of the short list holding it. */
  yearBeside: boolean;
  /** The text the year was read from (≤ 200 chars), kept as evidence. */
  evidence: string;
  /** What the listing prints around the link, heading » row or item (≤ 300 chars): what a person checks
   *  to confirm the file is this exam's paper. */
  context: string;
}

/** A listing served as JSON (a site's search API, as HSSC's older notices are) has no rows: the object
 *  holding the link is the entry. File paths are dropped first, so a year that only appears in a file
 *  name is never read as printed beside the link — the same as an href in an HTML row. */
function jsonEntryText(raw: string, at: number): string {
  const open = raw.lastIndexOf("{", at);
  const close = raw.indexOf("}", at);
  if (open === -1 || close === -1 || close - open > 3000) return "";
  return raw
    .slice(open, close + 1)
    .replace(/\\\//g, "/")
    .replace(/[^\s",:{}[\]]*\.pdf\b/gi, " ")
    .replace(/[",:{}[\]\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function checkListing(html: string, fileUrl: string, year: string): ListingCheck {
  const lower = (html ?? "").toLowerCase();
  const looksJson = /^\s*[[{]/.test(html ?? "");
  const hits: number[] = [];
  for (const needle of linkNeedles(fileUrl)) {
    for (let i = lower.indexOf(needle); i !== -1 && hits.length < 40; i = lower.indexOf(needle, i + needle.length)) hits.push(i);
  }
  if (hits.length === 0) return { linked: false, yearBeside: false, evidence: "", context: "" };
  const y = paperYear(year);
  const around = (at: number) => {
    const entry = looksJson ? jsonEntryText(html, at) : entryText(html, lower, at);
    const heading = groupHeadingText(html, lower, at);
    return { entry, heading, context: [heading.slice(-150), entry.slice(0, 150)].filter(Boolean).join(" » ") };
  };
  for (const at of hits) {
    const { entry, heading, context } = around(at);
    if (y && yearPrinted(entry, y)) return { linked: true, yearBeside: true, evidence: entry.slice(0, 200), context };
    if (y && yearPrinted(heading, y)) return { linked: true, yearBeside: true, evidence: heading.slice(-200), context };
  }
  const first = around(hits[0]);
  return { linked: true, yearBeside: false, evidence: first.entry.slice(0, 200), context: first.context };
}

// ── display ───────────────────────────────────────────────────────────

const kindRank = (k: string) => {
  const i = (PAPER_KINDS as readonly string[]).indexOf(k);
  return i === -1 ? PAPER_KINDS.length : i;
};

export interface PaperYearGroup {
  year: string;
  rows: OfficialPaperRow[];
}

/** Latest year first; within a year, question papers before keys. Listing pages are left out. */
export function groupPapersByYear(rows: readonly OfficialPaperRow[]): PaperYearGroup[] {
  const byYear = new Map<string, OfficialPaperRow[]>();
  for (const r of rows) {
    if (r.kind === "listing page") continue;
    const list = byYear.get(r.year) ?? [];
    list.push(r);
    byYear.set(r.year, list);
  }
  return [...byYear.entries()]
    .map(([year, list]) => ({
      year,
      rows: list.sort((a, b) => kindRank(a.kind) - kindRank(b.kind) || a.paper.localeCompare(b.paper)),
    }))
    .sort((a, b) => Number(paperYear(b.year) ?? 0) - Number(paperYear(a.year) ?? 0) || b.year.localeCompare(a.year));
}

/** The papers for one calendar year (a /pyq/[year] page), question papers first. */
export function papersForYear(rows: readonly OfficialPaperRow[], year: number): OfficialPaperRow[] {
  return groupPapersByYear(rows)
    .filter((g) => paperYear(g.year) === String(year))
    .flatMap((g) => g.rows);
}

export function listingPages(rows: readonly OfficialPaperRow[]): OfficialPaperRow[] {
  return rows.filter((r) => r.kind === "listing page");
}

/** "2.8 MB", "640 KB"; "" when unknown. */
export function formatPdfSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  return bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1000))} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;
}

/** context.md / answer-engine lines: one per file, then the listing pages. */
export function paperContextLines(rows: readonly OfficialPaperRow[], max = 40): string[] {
  const lines: string[] = [];
  for (const g of groupPapersByYear(rows)) {
    for (const r of g.rows) {
      const about = [r.kind, r.language, r.scan ? "scanned PDF" : "PDF", formatPdfSize(r.bytes)].filter(Boolean).join(", ");
      lines.push(`- ${r.year} · ${r.paper} (${about}) — published by ${r.publisher}: ${r.url}`);
    }
  }
  for (const r of listingPages(rows)) {
    lines.push(`- ${r.publisher} lists its ${r.paper} on its own site (files open from that page): ${r.url}`);
  }
  return lines.slice(0, max);
}

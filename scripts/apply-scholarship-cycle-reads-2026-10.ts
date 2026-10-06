// scripts/apply-scholarship-cycle-reads-2026-10.ts — this year's status for the
// 30 most-landed scholarship schemes (non-exam-value spec, step 2, 3 Oct 2026).
//
// What it does: reads data/scholarships/cycle-reads-2026-10.json (one entry per
// scheme: what the awarding body's own page says, the quoted visible line, the
// read time, and a decision) and writes into src/data/scholarships.ts:
//   • the `cycle` of the rows marked "set-cycle" (no cycle yet) or
//     "refresh-cycle" (an existing cycle re-read), each with a one-line comment
//     that points back to the evidence file;
//   • the entry's `rowFixes` (review, 3 Oct 2026): a field correction read on
//     the same official page — a dead apply link, wrong usual-window prose, a
//     name the awarding body does not use, a missing eligible category, and
//     (second review) eligibility limits and an amount that the body's page
//     states otherwise. Only the fields in FIX_FIELDS, only when the row still
//     holds the `from` value, only on rows whose cycle this run writes. An
//     eligibility sub-field may be added (`from: null`, the row has none) or
//     removed (`to: null`, a hard limit the body's page does not set); the
//     undo log keeps the whole row as it was.
// Nothing else in a row changes, and no row gains `reviewed` (the reads found
// no row whose eligibility and amount both match the body's page in full; the
// remaining mismatches are listed in the evidence file for a separate fix).
// "no-change" rows are printed with the reason and left alone.
//
// Rules it keeps:
//   • a cycle is written only from the awarding body's own page (tier
//     "official"); an aggregator's date is never written (HDFC's ECSS date is
//     on a Buddy4Study-run site, so that row is "no-change");
//   • a quote is visible page text: text found only inside an HTML comment or
//     a hidden element is kept apart in `hidden` and is never the evidence for
//     a date or a status (checkReads refuses a quote that says otherwise);
//   • a page that shows no 2026-27 date gives a cycle with no closesOn, which
//     the site prints as "No 2026-27 date on the official portal yet
//     ({host}, checked {day})" (src/lib/scholarship-lists.ts cycleLeadLine) —
//     unless the page's own quoted line says applications are open now
//     (cycle.openNow: "Open now for 2026-27 — the official page gives no last
//     date …") or taken at any time (cycle.rolling) (4 Oct 2026; checkReads
//     refuses either with a last date, both together, or without a quote);
//   • a row outside the ranked 30 that is the same scheme as a ranked entry
//     (companionOf: gj-mysy-fees → gujarat-mysy, ts-cm-overseas →
//     ts-overseas-bc) gets that entry's cycle exactly, from the same reads
//     (4 Oct 2026);
//   • a cycle's checkedOn is a day on which its source page was read (a
//     successful read of that URL logged with that day) and is never earlier
//     than readOn (4 Oct 2026 review fixes): a check day moves only with a
//     logged read of the page on the new day;
//   • a row whose current cycle is not what the evidence file expects (a
//     "set-cycle" row that already has one, a "refresh-cycle" row without one),
//     or whose fixed field no longer holds the `from` value, is refused;
//   • never deletes: the row count, every id and every field other than the
//     planned cycles and row fixes are checked against a re-import of the
//     would-be file before anything is written;
//   • dates go stale: with a last date still ahead, --apply is refused when the
//     reads are more than MAX_READ_AGE_DAYS old. Re-read the pages of the
//     dates still ahead that day; if every date and status still matches,
//     pass --accept-stale-reads (each checkedOn stays the day its page was
//     read, which is still true). Move readOn only after re-reading every
//     written cycle's source page that day and logging each read; a
//     checkedOn moves only for a page read on the new day (checkReads).
//
// Search surfaces: page-HTML changes on the changed schemes' pages (the date
// line, the FAQ answer and its FAQPage JSON-LD, the WebPage dateModified, the
// meta description where the date is still ahead or a fixed field feeds it;
// a name fix also changes the title, H1 and every list and context line that
// prints the name), and list-level changes (closing-soon rows, /scholarships
// "soonest", the list FAQs, /scholarships/context.md lines). The dry run prints
// every one of them, before → after, for --today (default: today in IST).
//
// Usage (from the repo root; no DB, no network, no AI):
//   npx tsx scripts/apply-scholarship-cycle-reads-2026-10.ts                  dry run
//   npx tsx scripts/apply-scholarship-cycle-reads-2026-10.ts --today=2026-10-12
//   npx tsx scripts/apply-scholarship-cycle-reads-2026-10.ts --cycles-only    leave every row fix out
//   npx tsx scripts/apply-scholarship-cycle-reads-2026-10.ts --skip-fix=ts-overseas-bc:name[,<id>:<field>…]
//     (--cycles-only and --skip-fix are for dry runs: the tests pin that every
//     fix in the evidence file is written, so to ship without a fix, take it
//     out of the evidence file instead)
//   npx tsx scripts/apply-scholarship-cycle-reads-2026-10.ts --preview=<file> dry run, and write the would-be data file there (never inside src/)
//   npx tsx scripts/apply-scholarship-cycle-reads-2026-10.ts --apply          write src/data/scholarships.ts + an undo log in data/fix-logs/
//   npx tsx scripts/apply-scholarship-cycle-reads-2026-10.ts --undo=<log>     dry run of the undo; add --apply to restore (and log the undo)
// After --apply: run tests/unit/scholarship-lists.test.ts, home-door-links and
// the new tests/unit/scholarship-cycle-reads.test.ts, deploy, then push
// IndexNow for the changed URLs (the dry run lists them) with the existing
// submit script.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Scholarship, ScholarshipCycle } from "@/data/scholarships";

export const DATA_FILE = "src/data/scholarships.ts";
export const READS_FILE = "data/scholarships/cycle-reads-2026-10.json";
export const LOG_DIR = "data/fix-logs";
/** The data file's own constant for NSP's scheme list (kept, not inlined). */
const NSP_SCHEMES_URL = "https://scholarships.gov.in/All-Scholarships";
/** Reads older than this (days) are not applied while a written last date is still ahead. */
export const MAX_READ_AGE_DAYS = 3;
/** Discovery portals and copy sites: never the source of a cycle or a fix (spec step 2). */
export const AGGREGATOR_HOST = /(^|\.)(buddy4study\.com|vidyasaarathi\.co\.in|vidyalakshmi\.co\.in|parivartanecss\.com|scholarships\.net\.in|leverageedu\.com|collegedekho\.com|shiksha\.com|careers360\.com|jagranjosh\.com)$/;

export type ReadDecision = "set-cycle" | "refresh-cycle" | "no-change";

export interface PageRead {
  url: string;
  result: string;
  readAt: string;
  /** Visible page text (what a visitor sees, or opens with a click on the page's own control). */
  quote?: string;
  translation?: string;
  /** Text found on the saved page only inside an HTML comment or an element
   *  nothing on the page opens — recorded so the first read's mistake is
   *  visible, never used as evidence for a date or a status. */
  hidden?: string;
}

/** The catalogue fields a row fix may correct. */
export type FixField =
  | "name"
  | "applyUrl"
  | "deadline"
  | "amount"
  | "eligibility.categories"
  | "eligibility.note"
  | "eligibility.incomeMaxLakhs"
  | "eligibility.minMarksPct";
export const FIX_FIELDS: readonly FixField[] = [
  "name",
  "applyUrl",
  "deadline",
  "amount",
  "eligibility.categories",
  "eligibility.note",
  "eligibility.incomeMaxLakhs",
  "eligibility.minMarksPct",
];
/** The fields whose value is a number literal (lakhs ₹, percent). */
export const NUMBER_FIELDS: readonly FixField[] = ["eligibility.incomeMaxLakhs", "eligibility.minMarksPct"];

/** A fixed value: text, a number, a list, or null = the field is absent
 *  (as `from`: the row has none and the fix adds it; as `to`: the fix
 *  removes it). Only an eligibility sub-field may be absent. */
export type FixValue = string | number | string[] | null;

/** One field correction read on the awarding body's own page. */
export interface RowFix {
  field: FixField;
  from: FixValue;
  to: FixValue;
  sourceUrl: string;
  why: string;
}

export interface SchemeRead {
  rank: number;
  id: string;
  landings90: number;
  decision: ReadDecision;
  why: string;
  reads: PageRead[];
  cycle?: ScholarshipCycle;
  rowFixes?: RowFix[];
  reviewed: boolean;
  eligibilityAmount: string;
  mismatches: string[];
  note?: string;
  /** Appended to the comment written above the cycle (e.g. which older
   *  comment's date this read supersedes). */
  commentNote?: string;
  /** 4 Oct 2026: a catalogue row outside the 30 most-landed that is the same
   *  scheme as the ranked entry named here (gj-mysy-fees → gujarat-mysy). It
   *  rests on that entry's reads and gets the identical cycle, so the two
   *  pages cannot disagree (rank > 30). */
  companionOf?: string;
}

export interface CycleReads {
  readOn: string;
  review?: string;
  schemes: SchemeRead[];
}

export interface RowEdit {
  id: string;
  decision: Exclude<ReadDecision, "no-change">;
  fixes?: RowFix[];
  beforeRow: string;
  afterRow: string;
}

// ── Reading the evidence file ────────────────────────────────────────────

export function loadReads(file: string = READS_FILE): CycleReads {
  return JSON.parse(fs.readFileSync(file, "utf8")) as CycleReads;
}

/** The rows this run writes, in rank order. */
export function writableReads(reads: CycleReads): SchemeRead[] {
  return reads.schemes.filter((s) => s.decision !== "no-change").sort((a, b) => a.rank - b.rank);
}

/** The quoted line a cycle rests on: the first read with a quote on exactly
 *  the cycle's own source URL, else on a URL under it, else the first quote
 *  (NSP's home page and its scheme list share a prefix). */
export function sourceQuote(s: SchemeRead): PageRead | undefined {
  const exact = s.reads.find((r) => r.quote && s.cycle && r.url === s.cycle.sourceUrl);
  const own = s.reads.find((r) => r.quote && s.cycle && r.url.startsWith(s.cycle.sourceUrl));
  return exact ?? own ?? s.reads.find((r) => r.quote);
}

/** The reads with only the chosen row fixes: none with cyclesOnly, all but
 *  the `skip` ones ("<id>:<field>") otherwise. An unknown skip key throws. */
export function selectFixes(reads: CycleReads, opts: { cyclesOnly?: boolean; skip?: readonly string[] } = {}): CycleReads {
  const known = new Set(reads.schemes.flatMap((s) => (s.rowFixes ?? []).map((f) => `${s.id}:${f.field}`)));
  for (const k of opts.skip ?? []) if (!known.has(k)) throw new Error(`--skip-fix=${k}: no such row fix (known: ${[...known].join(", ") || "none"})`);
  const skip = new Set(opts.skip ?? []);
  return {
    ...reads,
    schemes: reads.schemes.map((s) => ({ ...s, rowFixes: opts.cyclesOnly ? [] : (s.rowFixes ?? []).filter((f) => !skip.has(`${s.id}:${f.field}`)) })),
  };
}

/** Whole days from readOn to today (both YYYY-MM-DD). */
export function readAgeDays(readOn: string, today: string): number {
  return Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${readOn}T00:00:00Z`)) / 86_400_000);
}

/** The written rows whose last date is still ahead on `today` — the dates a stale read can get wrong. */
export function datedAhead(reads: CycleReads, today: string): SchemeRead[] {
  return writableReads(reads).filter((s) => !!s.cycle?.closesOn && s.cycle.closesOn >= today);
}

/** The --undo value: null when absent; a bare --undo (no log path) throws. */
export function undoArg(argv: readonly string[]): string | null {
  const hit = argv.find((a) => a === "--undo" || a.startsWith("--undo="));
  if (hit === undefined) return null;
  const v = hit.includes("=") ? hit.slice(hit.indexOf("=") + 1).trim() : "";
  if (!v) throw new Error("--undo needs the apply log: --undo=data/fix-logs/scholarship-cycle-reads-2026-10.apply.<stamp>.json");
  return v;
}

// ── Text scanning (strings and comments are skipped) ────────────────────

/** Index just past a string literal or comment starting at i, or -1 when none starts there. */
function skipLiteral(text: string, i: number): number {
  const c = text[i];
  if (c === "/" && text[i + 1] === "/") {
    const nl = text.indexOf("\n", i);
    return nl === -1 ? text.length : nl;
  }
  if (c === "/" && text[i + 1] === "*") {
    const end = text.indexOf("*/", i + 2);
    return end === -1 ? text.length : end + 2;
  }
  if (c === '"' || c === "'" || c === "`") {
    let j = i + 1;
    while (j < text.length && text[j] !== c) j += text[j] === "\\" ? 2 : 1;
    return j + 1;
  }
  return -1;
}

/** Index just past the bracket that closes the one at `open` ({ or [). */
export function matchBracket(text: string, open: number): number {
  const opener = text[open];
  if (opener !== "{" && opener !== "[") throw new Error(`no bracket at ${open}`);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const skip = skipLiteral(text, i);
    if (skip !== -1) {
      i = skip - 1;
      continue;
    }
    const c = text[i];
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  throw new Error(`unclosed bracket at ${open}`);
}

/** The catalogue row object for `id`: [start of its "{", just past its "}"). */
export function rowSpan(text: string, id: string): { start: number; end: number } {
  const key = `id: ${JSON.stringify(id)},`;
  const first = text.indexOf(key);
  if (first === -1) throw new Error(`${id}: row not found`);
  if (text.indexOf(key, first + 1) !== -1) throw new Error(`${id}: more than one row`);
  const start = text.lastIndexOf("{", first);
  if (start === -1 || text.slice(start + 1, first).trim() !== "") throw new Error(`${id}: "id" is not the row's first property`);
  return { start, end: matchBracket(text, start) };
}

/** A property of the object literal `obj` (which starts with "{"), at its own
 *  level: where its key starts and its value (a string, number, array or
 *  object literal) starts and ends. */
function findProp(obj: string, prop: string): { keyStart: number; valueStart: number; valueEnd: number } | null {
  let depth = 0;
  for (let i = 0; i < obj.length; i++) {
    const skip = skipLiteral(obj, i);
    if (skip !== -1) {
      i = skip - 1;
      continue;
    }
    const c = obj[i];
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") depth--;
    else if (depth === 1 && obj.startsWith(`${prop}:`, i) && /[\s{,]/.test(obj[i - 1] ?? "")) {
      let v = i + prop.length + 1;
      while (/\s/.test(obj[v])) v++;
      const num = /^-?\d+(\.\d+)?(?=[\s,}\]])/.exec(obj.slice(v));
      if (num) return { keyStart: i, valueStart: v, valueEnd: v + num[0].length };
      const end = obj[v] === "{" || obj[v] === "[" ? matchBracket(obj, v) : skipLiteral(obj, v);
      if (end === -1 || !/["'`{[]/.test(obj[v])) throw new Error(`${prop}: value is not a literal`);
      return { keyStart: i, valueStart: v, valueEnd: end };
    }
  }
  return null;
}

/** A top-level property of a row object whose value is an object literal (the cycle). */
export function topLevelProp(row: string, prop: string): { keyStart: number; valueStart: number; valueEnd: number } | null {
  const p = findProp(row, prop);
  if (p && row[p.valueStart] !== "{") throw new Error(`${prop}: value is not an object literal`);
  return p;
}

/** Where a fixable field's key and value literal sit in a row ("eligibility.note" looks inside eligibility). */
export function fieldSpan(row: string, field: FixField): { keyStart: number; valueStart: number; valueEnd: number } | null {
  const [head, sub] = field.split(".");
  const top = findProp(row, head);
  if (!top || !sub) return top;
  if (row[top.valueStart] !== "{") throw new Error(`${head}: value is not an object literal`);
  const inner = findProp(row.slice(top.valueStart, top.valueEnd), sub);
  return inner && { keyStart: top.valueStart + inner.keyStart, valueStart: top.valueStart + inner.valueStart, valueEnd: top.valueStart + inner.valueEnd };
}

/** The row with a new property `sub: value` added at the end of its `head`
 *  object (eligibility), in the object's own layout. */
function addSubProp(row: string, head: string, sub: string, value: string): string {
  const top = findProp(row, head);
  if (!top || row[top.valueStart] !== "{") throw new Error(`${head}: no object literal to add ${sub} to`);
  const obj = row.slice(top.valueStart, top.valueEnd);
  const body = obj.slice(0, -1).replace(/\s+$/, "");
  let next: string;
  if (obj.includes("\n")) {
    const closeIndent = /\n([ \t]*)\}$/.exec(obj)?.[1] ?? "";
    next = `${body}${body.endsWith(",") || body === "{" ? "" : ","}\n${closeIndent}  ${sub}: ${value},\n${closeIndent}}`;
  } else next = body === "{" ? `{ ${sub}: ${value} }` : `${body.replace(/,$/, "")}, ${sub}: ${value} }`;
  return row.slice(0, top.valueStart) + next + row.slice(top.valueEnd);
}

/** The row without the property whose key starts at keyStart and whose value ends at valueEnd. */
function removeProp(row: string, keyStart: number, valueEnd: number): string {
  const lineStart = row.lastIndexOf("\n", keyStart - 1) + 1;
  const ownLine = row.slice(lineStart, keyStart).trim() === "" && /^,?[ \t]*\n/.test(row.slice(valueEnd));
  if (ownLine) return row.slice(0, lineStart) + row.slice(row.indexOf("\n", valueEnd) + 1);
  const after = /^,\s*/.exec(row.slice(valueEnd));
  if (after) return row.slice(0, keyStart) + row.slice(valueEnd + after[0].length);
  // The last property of a one-line object: drop the ", " before it.
  const before = /,\s*$/.exec(row.slice(0, keyStart));
  if (!before) throw new Error("cannot remove the only property of an object");
  return row.slice(0, keyStart - before[0].length) + row.slice(valueEnd);
}

// ── Rendering ────────────────────────────────────────────────────────────

// 4 Oct 2026: openNow / rolling (true only) — the two no-last-date states the
// site prints (src/lib/scholarship-lists.ts lastDateOf).
const CYCLE_KEYS = ["year", "opensOn", "closesOn", "openNow", "rolling", "sourceUrl", "tier", "checkedOn", "note"] as const;

function literal(key: string, value: string | boolean): string {
  if (key === "sourceUrl" && value === NSP_SCHEMES_URL) return "NSP_SCHEMES_URL";
  return JSON.stringify(value);
}

/** The cycle as an object literal: one line, or one property a line at `indent`. */
export function renderCycle(c: ScholarshipCycle, indent: string | null): string {
  if (c.levelWindows) throw new Error("levelWindows are not written by this script");
  const parts = CYCLE_KEYS.flatMap((k) => (c[k] === undefined ? [] : [`${k}: ${literal(k, c[k] as string | boolean)}`]));
  if (indent === null) return `{ ${parts.join(", ")} }`;
  return `{\n${parts.map((p) => `${indent}  ${p},`).join("\n")}\n${indent}}`;
}

/** A fixed value in the catalogue's own style: "text", 2.5 or ["A", "B"]. */
function renderValue(v: Exclude<FixValue, null>): string {
  return Array.isArray(v) ? `[${v.map((x) => JSON.stringify(x)).join(", ")}]` : JSON.stringify(v);
}

/** The comment written above a cycle (wrapped at ~100 columns); names the row fixes made with it. */
export function cycleComment(s: SchemeRead, indent: string): string {
  const what = s.decision === "refresh-cycle" ? "re-read on the awarding body's own page" : "read on the awarding body's own page";
  const fixes = (s.rowFixes ?? []).map((f) => f.field);
  const also = fixes.length ? ` Also corrected from the same reads: ${fixes.join(", ")}.` : "";
  const extra = s.commentNote?.trim() ? ` ${s.commentNote.trim()}` : "";
  const text = `3 Oct 2026 (non-exam-value step 2): this year's status ${what}; the quoted line and read time are in ${READS_FILE}.${also}${extra}`;
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && (indent + "// " + cur + " " + w).length > 100) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  return lines.map((l) => `${indent}// ${l}`).join("\n");
}

// ── Planning edits ───────────────────────────────────────────────────────

/** One row fix: the field must still hold `from` exactly (absent when `from`
 *  is null); it becomes `to` (is removed when `to` is null). */
export function applyFix(row: string, id: string, f: RowFix): string {
  if (!FIX_FIELDS.includes(f.field)) throw new Error(`${id}: ${f.field} is not a fixable field`);
  const [head, sub] = f.field.split(".");
  if ((f.from === null || f.to === null) && !sub) throw new Error(`${id}: ${f.field} cannot be added or removed (only an eligibility sub-field can)`);
  const span = fieldSpan(row, f.field);
  if (!span) {
    if (f.from !== null) throw new Error(`${id}: ${f.field} not found in the row`);
    if (f.to === null) throw new Error(`${id}: ${f.field} fix changes nothing`);
    return addSubProp(row, head, sub, renderValue(f.to));
  }
  const text = row.slice(span.valueStart, span.valueEnd);
  let current: unknown;
  try {
    current = JSON.parse(text);
  } catch {
    throw new Error(`${id}: ${f.field} is not a plain literal (${text.slice(0, 40)})`);
  }
  if (JSON.stringify(current) !== JSON.stringify(f.from)) throw new Error(`${id}: ${f.field} is ${JSON.stringify(current)}, not the expected ${JSON.stringify(f.from)}`);
  if (f.to === null) return removeProp(row, span.keyStart, span.valueEnd);
  return row.slice(0, span.valueStart) + renderValue(f.to) + row.slice(span.valueEnd);
}

/** The row with its cycle set or replaced (the comment above it names any row fixes). */
function editCycle(row: string, s: SchemeRead): string {
  if (!s.cycle) throw new Error(`${s.id}: ${s.decision} without a cycle`);
  const multiline = /^\{\s*\n/.test(row);
  const prop = topLevelProp(row, "cycle");
  if (s.decision === "refresh-cycle") {
    if (!prop) throw new Error(`${s.id}: refresh-cycle, but the row has no cycle`);
    const lineStart = row.lastIndexOf("\n", prop.keyStart) + 1;
    const indent = row.slice(lineStart, prop.keyStart);
    if (indent.trim() !== "") throw new Error(`${s.id}: the cycle does not start its own line`);
    const wasMultiline = row.slice(prop.valueStart, prop.valueEnd).includes("\n");
    const value = renderCycle(s.cycle, wasMultiline ? indent : null);
    return row.slice(0, lineStart) + `${cycleComment(s, indent)}\n${indent}cycle: ${value}` + row.slice(prop.valueEnd);
  }
  if (prop) throw new Error(`${s.id}: set-cycle, but the row already has a cycle`);
  if (multiline) {
    // "    tags: [...],\n  }" → insert before the closing line.
    const close = row.lastIndexOf("\n");
    const before = row.slice(0, close).replace(/\s+$/, "");
    if (!before.endsWith(",")) throw new Error(`${s.id}: last property has no trailing comma`);
    const indent = "    ";
    return `${before}\n${cycleComment(s, indent)}\n${indent}cycle: ${renderCycle(s.cycle, indent)},` + row.slice(close);
  }
  // One-line row "{ id: …, tags: [...] }" → the catalogue's existing style:
  // "{ id: …, tags: [...],\n    // …\n    cycle: { … } }".
  const body = row.slice(0, -1).replace(/\s+$/, "").replace(/,$/, "");
  return `${body},\n${cycleComment(s, "    ")}\n    cycle: ${renderCycle(s.cycle, null)} }`;
}

/** The text of one row after its cycle is set or replaced and its row fixes are made. */
export function editRow(row: string, s: SchemeRead): string {
  let out = editCycle(row, s);
  for (const f of s.rowFixes ?? []) out = applyFix(out, s.id, f);
  return out;
}

/** Every row edit, applied in file order; the new file text. */
export function planEdits(text: string, reads: CycleReads): { text: string; edits: RowEdit[] } {
  const spans = writableReads(reads)
    .map((s) => ({ s, ...rowSpan(text, s.id) }))
    .sort((a, b) => b.start - a.start); // last first, so earlier offsets stay valid
  let out = text;
  const edits: RowEdit[] = [];
  for (const { s, start, end } of spans) {
    const beforeRow = out.slice(start, end);
    const afterRow = editRow(beforeRow, s);
    out = out.slice(0, start) + afterRow + out.slice(end);
    edits.push({ id: s.id, decision: s.decision as RowEdit["decision"], fixes: s.rowFixes ?? [], beforeRow, afterRow });
  }
  return { text: out, edits: edits.reverse() };
}

/** Undo: each logged row back to its before text, only where the after text is still there exactly once. */
export function planUndo(text: string, edits: readonly RowEdit[]): { text: string; restored: string[]; skipped: string[] } {
  let out = text;
  const restored: string[] = [];
  const skipped: string[] = [];
  for (const e of edits) {
    const at = out.indexOf(e.afterRow);
    if (at === -1 || out.indexOf(e.afterRow, at + 1) !== -1) {
      skipped.push(e.id);
      continue;
    }
    out = out.slice(0, at) + e.beforeRow + out.slice(at + e.afterRow.length);
    restored.push(e.id);
  }
  return { text: out, restored, skipped };
}

// ── Checking the would-be file ───────────────────────────────────────────

function stable(v: unknown): string {
  return JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));
}

/** Imports a data-file text from a temporary copy (the file has no imports). */
export async function importCatalogue(text: string): Promise<Scholarship[]> {
  const tmp = path.join(os.tmpdir(), `scholarships-check-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.ts`);
  fs.writeFileSync(tmp, text, "utf8");
  try {
    const mod = (await import(pathToFileURL(tmp).href)) as { SCHOLARSHIPS: Scholarship[] };
    return mod.SCHOLARSHIPS;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

/** What a planned row must be after the run: its old self, the evidence cycle, the row fixes. */
export function expectedRow(before: Scholarship, s: SchemeRead): Scholarship {
  const e = structuredClone(before) as unknown as Record<string, unknown>;
  e.cycle = s.cycle;
  for (const f of s.rowFixes ?? []) {
    const [head, sub] = f.field.split(".");
    if (sub) {
      const obj: Record<string, unknown> = { ...(e[head] as Record<string, unknown>) };
      if (f.to === null) delete obj[sub];
      else obj[sub] = f.to;
      e[head] = obj;
    } else e[head] = f.to;
  }
  return e as unknown as Scholarship;
}

/** Problems with the would-be catalogue: anything other than the planned cycles and row fixes changed. */
export function verifyCatalogue(before: readonly Scholarship[], after: readonly Scholarship[], reads: CycleReads): string[] {
  const problems: string[] = [];
  if (before.length !== after.length) problems.push(`row count ${before.length} → ${after.length}`);
  const planned = new Map(writableReads(reads).map((s) => [s.id, s]));
  for (let i = 0; i < Math.max(before.length, after.length); i++) {
    const b = before[i];
    const a = after[i];
    if (!b || !a || b.id !== a.id) {
      problems.push(`row ${i}: id ${b?.id} → ${a?.id}`);
      continue;
    }
    const want = planned.get(a.id);
    if (want) {
      if (stable(a.cycle) !== stable(want.cycle)) problems.push(`${a.id}: cycle is not the planned one`);
      const { cycle: _ec, ...eRest } = expectedRow(b, want);
      const { cycle: _ac, ...aRest } = a;
      if (stable(eRest) !== stable(aRest)) problems.push(`${a.id}: a field other than the planned cycle and row fixes changed`);
    } else if (stable(a) !== stable(b)) problems.push(`${a.id}: changed but not planned`);
  }
  for (const id of planned.keys()) if (!after.some((s) => s.id === id)) problems.push(`${id}: planned row missing`);
  return problems;
}

function kindOf(v: Exclude<FixValue, null>): "array" | "number" | "string" {
  return Array.isArray(v) ? "array" : typeof v === "number" ? "number" : "string";
}

function hostOfUrl(u: string): string | null {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Problems with the evidence entries themselves (also pinned by tests/unit/scholarship-cycle-reads.test.ts). */
export function checkReads(reads: CycleReads, today: string): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const s of reads.schemes) {
    if (seen.has(s.id)) problems.push(`${s.id}: listed twice`);
    seen.add(s.id);
    // A quote is visible text; hidden text lives in `hidden` (review, 3 Oct 2026).
    for (const r of s.reads) if (r.quote && /HTML comment|not shown|pop-up/i.test(r.quote)) problems.push(`${s.id}: a quote marked as hidden text (${r.url}) — move it to \`hidden\``);
    const fixes = s.rowFixes ?? [];
    if (s.decision === "no-change") {
      if (s.cycle) problems.push(`${s.id}: no-change with a cycle`);
      if (fixes.length) problems.push(`${s.id}: row fixes on a no-change row`);
      continue;
    }
    for (const f of fixes) {
      if (!FIX_FIELDS.includes(f.field)) problems.push(`${s.id}: ${f.field} is not a fixable field`);
      if (JSON.stringify(f.from) === JSON.stringify(f.to)) problems.push(`${s.id}: ${f.field} fix changes nothing`);
      const want = NUMBER_FIELDS.includes(f.field) ? "number" : f.field === "eligibility.categories" ? "array" : "string";
      for (const v of [f.from, f.to])
        if (v === null ? !f.field.startsWith("eligibility.") : kindOf(v) !== want) problems.push(`${s.id}: ${f.field} fix value ${JSON.stringify(v)} is not a ${want}${f.field.startsWith("eligibility.") ? " or null" : ""}`);
      if (!f.why?.trim()) problems.push(`${s.id}: ${f.field} fix has no reason`);
      const fh = hostOfUrl(f.sourceUrl);
      if (!fh) problems.push(`${s.id}: ${f.field} fix sourceUrl does not parse`);
      else if (AGGREGATOR_HOST.test(fh)) problems.push(`${s.id}: ${f.field} fix sourced to an aggregator (${fh})`);
      if (!s.reads.some((r) => r.url.startsWith(f.sourceUrl) && /^200/.test(r.result))) problems.push(`${s.id}: ${f.field} fix has no successful read of its source URL`);
      if (f.field === "applyUrl" && !/^https:\/\//.test(String(f.to))) problems.push(`${s.id}: applyUrl fix is not https`);
      if (typeof f.to === "number" && !(f.to > 0 && f.to <= 100)) problems.push(`${s.id}: ${f.field} fix value ${f.to} is out of range`);
    }
    if (new Set(fixes.map((f) => f.field)).size !== fixes.length) problems.push(`${s.id}: a field fixed twice`);
    const c = s.cycle;
    if (!c) {
      problems.push(`${s.id}: ${s.decision} without a cycle`);
      continue;
    }
    if (c.year !== "2026-27") problems.push(`${s.id}: year ${c.year}`);
    if (c.tier !== "official") problems.push(`${s.id}: tier ${c.tier} (only official cycles are written)`);
    const host = hostOfUrl(c.sourceUrl);
    if (host === null) problems.push(`${s.id}: sourceUrl does not parse`);
    else if (AGGREGATOR_HOST.test(host)) problems.push(`${s.id}: sourceUrl on an aggregator (${host})`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.checkedOn) || c.checkedOn > today) problems.push(`${s.id}: checkedOn ${c.checkedOn}`);
    for (const d of [c.opensOn, c.closesOn]) if (d !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(d)) problems.push(`${s.id}: bad day ${d}`);
    if (c.opensOn && c.closesOn && c.opensOn > c.closesOn) problems.push(`${s.id}: opensOn after closesOn`);
    if (!s.reads.some((r) => r.url.startsWith(c.sourceUrl) && /^200/.test(r.result))) problems.push(`${s.id}: no successful read of the cycle's own source URL`);
    // 4 Oct 2026 (review fixes): the check day is a day the source page was
    // read, and never before readOn — so a slipped release cannot move a
    // checkedOn (or readOn) without a logged read of that page on the new day.
    if (c.checkedOn < reads.readOn) problems.push(`${s.id}: checkedOn ${c.checkedOn} is before the evidence file's readOn ${reads.readOn}`);
    if (!s.reads.some((r) => r.readAt.startsWith(c.checkedOn) && r.url.startsWith(c.sourceUrl) && /^200/.test(r.result)))
      problems.push(`${s.id}: no successful read of the cycle's source page on its checkedOn day (${c.checkedOn})`);
    if (c.closesOn && !sourceQuote(s)) problems.push(`${s.id}: a date with no quoted line`);
    // 4 Oct 2026: "open now" and "rolling" — true or absent, never with a last
    // date, never both, and resting on a quoted (visible) line read on the
    // cycle's own source page or a page under it.
    for (const k of ["openNow", "rolling"] as const) {
      const v = (c as unknown as Record<string, unknown>)[k];
      if (v === undefined) continue;
      if (v !== true) problems.push(`${s.id}: ${k} must be true or absent`);
      if (c.closesOn) problems.push(`${s.id}: ${k} with a last date`);
      if (!s.reads.some((r) => r.quote && r.url.startsWith(c.sourceUrl) && /^200/.test(r.result))) problems.push(`${s.id}: ${k} with no quoted line on its source page`);
    }
    if (c.openNow && c.rolling) problems.push(`${s.id}: openNow and rolling together`);
    // A companion row (outside the ranked 30) carries its ranked entry's cycle exactly.
    if (s.companionOf !== undefined) {
      const main = reads.schemes.find((x) => x.id === s.companionOf);
      if (!main || main.companionOf !== undefined) problems.push(`${s.id}: companionOf ${s.companionOf} is not a ranked entry`);
      else if (stable(main.cycle) !== stable(c)) problems.push(`${s.id}: cycle differs from its companion ${s.companionOf}`);
    }
  }
  return problems;
}

// ── Search-surface impact (pure, for the dry run) ────────────────────────

export async function surfaceImpact(before: readonly Scholarship[], after: readonly Scholarship[], changed: readonly SchemeRead[], today: string): Promise<string[]> {
  const L = await import("@/lib/scholarship-lists");
  const { isPresentedScheme } = await import("@/lib/scholarship-schemes");
  const { clipDescription } = await import("@/lib/section-seo");
  const { scholarshipLine, scholarshipsLlmsFullLines } = await import("@/lib/section-context");
  const B = before.filter(isPresentedScheme);
  const A = after.filter(isPresentedScheme);
  const changedIds = changed.map((s) => s.id);
  const out: string[] = [];
  const ids = (xs: readonly Scholarship[]) => xs.map((s) => s.id).join(", ") || "(none)";
  const byId = (xs: readonly Scholarship[], id: string) => xs.find((s) => s.id === id)!;
  // Mirrors src/app/scholarships/[id]/page.tsx generateMetadata for an open, listed, non-NSP scheme.
  const year = Number(today.slice(0, 4));
  const title = (s: Scholarship) => `${s.name} ${year} — Eligibility, Amount, Apply | Shishya`;
  const meta = (s: Scholarship) =>
    clipDescription(`${L.lastDateOf(s, today).kind === "upcoming" ? `${L.cycleLeadLine(s, today)} ` : ""}${s.description} ${s.eligibility.note ?? ""} Amount: ${s.amount}. Free to apply.`);
  const pair = (label: string, b: string, a: string, loud = "") =>
    b === a ? [`    ${label}: unchanged`] : [`    ${label}: CHANGES${loud}`, `      before: ${b}`, `      after:  ${a}`];

  out.push(`Scheme pages (/scholarships/{id}) on ${today}:`);
  for (const s of changed) {
    const b = byId(before, s.id);
    const a = byId(after, s.id);
    out.push(`  /scholarships/${s.id}`);
    out.push(`    date line   before: ${L.cycleLeadLine(b, today)}`);
    out.push(`                after:  ${L.cycleLeadLine(a, today)}`);
    out.push(`    WebPage JSON-LD dateModified: ${b.cycle?.checkedOn ?? "(none)"} → ${a.cycle?.checkedOn ?? "(none)"}; FAQPage JSON-LD "How do I apply" answer carries the new date line`);
    if (!L.isOpenScheme(a) || a.unlisted) {
      out.push(`    title and meta description: not computed (a closed or unlisted page)`);
      continue;
    }
    out.push(...pair("title", title(b), title(a), " (SEARCH SURFACE: TITLE)"));
    out.push(...pair("meta description", meta(b), meta(a), " (SEARCH SURFACE: META DESCRIPTION)"));
    for (const f of s.rowFixes ?? []) {
      if (f.field === "name")
        out.push(
          `    NAME (SEARCH SURFACE): H1, breadcrumb, MonetaryGrant/WebPage/BreadcrumbList JSON-LD names, OG title and OG image text, meta keywords, the site-search entry, every list row, list FAQ and context line that prints it: "${b.name}" → "${a.name}" (URL unchanged)`,
        );
      if (f.field === "applyUrl") out.push(`    Apply button: ${b.applyUrl} → ${a.applyUrl}`);
      if (f.field === "deadline") out.push(`    "Usual window" fact: "${b.deadline}" → "${a.deadline}" (also the date line above)`);
      if (f.field === "eligibility.categories") out.push(`    categories: ${JSON.stringify(b.eligibility.categories ?? null)} → ${JSON.stringify(a.eligibility.categories ?? null)} (list membership below)`);
      if (f.field === "eligibility.note") out.push(`    eligibility note (shown on the page and in its FAQ answer; in the meta description above): "${b.eligibility.note ?? ""}" → "${a.eligibility.note ?? ""}"`);
      if (f.field === "amount")
        out.push(
          `    amount (the page's Amount fact, MonetaryGrant JSON-LD amount, the "How much does it pay?" FAQ answer and its FAQPage JSON-LD, the meta description above, list tables, the browser card): "${b.amount}" → "${a.amount}"`,
        );
      if (f.field === "eligibility.incomeMaxLakhs")
        out.push(
          `    income ceiling (page fact, FAQ answer, list tables, the ask tool's data, and the /scholarships/match HARD GATE): ${b.eligibility.incomeMaxLakhs ?? "none"} → ${a.eligibility.incomeMaxLakhs ?? "none"} lakh${a.eligibility.incomeMaxLakhs === undefined ? " (no income gate in the matcher; the note states the body's target group)" : ""}`,
        );
      if (f.field === "eligibility.minMarksPct") out.push(`    minimum marks (page fact, FAQ answer, the ask tool's data; not a matcher gate): ${b.eligibility.minMarksPct ?? "none"}% → ${a.eligibility.minMarksPct ?? "none"}%`);
    }
    // The section context line (name, categories, official link) and the llms-full.txt line (name).
    const llms = (x: Scholarship) => scholarshipsLlmsFullLines([x]).find((l) => l.startsWith("- "))!;
    if (scholarshipLine(b) !== scholarshipLine(a)) out.push(...pair("/scholarships/context.md line", scholarshipLine(b), scholarshipLine(a), " (SEARCH SURFACE: CONTEXT.MD)"));
    if (llms(b) !== llms(a)) out.push(...pair("/llms-full.txt line", llms(b), llms(a), " (SEARCH SURFACE: LLMS)"));
  }

  const sb = L.closingSoon(today, L.CLOSING_SOON_DAYS, B);
  const sa = L.closingSoon(today, L.CLOSING_SOON_DAYS, A);
  out.push(`/scholarships/closing-soon (next ${L.CLOSING_SOON_DAYS} days):`);
  out.push(`  rows   before: ${ids(sb)}`);
  out.push(`         after:  ${ids(sa)}`);
  out.push(`  indexable + sitemap + home door: ${L.isClosingSoonIndexable(sb)} → ${L.isClosingSoonIndexable(sa)}`);
  const soonest = (xs: Scholarship[]) => (xs.length ? `${xs.length} close in 30 days — the soonest: ${xs[0].name}, ${L.formatIsoDay(xs[0].cycle!.closesOn!)} (${xs[0].cycle!.tier})` : "(no line)");
  out.push(`/scholarships "closing" line   before: ${soonest(sb)}`);
  out.push(`                               after:  ${soonest(sa)}`);

  out.push(`/scholarships/for/{slug} lists:`);
  for (const f of L.SCHOLARSHIP_FILTERS) {
    const lb = L.schemesForFilter(f, today, B);
    const la = L.schemesForFilter(f, today, A);
    const touched = la.filter((s) => changedIds.includes(s.id)).map((s) => s.id);
    const ib = L.isFilterListIndexable(lb, B);
    const ia = L.isFilterListIndexable(la, A);
    const datedB = lb.filter((s) => L.lastDateOf(s, today, f.level).kind === "upcoming").length;
    const datedA = la.filter((s) => L.lastDateOf(s, today, f.level).kind === "upcoming").length;
    const lmB = ib ? L.newestCheckedOn(lb) ?? "(none)" : "-";
    const lmA = ia ? L.newestCheckedOn(la) ?? "(none)" : "-";
    const added = la.filter((s) => !lb.some((x) => x.id === s.id)).map((s) => `+${s.id}`);
    const dropped = lb.filter((s) => !la.some((x) => x.id === s.id)).map((s) => `-${s.id}`);
    // 4 Oct 2026: the list's lead (also its meta description) and FAQ (FAQPage JSON-LD) text.
    const leadChanged = L.filterLeadLine(f, lb, today) !== L.filterLeadLine(f, la, today);
    const faqChanged = L.filterFaq(f, lb, today).a !== L.filterFaq(f, la, today).a;
    out.push(
      `  ${f.slug.padEnd(12)} rows ${lb.length} → ${la.length}${added.length || dropped.length ? ` (${[...added, ...dropped].join(" ")})` : " (same rows)"}; changed rows here: ${touched.join(", ") || "none"}; dated-ahead ${datedB} → ${datedA}; lead/meta ${leadChanged ? "CHANGES" : "unchanged"}; FAQ ${faqChanged ? "CHANGES" : "unchanged"}; indexable ${ib} → ${ia}; sitemap lastModified ${lmB} → ${lmA}`,
    );
  }

  const dated = (xs: readonly Scholarship[]) => xs.filter((s) => L.lastDateOf(s, today).kind === "upcoming").map((s) => `${s.id} ${s.cycle!.closesOn}`).sort();
  const db = dated(B);
  const da = dated(A);
  out.push(`/scholarships/context.md dated rows (official, still ahead): ${db.length} → ${da.length}`);
  for (const r of da) if (!db.includes(r)) out.push(`  + ${r}`);
  for (const r of db) if (!da.includes(r)) out.push(`  - ${r}`);
  return out;
}

// ── Main ─────────────────────────────────────────────────────────────────

function istToday(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

function arg(name: string): string | undefined {
  const hit = process.argv.slice(2).find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : "";
}

function cycleText(c: ScholarshipCycle | undefined): string {
  if (!c) return "(no cycle — page says \"Shishya has not checked a 2026-27 date\")";
  const what = c.closesOn ? `closes ${c.closesOn}` : c.rolling ? "ROLLING (apply any time), no date" : c.openNow ? "OPEN NOW, no date shown" : "no date shown";
  return `${c.opensOn ? `opens ${c.opensOn}, ` : ""}${what}, ${c.tier}, ${new URL(c.sourceUrl).hostname}, checked ${c.checkedOn}${c.note ? ` | note: ${c.note}` : ""}`;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply = arg("apply") !== undefined;
  const undo = undoArg(argv);
  const preview = arg("preview");
  const today = arg("today") || istToday();
  const text = fs.readFileSync(DATA_FILE, "utf8");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  if (undo !== null) {
    const log = JSON.parse(fs.readFileSync(undo, "utf8")) as { edits: RowEdit[] };
    const r = planUndo(text, log.edits);
    console.log(`Undo from ${undo}: restore ${r.restored.join(", ") || "nothing"}; skipped (row changed since): ${r.skipped.join(", ") || "none"}`);
    if (!apply) return console.log("Dry run — add --apply to write.");
    const undoneLog = `${undo.replace(/\.json$/, "")}.undone.${stamp}.json`;
    fs.writeFileSync(undoneLog, JSON.stringify({ script: "scripts/apply-scholarship-cycle-reads-2026-10.ts", undoneAt: new Date().toISOString(), applyLog: undo, dataFile: DATA_FILE, restored: r.restored, skipped: r.skipped }, null, 2) + "\n", "utf8");
    fs.writeFileSync(DATA_FILE, r.text, "utf8");
    return console.log(`Wrote ${DATA_FILE} and the undo record ${undoneLog}.`);
  }

  const all = loadReads();
  const readProblems = checkReads(all, istToday());
  if (readProblems.length) {
    console.error(`Evidence file problems — nothing done:\n  ${readProblems.join("\n  ")}`);
    process.exit(1);
  }
  const skip = (arg("skip-fix") ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const reads = selectFixes(all, { cyclesOnly: arg("cycles-only") !== undefined, skip });
  const before = await importCatalogue(text);
  const { text: next, edits } = planEdits(text, reads);
  const after = await importCatalogue(next);
  const problems = verifyCatalogue(before, after, reads);
  const fixCount = edits.reduce((n, e) => n + (e.fixes?.length ?? 0), 0);
  const leftOut = all.schemes.reduce((n, s) => n + (s.rowFixes?.length ?? 0), 0) - fixCount;

  console.log(`Scholarship cycle reads ${reads.readOn} → ${DATA_FILE} (${apply ? "APPLY" : "dry run"}; dates computed for ${today} IST)`);
  console.log(`Row fixes: ${fixCount} written${leftOut ? `, ${leftOut} left out (--cycles-only / --skip-fix)` : ""}.\n`);
  for (const s of [...reads.schemes].sort((a, b) => a.rank - b.rank)) {
    const row = before.find((x) => x.id === s.id);
    console.log(`#${s.rank} ${s.id} (${s.landings90} landings in 90 days) — ${s.decision}`);
    if (s.decision === "no-change") {
      console.log(`    ${s.why}`);
      continue;
    }
    const q = sourceQuote(s);
    console.log(`    before: ${cycleText(row?.cycle)}`);
    console.log(`    after:  ${cycleText(s.cycle)}`);
    console.log(`    source: ${s.cycle!.sourceUrl}`);
    if (q) console.log(`    quoted (${q.readAt}): ${q.quote}${q.translation ? `\n    in English: ${q.translation}` : ""}`);
    for (const f of s.rowFixes ?? [])
      console.log(
        `    fix ${f.field}: ${f.from === null ? "(none)" : JSON.stringify(f.from)} → ${f.to === null ? "(removed)" : JSON.stringify(f.to)} (read on ${hostOfUrl(f.sourceUrl)})${f.field === "name" ? "  [SEARCH SURFACE: title, H1, lists, context.md, llms-full.txt]" : ""}`,
      );
  }
  const { isOfferedScheme } = await import("@/lib/scholarship-schemes");
  const counts = (xs: readonly Scholarship[]) => {
    const off = xs.filter(isOfferedScheme);
    return `${off.filter((s) => s.cycle).length} offered rows with a cycle (${off.filter((s) => s.cycle?.closesOn && s.cycle.closesOn >= today).length} with a last date on or after ${today})`;
  };
  console.log(`\nCatalogue: ${counts(before)} → ${counts(after)}; reviewed rows unchanged (${before.filter((s) => s.reviewed).length}).`);
  console.log(`Rows edited: ${edits.map((e) => `${e.id}${e.fixes?.length ? ` (+${e.fixes.map((f) => f.field).join(", ")})` : ""}`).join(", ")}`);
  console.log(`\nSEARCH SURFACES (before → after):`);
  for (const l of await surfaceImpact(before, after, writableReads(reads), today)) console.log(`  ${l}`);
  console.log(`\nIndexNow after deploy: ${edits.map((e) => `https://shishya.in/scholarships/${e.id}`).join(" ")} https://shishya.in/scholarships https://shishya.in/scholarships/closing-soon`);

  // Dates read on readOn can move (Vidyasiri was extended twice): applying old reads is refused.
  const age = readAgeDays(reads.readOn, istToday());
  const ahead = datedAhead(reads, istToday());
  const stale = age > MAX_READ_AGE_DAYS && ahead.length > 0;
  // 4 Oct 2026 (review fixes): the way out never moves a check day without a
  // read of that page on the new day (checkReads refuses one that does).
  if (stale) {
    const aheadUrls = [...new Set(ahead.map((s) => s.cycle!.sourceUrl))];
    const allUrls = [...new Set(writableReads(reads).map((s) => s.cycle!.sourceUrl))];
    console.log(
      `\nSTALE READS: read ${age} days ago (limit ${MAX_READ_AGE_DAYS}) and ${ahead.length} written last date(s) are still ahead (${ahead.map((s) => s.id).join(", ")}).` +
        `\n  Re-read their pages the same day, one request each: ${aheadUrls.join(" ")}` +
        `\n  If every date and status still matches, apply with --accept-stale-reads: each checkedOn stays the day its page was read, which is still true.` +
        `\n  If one changed, add the new read to the evidence file and correct that cycle, with checkedOn = the day of that read; then re-run.` +
        `\n  Move readOn only after re-reading every written cycle's source page that day (${allUrls.length} pages) and logging each read; a checkedOn moves only for a page read on the new day.`,
    );
  }

  if (problems.length) {
    console.error(`\nREFUSED — the would-be file changes more than planned:\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`\nCheck: re-imported would-be catalogue — ${after.length} rows, same ids in the same order, only the ${edits.length} planned cycles and ${fixCount} row fixes differ.`);

  if (preview) {
    const abs = path.resolve(preview);
    if (abs.startsWith(path.resolve("src"))) throw new Error("--preview must not point inside src/");
    fs.writeFileSync(abs, next, "utf8");
    console.log(`Preview written: ${abs}`);
  }
  if (!apply) return console.log("\nDry run — nothing written. Add --apply to write the data file and the undo log.");
  if (stale && arg("accept-stale-reads") === undefined) {
    console.error("REFUSED — stale reads (see above). Re-read those pages; pass --accept-stale-reads only when a re-read the same day confirms every date and status.");
    process.exit(1);
  }

  fs.mkdirSync(LOG_DIR, { recursive: true });
  const logFile = path.join(LOG_DIR, `scholarship-cycle-reads-2026-10.apply.${stamp}.json`);
  fs.writeFileSync(
    logFile,
    JSON.stringify(
      {
        script: "scripts/apply-scholarship-cycle-reads-2026-10.ts",
        appliedAt: new Date().toISOString(),
        dataFile: DATA_FILE,
        readsFile: READS_FILE,
        options: { cyclesOnly: arg("cycles-only") !== undefined, skipFix: skip, acceptStaleReads: arg("accept-stale-reads") !== undefined },
        undo: `npx tsx scripts/apply-scholarship-cycle-reads-2026-10.ts --undo=${logFile.replace(/\\/g, "/")} --apply`,
        edits,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  fs.writeFileSync(DATA_FILE, next, "utf8");
  console.log(`\nWrote ${DATA_FILE} (${edits.length} rows, ${fixCount} row fixes) and the undo log ${logFile}.`);
}

if (/apply-scholarship-cycle-reads-2026-10\.[cm]?[jt]s$/.test(process.argv[1] ?? "")) void main();

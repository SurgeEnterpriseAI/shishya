// NSP 2026-27 last dates by state (3 Oct 2026, non-exam value step 1).
//
// Why: NSP's 2026-27 "Centrally Sponsored Schemes" list gives each state or
// UT its own pre-matric and post-matric window for SC, ST and OBC/EBC/DNT
// students. Shishya read all of them on NSP on 27 Sep 2026
// (data/scholarships/nsp-matric-windows-2026-27.json) but showed none: the
// two NSP pages said "Shishya has not checked a 2026-27 date", which was
// untrue — the dates were read, they are simply per state. This module turns
// the file into the rows /scholarships/nsp-post-matric and
// /scholarships/nsp-pre-matric print (src/components/NspWindowsTable.tsx), the
// lead line (src/lib/scholarship-lists.ts) and the AI's page facts
// (src/lib/search/ask-tools.ts).
//
// Honesty rules:
//   • the row a student reads is NSP's own scheme string, verbatim. Parsing
//     (state, category, pre/post, classes) only groups and sorts, so a parse
//     error can put a row under "state not read", never a wrong state's name
//     in front of a student: a state is taken only when exactly one state or
//     UT name occurs in the string, and that substring is kept (stateText);
//   • every date is NSP's own, read on the day the file says (checkedOn);
//     the status is worked out against the IST calendar day the caller passes
//     (open on the last day itself, closed from the day after);
//   • a row NSP stops listing is never deleted by the re-read script
//     (scripts/read-nsp-windows.ts); it is marked notListedSince and shown as
//     no longer listed, never as open;
//   • under9 marks the rows that cover classes below 9 (NSP's "Class 1-10" /
//     "Class I To Class V" rows and the unclean / cleaning-occupation scheme,
//     which is for Classes 1-10). They are shown as data like every row, and
//     nothing account-related may ever be offered on them (no reminder, no
//     sign-up prompt).
//
// Pure: no DB, no Next imports, no clock — callers pass today (IST,
// YYYY-MM-DD). Tests: tests/unit/nsp-windows.test.ts.

import raw from "../../data/scholarships/nsp-matric-windows-2026-27.json";
import { STATES, stateSlug } from "@/lib/state-info";

/** The academic year the file holds. */
export const NSP_WINDOWS_YEAR = "2026-27";

export type NspLevel = "pre" | "post";
export type NspCategory = "SC" | "ST" | "OBC-EBC-DNT";

/** One row of the JSON file, as NSP printed it. */
export interface NspWindowRow {
  scheme: string;
  opensOn: string | null;
  closesOn: string | null;
  /** The student-application chip as printed (re-reads from 3 Oct 2026 on). */
  printed?: string;
  /** NSP's own accordion heading ("State of Assam"; re-reads from 3 Oct 2026 on). */
  nspGroup?: string;
  /** The first re-read that no longer found the card on NSP. */
  notListedSince?: string;
}

export interface NspWindowsData {
  note: string;
  /** The page people visit (All-Scholarships → "Centrally Sponsored Schemes"). */
  sourceUrl: string;
  /** The URL the re-read script fetched (from the 3 Oct 2026 re-read on). */
  readUrl?: string;
  view: string;
  tier: "official";
  checkedOn: string;
  windows: NspWindowRow[];
}

// The JSON's inferred type has `tier: string`; the shape is pinned by
// tests/unit/nsp-windows.test.ts and written only by scripts/read-nsp-windows.ts.
export const NSP_WINDOWS: NspWindowsData = raw as unknown as NspWindowsData;

/** The two catalogue rows (src/data/scholarships.ts) whose 2026-27 dates are
 *  NSP's per-state windows, and the level each one shows. */
export const NSP_SCHOLARSHIP_LEVEL: Readonly<Record<string, NspLevel>> = {
  "nsp-post-matric": "post",
  "nsp-pre-matric": "pre",
};

export function nspLevelForScholarship(id: string | null | undefined): NspLevel | null {
  return (id && NSP_SCHOLARSHIP_LEVEL[id]) || null;
}

/** The two pages' <title> text (without the " | Shishya" suffix): true once
 *  the page prints the by-state table, its eligibility and its amount. */
export function nspPageTitle(level: NspLevel): string {
  return `${level === "post" ? "Post-Matric" : "Pre-Matric"} Scholarship (NSP) ${NSP_WINDOWS_YEAR}: last dates by state, eligibility, amount`;
}

// ── Parsing NSP's scheme string ──────────────────────────────────────

/** Stable row id: the scheme string as a slug. */
export function nspWindowId(scheme: string): string {
  return scheme
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Spellings NSP uses that differ from STATES[code].name. */
const STATE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  AN: ["Andaman and Nicobar"],
  DN: ["Dnhdd", "Dadra and Nagar Haveli", "Dadra Nagar Haveli", "Daman and Diu"],
  OD: ["Orissa"],
  PY: ["Pondicherry"],
  UK: ["Uttaranchal"],
};

function namePattern(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => (/^(and|&)$/i.test(w) ? "(?:and|&)" : w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("\\s+");
}

/** Every state / UT name pattern, longest first so "Andaman and Nicobar
 *  Islands" is tried before "Andaman and Nicobar". */
const STATE_PATTERNS: readonly { code: string; re: RegExp }[] = Object.values(STATES)
  .flatMap((s) => [s.name, ...(STATE_ALIASES[s.code] ?? [])].map((n) => ({ code: s.code, name: n })))
  .sort((a, b) => b.name.length - a.name.length)
  .map(({ code, name }) => ({ code, re: new RegExp(`(?<![A-Za-z])${namePattern(name)}(?![A-Za-z])`, "gi") }));

/** The one state or UT a string names, with the substring as printed; null
 *  when it names none, or more than one. */
export function parseNspState(text: string): { code: string; text: string } | null {
  const found = new Map<string, string>();
  let rest = text;
  for (const { code, re } of STATE_PATTERNS) {
    re.lastIndex = 0;
    const m = re.exec(rest);
    if (!m) continue;
    if (!found.has(code)) found.set(code, m[0]);
    // Blank the match so a shorter alias of the same name cannot match inside it.
    rest = rest.slice(0, m.index) + " ".repeat(m[0].length) + rest.slice(m.index + m[0].length);
  }
  if (found.size !== 1) return null;
  const [[code, matched]] = [...found];
  return { code, text: matched };
}

/** SC, ST or OBC/EBC/DNT when the string names exactly one of them. */
export function parseNspCategory(scheme: string): NspCategory | null {
  const hits = new Set<NspCategory>();
  if (/\bSC\b|Scheduled Castes?/.test(scheme)) hits.add("SC");
  if (/\bST\b|Scheduled Tribes?/.test(scheme)) hits.add("ST");
  if (/\b(?:OBC|EBC|DNT)\b|Economically Backward Class|Other Backward Class/i.test(scheme)) hits.add("OBC-EBC-DNT");
  return hits.size === 1 ? [...hits][0] : null;
}

/** "pre" or "post" matric, when the string says exactly one. */
export function parseNspLevel(scheme: string): NspLevel | null {
  const pre = /\bpre[\s-]?matric/i.test(scheme);
  const post = /\bpost[\s-]?matric/i.test(scheme);
  if (pre === post) return null;
  return pre ? "pre" : "post";
}

const ROMAN: Readonly<Record<string, number>> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
const classNo = (t: string): number | null => (/^\d+$/.test(t) ? Number(t) : (ROMAN[t.toLowerCase()] ?? null));

/** The classes the string prints ("Class Ix,X" → 9-10, "Class 1-10" → 1-10,
 *  "Class I To Class V" → 1-5); null when it prints none. */
export function parseNspClasses(scheme: string): { from: number; to: number } | null {
  const m = /\bclass(?:es)?\s*([0-9]+|[ivx]+)\b(?:\s*(?:-|to|and|&|,)\s*(?:class(?:es)?\s*)?([0-9]+|[ivx]+)\b)?/i.exec(scheme);
  if (!m) return null;
  const from = classNo(m[1]);
  const to = m[2] ? classNo(m[2]) : from;
  if (from == null || to == null) return null;
  return { from: Math.min(from, to), to: Math.max(from, to) };
}

/** True for a row that covers classes below 9: a printed class range starting
 *  below Class 9, or the unclean / cleaning-occupation pre-matric scheme
 *  (Classes 1-10). */
export function isUnder9(scheme: string): boolean {
  if (/\bunclean\b|\bcleaning\b/i.test(scheme)) return true;
  const c = parseNspClasses(scheme);
  return !!c && c.from < 9;
}

/** One file row with what the page groups and sorts by. */
export interface NspWindow extends NspWindowRow {
  id: string;
  level: NspLevel | null;
  category: NspCategory | null;
  /** State / UT code (src/lib/state-info.ts), or null when not read. */
  stateCode: string | null;
  /** The state's name as Shishya writes it (the group heading). */
  stateName: string | null;
  /** The substring the state was read from, exactly as NSP printed it. */
  stateText: string | null;
  classes: { from: number; to: number } | null;
  under9: boolean;
}

export function parseNspWindow(row: NspWindowRow): NspWindow {
  // The state comes from NSP's scheme string; only when that names none (or
  // several) is NSP's own accordion heading used, when the file has it.
  const st = parseNspState(row.scheme) ?? (row.nspGroup ? parseNspState(row.nspGroup) : null);
  return {
    ...row,
    id: nspWindowId(row.scheme),
    level: parseNspLevel(row.scheme),
    category: parseNspCategory(row.scheme),
    stateCode: st?.code ?? null,
    stateName: st ? (STATES[st.code]?.name ?? st.code) : null,
    stateText: st?.text ?? null,
    classes: parseNspClasses(row.scheme),
    under9: isUnder9(row.scheme),
  };
}

/** Every row of the file, parsed, in the file's order. */
export const NSP_WINDOW_ROWS: readonly NspWindow[] = NSP_WINDOWS.windows.map(parseNspWindow);

// ── Status on a given IST day ────────────────────────────────────────

export type NspStatus =
  | { kind: "open"; closesOn: string }
  | { kind: "opens-later"; opensOn: string; closesOn: string | null }
  /** Closed when NSP was read: NSP printed "Closed on", or the last date was
   *  already behind the read day. */
  | { kind: "closed"; closesOn: string }
  /** The last date was still ahead when NSP was read and has passed since.
   *  NSP often extends: the 3 Oct 2026 re-read found 30 of the 35 windows
   *  whose 27 Sep last date was 30 Sep extended. So the page never calls such a row
   *  closed — it says the date has passed and NSP may have extended it. */
  | { kind: "passed"; closesOn: string; checkedOn: string }
  | { kind: "no-date"; notYetOpened: boolean }
  | { kind: "not-listed"; since: string };

/** Where a window stands on `today` (IST, YYYY-MM-DD), given the day NSP was
 *  read: open through its last day, not open from the day after ("closed"
 *  when NSP itself showed it closed, else "passed"). */
export function nspWindowStatus(w: NspWindowRow, today: string, checkedOn: string = NSP_WINDOWS.checkedOn): NspStatus {
  if (w.notListedSince) return { kind: "not-listed", since: w.notListedSince };
  if (!w.closesOn) return { kind: "no-date", notYetOpened: /NOT YET OPENED/i.test(w.printed ?? "") };
  if (/closed on/i.test(w.printed ?? "") || w.closesOn < checkedOn) return { kind: "closed", closesOn: w.closesOn };
  if (w.closesOn < today) return { kind: "passed", closesOn: w.closesOn, checkedOn };
  if (w.opensOn && w.opensOn > today) return { kind: "opens-later", opensOn: w.opensOn, closesOn: w.closesOn };
  return { kind: "open", closesOn: w.closesOn };
}

/** True while students can apply on NSP, as NSP printed it when read. */
export function isNspWindowOpen(w: NspWindowRow, today: string, checkedOn: string = NSP_WINDOWS.checkedOn): boolean {
  return nspWindowStatus(w, today, checkedOn).kind === "open";
}

// ── Grouping for a page ──────────────────────────────────────────────

export interface NspStateGroup {
  stateCode: string | null;
  /** Heading: the state's name, or "State not read" for rows not placed. */
  name: string;
  /** "state-west-bengal"; null for the not-placed group. */
  anchor: string | null;
  rows: NspWindow[];
}

const CATEGORY_ORDER: Readonly<Record<string, number>> = { SC: 0, ST: 1, "OBC-EBC-DNT": 2 };

/** One level's rows grouped by state (A-Z), rows within a state by category
 *  (SC, ST, OBC/EBC/DNT, other) then scheme; rows whose state was not read
 *  come last, in one group without an anchor. */
export function nspWindowsByState(level: NspLevel, rows: readonly NspWindow[] = NSP_WINDOW_ROWS): NspStateGroup[] {
  const groups = new Map<string, NspStateGroup>();
  for (const r of rows) {
    if (r.level !== level) continue;
    const key = r.stateCode ?? "";
    let g = groups.get(key);
    if (!g) {
      g = r.stateCode
        ? { stateCode: r.stateCode, name: r.stateName ?? r.stateCode, anchor: `state-${stateSlug(r.stateCode)}`, rows: [] }
        : { stateCode: null, name: "State not read from NSP's name", anchor: null, rows: [] };
      groups.set(key, g);
    }
    g.rows.push(r);
  }
  for (const g of groups.values()) {
    g.rows.sort((a, b) => (CATEGORY_ORDER[a.category ?? ""] ?? 3) - (CATEGORY_ORDER[b.category ?? ""] ?? 3) || a.scheme.localeCompare(b.scheme));
  }
  return [...groups.values()].sort((a, b) => (a.stateCode ? 0 : 1) - (b.stateCode ? 0 : 1) || a.name.localeCompare(b.name));
}

/** The states and UTs (codes, A-Z) with at least one row of this level still
 *  on NSP's list — the "N states and UTs" of the lead line and the counts. A
 *  row marked notListedSince is still shown, but does not make its state
 *  "listed on NSP". */
export function nspListedStateCodes(level: NspLevel, rows: readonly NspWindow[] = NSP_WINDOW_ROWS): string[] {
  const codes = new Set<string>();
  for (const r of rows) if (r.level === level && r.stateCode && !r.notListedSince) codes.add(r.stateCode);
  return [...codes].sort();
}

export interface NspLevelSummary {
  rows: number;
  /** States and UTs with a row still on NSP's list (nspListedStateCodes). */
  states: number;
  open: number;
  /** Closed when read, or past a last date that was ahead when read. */
  closed: number;
  /** Open from a later day (they have a last date). */
  opensLater: number;
  /** NSP printed "Student Application : NOT YET OPENED" (no last date yet). */
  notYetOpened: number;
  /** No last date on NSP, and no "NOT YET OPENED" chip stored (27 Sep 2026 rows). */
  noDate: number;
  /** No longer on NSP's list (kept and shown, never open). */
  notListed: number;
  /** The soonest last date among open windows, with those windows. */
  nextLastDate: { date: string; rows: NspWindow[] } | null;
}

export function nspLevelSummary(
  level: NspLevel,
  today: string,
  rows: readonly NspWindow[] = NSP_WINDOW_ROWS,
  checkedOn: string = NSP_WINDOWS.checkedOn,
): NspLevelSummary {
  const mine = rows.filter((r) => r.level === level);
  const statuses = mine.map((r) => nspWindowStatus(r, today, checkedOn));
  const count = (pred: (s: NspStatus) => boolean) => statuses.filter(pred).length;
  const open = mine.filter((_, i) => statuses[i].kind === "open");
  const next = open.reduce<string | null>((best, r) => (r.closesOn && (best === null || r.closesOn < best) ? r.closesOn : best), null);
  return {
    rows: mine.length,
    states: nspListedStateCodes(level, rows).length,
    open: open.length,
    closed: count((s) => s.kind === "closed" || s.kind === "passed"),
    opensLater: count((s) => s.kind === "opens-later"),
    notYetOpened: count((s) => s.kind === "no-date" && s.notYetOpened),
    noDate: count((s) => s.kind === "no-date" && !s.notYetOpened),
    notListed: count((s) => s.kind === "not-listed"),
    nextLastDate: next ? { date: next, rows: open.filter((r) => r.closesOn === next) } : null,
  };
}

/** One level's windows open on `today`, soonest last date first. */
export function nspOpenWindows(level: NspLevel, today: string, rows: readonly NspWindow[] = NSP_WINDOW_ROWS): NspWindow[] {
  return rows
    .filter((r) => r.level === level && nspWindowStatus(r, today).kind === "open")
    .sort((a, b) => (a.closesOn! < b.closesOn! ? -1 : a.closesOn! > b.closesOn! ? 1 : (a.stateName ?? "").localeCompare(b.stateName ?? "")));
}

/** Catalogue rows (src/data/scholarships.ts) for states NOT on NSP's list for
 *  the level, whose own row says it is that state's portal for these
 *  schemes — the table's footer gives them as examples of "States not listed
 *  run these schemes on their own portals". Telangana ePass (post-matric),
 *  UP's scholarship portal (pre- and post-matric) and Kerala's e-Grantz
 *  (post-matric). Left out on purpose (3 Oct 2026 review): mahadbt, because
 *  Maharashtra IS on NSP's list (PM YASASVI OBC/EBC/DNT, both levels); and
 *  ka-vidyasiri, Karnataka's food-and-accommodation allowance, which pays no
 *  tuition and is not Karnataka's post-matric SC/ST/OBC scheme (the
 *  catalogue has no listed Karnataka SSP post-matric row). The page links
 *  only rows still listed on Shishya and whose state is not on NSP's list
 *  for the level (nspFooterPortals). */
export const NSP_STATE_PORTAL_ROWS: Readonly<Record<NspLevel, readonly string[]>> = {
  post: ["ts-epaas", "ed-cell-up", "kerala-mathrubhumi-merit"],
  pre: ["ed-cell-up"],
};

/** True when a catalogue row's state may be named in the footer for the
 *  level: a state row whose state has no row on NSP's list for that level
 *  (a later re-read that adds the state drops the example by itself). */
export function nspPortalRowAllowed(level: NspLevel, state: string | null | undefined, rows: readonly NspWindow[] = NSP_WINDOW_ROWS): boolean {
  return !!state && !nspListedStateCodes(level, rows).includes(state);
}

/** The footer's portal links for a level, from the catalogue the page passes
 *  in (src/data/scholarships.ts — kept out of this pure module): the
 *  NSP_STATE_PORTAL_ROWS ids, in order, that are still listed on Shishya and
 *  whose state is not on NSP's list for the level. */
export function nspFooterPortals<T extends { id: string; name: string; state: string | null }>(
  level: NspLevel,
  catalogue: readonly T[],
  isListed: (s: T) => boolean,
  rows: readonly NspWindow[] = NSP_WINDOW_ROWS,
): { id: string; name: string }[] {
  return NSP_STATE_PORTAL_ROWS[level]
    .map((id) => catalogue.find((x) => x.id === id))
    .filter((x): x is T => !!x && isListed(x) && nspPortalRowAllowed(level, x.state, rows))
    .map((x) => ({ id: x.id, name: x.name }));
}

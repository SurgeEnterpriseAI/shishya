// The pure half of scripts/read-nsp-windows.ts (3 Oct 2026, non-exam value
// step 1): read NSP's 2026-27 "Centrally Sponsored Schemes" list out of the
// page HTML, compare it with data/scholarships/nsp-matric-windows-2026-27.json
// and merge a new read into it without deleting anything.
//
// What NSP prints (read 3 Oct 2026): the list answers a plain GET of
// NSP_SPONSORED_URL (the same list the "Schemes On NSP" box on
// https://scholarships.gov.in/All-Scholarships shows for "Centrally Sponsored
// Schemes"). It is one accordion per state or UT ("State of Assam", "UT of
// Ladakh"); each scheme is a card with an <h6> name ending in "(Welfare Based
// Scheme)" and coloured chips:
//   "Scheme  Open from : 03-07-2026"         or "Scheme : NOT YET OPENED"
//   "Student Application  Open till : 31-10-2026"
//   "Student Application Closed on : 30-09-2026"
//   "Student Application : NOT YET OPENED"
// (and verification chips for institutes and officers, which are not the
// student's last date and are ignored). HTML comments hold a stale "by State
// of …" line per card; they are stripped first.
//
// Pure: no network, no file system, no clock (tests/unit/nsp-windows.test.ts,
// which also reads a trimmed copy of the real page:
// tests/fixtures/official-listings/nsp-sponsored-2026-10-03.html).

import { parseNspState } from "../src/lib/nsp-windows";

export const NSP_SPONSORED_URL = "https://scholarships.gov.in/centralsOrsponsoredOrstate?central_sponsored_state=sponserscheme";

/** The page people visit for the same list ("Schemes On NSP" box →
 *  "Centrally Sponsored Schemes"); the page's Source link. */
export const NSP_ALL_SCHOLARSHIPS_URL = "https://scholarships.gov.in/All-Scholarships";

/** One card as read from the HTML. */
export interface ReadWindow {
  /** NSP's scheme name, whitespace collapsed, without the "(Welfare Based Scheme)" tag. */
  scheme: string;
  opensOn: string | null;
  closesOn: string | null;
  /** The student-application chip exactly as printed (whitespace collapsed). */
  printed: string | null;
  /** NSP's own accordion heading the card sits under ("State of Assam"). */
  nspGroup: string | null;
}

/** One row of the JSON file. The last three fields are written by this
 *  script; the 27 Sep 2026 rows do not have them. */
export interface StoredWindow {
  scheme: string;
  opensOn: string | null;
  closesOn: string | null;
  printed?: string;
  nspGroup?: string;
  /** Set (never deleted) when a re-read no longer finds the card on NSP. */
  notListedSince?: string;
}

export interface WindowsFile {
  note: string;
  /** The page people visit (All-Scholarships); the page's Source link. */
  sourceUrl: string;
  /** The URL the re-read script actually fetched (NSP_SPONSORED_URL);
   *  written by every --apply from 3 Oct 2026 on. */
  readUrl?: string;
  view: string;
  tier: "official";
  checkedOn: string;
  windows: StoredWindow[];
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };

/** The few HTML entities NSP's names use, decoded; text whitespace collapsed. */
export function cleanText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      const k = e.toLowerCase();
      if (k in ENTITIES) return ENTITIES[k];
      if (k.startsWith("#x")) return String.fromCodePoint(parseInt(k.slice(2), 16));
      if (k.startsWith("#")) return String.fromCodePoint(parseInt(k.slice(1), 10));
      return m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

/** "31-10-2026" → "2026-10-31"; anything that is not a real calendar day → null. */
export function dmyToIso(dmy: string): string | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dmy.trim());
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
}

/** NSP's scheme tag at the end of every card name. */
const SCHEME_TAG = /\s*\((?:Welfare|Merit)[^()]*Based Scheme\)\s*$/i;

const OPENS = /^Scheme\s*Open from(?:\s*\(for Renewal\))?\s*:\s*(\d{2}-\d{2}-\d{4})/i;
const OPENS_NOT_YET = /^Scheme\s*:\s*NOT YET OPENED/i;
const STUDENT_TILL = /^Student Application\s*Open till(?:\s*\(for Renewal\))?\s*:\s*(\d{2}-\d{2}-\d{4})/i;
const STUDENT_CLOSED = /^Student Application\s*Closed on(?:\s*\(for Renewal\))?\s*:\s*(\d{2}-\d{2}-\d{4})/i;
const STUDENT_ANY = /^Student Application\b/i;

/** Every scheme card of the Centrally Sponsored list, in NSP's order. A card
 *  counts only when it carries a "Scheme" or "Student Application" chip, so a
 *  stray <h6> elsewhere on the page is never read as a scheme. */
export function parseSponsoredList(html: string): { windows: ReadWindow[]; groups: string[]; problems: string[] } {
  const body = html.replace(/<!--[\s\S]*?-->/g, "");
  const token = /<button[^>]*accordion-button[^>]*>([\s\S]*?)<\/button>|<h6>([\s\S]*?)<\/h6>/gi;
  const marks: { at: number; end: number; group?: string; card?: string }[] = [];
  for (let m = token.exec(body); m; m = token.exec(body)) {
    if (m[1] !== undefined) marks.push({ at: m.index, end: token.lastIndex, group: cleanText(m[1]) });
    else marks.push({ at: m.index, end: token.lastIndex, card: cleanText(m[2] ?? "") });
  }
  const windows: ReadWindow[] = [];
  const groups: string[] = [];
  const problems: string[] = [];
  let group: string | null = null;
  for (let i = 0; i < marks.length; i++) {
    const mk = marks[i];
    if (mk.group !== undefined) {
      group = /^(State|UT) of /i.test(mk.group) ? mk.group : null;
      if (group && !groups.includes(group)) groups.push(group);
      continue;
    }
    const until = i + 1 < marks.length ? marks[i + 1].at : body.length;
    const chips = [...body.slice(mk.end, until).matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)].map((s) => cleanText(s[1]));
    const relevant = chips.filter((c) => /^(Scheme|Student Application)\b/i.test(c));
    if (relevant.length === 0) continue;
    const scheme = (mk.card ?? "").replace(SCHEME_TAG, "").trim();
    if (!scheme) {
      problems.push(`a card with no name under ${group ?? "no state heading"}`);
      continue;
    }
    // One opening chip and one student chip per card. A card with two (say a
    // fresh and a "(for Renewal)" chip) would leave one of them unread, so
    // the read is refused rather than keeping either quietly.
    const opensChips = relevant.filter((c) => /^Scheme\b/i.test(c));
    const studentChips = relevant.filter((c) => STUDENT_ANY.test(c));
    if (opensChips.length > 1) problems.push(`${scheme}: ${opensChips.length} opening chips, not one ("${opensChips.join('" | "')}")`);
    if (studentChips.length > 1) problems.push(`${scheme}: ${studentChips.length} student chips, not one ("${studentChips.join('" | "')}")`);
    let opensOn: string | null = null;
    let closesOn: string | null = null;
    let printed: string | null = null;
    for (const c of relevant) {
      const o = OPENS.exec(c);
      if (o) {
        opensOn = dmyToIso(o[1]);
        if (!opensOn) problems.push(`${scheme}: unreadable opening day "${c}"`);
        continue;
      }
      if (OPENS_NOT_YET.test(c)) continue;
      if (/^Scheme\b/i.test(c)) {
        problems.push(`${scheme}: opening chip not understood "${c}"`);
        continue;
      }
      if (STUDENT_ANY.test(c)) {
        printed = c;
        const t = STUDENT_TILL.exec(c) ?? STUDENT_CLOSED.exec(c);
        if (t) {
          closesOn = dmyToIso(t[1]);
          if (!closesOn) problems.push(`${scheme}: unreadable last day "${c}"`);
        } else if (!/NOT YET OPENED/i.test(c)) {
          problems.push(`${scheme}: student chip not understood "${c}"`);
        }
      }
    }
    if (!group) problems.push(`${scheme}: card outside any "State of" / "UT of" heading`);
    windows.push({ scheme, opensOn, closesOn, printed, nspGroup: group });
  }
  return { windows, groups, problems };
}

export interface DateChange {
  scheme: string;
  field: "opensOn" | "closesOn";
  before: string | null;
  after: string | null;
}

export interface TextChange {
  scheme: string;
  before: string | null;
  after: string | null;
}

export interface WindowsDiff {
  /** Opening or last day that differs from the file. */
  changed: DateChange[];
  /** The student chip as printed differs from the stored one ("Open till
   *  31-10-2026" → "Closed on : 31-10-2026" keeps the date but closes the
   *  window). Only rows that already stored a chip are compared. */
  chipChanged: TextChange[];
  /** Rows with no stored chip yet (the 27 Sep 2026 read) that get one now. */
  chipFirstRecorded: number;
  /** NSP's state heading differs from the stored one. */
  headingChanged: TextChange[];
  /** Cards on NSP that the file does not hold. */
  added: ReadWindow[];
  /** Rows in the file that NSP no longer lists (kept, marked). */
  notListed: StoredWindow[];
  /** Rows the file had marked not listed that NSP lists again. */
  listedAgain: string[];
  /** Read cards whose dates, stored chip and stored heading match the file
   *  (a chip recorded for the first time does not count as a change). */
  unchanged: number;
  /** Scheme names NSP printed more than once (only the first card is used). */
  duplicates: string[];
}

/** Rows are matched by NSP's exact scheme string. */
export function diffWindows(stored: readonly StoredWindow[], read: readonly ReadWindow[]): WindowsDiff {
  const byScheme = new Map(stored.map((w) => [w.scheme, w]));
  const seen = new Set<string>();
  const out: WindowsDiff = {
    changed: [],
    chipChanged: [],
    chipFirstRecorded: 0,
    headingChanged: [],
    added: [],
    notListed: [],
    listedAgain: [],
    unchanged: 0,
    duplicates: [],
  };
  for (const r of read) {
    if (seen.has(r.scheme)) {
      out.duplicates.push(r.scheme);
      continue;
    }
    seen.add(r.scheme);
    const s = byScheme.get(r.scheme);
    if (!s) {
      out.added.push(r);
      continue;
    }
    if (s.notListedSince) out.listedAgain.push(r.scheme);
    let same = true;
    for (const field of ["opensOn", "closesOn"] as const) {
      if ((s[field] ?? null) !== r[field]) {
        out.changed.push({ scheme: r.scheme, field, before: s[field] ?? null, after: r[field] });
        same = false;
      }
    }
    if (s.printed === undefined) {
      if (r.printed) out.chipFirstRecorded++;
    } else if (s.printed !== r.printed) {
      out.chipChanged.push({ scheme: r.scheme, before: s.printed, after: r.printed });
      same = false;
    }
    if (s.nspGroup !== undefined && s.nspGroup !== r.nspGroup) {
      out.headingChanged.push({ scheme: r.scheme, before: s.nspGroup, after: r.nspGroup });
      same = false;
    }
    if (same) out.unchanged++;
  }
  for (const s of stored) if (!seen.has(s.scheme) && !s.notListedSince) out.notListed.push(s);
  return out;
}

/** The file's rows after a read: every card NSP lists now, in NSP's order,
 *  with this read's days and chips; then every older row NSP no longer lists,
 *  kept as it was and marked notListedSince (first day it was missed). Nothing
 *  is deleted. */
export function mergeWindows(stored: readonly StoredWindow[], read: readonly ReadWindow[], checkedOn: string): StoredWindow[] {
  const out: StoredWindow[] = [];
  const seen = new Set<string>();
  for (const r of read) {
    if (seen.has(r.scheme)) continue;
    seen.add(r.scheme);
    out.push({
      scheme: r.scheme,
      opensOn: r.opensOn,
      closesOn: r.closesOn,
      ...(r.printed ? { printed: r.printed } : {}),
      ...(r.nspGroup ? { nspGroup: r.nspGroup } : {}),
    });
  }
  for (const s of stored) {
    if (seen.has(s.scheme)) continue;
    out.push({ ...s, notListedSince: s.notListedSince ?? checkedOn });
  }
  return out;
}

/** The diff as plain lines for the terminal and the read log. */
export function diffLines(d: WindowsDiff, fmt: (iso: string | null) => string = (x) => x ?? "none"): string[] {
  const lines: string[] = [];
  for (const c of d.changed) lines.push(`CHANGED  ${c.field === "closesOn" ? "last date" : "opens"}: ${fmt(c.before)} -> ${fmt(c.after)}  | ${c.scheme}`);
  for (const c of d.chipChanged) lines.push(`CHIP CHANGED  "${c.before ?? "none"}" -> "${c.after ?? "none"}"  | ${c.scheme}`);
  for (const c of d.headingChanged) lines.push(`HEADING CHANGED  ${c.before ?? "none"} -> ${c.after ?? "none"}  | ${c.scheme}`);
  for (const a of d.added) lines.push(`ADDED    opens ${fmt(a.opensOn)}, last date ${fmt(a.closesOn)}  | ${a.scheme}  [${a.nspGroup ?? "no heading"}]`);
  for (const n of d.notListed) lines.push(`NOT LISTED NOW (kept, marked)  | ${n.scheme}`);
  for (const s of d.listedAgain) lines.push(`LISTED AGAIN  | ${s}`);
  for (const s of d.duplicates) lines.push(`DUPLICATE CARD (first kept)  | ${s}`);
  if (d.chipFirstRecorded > 0) lines.push(`CHIP RECORDED FOR THE FIRST TIME on ${d.chipFirstRecorded} row(s) (NSP's student chip as printed; the stored file had none)`);
  return lines;
}

/** Each card's state, read from NSP's scheme name (src/lib/nsp-windows.ts)
 *  against NSP's own heading. `mismatches`, `unplaced` and `noLevel` make
 *  --apply refuse: a mismatch means the parse or NSP's page is wrong, an
 *  unplaced card would sit under "State not read", and a card with no
 *  pre/post in its name would be on neither page (no row may be hidden).
 *  `fromHeadingOnly` is information: the page places those by the heading. */
export function crossCheckStates(read: readonly ReadWindow[]): {
  mismatches: string[];
  unplaced: string[];
  noLevel: string[];
  fromHeadingOnly: string[];
} {
  const out = { mismatches: [] as string[], unplaced: [] as string[], noLevel: [] as string[], fromHeadingOnly: [] as string[] };
  for (const r of read) {
    const fromName = parseNspState(r.scheme)?.code ?? null;
    const fromHeading = r.nspGroup ? (parseNspState(r.nspGroup)?.code ?? null) : null;
    if (fromName && fromHeading && fromName !== fromHeading) out.mismatches.push(`name says ${fromName}, NSP heading says ${r.nspGroup}  | ${r.scheme}`);
    else if (!fromName && !fromHeading) out.unplaced.push(`no state in the name or NSP's heading (${r.nspGroup ?? "none"})  | ${r.scheme}`);
    else if (!fromName) out.fromHeadingOnly.push(`state taken from NSP's heading ${r.nspGroup}  | ${r.scheme}`);
    const pre = /\bpre[\s-]?matric/i.test(r.scheme);
    const post = /\bpost[\s-]?matric/i.test(r.scheme);
    if (pre === post) out.noLevel.push(`${pre ? "both pre- and post-matric" : "neither pre- nor post-matric"} in the name  | ${r.scheme}`);
  }
  return out;
}

/** The file's header after an --apply on `checkedOn` (IST, YYYY-MM-DD;
 *  `readDay` is the same day as the page prints it, "3 Oct 2026"). The note
 *  carries the read day, never an older one; sourceUrl stays the page people
 *  visit and readUrl is what was fetched. The minority line is written only
 *  when no card of this read names minority students. */
export function appliedHeader(
  checkedOn: string,
  readDay: string,
  read: readonly ReadWindow[],
): Omit<WindowsFile, "windows"> & { readUrl: string } {
  const minority = read.some((r) => /minorit/i.test(r.scheme));
  return {
    note:
      `NSP 2026-27 pre-matric and post-matric windows for SC, ST and OBC/EBC/DNT students, one per state/UT scheme, as NSP's 'Schemes On NSP' → 'Centrally Sponsored Schemes' list printed them on ${readDay} ` +
      `(fetched from readUrl, the list sourceUrl shows). opensOn = 'Scheme Open from'; closesOn = 'Student Application Open till' or 'Closed on'; printed = the student chip as NSP printed it; nspGroup = NSP's state heading; null = the card showed no date. ` +
      `A row with notListedSince was on an earlier read and is not on NSP's list now (kept, never deleted). States not listed run these schemes on their own portals.` +
      (minority ? "" : " This list had no scheme for minority-community students."),
    sourceUrl: NSP_ALL_SCHOLARSHIPS_URL,
    readUrl: NSP_SPONSORED_URL,
    view: "Schemes On NSP: Centrally Sponsored Schemes",
    tier: "official",
    checkedOn,
  };
}

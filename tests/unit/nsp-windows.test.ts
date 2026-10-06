// NSP 2026-27 last dates by state (3 Oct 2026, non-exam value step 1):
// src/lib/nsp-windows.ts (parse + status), the lead line and FAQ of the two
// NSP pages (src/lib/scholarship-lists.ts), the table
// (src/components/NspWindowsTable.tsx, transpiled and rendered with
// renderToStaticMarkup — the pattern of tests/unit/date-tier-view.test.ts),
// the AI's page facts (src/lib/search/ask-tools.ts) and the pure reader
// behind scripts/read-nsp-windows.ts (scripts/nsp-windows-read.ts), also run
// on a trimmed copy of NSP's real page read on 3 Oct 2026
// (tests/fixtures/official-listings/nsp-sponsored-2026-10-03.html).
// No DB, no network. Run: npx vitest run tests/unit/nsp-windows.test.ts

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as nspMod from "@/lib/nsp-windows";
import {
  NSP_WINDOWS,
  NSP_WINDOW_ROWS,
  NSP_STATE_PORTAL_ROWS,
  isNspWindowOpen,
  isUnder9,
  nspFooterPortals,
  nspLevelSummary,
  nspListedStateCodes,
  nspOpenWindows,
  nspPageTitle,
  nspPortalRowAllowed,
  nspWindowId,
  nspWindowStatus,
  nspWindowsByState,
  parseNspClasses,
  parseNspState,
  parseNspWindow,
  type NspWindowRow,
} from "@/lib/nsp-windows";
import * as listsMod from "@/lib/scholarship-lists";
import { cycleLeadLine, formatIsoDay, isListedScheme, scholarshipFaq } from "@/lib/scholarship-lists";
import { SCHOLARSHIPS } from "@/data/scholarships";
import { STATES } from "@/lib/state-info";
import { nspWindowFacts, pageFacts } from "@/lib/search/ask-tools";
import { fixtureIndex } from "../fixtures/search-index-fixture";
import {
  NSP_ALL_SCHOLARSHIPS_URL,
  NSP_SPONSORED_URL,
  appliedHeader,
  crossCheckStates,
  diffLines,
  diffWindows,
  dmyToIso,
  mergeWindows,
  parseSponsoredList,
  type ReadWindow,
  type StoredWindow,
} from "../../scripts/nsp-windows-read";

const ROOT = path.resolve(__dirname, "../..");
const ISO = /^\d{4}-\d{2}-\d{2}$/;

describe("the NSP windows file", () => {
  it("is official, read on NSP, and every date is a real calendar day", () => {
    expect(NSP_WINDOWS.tier).toBe("official");
    expect(new URL(NSP_WINDOWS.sourceUrl).hostname).toBe("scholarships.gov.in");
    expect(NSP_WINDOWS.checkedOn).toMatch(ISO);
    expect(NSP_WINDOWS.checkedOn >= "2026-09-27").toBe(true);
    for (const w of NSP_WINDOWS.windows) {
      for (const d of [w.opensOn, w.closesOn, w.notListedSince ?? null]) {
        if (d === null) continue;
        expect(d, w.scheme).toMatch(ISO);
        expect(new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10), w.scheme).toBe(d);
      }
      if (w.opensOn && w.closesOn) expect(w.closesOn >= w.opensOn, w.scheme).toBe(true);
    }
  });
});

describe("parsing NSP's scheme strings", () => {
  it("all rows parse: a level, a state and a unique id each (105 read on 27 Sep 2026)", () => {
    expect(NSP_WINDOW_ROWS.length).toBeGreaterThanOrEqual(105);
    const ids = new Set<string>();
    for (const r of NSP_WINDOW_ROWS) {
      expect(r.level, r.scheme).not.toBeNull();
      expect(r.stateCode, r.scheme).not.toBeNull();
      expect(r.id).toBe(nspWindowId(r.scheme));
      expect(r.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(ids.has(r.id), `duplicate id ${r.id}`).toBe(false);
      ids.add(r.id);
    }
    expect(NSP_WINDOW_ROWS.filter((r) => r.level === "post").length).toBeGreaterThan(0);
    expect(NSP_WINDOW_ROWS.filter((r) => r.level === "pre").length).toBeGreaterThan(0);
  });

  it("every parsed state occurs verbatim in its row's scheme string, and names that state", () => {
    for (const r of NSP_WINDOW_ROWS) {
      expect(r.stateText, r.scheme).not.toBeNull();
      expect(r.scheme.includes(r.stateText!), r.scheme).toBe(true);
      expect(r.stateName).toBe(STATES[r.stateCode!].name);
    }
    // NSP's spelling of a UT that differs from Shishya's name.
    const dnh = NSP_WINDOW_ROWS.find((r) => /-Dnhdd$/.test(r.scheme))!;
    expect(dnh.stateCode).toBe("DN");
    expect(dnh.stateText).toBe("Dnhdd");
  });

  it("when a re-read stored NSP's own state heading, the name and the heading agree", () => {
    for (const r of NSP_WINDOW_ROWS) {
      if (!r.nspGroup) continue;
      expect(parseNspState(r.nspGroup)?.code, `${r.scheme} under ${r.nspGroup}`).toBe(r.stateCode);
    }
  });

  it("a parse never guesses: no state, or two states, gives null", () => {
    expect(parseNspState("Post Matric Scholarship For SC Students")).toBeNull();
    expect(parseNspState("Post Matric Scholarship - Assam And Goa")).toBeNull();
    expect(parseNspState("Post Matric Scholarship - Andaman And Nicobar")).toEqual({ code: "AN", text: "Andaman And Nicobar" });
    expect(parseNspState("PM YASASVI Post Matric Scholarship Scheme For OBC EBC And DNT - Jammu And Kashmir")?.code).toBe("JK");
    expect(parseNspState("Arunachal Pradesh")?.code).toBe("AR");
  });

  it("classes printed: Class Ix,X → 9-10; Class 1-10 → 1-10; Class I To Class V → 1-5", () => {
    expect(parseNspClasses("Scheme For ST Students(Class Ix,X)-Andaman And Nicobar")).toEqual({ from: 9, to: 10 });
    expect(parseNspClasses("Pre Matric Scholarship To OBC Students (Class 9 And Class 10) -Assam")).toEqual({ from: 9, to: 10 });
    expect(parseNspClasses("Engaged In Unclean Occupation(Class 1-10))-Assam")).toEqual({ from: 1, to: 10 });
    expect(parseNspClasses("To OBC Studetnts(Class I To Class V) - Puducherry")).toEqual({ from: 1, to: 5 });
    expect(parseNspClasses("Dr Ambedkar Post Matric Scholarship For Economically Backward Class Students")).toBeNull();
  });

  it("under9 is true for exactly the Class 1-10 / Class I-V / unclean-occupation rows", () => {
    // Independent check: the printed class range or the scheme's own words.
    const expected = (s: string) => /unclean|cleaning/i.test(s) || /\bClass\s*(?:1|I)\s*(?:-|To)\s*(?:Class\s*)?(?:10|V)\b/i.test(s);
    for (const r of NSP_WINDOW_ROWS) expect(r.under9, r.scheme).toBe(expected(r.scheme));
    // The eight such rows NSP printed on 27 Sep 2026 (the spec's "4" missed the
    // cleaning-occupation rows of Goa, Punjab, Tripura and West Bengal and the
    // Puducherry Class I-V row).
    const known = [
      "Pre-Matric Scholarship For SC Students Of Parents Or Guardians Engaged In Unclean Occupation(Class 1-10))-Assam",
      "Pre-Matric Scholarship To The Children Of Those Engaged In Occupations Involving Cleaning And Prone To Health Hazards - Goa",
      "Pre-Matric Scholarship For SC Students Of Parents Or Guardians Engaged In Unclean Occupation(Class 1-10)-Himachal Pradesh",
      "Centrally Sponsored Scheme Of Pre Matric Scholarship To OBC Studetnts(Class I To Class V) - Puducherry",
      "Pre-Matric Scholarship To The Children Of Those Engaged In Occupations Involving Cleaning And Prone To Health Hazards - Punjab",
      "Pre-Matric Scholarships For Children Of Parents Or Guardians Engaged In Unclean Occupation(Class 1-10)-Sikkim",
      "Pre Matric SC Cleaning And Health Hazard -Tripura",
      "Centrally Sponsored Pre Matric Scholarship Scheme To The Children Of Those Engaged In Occupations Involving Cleaning And Health Hazard-West Bengal",
    ];
    for (const s of known) {
      const r = NSP_WINDOW_ROWS.find((x) => x.scheme === s);
      if (r) expect(r.under9, s).toBe(true);
      expect(isUnder9(s), s).toBe(true);
    }
    // No post-matric row covers classes below 9.
    expect(NSP_WINDOW_ROWS.filter((r) => r.level === "post" && r.under9)).toEqual([]);
    expect(isUnder9("Pre Matric Scholarship To ST Students (Class Ix And X) - Assam")).toBe(false);
  });
});

describe("status on an IST day", () => {
  const read = "2026-10-03";
  const row = (over: Partial<NspWindowRow>): NspWindowRow => ({ scheme: "Post Matric Scholarship For SC Students - Assam", opensOn: "2026-06-01", closesOn: "2026-10-15", ...over });

  it("open on the last day itself, not open the day after", () => {
    expect(nspWindowStatus(row({}), "2026-10-15", read)).toEqual({ kind: "open", closesOn: "2026-10-15" });
    expect(isNspWindowOpen(row({}), "2026-10-15", read)).toBe(true);
    expect(isNspWindowOpen(row({}), "2026-10-16", read)).toBe(false);
    // The date was ahead when NSP was read, so the page says it passed and may have been extended.
    expect(nspWindowStatus(row({}), "2026-10-16", read)).toEqual({ kind: "passed", closesOn: "2026-10-15", checkedOn: read });
  });

  it("closed when NSP itself showed it closed, or the date was behind the read day", () => {
    expect(nspWindowStatus(row({ closesOn: "2026-09-30", printed: "Student Application Closed on : 30-09-2026" }), "2026-10-03", read)).toEqual({ kind: "closed", closesOn: "2026-09-30" });
    expect(nspWindowStatus(row({ closesOn: "2026-09-30" }), "2026-10-05", read)).toEqual({ kind: "closed", closesOn: "2026-09-30" });
  });

  it("no last date, not yet opened, opens later, no longer listed", () => {
    expect(nspWindowStatus(row({ opensOn: null, closesOn: null }), read, read)).toEqual({ kind: "no-date", notYetOpened: false });
    expect(nspWindowStatus(row({ opensOn: null, closesOn: null, printed: "Student Application : NOT YET OPENED" }), read, read)).toEqual({ kind: "no-date", notYetOpened: true });
    expect(nspWindowStatus(row({ opensOn: "2026-10-10", closesOn: "2026-11-30" }), read, read)).toEqual({ kind: "opens-later", opensOn: "2026-10-10", closesOn: "2026-11-30" });
    expect(nspWindowStatus(row({ notListedSince: "2026-10-24" }), "2026-10-25", "2026-10-24")).toEqual({ kind: "not-listed", since: "2026-10-24" });
  });

  it("summaries and open lists come from the same status", () => {
    const today = NSP_WINDOWS.checkedOn;
    for (const level of ["post", "pre"] as const) {
      const sum = nspLevelSummary(level, today);
      const open = nspOpenWindows(level, today);
      expect(sum.open).toBe(open.length);
      expect(sum.open + sum.closed + sum.opensLater + sum.notYetOpened + sum.noDate + sum.notListed).toBe(sum.rows);
      expect(sum.states).toBe(nspListedStateCodes(level).length);
      for (const r of open) expect(r.closesOn! >= today).toBe(true);
      for (let i = 1; i < open.length; i++) expect(open[i - 1].closesOn! <= open[i].closesOn!).toBe(true);
      if (sum.nextLastDate) expect(sum.nextLastDate.date).toBe(open[0].closesOn);
    }
  });

  it("each count bucket holds only its own rows: opening later, not yet opened, no date, no longer listed", () => {
    const mk = (over: Partial<NspWindowRow>) =>
      parseNspWindow({ scheme: "Post Matric Scholarship For SC Students - Assam", opensOn: "2026-06-01", closesOn: "2026-10-15", ...over });
    const rows = [
      mk({}),
      mk({ scheme: "Post Matric Scholarship For ST Students - Goa", opensOn: "2026-10-10", closesOn: "2026-11-30" }),
      mk({ scheme: "Post Matric Scholarship For OBC Students - Goa", opensOn: null, closesOn: null, printed: "Student Application : NOT YET OPENED" }),
      mk({ scheme: "Post Matric Scholarship For SC Students - Goa", opensOn: null, closesOn: null }),
      mk({ scheme: "Post Matric Scholarship For SC Students - Punjab", notListedSince: "2026-10-03" }),
      mk({ scheme: "Post Matric Scholarship For ST Students - Delhi", closesOn: "2026-09-30", printed: "Student Application Closed on : 30-09-2026" }),
    ];
    const { nextLastDate, ...sum } = nspLevelSummary("post", "2026-10-03", rows, "2026-10-03");
    expect(sum).toEqual({ rows: 6, states: 3, open: 1, closed: 1, opensLater: 1, notYetOpened: 1, noDate: 1, notListed: 1 });
    expect(nextLastDate?.date).toBe("2026-10-15");
    // Punjab's only row is no longer on NSP's list, so Punjab is not "listed".
    expect(nspListedStateCodes("post", rows)).toEqual(["AS", "DL", "GA"]);
  });
});

describe("grouping by state", () => {
  it("one group per state, A-Z, with #state-* anchors; every row of the level is shown once", () => {
    for (const level of ["post", "pre"] as const) {
      const groups = nspWindowsByState(level);
      const rows = groups.flatMap((g) => g.rows);
      expect(rows.length).toBe(NSP_WINDOW_ROWS.filter((r) => r.level === level).length);
      expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
      const names = groups.filter((g) => g.anchor).map((g) => g.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
      for (const g of groups) {
        if (!g.anchor) continue;
        expect(g.anchor).toMatch(/^state-[a-z0-9-]+$/);
        for (const r of g.rows) expect(r.stateCode).toBe(g.stateCode);
      }
    }
    expect(nspWindowsByState("post").some((g) => g.anchor === "state-west-bengal")).toBe(true);
  });
});

describe("the two NSP pages' lead line, FAQ and title", () => {
  const today = "2026-10-03";
  const checked = formatIsoDay(NSP_WINDOWS.checkedOn);

  it("the lead line names how many states NSP lists, sends the others to their own portals, and never says 'has not checked'", () => {
    for (const [id, level] of [
      ["nsp-post-matric", "post"],
      ["nsp-pre-matric", "pre"],
    ] as const) {
      const s = SCHOLARSHIPS.find((x) => x.id === id)!;
      const n = nspListedStateCodes(level).length;
      // The count is the table's: one state group with a row still on NSP's list per state.
      expect(n).toBe(nspWindowsByState(level).filter((g) => g.anchor && g.rows.some((r) => !r.notListedSince)).length);
      expect(n).toBeGreaterThanOrEqual(20);
      const line = cycleLeadLine(s, today);
      expect(line).not.toMatch(/has not checked/i);
      expect(line).toBe(
        `On NSP, each of the ${n} states and UTs listed below sets its own 2026-27 last date for each scheme (read on NSP on ${checked}). Other states run these schemes on their own portals.`,
      );
      // The FAQ answer (and its FAQPage JSON-LD) says the same without "below": the FAQ comes after the table.
      const apply = scholarshipFaq(s, today).find((f) => f.q.startsWith("How do I apply"))!;
      expect(apply.a).not.toMatch(/has not checked/i);
      expect(apply.a).not.toMatch(/\bbelow\b/);
      expect(apply.a).toContain(
        `On NSP, each of the ${n} states and UTs listed on this page sets its own 2026-27 last date for each scheme (read on NSP on ${checked}). Other states run these schemes on their own portals. NSP can extend dates, so check the portal before the day.`,
      );
    }
  });

  it("other schemes keep their own lead line", () => {
    const usual = { id: "some-other-scheme", deadline: "Usually Oct–Dec", closed: undefined, cycle: undefined };
    expect(cycleLeadLine(usual, today)).toMatch(/^Shishya has not checked a 2026-27 date/);
  });

  it("titles say what the page now prints", () => {
    expect(nspPageTitle("post")).toBe("Post-Matric Scholarship (NSP) 2026-27: last dates by state, eligibility, amount");
    expect(nspPageTitle("pre")).toBe("Pre-Matric Scholarship (NSP) 2026-27: last dates by state, eligibility, amount");
  });

  it("the footer's portal examples are listed state rows for states NOT on NSP's list for the level", () => {
    for (const level of ["post", "pre"] as const) {
      const listed = nspListedStateCodes(level);
      for (const id of NSP_STATE_PORTAL_ROWS[level]) {
        const s = SCHOLARSHIPS.find((x) => x.id === id);
        expect(s, id).toBeDefined();
        expect(s!.type, id).toBe("STATE");
        expect(isListedScheme(s!), id).toBe(true);
        expect(listed, `${id} (${s!.state}) is on NSP's ${level}-matric list`).not.toContain(s!.state);
      }
      // What the page links: every id above, in order (none filtered out today).
      expect(nspFooterPortals(level, SCHOLARSHIPS, isListedScheme).map((p) => p.id)).toEqual([...NSP_STATE_PORTAL_ROWS[level]]);
    }
    // Maharashtra is on NSP's list (PM YASASVI OBC/EBC/DNT), and Vidyasiri is
    // Karnataka's food-and-accommodation allowance, not its post-matric scheme.
    for (const ids of Object.values(NSP_STATE_PORTAL_ROWS)) {
      expect(ids).not.toContain("mahadbt");
      expect(ids).not.toContain("ka-vidyasiri");
    }
    expect(nspPortalRowAllowed("post", "MH")).toBe(false);
    expect(nspPortalRowAllowed("pre", "MH")).toBe(false);
    expect(nspPortalRowAllowed("post", null)).toBe(false);
    // A later re-read that adds a footer row's state to NSP's list drops that example by itself.
    expect(nspFooterPortals("post", [{ id: "ts-epaas", name: "Telangana ePass", state: "AS" }], () => true)).toEqual([]);
    expect(nspFooterPortals("post", [{ id: "ts-epaas", name: "Telangana ePass", state: "TS" }], () => false)).toEqual([]);
  });
});

// ── The table, rendered ──────────────────────────────────────────────

type TableProps = { level: "pre" | "post"; today: string; portals: { id: string; name: string }[] };
function loadTable(): (p: TableProps) => React.ReactElement | null {
  const file = path.join(ROOT, "src/components/NspWindowsTable.tsx");
  const out = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  const Link = ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) => React.createElement("a", { href, ...rest }, children);
  const stubs: Record<string, unknown> = {
    "react/jsx-runtime": jsxRuntime,
    react: React,
    "next/link": { __esModule: true, default: Link },
    "@/lib/scholarship-lists": listsMod,
    "@/lib/nsp-windows": nspMod,
  };
  const req = (spec: string): unknown => {
    if (spec in stubs) return stubs[spec];
    throw new Error(`unexpected import ${spec}`);
  };
  new Function("require", "module", "exports", out)(req, mod, mod.exports);
  return mod.exports.NspWindowsTable as (p: TableProps) => React.ReactElement | null;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

describe("NspWindowsTable", () => {
  const Table = loadTable();
  const today = "2026-10-03";
  const portals = [{ id: "ed-cell-up", name: "UP Scholarship (Sashakta Abhibhavak Yojna + Post-Matric)" }];

  it("renders NSP's own scheme string for every row of the level, grouped under state anchors", () => {
    for (const level of ["post", "pre"] as const) {
      const html = renderToStaticMarkup(React.createElement(Table, { level, today, portals }));
      expect(html).toContain('id="nsp-last-dates"');
      expect(html).toContain("2026-27 last dates on NSP, by state");
      for (const r of NSP_WINDOW_ROWS.filter((x) => x.level === level)) expect(html, r.scheme).toContain(`<td class="px-3 py-2 text-xs text-ink-800">${escapeHtml(r.scheme)}</td>`);
      for (const r of NSP_WINDOW_ROWS.filter((x) => x.level !== level)) expect(html, r.scheme).not.toContain(`>${escapeHtml(r.scheme)}<`);
      for (const g of nspWindowsByState(level)) if (g.anchor) {
        expect(html).toContain(`id="${g.anchor}"`);
        expect(html).toContain(`href="#${g.anchor}"`);
      }
    }
  });

  it("header names NSP and the read day; footer points other states to their portals", () => {
    const html = renderToStaticMarkup(React.createElement(Table, { level: "post", today, portals }));
    expect(html).toContain(`→ Centrally Sponsored Schemes) on ${formatIsoDay(NSP_WINDOWS.checkedOn)}. NSP can extend dates; check the portal before the day.`);
    expect(html).toContain(">scholarships.gov.in</a>");
    expect(html).toContain("States not listed run these schemes on their own portals");
    expect(html).toContain('href="/scholarships/ed-cell-up"');
  });

  it("the counts line names each bucket for what it is and prints only the buckets that have rows", () => {
    for (const level of ["post", "pre"] as const) {
      const html = renderToStaticMarkup(React.createElement(Table, { level, today, portals }));
      const sum = nspLevelSummary(level, today);
      expect(html).toContain(`for ${sum.states} states and UTs: ${sum.open} open today, ${sum.closed} closed or past`);
      const buckets: [number, string][] = [
        [sum.opensLater, "opening later"],
        [sum.notYetOpened, "not yet opened on NSP"],
        [sum.noDate, "with no last date on NSP"],
        [sum.notListed, "no longer on NSP&#x27;s list"],
      ];
      for (const [n, words] of buckets) {
        if (n > 0) expect(html).toContain(`${n} ${words}`);
        else expect(html).not.toMatch(new RegExp(`\\d+ ${words}`));
      }
    }
  });

  it("no row is hidden and nothing account-related is offered (Class 1-10 rows included)", () => {
    const html = renderToStaticMarkup(React.createElement(Table, { level: "pre", today: "2027-03-01", portals: [] }));
    for (const r of NSP_WINDOW_ROWS.filter((x) => x.level === "pre")) expect(html).toContain(escapeHtml(r.scheme));
    expect(html).not.toMatch(/sign[ -]?(up|in)|remind|account|log ?in/i);
    // Every dated row is past by March 2027: each says closed or passed, none says Open.
    expect(html).not.toContain(">Open<");
    expect(html).toMatch(/Closed on \d|has passed; NSP may have extended it/);
  });
});

// ── The AI's page facts ──────────────────────────────────────────────

describe("page_facts on the NSP pages", () => {
  it("carries the open windows (official, read day) and the next last date", () => {
    const today = NSP_WINDOWS.checkedOn;
    const f = nspWindowFacts("post", today, "https://shishya.in/scholarships/nsp-post-matric");
    expect(f.tier).toBe("official");
    expect(f.checkedOn).toBe(NSP_WINDOWS.checkedOn);
    expect(f.page).toBe("https://shishya.in/scholarships/nsp-post-matric#nsp-last-dates");
    expect(f.openNow.length).toBe(nspOpenWindows("post", today).length);
    for (const w of f.openNow) expect(w.lastDate! >= today).toBe(true);
    if (f.nextLastDate) expect(f.nextLastDate.date).toBe(f.openNow[0].lastDate);
    expect(f.rule).toMatch(/never give one national date/);
    // Only the states on NSP's list; a student from any other state is not sent to NSP.
    expect(f.statesListed).toEqual(nspListedStateCodes("post").map((c) => STATES[c].name));
    expect(f.rule).toContain(`each of the ${f.statesListed.length} states and UTs in statesListed`);
    expect(f.rule).toMatch(/do not send that student to NSP for a date/);
    const c = f.counts;
    expect(c.openToday + c.closedOrPastLastDate + c.opensLater + c.notYetOpenedOnNsp + c.noLastDateOnNsp + c.noLongerOnNspList).toBe(c.rows);
  });

  it("pageFacts adds nspStateWindows only on the two NSP pages", () => {
    const idx = fixtureIndex();
    const post = pageFacts(idx, { url: "https://shishya.in/scholarships/nsp-post-matric" });
    expect(post.kind).toBe("scholarship");
    expect(post).toHaveProperty("nspStateWindows");
    expect(String(post.deadline)).toMatch(/official 2026-27 last dates are per state/);
    const other = pageFacts(idx, { url: "https://shishya.in/scholarships/nmmss" });
    expect(other).not.toHaveProperty("nspStateWindows");
  });
});

// ── The reader behind scripts/read-nsp-windows.ts ────────────────────

const CARD = (name: string, chips: string[]) =>
  `<div class="col-md-10">\n<h6> ${name}</h6><br>\n<!--  <h6>by  State of Nowhere</h6>-->\n${chips
    .map((c) => `<span class="d-inline-block mt-1" style="font-size: 12px;">${c} </span>`)
    .join("\n")}\n<span>DNO/SNO/MNO Verification Open till:30-11-2026 </span></div>`;

const PAGE = [
  `<button class="accordion-button" type="button">Students</button>`,
  `<h6>Some heading that is not a card</h6>`,
  `<button class="accordion-button collapsed" type="button"> UT of Andaman and Nicobar Islands </button>`,
  CARD("PM YASASVI Post Matric Scholarship Scheme For OBC Students - Andaman And Nicobar (Welfare Based Scheme)", [
    "Scheme  Open from : 03-07-2026",
    "Student Application  Open till : 31-10-2026",
  ]),
  CARD("Dr Ambedkar Post Matric Scholarship For Economically Backward Class Students-Andaman And Nicobar (Welfare Based Scheme)", [
    "Scheme : NOT YET OPENED",
    "Student Application : NOT YET OPENED",
  ]),
  `<button class="accordion-button collapsed" type="button">State of Assam</button>`,
  CARD("Pre-Matric Scholarship For SC Students (Class Ix &amp; X) - Assam (Welfare Based Scheme)", [
    "Scheme  Open from : 01-06-2026",
    "Student Application Closed on : 30-09-2026",
  ]),
].join("\n");

describe("scripts/nsp-windows-read.ts", () => {
  it("reads cards under NSP's state headings, ignores comments, stray headings and verification chips", () => {
    const { windows, groups, problems } = parseSponsoredList(PAGE);
    expect(problems).toEqual([]);
    expect(groups).toEqual(["UT of Andaman and Nicobar Islands", "State of Assam"]);
    expect(windows).toEqual([
      {
        scheme: "PM YASASVI Post Matric Scholarship Scheme For OBC Students - Andaman And Nicobar",
        opensOn: "2026-07-03",
        closesOn: "2026-10-31",
        printed: "Student Application Open till : 31-10-2026",
        nspGroup: "UT of Andaman and Nicobar Islands",
      },
      {
        scheme: "Dr Ambedkar Post Matric Scholarship For Economically Backward Class Students-Andaman And Nicobar",
        opensOn: null,
        closesOn: null,
        printed: "Student Application : NOT YET OPENED",
        nspGroup: "UT of Andaman and Nicobar Islands",
      },
      {
        scheme: "Pre-Matric Scholarship For SC Students (Class Ix & X) - Assam",
        opensOn: "2026-06-01",
        closesOn: "2026-09-30",
        printed: "Student Application Closed on : 30-09-2026",
        nspGroup: "State of Assam",
      },
    ]);
  });

  it("dd-mm-yyyy only when it is a real day", () => {
    expect(dmyToIso("31-10-2026")).toBe("2026-10-31");
    expect(dmyToIso("31-02-2027")).toBeNull();
    expect(dmyToIso("2026-10-31")).toBeNull();
  });

  it("the diff names changed dates, new cards and cards gone; the merge never deletes", () => {
    const stored: StoredWindow[] = [
      { scheme: "A - Assam", opensOn: "2026-06-01", closesOn: "2026-09-30" },
      { scheme: "B - Goa", opensOn: "2026-06-01", closesOn: "2026-10-31" },
      { scheme: "C - Delhi", opensOn: null, closesOn: null },
    ];
    const read = [
      { scheme: "A - Assam", opensOn: "2026-06-01", closesOn: "2026-10-15", printed: "Student Application  Open till : 15-10-2026", nspGroup: "State of Assam" },
      { scheme: "C - Delhi", opensOn: null, closesOn: null, printed: "Student Application : NOT YET OPENED", nspGroup: "State of Delhi" },
      { scheme: "D - Punjab", opensOn: "2026-06-01", closesOn: "2026-10-27", printed: "Student Application  Open till : 27-10-2026", nspGroup: "State of Punjab" },
    ];
    const d = diffWindows(stored, read);
    expect(d.changed).toEqual([{ scheme: "A - Assam", field: "closesOn", before: "2026-09-30", after: "2026-10-15" }]);
    expect(d.added.map((x) => x.scheme)).toEqual(["D - Punjab"]);
    expect(d.notListed.map((x) => x.scheme)).toEqual(["B - Goa"]);
    expect(d.unchanged).toBe(1);
    const merged = mergeWindows(stored, read, "2026-10-03");
    expect(merged.map((x) => x.scheme)).toEqual(["A - Assam", "C - Delhi", "D - Punjab", "B - Goa"]);
    expect(merged.find((x) => x.scheme === "B - Goa")).toEqual({ scheme: "B - Goa", opensOn: "2026-06-01", closesOn: "2026-10-31", notListedSince: "2026-10-03" });
    expect(nspWindowStatus(merged.find((x) => x.scheme === "B - Goa")!, "2026-10-03", "2026-10-03").kind).toBe("not-listed");
    // A later read that misses it again keeps the first day it was missed.
    expect(mergeWindows(merged, read, "2026-10-24").find((x) => x.scheme === "B - Goa")!.notListedSince).toBe("2026-10-03");
  });

  it("refuses a card with two student chips (fresh + renewal) or an opening chip it does not know", () => {
    const page = [
      `<button class="accordion-button collapsed" type="button">State of Assam</button>`,
      CARD("Post Matric Scholarship For SC Students - Assam (Welfare Based Scheme)", [
        "Scheme  Open from : 01-06-2026",
        "Student Application  Open till : 31-10-2026",
        "Student Application  Open till (for Renewal) : 15-11-2026",
      ]),
      CARD("Post Matric Scholarship For ST Students - Assam (Welfare Based Scheme)", ["Scheme Closed on : 01-06-2026", "Student Application  Open till : 31-10-2026"]),
    ].join("\n");
    const { windows, problems } = parseSponsoredList(page);
    expect(windows).toHaveLength(2);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatch(/^Post Matric Scholarship For SC Students - Assam: 2 student chips, not one/);
    expect(problems[1]).toMatch(/^Post Matric Scholarship For ST Students - Assam: opening chip not understood "Scheme Closed on : 01-06-2026"/);
  });

  it("the diff reports a student chip that changed with the same date, a changed heading, and chips recorded for the first time", () => {
    const stored: StoredWindow[] = [
      { scheme: "A - Assam", opensOn: "2026-06-01", closesOn: "2026-10-31", printed: "Student Application Open till : 31-10-2026", nspGroup: "State of Assam" },
      { scheme: "B - Goa", opensOn: "2026-06-01", closesOn: "2026-10-31" },
      { scheme: "C - Delhi", opensOn: null, closesOn: null, printed: "Student Application : NOT YET OPENED", nspGroup: "State of Delhi" },
    ];
    const read: ReadWindow[] = [
      { scheme: "A - Assam", opensOn: "2026-06-01", closesOn: "2026-10-31", printed: "Student Application Closed on : 31-10-2026", nspGroup: "State of Assam" },
      { scheme: "B - Goa", opensOn: "2026-06-01", closesOn: "2026-10-31", printed: "Student Application Open till : 31-10-2026", nspGroup: "State of Goa" },
      { scheme: "C - Delhi", opensOn: null, closesOn: null, printed: "Student Application : NOT YET OPENED", nspGroup: "UT of Delhi" },
    ];
    const d = diffWindows(stored, read);
    expect(d.changed).toEqual([]);
    expect(d.chipChanged).toEqual([{ scheme: "A - Assam", before: "Student Application Open till : 31-10-2026", after: "Student Application Closed on : 31-10-2026" }]);
    expect(d.headingChanged).toEqual([{ scheme: "C - Delhi", before: "State of Delhi", after: "UT of Delhi" }]);
    expect(d.chipFirstRecorded).toBe(1);
    expect(d.unchanged).toBe(1);
    const lines = diffLines(d);
    expect(lines).toContain('CHIP CHANGED  "Student Application Open till : 31-10-2026" -> "Student Application Closed on : 31-10-2026"  | A - Assam');
    expect(lines).toContain("HEADING CHANGED  State of Delhi -> UT of Delhi  | C - Delhi");
    expect(lines.some((l) => l.startsWith("CHIP RECORDED FOR THE FIRST TIME on 1 row"))).toBe(true);
  });

  it("the cross-check blocks a name and heading that disagree, a card with no state, and a card on neither page", () => {
    const r = (scheme: string, nspGroup: string | null): ReadWindow => ({ scheme, opensOn: null, closesOn: null, printed: null, nspGroup });
    const cc = crossCheckStates([
      r("Post Matric Scholarship For SC Students - Assam", "State of Assam"),
      r("Post Matric Scholarship For SC Students - Goa", "State of Assam"),
      r("Post Matric Scholarship For SC Students", null),
      r("Post Matric Scholarship For ST Students", "State of Sikkim"),
      r("Scholarship For SC Students - Assam", "State of Assam"),
    ]);
    expect(cc.mismatches).toEqual(["name says GA, NSP heading says State of Assam  | Post Matric Scholarship For SC Students - Goa"]);
    expect(cc.unplaced).toHaveLength(1);
    expect(cc.fromHeadingOnly).toHaveLength(1);
    expect(cc.noLevel).toEqual(["neither pre- nor post-matric in the name  | Scholarship For SC Students - Assam"]);
  });
});

// ── The reader on NSP's real page, read on 3 Oct 2026 ────────────────

const FIXTURE_DAY = "2026-10-03";
const FIXTURE = fs.readFileSync(path.join(ROOT, "tests/fixtures/official-listings/nsp-sponsored-2026-10-03.html"), "utf8");

describe("the reader on NSP's real page (nsp-sponsored-2026-10-03.html)", () => {
  const { windows, groups, problems } = parseSponsoredList(FIXTURE);

  it("reads 105 cards under 22 state/UT headings with no problem, skipping the page's other headings", () => {
    expect(problems).toEqual([]);
    expect(windows).toHaveLength(105);
    expect(new Set(windows.map((w) => w.scheme)).size).toBe(105);
    expect(groups).toHaveLength(22);
    for (const g of groups) {
      expect(g).toMatch(/^(State|UT) of /);
      expect(parseNspState(g), g).not.toBeNull();
    }
    // The copy keeps the page's traps, and none of them is read as a card.
    expect(FIXTURE).toContain('<h6 ><strong class="announcementText">');
    expect(FIXTURE).toMatch(/<h7 class="accordion-header">/);
    expect(FIXTURE).toMatch(/accordion-button[^>]*>\s*<img[^>]*>Students/);
    expect(FIXTURE).toContain("<span>Schemes On NSP </span>");
    expect(FIXTURE).toMatch(/<option value="\d+">State of /);
    expect(windows.some((w) => /Academic Year|^Students$|Schemes On NSP|^State of|^UT of/.test(w.scheme))).toBe(false);
  });

  it("every card has one student chip in a form the reader knows, its date read from that chip, and a state NSP's heading agrees with", () => {
    for (const w of windows) {
      expect(w.printed, w.scheme).toMatch(/^Student Application (?:Open till : \d{2}-\d{2}-\d{4}|Closed on : \d{2}-\d{2}-\d{4}|: NOT YET OPENED)$/);
      if (w.closesOn) expect(w.printed, w.scheme).toContain(w.closesOn.split("-").reverse().join("-"));
      else expect(w.printed, w.scheme).toBe("Student Application : NOT YET OPENED");
      if (w.opensOn && w.closesOn) expect(w.closesOn >= w.opensOn, w.scheme).toBe(true);
      expect(w.nspGroup, w.scheme).not.toBeNull();
    }
    expect(crossCheckStates(windows)).toEqual({ mismatches: [], unplaced: [], noLevel: [], fromHeadingOnly: [] });
  });

  it("matches what NSP printed on 3 Oct 2026 (rows checked by hand on the live page)", () => {
    const get = (scheme: string) => {
      const w = windows.find((x) => x.scheme === scheme);
      expect(w, scheme).toBeDefined();
      return w!;
    };
    expect(get("PM YASASVI Post Matric Scholarship Scheme For OBC Students - Andaman And Nicobar")).toMatchObject({
      opensOn: "2026-07-03",
      closesOn: "2026-10-31",
      nspGroup: "UT of Andaman and Nicobar Islands",
    });
    expect(get("Postmatric Scholarship For OBC Students - Tripura").closesOn).toBe("2026-12-31");
    expect(get("Centrally Sponsored Post Matric Scholarship For SC Students- Manipur").closesOn).toBe("2026-10-31");
    expect(get("Pre Matric Scholarship For SC Students Studying In Class Ix And X-Sikkim").closesOn).toBe("2026-10-31");
    expect(get("Centrally Sponsored Scheme Of Pre Matric Scholarship For SC Students (Class Ix & X)-Punjab").closesOn).toBe("2026-10-27");
    expect(get("Pre Matric Scholarship To OBC Students (Class 9 And Class 10) -Assam")).toMatchObject({
      closesOn: "2026-09-30",
      printed: "Student Application Closed on : 30-09-2026",
    });
    expect(get("Umbrella Scheme For Education Of ST Students - Pre Matric Scholarship (Class Ix & X) For ST Students-Tripura")).toMatchObject({
      closesOn: "2026-09-15",
      printed: "Student Application Closed on : 15-09-2026",
    });
    expect(get("Pre-Matric Scholarship To The Children Of Those Engaged In Occupations Involving Cleaning And Prone To Health Hazards - Goa")).toMatchObject({
      closesOn: null,
      printed: "Student Application : NOT YET OPENED",
    });
    expect(get("Centrally Sponsored Post Matric Scholarsip Scheme For SC -West Bengal")).toMatchObject({
      closesOn: null,
      printed: "Student Application : NOT YET OPENED",
    });
  });

  it("applied on the day it was read, the page shows what NSP shows: post 47 open, 2 closed, 3 not yet opened; pre 45, 4, 4", () => {
    const rows = mergeWindows([], windows, FIXTURE_DAY).map(parseNspWindow);
    for (const r of rows) {
      expect(r.level, r.scheme).not.toBeNull();
      expect(parseNspState(r.nspGroup!)?.code, r.scheme).toBe(r.stateCode);
    }
    const counts = (level: "pre" | "post") => {
      const { nextLastDate, ...sum } = nspLevelSummary(level, FIXTURE_DAY, rows, FIXTURE_DAY);
      return { ...sum, next: nextLastDate?.date, nextStates: [...new Set(nextLastDate?.rows.map((r) => r.stateCode))] };
    };
    expect(counts("post")).toEqual({ rows: 52, states: 22, open: 47, closed: 2, opensLater: 0, notYetOpened: 3, noDate: 0, notListed: 0, next: "2026-10-06", nextStates: ["AS"] });
    expect(counts("pre")).toEqual({ rows: 53, states: 21, open: 45, closed: 4, opensLater: 0, notYetOpened: 4, noDate: 0, notListed: 0, next: "2026-10-06", nextStates: ["AS"] });
    expect(rows.filter((r) => r.under9).map((r) => r.level)).toEqual(Array(8).fill("pre"));
    // The footer's examples are states NSP does not list; Maharashtra it does.
    for (const st of ["UP", "TS", "KL"]) expect(nspPortalRowAllowed("post", st, rows), st).toBe(true);
    expect(nspPortalRowAllowed("pre", "UP", rows)).toBe(true);
    expect(nspPortalRowAllowed("post", "MH", rows)).toBe(false);
  });

  it("the data file holds every card of this read (nothing is ever deleted), and once applied from it, NSP's own days and chips", () => {
    const byScheme = new Map(NSP_WINDOWS.windows.map((w) => [w.scheme, w]));
    for (const w of windows) expect(byScheme.has(w.scheme), w.scheme).toBe(true);
    const d = diffWindows(NSP_WINDOWS.windows, windows);
    expect(d.added).toEqual([]);
    expect(d.duplicates).toEqual([]);
    if (NSP_WINDOWS.checkedOn === "2026-09-27") {
      // Not applied yet: this is the dry run's diff — 34 last dates moved
      // (30 of the 35 windows dated 30 Sep 2026 were extended; 3 Punjab
      // rows and 1 Tripura row gained a date), nothing else.
      expect(d.changed.filter((c) => c.field === "closesOn")).toHaveLength(34);
      expect(d.changed.filter((c) => c.field === "opensOn")).toEqual([]);
      expect(d.notListed).toEqual([]);
      expect(d.chipFirstRecorded).toBe(105);
    } else if (NSP_WINDOWS.checkedOn === FIXTURE_DAY) {
      // Applied from a live read on the fixture's day: every card is the file's row.
      for (const w of windows) {
        expect(byScheme.get(w.scheme), w.scheme).toEqual({ scheme: w.scheme, opensOn: w.opensOn, closesOn: w.closesOn, printed: w.printed, nspGroup: w.nspGroup });
      }
      expect(d.changed).toEqual([]);
      expect(d.chipChanged).toEqual([]);
      expect(NSP_WINDOWS.readUrl).toBe(NSP_SPONSORED_URL);
      expect(NSP_WINDOWS.note).toContain("printed them on 3 Oct 2026");
    }
    // Applied on a later day: only the checks above hold (NSP may have moved
    // dates since 3 Oct); save that day's page with --save-html for a new fixture.
  });

  it("an --apply header names the read day and the URL fetched, never the 27 Sep note", () => {
    const h = appliedHeader(FIXTURE_DAY, "3 Oct 2026", windows);
    expect(h.checkedOn).toBe(FIXTURE_DAY);
    expect(h.tier).toBe("official");
    expect(h.sourceUrl).toBe(NSP_ALL_SCHOLARSHIPS_URL);
    expect(h.readUrl).toBe(NSP_SPONSORED_URL);
    expect(new URL(h.readUrl).hostname).toBe("scholarships.gov.in");
    expect(h.note).toContain("printed them on 3 Oct 2026");
    expect(h.note).not.toMatch(/27 Sep/);
    expect(h.note).toContain("This list had no scheme for minority-community students.");
    const withMinority = appliedHeader("2026-10-24", "24 Oct 2026", [
      { scheme: "Pre Matric Scholarship For Minorities - Assam", opensOn: null, closesOn: null, printed: null, nspGroup: "State of Assam" },
    ]);
    expect(withMinority.note).toContain("printed them on 24 Oct 2026");
    expect(withMinority.note).not.toMatch(/minority-community/);
  });
});

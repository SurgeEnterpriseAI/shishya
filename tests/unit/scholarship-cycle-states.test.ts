// The three states the step 2 review asked for (4 Oct 2026), in
// src/lib/scholarship-lists.ts, wherever a cycle's status prints:
//   (a) open now, no last date shown (ScholarshipCycle.openNow) — the page lead,
//       the list cell, the scheme FAQ answer (its FAQPage JSON-LD), a list's
//       lead and FAQ, and the ask tool's page facts; stale after
//       OPEN_NOW_FRESH_DAYS;
//   (b) rolling (ScholarshipCycle.rolling);
//   (c) the usual window lowercased where it sits mid-sentence.
// And the review fixes of 4 Oct 2026: a list's lead and FAQ no longer call a
// closed, no-date or stale open-now row a "usual window" row; a level window
// never carries the flags; the Telangana overseas companion row and ICAI's
// flyer fixes as they read after --apply.
// Synthetic rows for the rules, plus the step 2 evidence file's flagged rows
// as they will read after --apply (expectedRow), so this passes before and
// after the lead applies it. No DB, no network.
// Run: npx vitest run tests/unit/scholarship-cycle-states.test.ts

import path from "node:path";
import { describe, expect, it } from "vitest";
import { SCHOLARSHIPS, type Scholarship, type ScholarshipCycle } from "@/data/scholarships";
import {
  OPEN_NOW_FRESH_DAYS,
  addDays,
  cycleLeadLine,
  cycleStatusFacts,
  filterFaq,
  filterLeadLine,
  findScholarshipFilter,
  lastDateCell,
  lastDateOf,
  scholarshipFaq,
  sortForList,
  usualWindowInSentence,
} from "@/lib/scholarship-lists";
import { pageFacts } from "@/lib/search/ask-tools";
import { expectedRow, loadReads } from "../../scripts/apply-scholarship-cycle-reads-2026-10";
import { fixtureIndex } from "../fixtures/search-index-fixture";

const CHECKED = "2026-10-03";
const RELEASE = "2026-10-06";

function scheme(over: Partial<Scholarship> & { id: string }): Scholarship {
  return {
    name: over.id,
    awardingBody: "Body",
    type: "PRIVATE",
    state: null,
    levels: ["UG"],
    eligibility: {},
    amount: "₹1",
    applyUrl: "https://www.example.org/apply",
    description: "d",
    deadline: "After first-year admissions are complete (open for a limited period)",
    tags: [],
    ...over,
  };
}
const cyc = (over: Partial<ScholarshipCycle> = {}): ScholarshipCycle => ({ year: "2026-27", sourceUrl: "https://www.example.org/scholarship/", tier: "official", checkedOn: CHECKED, ...over });

describe("(a) open now, no last date shown", () => {
  const open = scheme({ id: "open", cycle: cyc({ openNow: true, note: "The tool stays open only for a limited period." }) });

  it("leads with 'Open now for 2026-27 — the official page gives no last date (host, checked day)', then the note", () => {
    expect(lastDateOf(open, RELEASE)).toMatchObject({ kind: "open-now", fresh: true });
    expect(cycleLeadLine(open, RELEASE)).toBe(
      "Open now for 2026-27 — the official page gives no last date (example.org, checked 3 Oct 2026). The tool stays open only for a limited period.",
    );
    expect(cycleLeadLine(open, RELEASE)).not.toMatch(/No 2026-27 date|not on the portal|usual window/i);
  });

  it("the list cell says open now (not 'Not on the portal yet'), with the tier and the note", () => {
    expect(lastDateCell(open, RELEASE)).toEqual({ text: "Open now, no last date given (checked 3 Oct 2026)", tier: "official", note: "The tool stays open only for a limited period." });
  });

  it("the scheme FAQ answer (also its FAQPage JSON-LD) carries the same line", () => {
    const a = scholarshipFaq(open, RELEASE).find((f) => f.q.startsWith("How do I apply"))!.a;
    expect(a).toContain("Open now for 2026-27 — the official page gives no last date (example.org, checked 3 Oct 2026).");
  });

  it(`is "open now" only up to ${OPEN_NOW_FRESH_DAYS} days after the check; later it says open when checked, and to confirm`, () => {
    const lastFresh = addDays(CHECKED, OPEN_NOW_FRESH_DAYS);
    expect(lastDateOf(open, lastFresh)).toMatchObject({ kind: "open-now", fresh: true });
    const stale = addDays(lastFresh, 1);
    expect(lastDateOf(open, stale)).toMatchObject({ kind: "open-now", fresh: false });
    expect(cycleLeadLine(open, stale)).toBe(
      "Open for 2026-27 when Shishya last checked — the official page gave no last date (example.org, checked 3 Oct 2026); confirm on the portal that it is still open. The tool stays open only for a limited period.",
    );
    expect(cycleLeadLine(open, stale)).not.toMatch(/^Open now/);
    expect(lastDateCell(open, stale).text).toBe("Open when checked on 3 Oct 2026, no last date given");
  });

  it("a last date always wins over the flag (never 'open now' beside a date)", () => {
    const dated = scheme({ id: "dated", cycle: cyc({ openNow: true, closesOn: "2026-10-30" }) });
    expect(lastDateOf(dated, RELEASE).kind).toBe("upcoming");
    expect(cycleLeadLine(dated, RELEASE)).toMatch(/^2026-27: applications close 30 Oct 2026 \(official/);
  });

  it("the plain no-date line is unchanged for a cycle without the flag", () => {
    const none = scheme({ id: "none", cycle: cyc() });
    expect(cycleLeadLine(none, RELEASE)).toBe("No 2026-27 date on the official portal yet (example.org, checked 3 Oct 2026) — the usual window is after first-year admissions are complete (open for a limited period).");
    expect(lastDateCell(none, RELEASE).text).toBe("Not on the portal yet (checked 3 Oct 2026)");
  });
});

describe("(b) rolling", () => {
  const roll = scheme({ id: "roll", cycle: cyc({ rolling: true, note: "Selected each quarter." }) });

  it("says applications are taken at any time, with no last date, its host and check day — and never goes 'stale'", () => {
    expect(lastDateOf(roll, RELEASE).kind).toBe("rolling");
    expect(cycleLeadLine(roll, RELEASE)).toBe("Applications are taken at any time (rolling) — the official page gives no last date (example.org, checked 3 Oct 2026). Selected each quarter.");
    expect(lastDateCell(roll, RELEASE)).toEqual({ text: "Rolling: apply any time, no last date (checked 3 Oct 2026)", tier: "official", note: "Selected each quarter." });
    expect(cycleLeadLine(roll, "2027-03-01")).toMatch(/^Applications are taken at any time \(rolling\)/);
    expect(scholarshipFaq(roll, RELEASE).find((f) => f.q.startsWith("How do I apply"))!.a).toContain("Applications are taken at any time (rolling)");
  });

  it("rolling wins over open-now if both were ever set (the evidence check refuses that)", () => {
    expect(lastDateOf(scheme({ id: "both", cycle: cyc({ rolling: true, openNow: true }) }), RELEASE).kind).toBe("rolling");
  });

  it("neither state is a dated row: not sorted with the dated rows, not counted as 'still ahead'", () => {
    const dated = scheme({ id: "a-dated", cycle: cyc({ closesOn: "2026-10-30" }) });
    expect(sortForList([roll, dated], RELEASE).map((s) => s.id)).toEqual(["a-dated", "roll"]);
  });
});

describe("(c) the usual window mid-sentence", () => {
  it("lowercases a plain first word, never a month or an acronym", () => {
    expect(usualWindowInSentence("After first-year admissions at government engineering colleges are complete (open for a limited period)")).toBe(
      "after first-year admissions at government engineering colleges are complete (open for a limited period)",
    );
    expect(usualWindowInSentence("Yearly cycle")).toBe("yearly cycle");
    expect(usualWindowInSentence("Any time of the year (ICAI selects applications each quarter)")).toBe("any time of the year (ICAI selects applications each quarter)");
    expect(usualWindowInSentence("Program-dependent")).toBe("program-dependent");
    expect(usualWindowInSentence("Usually Oct–Dec each year (check NSP)")).toBe("Oct–Dec each year (check NSP)");
    for (const keep of ["Aug–Oct", "Aug-Oct", "Jul–Sep (opening dates differ by course and city)", "July–Aug, post board results", "Mar-Jul each year", "May-Aug", "NSP opens in June", "CSIR NET twice yearly", "NET held twice yearly (Jun + Dec)", "Aug 1"])
      expect(usualWindowInSentence(keep), keep).toBe(keep);
  });

  it("the no-date and unchecked lead lines use it; the 'Usual window:' cell (after a colon) keeps the data's capital", () => {
    const siemensLike = scheme({ id: "s", cycle: cyc() });
    expect(cycleLeadLine(siemensLike, RELEASE)).toContain("— the usual window is after first-year admissions");
    const unchecked = scheme({ id: "u", deadline: "Yearly cycle" });
    expect(cycleLeadLine(unchecked, RELEASE)).toBe("Shishya has not checked a 2026-27 date for this scheme yet — the usual window is yearly cycle. Confirm the date on the official portal before applying.");
    expect(lastDateCell(unchecked, RELEASE).text).toBe("Usual window: Yearly cycle");
  });

  it("no catalogue row's usual window loses a month's or an acronym's capital", () => {
    for (const s of SCHOLARSHIPS) {
      const out = usualWindowInSentence(s.deadline);
      const first = out.split(/[\s,(—–:;]/)[0];
      if (/^[a-z]/.test(out)) expect(first, s.id).not.toMatch(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/);
      expect(out.toLowerCase(), s.id).toBe(s.deadline.replace(/^usually\s+/i, "").trim().toLowerCase());
    }
  });
});

describe("lists: only a list with open-now or rolling rows changes its words", () => {
  const f = findScholarshipFilter("sc-st-obc")!;
  const cat = (id: string, cycle?: ScholarshipCycle) => scheme({ id, type: "STATE", state: "TS", eligibility: { categories: ["SC", "ST"] }, ...(cycle ? { cycle } : {}) });
  const plain = [cat("p1"), cat("p2")];

  it("a list whose other rows all show their usual window reads exactly as before", () => {
    expect(filterLeadLine(f, plain, RELEASE)).toBe(
      "2 scholarships for SC, ST and OBC students on Shishya: 2 for students of one state. None has a 2026-27 last date still ahead that Shishya has read on an official portal yet; each row shows its usual window.",
    );
    expect(filterFaq(f, plain, RELEASE).a).toBe(
      "None of the 2 schemes listed here has a 2026-27 last date still ahead that Shishya has read on an official portal yet. Each row shows the scheme's usual window; confirm the date on the official link before applying.",
    );
  });

  it("4 Oct 2026 review fixes: a closed, no-date or stale open-now row is not called a usual-window row (its cell shows the status read)", () => {
    // A no-date row beside a usual-window row.
    const mixed = [cat("p1"), cat("nd", cyc())];
    expect(filterLeadLine(f, mixed, RELEASE)).toMatch(/; each row shows the 2026-27 status Shishya last read, or its usual window\.$/);
    expect(filterFaq(f, mixed, RELEASE).a).toBe(
      "None of the 2 schemes listed here has a 2026-27 last date still ahead that Shishya has read on an official portal yet. Each row shows the 2026-27 status Shishya last read, or the scheme's usual window; confirm the date on the official link before applying.",
    );
    // Only read statuses (closed, no date yet): no "usual window" at all.
    const readOnly = [cat("nd", cyc()), cat("shut", cyc({ closesOn: "2026-09-30" }))];
    expect(filterLeadLine(f, readOnly, RELEASE)).toMatch(/; each row shows the 2026-27 status Shishya last read\.$/);
    expect(filterFaq(f, readOnly, RELEASE).a).not.toMatch(/usual window/);
    // With a dated row: "the rest" are named for what their cells show.
    const dated = [cat("dated", cyc({ closesOn: "2026-10-15" })), cat("shut", cyc({ closesOn: "2026-09-30" })), cat("p1")];
    expect(filterLeadLine(f, dated, RELEASE)).toMatch(/read on the official portal; the rest show the 2026-27 status Shishya last read, or their usual window\.$/);
    expect(filterFaq(f, dated, RELEASE).a).toMatch(/ For the other 2, the table shows the 2026-27 status Shishya last read, or the usual window — confirm on the official link before applying\.$/);
    // An open-now read older than OPEN_NOW_FRESH_DAYS shows "Open when checked …" in its cell: a read status, not a usual window.
    const late = "2026-11-01";
    const staleOpen = [cat("open", cyc({ openNow: true })), cat("p1")];
    expect(lastDateCell(staleOpen[0], late).text).toBe("Open when checked on 3 Oct 2026, no last date given");
    expect(filterLeadLine(f, staleOpen, late)).toMatch(/; each row shows the 2026-27 status Shishya last read, or its usual window\.$/);
    expect(filterFaq(f, staleOpen, late).a).not.toContain("Open now");
  });

  it("names the open-now and rolling rows (with host and check day) and no longer calls them 'usual window' rows", () => {
    const list = [cat("dated", cyc({ closesOn: "2026-10-15" })), cat("open", cyc({ openNow: true })), cat("roll", cyc({ rolling: true })), cat("p1")];
    expect(filterLeadLine(f, list, RELEASE)).toBe(
      "4 scholarships for SC, ST and OBC students on Shishya: 4 for students of one state. 1 has a 2026-27 last date still ahead, read on the official portal; 1 is open now on the official page with no last date given, and 1 takes applications at any time; the rest show their usual window.",
    );
    const a = filterFaq(f, list, RELEASE).a;
    expect(a).toContain("1 of the 4 schemes listed here has a 2026-27 last date still ahead, read on the official portal: dated — 15 Oct 2026 (official, example.org).");
    expect(a).toContain(" Open now on the official page, with no last date given: open (example.org, checked 3 Oct 2026).");
    expect(a).toContain(" Taking applications at any time (rolling): roll (example.org, checked 3 Oct 2026).");
    expect(a).toMatch(/For the other 1, the table shows the usual window/);
    // No dated row: the open row is still named.
    const noDated = filterFaq(f, [cat("open", cyc({ openNow: true })), cat("p1")], RELEASE).a;
    expect(noDated).toBe(
      "None of the 2 schemes listed here has a 2026-27 last date still ahead that Shishya has read on an official portal yet. Open now on the official page, with no last date given: open (example.org, checked 3 Oct 2026). For the other 1, the table shows the usual window — confirm the date on the official link before applying.",
    );
    // A stale open-now row is not named as open now.
    expect(filterFaq(f, [cat("open", cyc({ openNow: true })), cat("p1")], "2026-11-01").a).not.toContain("Open now");
  });
});

describe("the ask tool's page facts and the step 2 data", () => {
  it("cycleStatusFacts names each state with the page's own line", () => {
    expect(cycleStatusFacts(scheme({ id: "o", cycle: cyc({ openNow: true }) }), RELEASE)).toMatchObject({ status: "open-now", lastDate: null, tier: "official", checkedOn: CHECKED, line: expect.stringMatching(/^Open now for 2026-27/) });
    expect(cycleStatusFacts(scheme({ id: "o", cycle: cyc({ openNow: true }) }), "2026-12-01")).toMatchObject({ status: "open-when-checked" });
    expect(cycleStatusFacts(scheme({ id: "r", cycle: cyc({ rolling: true }) }), RELEASE)).toMatchObject({ status: "rolling", lastDate: null });
    expect(cycleStatusFacts(scheme({ id: "d", cycle: cyc({ closesOn: "2026-10-30" }) }), RELEASE)).toMatchObject({ status: "last-date-ahead", lastDate: "2026-10-30" });
    expect(cycleStatusFacts(scheme({ id: "n", cycle: cyc() }), RELEASE)).toMatchObject({ status: "no-date-yet" });
    expect(cycleStatusFacts(scheme({ id: "u" }), RELEASE)).toMatchObject({ status: "not-checked", line: expect.stringMatching(/^Shishya has not checked/) });
  });

  it("page_facts carries thisYear on a scheme page, not on the NSP pages (per-state windows) or an unlisted row", { timeout: 120_000 }, () => {
    const idx = fixtureIndex();
    const siemens = pageFacts(idx, { url: "https://shishya.in/scholarships/siemens-india-scholarship" });
    const row = SCHOLARSHIPS.find((s) => s.id === "siemens-india-scholarship")!;
    expect(siemens.thisYear).toEqual(cycleStatusFacts(row, lastDateOfToday()));
    expect(pageFacts(idx, { url: "https://shishya.in/scholarships/nsp-post-matric" })).not.toHaveProperty("thisYear");
    const unlisted = SCHOLARSHIPS.find((s) => s.unlisted && !s.tags.includes("aggregator"))!;
    const u = pageFacts(idx, { url: `https://shishya.in/scholarships/${unlisted.id}` });
    if (u.kind === "scholarship") expect(u).not.toHaveProperty("thisYear");
  });

  it("after --apply, Siemens and ePASS lead with 'Open now', ICAI with rolling, LPF keeps the no-date line; context.md's dated block holds none of them", () => {
    const reads = loadReads(path.join(process.cwd(), "data/scholarships/cycle-reads-2026-10.json"));
    const after = (id: string) => expectedRow(SCHOLARSHIPS.find((s) => s.id === id)!, reads.schemes.find((s) => s.id === id)!);
    expect(cycleLeadLine(after("siemens-india-scholarship"), RELEASE)).toBe(
      "Open now for 2026-27 — the official page gives no last date (siemens.com, checked 3 Oct 2026). Siemens's FAQ says the online application tool stays open only for a certain period after first-year admissions at government engineering colleges are complete, so do not wait.",
    );
    // 4 Oct 2026 review fixes: the note names the home page's own link (the Source link is the home page).
    expect(cycleLeadLine(after("ts-epaas"), RELEASE)).toMatch(
      /^Open now for 2026-27 — the official page gives no last date \(telanganaepass\.cgg\.gov\.in, checked 3 Oct 2026\)\. On ePASS's home page, 'Post Matric Scholarship Services' opens a page with 2026-27 fresh registration links/,
    );
    expect(cycleLeadLine(after("ca-icai-scholarship"), RELEASE)).toMatch(/^Applications are taken at any time \(rolling\) — the official page gives no last date \(bosactivities\.icai\.org, checked 3 Oct 2026\)\. ICAI's scholarship flyer says/);
    expect(after("ca-icai-scholarship").deadline).toBe("Any time of the year (ICAI selects applications each quarter)");
    expect(cycleLeadLine(after("lila-poonawalla-girls"), RELEASE)).toMatch(/^No 2026-27 date on the official portal yet \(lilapoonawallafoundation\.com, checked 3 Oct 2026\) — the usual window is Jul–Sep/);
    // context.md lists only rows whose official last date is still ahead (lastDateOf kind "upcoming").
    for (const id of ["siemens-india-scholarship", "ts-epaas", "ca-icai-scholarship", "lila-poonawalla-girls"]) expect(lastDateOf(after(id), RELEASE).kind, id).not.toBe("upcoming");
    // The MYSY companion row shows the same official date as gujarat-mysy.
    expect(cycleLeadLine(after("gj-mysy-fees"), RELEASE)).toBe(cycleLeadLine(after("gujarat-mysy"), RELEASE));
    expect(after("gj-mysy-fees").applyUrl).toBe("https://mysy.gujarat.gov.in/");
    // 4 Oct 2026 review fixes: the Telangana overseas companion row reads like ts-overseas-bc — the
    // same official 15 Oct date, name, categories, note and amount, and an apply link on ePASS.
    const ov = after("ts-overseas-bc");
    const cm = after("ts-cm-overseas");
    expect(cycleLeadLine(cm, RELEASE)).toBe(cycleLeadLine(ov, RELEASE));
    expect(cycleLeadLine(cm, RELEASE)).toMatch(/^2026-27: applications close 15 Oct 2026 \(official — telanganaepass\.cgg\.gov\.in, checked 3 Oct 2026\)\./);
    expect([cm.name, cm.eligibility.categories, cm.eligibility.note, cm.amount, cm.applyUrl]).toEqual([ov.name, ov.eligibility.categories, ov.eligibility.note, ov.amount, ov.applyUrl]);
    expect(cm.name).toBe("Mahatma Jyothiba Phule Overseas Vidya Nidhi (Telangana BC and EBC overseas scholarship)");
    // ICAI after the flyer fixes: the rolling line, the ₹5 lakh note and the full amount range; still no income gate.
    const icai = after("ca-icai-scholarship");
    expect(icai.amount).toMatch(/^₹1,500-₹5,000 a month by level/);
    expect(icai.eligibility.incomeMaxLakhs).toBeUndefined();
    expect(scholarshipFaq(icai, RELEASE).find((f) => f.q.startsWith("Who is eligible"))!.a).toMatch(/no more than ₹5 lakh a year/);
  });

  it("a level window never carries the main cycle's open-now or rolling flag, and no catalogue row (before or after --apply) has both", () => {
    const withWindow = scheme({
      id: "lw",
      levels: ["CLASS_11_12", "UG"],
      cycle: cyc({ openNow: true, levelWindows: [{ levels: ["CLASS_11_12"], opensOn: "2026-08-01", closesOn: "2026-09-21" }] }),
    });
    expect(lastDateOf(withWindow, RELEASE).kind).toBe("open-now");
    expect(lastDateOf(withWindow, RELEASE, "CLASS_11_12").kind).toBe("passed");
    const reads = loadReads(path.join(process.cwd(), "data/scholarships/cycle-reads-2026-10.json"));
    const rows = [...SCHOLARSHIPS, ...reads.schemes.filter((s) => s.cycle).map((s) => expectedRow(SCHOLARSHIPS.find((x) => x.id === s.id)!, s))];
    for (const s of rows) {
      const c = s.cycle;
      if (c?.levelWindows?.length) expect(!!(c.openNow || c.rolling), s.id).toBe(false);
    }
  });
});

function lastDateOfToday(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

// Scholarship cycle reads of 3 Oct 2026 (non-exam-value spec, step 2):
// data/scholarships/cycle-reads-2026-10.json and the script that writes its
// cycles and row fixes into src/data/scholarships.ts
// (scripts/apply-scholarship-cycle-reads-2026-10.ts, dry run by default).
// Passes before and after the lead runs --apply: the plan must apply cleanly
// to the current file, or already be applied. No DB, no network.
// Run: npx vitest run tests/unit/scholarship-cycle-reads.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SCHOLARSHIPS, type Scholarship } from "@/data/scholarships";
import { OFFERED_SCHEMES } from "@/lib/scholarship-schemes";
import { istToday } from "@/lib/scholarship-lists";
import {
  AGGREGATOR_HOST,
  DATA_FILE,
  MAX_READ_AGE_DAYS,
  applyFix,
  checkReads,
  datedAhead,
  editRow,
  expectedRow,
  fieldSpan,
  loadReads,
  planEdits,
  planUndo,
  readAgeDays,
  renderCycle,
  rowSpan,
  selectFixes,
  sourceQuote,
  topLevelProp,
  undoArg,
  verifyCatalogue,
  writableReads,
  type CycleReads,
  type RowFix,
  type SchemeRead,
} from "../../scripts/apply-scholarship-cycle-reads-2026-10";

const reads = loadReads(path.join(process.cwd(), "data/scholarships/cycle-reads-2026-10.json"));
const text = fs.readFileSync(path.join(process.cwd(), DATA_FILE), "utf8");
const today = istToday();
const host = (u: string) => new URL(u).hostname.replace(/^www\./, "");
const byId = (id: string) => reads.schemes.find((s) => s.id === id)!;
const row = (id: string) => SCHOLARSHIPS.find((x) => x.id === id)!;
/** A catalogue field by its fix path ("eligibility.note"); null when the row has none (as a fix's `from`/`to` say it). */
const fieldOf = (s: Scholarship, field: RowFix["field"]): unknown => {
  const [head, sub] = field.split(".");
  const v = (s as unknown as Record<string, unknown>)[head];
  return (sub ? (v as Record<string, unknown> | undefined)?.[sub] : v) ?? null;
};

const applied = writableReads(reads).every(
  (s) => JSON.stringify(row(s.id)?.cycle) === JSON.stringify(s.cycle) && (s.rowFixes ?? []).every((f) => JSON.stringify(fieldOf(row(s.id), f.field)) === JSON.stringify(f.to)),
);

describe("the evidence file", () => {
  it("covers the 30 most-landed offered schemes once each, ranked 1..30 (plus companion rows of the same schemes, ranked after them)", () => {
    const ranked = reads.schemes.filter((s) => s.companionOf === undefined);
    expect(ranked.map((s) => s.rank).sort((a, b) => a - b)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    const offered = new Set(OFFERED_SCHEMES.map((s) => s.id));
    for (const s of reads.schemes) expect(offered.has(s.id), s.id).toBe(true);
    expect(new Set(reads.schemes.map((s) => s.id)).size).toBe(reads.schemes.length);
    for (let i = 1; i < reads.schemes.length; i++) expect(reads.schemes[i - 1].landings90 >= reads.schemes[i].landings90, reads.schemes[i].id).toBe(true);
    // 4 Oct 2026: two companions — gj-mysy-fees, the second catalogue row for
    // MYSY, and ts-cm-overseas, the second row for Telangana's BC overseas scheme.
    const companions = reads.schemes.filter((s) => s.companionOf !== undefined);
    expect(companions.map((s) => [s.id, s.companionOf, s.rank])).toEqual([
      ["gj-mysy-fees", "gujarat-mysy", 31],
      ["ts-cm-overseas", "ts-overseas-bc", 32],
    ]);
  });

  it("passes the script's own checks: official tier, 2026-27, a read of the source page, a quoted line for every date, sourced row fixes", () => {
    expect(checkReads(reads, today)).toEqual([]);
  });

  it("every cycle it writes: not an aggregator host, checked on a day its source page was read (on or after readOn, on or before today), closes on or after it opens", () => {
    for (const s of writableReads(reads)) {
      const c = s.cycle!;
      expect(AGGREGATOR_HOST.test(host(c.sourceUrl)), s.id).toBe(false);
      expect(c.checkedOn <= today, s.id).toBe(true);
      // 4 Oct 2026 (review fixes): not "checkedOn === readOn", which invited
      // moving every checkedOn on a slipped release day. A check day is a day
      // with a logged, successful read of that cycle's own source page.
      expect(c.checkedOn >= reads.readOn, s.id).toBe(true);
      expect(s.reads.some((r) => r.readAt.startsWith(c.checkedOn) && r.url.startsWith(c.sourceUrl) && /^200/.test(r.result)), s.id).toBe(true);
      if (c.opensOn && c.closesOn) expect(c.opensOn <= c.closesOn, s.id).toBe(true);
      expect(c.tier).toBe("official");
    }
  });

  it("checkReads refuses a checkedOn with no read of the source page that day, or one before readOn (a slipped release cannot move check days)", () => {
    const ka = byId("ka-vidyasiri");
    const one = (cycle: Partial<NonNullable<SchemeRead["cycle"]>>, readOn = reads.readOn): CycleReads => ({ ...reads, readOn, schemes: [{ ...ka, cycle: { ...ka.cycle!, ...cycle } }] });
    expect(checkReads(one({}), "2026-10-08")).toEqual([]);
    // Moving the check day to 7 Oct without a read of BCWD's page on 7 Oct is refused…
    expect(checkReads(one({ checkedOn: "2026-10-07" }), "2026-10-08").join(" ")).toMatch(/ka-vidyasiri: no successful read of the cycle's source page on its checkedOn day \(2026-10-07\)/);
    // …and so is moving readOn past a check day that stayed.
    expect(checkReads(one({}, "2026-10-07"), "2026-10-08").join(" ")).toMatch(/ka-vidyasiri: checkedOn 2026-10-03 is before the evidence file's readOn 2026-10-07/);
    // A logged read of the page on the new day makes the new check day true.
    const reread: CycleReads = {
      ...reads,
      schemes: [{ ...ka, cycle: { ...ka.cycle!, checkedOn: "2026-10-07" }, reads: [...ka.reads, { url: ka.cycle!.sourceUrl, result: "200", readAt: "2026-10-07T09:00:00+05:30", quote: "Last date to apply: 31.10.2026" }] }],
    };
    expect(checkReads(reread, "2026-10-08")).toEqual([]);
  });

  it("an aggregator's date is never written: HDFC's ECSS date (a Buddy4Study-run site) stays out", () => {
    const hdfc = byId("hdfc-badhte-kadam");
    expect(hdfc.decision).toBe("no-change");
    expect(hdfc.cycle).toBeUndefined();
    expect(hdfc.reads.some((r) => /parivartanecss\.com/.test(r.url) && /aggregator/.test(r.result))).toBe(true);
  });

  it("no row is marked reviewed by this wave, and nothing is written for nsp-post-matric (step 1's per-state windows)", () => {
    for (const s of reads.schemes) expect(s.reviewed, s.id).toBe(false);
    expect(byId("nsp-post-matric").decision).toBe("no-change");
  });
});

describe("review fixes (3 Oct 2026): visible text only", () => {
  it("a quote is visible text; text found only in an HTML comment or a hidden pop-up is kept apart in `hidden`", () => {
    for (const s of reads.schemes)
      for (const r of s.reads) {
        if (r.quote) expect(r.quote, `${s.id} ${r.url}`).not.toMatch(/HTML comment|not shown|pop-up/i);
        if (r.hidden) expect(r.hidden, `${s.id} ${r.url}`).toMatch(/^\((inside an HTML comment|a pop-up)[^)]*not shown\)/);
      }
    // The five first-read quotes that were hidden text, plus ePASS's commented-out dates.
    const hiddenOn = (id: string, url: RegExp) => byId(id).reads.some((r) => url.test(r.url) && r.hidden);
    expect(hiddenOn("hdfc-badhte-kadam", /v\.hdfc\.bank\.in\/csr/)).toBe(true);
    expect(hiddenOn("assam-anundoram", /bidyarthi\.co\.in/)).toBe(true);
    expect(hiddenOn("lila-poonawalla-girls", /lilapoonawallafoundation\.com\/$/)).toBe(true);
    expect(hiddenOn("jsw-foundation", /jsw\.in\/foundation/)).toBe(true);
    expect(hiddenOn("sitaram-jindal", /sitaramjindalfoundation\.org/)).toBe(true);
    expect(hiddenOn("ts-epaas", /telanganaepass\.cgg\.gov\.in\/$/)).toBe(true);
  });

  it("Lila Poonawalla: no-date cycle from the visible 2026-27 application link; nothing from the hidden 2025-26 notices or 2026 schedule", () => {
    const lpf = byId("lila-poonawalla-girls");
    expect(lpf.cycle!.closesOn).toBeUndefined();
    expect(lpf.cycle!.opensOn).toBeUndefined();
    expect(lpf.cycle!.note).toContain("Scholarships 2026-27");
    expect(lpf.cycle!.note).not.toMatch(/2025|Aug|Sep/);
    expect(lpf.reads.some((r) => r.quote?.includes("Scholarships 2026-27") && /LPFOnlineAPP/.test(r.quote))).toBe(true);
    // The old usual window "Mar-Jul" is replaced.
    expect(lpf.rowFixes!.find((f) => f.field === "deadline")!.from).toBe("Mar-Jul each year");
  });

  it("Sitaram Jindal: the marks mismatch that rested on a commented-out table is withdrawn", () => {
    const sjf = byId("sitaram-jindal");
    expect(sjf.mismatches.join(" ")).not.toMatch(/Boys|Girls 6|matches the page's range/);
    expect(sjf.mismatches.join(" ")).toContain("withdrawn");
  });

  it("notes carry the official page's own qualifiers: MYSY's two exceptions, ePASS's open 2026-27 registration, CSSS's two NSP statements", () => {
    const mysy = byId("gujarat-mysy").cycle!.note!;
    expect(mysy).toMatch(/medical and AYUSH/);
    expect(mysy).toMatch(/CBSE-board and NIOS-board/);
    // Second review: the open schemes say so first — since 4 Oct 2026 through
    // the cycle's openNow flag (the date line), so the notes no longer repeat
    // it; ePASS's renewal link names who it covers.
    const epass = byId("ts-epaas").cycle!.note!;
    expect(byId("ts-epaas").cycle!.openNow).toBe(true);
    expect(epass).not.toMatch(/is open|no last date/);
    expect(epass).toMatch(/2026-27 fresh registration links/);
    expect(epass).toMatch(/ST, BC, EBC, DW and minority students \(SC is not named on it\)/);
    expect(byId("ts-epaas").reads.some((r) => /epassonlinelinks\.do/.test(r.url) && /^200/.test(r.result) && r.quote?.includes("2026-27"))).toBe(true);
    expect(byId("siemens-india-scholarship").cycle!.openNow).toBe(true);
    expect(byId("siemens-india-scholarship").cycle!.note).toMatch(/^Siemens's FAQ says the online application tool stays open only for a certain period/);
  });

  it("4 Oct 2026 review states: openNow only where the official page says applications are open, rolling only where it says any time", () => {
    const flagged = (k: "openNow" | "rolling") => reads.schemes.filter((s) => s.cycle?.[k]).map((s) => s.id).sort();
    expect(flagged("openNow")).toEqual(["siemens-india-scholarship", "ts-epaas"]);
    expect(flagged("rolling")).toEqual(["ca-icai-scholarship"]);
    // Not Lila Poonawalla (no page says open), not Sitaram Jindal (no page says rolling).
    expect(byId("lila-poonawalla-girls").cycle!.openNow).toBeUndefined();
    expect(byId("sitaram-jindal").decision).toBe("no-change");
    expect(byId("sitaram-jindal").reads.some((r) => /app\.sitaramjindalfoundation\.org/.test(r.url) && /^200/.test(r.result))).toBe(true);
    // Each rests on a visible quote that says so, re-read on 4 Oct before the flag was set.
    const said: Record<string, RegExp> = {
      "siemens-india-scholarship": /2026-27 are now open/,
      "ts-epaas": /Fresh Registration\(2026-27\).*Fresh Complete Registrations for All Departments/,
      "ca-icai-scholarship": /apply online anytime/,
    };
    for (const [id, re] of Object.entries(said)) {
      const s = byId(id);
      expect(s.cycle!.closesOn, id).toBeUndefined();
      expect(s.cycle!.opensOn, id).toBeUndefined();
      expect(s.reads.some((r) => r.readAt.startsWith("2026-10-04") && /^200/.test(r.result) && re.test(r.quote ?? "") && r.url.startsWith(s.cycle!.sourceUrl)), id).toBe(true);
    }
    // ICAI's FAQ (updated 15 May 2026) shows the rule is current: every quarter takes applications.
    expect(byId("ca-icai-scholarship").reads.some((r) => r.quote?.includes("Last Updated on: 15th May 2026") && r.quote.includes("1st October to 31st December"))).toBe(true);
    expect(byId("ca-icai-scholarship").rowFixes!.map((f) => f.field)).toEqual(["deadline", "eligibility.note", "amount"]);
    expect(byId("ca-icai-scholarship").rowFixes!.find((f) => f.field === "deadline")!.from).toBe("Yearly cycle");
  });

  it("4 Oct 2026 review fixes: ICAI's amount and eligibility note follow its flyer (₹5 lakh parents' income for the needs-based awards, none for the merit award, ₹1,500-₹5,000 a month); no income gate is added", () => {
    const icai = byId("ca-icai-scholarship");
    const fix = (field: RowFix["field"]) => icai.rowFixes!.find((f) => f.field === field)!;
    expect(fix("eligibility.note").from).toMatch(/income cap ₹3L/);
    const note = String(fix("eligibility.note").to);
    expect(note).toMatch(/no more than ₹5 lakh a year/);
    expect(note).toMatch(/merit award, for Intermediate rank holders 1 to 10 .* lists no income condition/);
    expect(note).toMatch(/revised scheme will be published on its Self-Service Portal shortly/);
    expect(note).not.toMatch(/₹3/);
    const amount = String(fix("amount").to);
    expect(amount).toMatch(/^₹1,500-₹5,000 a month by level: Foundation ₹1,500 \(4 months\); Intermediate ₹2,500 \(8 months, up to 14\)/);
    for (const t of ["₹4,000 for Intermediate ranks 11-50", "₹5,000 merit award for ranks 1-10", "(up to 24 months)"]) expect(amount).toContain(t);
    // No hard income gate: the row has none, and the merit award has no income condition.
    expect(icai.rowFixes!.some((f) => f.field === "eligibility.incomeMaxLakhs")).toBe(false);
    expect(row("ca-icai-scholarship").eligibility.incomeMaxLakhs).toBeUndefined();
    // Every figure is on a quoted line of the flyer (read on 4 Oct, byte-identical to 3 Oct).
    const q = icai.reads.filter((r) => r.url === icai.cycle!.sourceUrl).map((r) => r.quote ?? "").join(" ");
    for (const t of ["Award Amount Rs. 5000 per month", "Amount Rs. 4000 per month", "from 11 to 50 Rank", "Rs. 5,00,000 per annum", "Amount Rs. 2500 per month", "Amount Rs. 1500 per month", "8 months commencing", "Additional 3 months", "revised scheme on the Self-Service Portal will be published shortly"])
      expect(q, t).toContain(t);
    expect(fix("amount").sourceUrl).toBe(icai.cycle!.sourceUrl);
    expect(fix("eligibility.note").sourceUrl).toBe(icai.cycle!.sourceUrl);
  });

  it("checkReads refuses an open-now or rolling flag with a last date, both together, a value other than true, or no quote on the source page", () => {
    const base = byId("siemens-india-scholarship");
    const one = (cycle: Record<string, unknown>, rs = base.reads): CycleReads => ({ ...reads, schemes: [{ ...base, rowFixes: [], reads: rs, cycle: { ...base.cycle!, ...cycle } as SchemeRead["cycle"] }] });
    expect(checkReads(one({}), today)).toEqual([]);
    expect(checkReads(one({ closesOn: "2026-10-30" }), today).join(" ")).toMatch(/openNow with a last date/);
    expect(checkReads(one({ rolling: true }), today).join(" ")).toMatch(/openNow and rolling together/);
    expect(checkReads(one({ openNow: "yes" }), today).join(" ")).toMatch(/openNow must be true or absent/);
    expect(checkReads(one({}, base.reads.map((r) => ({ ...r, quote: undefined }))), today).join(" ")).toMatch(/openNow with no quoted line on its source page/);
  });

  it("a companion row carries its ranked entry's cycle exactly (gj-mysy-fees → gujarat-mysy), and checkReads refuses one that differs", () => {
    const c = byId("gj-mysy-fees");
    expect(c.decision).toBe("set-cycle");
    expect(c.cycle).toEqual(byId("gujarat-mysy").cycle);
    expect(c.rowFixes).toEqual([expect.objectContaining({ field: "applyUrl", from: "https://mysy.guj.nic.in/", to: "https://mysy.gujarat.gov.in/" })]);
    expect(c.landings90).toBe(0);
    const bad: CycleReads = { ...reads, schemes: reads.schemes.map((s) => (s.id === "gj-mysy-fees" ? { ...s, cycle: { ...s.cycle!, closesOn: "2026-10-31" } } : s)) };
    expect(checkReads(bad, today).join(" ")).toMatch(/gj-mysy-fees: cycle differs from its companion gujarat-mysy/);
    const orphan: CycleReads = { ...reads, schemes: reads.schemes.map((s) => (s.id === "gj-mysy-fees" ? { ...s, companionOf: "no-such-row" } : s)) };
    expect(checkReads(orphan, today).join(" ")).toMatch(/companionOf no-such-row is not a ranked entry/);
  });

  it("4 Oct 2026 review fixes: ts-cm-overseas (the second row for Telangana's BC overseas scheme) gets ts-overseas-bc's cycle, name, categories, note and amount, and an apply link to ePASS", () => {
    const c = byId("ts-cm-overseas");
    const main = byId("ts-overseas-bc");
    expect(c.decision).toBe("set-cycle");
    expect(c.cycle).toEqual(main.cycle);
    expect(c.landings90).toBe(0);
    // The same 3 Oct read of OverseasLinks.do the main row rests on.
    expect(c.reads).toContainEqual(main.reads.find((r) => r.url === main.cycle!.sourceUrl));
    const fix = (s: SchemeRead, field: RowFix["field"]) => s.rowFixes!.find((f) => f.field === field);
    for (const field of ["name", "eligibility.categories", "eligibility.note"] as const) expect(fix(c, field)!.to, field).toEqual(fix(main, field)!.to);
    expect(fix(c, "name")!.from).toBe("Telangana CM Overseas Scholarship (BC)");
    expect(fix(c, "eligibility.note")!.from).toMatch(/Below 35 years/);
    // The dead BC Welfare host goes to ePASS, the portal that runs the registration, as on the main row.
    expect([fix(c, "applyUrl")!.from, fix(c, "applyUrl")!.to]).toEqual(["https://www.bcwelfare.telangana.gov.in/", "https://telanganaepass.cgg.gov.in/"]);
    expect(fix(c, "applyUrl")!.to).toBe(row("ts-overseas-bc").applyUrl);
    expect(c.reads.some((r) => /bcwelfare\.telangana\.gov\.in/.test(r.url) && /does not resolve/.test(r.result))).toBe(true);
    // The amount drops the 'one-time' that is not on the page and matches the main row's text.
    expect([fix(c, "amount")!.from, fix(c, "amount")!.to]).toEqual(["Up to ₹20 lakh (one-time)", row("ts-overseas-bc").amount]);
  });

  it("CSSS (second review): the last date is NSP's home-page 31 Oct, the card's 30 Sep stays in the note, and the date line quotes the home page", () => {
    const s = byId("csss");
    const csss = s.cycle!;
    expect(csss.closesOn).toBe("2026-10-31");
    expect(csss.opensOn).toBe("2026-06-01");
    expect(csss.sourceUrl).toBe("https://scholarships.gov.in/");
    expect(csss.note).toMatch(/^Renewal applications only — .*31 Oct 2026.*"Student Application Closed on: 30-09-2026", so renew as early as you can\.$/);
    // The quoted line printed for the date is the home page's (not the scheme card, whose URL shares the prefix).
    const q = sourceQuote(s)!;
    expect(q.url).toBe("https://scholarships.gov.in/");
    expect(q.quote).toContain("Closing dates for student application is 31-10-2026");
    expect(q.quote).toContain("from 1'st June 2026");
    // Both statements stay on record as read.
    expect(s.reads.some((r) => r.url === "https://scholarships.gov.in/All-Scholarships" && r.quote?.includes("Student Application Closed on : 30-09-2026"))).toBe(true);
  });
});

describe("row fixes", () => {
  it("only the fixable fields, on rows whose cycle this run writes, read on the awarding body's own page", () => {
    const fixed = reads.schemes.filter((s) => s.rowFixes?.length);
    expect(fixed.map((s) => s.id).sort()).toEqual(["ca-icai-scholarship", "gj-mysy-fees", "gujarat-mysy", "lila-poonawalla-girls", "siemens-india-scholarship", "ts-cm-overseas", "ts-overseas-bc"]);
    for (const s of fixed) {
      expect(s.decision, s.id).not.toBe("no-change");
      for (const f of s.rowFixes!) {
        expect(AGGREGATOR_HOST.test(host(f.sourceUrl)), `${s.id} ${f.field}`).toBe(false);
        // Before --apply the row still holds `from`; after, it holds `to`.
        expect(JSON.stringify(fieldOf(row(s.id), f.field)), `${s.id} ${f.field}`).toBe(JSON.stringify(applied ? f.to : f.from));
      }
    }
    // The dead apply links go to the bodies' own portals.
    expect(byId("gujarat-mysy").rowFixes!.find((f) => f.field === "applyUrl")!.to).toBe("https://mysy.gujarat.gov.in/");
    expect(byId("siemens-india-scholarship").rowFixes!.find((f) => f.field === "applyUrl")!.to).toBe("https://www.ssp-india.co.in/scholarship/apply");
    // The renamed row keeps its URL and stays a reserved-category (SC/ST/OBC list) row;
    // its name keeps the words people search for (second review).
    const ts = byId("ts-overseas-bc").rowFixes!;
    expect(ts.find((f) => f.field === "name")!.to).toMatch(/^Mahatma Jyothiba Phule Overseas Vidya Nidhi \(Telangana BC and EBC overseas scholarship\)$/);
    expect(ts.find((f) => f.field === "eligibility.categories")!.to).toEqual(["OBC", "EWS"]);
  });

  it("second review: Siemens's and LPF's eligibility follow their own pages (Siemens ₹2 lakh, 50% HSC, its conditions; LPF no invented income gate, its cities)", () => {
    const fix = (id: string, field: RowFix["field"]) => byId(id).rowFixes!.find((f) => f.field === field)!;
    expect([fix("siemens-india-scholarship", "eligibility.incomeMaxLakhs").from, fix("siemens-india-scholarship", "eligibility.incomeMaxLakhs").to]).toEqual([3, 2]);
    expect([fix("siemens-india-scholarship", "eligibility.minMarksPct").from, fix("siemens-india-scholarship", "eligibility.minMarksPct").to]).toEqual([75, 50]);
    const sNote = fix("siemens-india-scholarship", "eligibility.note");
    expect(sNote.from).toBeNull(); // the row had no note; the fix adds one
    expect(sNote.to).toMatch(/government engineering college \(not an IIT\)/);
    expect(sNote.to).toMatch(/aged up to 20/);
    expect(sNote.to).toMatch(/60% in SSC.*50% overall with 60% in PCM/);
    expect(fix("siemens-india-scholarship", "amount").to).not.toMatch(/₹/);
    // Every Siemens fact is on a quoted line of the same page (FAQ accordion or visible highlights).
    const sQuotes = byId("siemens-india-scholarship").reads.map((r) => r.quote ?? "").join(" ");
    for (const t of ["Not more than Rs. 2 lakhs", "Minimum 50% aggregate and minimum 60% PCM aggregate", "Up to 20 years", "excluding IIT", "reimbursement of tuition fees"]) expect(sQuotes).toContain(t);
    const lIncome = fix("lila-poonawalla-girls", "eligibility.incomeMaxLakhs");
    expect([lIncome.from, lIncome.to]).toEqual([6, null]); // removed: the page names <₹3.5 lakh "or lower-middle class homes"
    const lNote = String(fix("lila-poonawalla-girls", "eligibility.note").to);
    expect(lNote).not.toMatch(/national/i);
    for (const city of ["Pune", "Wardha", "Amravati", "Nagpur", "Hyderabad", "Bengaluru"]) expect(lNote).toContain(city);
    expect(lNote).toMatch(/under ₹3\.5 lakh a year\) or lower-middle-class homes/);
    expect(byId("lila-poonawalla-girls").reads.some((r) => r.quote?.includes("or lower-middle class homes"))).toBe(true);
  });

  it("a fix needs the row to still hold `from`, and writes the catalogue's own literal style", () => {
    const one = `{ id: "x", name: "Old", eligibility: { categories: ["OBC"], note: "a \\"b\\"" }, applyUrl: "https://a.gov.in/", tags: ["name: not a key"] }`;
    const f = (field: RowFix["field"], from: RowFix["from"], to: RowFix["to"]): RowFix => ({ field, from, to, sourceUrl: "https://a.gov.in/", why: "x" });
    let out = applyFix(one, "x", f("name", "Old", "New"));
    out = applyFix(out, "x", f("eligibility.categories", ["OBC"], ["OBC", "EWS"]));
    out = applyFix(out, "x", f("eligibility.note", 'a "b"', "c"));
    expect(out).toBe(`{ id: "x", name: "New", eligibility: { categories: ["OBC", "EWS"], note: "c" }, applyUrl: "https://a.gov.in/", tags: ["name: not a key"] }`);
    expect(() => applyFix(one, "x", f("applyUrl", "https://b.gov.in/", "https://c.gov.in/"))).toThrow(/not the expected/);
    expect(() => applyFix(one, "x", f("deadline", "a", "b"))).toThrow(/not found/);
    expect(fieldSpan(one, "eligibility.note")).not.toBeNull();
  });

  it("numbers are changed in place; an eligibility sub-field can be added (from null) or removed (to null), in the row's own layout", () => {
    const f = (field: RowFix["field"], from: RowFix["from"], to: RowFix["to"]): RowFix => ({ field, from, to, sourceUrl: "https://a.gov.in/", why: "x" });
    // One-line row (Siemens's layout).
    const one = `{ id: "x", eligibility: { incomeMaxLakhs: 3, minMarksPct: 75 }, amount: "₹1", tags: [] }`;
    let out = applyFix(one, "x", f("eligibility.incomeMaxLakhs", 3, 2));
    out = applyFix(out, "x", f("eligibility.minMarksPct", 75, 50));
    out = applyFix(out, "x", f("eligibility.note", null, "n"));
    out = applyFix(out, "x", f("amount", "₹1", "Tuition"));
    expect(out).toBe(`{ id: "x", eligibility: { incomeMaxLakhs: 2, minMarksPct: 50, note: "n" }, amount: "Tuition", tags: [] }`);
    expect(applyFix(out, "x", f("eligibility.minMarksPct", 50, null))).toBe(`{ id: "x", eligibility: { incomeMaxLakhs: 2, note: "n" }, amount: "Tuition", tags: [] }`);
    expect(applyFix(out, "x", f("eligibility.note", "n", null))).toBe(`{ id: "x", eligibility: { incomeMaxLakhs: 2, minMarksPct: 50 }, amount: "Tuition", tags: [] }`);
    expect(applyFix(`{ id: "x", eligibility: {}, tags: [] }`, "x", f("eligibility.note", null, "n"))).toBe(`{ id: "x", eligibility: { note: "n" }, tags: [] }`);
    // Multi-line row (LPF's layout): a removed property takes its whole line; an added one gets its own.
    const multi = `{\n    id: "x",\n    eligibility: {\n      gender: "F",\n      incomeMaxLakhs: 6,\n      note: "old",\n    },\n    tags: [],\n  }`;
    expect(applyFix(multi, "x", f("eligibility.incomeMaxLakhs", 6, null))).toBe(`{\n    id: "x",\n    eligibility: {\n      gender: "F",\n      note: "old",\n    },\n    tags: [],\n  }`);
    expect(applyFix(multi, "x", f("eligibility.minMarksPct", null, 60))).toBe(`{\n    id: "x",\n    eligibility: {\n      gender: "F",\n      incomeMaxLakhs: 6,\n      note: "old",\n      minMarksPct: 60,\n    },\n    tags: [],\n  }`);
    expect(applyFix(multi, "x", f("eligibility.incomeMaxLakhs", 6, 3.5))).toContain(`      incomeMaxLakhs: 3.5,\n`);
    // Refused: a value that is not the expected one, adding what is there, removing a top-level field.
    expect(() => applyFix(multi, "x", f("eligibility.incomeMaxLakhs", 5, 2))).toThrow(/not the expected/);
    expect(() => applyFix(multi, "x", f("eligibility.note", null, "n"))).toThrow(/not the expected null/);
    expect(() => applyFix(multi, "x", f("eligibility.minMarksPct", 60, 50))).toThrow(/not found/);
    expect(() => applyFix(one, "x", f("amount", "₹1", null))).toThrow(/cannot be added or removed/);
  });

  it("checkReads refuses a fix value of the wrong kind, and a null outside eligibility", () => {
    const base = byId("siemens-india-scholarship");
    const withFix = (fx: RowFix): CycleReads => ({ ...reads, schemes: [{ ...base, rowFixes: [fx] }] });
    const src = base.cycle!.sourceUrl;
    expect(checkReads(withFix({ field: "eligibility.incomeMaxLakhs", from: 3, to: "2", sourceUrl: src, why: "x" }), today).join(" ")).toMatch(/is not a number/);
    expect(checkReads(withFix({ field: "amount", from: "a", to: null, sourceUrl: src, why: "x" }), today).join(" ")).toMatch(/is not a string/);
    expect(checkReads(withFix({ field: "eligibility.minMarksPct", from: 75, to: 500, sourceUrl: src, why: "x" }), today).join(" ")).toMatch(/out of range/);
    expect(checkReads(withFix({ field: "eligibility.note", from: null, to: "n", sourceUrl: src, why: "x" }), today)).toEqual([]);
  });

  it("editRow sets the cycle and makes the fixes; the comment names the fixed fields", () => {
    const s: SchemeRead = {
      rank: 1, id: "x", landings90: 1, decision: "set-cycle", why: "", reads: [], reviewed: false, eligibilityAmount: "", mismatches: [],
      cycle: { year: "2026-27", sourceUrl: "https://example.gov.in/", tier: "official", checkedOn: "2026-10-03" },
      rowFixes: [{ field: "deadline", from: "Apr-Jul", to: "Aug-Sep", sourceUrl: "https://example.gov.in/", why: "x" }],
    };
    const out = editRow(`{\n    id: "x",\n    deadline: "Apr-Jul",\n    tags: ["a"],\n  }`, s);
    expect(out).toContain(`deadline: "Aug-Sep",`);
    expect(out.replace(/\n\s*\/\/ /g, " ")).toMatch(/Also corrected from the same reads: deadline\./);
    expect(topLevelProp(out, "cycle")).not.toBeNull();
    // A commentNote (which older comment the read supersedes) ends the comment.
    const noted = editRow(`{\n    id: "x",\n    deadline: "Apr-Jul",\n    tags: ["a"],\n  }`, { ...s, commentNote: "31.10.2026 supersedes the 30/09/2026 above." });
    expect(noted.replace(/\n\s*\/\/ /g, " ")).toMatch(/deadline\. 31\.10\.2026 supersedes the 30\/09\/2026 above\.\n/);
    // The refreshed rows whose old comments cite an older date say so.
    for (const id of ["ka-vidyasiri", "csss", "ts-epaas"]) expect(byId(id).commentNote, id).toMatch(/supersedes/i);
  });

  it("--cycles-only drops every fix, --skip-fix drops one, an unknown key is refused", () => {
    const none = selectFixes(reads, { cyclesOnly: true });
    expect(none.schemes.every((s) => (s.rowFixes ?? []).length === 0)).toBe(true);
    const noRename = selectFixes(reads, { skip: ["ts-overseas-bc:name"] });
    const ts = noRename.schemes.find((s) => s.id === "ts-overseas-bc")!.rowFixes!;
    expect(ts.map((f) => f.field)).toEqual(["eligibility.categories", "eligibility.note"]);
    expect(() => selectFixes(reads, { skip: ["ts-overseas-bc:amount"] })).toThrow(/no such row fix/);
    // The evidence file itself is never changed by a selection.
    expect(byId("ts-overseas-bc").rowFixes!.length).toBe(3);
  });

  it("verifyCatalogue allows exactly the planned cycle and fixes, and flags anything else", () => {
    const b = { id: "x", name: "Old", eligibility: { categories: ["OBC"] }, deadline: "d", tags: [] } as unknown as Scholarship;
    const s = {
      id: "x", decision: "set-cycle", rank: 1, landings90: 1, why: "", reads: [], reviewed: false, eligibilityAmount: "", mismatches: [],
      cycle: { year: "2026-27", sourceUrl: "https://a.gov.in/", tier: "official", checkedOn: "2026-10-03" },
      rowFixes: [{ field: "name", from: "Old", to: "New", sourceUrl: "https://a.gov.in/", why: "x" }],
    } as SchemeRead;
    const r: CycleReads = { readOn: "2026-10-03", schemes: [s] };
    const good = expectedRow(b, s);
    expect(good.name).toBe("New");
    expect(b.name).toBe("Old");
    expect(verifyCatalogue([b], [good], r)).toEqual([]);
    expect(verifyCatalogue([b], [{ ...good, deadline: "changed" }], r)).toEqual(["x: a field other than the planned cycle and row fixes changed"]);
    expect(verifyCatalogue([b], [{ ...good, cycle: undefined }], r)).toEqual(["x: cycle is not the planned one"]);
    // A removed sub-field is expected absent, an added one present.
    const b2 = { ...b, eligibility: { categories: ["OBC"], incomeMaxLakhs: 6 } } as unknown as Scholarship;
    const s2 = { ...s, rowFixes: [{ field: "eligibility.incomeMaxLakhs", from: 6, to: null, sourceUrl: "https://a.gov.in/", why: "x" }, { field: "eligibility.note", from: null, to: "n", sourceUrl: "https://a.gov.in/", why: "x" }] } as SchemeRead;
    const good2 = expectedRow(b2, s2);
    expect(good2.eligibility).toEqual({ categories: ["OBC"], note: "n" });
    expect("incomeMaxLakhs" in good2.eligibility).toBe(false);
    expect(verifyCatalogue([b2], [good2], { readOn: "2026-10-03", schemes: [s2] })).toEqual([]);
    expect(verifyCatalogue([b2], [{ ...good2, eligibility: { ...good2.eligibility, incomeMaxLakhs: 6 } }], { readOn: "2026-10-03", schemes: [s2] })).toEqual(["x: a field other than the planned cycle and row fixes changed"]);
  });
});

describe("the catalogue's cycles (all of them, before or after --apply)", () => {
  it("never sourced to an aggregator, checked on or before today, consistent", () => {
    for (const s of SCHOLARSHIPS.filter((x) => x.cycle)) {
      const c = s.cycle!;
      expect(AGGREGATOR_HOST.test(host(c.sourceUrl)), s.id).toBe(false);
      expect(c.checkedOn <= today, s.id).toBe(true);
      if (c.opensOn && c.closesOn) expect(c.opensOn <= c.closesOn, s.id).toBe(true);
    }
  });
});

describe("the data script", () => {
  it(applied ? "has been applied: every planned row carries its evidence cycle and fixes" : "applies cleanly: only the planned rows change, and the undo restores the file exactly", () => {
    if (applied) {
      for (const s of writableReads(reads)) expect(row(s.id).cycle, s.id).toEqual(s.cycle);
      return;
    }
    const { text: next, edits } = planEdits(text, reads);
    expect(edits.map((e) => e.id).sort()).toEqual(writableReads(reads).map((s) => s.id).sort());
    expect(planUndo(next, edits)).toEqual({ text, restored: edits.map((e) => e.id), skipped: [] });
    // Outside the edited rows the file is byte-identical.
    let rest = next;
    for (const e of edits) rest = rest.replace(e.afterRow, () => e.beforeRow);
    expect(rest).toBe(text);
    for (const e of edits) {
      const prop = topLevelProp(e.afterRow, "cycle");
      expect(prop, e.id).not.toBeNull();
      expect(e.afterRow).toContain("data/scholarships/cycle-reads-2026-10.json");
      for (const f of e.fixes ?? []) {
        const span = fieldSpan(e.afterRow, f.field);
        if (f.to === null) expect(span, `${e.id} ${f.field} removed`).toBeNull();
        else expect(e.afterRow.slice(span!.valueStart, span!.valueEnd), `${e.id} ${f.field}`).toBe(Array.isArray(f.to) ? `[${f.to.map((x) => JSON.stringify(x)).join(", ")}]` : JSON.stringify(f.to));
      }
    }
    // A second run on the written file refuses the set-cycle rows instead of writing twice,
    // and a fix whose `from` is gone is refused too.
    expect(() => planEdits(next, { ...reads, schemes: reads.schemes.filter((s) => s.decision === "set-cycle") })).toThrow(/already has a cycle/);
    const onlyFixes = { ...reads, schemes: reads.schemes.filter((s) => s.id === "csss" || s.id === "ts-epaas").map((s) => ({ ...s, rowFixes: [{ field: "deadline" as const, from: "no such text", to: "x", sourceUrl: s.cycle!.sourceUrl, why: "x" }] })) };
    expect(() => planEdits(text, onlyFixes)).toThrow(/not the expected/);
  });

  it("writes a cycle in the row's own layout", () => {
    const s: SchemeRead = {
      rank: 1, id: "x", landings90: 1, decision: "set-cycle", why: "", reads: [], reviewed: false, eligibilityAmount: "", mismatches: [],
      cycle: { year: "2026-27", closesOn: "2026-10-30", sourceUrl: "https://example.gov.in/", tier: "official", checkedOn: "2026-10-03", note: 'Says "30/10/2026".' },
    };
    const multi = `{\n    id: "x",\n    tags: ["a"],\n  }`;
    const m = editRow(multi, s);
    expect(m).toContain(`    tags: ["a"],\n    // 3 Oct 2026`);
    expect(m).toMatch(/\n    cycle: \{\n      year: "2026-27",\n      closesOn: "2026-10-30",\n      sourceUrl: "https:\/\/example\.gov\.in\/",\n      tier: "official",\n      checkedOn: "2026-10-03",\n      note: "Says \\"30\/10\/2026\\".",\n    \},\n  \}$/);
    const one = `{ id: "x", tags: ["a"] }`;
    expect(editRow(one, s)).toMatch(/^\{ id: "x", tags: \["a"\],\n    \/\/ 3 Oct 2026[^\n]*\n    \/\/ [^\n]*\n    cycle: \{ year: "2026-27", closesOn: "2026-10-30", .* \} \}$/);
    expect(renderCycle({ year: "2026-27", sourceUrl: "https://scholarships.gov.in/All-Scholarships", tier: "official", checkedOn: "2026-10-03" }, null)).toBe(
      '{ year: "2026-27", sourceUrl: NSP_SCHEMES_URL, tier: "official", checkedOn: "2026-10-03" }',
    );
    // 4 Oct 2026: the open-now and rolling flags are written as boolean literals.
    expect(renderCycle({ year: "2026-27", openNow: true, sourceUrl: "https://a.org/", tier: "official", checkedOn: "2026-10-03" }, null)).toBe(
      '{ year: "2026-27", openNow: true, sourceUrl: "https://a.org/", tier: "official", checkedOn: "2026-10-03" }',
    );
    expect(renderCycle({ year: "2026-27", rolling: true, sourceUrl: "https://a.org/", tier: "official", checkedOn: "2026-10-03" }, "    ")).toContain(`\n      rolling: true,\n`);
    // set-cycle on a row with a cycle, refresh-cycle on a row without: refused.
    expect(() => editRow(`{\n    id: "x",\n    cycle: { year: "2026-27", sourceUrl: "https://a.gov.in/", tier: "official", checkedOn: "2026-09-27" },\n  }`, s)).toThrow(/already has a cycle/);
    expect(() => editRow(multi, { ...s, decision: "refresh-cycle" })).toThrow(/has no cycle/);
  });

  it("finds each row by its id, never a nested or repeated one", () => {
    for (const s of reads.schemes) {
      const { start, end } = rowSpan(text, s.id);
      expect(text.slice(start, end)).toContain(`id: "${s.id}",`);
    }
    expect(() => rowSpan(text, "no-such-row")).toThrow(/not found/);
  });

  it("refuses stale reads while a written last date is still ahead, and a bare --undo", () => {
    expect(readAgeDays("2026-10-03", "2026-10-06")).toBe(3);
    expect(readAgeDays("2026-10-03", "2026-10-07")).toBe(MAX_READ_AGE_DAYS + 1);
    // On 3 Oct six written dates are ahead (CSSS 31 Oct, MYSY 30 Oct on both MYSY rows, Vidyasiri 31 Oct, Telangana overseas 15 Oct on both of its rows).
    expect(datedAhead(reads, "2026-10-03").map((s) => s.id).sort()).toEqual(["csss", "gj-mysy-fees", "gujarat-mysy", "ka-vidyasiri", "ts-cm-overseas", "ts-overseas-bc"]);
    expect(datedAhead(reads, "2026-11-01")).toEqual([]);
    expect(undoArg(["--apply"])).toBeNull();
    expect(undoArg(["--undo=data/fix-logs/a.json", "--apply"])).toBe("data/fix-logs/a.json");
    expect(() => undoArg(["--undo", "--apply"])).toThrow(/needs the apply log/);
    expect(() => undoArg(["--undo="])).toThrow(/needs the apply log/);
  });
});

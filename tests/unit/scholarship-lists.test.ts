// Scholarship lists, closing-soon and this year's dates (26 Sep 2026, G4).
// src/lib/scholarship-lists.ts over the real catalogue (src/data/scholarships.ts)
// plus synthetic rows for the date tiers. No DB, no network.
// Run: npx vitest run tests/unit/scholarship-lists.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SCHOLARSHIPS, type Scholarship } from "@/data/scholarships";
import { SCHOLARSHIP_SCHEMES } from "@/lib/scholarship-schemes";
import {
  CLOSING_SOON_DAYS,
  CLOSING_SOON_MIN,
  LIST_OVERLAP_MAX,
  SCHOLARSHIP_FILTERS,
  SCHOLARSHIP_LIST_MIN,
  addDays,
  closingSoon,
  cycleFor,
  cycleLeadLine,
  filterFaq,
  filterLeadLine,
  findScholarshipFilter,
  formatIsoDay,
  isClosingSoonIndexable,
  isFilterListIndexable,
  isListedScheme,
  isOpenScheme,
  isReviewedScheme,
  istToday,
  jaccard,
  lastDateCell,
  lastDateOf,
  listReviewLine,
  scholarshipFaq,
  scholarshipListSitemapEntries,
  schemesForFilter,
} from "@/lib/scholarship-lists";

const TODAY = "2026-09-26";
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

/** A synthetic scheme with only what the helpers read. */
function scheme(over: Partial<Scholarship> & { id: string }): Scholarship {
  return {
    name: over.id,
    awardingBody: "Body",
    type: "CENTRAL",
    state: null,
    levels: ["UG"],
    eligibility: {},
    amount: "₹1",
    applyUrl: "https://scholarships.gov.in/",
    description: "d",
    deadline: "Usually Oct–Nov",
    tags: [],
    ...over,
  };
}

/** 27 Sep 2026 (repair): the real catalogue as it would read once the audit
 *  re-checks every row — to test the list rules on real membership. */
const REVIEWED = { on: "2026-09-27", sourceUrl: "https://scholarships.gov.in/" };
const ALL_REVIEWED: Scholarship[] = SCHOLARSHIP_SCHEMES.map((s) => ({ ...s, reviewed: REVIEWED }));

describe("the six lists (vetoed: undergraduate, postgraduate, separate sc-st / obc, state lists, disability)", () => {
  it("exactly the critic-approved filters exist", () => {
    expect(SCHOLARSHIP_FILTERS.map((f) => f.slug)).toEqual(["girls", "sc-st-obc", "minority", "class-9-10", "class-11-12", "phd"]);
    for (const slug of ["undergraduate", "postgraduate", "sc-st", "obc", "disability", "state-ts"]) expect(findScholarshipFilter(slug), slug).toBeUndefined();
  });

  it("each list is exactly the open schemes its rule admits", () => {
    const rule: Record<string, (s: Scholarship) => boolean> = {
      girls: (s) => s.eligibility.gender === "F",
      "sc-st-obc": (s) => !!s.eligibility.categories && !s.eligibility.categories.includes("GEN") && s.eligibility.categories.some((c) => ["SC", "ST", "OBC"].includes(c)),
      minority: (s) => !!s.eligibility.categories && !s.eligibility.categories.includes("GEN") && s.eligibility.categories.includes("MIN"),
      "class-9-10": (s) => s.levels.includes("CLASS_9_10"),
      "class-11-12": (s) => s.levels.includes("CLASS_11_12"),
      phd: (s) => s.levels.includes("PHD"),
    };
    for (const f of SCHOLARSHIP_FILTERS) {
      const got = schemesForFilter(f, TODAY).map((s) => s.id).sort();
      const want = SCHOLARSHIP_SCHEMES.filter((s) => !s.closed && !s.unlisted && rule[f.slug](s)).map((s) => s.id).sort();
      expect(got, f.slug).toEqual(want);
    }
  });

  it("no aggregator and no discontinued scheme is in any list", () => {
    for (const f of SCHOLARSHIP_FILTERS) {
      for (const s of schemesForFilter(f, TODAY)) {
        expect(s.tags.includes("aggregator"), s.id).toBe(false);
        expect(isOpenScheme(s), s.id).toBe(true);
      }
    }
    expect(schemesForFilter(findScholarshipFilter("phd")!, TODAY).some((s) => s.id === "maulana-azad-fellowship")).toBe(false);
    expect(schemesForFilter(findScholarshipFilter("minority")!, TODAY).some((s) => s.id === "maulana-azad-fellowship")).toBe(false);
  });

  it("27 Sep 2026: no list is indexable while its rows are not re-checked on the awarding body's page", () => {
    for (const f of SCHOLARSHIP_FILTERS) {
      const list = schemesForFilter(f, TODAY);
      expect(list.every(isReviewedScheme), f.slug).toBe(false);
      expect(isFilterListIndexable(list), f.slug).toBe(false);
    }
    // One unreviewed row is enough to hold a list back.
    const rows = Array.from({ length: 6 }, (_, i) => scheme({ id: `r${i}`, reviewed: REVIEWED }));
    const all = [...rows, ...Array.from({ length: 10 }, (_, i) => scheme({ id: `z${i}`, reviewed: REVIEWED }))];
    expect(isFilterListIndexable(rows, all)).toBe(true);
    expect(isFilterListIndexable([...rows.slice(1), scheme({ id: "unchecked" })], all)).toBe(false);
    expect(isReviewedScheme(scheme({ id: "x", reviewed: { on: "2026-09-27", sourceUrl: "" } }))).toBe(false);
  });

  it("rows that are not scholarships, or whose status is in doubt, are in no list and not closing soon", () => {
    const unlisted = ["bihar-mukhyamantri-cycle", "bihar-mukhyamantri-poshak", "nsdc-pmkvy", "tata-football-academy", "super30-anand-kumar", "fitjee-talent-scholarship", "allen-tallentex", "begum-hazrat-mahal"];
    for (const id of unlisted) {
      const s = SCHOLARSHIPS.find((x) => x.id === id);
      expect(s, id).toBeDefined();
      expect(s!.unlisted, id).toBeTruthy();
      expect(isListedScheme(s!), id).toBe(false);
    }
    for (const f of SCHOLARSHIP_FILTERS) {
      for (const s of schemesForFilter(f, TODAY)) expect(unlisted.includes(s.id), `${f.slug}: ${s.id}`).toBe(false);
    }
    for (const s of closingSoon(TODAY)) expect(isListedScheme(s), s.id).toBe(true);
    expect(closingSoon(TODAY, 30, [scheme({ id: "u", unlisted: "x", cycle: { year: "2026-27", closesOn: "2026-09-30", sourceUrl: "https://scholarships.gov.in/", tier: "official", checkedOn: TODAY } })])).toEqual([]);
  });

  it("the page says how many of its rows were re-checked — the list's own count", () => {
    const three = [scheme({ id: "a" }), scheme({ id: "b" }), scheme({ id: "c", reviewed: REVIEWED })];
    expect(listReviewLine(three)).toMatch(/^1 of these 3 rows was re-checked against the awarding body's own page; /);
    expect(listReviewLine(three.slice(0, 2))).toMatch(/^None of these 2 rows has been re-checked/);
    expect(listReviewLine([three[2]])).toBe("Every row here was re-checked against the awarding body's own page.");
    expect(listReviewLine([])).toBe("");
  });

  it("every indexable list has the floor and overlaps no other indexable list, nor the catalogue, by LIST_OVERLAP_MAX or more (catalogue as if re-checked)", () => {
    const open = ALL_REVIEWED.filter(isListedScheme);
    const lists = SCHOLARSHIP_FILTERS.map((f) => ({ slug: f.slug, list: schemesForFilter(f, TODAY, ALL_REVIEWED) })).filter((x) => isFilterListIndexable(x.list, ALL_REVIEWED));
    expect(lists.length).toBeGreaterThan(0);
    for (const a of lists) {
      expect(a.list.length, a.slug).toBeGreaterThanOrEqual(SCHOLARSHIP_LIST_MIN);
      expect(jaccard(a.list, open), `${a.slug} vs catalogue`).toBeLessThan(LIST_OVERLAP_MAX);
      for (const b of lists) if (a.slug < b.slug) expect(jaccard(a.list, b.list), `${a.slug} vs ${b.slug}`).toBeLessThan(LIST_OVERLAP_MAX);
    }
  });

  it("the floors: fewer than SCHOLARSHIP_LIST_MIN is noindex; a near copy of the catalogue is noindex", () => {
    const few = Array.from({ length: SCHOLARSHIP_LIST_MIN - 1 }, (_, i) => scheme({ id: `x${i}`, reviewed: REVIEWED }));
    expect(isFilterListIndexable(few, few)).toBe(false);
    const all = Array.from({ length: 10 }, (_, i) => scheme({ id: `y${i}`, reviewed: REVIEWED }));
    expect(isFilterListIndexable(all.slice(0, 9), all)).toBe(false); // 0.9 overlap
    expect(isFilterListIndexable(all.slice(0, 5), all)).toBe(true); // 0.5 overlap
    expect(jaccard([], [])).toBe(0);
  });

  it("lead and FAQ counts are the list's own", () => {
    for (const f of SCHOLARSHIP_FILTERS) {
      const list = schemesForFilter(f, TODAY);
      const lead = filterLeadLine(f, list, TODAY);
      expect(lead.startsWith(`${list.length} `), f.slug).toBe(true);
      const national = list.filter((s) => !s.state).length;
      if (national > 0) expect(lead).toContain(`${national} open across India`);
      const faq = filterFaq(f, list, TODAY);
      expect(faq.q).toBe(`When do scholarships for ${f.audience} close in 2026-27?`);
      expect(faq.a).toContain(`${list.length} schemes listed here`);
    }
  });

  it("no scholarship id collides with the static segments beside [id]", () => {
    const ids = new Set(SCHOLARSHIPS.map((s) => s.id));
    for (const seg of ["for", "closing-soon", "match", "context.md"]) expect(ids.has(seg), seg).toBe(false);
  });
});

describe("this year's date — official only when read on the portal", () => {
  const cycle = { year: "2026-27" as const, sourceUrl: "https://scholarships.gov.in/All-Scholarships", tier: "official" as const, checkedOn: "2026-09-26" };

  it("upcoming, passed, checked-with-no-date, usual window, discontinued", () => {
    const up = scheme({ id: "up", cycle: { ...cycle, opensOn: "2026-06-01", closesOn: "2026-10-31" } });
    expect(lastDateOf(up, TODAY).kind).toBe("upcoming");
    expect(cycleLeadLine(up, TODAY)).toBe("2026-27: applications close 31 Oct 2026 (official — scholarships.gov.in, checked 26 Sep 2026).");
    // 27 Sep 2026 (fixer): the cell carries the window's note (none here).
    expect(lastDateCell(up, TODAY)).toEqual({ text: "31 Oct 2026 (official)", tier: "official", note: null });

    const later = scheme({ id: "later", cycle: { ...cycle, opensOn: "2026-10-01", closesOn: "2026-11-30" } });
    expect(cycleLeadLine(later, TODAY)).toBe("2026-27: applications open 1 Oct 2026 and close 30 Nov 2026 (official — scholarships.gov.in, checked 26 Sep 2026).");

    const past = scheme({ id: "past", cycle: { ...cycle, closesOn: "2026-09-25" } });
    expect(lastDateOf(past, TODAY).kind).toBe("passed");
    expect(cycleLeadLine(past, TODAY)).toMatch(/^2026-27: applications closed on 25 Sep 2026 \(official/);
    expect(lastDateCell(past, TODAY).text).toBe("Closed 25 Sep 2026 (official)");

    const none = scheme({ id: "none", cycle: { ...cycle, sourceUrl: "https://telanganaepass.cgg.gov.in/" }, deadline: "Aug–Dec each year" });
    expect(cycleLeadLine(none, TODAY)).toBe(
      "No 2026-27 date on the official portal yet (telanganaepass.cgg.gov.in, checked 26 Sep 2026) — the usual window is Aug–Dec each year.",
    );

    const usual = scheme({ id: "usual", deadline: "Usually Oct–Dec each year (check NSP)" });
    expect(lastDateOf(usual, TODAY).kind).toBe("usual");
    const line = cycleLeadLine(usual, TODAY);
    expect(line).toBe("Shishya has not checked a 2026-27 date for this scheme yet — the usual window is Oct–Dec each year (check NSP). Confirm the date on the official portal before applying.");
    expect(line).not.toMatch(/official —|applications close/);
    expect(lastDateCell(usual, TODAY)).toEqual({ text: "Usual window: Oct–Dec each year (check NSP)", tier: null, note: null });

    const gone = scheme({ id: "gone", closed: { note: "Discontinued from 2022-23.", sourceUrl: "https://pib.gov.in/x", checkedOn: "2026-09-26" } });
    expect(cycleLeadLine(gone, TODAY)).toBe("Not open to new applicants: Discontinued from 2022-23.");
  });

  it("a cycle's note rides with the date (renewal-only windows, conflicting dates)", () => {
    const csss = SCHOLARSHIPS.find((s) => s.id === "csss")!;
    const line = cycleLeadLine(csss, TODAY);
    // 27 Sep 2026 review: the NSP card was re-read (same dates), so the check day moved.
    expect(line).toContain("applications close 30 Sep 2026 (official — scholarships.gov.in, checked 27 Sep 2026)");
    expect(line).toContain("Renewal applications only");
    expect(line).toContain("31 Oct 2026");
  });

  it("27 Sep 2026 (fixer): list cells and list FAQs carry the window's note; a level-scoped list dates from that level's own window", () => {
    // PM YASASVI: "30 Sep 2026 (official)" is a renewals-only window — the cell says so.
    const yasasvi = SCHOLARSHIPS.find((s) => s.id === "pm-yasasvi")!;
    const cell = lastDateCell(yasasvi, "2026-09-27");
    expect(cell.text).toBe("30 Sep 2026 (official)");
    expect(cell.note).toMatch(/^Renewal applications only/);
    expect(closingSoon("2026-09-27").some((s) => s.id === "pm-yasasvi")).toBe(true);
    expect(read("src/app/scholarships/ScholarshipTable.tsx")).toContain("{cell.note && <p className=\"mt-0.5 text-[11px] text-ink-500\">{cell.note}</p>}");

    // UP: 31 Oct is the after-Class-12 window; the Class 11–12 one closed on 21 Sep (same portal, same check).
    const up = SCHOLARSHIPS.find((s) => s.id === "ed-cell-up")!;
    expect(lastDateCell(up, "2026-09-27").text).toBe("31 Oct 2026 (official)");
    const c1112 = findScholarshipFilter("class-11-12")!;
    expect(c1112.level).toBe("CLASS_11_12");
    const own = lastDateCell(up, "2026-09-27", c1112.level);
    expect(own.text).toBe("Closed 21 Sep 2026 (official)");
    expect(own.note).toBe("Class 11 fresh applications; Class 12 renewals closed on 19 Sep 2026.");
    for (const day of ["2026-09-27", "2026-10-01", "2026-10-20"]) {
      const list = schemesForFilter(c1112, day);
      expect(list.some((s) => s.id === "ed-cell-up"), day).toBe(true);
      expect(lastDateOf(up, day, c1112.level).kind, day).toBe("passed");
      expect(filterFaq(c1112, list, day).a, day).not.toContain(up.name);
    }
    expect(cycleFor(up)).toBe(up.cycle);
    expect(cycleFor(up, "UG")).toBe(up.cycle);
    expect(read("src/app/scholarships/for/[filter]/page.tsx")).toContain("<ScholarshipTable rows={list} today={today} level={filter.level} />");

    // A list FAQ names each shown date's note after the list (a note may hold semicolons).
    const f = findScholarshipFilter("class-9-10")!;
    const renew = scheme({ id: "renew", levels: ["CLASS_9_10"], cycle: { ...cycle, closesOn: "2026-10-05", note: "Renewal applications only; fresh not open" } });
    const a = filterFaq(f, [renew], TODAY).a;
    expect(a).toContain(": renew — 5 Oct 2026 (official, scholarships.gov.in). renew: Renewal applications only; fresh not open.");
  });

  it("every cycle in the catalogue was read on an official host, is 2026-27, and is internally consistent", () => {
    const dated = SCHOLARSHIPS.filter((s) => s.cycle);
    expect(dated.length).toBeGreaterThan(0);
    for (const s of dated) {
      const c = s.cycle!;
      expect(c.year, s.id).toBe("2026-27");
      expect(c.tier, s.id).toBe("official");
      expect(new URL(c.sourceUrl).hostname, s.id).toMatch(/(\.gov\.in|\.nic\.in)$/);
      expect(c.checkedOn, s.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const d of [c.opensOn, c.closesOn]) if (d) expect(d, s.id).toMatch(/^2026-\d{2}-\d{2}$/);
      if (c.opensOn && c.closesOn) expect(c.opensOn <= c.closesOn, s.id).toBe(true);
    }
  });

  it("the discontinued schemes cite the government's own statement", () => {
    for (const id of ["maulana-azad-fellowship", "endeavour-australia"]) {
      const s = SCHOLARSHIPS.find((x) => x.id === id)!;
      expect(s.closed, id).toBeTruthy();
      expect(new URL(s.closed!.sourceUrl).hostname, id).toMatch(/(pib\.gov\.in|\.gov\.au)$/);
      expect(isOpenScheme(s)).toBe(false);
    }
  });

  it("the NSP post-matric income note matches the ministries' guidelines (26 Sep 2026)", () => {
    const note = SCHOLARSHIPS.find((s) => s.id === "nsp-post-matric")!.eligibility.note!;
    expect(note).toContain("₹2.5 lakh a year for SC, ST and OBC/EBC/DNT students");
    expect(note).toContain("₹2 lakh for minority students");
    expect(note).not.toMatch(/₹1L ST|₹1\.5L OBC/);
  });
});

describe("closing soon", () => {
  it("only official closing dates inside the window, soonest first; the floor", () => {
    const list = closingSoon(TODAY);
    const end = addDays(TODAY, CLOSING_SOON_DAYS);
    for (const s of list) {
      expect(isOpenScheme(s)).toBe(true);
      expect(s.cycle!.closesOn! >= TODAY && s.cycle!.closesOn! <= end, s.id).toBe(true);
    }
    for (let i = 1; i < list.length; i++) expect(list[i - 1].cycle!.closesOn! <= list[i].cycle!.closesOn!).toBe(true);
    expect(isClosingSoonIndexable(list)).toBe(list.length >= CLOSING_SOON_MIN && list.every(isReviewedScheme));
    // 26 Sep 2026: CSSS, the J&K special scheme and NMMSS close on 30 Sep.
    // 27 Sep 2026 (official-data wave): Karnataka SSP (ka-vidyasiri) and PM
    // YASASVI now carry official 30 Sep 2026 last dates too — five rows, the
    // floor. Only PM YASASVI was reviewed then, so the page stayed noindex.
    // 27 Sep 2026 review: CSSS, NMMSS, the J&K special scheme and Vidyasiri
    // were re-read on their awarding bodies' own pages and carry `reviewed`
    // — all five are reviewed, so the list is indexable (until 30 Sep passes).
    expect(list.map((s) => s.id).sort()).toEqual(["csss", "ka-vidyasiri", "nmmss", "pm-special-jk", "pm-yasasvi"]);
    expect(list.length).toBe(CLOSING_SOON_MIN);
    expect(list.filter(isReviewedScheme).map((s) => s.id).sort()).toEqual(["csss", "ka-vidyasiri", "nmmss", "pm-special-jk", "pm-yasasvi"]);
    expect(isClosingSoonIndexable(list)).toBe(true);
    // Nothing is "closing soon" by its usual window.
    expect(closingSoon(TODAY, 30, [scheme({ id: "u", deadline: "Sep–Oct" })])).toEqual([]);
  });

  it("27 Sep 2026: indexable only at the floor AND with every listed row reviewed (as sitemap-sections says)", () => {
    const rows = Array.from({ length: CLOSING_SOON_MIN }, (_, i) => scheme({ id: `c${i}`, reviewed: REVIEWED }));
    expect(isClosingSoonIndexable(rows)).toBe(true);
    expect(isClosingSoonIndexable(rows.slice(1))).toBe(false);
    // One unreviewed row is enough to hold the page back.
    expect(isClosingSoonIndexable([...rows.slice(1), scheme({ id: "unchecked" })])).toBe(false);
    // Today's real list would clear it once its rows are re-checked.
    const real = closingSoon(TODAY, CLOSING_SOON_DAYS, ALL_REVIEWED);
    expect(real.length).toBeGreaterThanOrEqual(CLOSING_SOON_MIN);
    expect(isClosingSoonIndexable(real)).toBe(true);
  });

  it("IST day and calendar helpers", () => {
    expect(istToday(new Date("2026-09-25T19:00:00Z"))).toBe("2026-09-26"); // 00:30 IST
    expect(istToday(new Date("2026-09-25T18:00:00Z"))).toBe("2026-09-25"); // 23:30 IST
    expect(addDays("2026-09-26", 30)).toBe("2026-10-26");
    expect(formatIsoDay("2026-10-31")).toBe("31 Oct 2026");
  });
});

describe("a scholarship page's FAQ", () => {
  it("every item has an answer; a discontinued scheme is never told to apply", () => {
    for (const s of SCHOLARSHIP_SCHEMES) {
      for (const f of scholarshipFaq(s, TODAY)) expect(f.a.trim().length, `${s.id}: ${f.q}`).toBeGreaterThan(0);
    }
    const manf = SCHOLARSHIPS.find((s) => s.id === "maulana-azad-fellowship")!;
    const apply = scholarshipFaq(manf, TODAY).find((f) => f.q.startsWith("How do I apply"))!;
    expect(apply.a).toMatch(/^It no longer takes new applicants\./);
  });

  it("the detail page renders the FAQ it marks up, and marks a discontinued scheme noindex", () => {
    const src = read("src/app/scholarships/[id]/page.tsx");
    expect(src).toContain("mainEntity: faq.map((f) => ({ \"@type\": \"Question\", name: f.q");
    expect(src).toMatch(/\{faq\.map\(\(f\) => \(\s*<div key=\{f\.q\}>/);
    expect(src).toContain("...(open ? {} : { robots: { index: false, follow: true } }),");
    expect(src).toContain('<Fact label="Usual window" value={s.deadline} />');
  });
});

describe("sitemap entries (for src/lib/sitemap-sections.ts)", () => {
  it("only indexable lists, lastModified only a real check day", () => {
    const now = new Date("2026-09-26T06:00:00Z");
    const entries = scholarshipListSitemapEntries("https://shishya.in", now);
    const checkedDays = new Set(SCHOLARSHIPS.flatMap((s) => (s.cycle ? [s.cycle.checkedOn] : [])));
    for (const e of entries) {
      expect(e.url).toMatch(/^https:\/\/shishya\.in\/scholarships\/(for\/[a-z0-9-]+|closing-soon)$/);
      if (e.lastModified) expect(checkedDays.has(String(e.lastModified))).toBe(true);
    }
    const expected = SCHOLARSHIP_FILTERS.filter((f) => isFilterListIndexable(schemesForFilter(f, "2026-09-26"))).map((f) => `https://shishya.in/scholarships/for/${f.slug}`);
    if (isClosingSoonIndexable(closingSoon("2026-09-26"))) expected.push("https://shishya.in/scholarships/closing-soon");
    expect(entries.map((e) => e.url)).toEqual(expected);
    // 27 Sep 2026: closing-soon reached the floor (5) with 1 reviewed row — it was not in the sitemap.
    // 27 Sep 2026 review: all five rows are now reviewed, so it is (lastModified = the review day).
    expect(entries.map((e) => e.url)).toContain("https://shishya.in/scholarships/closing-soon");
  });
});

describe("the lists are linked as plain crawlable links", () => {
  it("/scholarships passes the lists to the browser, which renders <Link>s", () => {
    const page = read("src/app/scholarships/page.tsx");
    expect(page).toMatch(/href: `\/scholarships\/for\/\$\{f\.slug\}`/);
    expect(page).toContain('href: "/scholarships/closing-soon"');
    expect(page).toContain("<ScholarshipBrowser scholarships={SCHOLARSHIP_SCHEMES} lists={lists} />");
    const browser = read("src/app/scholarships/ScholarshipBrowser.tsx");
    expect(browser).toMatch(/lists\.map\(\(l\) => \(\s*<Link/);
    expect(browser).not.toMatch(/from "@\/lib\/scholarship-lists"/);
  });
  it("the list pages are 404 for any other segment and noindex below the floor", () => {
    const list = read("src/app/scholarships/for/[filter]/page.tsx");
    expect(list).toContain("export const dynamicParams = false;");
    expect(list).toContain("...(indexable ? {} : { robots: { index: false, follow: true } }),");
    // 27 Sep 2026 (repair): some apply hosts are not the awarding body's own
    // (jharkhandscholarship.com, cbci.in, …) — the page promises apply links.
    expect(list).toContain("Amounts & Apply Links");
    expect(list).toContain("Each row links the scheme's apply page.");
    expect(list).not.toMatch(/Official Links|awarding body's official portal/);
    expect(list).toContain("{reviewLine && <p");
    const soon = read("src/app/scholarships/closing-soon/page.tsx");
    expect(soon).toContain("...(isClosingSoonIndexable(list) ? {} : { robots: { index: false, follow: true } }),");
    // 27 Sep 2026: like the lists, the page counts its re-checked rows and promises apply links.
    expect(soon).toContain("{reviewLine && <p");
    expect(soon).toContain("Each row links the scheme's apply page.");
    expect(soon).not.toMatch(/links the official portal/);
  });
});

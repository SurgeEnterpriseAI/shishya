// Official listing adapters (30 Sep 2026), src/lib/official-listings.ts, on
// pages saved from the bodies' own sites that day (tests/fixtures/
// official-listings/, trimmed; see each file's first line). No network: the
// reader gets a fake fetch. Every link an adapter returns still goes through
// the unchanged release gate — the gate cases below are the honest outcomes
// for these pages, refusals included.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  ListingReadCache,
  bodyListingsFor,
  ibpsCyclePages,
  isFirewallPage,
  isScriptShell,
  istDdMmYyyy,
  listingAdapterFor,
  listingReadKey,
  parseRrbTable,
  parseSscRecords,
  parseUpscListing,
  readOfficialListing,
  romanValue,
  rrbCategoryUrl,
  rrbListingPages,
  rrbRegionOf,
  sscContentType,
  sscFileUrl,
  sscRecordsUrl,
  type ListingFetch,
  type ListingPage,
} from "@/lib/official-listings";
import { classifyLink, examNamed, examTermsFor, releaseGate, type GateContext, type LinkFetch, type ReleaseCandidate, type WatchKind } from "@/lib/answer-key-watch";
import { markerConflict, sittingMarkers } from "@/lib/sitting-markers";

const FIX = path.join(process.cwd(), "tests/fixtures/official-listings");
const fx = (name: string) => fs.readFileSync(path.join(FIX, name), "utf8");

const NOW = new Date("2026-09-30T06:30:00Z"); // 12:00 IST
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const html = (body: string, finalUrl: string | null = null): ListingPage => ({ status: 200, contentType: "text/html", body, finalUrl });
const json = (body: string): ListingPage => ({ status: 200, contentType: "application/json; charset=utf-8", body, finalUrl: null });
const dead: ListingPage = { status: 0, contentType: null, body: "", finalUrl: null, error: "timeout" };
const pdf: LinkFetch = { status: 200, contentType: "application/pdf", head: "%PDF-1.7", finalUrl: null };

function fakeFetch(pages: Record<string, ListingPage>) {
  const calls: string[] = [];
  const fetchPage: ListingFetch = async (url) => {
    calls.push(url);
    return pages[url] ?? dead;
  };
  return { fetchPage, calls };
}

function ctx(o: Partial<GateContext> & Pick<GateContext, "examTerms" | "cycleYears" | "notBefore">): GateContext {
  return {
    portalUrl: null,
    lastExamDay: o.notBefore,
    sittingLabels: [],
    ordinalNames: [],
    otherSittingThisYear: false,
    known: new Set(),
    baselined: false,
    singleExamHeading: null,
    now: NOW,
    ...o,
  };
}

const cand = (kind: WatchKind, l: { url: string; anchorText: string; rowText: string }, listingUrl: string): ReleaseCandidate => ({
  kind,
  url: l.url,
  listingUrl,
  anchorText: l.anchorText,
  rowText: l.rowText,
  via: "html",
});

describe("which adapter reads a listing", () => {
  it("by the body's host and page", () => {
    expect(listingAdapterFor("https://upsc.gov.in/examinations/answer-key")).toBe("upsc");
    expect(listingAdapterFor("https://www.upsc.gov.in/whats-new")).toBe("upsc");
    expect(listingAdapterFor("https://ssc.gov.in/home/answer-key")).toBe("ssc-api");
    expect(listingAdapterFor("https://ssc.gov.in/home/candidate-result")).toBe("ssc-api");
    expect(listingAdapterFor("https://ssc.gov.in/api/attachment/uploads/masterData/AnswerKeys/x.pdf")).toBe("html");
    expect(listingAdapterFor("https://www.ibps.in/index.php/management-trainees/")).toBe("ibps");
    expect(listingAdapterFor("https://ibpsreg.ibps.in/crppoxvijun26/restza_sep26/login.php")).toBe("html");
    expect(listingAdapterFor("https://rrb.indianrailways.gov.in")).toBe("rrb");
    expect(listingAdapterFor("https://www.rrbcdg.gov.in/")).toBe("rrb");
    expect(listingAdapterFor("https://esb.mp.gov.in/results/results_n.htm")).toBe("html");
    expect(sscContentType("https://ssc.gov.in/home/result")).toBe("results");
    expect(sscContentType("https://ssc.gov.in/home/notice-board")).toBeNull();
  });

  it("the bodies' own listings, known without research", () => {
    expect(bodyListingsFor("https://upsc.gov.in", "ANSWER_KEY")).toEqual(["https://www.upsc.gov.in/examinations/answer-key", "https://www.upsc.gov.in/whats-new"]);
    expect(bodyListingsFor("https://upsc.gov.in", "RESULT")).toContain("https://www.upsc.gov.in/exams-related-info/written-result");
    expect(bodyListingsFor("https://ssc.gov.in", "RESULT")).toEqual(["https://ssc.gov.in/home/candidate-result"]);
    expect(bodyListingsFor("https://rrb.indianrailways.gov.in", "ANSWER_KEY")).toEqual([
      "https://rrb.indianrailways.gov.in/getdata?loc=chandigarh&category=Objection%20Tracker",
    ]);
    expect(bodyListingsFor("https://www.ibps.in", "RESULT")).toEqual([]); // one index per exam: the research names it
    expect(bodyListingsFor("https://esb.mp.gov.in", "RESULT")).toEqual([]);
  });
});

describe("script-built pages are 'browser-needed', never guessed at", () => {
  it("ssc.gov.in's answer-key page is an app shell: no links, no text", () => {
    expect(isScriptShell(fx("ssc-answer-key-shell.html"))).toBe(true);
    expect(isScriptShell(fx("upsc-answer-key.html"))).toBe(false);
    expect(isScriptShell("<p>nothing</p>")).toBe(false); // a small page is not a shell
  });

  it("a shell with no known source reads as browser-only with the reason", async () => {
    const { fetchPage } = fakeFetch({ "https://board.gov.in/app/keys": html(fx("ssc-answer-key-shell.html")) });
    const r = await readOfficialListing("https://board.gov.in/app/keys", "ANSWER_KEY", fetchPage, { portalUrl: null });
    expect(r.fetchMode).toBe("browser-only");
    expect(r.status).toMatch(/^browser-needed: /);
    expect(r.links).toEqual([]);
  });
});

describe("UPSC: the page heading names the kind of every table row", () => {
  const url = "https://www.upsc.gov.in/examinations/answer-key";

  it("prints 'Answer Keys' in front of the rows of its table, and nowhere else", () => {
    const { heading, links } = parseUpscListing(fx("upsc-answer-key.html"), url);
    expect(heading).toBe("Answer Keys");
    const row = links.find((l) => l.url.endsWith("AnsKey-CISF-AC-Exe-LDCE-2026-GAI-PS-100926.pdf"))!;
    expect(row.rowText).toBe("Answer Keys · CISF AC(EXE) LDCE-2026 (1.72 MB) 10/09/2026");
    expect(classifyLink(`${row.anchorText} ${row.rowText}`).ak).toBe(true);
    const nav = links.find((l) => l.url === "https://www.upsc.gov.in/examinations/cutoff-marks--")!;
    expect(nav.rowText.startsWith("Answer Keys ·")).toBe(false);
  });

  it("that row passes the unchanged gate with its printed upload date", () => {
    const { links } = parseUpscListing(fx("upsc-answer-key.html"), url);
    const row = links.find((l) => l.url.endsWith("AnsKey-CISF-AC-Exe-LDCE-2026-GAI-PS-100926.pdf"))!;
    const v = releaseGate(
      cand("ANSWER_KEY", row, url),
      ctx({ portalUrl: "https://upsc.gov.in", examTerms: examTermsFor({ shortName: "CISF AC LDCE", name: "CISF AC(EXE) LDCE" }), cycleYears: ["2026"], notBefore: day("2026-08-30") }),
      pdf,
    );
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.release.dateSource).toBe("printed");
      expect(v.release.releasedOn.toISOString().slice(0, 10)).toBe("2026-09-10");
    }
  });

  it("written results: 'Written Results' names the kind; What's New anchors name it themselves", () => {
    const wr = parseUpscListing(fx("upsc-written-result.html"), "https://www.upsc.gov.in/exams-related-info/written-result");
    const cms = wr.links.find((l) => l.url.endsWith("WR-RollList-CMSE-2026-Engl-010926.pdf"))!;
    expect(cms.rowText).toMatch(/^Written Results · Combined Medical Services Examination, 2026 .* 01\/09\/2026$/);
    expect(classifyLink(`${cms.anchorText} ${cms.rowText}`).result).toBe(true);

    const wn = parseUpscListing(fx("upsc-whats-new.html"), "https://www.upsc.gov.in/whats-new");
    expect(wn.heading).toBe("What's New");
    const pak = wn.links.find((l) => l.anchorText.startsWith("Provisional Answer Key: 32 Posts of Accounts Officer"))!;
    expect(pak.url).toBe(
      "https://www.upsc.gov.in/whats-new/32%20Posts%20of%20Accounts%20Officer,%20Administration%20of%20Union%20Territory%20of%20Ladakh/Provisional%20Answer%20Key",
    );
    expect(pak.rowText.startsWith("What's New")).toBe(false);
    const cmsWn = wn.links.find((l) => l.anchorText === "Written Result: Combined Medical Services Examination, 2026")!;
    expect(classifyLink(cmsWn.anchorText).result).toBe(true);
  });

  it("What's New prints no date: on the crawl's first read (no baseline) the gate refuses an undated link", () => {
    const wn = parseUpscListing(fx("upsc-whats-new.html"), "https://www.upsc.gov.in/whats-new");
    const cmsWn = wn.links.find((l) => l.anchorText === "Written Result: Combined Medical Services Examination, 2026")!;
    const c = ctx({
      portalUrl: "https://upsc.gov.in",
      examTerms: examTermsFor({ shortName: "CMS", name: "Combined Medical Services Examination" }),
      cycleYears: ["2026"],
      notBefore: day("2026-07-19"),
    });
    const html200: LinkFetch = { status: 200, contentType: "text/html", head: "<html>", finalUrl: null };
    const first = releaseGate(cand("RESULT", cmsWn, "https://www.upsc.gov.in/whats-new"), c, html200);
    expect(first).toMatchObject({ ok: false, gate: 5 });
    const later = releaseGate(cand("RESULT", cmsWn, "https://www.upsc.gov.in/whats-new"), { ...c, baselined: true }, html200);
    expect(later.ok && later.release.dateSource).toBe("first-seen");
  });
});

describe("SSC: its records endpoint behind the script-built pages", () => {
  it("the query the app itself sends", () => {
    const u = new URL(sscRecordsUrl("answer-key"));
    expect(`${u.origin}${u.pathname}`).toBe("https://ssc.gov.in/api/general-website/portal/records");
    expect(u.searchParams.get("contentType")).toBe("answer-key");
    expect(u.searchParams.get("attributes")).toBe("id,headline,examId,examYear,contentType,startDate,endDate,language,createdAt");
    expect(u.searchParams.get("isAttachment")).toBe("true");
    expect(new URL(sscRecordsUrl("results")).searchParams.get("pageType")).toBe("filter");
  });

  // Review, 30 Sep 2026 (SSC's bundle): the answer-key row prints only the
  // headline and the file size, and opens only the record's first attachment.
  const STENO_HEADLINE =
    "Stenographer Grade C and D Examination 2026 : Uploading of Tentative Answer Keys along with Candidates’ Response Sheet(s) and inviting challenges thereon";

  it("answer keys: the file and its headline — no date, as the page prints none", () => {
    const links = parseSscRecords(fx("ssc-records-answer-key.json"), "answer-key")!;
    expect(links).toHaveLength(10);
    expect(links[0]).toEqual({
      url: "https://ssc.gov.in/api/attachment/uploads/masterData/AnswerKeys/Approved_WriteUp_23092026.pdf",
      anchorText: STENO_HEADLINE,
      rowText: STENO_HEADLINE,
    });
    expect(links.some((l) => /\d{2}-\d{2}-\d{4}/.test(l.rowText))).toBe(false); // createdAt never enters the text the gate reads
    expect(links.every((l) => classifyLink(`${l.anchorText} ${l.rowText}`).ak)).toBe(true);
  });

  it("answer keys: only the first attachment, the one the page opens", () => {
    const two = JSON.stringify({
      statusCode: 200,
      data: [{ headline: "X Examination 2026: Tentative Answer Keys", createdAt: "2026-09-23T17:00:00Z", attachments: [{ fileName: "a.pdf" }, { fileName: "b.pdf" }] }],
    });
    expect(parseSscRecords(two, "answer-key")!.map((l) => l.url)).toEqual(["https://ssc.gov.in/api/attachment/uploads/masterData/AnswerKeys/a.pdf"]);
    expect(parseSscRecords(two, "results")!.map((l) => l.anchorText)).toEqual(["Result", "Result"]); // the results table links every file
  });

  it("an SSC key is undated: refused on the crawl's first read (gate 5), 'first seen' on a baselined page", () => {
    const links = parseSscRecords(fx("ssc-records-answer-key.json"), "answer-key")!;
    const c = ctx({
      portalUrl: "https://ssc.gov.in",
      examTerms: examTermsFor({ shortName: "SSC Stenographer", name: "SSC Stenographer Grade C and D" }),
      cycleYears: ["2026"],
      notBefore: day("2026-09-12"),
    });
    const k = cand("ANSWER_KEY", links[0], "https://ssc.gov.in/home/answer-key");
    expect(releaseGate(k, c, pdf)).toMatchObject({ ok: false, gate: 5 });
    const later = releaseGate(k, { ...c, baselined: true }, pdf);
    expect(later.ok && [later.release.dateSource, later.release.releasedOn.toISOString().slice(0, 10)]).toEqual(["first-seen", "2026-09-30"]);
  });

  it("results: the 'Result' link before the 'Write Up' link, as the results table labels them", () => {
    const links = parseSscRecords(fx("ssc-records-results.json"), "results")!;
    const mts = links.filter((l) => l.rowText.includes("(List-I)") && l.rowText.includes("Multi Tasking"));
    expect(mts.map((l) => [l.anchorText, l.url])).toEqual([
      ["Result", "https://ssc.gov.in/api/attachment/uploads/masterData/Results/List1_03082026.pdf"],
      ["Write Up", "https://ssc.gov.in/api/attachment/uploads/masterData/Results/writeup_mts_03082026.pdf"],
    ]);
    expect(mts[0].rowText.startsWith("03-08-2026 · Multi Tasking (Non-Technical) Staff, and Havaldar (CBIC and CBN) Examination, 2025")).toBe(true);
  });

  it("an MTS result passes the unchanged gate with SSC's printed date", () => {
    const links = parseSscRecords(fx("ssc-records-results.json"), "results")!;
    const r = links.find((l) => l.url.endsWith("/Results/List1_03082026.pdf"))!;
    const v = releaseGate(
      cand("RESULT", r, "https://ssc.gov.in/home/candidate-result"),
      ctx({
        portalUrl: "https://ssc.gov.in",
        examTerms: examTermsFor({ shortName: "SSC MTS", name: "SSC Multi Tasking Staff (Paper 1)" }),
        cycleYears: ["2025", "2026"],
        notBefore: day("2026-06-20"),
        now: new Date("2026-08-04T06:30:00Z"),
      }),
      pdf,
    );
    expect(v.ok && [v.release.dateSource, v.release.releasedOn.toISOString().slice(0, 10)]).toEqual(["printed", "2026-08-03"]);
  });

  it("dates in IST; files by their stored path (URL-safe); anything else is not the records JSON", () => {
    expect(istDdMmYyyy("2026-09-23T17:00:17.512Z")).toBe("23-09-2026");
    expect(istDdMmYyyy("2026-09-23T19:00:00Z")).toBe("24-09-2026"); // 00:30 IST
    expect(sscFileUrl({ path: "uploads\\masterData\\NoticeBoards\\Write-up, Final Result- MTS-2024_12325.pdf" }, "Results")).toBe(
      "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Write-up,%20Final%20Result-%20MTS-2024_12325.pdf",
    );
    expect(sscFileUrl({ fileName: "a#b?.pdf" }, "AnswerKeys")).toBe("https://ssc.gov.in/api/attachment/uploads/masterData/AnswerKeys/a%23b%3F.pdf");
    expect(parseSscRecords("<html></html>", "results")).toBeNull();
    expect(parseSscRecords(JSON.stringify({ statusCode: "203", error: "Invalid attributes in request" }), "results")).toBeNull();
  });

  it("the reader asks the endpoint, keeps the human page as the listing, and reports a refusal", async () => {
    const api = sscRecordsUrl("answer-key");
    const ok = fakeFetch({ [api]: json(fx("ssc-records-answer-key.json")) });
    const r = await readOfficialListing("https://ssc.gov.in/home/answer-key", "ANSWER_KEY", ok.fetchPage, { portalUrl: "https://ssc.gov.in" });
    expect(ok.calls).toEqual([api]);
    expect(r).toMatchObject({ adapter: "ssc-api", fetchMode: "html", pageUrl: "https://ssc.gov.in/home/answer-key", sources: [api] });
    expect(r.links).toHaveLength(10);
    expect(r.pageText).toContain("Stenographer Grade C and D Examination 2026"); // where the crawl checks the body's own terms
    // The feed has no heading: none is made up, so none can name an exam.
    expect(r.heading).toBe("");
    expect(r.pageText).not.toContain("Staff Selection Commission");

    const refused = fakeFetch({ [api]: json(JSON.stringify({ statusCode: "203", error: "Invalid attributes in request" })) });
    const r2 = await readOfficialListing("https://ssc.gov.in/home/answer-key", "ANSWER_KEY", refused.fetchPage, { portalUrl: "https://ssc.gov.in" });
    expect(r2.fetchMode).toBe("blocked");
    expect(r2.status).toMatch(/not the records JSON/);
  });
});

describe("IBPS: an exam index → its newest cycle pages", () => {
  const index = "https://www.ibps.in/index.php/management-trainees/";
  const xvi = "https://www.ibps.in/index.php/management-trainees-xvi/";
  const xv = "https://www.ibps.in/index.php/management-trainees-xv/";

  it("roman numerals; the two newest cycles, newest first", () => {
    expect([romanValue("xvi"), romanValue("xiv"), romanValue("ix"), romanValue("abc")]).toEqual([16, 14, 9, null]);
    expect(ibpsCyclePages(fx("ibps-management-trainees.html"), index)).toEqual([xvi, xv]);
    expect(ibpsCyclePages(fx("ibps-management-trainees-xvi.html"), xvi)).toEqual([]); // a cycle page is read as it is
  });

  it("reads the cycle cards; result / score links are candidate-login pages", async () => {
    const { fetchPage, calls } = fakeFetch({ [index]: html(fx("ibps-management-trainees.html")), [xvi]: html(fx("ibps-management-trainees-xvi.html")) });
    const r = await readOfficialListing(index, "RESULT", fetchPage, { portalUrl: "https://www.ibps.in" });
    expect(calls).toEqual([index, xvi, xv]); // xv unreachable here: skipped, not fatal
    expect(r.fetchMode).toBe("html");
    expect(r.heading).toMatch(/Probationary Officers \/ Management Trainees XVI/);
    const res = r.links.find((l) => l.anchorText.includes("Result Status of Online Preliminary Examination for CRP-PO/MT-XVI"))!;
    expect(res.anchorText.startsWith("23 Sep 2026")).toBe(true);
    expect(res.access).toBe("login");
    expect(r.links.filter((l) => l.access === "login").map((l) => new URL(l.url).pathname)).toEqual([
      "/crppoxvijun26/scdw_sept26/login.php",
      "/crppoxvijun26/oecla_sep26/login.php",
      "/crppoxvijun26/restza_sep26/login.php",
    ]);
    // No answer key on the page: the crawl records it "empty", not browser-only.
    expect(r.links.filter((l) => classifyLink(`${l.anchorText} ${l.rowText}`).ak)).toEqual([]);
    expect(r.status).toBe(`IBPS cycle pages: read ${xvi}; ${xv} unreadable (unreachable (timeout))`);
  });

  it("the newest cycle page is required: an older cycle never stands in for it", async () => {
    const { fetchPage } = fakeFetch({ [index]: html(fx("ibps-management-trainees.html")), [xv]: html(fx("ibps-management-trainees-xvi.html")) });
    const r = await readOfficialListing(index, "RESULT", fetchPage, { portalUrl: "https://www.ibps.in" });
    expect(r.fetchMode).toBe("blocked");
    expect(r.status).toBe(`IBPS newest cycle page ${xvi}: unreachable (timeout)`);
    expect(r.links).toEqual([]);
  });

  it("the result is dated and named, but our fetch of the login page is refused: gate 2, nothing written", async () => {
    const { fetchPage } = fakeFetch({ [index]: html(fx("ibps-management-trainees.html")), [xvi]: html(fx("ibps-management-trainees-xvi.html")) });
    const r = await readOfficialListing(index, "RESULT", fetchPage, { portalUrl: "https://www.ibps.in" });
    const res = r.links.find((l) => l.anchorText.includes("Result Status"))!;
    const c = ctx({
      portalUrl: "https://www.ibps.in",
      examTerms: examTermsFor({ shortName: "IBPS PO", name: "IBPS Probationary Officer (Prelims)" }, ["CRP PO/MT"]),
      cycleYears: ["2026"],
      notBefore: day("2026-08-22"),
      lastExamDay: day("2026-08-23"),
      sittingLabels: ["Prelims exam (Day 1)", "Prelims exam (Day 2)"],
    });
    const stand = releaseGate(cand("RESULT", res, index), c, { status: 200, contentType: "text/html", head: "<html>", finalUrl: null });
    expect(stand.ok && stand.release.releasedOn.toISOString().slice(0, 10)).toBe("2026-09-23");
    const real = releaseGate(cand("RESULT", res, index), c, { status: 500, contentType: "text/html", head: "", finalUrl: res.url });
    expect(real).toMatchObject({ ok: false, gate: 2, reason: "HTTP 500" });
  });
});

describe("RRB: region tables behind a cookie firewall", () => {
  const region = "https://rrb.indianrailways.gov.in/chandigarh";
  const tracker = rrbCategoryUrl("chandigarh", "Objection Tracker");
  const results = rrbCategoryUrl("chandigarh", "Exam Results");
  const selection = rrbCategoryUrl("chandigarh", "Selection List");

  it("regions and category pages", () => {
    expect(rrbRegionOf("https://rrb.indianrailways.gov.in")).toBe("chandigarh");
    expect(rrbRegionOf("https://rrb.indianrailways.gov.in/chennai")).toBe("chennai");
    expect(rrbRegionOf("https://www.rrbcdg.gov.in/")).toBe("chandigarh");
    expect(rrbRegionOf("https://rrb.indianrailways.gov.in/getdata?loc=mumbai&category=Exam%20Results")).toBe("mumbai");
    expect(rrbListingPages("https://rrb.indianrailways.gov.in", "RESULT")).toEqual([results, selection]);
    expect(rrbListingPages(tracker, "ANSWER_KEY")).toEqual([tracker]);
    expect(isFirewallPage(fx("rrb-request-rejected.html"))).toBe(true);
  });

  it("rows: 'CEN · Title · Description · Date', one link per file the row offers", () => {
    const links = parseRrbTable(fx("rrb-chandigarh-exam-results.html"), results);
    const cbt2 = links.filter((l) => l.rowText === "CEN 05/2025 · Exam Results · CBT-2 Result & Cut-Off : List of candidates shortlisted for Document Verification · 16-09-2026");
    expect(cbt2.map((l) => l.url)).toEqual([
      "https://rrb.indianrailways.gov.in/-/image/1789545913323052025JE-CBT2_Result.pdf/examsDocuments",
      "https://rrb.indianrailways.gov.in/-/image/1789545913324052025JE-CBT2_Result_Cutoff.pdf/examsDocuments",
    ]);
    expect(cbt2[0].anchorText).toBe("CBT-2 Result & Cut-Off : List of candidates shortlisted for Document Verification (Hindi & English)");
    // The score-card logins are TCS's site, not RRB's: gate 1 refuses them before any request.
    const tcs = links.find((l) => l.url.startsWith("https://rrb.digialm.com/"))!;
    expect(releaseGate(cand("RESULT", tcs, results), ctx({ portalUrl: "https://rrb.indianrailways.gov.in", examTerms: ["cbt"], cycleYears: ["2026"], notBefore: day("2026-07-01") }), null)).toMatchObject({ gate: 1 });
  });

  it("the reader loads the region page first (its cookies), then the kind's tables", async () => {
    const { fetchPage, calls } = fakeFetch({ [region]: html("<html><title>RRB</title><a href='/chandigarh/connect/rti'>RTI</a></html>"), [tracker]: html(fx("rrb-chandigarh-objection-tracker.html")) });
    const r = await readOfficialListing("https://rrb.indianrailways.gov.in", "ANSWER_KEY", fetchPage, { portalUrl: "https://rrb.indianrailways.gov.in" });
    expect(calls).toEqual([region, tracker]);
    expect(r).toMatchObject({ adapter: "rrb", fetchMode: "html", heading: "" });
    const notice = r.links.find((l) => l.rowText.startsWith("CEN 07/2025 · Objection Tracker · Notice for viewing and downloading questions and responses"))!;
    expect(notice.url).toMatch(/^https:\/\/rrb\.indianrailways\.gov\.in\/-\/image\/.+\/examsDocuments$/);
    expect(notice.rowText.endsWith("· 23-09-2026")).toBe(true);
    expect(classifyLink(`${notice.anchorText} ${notice.rowText}`).ak).toBe(true);
  });

  it("no made-up heading: a research term like 'RRB' never names the exam for every row", async () => {
    const { fetchPage } = fakeFetch({ [region]: html("<html><title>RRB</title></html>"), [results]: html(fx("rrb-chandigarh-exam-results.html")), [selection]: html("<table></table>") });
    const r = await readOfficialListing("https://rrb.indianrailways.gov.in", "RESULT", fetchPage, { portalUrl: "https://rrb.indianrailways.gov.in" });
    expect(r.fetchMode).toBe("html");
    const groupD = examTermsFor({ shortName: "RRB Group D", name: "RRB Group D Level 1" }, ["RRB"]);
    expect(r.heading).toBe("");
    expect(examNamed(r.heading, groupD)).toBe(false); // the crawl's singleExam stays false
    expect(r.pageText).not.toMatch(/RRB chandigarh/);
    // The JE CBT-2 result names no exam: with no single-exam heading the gate refuses it as Group D's.
    const je = r.links.find((l) => l.rowText.startsWith("CEN 05/2025 · Exam Results · CBT-2 Result"))!;
    const c = ctx({ portalUrl: "https://rrb.indianrailways.gov.in", examTerms: groupD, cycleYears: ["2025", "2026"], notBefore: day("2026-08-01"), sittingLabels: ["Group D CBT"] });
    expect(releaseGate(cand("RESULT", je, results), c, pdf)).toMatchObject({ ok: false, gate: 3, reason: "the exam is not named beside the link" });
  });

  it("the time guard stops a read between its requests: 'time guard', not blocked", async () => {
    const { fetchPage, calls } = fakeFetch({ [region]: html("<html><title>RRB</title></html>"), [tracker]: html(fx("rrb-chandigarh-objection-tracker.html")) });
    const r = await readOfficialListing("https://rrb.indianrailways.gov.in", "ANSWER_KEY", fetchPage, {
      portalUrl: "https://rrb.indianrailways.gov.in",
      outOfTime: () => calls.length >= 1,
    });
    expect(calls).toEqual([region]);
    expect(r).toMatchObject({ fetchMode: "blocked", timeGuard: true, status: `time guard: stopped before ${tracker}`, requests: 1, links: [] });
  });

  it("a firewall page is unreadable, never a listing", async () => {
    const { fetchPage } = fakeFetch({ [region]: html("<html><title>RRB</title></html>"), [tracker]: html(fx("rrb-request-rejected.html")) });
    const r = await readOfficialListing(tracker, "ANSWER_KEY", fetchPage, { portalUrl: "https://rrb.indianrailways.gov.in" });
    expect(r.fetchMode).toBe("blocked");
    expect(r.status).toMatch(/firewall 'Request Rejected' page/);
  });

  // NTPC runs two CENs at once (graduate 06/2025, undergraduate 07/2025) whose
  // stages share names; the tracker's labels carry the CEN.
  const ntpc = (o: Partial<GateContext> = {}) =>
    ctx({
      portalUrl: "https://rrb.indianrailways.gov.in",
      examTerms: examTermsFor({ shortName: "RRB NTPC", name: "Railway Recruitment Board NTPC" }),
      cycleYears: ["2025", "2026"],
      notBefore: day("2026-09-17"),
      sittingLabels: ["Undergraduate CBT-2 (CEN 07/2025)"],
      ...o,
    });

  it("the CBT-2 key notice names only its CEN, not the exam: the gate refuses it (gate 3)", () => {
    const links = parseRrbTable(fx("rrb-chandigarh-objection-tracker.html"), tracker);
    const notice = links.find((l) => l.rowText.startsWith("CEN 07/2025 · Objection Tracker · Notice for viewing"))!;
    expect(releaseGate(cand("ANSWER_KEY", notice, tracker), ntpc(), pdf)).toMatchObject({ ok: false, gate: 3, reason: "the exam is not named beside the link" });
  });

  it("another CEN's NTPC result is never the due CEN's (the cen marker family)", () => {
    const links = parseRrbTable(fx("rrb-chandigarh-exam-results.html"), results);
    const ug2024 = links.find((l) => l.rowText.startsWith("CEN 06/2024 · Exam Results · NTPC-UG : Result & Cut-OFF"))!;
    const v = releaseGate(cand("RESULT", ug2024, results), ntpc({ examTerms: examTermsFor({ shortName: "RRB NTPC", name: "Railway Recruitment Board NTPC" }, ["NTPC"]) }), pdf);
    expect(v).toMatchObject({ ok: false, gate: 3 });
    expect(!v.ok && v.reason).toMatch(/^the text names another sitting\/stage \(cen: /);
  });

  it("cen markers", () => {
    expect([...sittingMarkers("CEN No. 6/2025 NTPC(Graduate)")]).toEqual(["cen:06/2025"]);
    expect([...sittingMarkers("Undergraduate CBT-2 (CEN 07/2025)")].sort()).toEqual(["cbt:2", "cen:07/2025"]);
    expect(markerConflict(sittingMarkers("CEN 07/2025 CBT-2"), sittingMarkers("CEN 06/2025 · CBT-2 Result"))).toBe("cen");
    expect(markerConflict(sittingMarkers("CEN 07/2025 CBT-2"), sittingMarkers("CBT-2 Result"))).toBeNull(); // silent side: no conflict
    expect([...sittingMarkers("RPF 01/2024 · Exam Results")]).toEqual([]);
  });
});

describe("one read per listing for a run / crawl", () => {
  it("keys by what is actually read", () => {
    const tracker = rrbCategoryUrl("chandigarh", "Objection Tracker");
    expect(listingReadKey("https://ssc.gov.in/home/answer-key", "ANSWER_KEY", "https://ssc.gov.in")).toBe(
      listingReadKey("https://ssc.gov.in/answer-key", "RESULT", "https://www.ssc.gov.in/"),
    );
    expect(listingReadKey("https://www.rrbcdg.gov.in/", "ANSWER_KEY", null)).toBe(listingReadKey(tracker, "ANSWER_KEY", null));
    expect(listingReadKey("https://www.rrbcdg.gov.in/", "ANSWER_KEY", null)).not.toBe(listingReadKey("https://www.rrbcdg.gov.in/", "RESULT", null));
    expect(listingReadKey("https://upsc.gov.in/whats-new/", "ANSWER_KEY", null)).toBe(listingReadKey("https://www.upsc.gov.in/whats-new", "RESULT", null));
  });

  it("shares one read (and its requests) between callers; a time-guard stop is not kept", async () => {
    const api = sscRecordsUrl("answer-key");
    const { fetchPage, calls } = fakeFetch({ [api]: json(fx("ssc-records-answer-key.json")) });
    const cache = new ListingReadCache();
    const o = { portalUrl: "https://ssc.gov.in" };
    const [a, b] = await Promise.all([
      cache.read("https://ssc.gov.in/home/answer-key", "ANSWER_KEY", fetchPage, o),
      cache.read("https://ssc.gov.in/home/answer-key/", "ANSWER_KEY", fetchPage, o),
    ]);
    const c = await cache.read("https://ssc.gov.in/answer-key", "ANSWER_KEY", fetchPage, o);
    expect(calls).toEqual([api]);
    expect([a.fresh, b.fresh, c.fresh]).toEqual([true, false, false]);
    expect(c.read.links).toHaveLength(10);

    const guarded = new ListingReadCache();
    const stopped = await guarded.read("https://ssc.gov.in/home/answer-key", "ANSWER_KEY", fetchPage, { ...o, outOfTime: () => true });
    expect(stopped.read.timeGuard).toBe(true);
    const again = await guarded.read("https://ssc.gov.in/home/answer-key", "ANSWER_KEY", fetchPage, o);
    expect([again.fresh, again.read.fetchMode]).toEqual([true, "html"]);
  });
});

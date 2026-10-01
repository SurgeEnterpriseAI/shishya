// Official watch — the dry crawl of 30 Sep 2026 (1 Oct 2026 regression).
//
// The crawl (D:/CodexProjects/shishya-data/answer-keys/crawl-2026-09-30,
// report.json) found 6 current-cycle releases and only 1 was right. The rows
// below are the bodies' own rows exactly as that report read them (anchor /
// row text, link, listing), with each exam's tracker sitting as the crawl saw
// it (latestHeldSitting on 30 Sep: labels, days, cycle years) and the research
// terms each listing printed (the watch's examTerms). What went wrong:
//   1. RRB_ALP  CEN 01/2025 CBT-2 key notice 05-08-2026 (+ Hindi): RIGHT.
//   2. SSC_CHSL FRTA shortlist 17-08-2026 labelled "SSC CHSL 2025 Typing Test"
//      — the tracker's latest sitting (s.last.label), never in the row.
//   3. UP_POLICE_SI final selection result 14-07-2026 labelled "PET
//      conducted (SI Civil Police)" — the same path.
//   4. MH_MHTCET PCB 2nd-attempt press note labelled "PCM Group Second Attempt
//      exam"; its "siblings" = every other verified link (PCM / PCB first
//      attempt, Nursing CET, DPN/PHN CET). Nursing / DPN-PHN were named only
//      through the page heading, which "named" MHT-CET as a word bag
//      ("State Common Entrance Test Cell · GOVERNMENT OF MAHARASHTRA").
//   5. GJ_GPSC_CLASS12 key of Adv 41/2026-27 (District Education Officer):
//      word bag "gujarat administrative class 1" (Gujarat Educational Service,
//      Class-1, (Administrative Branch)).
//   6. GJ_GPSC_CLASS12 result of Adv 22/2026-27 (Law Officer, Class-2): the
//      exam's own short name "gpsc class 1 2" as a word bag — "in GPSC",
//      "Class-2", and "1" from the vacancy column.
// No DB, no network, no model.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

import {
  bodyTitle,
  classifyLink,
  examNamed,
  examTermsFor,
  fileWords,
  groupReleases,
  htmlText,
  releaseGate,
  releaseLabel,
  termsPrinted,
  verifiedStage,
  type GateContext,
  type LinkFetch,
  type ReleaseCandidate,
  type VerifiedRelease,
  type WatchKind,
} from "@/lib/answer-key-watch";
import { isTwinOfRelease } from "@/lib/answer-key-watch-db";
import { parseRrbTable } from "@/lib/official-listings";

// The crawl ran 30 Sep 2026, ~23:30 IST.
const NOW = new Date("2026-09-30T18:00:00Z");
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const pdf: LinkFetch = { status: 200, contentType: "application/pdf", head: "%PDF-1.5", finalUrl: null };
const page: LinkFetch = { status: 200, contentType: "text/html", head: "<html>", finalUrl: null };

interface Exam {
  shortName: string;
  name: string;
  portal: string;
}
interface Sitting {
  notBefore: string;
  lastDay: string;
  labels: string[];
  otherSittingThisYear: boolean;
  cycleYears: string[];
}

/** The crawl's GateContext (scripts/crawl-official-answer-keys.ts ctxFor):
 *  the first read (baselined: false), the page's heading only when it names
 *  the exam. */
function crawlCtx(exam: Exam, researchTerms: string[], s: Sitting, heading: string | null = null): GateContext {
  const examTerms = examTermsFor(exam, researchTerms);
  return {
    portalUrl: exam.portal,
    examTerms,
    cycleYears: s.cycleYears,
    notBefore: day(s.notBefore),
    lastExamDay: day(s.lastDay),
    sittingLabels: s.labels,
    ordinalNames: [exam.shortName],
    examNames: [exam.name],
    otherSittingThisYear: s.otherSittingThisYear,
    known: new Set<string>(),
    baselined: false,
    singleExamHeading: heading && examNamed(heading, examTerms) ? heading : null,
    now: NOW,
  };
}

/** A candidate from a report row: `text` is "anchor · row" as the report
 *  stored it. */
function row(kind: WatchKind, url: string, listingUrl: string, anchorText: string, text: string): ReleaseCandidate {
  const rowText = anchorText && text.startsWith(`${anchorText} · `) ? text.slice(anchorText.length + 3) : text;
  return { kind, url, listingUrl, anchorText, rowText, via: "html" };
}

function gateAll(cands: ReleaseCandidate[], ctx: GateContext) {
  const passed: VerifiedRelease[] = [];
  const refused: { url: string; gate: number; reason: string }[] = [];
  for (const c of cands) {
    const v = releaseGate(c, ctx, /\.pdf/i.test(c.url) ? pdf : page);
    if (v.ok) passed.push(v.release);
    else refused.push({ url: c.url, gate: v.gate, reason: v.reason });
  }
  return { passed, refused, ...groupReleases(passed, (r) => r, ctx) };
}

// ── #1 RRB ALP: right, and must stay so ───────────────────────────────────

const ALP: Exam = { shortName: "RRB ALP", name: "Railway Assistant Loco Pilot (CBT-1)", portal: "https://rrb.indianrailways.gov.in" };
const ALP_SITTING: Sitting = { notBefore: "2026-07-28", lastDay: "2026-07-28", labels: ["CEN 01/2025 CBT 2 Exam"], otherSittingThisYear: false, cycleYears: ["2025", "2026"] };
const RRB_TRACKER = "https://rrb.indianrailways.gov.in/getdata?loc=chandigarh&category=Objection%20Tracker";
const alpRow = (lang: "English" | "Hindi", id: string) =>
  row(
    "ANSWER_KEY",
    `https://rrb.indianrailways.gov.in/-/image/${id}Notice_on_Answer_Key_and_Raising_of_Objection_CEN_No._01_2025(ALP)_CBT-2__${lang}.pdf/examsDocuments`,
    RRB_TRACKER,
    `Notice and Link for viewing and downloading questions and responses with option to raise objections against questions and answer keys (${lang})`,
    `Notice and Link for viewing and downloading questions and responses with option to raise objections against questions and answer keys (${lang}) · CEN 01/2025 · Objection Tracker · Notice and Link for viewing and downloading questions and responses with option to raise objections against questions and answer keys · 05-08-2026`,
  );

describe("#1 RRB_ALP — CEN 01/2025 CBT-2 key notice (right on 30 Sep): passes as before", () => {
  const ctx = crawlCtx(ALP, ["CEN 01/2024(ALP)", "CEN 01/2025"], ALP_SITTING);
  const r = gateAll([alpRow("English", "1786094901745"), alpRow("Hindi", "1786094901749")], ctx);
  it("one release, printed 2026-08-05, the Hindi notice its sibling", () => {
    expect(r.refused).toEqual([]);
    expect(r.groups).toHaveLength(1);
    const g = r.groups[0];
    expect(g.release.url).toMatch(/CBT-2__English\.pdf/);
    expect(g.release.releasedOn.toISOString().slice(0, 10)).toBe("2026-08-05");
    expect(g.release.dateSource).toBe("printed");
    expect(g.siblings.map((s) => s.url)).toEqual([expect.stringMatching(/CBT-2__Hindi\.pdf/)]);
    expect(r.held).toEqual([]);
  });
  it("the same label: the row names CEN 01/2025, the body's file names CBT-2", () => {
    const g = r.groups[0].release;
    expect(g.stageFrom).toBe("sitting");
    expect(releaseLabel("ANSWER_KEY", g.text, g.stage)).toBe("Answer key — CEN 01/2025 CBT 2 Exam");
  });
});

// The re-verify run of 1 Oct lost #1: the crawl checks which research terms
// the page prints, and RRB's table prints "01/2025" under a "CEN Number"
// header — no "CEN 01/2025" phrase in its text (the word bag had matched
// "cen" + "01" + "2025" anywhere). The adapter's row names the column.
describe("#1 RRB_ALP through the crawl's own path, on the saved RRB objection tracker (30 Sep 2026)", () => {
  const fixture = fs.readFileSync(path.join(process.cwd(), "tests/fixtures/official-listings/rrb-chandigarh-objection-tracker.html"), "utf8");
  const links = parseRrbTable(fixture, RRB_TRACKER);
  const research = ["Assistant Loco Pilot", "ALP", "CEN 01/2024(ALP)", "CEN 01/2025"];
  const printed = termsPrinted(research, { pageText: htmlText(fixture), links });
  it("'CEN 01/2025' counts as printed (the adapter's row), terms the page never prints do not", () => {
    expect(printed).toContain("CEN 01/2025");
    expect(printed).not.toContain("Assistant Loco Pilot");
  });
  it("every answer-key row of the page through the gate → one release: the English CBT-2 notice, the Hindi one its sibling; other CENs refused", () => {
    const ctx = crawlCtx(ALP, printed, ALP_SITTING);
    const kindLinks = links.filter((l) => classifyLink(`${l.anchorText} ${l.rowText}`).ak);
    const r = gateAll(
      kindLinks.map((l) => ({ kind: "ANSWER_KEY" as const, url: l.url, listingUrl: RRB_TRACKER, anchorText: l.anchorText, rowText: l.rowText, via: "html" as const })),
      ctx,
    );
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0].release.url).toMatch(/CEN_No\._01_2025\(ALP\)_CBT-2__English\.pdf/);
    expect(r.groups[0].siblings.map((s) => s.url)).toEqual([expect.stringMatching(/CBT-2__Hindi\.pdf/)]);
    expect(releaseLabel("ANSWER_KEY", r.groups[0].release.text, r.groups[0].release.stage)).toBe("Answer key — CEN 01/2025 CBT 2 Exam");
    // Off-host links (the crawl never even requests them) fail gate 1; every
    // other CEN's row fails on the exam's name or its date.
    const onHost = r.refused.filter((x) => x.gate !== 1);
    expect(onHost.length).toBeGreaterThan(0);
    expect(onHost.map((x) => `${x.gate}: ${x.reason}`).filter((s) => !/^3: the exam is not named|^5: /.test(s))).toEqual([]);
  });
});

// ── #2 SSC CHSL: right document, the stage the row never names ────────────

const CHSL: Exam = { shortName: "SSC CHSL", name: "SSC Combined Higher Secondary Level (Tier 1)", portal: "https://ssc.gov.in" };
const CHSL_SITTING: Sitting = {
  notBefore: "2026-04-10",
  lastDay: "2026-04-22",
  labels: ["SSC CHSL 2025 Tier 2 exam", "SSC CHSL 2025 Typing Test"],
  otherSittingThisYear: false,
  cycleYears: ["2025", "2026"],
};
const FRTA = row(
  "RESULT",
  "https://ssc.gov.in/api/attachment/uploads/masterData/Results/ROLL_17082026.pdf",
  "https://ssc.gov.in/home/candidate-result",
  "Result",
  "Result · 17-08-2026 · Combined Higher Secondary (10+2) Level Examination, 2025: List of Candidates in Roll Number Order provisionally shortlisted for First Round of Tentative Allocation (FRTA) for the post of DEO/LDC/JSA/JHAA",
);

describe("#2 SSC_CHSL — FRTA shortlist 17-08-2026: passes, labelled with the row's words", () => {
  const ctx = crawlCtx(CHSL, ["Combined Higher Secondary (10+2) Level Examination", "Combined Higher Secondary Level (10+2) Examination"], CHSL_SITTING);
  const r = gateAll([FRTA], ctx);
  it("passes, dated as printed", () => {
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0].release.releasedOn.toISOString().slice(0, 10)).toBe("2026-08-17");
  });
  it("the label never says 'Typing Test' (nor 'Tier 2'): it is the row's own title", () => {
    const g = r.groups[0].release;
    const label = releaseLabel("RESULT", g.text, g.stage);
    expect(label).not.toMatch(/typing|tier/i);
    expect(g.stageFrom).toBe("body");
    expect(label).toBe("Result — SSC CHSL 2025: List of Candidates provisionally shortlisted for First Round of Tentative Allocation (FRTA) for DEO/LDC/JSA/JHAA");
    expect(label.length).toBeLessThanOrEqual(170);
  });
});

// ── #3 UP Police SI: right document, "PET" never printed ───────────────────

const UPSI: Exam = { shortName: "UP Police SI", name: "UP Police Sub-Inspector (SI)", portal: "https://uppbpb.gov.in" };
const UPSI_SITTING: Sitting = { notBefore: "2026-06-29", lastDay: "2026-06-29", labels: ["PET conducted (SI Civil Police)"], otherSittingThisYear: true, cycleYears: ["2026"] };
const UP_TITLE = "उपनिरीक्षक नागरिक पुलिस एवं समकक्ष पदों पर सीधी भर्ती – 2025 के अन्तिम चयन परिणाम की सूचना / विज्ञप्ति का प्रकाशन";
const UP_FINAL = row(
  "RESULT",
  "https://uppbpb.gov.in/FilesUploaded/Notice/14-07-2026%20UPSI2025%20VIGYPTI944a5675-a3d4-4ac6-a52f-f476f72e81c1.pdf",
  "https://uppbpb.gov.in/Home/Notice",
  `${UP_TITLE} । [ Notice Board ] Click to view more`,
  `${UP_TITLE} । [ Notice Board ] Click to view more · ${UP_TITLE} । [ Notice Board ] Date : 14-07-2026`,
);

describe("#3 UP_POLICE_SI — final selection result 14-07-2026: passes, never labelled PET", () => {
  const ctx = crawlCtx(UPSI, ["उपनिरीक्षक नागरिक पुलिस", "Sub-Inspector Civil Police", "SI Civil Police"], UPSI_SITTING);
  const r = gateAll([UP_FINAL], ctx);
  it("passes, dated as printed", () => {
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0].release.releasedOn.toISOString().slice(0, 10)).toBe("2026-07-14");
  });
  it("the label carries the body's own Hindi words — no English stage the row does not say", () => {
    const g = r.groups[0].release;
    const label = releaseLabel("RESULT", g.text, g.stage);
    expect(label).not.toMatch(/PET|conducted/i);
    expect(label).toBe(`Result — ${UP_TITLE}`);
    expect(label).not.toMatch(/Notice Board|Click|Date/);
  });
});

// ── #4 MHT-CET: the PCB second-attempt result, same-release siblings only ──

const MHT: Exam = { shortName: "MHT-CET", name: "Maharashtra Common Entrance Test (MHT-CET)", portal: "https://cetcell.mahacet.org" };
const MHT_SITTING: Sitting = {
  notBefore: "2026-05-10",
  lastDay: "2026-05-12",
  labels: ["PCB Group Second Attempt exam", "PCM Group Second Attempt exam"],
  otherSittingThisYear: true,
  cycleYears: ["2026"],
};
const MHT_NOTICES = "https://cetcell.mahacet.org/notices/";
const MHT_HEADING = "Notices - State Common Entrance Test Cell · GOVERNMENT OF MAHARASHTRA · Notices · Syllabus and Marking Scheme";
const up = (f: string) => `https://cetcell.mahacet.org/wp-content/uploads/2026/06/${f}`;
const PCB2 = row("RESULT", up("Press-Note-MHT-CET-PCB-Group-2nd-Attempt-2026.pdf"), MHT_NOTICES, "", "5 MHT-CET (PCB Group) Result Summary :MHT-CET 2026 ((PCB ) Second Attempt) 18/06/2026");
const PCM1 = row("RESULT", up("Press-Note-MHT-CET-PCM-Group-1st-Attempt_-2026.pdf"), MHT_NOTICES, "", "7 MHT-CET 2026 ((PCM ) First Attempt)) Result Summary :MHT-CET 2026 ((PCM ) First Attempt)) 16/06/2026");
const PCB1 = row("RESULT", up("Notification_PCB_1st-Attempt-Result.pdf"), MHT_NOTICES, "", "9 MHT-CET (PCB Group) Result Summary :MHT-CET 2026 (PCB Group First Attempt) 09/06/2026");
const DPN = row("RESULT", up("Notice-No.09_Result-Declaration_DPN-PHN-CET-2026.pdf"), MHT_NOTICES, "", "5 MH – DPN/PHN CET NOTICE NO. 09: MH – DPN/PHN CET-2026 DECLARATION OF RESULT MH- 11/06/2026");
const NURSING = row("RESULT", up("Notice-No.09_Result-Declaration_NURSING-CET-2026.pdf"), MHT_NOTICES, "", "6 MH &#8211; NURSING CET NOTICE NO. 09: MH &#8211; NURSING CET-2026 DECLARATION OF RESULT 11/06/2026");

describe("#4 MH_MHTCET — only the PCB second-attempt result, only same-release siblings", () => {
  const ctx = crawlCtx(MHT, ["MHT-CET", "MHT CET", "Maharashtra Common Entrance Test", "MAH-MHT-CET"], MHT_SITTING, MHT_HEADING);
  const r = gateAll([PCB2, PCM1, PCB1, DPN, NURSING], ctx);
  it("the State CET Cell's heading no longer 'names' MHT-CET (it was a word bag)", () => {
    expect(ctx.singleExamHeading).toBeNull();
    expect(examNamed(MHT_HEADING, ctx.examTerms)).toBe(false);
  });
  it("one release: the PCB second-attempt press note, 18-06-2026, with no siblings", () => {
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0].release.url).toBe(PCB2.url);
    expect(r.groups[0].release.releasedOn.toISOString().slice(0, 10)).toBe("2026-06-18");
    expect(r.groups[0].siblings).toEqual([]);
    expect(r.held).toEqual([]);
  });
  it("labelled PCB — the sitting label whose markers (group:pcb, attempt:2) the row names", () => {
    const g = r.groups[0].release;
    expect(g.stageFrom).toBe("sitting");
    expect(releaseLabel("RESULT", g.text, g.stage)).toBe("Result — PCB Group Second Attempt exam");
  });
  it("PCM / PCB first attempt: refused on the attempt marker; Nursing and DPN/PHN CET: not this exam", () => {
    const why = (u: string) => r.refused.find((x) => x.url === u);
    expect(why(PCM1.url)).toMatchObject({ gate: 3, reason: expect.stringMatching(/^the text names another sitting\/stage \(attempt: /) });
    expect(why(PCB1.url)).toMatchObject({ gate: 3, reason: expect.stringMatching(/^the text names another sitting\/stage \(attempt: /) });
    expect(why(DPN.url)).toMatchObject({ gate: 3, reason: "the exam is not named beside the link" });
    expect(why(NURSING.url)).toMatchObject({ gate: 3, reason: "the exam is not named beside the link" });
  });
  it("even on a page whose heading named MHT-CET, the Nursing / DPN-PHN CET rows are another CET (cet marker)", () => {
    const headed = { ...ctx, singleExamHeading: "MHT-CET 2026 — Notices" };
    for (const c of [DPN, NURSING]) {
      const v = releaseGate(c, headed, pdf);
      expect(v).toMatchObject({ ok: false, gate: 3, reason: expect.stringMatching(/^the text names another sitting\/stage \(cet: /) });
    }
  });
  it("the twin filter uses the verified stage: the PCB result archives the PCB estimate, never the PCM one", () => {
    const g = r.groups[0].release;
    expect(isTwinOfRelease({ label: "Result for PCB Second Attempt" }, g, g.stage!, ["MHT-CET"])).toBe(true);
    expect(isTwinOfRelease({ label: "Result for PCM Second Attempt" }, g, g.stage!, ["MHT-CET"])).toBe(false);
    expect(isTwinOfRelease({ label: "PCB 1st attempt result" }, g, g.stage!, ["MHT-CET"])).toBe(false);
    // What the tracker's latest sitting (the old stage) would have archived:
    expect(isTwinOfRelease({ label: "Result for PCM Second Attempt" }, g, "PCM Group Second Attempt exam", ["MHT-CET"])).toBe(true);
  });
});

// ── #5 / #6 GPSC: other recruitments, refused on naming ───────────────────

const GPSC: Exam = { shortName: "GPSC Class 1-2", name: "GPSC Class 1-2 Prelims", portal: "https://gpsc.gujarat.gov.in" };
const GPSC_SITTING: Sitting = { notBefore: "2026-06-07", lastDay: "2026-06-07", labels: ["Preliminary Examination"], otherSittingThisYear: true, cycleYears: ["2026"] };
const GPSC_TERMS = ["Gujarat Administrative Service, Class-I", "Gujarat Civil Services, Class-I and Class-II", "Gujarat Municipal Chief Officer Service, Class-II"];
const DEO_KEY = row(
  "ANSWER_KEY",
  "https://gpsc.gujarat.gov.in/Documents/AdvertismentDocument/PAK-41-202627-BVZ.pdf",
  "https://gpsc.gujarat.gov.in/StageDocument?name=answerkey",
  "Provisional Key (Prelim) - 41/2026-27 (Concerned Subject )",
  "Provisional Key (Prelim) - 41/2026-27 (Concerned Subject ) · 41/2026-27 District Education Offficer/District Primary Education Officer and Equivalent, Gujarat Educational Service, Class-1, (Administrative Branch) (Special Recruitment-PwD- Second Attempt) Provisional Key (Prelim) - 41/2026-27 (Concerned Subject ) 22-09-2026 12:06 PM",
);
const LAW_RESULT = row(
  "RESULT",
  "https://gpsc.gujarat.gov.in/AdvertisementDetail?no=2350&tab=",
  "https://gpsc.gujarat.gov.in/dashboard?stage=Result",
  "22/2026-27",
  "22/2026-27 · Law Officer, Class-2 on 11 Months Contractual Basis in GPSC | Class-2 | Other 22/2026-27 1 08-05-2026 01:00 PM - 18-05-2026 11:59 PM 18-09-2026 Interviews / Final Results",
);
const LAW_INTERVIEW = row(
  "RESULT",
  "https://gpsc.gujarat.gov.in/AdvertisementDetail?no=2350&tab=Interview",
  "https://gpsc.gujarat.gov.in/dashboard?stage=Result",
  "Interviews / Final Results",
  "Interviews / Final Results · Law Officer, Class-2 on 11 Months Contractual Basis in GPSC | Class-2 | Other 22/2026-27 1 08-05-2026 01:00 PM - 18-05-2026 11:59 PM 18-09-2026 Interviews / Final Results",
);
const DEPUTY_DIRECTOR = row(
  "RESULT",
  "https://gpsc.gujarat.gov.in/AdvertisementDetail?no=2348&tab=",
  "https://gpsc.gujarat.gov.in/dashboard?stage=Result",
  "11/2026-27",
  "11/2026-27 · Deputy Director, Class-1, Gujarat Statistical Service, General Administration Department (Special Recruitment-PwD-Third Attempt) | 1 | General Administrative Department 11/2026-27 1 05-05-2026 01:00 PM - 19-05-2026 11:59 PM 23-06-2026 Interviews / Final Results",
);

describe("#5 / #6 GJ_GPSC_CLASS12 — another recruitment's key and result: refused on naming", () => {
  const akCtx = crawlCtx(GPSC, GPSC_TERMS, GPSC_SITTING, "Inner Master · Sorry, your browser does not support JavaScript! use chrome for better usability · Loading... · Final Answer Key");
  const resCtx = crawlCtx(GPSC, [...GPSC_TERMS, "Preliminary Examination"], GPSC_SITTING, "GPSC · Sorry, your browser does not support JavaScript! use chrome for better usability · Loading... · Advertisements");
  it("the terms: 'Preliminary Examination' names no exam (dropped); the acronym is never stripped to 'class 1 2 prelims'", () => {
    expect(resCtx.examTerms).not.toContain("preliminary");
    expect(resCtx.examTerms).not.toContain("class 1 2 prelims");
    expect(resCtx.examTerms).toContain("gpsc class 1 2");
    expect(resCtx.examTerms).toContain("gujarat administrative class 1");
  });
  it("#5 the District Education Officer (Adv 41/2026-27) key is refused: the exam is not named", () => {
    expect(releaseGate(DEO_KEY, akCtx, pdf)).toMatchObject({ ok: false, gate: 3, reason: "the exam is not named beside the link" });
  });
  it("#6 the Law Officer (Adv 22/2026-27) result and its siblings are refused: the exam is not named", () => {
    for (const c of [LAW_RESULT, LAW_INTERVIEW, DEPUTY_DIRECTOR]) {
      expect(releaseGate(c, resCtx, page)).toMatchObject({ ok: false, gate: 3, reason: "the exam is not named beside the link" });
    }
  });
  it("…while a row that names the combined GAS / GCS exam as GPSC prints it still passes", () => {
    const gas = row(
      "ANSWER_KEY",
      "https://gpsc.gujarat.gov.in/Documents/AdvertismentDocument/PAK-05-202627-GAS.pdf",
      "https://gpsc.gujarat.gov.in/StageDocument?name=answerkey",
      "Provisional Key (Prelim) - 05/2026-27",
      "Provisional Key (Prelim) - 05/2026-27 · 05/2026-27 Gujarat Administrative Service, Class-1 & Gujarat Civil Service, Class-1 & 2 and Gujarat Municipal Chief Officer Service, Class-2 Provisional Key (Prelim) 10-06-2026 06:00 PM",
    );
    const v = releaseGate(gas, akCtx, pdf);
    expect(v.ok).toBe(true);
    if (v.ok) expect(releaseLabel("ANSWER_KEY", v.release.text, v.release.stage)).toBe("Answer key (provisional) — Preliminary Examination");
  });
});

// ── the rules, one by one ─────────────────────────────────────────────────

describe("exam naming is a phrase (B)", () => {
  it("in order and adjacent, generic words skipped on both sides", () => {
    const t = examTermsFor({ shortName: "X", name: "X" }, ["Gujarat Administrative Service, Class-I"]);
    expect(examNamed("Gujarat Administrative Service, Class-1 (Advt. 5/2026-27)", t)).toBe(true);
    expect(examNamed("Gujarat Educational Service, Class-1, (Administrative Branch)", t)).toBe(false);
    expect(examNamed("Administrative Service of Gujarat, Class-1", t)).toBe(false);
  });
  it("class / stage / place / body words are never a research term's only distinctive words", () => {
    expect(examTermsFor({ shortName: "Exam", name: "Examination (2026)" }, ["Preliminary Examination", "GPSC", "Class-II", "Maharashtra", "Tier-I Examination"])).toEqual([]);
  });
  it("the exam's own acronym name stays whole as a phrase; its stripped class words never stand alone", () => {
    const t = examTermsFor({ shortName: "TNPSC Group 4", name: "TNPSC Group 4 Services" });
    expect(t).toContain("tnpsc group 4");
    expect(t).not.toContain("group 4");
    expect(examNamed("TNPSC Group 4 Services Examination 2026 — Tentative Answer Keys", t)).toBe(true);
    expect(examNamed("TNPSC Group 2 Services — Group 4 posts", t)).toBe(false);
  });
});

describe("the verified stage and the label (A)", () => {
  const ctx = (labels: string[]) => ({ sittingLabels: labels, examTerms: examTermsFor({ shortName: "SSC CGL", name: "SSC Combined Graduate Level" }), ordinalNames: ["SSC CGL"], examNames: ["SSC Combined Graduate Level"] });
  const link = (text: string) => ({ url: "https://ssc.gov.in/api/attachment/x.pdf", anchorText: "Result", rowText: text });
  it("a sitting label only when the row names its markers and its words", () => {
    expect(verifiedStage(link("Combined Graduate Level Examination, 2025 (Tier-II): Result"), ctx(["Tier 1 exam", "Tier 2 exam"]))).toEqual({ stage: "Tier 2 exam", from: "sitting" });
    expect(verifiedStage(link("Combined Graduate Level Examination, 2025: Result"), ctx(["Tier 2 exam"])).from).toBe("body");
    // date words of our labels are no claim; a stage word the row lacks is
    expect(verifiedStage(link("Combined Graduate Level Examination 2025 (Tier-I) result"), ctx(["Tier 1 exam begins", "Tier 1 exam concludes"])).stage).toBe("Tier 1 exam concludes");
    expect(verifiedStage(link("Combined Graduate Level Examination 2025 (Tier-II) result"), ctx(["Tier 2 skill test"])).from).toBe("body");
  });
  it("the body's title: furniture, dates and serial numbers dropped; a tail that only restates the kind dropped", () => {
    const t = { examTerms: examTermsFor({ shortName: "SSC Steno", name: "SSC Stenographer" }), ordinalNames: ["SSC Steno"] };
    expect(bodyTitle({ anchorText: "Download", rowText: "12 Stenographer Grade C and D Examination 2026 : Uploading of Tentative Answer Keys along with Candidates’ Response Sheet(s) (1.2 MB) 23/09/2026 05:30 PM" }, t)).toBe(
      "Stenographer Grade C and D Examination 2026",
    );
    expect(bodyTitle({ anchorText: "Result", rowText: "" }, t)).toBe("");
  });
  it("labels are capped at a word with an ellipsis, never cut mid-word", () => {
    const long = `Result — ${"word ".repeat(60)}`;
    const l = releaseLabel("RESULT", "", long);
    expect(l.length).toBeLessThanOrEqual(170);
    expect(l.endsWith("…")).toBe(true);
    expect(l).not.toMatch(/wor…$/);
  });
});

describe("a single-exam heading speaks only where the row is silent", () => {
  it("a row naming (I) on a page headed (II) is the row's (I) — refused while (II) is due", () => {
    const cds = crawlCtx(
      { shortName: "CDS", name: "Combined Defence Services Examination (II)", portal: "https://upsc.gov.in" },
      [],
      { notBefore: "2026-09-14", lastDay: "2026-09-14", labels: ["CDS 2 2026 exam"], otherSittingThisYear: true, cycleYears: ["2026"] },
    );
    const headed: GateContext = { ...cds, singleExamHeading: "Combined Defence Services Examination (II), 2026" };
    const one = row("RESULT", "https://upsc.gov.in/sites/default/files/FR-CDS-I-2026.pdf", "https://upsc.gov.in/exams-related-info/final-result", "Final Result", "Final Result · Combined Defence Services Examination (I), 2026 · 25/09/2026");
    expect(releaseGate(one, headed, pdf)).toMatchObject({ ok: false, gate: 3, reason: expect.stringMatching(/^the text names another sitting\/stage \(sitting: /) });
    const silent = row("RESULT", "https://upsc.gov.in/sites/default/files/WR-CDS-II-2026.pdf", "https://upsc.gov.in/exams-related-info/written-result", "Written Result", "Written Result · 2026 · 25/09/2026");
    expect(releaseGate(silent, headed, pdf).ok).toBe(true);
  });
});

describe("siblings (C)", () => {
  const ctx = crawlCtx(ALP, ["CEN 01/2025"], ALP_SITTING);
  it("another day and another row → its own release, not a sibling", () => {
    const later = row(
      "ANSWER_KEY",
      "https://rrb.indianrailways.gov.in/-/image/1799Final_Answer_Key_CEN_No._01_2025(ALP)_CBT-2.pdf/examsDocuments",
      RRB_TRACKER,
      "Final answer keys (English)",
      "Final answer keys (English) · CEN 01/2025 · Objection Tracker · Final answer keys · 20-08-2026",
    );
    const r = gateAll([alpRow("English", "1786094901745"), later], ctx);
    expect(r.groups.map((g) => g.siblings.length)).toEqual([0, 0]);
    expect(r.groups).toHaveLength(2);
  });
  it("a link named only by the page heading is never a sibling: held, with the reason", () => {
    const headed: GateContext = { ...ctx, singleExamHeading: "Assistant Loco Pilot CEN 01/2025" };
    const bare = row("ANSWER_KEY", "https://rrb.indianrailways.gov.in/-/image/1786Answer_Key_Notice_2026.pdf/examsDocuments", RRB_TRACKER, "Notice (Hindi)", "Notice (Hindi) · Answer key notice 2026 · 05-08-2026");
    const r = gateAll([alpRow("English", "1786094901745"), bare], headed);
    expect(r.passed).toHaveLength(2);
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0].siblings).toEqual([]);
    expect(r.held).toHaveLength(1);
    expect(r.held[0].reason).toMatch(/its own row does not name the exam/);
  });
});

// 1 Oct 2026 (review of the postgroup / gender families): siblingRefusal
// refused on a gender clash before it looked at the row, so the male and
// female lists of ONE SSC result record split into two releases when the
// female list was read first (two "Result — SSC GD 2026 CBT exam" rows for
// one day), and stayed one when the write-up was read first. One record row
// is one release; two rows that differ by sex are still two.
describe("siblings: the male and female lists of one record row are one release", () => {
  const GD: Exam = { shortName: "SSC GD", name: "SSC GD Constable", portal: "https://ssc.gov.in" };
  const GD_SITTING: Sitting = { notBefore: "2026-02-04", lastDay: "2026-02-25", labels: ["SSC GD 2026 CBT exam"], otherSittingThisYear: false, cycleYears: ["2026"] };
  const ctx = crawlCtx(GD, ["Constable (GD) in Central Armed Police Forces"], GD_SITTING);
  const RESULTS = "https://ssc.gov.in/home/candidate-result";
  const file = (f: string) => `https://ssc.gov.in/api/attachment/uploads/masterData/Results/${encodeURIComponent(f)}`;
  // As the SSC adapter builds a results row: "dd-MM-yyyy · headline", anchors "Result" / "Write Up".
  const ROW =
    "06-04-2026 · Constable (GD) in Central Armed Police Forces (CAPFs), SSF, Rifleman (GD) in Assam Rifles and Sepoy in NCB Examination, 2026: Declaration of result for PET/PST";
  const att = (anchorText: string, f: string): ReleaseCandidate => ({ kind: "RESULT", url: file(f), listingUrl: RESULTS, anchorText, rowText: ROW, via: "html" });
  const FEMALE = att("Result", "List-I (Female).pdf");
  const MALE = att("Result", "List-II (Male).pdf");
  const WRITEUP = att("Write Up", "Write-up GD 2026.pdf");

  it("each list passes the gate (the due sitting names no sex)", () => {
    const r = gateAll([FEMALE, MALE, WRITEUP], ctx);
    expect(r.refused).toEqual([]);
    expect(r.passed).toHaveLength(3);
  });
  it("female list read first → one release, the male list and the write-up its siblings", () => {
    const r = gateAll([FEMALE, MALE, WRITEUP], ctx);
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0].release.url).toBe(FEMALE.url);
    expect(r.groups[0].siblings.map((s) => s.url)).toEqual([MALE.url, WRITEUP.url]);
    expect(r.held).toEqual([]);
  });
  it("any read order → one release with two siblings", () => {
    for (const order of [
      [MALE, FEMALE, WRITEUP],
      [WRITEUP, FEMALE, MALE],
      [FEMALE, WRITEUP, MALE],
    ]) {
      const r = gateAll(order, ctx);
      expect(r.groups.map((g) => g.siblings.length)).toEqual([2]);
    }
  });
  it("two rows that differ by sex, printed the same day, are still two releases", () => {
    const pe = (sex: "Male" | "Female"): ReleaseCandidate => ({
      kind: "RESULT",
      url: file(`PE&MT ${sex} result.pdf`),
      listingUrl: RESULTS,
      anchorText: "Result",
      rowText: `15-09-2026 · Constable (Executive) Male and Female in Delhi Police Examination, 2026 - ${sex} PE&MT result`,
      via: "html",
    });
    const dp = crawlCtx(
      { shortName: "Delhi Police Constable", name: "Delhi Police Constable (Executive)", portal: "https://ssc.gov.in" },
      ["Constable (Executive) Male and Female in Delhi Police Examination", "Delhi Police Examination"],
      { notBefore: "2026-08-01", lastDay: "2026-08-01", labels: ["Delhi Police Constable PE&MT"], otherSittingThisYear: false, cycleYears: ["2026"] },
    );
    const r = gateAll([pe("Female"), pe("Male")], dp);
    expect(r.passed).toHaveLength(2);
    expect(r.groups.map((g) => g.siblings.length)).toEqual([0, 0]);
  });
});

// ── the independent review of the gate fix (1 Oct 2026) ───────────────────
//
// The first fix still let a label name a stage the row does not print: the
// claim step dropped every non-year number ("Paper 2" on a "Paper-I" row),
// every word a marker regex COULD read ("Second Phase" on a "First Phase"
// row) and every word of the research terms, as a bag ("Female PE&MT" on a
// "Male PE&MT" row). The six cases the reviewer reproduced with the real
// functions: each label is now the body's own title, or the sitting label
// the row really names.

describe("review: a label never names a paper / level / phase / group the row does not print", () => {
  const exam = (shortName: string, name: string, portal: string): Exam => ({ shortName, name, portal });
  const sitting = (labels: string[]): Sitting => ({ notBefore: "2026-08-01", lastDay: "2026-08-01", labels, otherSittingThisYear: false, cycleYears: ["2026"] });
  const stageOf = (kind: WatchKind, ctx: GateContext, url: string, rowText: string, anchorText: string) => {
    const v = releaseGate({ kind, url, listingUrl: `${ctx.portalUrl}/list`, anchorText, rowText, via: "html" }, ctx, pdf);
    expect(v.ok).toBe(true);
    if (!v.ok) throw new Error(v.reason);
    return { stage: v.release.stage, from: v.release.stageFrom, label: releaseLabel(kind, v.release.text, v.release.stage) };
  };
  it("A1 CTET: a 'Paper-I' row is labelled 'CTET Paper 1 exam' (the sitting label it names), never 'Paper 2'", () => {
    const ctx = crawlCtx(exam("CTET", "Central Teacher Eligibility Test", "https://ctet.nic.in"), ["Central Teacher Eligibility Test", "CTET"], sitting(["CTET Paper 1 exam", "CTET Paper 2 exam"]));
    const r = stageOf("ANSWER_KEY", ctx, "https://ctet.nic.in/files/ctet-paper1-key.pdf", "CTET September 2026 Paper-I Provisional Answer Key 20/09/2026", "Provisional Answer Key");
    expect(r).toMatchObject({ stage: "CTET Paper 1 exam", from: "sitting" });
    expect(r.label).not.toMatch(/paper 2/i);
  });
  it("A2 MP TET: a 'Varg-2' row is never labelled 'Varg 3'", () => {
    const ctx = crawlCtx(exam("MP TET", "Madhya Pradesh Teacher Eligibility Test (MP TET)", "https://esb.mp.gov.in"), [], sitting(["MP TET Varg 3 2026 exam"]));
    const r = stageOf("RESULT", ctx, "https://esb.mp.gov.in/results/varg2.pdf", "MP TET Varg-2 2026 Result 15/09/2026", "Result");
    expect(r.from).toBe("body");
    expect(r.label).not.toMatch(/varg 3/i);
    expect(r.label).toMatch(/Varg-2/);
  });
  it("B1 CUET UG: a 'First Phase' row is never labelled 'Second Phase'", () => {
    const ctx = crawlCtx(exam("CUET UG", "Common University Entrance Test (UG)", "https://exams.nta.ac.in"), [], sitting(["CUET UG 2026 Second Phase exam"]));
    const r = stageOf("ANSWER_KEY", ctx, "https://exams.nta.ac.in/CUET-UG/first-phase-key.pdf", "CUET UG 2026 First Phase Provisional Answer Key 20/09/2026", "Answer Key");
    expect(r.from).toBe("body");
    expect(r.label).not.toMatch(/second/i);
  });
  it("C1 MP TET: a 'High School' row is never labelled 'Primary School' (research terms are not the exam's name)", () => {
    const ctx = crawlCtx(
      exam("MP TET", "Madhya Pradesh Teacher Eligibility Test (MP TET)", "https://esb.mp.gov.in"),
      ["Primary School Teacher Eligibility Test", "High School Teacher Eligibility Test", "Middle School Teacher Eligibility Test"],
      sitting(["Primary School TET 2026 exam"]),
    );
    const r = stageOf("RESULT", ctx, "https://esb.mp.gov.in/results/hs.pdf", "High School Teacher Eligibility Test 2026 Result 15/09/2026", "Result");
    expect(r.from).toBe("body");
    expect(r.label).not.toMatch(/primary/i);
  });
  // 1 Oct 2026 (review of a326ddb): these two rows were let through with the
  // body's own label; the post group and the sex are now marker families
  // (sitting-markers "postgroup" / "gender"), so the gate refuses the other
  // sitting's row outright — and the label step still never names it.
  it("C2 Delhi Police: a 'Male PE&MT' row is refused while the Female PE&MT is due, and never labelled 'Female PE&MT'", () => {
    const ctx = crawlCtx(
      exam("Delhi Police Constable", "Delhi Police Constable (Executive)", "https://ssc.gov.in"),
      ["Constable (Executive) Male and Female in Delhi Police Examination", "Delhi Police Examination"],
      sitting(["Female PE&MT"]),
    );
    const rowText = "Constable (Executive) Male and Female in Delhi Police Examination, 2026 - Male PE&MT result 15/09/2026";
    const c = { kind: "RESULT" as const, url: "https://ssc.gov.in/api/x/male.pdf", listingUrl: "https://ssc.gov.in/list", anchorText: "Result", rowText, via: "html" as const };
    expect(releaseGate(c, ctx, pdf)).toMatchObject({ ok: false, gate: 3, reason: expect.stringMatching(/^the text names another sitting\/stage \(gender: gender:male; due: gender:female\)/) });
    expect(verifiedStage(c, ctx)).toMatchObject({ from: "body", stage: expect.stringMatching(/Male PE&MT/) });
    expect(verifiedStage(c, ctx).stage).not.toMatch(/^Female/);
    // The male sitting's own row passes, labelled with the sitting it names.
    const male = stageOf("RESULT", { ...ctx, sittingLabels: ["Male PE&MT"] }, c.url, rowText, "Result");
    expect(male).toMatchObject({ stage: "Male PE&MT", from: "sitting" });
  });
  it("HSSC CET: a 'Group C' row is refused while the Group D CET is due (the crawl's real kept terms 'CET', 'CET Group D')", () => {
    const ctx = crawlCtx(exam("HSSC CET", "Haryana Staff Selection Common Eligibility Test (HSSC CET)", "https://hssc.gov.in"), ["CET", "CET Group D"], sitting(["HSSC CET Group D 2026 exam"]));
    const c = {
      kind: "RESULT" as const,
      url: "https://hssc.gov.in/results/cet-group-c-2026.pdf",
      listingUrl: "https://hssc.gov.in/list",
      anchorText: "Result",
      rowText: "CET Group C 2026 Result of Common Eligibility Test 20/09/2026",
      via: "html" as const,
    };
    expect(releaseGate(c, ctx, pdf)).toMatchObject({ ok: false, gate: 3, reason: expect.stringMatching(/^the text names another sitting\/stage \(postgroup: /) });
    expect(verifiedStage(c, ctx).stage).not.toMatch(/group d/i);
    // A Group D row passes; a notice for both groups is no conflict.
    const d = stageOf("RESULT", ctx, "https://hssc.gov.in/results/cet-group-d-2026.pdf", "CET Group D 2026 Result of Common Eligibility Test 20/09/2026", "Result");
    expect(d.label).toMatch(/Group D/);
    expect(releaseGate({ ...c, url: "https://hssc.gov.in/results/cet-2026.pdf", rowText: "CET 2026 for Group C and D posts: Result of Common Eligibility Test 20/09/2026" }, ctx, pdf).ok).toBe(true);
  });
  it("the pinned labels still verify: each reduces to words the row prints", () => {
    const cgl = { examTerms: examTermsFor({ shortName: "SSC CGL", name: "SSC Combined Graduate Level" }), ordinalNames: ["SSC CGL"], examNames: ["SSC Combined Graduate Level"] };
    const link = (rowText: string) => ({ url: "https://ssc.gov.in/api/attachment/x.pdf", anchorText: "Result", rowText });
    expect(verifiedStage(link("Combined Graduate Level Examination, 2025 (Tier-II): Result"), { ...cgl, sittingLabels: ["Tier 1 exam", "Tier 2 exam"] })).toEqual({ stage: "Tier 2 exam", from: "sitting" });
    expect(verifiedStage(link("Combined Graduate Level Examination 2025 (Tier-I) result"), { ...cgl, sittingLabels: ["Tier 1 exam concludes"] })).toEqual({ stage: "Tier 1 exam concludes", from: "sitting" });
    // a year the label names must be printed; the exam's own short name is no claim
    expect(verifiedStage(link("Combined Graduate Level Examination 2025 (Tier-I) result"), { ...cgl, sittingLabels: ["SSC CGL 2025 Tier 1 exam"] }).from).toBe("sitting");
    expect(verifiedStage(link("Combined Graduate Level Examination 2026 (Tier-I) result"), { ...cgl, sittingLabels: ["SSC CGL 2025 Tier 1 exam"] }).from).toBe("body");
  });
});

describe("review: bodyTitle never swaps in a short name that carries a stage", () => {
  it("UPSC Prelims: a Civil Services final-result row never becomes 'UPSC Prelims 2026: …'", () => {
    const upsc = { examTerms: examTermsFor({ shortName: "UPSC Prelims", name: "UPSC Civil Services Examination — Prelims" }, ["Civil Services Examination"]), ordinalNames: ["UPSC Prelims"] };
    const longTail =
      "List of candidates in Roll Number order who have been provisionally recommended for appointment to the Indian Administrative Service Indian Foreign Service Indian Police Service and Central Services";
    const t = bodyTitle({ anchorText: "Result", rowText: `Civil Services Examination, 2026: ${longTail} 15/09/2026` }, upsc);
    expect(t).not.toMatch(/prelims/i);
    expect(t.startsWith("Civil Services Examination, 2026: List of candidates")).toBe(true);
    expect(t.length).toBeLessThanOrEqual(140);
  });
  it("SSC CHSL (no stage in the short name) still shortens the FRTA row as before", () => {
    const g = gateAll([FRTA], crawlCtx(CHSL, ["Combined Higher Secondary (10+2) Level Examination"], CHSL_SITTING)).groups[0].release;
    expect(g.stage).toBe("SSC CHSL 2025: List of Candidates provisionally shortlisted for First Round of Tentative Allocation (FRTA) for DEO/LDC/JSA/JHAA");
  });
});

describe("review: RRB's 'CEN No.' spelling names the exam", () => {
  it("'CEN No. 01/2025' is the phrase 'CEN 01/2025' ('no' / 'advt' are generic on both sides)", () => {
    const terms = examTermsFor(ALP, ["CEN 01/2025"]);
    expect(examNamed("Notice on Answer Key CEN No. 01/2025 (ALP) CBT-2", terms)).toBe(true);
    expect(examNamed("CEN 01/2025 · Objection Tracker", terms)).toBe(true);
    expect(examNamed("Notice on Answer Key CEN No. 02/2025 (JE) CBT-2", terms)).toBe(false);
  });
});

describe("review: the gate reads the link's file name for markers (as the label and siblings do)", () => {
  const ctx = crawlCtx(ALP, ["CEN 01/2025"], ALP_SITTING);
  const cand = (file: string) =>
    row("ANSWER_KEY", `https://rrb.indianrailways.gov.in/-/image/1790${file}/examsDocuments`, RRB_TRACKER, "Answer key notice (English)", "Answer key notice (English) · CEN 01/2025 · Objection Tracker · Answer key notice · 05-08-2026");
  it("a row silent on the CBT whose file says CBT-1 is refused while CBT-2 is due", () => {
    expect(releaseGate(cand("Answer_Key_CEN_No._01_2025(ALP)_CBT-1_English.pdf"), ctx, pdf)).toMatchObject({
      ok: false,
      gate: 3,
      reason: expect.stringMatching(/^the text names another sitting\/stage \(cbt: /),
    });
  });
  it("…its CBT-2 file passes; a re-downloaded copy's ' (1)' suffix is no sitting '(I)'", () => {
    expect(releaseGate(cand("Answer_Key_CEN_No._01_2025(ALP)_CBT-2_English.pdf"), ctx, pdf).ok).toBe(true);
    expect(fileWords("https://rrb.indianrailways.gov.in/files/Answer%20Key%20CBT-2%20(1).pdf")).toBe("Answer Key CBT-2");
    expect(releaseGate(cand("Answer_Key_CBT-2_(1).pdf"), ctx, pdf).ok).toBe(true);
  });
});

describe("review: the twin filter keeps an estimate that names a family the release does not", () => {
  it("SSC's FRTA shortlist (no tier printed) never archives the Tier 1 / Tier 2 result estimates", () => {
    const g = gateAll([FRTA], crawlCtx(CHSL, ["Combined Higher Secondary (10+2) Level Examination"], CHSL_SITTING)).groups[0].release;
    expect(isTwinOfRelease({ label: "SSC CHSL 2025 Tier 2 result (expected)" }, g, g.stage!, ["SSC CHSL"])).toBe(false);
    expect(isTwinOfRelease({ label: "SSC CHSL 2025 Tier 1 result (expected)" }, g, g.stage!, ["SSC CHSL"])).toBe(false);
    expect(isTwinOfRelease({ label: "Result (expected)" }, g, g.stage!, ["SSC CHSL"])).toBe(true);
  });
  it("the MHT-CET PCB result still archives its own PCB estimate (the exam's own CET counts as named)", () => {
    const ctx = crawlCtx(MHT, ["MHT-CET", "MHT CET", "Maharashtra Common Entrance Test", "MAH-MHT-CET"], MHT_SITTING, MHT_HEADING);
    const g = gateAll([PCB2], ctx).groups[0].release;
    expect(isTwinOfRelease({ label: "MHT-CET PCB Second Attempt result (expected)" }, g, g.stage!, ["MHT-CET"])).toBe(true);
    expect(isTwinOfRelease({ label: "MHT-CET PCM Second Attempt result (expected)" }, g, g.stage!, ["MHT-CET"])).toBe(false);
  });
});

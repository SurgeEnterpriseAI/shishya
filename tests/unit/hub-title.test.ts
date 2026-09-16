// Pure unit tests for src/lib/hub-title.ts — the hub <title> date lead.
// No DB. No network. Run with: npx vitest run tests/unit/hub-title.test.ts
//
// Guards the 16 Sep 2026 findings: 28 hubs titled "Exam Date Not Announced
// Yet" days after an announced exam was held (IOQM 6 Sep, CDS 13 Sep,
// SBI PO Mains 12 Sep), and hubs stating one of two conflicting same-stage
// dates (MPSC Group C Prelims 27 Sep vs "revised" 25 Oct; SBI Clerk Day 1
// 26 vs 27 Sep). Row labels below are the live tracker's own.

import { describe, it, expect } from "vitest";
import { buildTimeline, type TimelineInput } from "@/lib/exam-timeline";
import { parseHubTitle } from "@/lib/truth-lint";
import {
  heldDescriptionLead,
  heldTitleLead,
  heldVerb,
  hubDateLead,
  isCalledOff,
  isNonWrittenStage,
  labelNamesOtherExam,
  labelNamesWholeExam,
  revisionDescriptionLead,
  revisionTitleLead,
  sameStage,
  HELD_WINDOW_DAYS,
  type HubTitleExam,
} from "@/lib/hub-title";

// 16 Sep 2026, 11:30 IST. Dates are midnight-UTC of the IST calendar day.
const now = new Date("2026-09-16T06:00:00Z");
const at = (iso: string) => new Date(`${iso}T06:00:00Z`);
const d = (iso: string) => `${iso}T00:00:00.000Z`;

const exam = (code: string, shortName: string, name: string): HubTitleExam => ({ code, shortName, name });
const IOQM = exam("IOQM", "IOQM", "Indian Olympiad Qualifier in Mathematics");
const CDS = exam("CDS", "CDS", "Combined Defence Services Examination");
const SBI_PO = exam("SBI_PO", "SBI PO", "SBI Probationary Officer (Prelims)");
const SBI_CLERK = exam("SBI_CLERK", "SBI Clerk", "SBI Junior Associate");
const MPSC_C = exam("MH_MPSC_GROUP_C", "MPSC Group C", "MPSC Group C Combined Prelims");

function row(id: string, label: string, date: string, tier: "official" | "reported" | "expected", extra: Partial<TimelineInput> = {}): TimelineInput {
  return {
    id,
    label,
    date: d(date),
    isExamDay: true,
    kind: "EXAM",
    confidence: tier === "expected" ? "expected" : "official",
    url: tier === "official" ? "https://upsc.gov.in/notice.pdf" : tier === "reported" ? "https://www.adda247.com/exam" : null,
    ...extra,
  };
}

const tl = (rows: TimelineInput[], when: Date = now) => buildTimeline(rows, when);

/** The full English title the hub renders for a lead, as page.tsx builds it. */
function enTitle(short: string, lead: ReturnType<typeof hubDateLead>): string {
  const bit =
    lead.kind === "held"
      ? `${heldTitleLead("en", lead, lead.row.tier === "official" ? null : "reported")}, `
      : lead.kind === "revision"
        ? `${revisionTitleLead("en")}, `
        : "";
  return `${short} 2026 — ${bit}Free Mock Tests, PYQ | Shishya`;
}

describe("hubDateLead — announced and held", () => {
  it("a future announced exam day leads, as before (expected rows never do)", () => {
    const lead = hubDateLead(
      tl([
        row("est", "Exam (expected)", "2026-09-20", "expected"),
        row("held", "Exam", "2026-09-06", "official"),
        row("next", "Exam", "2026-10-04", "reported"),
      ]),
      IOQM,
    );
    expect(lead.kind === "announced" && lead.row.id).toBe("next");
  });

  it("an announced exam held within 60 days leads, keeping the 'Exam Date … ,' grammar", () => {
    const lead = hubDateLead(tl([row("cds", "CDS 2 2026 exam", "2026-09-13", "official")]), CDS);
    expect(lead.kind).toBe("held");
    if (lead.kind !== "held") return;
    expect(lead.verb).toBe("held");
    expect(heldTitleLead("en", lead, null)).toBe("Exam Held 13 Sept 2026, Next Exam Date Not Announced Yet");
    expect(heldDescriptionLead("en", "CDS", lead, null)).toBe("CDS exam held 13 Sept 2026; next exam date: not announced yet. ");
    // truth-lint's parseHubTitle still reads the title (no parse warning).
    expect(parseHubTitle(enTitle("CDS", lead)).kind).toBe("not-announced");
    // No answer-key promise: the tracker says CDS publishes no key for this stage.
    expect(enTitle("CDS", lead)).not.toMatch(/answer key/i);
  });

  it("the latest held day wins, and a reported one keeps its tier word", () => {
    const lead = hubDateLead(tl([row("a", "IOQM 2026 exam day", "2026-09-06", "reported"), row("b", "Regional round", "2026-07-20", "official")]), IOQM);
    expect(lead.kind === "held" && lead.row.id).toBe("a");
    if (lead.kind !== "held") return;
    expect(heldTitleLead("en", lead, "reported")).toBe("Exam Held 6 Sept 2026 (reported), Next Exam Date Not Announced Yet");
  });

  it("on the latest held day the best tier leads", () => {
    const lead = hubDateLead(
      tl([row("rep", "Written exam", "2026-09-06", "reported"), row("off", "Written exam", "2026-09-06", "official")]),
      IOQM,
    );
    expect(lead.kind === "held" && lead.row.id).toBe("off");
    expect(lead.kind === "held" && lead.row.tier).toBe("official");
  });

  it("an exam held more than 60 days ago says not announced", () => {
    // 18 Jul is 60 IST days before 16 Sep; 17 Jul is 61.
    expect(HELD_WINDOW_DAYS).toBe(60);
    expect(hubDateLead(tl([row("old", "Exam", "2026-07-18", "official")]), IOQM).kind).toBe("held");
    expect(hubDateLead(tl([row("old", "Exam", "2026-07-17", "official")]), IOQM).kind).toBe("none");
  });

  it("expected-only rows, ahead or passed, never lead: not announced", () => {
    const lead = hubDateLead(
      tl([row("p", "Exam (expected)", "2026-09-06", "expected"), row("f", "Exam (expected)", "2026-11-06", "expected")]),
      IOQM,
    );
    expect(lead.kind).toBe("none");
  });

  it("a stage word comes from the label", () => {
    const mains = hubDateLead(tl([row("m", "Mains exam (Phase II)", "2026-09-12", "reported")]), SBI_PO);
    expect(mains.kind === "held" && heldTitleLead("en", mains, "reported")).toBe(
      "Mains Exam Held 12 Sept 2026 (reported), Next Exam Date Not Announced Yet",
    );
  });
});

describe("held verb — one day, a window's start, a window's end", () => {
  const RAEO = exam("MP_RAEO", "MP RAEO", "MP Rural Agriculture Extension Officer");
  const raeoRow = row("r", "Online exam begins — shifts 09:00–12:00 and 14:30–17:30 (end date not announced)", "2026-09-17", "official");

  it("MP RAEO: announced on 16 Sep, 'began' (not 'held' or 'ended') from 18 Sep", () => {
    expect(hubDateLead(tl([raeoRow]), RAEO).kind).toBe("announced");
    const after = hubDateLead(tl([raeoRow], at("2026-09-18")), RAEO);
    expect(after.kind === "held" && heldTitleLead("en", after, null)).toBe("Exam Began 17 Sept 2026, Next Exam Date Not Announced Yet");
  });

  it("labels that place the row in a window", () => {
    expect(heldVerb({ label: "Mains Exam (Day 1-6)" })).toBe("began");
    expect(heldVerb({ label: "Mains exam (3 days)" })).toBe("began");
    expect(heldVerb({ label: "Mains exam begins" })).toBe("began");
    expect(heldVerb({ label: "CBT Exam concludes" })).toBe("ended");
    expect(heldVerb({ label: "CBT Exam (Phase 1) - End" })).toBe("ended");
    expect(heldVerb({ label: "AP TET Exam last day" })).toBe("ended");
    expect(heldVerb({ label: "KTET February 2026 Session Exam (Day 2)" })).toBe("ended");
    expect(heldVerb({ label: "PET 2026 exam - Day 1" })).toBe("began");
    expect(heldVerb({ label: "Level 1 exam — Date 3" })).toBe("ended");
    expect(heldVerb({ label: "Level 1 Exam - Date Option 3" })).toBe("ended");
    expect(heldVerb({ label: "IOQM 2026 exam day" })).toBe("held");
    expect(heldVerb({ label: "Prelims exam (date 27 Sep)" })).toBe("held");
  });

  it("notes giving a window the label does not place: no verb is sure", () => {
    expect(heldVerb({ label: "TET 2026 exam", notes: "Exam conducted from September 7-11, 2026" })).toBeNull();
    expect(heldVerb({ label: "Exam", notes: "Exam held on September 2, 5, 7, and 9, 2026" })).toBeNull();
    // Clock times, marks and single dates are not windows.
    expect(heldVerb({ label: "Mains exam", notes: "objective (200 marks) + descriptive (50 marks), 2 marks, 1 hour" })).toBe("held");
    expect(heldVerb({ label: "Exam", notes: "Shift 9-11 AM; 10:00–12:30" })).toBe("held");
    expect(heldVerb({ label: "Exam", notes: "As per calendar released December 22, 2025" })).toBe("held");
  });

  it("RRB Group D: 'concludes' agrees with its neighbour's window → Exam Ended", () => {
    const G = exam("RRB_GROUP_D", "RRB Group D", "Railway Group D (Level 1)");
    const lead = hubDateLead(
      tl([
        row("w", "CBT exam (revised schedule)", "2026-08-14", "reported", { notes: "Conducted 3-6, 9-14, 17-21, 25 Aug 2026 (16 exam days, multiple shifts)" }),
        row("e", "CBT Exam concludes", "2026-08-25", "reported"),
      ]),
      G,
    );
    expect(lead.kind === "held" && heldTitleLead("en", lead, "reported")).toBe("Exam Ended 25 Aug 2026 (reported), Next Exam Date Not Announced Yet");
  });

  it("AP TET: 'last day' 21 Aug beside a 5-16 Aug window contradicts itself → none", () => {
    const AP = exam("AP_TET", "AP TET", "Andhra Pradesh Teacher Eligibility Test (AP TET)");
    const lead = hubDateLead(
      tl([
        row("w", "AP TET Exam (June 2026 - Paper 1 & 2)", "2026-08-05", "reported", { notes: "CBT conducted from August 5-16, 2026 in two daily shifts" }),
        row("e", "AP TET Exam last day", "2026-08-21", "reported"),
      ]),
      AP,
    );
    expect(lead.kind).toBe("none");
  });
});

describe("held row must be the exam itself", () => {
  it("a sitting, post, paper or earlier cycle keeps 'Not Announced Yet'", () => {
    const cases: [HubTitleExam, string][] = [
      [exam("TS_TET", "TS TET", "Telangana State Teacher Eligibility Test"), "Special TET 2026 exam (In-Service Teachers)"],
      [exam("KL_KPSC_LDC", "Kerala LDC", "Kerala PSC Lower Division Clerk"), "Combined exam with LDC held (Question Paper Code 069/2026)"],
      [exam("RRB_ALP", "RRB ALP", "RRB Assistant Loco Pilot"), "CEN 01/2025 CBT 2 Exam"],
      [exam("UK_UKSSSC", "UKSSSC", "Uttarakhand Subordinate Service Selection Commission"), "Livestock Extension Officer exam (rescheduled)"],
      [exam("GJ_GSSSB", "GSSSB", "Gujarat Subordinate Service Selection Board"), "CBRT exam for Senior Surveyor, Physiotherapist, Lab Technician & other posts"],
      [exam("CA_FOUNDATION", "CA Foundation", "ICAI CA Foundation"), "September 2026 exam — Paper 4 (Business Economics and Business & Commercial Knowledge)"],
      [exam("KA_POLICE_PC", "KA Police PC", "Karnataka Police Constable"), "Armed Police Constable (CAR/DAR) written exam"],
      [exam("KA_KSRP", "KA KSRP", "Karnataka State Reserve Police Constable"), "Written test — Kalyana Karnataka (KSRP, KSISF, IRB; 859 posts), 15:00–16:30"],
    ];
    for (const [ex, label] of cases) {
      expect(labelNamesWholeExam(label, ex), label).toBe(false);
      expect(hubDateLead(tl([row("x", label, "2026-09-06", "reported")]), ex).kind, label).toBe("none");
    }
  });

  it("the exam's own name, stage and part markers are fine", () => {
    expect(labelNamesWholeExam("IOQM 2026 exam day", IOQM)).toBe(true);
    expect(labelNamesWholeExam("CDS 2 2026 exam", CDS)).toBe(true);
    expect(labelNamesWholeExam("Mains exam (Phase II)", SBI_PO)).toBe(true);
    expect(labelNamesWholeExam("NEET PG 2026 exam", exam("NEET_PG", "NEET PG", "National Eligibility cum Entrance Test (PG)"))).toBe(true);
    expect(labelNamesWholeExam("APPSC CCE Prelims Exam", exam("AR_APPSC_AR", "APPSC (AR)", "Arunachal Pradesh PSC Civil Services Prelims"))).toBe(true);
    expect(labelNamesWholeExam("CBT Exam (Phase 1) - End", exam("PB_POLICE_PC", "PB Police PC", "Punjab Police Constable"))).toBe(true);
  });

  it("skips another exam's day and physical tests, but not an exam named PET", () => {
    const py = exam("PY_PPSC", "Puducherry PSC", "Puducherry Public Service Commission");
    expect(labelNamesOtherExam("UPSC CSE 2026 Mains Exam - Day 1", py)).toBe(true);
    expect(hubDateLead(tl([row("u", "UPSC CSE 2026 Mains Exam - Day 1", "2026-08-21", "reported")]), py).kind).toBe("none");
    expect(labelNamesOtherExam("APPSC CCE Prelims Exam", exam("AR_APPSC_AR", "APPSC (AR)", "Arunachal PSC"))).toBe(false);

    const mts = exam("SSC_MTS", "SSC MTS", "SSC Multi Tasking Staff");
    expect(hubDateLead(tl([row("h", "Havaldar PET/PST", "2026-08-24", "reported")]), mts).kind).toBe("none");
    expect(isNonWrittenStage("Physical Endurance & Measurement Test (PE&MT)", exam("DL_POLICE_PC", "Delhi Police PC", "Delhi Police Constable"))).toBe(true);

    const pet = exam("UP_UPSSSC_PET", "UPSSSC PET", "UPSSSC Preliminary Eligibility Test");
    expect(isNonWrittenStage("PET 2026 exam - Day 3", pet)).toBe(false);
    expect(hubDateLead(tl([row("p", "PET 2026 exam - Day 3", "2026-09-01", "reported")]), pet).kind).toBe("held");
  });

  it("a postponed, cancelled or tentative row is never 'held'", () => {
    const uk = exam("UK_UKSSSC", "UKSSSC", "Uttarakhand Subordinate Service Selection Commission");
    const postponed = row("p", "Junior Assistant/Stenographer exam (postponed)", "2026-08-23", "reported", {
      notes: "Postponed on 14 Aug 2026 due to heavy rains; new date to be announced",
    });
    expect(isCalledOff(postponed)).toBe(true);
    expect(hubDateLead(tl([postponed]), uk).kind).toBe("none");
    expect(hubDateLead(tl([row("c", "Prelims exam (cancelled)", "2026-09-10", "reported")]), IOQM).kind).toBe("none");
    expect(hubDateLead(tl([row("n", "Exam", "2026-09-10", "reported", { notes: "new date to be announced" })]), IOQM).kind).toBe("none");
    const kas = exam("KA_KPSC_KAS", "KPSC KAS", "Karnataka Administrative Service");
    expect(hubDateLead(tl([row("t", "KAS Prelims Exam (tentative)", "2026-09-10", "reported")]), kas).kind).toBe("none");
    // "Postponed from" names the new date: it was held.
    expect(isCalledOff({ label: "Prelims exam (postponed from 6 Sept)" })).toBe(false);
  });

  it("hi/te wording keeps 'परीक्षा तिथि' / 'పరీక్ష తేదీ' and parses", () => {
    const lead = hubDateLead(tl([row("m", "Mains exam (Phase II)", "2026-09-12", "reported")]), SBI_PO);
    if (lead.kind !== "held") throw new Error("expected held");
    const hi = heldTitleLead("hi", lead, "रिपोर्टेड");
    const te = heldTitleLead("te", lead, "నివేదిత");
    expect(hi).toBe("मेन्स परीक्षा 12 Sept 2026 को हुई (रिपोर्टेड), अगली परीक्षा तिथि अभी घोषित नहीं");
    expect(te).toBe("మెయిన్స్ పరీక్ష 12 Sept 2026న జరిగింది (నివేదిత), తదుపరి పరీక్ష తేదీ ఇంకా ప్రకటించలేదు");
    expect(parseHubTitle(`SBI PO 2026 — ${hi}, मुफ़्त मॉक टेस्ट, पिछले साल के पेपर | Shishya`).kind).toBe("not-announced");
    expect(parseHubTitle(`SBI PO 2026 — ${te}, ఉచిత మాక్ టెస్టులు, గత సంవత్సరాల పేపర్లు | Shishya`).kind).toBe("not-announced");
    expect(heldDescriptionLead("en", "SBI PO", lead, "reported")).toBe("SBI PO Mains exam held 12 Sept 2026 (reported); next exam date: not announced yet. ");
    expect(heldDescriptionLead("hi", "SBI PO", lead, null)).toBe("SBI PO मेन्स परीक्षा 12 Sept 2026 को हुई; अगली परीक्षा तिथि: अभी घोषित नहीं. ");
    expect(heldDescriptionLead("te", "SBI PO", lead, "నివేదిత")).toBe("SBI PO మెయిన్స్ పరీక్ష 12 Sept 2026న జరిగింది (నివేదిత); తదుపరి పరీక్ష తేదీ: ఇంకా ప్రకటించలేదు. ");
  });
});

describe("conflicting same-stage rows — neither date is stated", () => {
  // MPSC Group C, as live on 16 Sep 2026: the 8 Sep refresh wrote 27 Sep and
  // left the 23 Aug "revised" 25 Oct row in place.
  const mpsc = [
    row("sep", "Prelims exam (CBT mode)", "2026-09-27", "reported"),
    row("oct", "Preliminary Examination (revised)", "2026-10-25", "reported", { notes: "Rescheduled from 27 September; offline OMR mode" }),
    row("mains", "Mains Examination", "2026-12-27", "reported"),
  ];
  const mpscCreated = new Map<string, Date | string>([
    ["sep", new Date("2026-09-08T07:18:00Z")],
    // Cache hits hand Date fields back as strings.
    ["oct", "2026-08-23T14:02:00.000Z"],
    ["mains", "2026-08-23T14:02:00.100Z"],
  ]);

  it("MPSC Group C: 'Exam Date Under Revision' — no write-time or 'revised'-label pick", () => {
    const lead = hubDateLead(tl(mpsc), MPSC_C, mpscCreated);
    expect(lead.kind).toBe("revision");
    expect(enTitle("MPSC Group C", lead)).toBe("MPSC Group C 2026 — Exam Date Under Revision, Free Mock Tests, PYQ | Shishya");
    expect(revisionDescriptionLead("en", "MPSC Group C")).toBe("MPSC Group C exam date: under revision. ");
    expect(revisionTitleLead("hi")).toBe("परीक्षा तिथि संशोधनाधीन");
    expect(revisionTitleLead("te")).toBe("పరీక్ష తేదీ సవరణలో ఉంది");
  });

  it("after 27 Sep the passed row still counts, and Mains never takes the lead", () => {
    const lead = hubDateLead(tl(mpsc, at("2026-09-28")), MPSC_C, mpscCreated);
    expect(lead.kind === "revision" && lead.row.id).toBe("oct");
  });

  it("SBI Clerk Day 1: 26 Sep (written 23 Aug) vs 27 Sep (written 11 Sep) — under revision from 17 Sep; Day 2 is not a conflict", () => {
    const rows = [
      row("bk", "Prelims exam — Backlog vacancies", "2026-09-16", "reported"),
      row("old", "Prelims exam - Day 1 (Regular)", "2026-09-26", "reported"),
      row("new1", "Prelims exam - Regular vacancies (Day 1)", "2026-09-27", "reported"),
      row("new2", "Prelims exam - Regular vacancies (Day 2)", "2026-10-03", "reported"),
    ];
    const created = new Map<string, string>([
      ["bk", "2026-09-16T13:16:00.000Z"],
      ["old", "2026-08-23T14:07:10.000Z"],
      ["new1", "2026-09-11T07:18:31.792Z"],
      ["new2", "2026-09-11T07:18:31.795Z"],
    ]);
    const today = hubDateLead(tl(rows), SBI_CLERK, created);
    expect(today.kind === "announced" && today.row.id).toBe("bk");
    expect(hubDateLead(tl(rows, at("2026-09-17")), SBI_CLERK, created).kind).toBe("revision");
    // Write times only tell a refresh window from a revision; missing ones never pick a date.
    expect(hubDateLead(tl(rows, at("2026-09-17")), SBI_CLERK).kind).toBe("revision");
  });

  it("MPESB Group 3: 'Exam' 6 Oct vs 'exam starts' 7 Oct written two weeks apart", () => {
    const mpesb = exam("MP_MPESB", "MPESB Group", "MP Employee Selection Board");
    const rows = [
      row("p", "Group 2 Sub Group 4 Patwari Exam", "2026-09-22", "reported"),
      row("a", "Group 3 Sub Engineer Exam", "2026-10-06", "reported"),
      row("b", "Group 3 Sub Engineer exam starts", "2026-10-07", "reported"),
    ];
    const created = new Map([
      ["p", "2026-08-23T14:03:00Z"],
      ["a", "2026-08-23T14:03:00Z"],
      ["b", "2026-09-09T07:17:00Z"],
    ]);
    expect(hubDateLead(tl(rows), mpesb, created).kind).toBe("announced");
    expect(hubDateLead(tl(rows, at("2026-09-23")), mpesb, created).kind).toBe("revision");
  });

  it("rows written in one refresh are a multi-day window, not a revision", () => {
    const same = new Map([
      ["a", "2026-09-14T19:33:58.261Z"],
      ["b", "2026-09-14T19:35:58.319Z"],
    ]);
    const lead = hubDateLead(tl([row("a", "Prelims exam", "2026-09-20", "reported"), row("b", "Prelims exam", "2026-09-21", "reported")]), IOQM, same);
    expect(lead.kind === "announced" && lead.row.id).toBe("a");
  });

  it("a worse-tier row never withholds a better-tier date; a better one does", () => {
    const created = new Map([
      ["off", "2026-08-01T00:00:00Z"],
      ["rep", "2026-09-10T00:00:00Z"],
    ]);
    const offFirst = hubDateLead(tl([row("off", "Prelims exam", "2026-09-27", "official"), row("rep", "Prelims exam (revised)", "2026-10-25", "reported")]), IOQM, created);
    expect(offFirst.kind === "announced" && offFirst.row.id).toBe("off");
    const repFirst = hubDateLead(tl([row("rep", "Prelims exam", "2026-09-27", "reported"), row("off", "Prelims exam (revised)", "2026-10-25", "official")]), IOQM, created);
    expect(repFirst.kind).toBe("revision");
  });

  it("the same stage a cycle apart (over 120 days) is not a revision", () => {
    const c = new Map([
      ["y1", "2026-08-01T00:00:00Z"],
      ["y2", "2026-09-10T00:00:00Z"],
    ]);
    const lead = hubDateLead(tl([row("y1", "Prelims exam", "2026-09-20", "reported"), row("y2", "Prelims exam", "2027-05-20", "reported")]), IOQM, c);
    expect(lead.kind === "announced" && lead.row.id).toBe("y1");
  });
});

describe("sameStage", () => {
  it("matches a stage's rewordings", () => {
    expect(sameStage("Prelims exam (CBT mode)", "Preliminary Examination (revised)")).toBe(true);
    expect(sameStage("Group 3 Sub Engineer Exam", "Group 3 Sub Engineer exam starts")).toBe(true);
    expect(sameStage("Phase II exam", "Phase 2 exam")).toBe(true);
    expect(sameStage("Prelims exam - Day 1 (Regular)", "Prelims exam - Regular vacancies (Day 1)")).toBe(true);
    expect(sameStage("Prelims exam", "Preliminary Examination")).toBe(true);
  });

  it("never matches different stages, parts, CBT numbers or test types", () => {
    expect(sameStage("Prelims exam - Day 1", "Prelims exam - Day 2")).toBe(false);
    expect(sameStage("Prelims exam", "Mains Examination")).toBe(false);
    expect(sameStage("Level 1 exam — Date 1", "Level 1 exam — Date 2")).toBe(false);
    expect(sameStage("UPSC CSE 2026 Mains Exam - Day 1", "UPSC CSE 2026 Mains Exam - Final Day")).toBe(false);
    expect(sameStage("Group 2 Sub Group 4 Patwari Exam", "Group 3 Sub Engineer exam starts")).toBe(false);
    expect(sameStage("Prelims exam — Backlog vacancies", "Prelims exam - Regular vacancies (Day 1)")).toBe(false);
    // 16 Sep 2026 review: labels with no words of their own and CBT numbers.
    expect(sameStage("Written exam", "PET/PST")).toBe(false);
    expect(sameStage("Written exam", "Skill test")).toBe(false);
    expect(sameStage("Online exam", "Typing test")).toBe(false);
    expect(sameStage("Written exam", "Exam")).toBe(false);
    expect(sameStage("CBT-1 exam", "CBT-2 exam")).toBe(false);
    expect(sameStage("CBT 1", "CBT 2")).toBe(false);
    expect(sameStage("Graduate CBT-I Exam (CEN 06/2025)", "Graduate CBT-2 exam (CEN 06/2025)")).toBe(false);
    expect(sameStage("CBT exam (revised schedule)", "Computer Based Test (CBT)")).toBe(false);
  });

  it("an official written exam is not withheld by a later-written PET or CBT-2 row", () => {
    const created = new Map([
      ["w", "2026-08-20T00:00:00Z"],
      ["p", "2026-09-10T00:00:00Z"],
    ]);
    const pet = hubDateLead(tl([row("w", "Written exam", "2026-10-04", "official"), row("p", "PET/PST", "2026-12-10", "official")]), IOQM, created);
    expect(pet.kind === "announced" && pet.row.id).toBe("w");
    const cbt = hubDateLead(tl([row("w", "CBT-1 exam (CEN 03/2026)", "2026-10-12", "reported"), row("p", "CBT-2 exam", "2027-01-20", "reported")]), IOQM, created);
    expect(cbt.kind === "announced" && cbt.row.id).toBe("w");
  });
});

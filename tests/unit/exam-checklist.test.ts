// Pure unit tests for src/lib/exam-checklist.ts — the fact-based
// last-minute checklist and the homepage "Exams today" selection
// (13 Sep 2026). No DB, no network.
// Run with: npx vitest run tests/unit/exam-checklist.test.ts
//
// What they guard: every date carries its tier word; a passed estimate
// reads "was expected — not confirmed" and never "held"; negative marking
// appears only when the marking scheme is statable for the sitting in
// focus (SBI PO Prelims row vs a Mains sitting); section numbers only where
// the stored weights can carry them; the carry list never states a
// varying rule as fact; the strip never lists an expected exam day.

import { describe, it, expect } from "vitest";
import {
  buildExamChecklist,
  carryListFor,
  checklistSections,
  examChecklistMeta,
  hasChecklist,
  META_DESCRIPTION_MAX,
  OG_DESCRIPTION_MAX,
  patternSummary,
  pickExamsStrip,
  WHAT_TO_CARRY,
  type ChecklistExam,
  type StripRowInput,
} from "@/lib/exam-checklist";
import { PASSED_ESTIMATE_TEXT, type TimelineInput } from "@/lib/exam-timeline";

const d = (iso: string) => `${iso}T00:00:00.000Z`;
/** An instant on IST day `day` at IST clock time hh:mm. */
const ist = (day: string, hh: number, mm = 0) => new Date(Date.parse(`${day}T00:00:00Z`) - 330 * 60_000 + (hh * 60 + mm) * 60_000);

const SSC_CGL: ChecklistExam = {
  code: "SSC_CGL",
  name: "SSC CGL Tier 1",
  shortName: "SSC CGL",
  category: "GOVT_JOBS",
  description: "Computer-based Tier 1: 100 questions, 200 marks, 60 minutes.",
  durationMin: 60,
  totalQuestions: 100,
  scoredQuestions: null,
  totalMarks: 200,
  marksPerQ: 2,
  negativeMark: 0.5,
  languages: ["EN", "HI"],
};
// Exam row as read from prod, 11 Sep 2026 (marking-scheme.test.ts).
const SBI_PO: ChecklistExam = {
  code: "SBI_PO",
  name: "SBI Probationary Officer (Prelims)",
  shortName: "SBI PO",
  category: "BANKING",
  description: "Online preliminary exam: English, Quantitative Aptitude, Reasoning.",
  durationMin: 60,
  totalQuestions: 100,
  scoredQuestions: null,
  totalMarks: 100,
  marksPerQ: 1,
  negativeMark: 0.25,
  languages: ["EN", "HI"],
};
const CDS: ChecklistExam = {
  ...SSC_CGL,
  code: "CDS",
  name: "Combined Defence Services",
  shortName: "CDS",
  category: "CIVIL_SERVICES",
  description: "English, General Knowledge and Elementary Mathematics.",
  totalQuestions: 300,
  totalMarks: 300,
  marksPerQ: 1,
  negativeMark: 0.33,
};
const SSC_URL = "https://ssc.gov.in";

const examOfficial: TimelineInput = {
  id: "e1",
  label: "Tier 1 exam",
  date: d("2026-09-20"),
  isExamDay: true,
  kind: "EXAM",
  confidence: "official",
  url: "https://ssc.gov.in/notices/cgl-2026-tier1",
  notes: "Shift 1: 9:00 AM to 10:00 AM; reporting 7:30 AM",
};
const admitOfficial: TimelineInput = {
  id: "a1",
  label: "Admit card (Tier 1)",
  date: d("2026-09-15"),
  isExamDay: false,
  kind: "ADMIT_CARD",
  confidence: "official",
  url: "https://ssc.gov.in/admit-card",
  notes: "Reporting 7:30 AM; gate closes 8:30 AM",
};
const keyExpected: TimelineInput = {
  id: "k1",
  label: "Tier 1 answer key",
  date: d("2026-09-28"),
  isExamDay: false,
  kind: "ANSWER_KEY",
  confidence: "expected",
  url: null,
};
const resultExpected: TimelineInput = {
  id: "r1",
  label: "Tier 1 result",
  date: d("2026-11-15"),
  isExamDay: false,
  kind: "RESULT",
  confidence: "expected",
  url: null,
};
const tier2Expected: TimelineInput = {
  id: "t2",
  label: "Tier 2 exam",
  date: d("2026-12-10"),
  isExamDay: true,
  kind: "EXAM",
  confidence: "expected",
  url: null,
};

const NOW = ist("2026-09-13", 10);

describe("buildExamChecklist — tier words on every date", () => {
  const c = buildExamChecklist({
    exam: SSC_CGL,
    subjects: [],
    rows: [examOfficial, admitOfficial, keyExpected, resultExpected, tier2Expected],
    officialUrl: SSC_URL,
    officialName: "Staff Selection Commission (SSC)",
    now: NOW,
  });

  it("exam day, admit card, result and next stage each carry their tier", () => {
    expect(c.phase).toBe("week");
    expect(c.examDay?.dated).toMatch(/^20 \S+ \(official\)$/);
    expect(c.examDayLine).toContain("(official)");
    expect(c.examDayLine).toContain("7 days to go");
    expect(c.daysTo).toBe(7);
    expect(c.admitCard?.dated).toMatch(/\(official\)$/);
    expect(c.admitCard?.official).toBe(true);
    expect(c.admitCard?.url).toBe("https://ssc.gov.in/admit-card");
    expect(c.admitCard?.notes).toContain("gate closes 8:30 AM");
    expect(c.result?.dated).toMatch(/\(expected\)$/);
    expect(c.nextStage?.label).toBe("Tier 2 exam");
    expect(c.nextStage?.dated).toMatch(/\(expected\)$/);
  });

  it("never prints an expected answer-key date", () => {
    expect(c.answerKey).toBeNull();
  });

  it("keeps the exam row's timings verbatim, with the row's tier", () => {
    expect(c.examNotes).toHaveLength(1);
    expect(c.examNotes[0].text).toContain("Shift 1: 9:00 AM");
    expect(c.examNotes[0].tier).toBe("official");
    expect(c.examNotes[0].dated).toMatch(/\(official\)$/);
  });

  it("links the conducting body's portal by its name", () => {
    expect(c.portal).toEqual({ url: SSC_URL, name: "Staff Selection Commission (SSC)" });
  });

  it("a date cited on a coaching site is reported, not official", () => {
    const reported = buildExamChecklist({
      exam: SSC_CGL,
      subjects: [],
      rows: [{ ...examOfficial, url: "https://testbook.com/ssc-cgl/exam-date" }],
      officialUrl: SSC_URL,
      now: NOW,
    });
    expect(reported.examDay?.dated).toMatch(/\(reported\)$/);
    expect(reported.examDay?.official).toBe(false);
  });

  it("an announced window prints both ends with the tier", () => {
    const w = buildExamChecklist({
      exam: SSC_CGL,
      subjects: [],
      rows: [
        { ...examOfficial, id: "w1", date: d("2026-09-12"), notes: null },
        { ...examOfficial, id: "w2", date: d("2026-09-16"), notes: null },
      ],
      officialUrl: SSC_URL,
      now: ist("2026-09-13", 12),
    });
    expect(w.phase).toBe("window");
    expect(w.window).toMatch(/^12 \S+ to 16 \S+ \(official\)$/);
    expect(w.examDayLine).toMatch(/^Exam window: /);
  });

  it("portal name falls back to the host when the eligibility row has none", () => {
    const p = buildExamChecklist({ exam: SSC_CGL, subjects: [], rows: [], officialUrl: "https://www.ssc.gov.in/", now: NOW });
    expect(p.portal?.name).toBe("ssc.gov.in");
  });
});

describe("buildExamChecklist — passed estimates", () => {
  it("a past expected exam day reads 'was expected — not confirmed', never held", () => {
    const past: TimelineInput = { ...examOfficial, id: "p1", date: d("2026-09-10"), confidence: "expected", url: null };
    const c = buildExamChecklist({ exam: SSC_CGL, subjects: [], rows: [past], officialUrl: SSC_URL, now: NOW });
    expect(c.examDay?.passedEstimate).toBe(true);
    expect(c.examDay?.dated).toContain(PASSED_ESTIMATE_TEXT);
    expect(c.examDay?.dated).not.toMatch(/\((official|reported)\)/);
    expect(c.examDayLine).toContain("was expected — not confirmed");
    expect(c.examDayLine).not.toMatch(/held|today/i);
    // The title never advertises a date that went by unannounced.
    expect(examChecklistMeta(SSC_CGL, c).title).not.toContain("10 ");
  });

  it("an announced past exam day is held, with its tier", () => {
    const held: TimelineInput = { ...examOfficial, id: "h1", date: d("2026-09-10") };
    const c = buildExamChecklist({ exam: SSC_CGL, subjects: [], rows: [held], officialUrl: SSC_URL, now: NOW });
    expect(c.phase).toBe("post");
    expect(c.examDay?.passedEstimate).toBe(false);
    expect(c.examDayLine).toMatch(/^The paper was held on 10 \S+ \(official\)\.$/);
  });

  it("a passed expected admit-card date is worded the same way", () => {
    const admitPast: TimelineInput = { ...admitOfficial, id: "a0", date: d("2026-09-11"), confidence: "expected", url: null };
    const c = buildExamChecklist({ exam: SSC_CGL, subjects: [], rows: [examOfficial, admitPast], officialUrl: SSC_URL, now: NOW });
    expect(c.admitCard?.passedEstimate).toBe(true);
    expect(c.admitCard?.dated).toContain(PASSED_ESTIMATE_TEXT);
  });
});

describe("buildExamChecklist — marking scheme only when statable", () => {
  it("SSC CGL Tier 1 states +2 / −0.5", () => {
    const c = buildExamChecklist({ exam: SSC_CGL, subjects: [], rows: [examOfficial], officialUrl: SSC_URL, now: NOW });
    expect(c.pattern.marking).toBe("+2 per correct answer, −0.5 per wrong answer");
    expect(c.pattern.markingNote).toBeNull();
    expect(c.pattern.stageMismatch).toBeNull();
    expect(patternSummary(c.pattern)).toBe("100 questions, 200 marks, 60 minutes");
  });

  it("SBI PO: the Prelims pattern is not stated for a Mains sitting", () => {
    const mains: TimelineInput = {
      id: "m1",
      label: "Mains Exam",
      date: d("2026-09-14"),
      isExamDay: true,
      kind: "EXAM",
      confidence: "official",
      url: "https://sbi.co.in/careers/po-mains",
    };
    const c = buildExamChecklist({ exam: SBI_PO, subjects: [], rows: [mains], officialUrl: null, now: NOW });
    expect(c.pattern.marking).toBeNull();
    expect(c.pattern.markingNote).toMatch(/Mains/);
    expect(c.pattern.stageMismatch).toMatch(/Prelims/);
    expect(examChecklistMeta(SBI_PO, c).description).not.toMatch(/per wrong answer/);
  });

  it("SBI PO with no sitting on record states its own Prelims scheme", () => {
    const c = buildExamChecklist({ exam: SBI_PO, subjects: [], rows: [], officialUrl: null, now: NOW });
    expect(c.pattern.marking).toBe("+1 per correct answer, −0.25 per wrong answer");
  });

  it("CDS (unequal papers) never states a per-question mark", () => {
    const c = buildExamChecklist({ exam: CDS, subjects: [], rows: [], officialUrl: null, now: NOW });
    expect(c.pattern.marking).toBeNull();
    expect(c.pattern.markingNote).toMatch(/CDS/);
  });

  it("a statable scheme with no stored negative mark says so without asserting it", () => {
    const c = buildExamChecklist({ exam: { ...SSC_CGL, negativeMark: 0 }, subjects: [], rows: [], officialUrl: null, now: NOW });
    expect(c.pattern.marking).toBe("+2 per correct answer, no negative mark on our records — confirm it in the official notice");
  });

  it("NEET-style papers print the scored count next to the asked count", () => {
    const neet: ChecklistExam = { ...SSC_CGL, code: "NEET_UG", name: "NEET UG", shortName: "NEET UG", category: "MEDICAL", description: "", totalQuestions: 200, scoredQuestions: 180, totalMarks: 720, marksPerQ: 4, negativeMark: 1, durationMin: 200 };
    const c = buildExamChecklist({ exam: neet, subjects: [], rows: [], officialUrl: null, now: NOW });
    expect(patternSummary(c.pattern)).toBe("200 questions (180 scored), 720 marks, 200 minutes");
    expect(c.pattern.marking).toBe("+4 per correct answer, −1 per wrong answer");
  });
});

describe("buildExamChecklist — no facts invented", () => {
  it("no tracker rows → no dates, but pattern and carry list still render", () => {
    const c = buildExamChecklist({ exam: SSC_CGL, subjects: [], rows: [], officialUrl: null, now: NOW });
    expect(c.phase).toBe("none");
    expect(c.examDay).toBeNull();
    expect(c.examDayLine).toBeNull();
    expect(c.admitCard).toBeNull();
    expect(c.answerKey).toBeNull();
    expect(c.result).toBeNull();
    expect(c.nextStage).toBeNull();
    expect(c.portal).toBeNull();
    expect(c.pattern.questions).toBe(100);
    expect(c.carry.length).toBeGreaterThan(0);
  });

  it("untyped legacy seed rows are ignored", () => {
    const legacy: TimelineInput = { id: "seed", label: "Exam date", date: d("2026-09-20"), isExamDay: true, kind: null, confidence: null, url: null };
    const c = buildExamChecklist({ exam: SSC_CGL, subjects: [], rows: [legacy], officialUrl: null, now: NOW });
    expect(c.examDay).toBeNull();
  });

  it("languages map to names; none on record stays empty (never guessed)", () => {
    const te = buildExamChecklist({ exam: { ...SSC_CGL, languages: ["EN", "TE"] }, subjects: [], rows: [], officialUrl: null, now: NOW });
    expect(te.languages).toEqual(["English", "Telugu"]);
    const none = buildExamChecklist({ exam: { ...SSC_CGL, languages: [] }, subjects: [], rows: [], officialUrl: null, now: NOW });
    expect(none.languages).toEqual([]);
  });
});

describe("checklistSections — numbers only where the weights carry them", () => {
  it("integer weights adding up to the scored count are question counts", () => {
    const s = checklistSections(
      [
        { name: "General Intelligence", weight: 25 },
        { name: "General Awareness", weight: 25 },
        { name: "Quantitative Aptitude", weight: 25 },
        { name: "English", weight: 25 },
      ],
      100,
    );
    expect(s.map((x) => x.questions)).toEqual([25, 25, 25, 25]);
    expect(s[0].name).toBe("General Intelligence");
  });

  it("relative syllabus weights (seeded or AI-estimated) never become a number", () => {
    const seeded = checklistSections(
      [
        { name: "Maths", weight: 0.3 },
        { name: "Reasoning", weight: 0.25 },
        { name: "English", weight: 0.15 },
        { name: "GK", weight: 0.15 },
        { name: "Computers", weight: 0.15 },
      ],
      100,
    );
    expect(seeded).toEqual([
      { name: "Maths", questions: null },
      { name: "Reasoning", questions: null },
      { name: "English", questions: null },
      { name: "GK", questions: null },
      { name: "Computers", questions: null },
    ]);
    // The reviewer's case: an AI GS-heavy tilt is not a paper share.
    const ai = checklistSections([{ name: "General Studies", weight: 1.5 }, { name: "CSAT", weight: 1 }], 180);
    expect(ai.every((x) => x.questions === null)).toBe(true);
    expect(JSON.stringify(ai)).not.toMatch(/pct|%/);
  });

  it("integer weights within the AI seeder's 0.1–5 cap are never read as counts, even when they add up", () => {
    const s = checklistSections(
      [
        { name: "Paper A", weight: 5 },
        { name: "Paper B", weight: 5 },
        { name: "Paper C", weight: 5 },
        { name: "Paper D", weight: 5 },
      ],
      20,
    );
    expect(s.every((x) => x.questions === null)).toBe(true);
  });

  it("the checklist says whether the list is sections with counts or syllabus subjects", () => {
    const counts = buildExamChecklist({
      exam: SSC_CGL,
      subjects: [
        { name: "General Intelligence", weight: 25 },
        { name: "General Awareness", weight: 25 },
        { name: "Quantitative Aptitude", weight: 25 },
        { name: "English", weight: 25 },
      ],
      rows: [],
      officialUrl: null,
      now: NOW,
    });
    expect(counts.sectionsAreCounts).toBe(true);
    const relative = buildExamChecklist({
      exam: SSC_CGL,
      subjects: [
        { name: "General Studies", weight: 1.5 },
        { name: "Aptitude", weight: 1 },
      ],
      rows: [],
      officialUrl: null,
      now: NOW,
    });
    expect(relative.sectionsAreCounts).toBe(false);
    expect(relative.sections.map((x) => x.name)).toEqual(["General Studies", "Aptitude"]);
  });

  it("equal default weights print no number; blank names are dropped", () => {
    const s = checklistSections(
      [
        { name: "Paper I", weight: 1 },
        { name: " ", weight: 1 },
        { name: "Paper II", weight: 1 },
      ],
      150,
    );
    expect(s).toEqual([
      { name: "Paper I", questions: null },
      { name: "Paper II", questions: null },
    ]);
  });
});

describe("WHAT_TO_CARRY — no varying rule stated as fact", () => {
  it("every recruitment / entrance category opens with the admit card and original photo ID", () => {
    for (const [cat, list] of Object.entries(WHAT_TO_CARRY)) {
      if (cat === "OLYMPIAD") continue;
      expect(list[0].text, cat).toMatch(/^Admit card/);
      expect(list[0].check, cat).toBe(false);
      expect(list[1].text, cat).toMatch(/^Original photo ID/);
    }
  });

  it("OLYMPIAD states nothing as fact: no hall-ticket, adult-ID or late-entry rule for school-held papers", () => {
    const list = WHAT_TO_CARRY.OLYMPIAD;
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((i) => i.check)).toBe(true);
    for (const item of list) {
      expect(item.text).not.toMatch(/\bPAN\b|voter ID|driving licence|passport|photocopy alone|late entry is refused/i);
      if (/^(Admit card|Identity)/i.test(item.text)) expect(item.text).toMatch(/if your olympiad issues one|school notice/i);
    }
    expect(carryListFor("olympiad")).toBe(WHAT_TO_CARRY.OLYMPIAD);
  });

  it("SCHOOL_BOARD containers get no checklist page", () => {
    expect(hasChecklist("SCHOOL_BOARD")).toBe(false);
    expect(hasChecklist("school_board")).toBe(false);
    expect(hasChecklist("OLYMPIAD")).toBe(true);
    expect(hasChecklist("GOVT_JOBS")).toBe(true);
  });

  it("every item that varies by exam sends the student to their admit card / call letter / notice", () => {
    for (const [cat, list] of Object.entries(WHAT_TO_CARRY)) {
      for (const item of list.filter((i) => i.check)) {
        expect(item.text, `${cat}: ${item.text}`).toMatch(/admit card|call letter|notice/i);
      }
    }
  });

  it("unknown and school-board categories fall back to the generic list", () => {
    expect(carryListFor("SCHOOL_BOARD")).toBe(WHAT_TO_CARRY.OTHER);
    expect(carryListFor(null)).toBe(WHAT_TO_CARRY.OTHER);
    expect(carryListFor("banking")).toBe(WHAT_TO_CARRY.BANKING);
  });
});

describe("examChecklistMeta", () => {
  it("title carries the upcoming exam date with its tier; description stays under 300 chars", () => {
    const c = buildExamChecklist({ exam: SSC_CGL, subjects: [], rows: [examOfficial], officialUrl: SSC_URL, now: NOW });
    const m = examChecklistMeta(SSC_CGL, c);
    expect(m.title).toMatch(/^SSC CGL last-minute checklist — exam 20 \S+ \(official\):/);
    expect(m.description.length).toBeLessThanOrEqual(300);
    expect(m.description).toContain("source tier");
    expect(m.description).not.toMatch(/verified|formulae|mock-score/i);
  });

  it("SSC CGL: the share preview never cuts the marking line (the reviewer's '−0' case)", () => {
    const c = buildExamChecklist({ exam: SSC_CGL, subjects: [], rows: [examOfficial], officialUrl: SSC_URL, now: NOW });
    const m = examChecklistMeta(SSC_CGL, c);
    expect(m.ogDescription.length).toBeLessThanOrEqual(OG_DESCRIPTION_MAX);
    expect(m.ogDescription).not.toMatch(/per correct|per wrong|negative|[+−]\d/);
    expect(m.ogDescription).toMatch(/Free\.$/);
    // The meta description either carries the whole marking clause or none of it.
    expect(m.description).toMatch(/Free\.$/);
    if (m.description.includes("per correct answer")) expect(m.description).toContain("+2 per correct answer, −0.5 per wrong answer)");
  });

  it("a long exam name drops whole clauses, never slices a number or the hedge", () => {
    const long: ChecklistExam = {
      ...SSC_CGL,
      code: "LONG",
      name: "Andhra Pradesh State Level Police Recruitment Board Stipendiary Cadet Trainee Sub Inspector of Police (Civil) and Reserve Sub Inspector of Police Preliminary Written Test",
      negativeMark: 0,
    };
    const c = buildExamChecklist({ exam: long, subjects: [], rows: [], officialUrl: null, now: NOW });
    expect(c.pattern.marking).toContain("confirm it in the official notice");
    const m = examChecklistMeta(long, c);
    expect(m.description.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
    expect(m.description).toMatch(/Free\.$/);
    if (m.description.includes("no negative mark")) expect(m.description).toContain("confirm it in the official notice");
    if (m.description.includes("questions")) expect(m.description).toContain("100 questions, 200 marks, 60 minutes");
    expect(m.ogDescription.length).toBeLessThanOrEqual(OG_DESCRIPTION_MAX);
  });

  it("a stage mismatch keeps the stored pattern's figures out of the meta and share preview", () => {
    const mains: TimelineInput = {
      id: "m2",
      label: "Mains Exam",
      date: d("2026-09-14"),
      isExamDay: true,
      kind: "EXAM",
      confidence: "official",
      url: "https://sbi.co.in/careers/po-mains",
    };
    const c = buildExamChecklist({ exam: SBI_PO, subjects: [], rows: [mains], officialUrl: null, now: NOW });
    expect(c.pattern.stageMismatch).not.toBeNull();
    const m = examChecklistMeta(SBI_PO, c);
    for (const text of [m.description, m.ogDescription]) {
      expect(text).not.toMatch(/\d+ questions|\d+ marks|\d+ minutes|per wrong answer/);
    }
    // The title still carries the announced Mains date with its tier.
    expect(m.title).toMatch(/exam 14 \S+ \((official|reported)\)/);
  });
});

// ── 16 Sep 2026: every sitting of the day, open-ended start rows ──────────

const KSRP: ChecklistExam = {
  ...SSC_CGL,
  code: "KA_KSRP",
  name: "Karnataka KSRP / KSISF / IRB Special Reserve Police Constable",
  shortName: "KA KSRP",
  category: "STATE_LEVEL",
  languages: [],
};
const KEA_URL = "https://cetonline.karnataka.gov.in";
const ksrpMorning: TimelineInput = {
  id: "cmu1n5l6d005bhfwbmcxt8izx",
  label: "Written test — outside Kalyana Karnataka (1,455 posts), 10:30–12:00",
  date: d("2026-09-20"),
  isExamDay: true,
  kind: "EXAM",
  confidence: "official",
  url: "https://cetonline.karnataka.gov.in/keawebentry456/kisrpc2026/ksrpnkkkannada.pdf",
  notes: null,
};
const ksrpAfternoon: TimelineInput = {
  ...ksrpMorning,
  id: "cmu1n5l7z005dhfwby22wojft",
  label: "Written test — Kalyana Karnataka (KSRP, KSISF, IRB; 859 posts), 15:00–16:30",
  url: "https://cetonline.karnataka.gov.in/keawebentry456/kiskk2026/KSRP_KK_3-5_SCHDkannada.pdf",
};
const ksrpReportedCopy: TimelineInput = {
  ...ksrpMorning,
  id: "cmu2p8pl00045ov8iob363eyv",
  label: "Written exam — KSRP/KSISF/IRB",
  url: "https://www.karmasandhan.com/ksrp-police-constable-recruitment-2026/",
};

describe("buildExamChecklist — every sitting of the exam day (KSRP, 20 Sep 2026)", () => {
  it("lists both official sittings, earliest first, on the eve and on the day, whatever the row order", () => {
    for (const rows of [
      [ksrpAfternoon, ksrpMorning, ksrpReportedCopy],
      [ksrpReportedCopy, ksrpMorning, ksrpAfternoon],
    ]) {
      for (const now of [ist("2026-09-19", 18, 30), ist("2026-09-20", 8)]) {
        const c = buildExamChecklist({ exam: KSRP, subjects: [], rows, officialUrl: KEA_URL, now });
        expect(c.examDay?.label).toBe(ksrpMorning.label);
        expect(c.sittings.map((s) => s.label)).toEqual([ksrpMorning.label, ksrpAfternoon.label]);
        expect(c.sittings.every((s) => s.dated.endsWith("(official)"))).toBe(true);
      }
    }
  });

  it("a single-sitting exam has one sitting (the page keeps its 'Tracker row' line)", () => {
    const c = buildExamChecklist({ exam: SSC_CGL, subjects: [], rows: [examOfficial], officialUrl: SSC_URL, now: NOW });
    expect(c.sittings).toHaveLength(1);
  });
});

describe("buildExamChecklist — open-ended start row (MP RAEO, 17 Sep 2026)", () => {
  const RAEO: ChecklistExam = { ...SSC_CGL, code: "MP_RAEO", name: "MP Krishi Vistar Adhikari", shortName: "MP RAEO", category: "STATE_LEVEL" };
  const raeoExam: TimelineInput = {
    id: "cmu1n5jyf003yhfwbwi7kmt7n",
    label: "Online exam begins — shifts 09:00–12:00 and 14:30–17:30 (end date not announced)",
    date: d("2026-09-17"),
    isExamDay: true,
    kind: "EXAM",
    confidence: "official",
    url: "https://esb.mp.gov.in/rulebooks/RB_2026/Group2_SG1_2026_ExamDateExtended_Rulebookpage_1_28__31072026.pdf",
    notes: null,
  };

  it("the morning after says the exam began and the end date is not announced — never 'the paper was held'", () => {
    const c = buildExamChecklist({ exam: RAEO, subjects: [], rows: [raeoExam], officialUrl: "https://esb.mp.gov.in", now: ist("2026-09-18", 9) });
    expect(c.phase).toBe("window");
    expect(c.state.openEnded).toBe(true);
    expect(c.window).toBeNull();
    expect(c.examDayLine).toMatch(/^Exam began 17 \S+ \(official\); end date not announced — your shift day is on your admit card\.$/);
    expect(c.examDayLine).not.toContain("held");
  });

  it("exam day itself still reads 'Exam today'", () => {
    const c = buildExamChecklist({ exam: RAEO, subjects: [], rows: [raeoExam], officialUrl: "https://esb.mp.gov.in", now: ist("2026-09-17", 9) });
    expect(c.examDayLine).toMatch(/^Exam today, 17 \S+ \(official\)\.$/);
  });
});

// ── Homepage strip ─────────────────────────────────────────────────────────

const strip = (over: Partial<StripRowInput>): StripRowInput => ({
  id: "s",
  examCode: "SSC_CGL",
  examShort: "SSC CGL",
  label: "Tier 1 exam",
  date: d("2026-09-13"),
  kind: "EXAM",
  confidence: "official",
  url: "https://ssc.gov.in/notice",
  source: null,
  notes: null,
  officialUrl: SSC_URL,
  ...over,
});

describe("pickExamsStrip — announced exam days only", () => {
  it("today's official and reported rows, never an expected one, deduped per exam and day", () => {
    const rows = [
      strip({ id: "a", examCode: "NDA", examShort: "NDA", url: "https://upsc.gov.in/nda", officialUrl: "https://upsc.gov.in" }),
      strip({ id: "b", examCode: "CDS", examShort: "CDS", confidence: "expected", url: null }),
      strip({ id: "c", examCode: "MPSC", examShort: "MPSC Group C", url: "https://testbook.com/mpsc", officialUrl: null }),
      strip({ id: "d", url: "https://testbook.com/ssc" }), // reported copy of…
      strip({ id: "e" }), // …the official SSC CGL row → official wins
      strip({ id: "f", examCode: "IBPS", examShort: "IBPS PO", date: d("2026-09-14") }), // tomorrow: not in today mode
      strip({ id: "g", examCode: "NDA", kind: "ADMIT_CARD" }), // not an exam day
    ];
    const s = pickExamsStrip(rows, ist("2026-09-13", 9));
    expect(s.mode).toBe("today");
    // Same day → official before reported, then by exam name (NDA < SSC CGL).
    expect(s.items.map((i) => i.id)).toEqual(["a", "e", "c"]);
    expect(s.items.map((i) => i.tier)).toEqual(["official", "official", "reported"]);
    expect(s.items.every((i) => /\((official|reported)\)$/.test(i.dated))).toBe(true);
    expect(s.items.some((i) => i.examCode === "CDS")).toBe(false);
  });

  it("no exam today → this week's next announced ones, soonest first, within 7 days", () => {
    const rows = [
      strip({ id: "w3", date: d("2026-09-18") }),
      strip({ id: "w1", examCode: "IBPS", examShort: "IBPS PO", date: d("2026-09-14") }),
      strip({ id: "far", examCode: "RRB", examShort: "RRB NTPC", date: d("2026-09-21") }), // 8 days
      strip({ id: "past", examCode: "UPSC", examShort: "UPSC", date: d("2026-09-12") }),
      strip({ id: "est", examCode: "CDS", examShort: "CDS", date: d("2026-09-15"), confidence: "expected", url: null }),
    ];
    const s = pickExamsStrip(rows, ist("2026-09-13", 20));
    expect(s.mode).toBe("week");
    expect(s.items.map((i) => [i.id, i.daysTo])).toEqual([
      ["w1", 1],
      ["w3", 5],
    ]);
  });

  it("nothing announced → renders nothing", () => {
    const s = pickExamsStrip(
      [strip({ confidence: "expected", url: null }), strip({ id: "x", confidence: "official", url: null, source: "ai-generated:claude" })],
      ist("2026-09-13", 9),
    );
    expect(s).toEqual({ mode: "none", items: [], more: 0 });
  });

  it("the 'how was it?' prompt opens when the first sitting ends, noon without timings, always from 18:00", () => {
    // 16 Sep 2026: the end of the first sitting, not its start.
    const timed = strip({ notes: "Paper I 10:00 AM to 12:30 PM" });
    expect(pickExamsStrip([timed], ist("2026-09-13", 10, 30)).items[0].pollOpen).toBe(false);
    expect(pickExamsStrip([timed], ist("2026-09-13", 12, 30)).items[0].pollOpen).toBe(true);
    const startOnly = strip({ notes: "Shift 1 from 10:00 AM" });
    expect(pickExamsStrip([startOnly], ist("2026-09-13", 9, 30)).items[0].pollOpen).toBe(false);
    expect(pickExamsStrip([startOnly], ist("2026-09-13", 10, 30)).items[0].pollOpen).toBe(true);
    const untimed = strip({});
    expect(pickExamsStrip([untimed], ist("2026-09-13", 11, 59)).items[0].pollOpen).toBe(false);
    expect(pickExamsStrip([untimed], ist("2026-09-13", 12)).items[0].pollOpen).toBe(true);
    const evening = strip({ notes: "Shift 7:00 PM to 9:00 PM" });
    expect(pickExamsStrip([evening], ist("2026-09-13", 18)).items[0].pollOpen).toBe(true);
  });

  it("two official rows of one exam on one day: the earlier sitting, whatever the row order (16 Sep 2026)", () => {
    const morning = strip({ id: "z-morning", label: "Written test — 10:30–12:00" });
    const afternoon = strip({ id: "a-afternoon", label: "Written test — 15:00–16:30" });
    expect(pickExamsStrip([afternoon, morning], ist("2026-09-13", 9)).items.map((i) => i.id)).toEqual(["z-morning"]);
    expect(pickExamsStrip([morning, afternoon], ist("2026-09-13", 9)).items.map((i) => i.id)).toEqual(["z-morning"]);
    const untimedB = strip({ id: "b" });
    const untimedA = strip({ id: "a" });
    expect(pickExamsStrip([untimedB, untimedA], ist("2026-09-13", 9)).items.map((i) => i.id)).toEqual(["a"]);
  });

  it("caps the list and counts the rest", () => {
    const rows = Array.from({ length: 11 }, (_, i) => strip({ id: `r${i}`, examCode: `EX${i}`, examShort: `Exam ${String(i).padStart(2, "0")}` }));
    const s = pickExamsStrip(rows, ist("2026-09-13", 9), 8);
    expect(s.items).toHaveLength(8);
    expect(s.more).toBe(3);
  });
});

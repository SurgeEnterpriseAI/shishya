// 27 Sep 2026 — scripts/national-exams-plan.ts: the honesty gate and the
// idempotent date plan behind scripts/add-national-exams.ts, plus the shipped
// data file (data/national-exams-2026.json) passing that gate.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  changedKeys,
  dateKey,
  expandSpecs,
  gateSpec,
  isIsoDay,
  planDates,
  validateSpec,
  type ExamSpec,
  type NationalExamsFile,
} from "../../scripts/national-exams-plan";

const FILE = JSON.parse(readFileSync(path.resolve(__dirname, "../../data/national-exams-2026.json"), "utf8")) as NationalExamsFile;

function base(): ExamSpec {
  return {
    code: "TEST_EXAM",
    exam: {
      name: "Test Exam",
      shortName: "Test",
      category: "GOVT_JOBS",
      description: "A test exam.",
      durationMin: 60,
      totalQuestions: 100,
      scoredQuestions: null,
      totalMarks: 100,
      marksPerQ: 1,
      negativeMark: 0.25,
      languages: ["EN"],
    },
    pattern: { stage: "Paper-I", url: "https://ssc.gov.in/notice.pdf", quote: "100 questions" },
    eligibility: {
      minAge: 18,
      maxAge: 27,
      ageRelaxation: null,
      educationTags: ["GRADUATE"],
      educationNote: null,
      vacanciesApprox: null,
      vacanciesNote: null,
      eligibilityNote: null,
      officialUrl: "https://ssc.gov.in/",
      officialName: "SSC",
      sources: [{ url: "https://ssc.gov.in/notice.pdf", quote: "age 18-27" }],
    },
    syllabus: { url: "https://ssc.gov.in/notice.pdf", quote: "section 14" },
    dates: [{ label: "Exam", date: "2026-11-01", kind: "EXAM", isExamDay: true, url: "https://ssc.gov.in/notice.pdf", quote: "01.11.2026" }],
  };
}

describe("validateSpec", () => {
  it("accepts a fully sourced spec", () => {
    expect(validateSpec(base())).toEqual([]);
  });

  it("refuses a date cited to an aggregator (reported tier is never written here)", () => {
    const s = base();
    s.dates[0].url = "https://testbook.com/ssc-cgl";
    expect(validateSpec(s).join(" ")).toMatch(/not an official-tier source/);
  });

  it("refuses a denylisted copycat host", () => {
    const s = base();
    s.dates[0].url = "https://sarkariresult.com.cm/x";
    expect(validateSpec(s).join(" ")).toMatch(/not an official-tier source/);
  });

  it("accepts the exam's own portal on a commercial TLD via officialUrl", () => {
    const s = base();
    s.eligibility.officialUrl = "https://www.example-board.com/";
    s.eligibility.sources = [{ url: "https://www.example-board.com/rules", quote: "rule" }];
    s.pattern.url = "https://www.example-board.com/pattern";
    s.dates[0].url = "https://www.example-board.com/dates";
    expect(validateSpec(s)).toEqual([]);
  });

  it("refuses empty quotes, impossible days and unknown kinds", () => {
    const s = base();
    s.dates = [
      { label: "A", date: "2026-02-30", kind: "EXAM", url: "https://ssc.gov.in/a.pdf", quote: "x" },
      { label: "B", date: "2026-03-01", kind: "LAUNCH" as never, url: "https://ssc.gov.in/a.pdf", quote: "x" },
      { label: "C", date: "2026-03-02", kind: "RESULT", url: "https://ssc.gov.in/a.pdf", quote: "  " },
    ];
    const msg = validateSpec(s).join(" | ");
    expect(msg).toMatch(/2026-02-30 is not a YYYY-MM-DD calendar day/);
    expect(msg).toMatch(/unknown kind LAUNCH/);
    expect(msg).toMatch(/"C": no quote/);
  });

  it("refuses a pattern source off an official host and a description promising practice", () => {
    const s = base();
    s.pattern.url = "https://www.jagranjosh.com/x";
    s.exam.description = "Free mock tests and PYQ for Test.";
    const msg = validateSpec(s).join(" | ");
    expect(msg).toMatch(/pattern source must be quoted and on an official host/);
    expect(msg).toMatch(/must not mention mocks/);
  });

  it("refuses scoredQuestions above totalQuestions and unknown languages", () => {
    const s = base();
    s.exam.scoredQuestions = 150;
    s.exam.languages = ["EN", "UR" as never];
    const msg = validateSpec(s).join(" | ");
    expect(msg).toMatch(/scoredQuestions/);
    expect(msg).toMatch(/unknown language UR/);
  });
});

describe("planDates", () => {
  const spec = base().dates;
  it("adds a date whose label + IST day is not live", () => {
    expect(planDates([], spec).add).toHaveLength(1);
  });
  it("is idempotent: the same label on the same stored day is present, not re-added", () => {
    const live = [{ label: "Exam", date: new Date("2026-11-01T00:00:00.000Z"), kind: "EXAM" }];
    const p = planDates(live, spec);
    expect(p.add).toHaveLength(0);
    expect(p.present).toHaveLength(1);
  });
  it("flags (never deletes) a live row of the same kind and day under another label", () => {
    const live = [{ label: "Written exam (reported)", date: new Date("2026-11-01T00:00:00.000Z"), kind: "EXAM" }];
    const p = planDates(live, spec);
    expect(p.add).toHaveLength(1);
    expect(p.sameKindDay[0]).toMatch(/Written exam \(reported\)/);
  });
  it("keys on the stored UTC-midnight day", () => {
    expect(dateKey("X", new Date("2026-12-14T00:00:00.000Z"))).toBe("X|2026-12-14");
    expect(dateKey("X", "2026-12-14")).toBe("X|2026-12-14");
  });
});

describe("isIsoDay / changedKeys", () => {
  it("accepts real days only", () => {
    expect(isIsoDay("2027-02-14")).toBe(true);
    expect(isIsoDay("2027-02-29")).toBe(false);
    expect(isIsoDay("14-02-2027")).toBe(false);
  });
  it("compares floats and arrays safely", () => {
    expect(changedKeys({ a: 1 / 3, b: ["EN"] }, { a: 0.3333333333333333, b: ["EN"] })).toEqual([]);
    expect(changedKeys({ a: 1, b: ["EN"] }, { a: 1, b: ["EN", "HI"] })).toEqual(["b"]);
    expect(changedKeys(null, { a: null })).toEqual([]);
  });
});

describe("GATE papers", () => {
  it("builds each paper from the shared organiser facts, with its own code in the window row", () => {
    const s = gateSpec("GATE_ME", { paperCode: "ME", paperName: "Mechanical Engineering", hasEngineeringMath: true }, FILE.gateCommon);
    expect(s.exam.shortName).toBe("GATE ME");
    expect(s.exam.totalQuestions).toBe(65);
    expect(s.exam.totalMarks).toBe(100);
    expect(s.exam.description).toMatch(/Engineering Mathematics 13 and the subject 72/);
    const window = s.dates.find((d) => d.date === "2027-02-06")!;
    expect(window.kind).toBe("OTHER"); // paper-wise schedule not out: never an EXAM row
    expect(window.label).toMatch(/the ME paper's own date is not announced yet/);
    expect(s.syllabus.url).toBe("https://gate2027.iitm.ac.in/static/doc/GATE2027_Syllabus/ME_GATE2027_Syllabus.pdf");
    const da = gateSpec("GATE_DA", { paperCode: "DA", paperName: "Data Science and Artificial Intelligence", hasEngineeringMath: false }, FILE.gateCommon);
    expect(da.exam.description).toMatch(/General Aptitude 15 marks and the subject 85/);
  });
});

describe("data/national-exams-2026.json", () => {
  const specs = expandSpecs(FILE);
  it("passes the honesty gate for every exam", () => {
    expect(specs.flatMap(validateSpec)).toEqual([]);
  });
  it("carries the exams of the lane and no duplicates", () => {
    const codes = specs.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toEqual(
      expect.arrayContaining(["UGC_NET", "CSIR_NET", "CUET_PG", "CLAT", "IIT_JAM", "GATE_ME", "GATE_EE", "GATE_ECE", "GATE_CE", "GATE_DA", "SSC_JE", "SSC_CPO", "BITSAT", "JNVST"]),
    );
  });
  it("says why every exam of the lane that is not written was left out", () => {
    expect(FILE.leftOut.map((l) => l.code)).toEqual(expect.arrayContaining(["RRB_JE", "ARMY_AGNIVEER", "NAVY_AGNIVEER", "AIRFORCE_AGNIVEER", "AFCAT"]));
    for (const l of FILE.leftOut) expect(l.why.length).toBeGreaterThan(40);
  });
  it("never stores an EXAM row for GATE before the paper-wise schedule", () => {
    for (const s of specs.filter((x) => x.code.startsWith("GATE_"))) {
      expect(s.dates.some((d) => d.kind === "EXAM")).toBe(false);
    }
  });
  // 27 Sep 2026 — verifier rejections, locked so a re-draft cannot bring them back.
  it("describes SSC CPO Paper-II as the notice's four-part table, not English alone", () => {
    const cpo = specs.find((s) => s.code === "SSC_CPO")!;
    expect(cpo.exam.description).not.toMatch(/Paper-II is English Comprehension/);
    expect(cpo.exam.description).toMatch(/20 questions for 40 marks each/);
    expect(cpo.exam.description).toMatch(/English Comprehension, 100 questions for 200 marks/);
  });
  it("stores no JNVST application deadline (reported extension, no official notice)", () => {
    const jnv = specs.find((s) => s.code === "JNVST")!;
    expect(jnv.dates.some((d) => d.kind === "APPLICATION_END")).toBe(false);
    expect(jnv.exam.description).not.toMatch(/31 July 2026/);
  });
});

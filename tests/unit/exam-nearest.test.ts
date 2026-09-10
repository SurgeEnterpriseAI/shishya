// Pure unit tests for src/lib/exam-nearest.ts — the "nothing matched"
// fallback. No DB. No network. Run with: npm test
//
// The rule this file defends: a guess is allowed to be wrong, but it must
// never be confident. Nonsense in must give nothing back, so the UI shows
// "nothing close either" rather than an authoritative-looking wrong exam.

import { describe, it, expect } from "vitest";
import { nearestExams } from "@/lib/exam-nearest";
import type { ExamLike } from "@/lib/exam-aliases";

const EXAMS: ExamLike[] = [
  { code: "TS_POLICE_PC", shortName: "TS Police PC", name: "Telangana Police Constable (TSLPRB)", state: "TS", category: "STATE_LEVEL" },
  { code: "JK_KASHMIR_TET", shortName: "JKTET", name: "Jammu & Kashmir Teacher Eligibility Test", state: "JK", category: "STATE_LEVEL" },
  { code: "JK_JKSSB", shortName: "JKSSB", name: "J&K Services Selection Board", state: "JK", category: "STATE_LEVEL" },
  { code: "AP_POLYCET", shortName: "AP POLYCET", name: "AP Polytechnic Common Entrance Test (AP POLYCET)", state: "AP", category: "STATE_LEVEL" },
  { code: "AP_EAMCET", shortName: "AP EAMCET", name: "AP Engineering Agricultural Medical Common Entrance Test", state: "AP", category: "STATE_LEVEL" },
  { code: "SSC_CGL", shortName: "SSC CGL", name: "SSC Combined Graduate Level", state: null, category: "GOVT_JOBS" },
];

describe("nearest exams — typo tolerance", () => {
  it("survives the misspellings students actually type", () => {
    const out = nearestExams("polytecnic", EXAMS).map((h) => h.exam.code);
    expect(out).toContain("AP_POLYCET");
  });

  it("recovers a mistyped exam name", () => {
    const out = nearestExams("eamcat", EXAMS).map((h) => h.exam.code);
    expect(out).toContain("AP_EAMCET");
  });
});

describe("nearest exams — state is the strongest signal", () => {
  it("reaches a state's exams when the query names the state", () => {
    // "kashmir" is a STATE_WORD; neither exam's text contains "recruitment".
    const out = nearestExams("kashmir recruitment", EXAMS);
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((h) => h.exam.state === "JK")).toBe(true);
    expect(out[0].why).toBe("state");
  });
});

describe("nearest exams — refuses to guess", () => {
  it("returns nothing for a query with no real signal", () => {
    expect(nearestExams("zzzzqqqq wobble", EXAMS)).toEqual([]);
  });

  it("ignores queries too short to mean anything", () => {
    expect(nearestExams("ab", EXAMS)).toEqual([]);
    expect(nearestExams("  ", EXAMS)).toEqual([]);
  });

  it("does not match on filler words alone", () => {
    // "exam" and "preparation" are stop words — on their own they carry no
    // intent, and matching them would surface the entire catalogue.
    expect(nearestExams("exam preparation", EXAMS)).toEqual([]);
  });

  it("never returns more than asked", () => {
    expect(nearestExams("police constable", EXAMS, 2).length).toBeLessThanOrEqual(2);
  });
});

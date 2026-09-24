// Search aliases (24 Sep 2026) — src/lib/exam-aliases.ts.
//
// 5 students asked /ask for the UKSSSC Junior Assistant post, some as
// "Kanishth Sahayak" (its Hindi name), and 4 needed the web fallback: the
// "junior assistant" alias reached only the Telangana and Tamil Nadu Group IV
// exams, and the /ask engine filters by the resolved codes. An alias names a
// code only where that exam's own catalogue row names the post, so these
// tests also pin the list. "SCT PC" (the Stipendiary Cadet Trainee Police
// Constable designation) is one alias → two exams, AP and TS — the design
// supports it; guarded here too.

import { describe, it, expect } from "vitest";
import { contextualExamFilter, resolveAliases, type ExamLike } from "@/lib/exam-aliases";

const EXAMS: ExamLike[] = [
  { code: "TS_TSPSC_GROUP4", shortName: "TSPSC Group IV", name: "TSPSC Group IV Services", state: "TS", category: "STATE_LEVEL" },
  { code: "TN_TNPSC_GROUP4", shortName: "TNPSC Group IV", name: "TNPSC Group IV", state: "TN", category: "STATE_LEVEL" },
  { code: "UK_UKSSSC", shortName: "UKSSSC", name: "Uttarakhand Subordinate Services Selection Commission (UKSSSC)", state: "UK", category: "STATE_LEVEL" },
  { code: "AP_APPSC_GROUP3", shortName: "APPSC Group III", name: "APPSC Group III Services", state: "AP", category: "STATE_LEVEL" },
  { code: "JK_JKSSB", shortName: "JKSSB", name: "J&K Services Selection Board (JKSSB)", state: "JK", category: "STATE_LEVEL" },
  { code: "UP_UPSSSC_PET", shortName: "UPSSSC PET", name: "UPSSSC Preliminary Eligibility Test (PET)", state: "UP", category: "STATE_LEVEL" },
  { code: "RJ_RSMSSB", shortName: "RSMSSB", name: "Rajasthan Subordinate & Ministerial Services Selection Board (RSMSSB)", state: "RJ", category: "STATE_LEVEL" },
  { code: "AP_POLICE_PC", shortName: "AP Police PC", name: "AP Police Constable (APSLPRB)", state: "AP", category: "STATE_LEVEL" },
  { code: "TS_POLICE_PC", shortName: "TS Police PC", name: "Telangana Police Constable (TSLPRB)", state: "TS", category: "STATE_LEVEL" },
  { code: "TN_POLICE_PC", shortName: "TN Police PC", name: "Tamil Nadu Police Constable (TNUSRB Grade II)", state: "TN", category: "STATE_LEVEL" },
];

const JUNIOR_ASSISTANT = ["AP_APPSC_GROUP3", "JK_JKSSB", "TN_TNPSC_GROUP4", "TS_TSPSC_GROUP4", "UK_UKSSSC"];

describe("Junior Assistant / Kanishth Sahayak → UKSSSC", () => {
  it("'junior assistant' reaches every exam whose catalogue row names the post — UKSSSC included", () => {
    expect([...resolveAliases("junior assistant").codes].sort()).toEqual(JUNIOR_ASSISTANT);
    expect([...resolveAliases("Junior Asst").codes].sort()).toEqual(JUNIOR_ASSISTANT);
  });

  it("the /ask engine's usual keyword forms resolve to UKSSSC", () => {
    for (const q of ["uksssc junior assistant", "UKSSSC Junior Assistant exam", "junior assistant uttarakhand"]) {
      expect(resolveAliases(q).codes.has("UK_UKSSSC"), q).toBe(true);
    }
    // The state bridge still reads the state, so /ask can narrow to UK.
    expect(resolveAliases("junior assistant uttarakhand").state).toBe("UK");
  });

  it("the Hindi name, in Latin or Devanagari, goes to UKSSSC alone", () => {
    for (const q of ["kanishth sahayak", "Kanishtha Sahayak", "kanisth sahayak bharti", "कनिष्ठ सहायक", "uksssc कनिष्ठ सहायक"]) {
      expect([...resolveAliases(q).codes], q).toEqual(["UK_UKSSSC"]);
    }
  });

  it("an exam picker search for the post now lists UKSSSC", () => {
    const out = contextualExamFilter("Kanishth Sahayak", EXAMS).map((e) => e.code);
    expect(out).toEqual(["UK_UKSSSC"]);
    const ja = contextualExamFilter("junior assistant uttarakhand", EXAMS).map((e) => e.code);
    expect(ja[0]).toBe("UK_UKSSSC");
  });

  it("boards that name the post only in tracker rows or news are not claimed", () => {
    const codes = resolveAliases("junior assistant").codes;
    expect(codes.has("RJ_RSMSSB")).toBe(false);
    expect(codes.has("UP_UPSSSC_PET")).toBe(false);
  });
});

describe("SCT PC — one alias, two exams", () => {
  it("resolves to both the AP and TS constable exams, never Tamil Nadu", () => {
    const codes = resolveAliases("SCT PC").codes;
    expect(codes.has("AP_POLICE_PC")).toBe(true);
    expect(codes.has("TS_POLICE_PC")).toBe(true);
    const out = contextualExamFilter("SCT PC", EXAMS).map((e) => e.code);
    expect(out.slice(0, 2).sort()).toEqual(["AP_POLICE_PC", "TS_POLICE_PC"]);
    expect(out).not.toContain("TN_POLICE_PC");
  });
});

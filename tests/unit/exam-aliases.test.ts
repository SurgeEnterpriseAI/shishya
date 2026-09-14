// Pure unit tests for the exam-search alias bridge (src/lib/exam-aliases.ts).
// No DB. No network. Run with: npm test
//
// The case that started this file: on 10 Sep 2026 a Telangana aspirant
// searched "SCT PC" — Stipendiary Cadet Trainee Police Constable, the
// TSLPRB's own designation — got nothing, and enrolled in TAMIL NADU
// Police Constable instead, taking two mocks on the wrong state's
// syllabus. A missing alias costs study time; a wrong one costs more.

import { describe, it, expect } from "vitest";
import { contextualExamFilter, resolveAliases, type ExamLike } from "@/lib/exam-aliases";

// A fixture shaped like the real rows, including the two exams that share
// the "SCT PC" designation and the Tamil Nadu one that wrongly won before.
const EXAMS: ExamLike[] = [
  { code: "TS_POLICE_PC", shortName: "TS Police PC", name: "Telangana Police Constable (TSLPRB)", state: "TS", category: "STATE_LEVEL" },
  { code: "AP_POLICE_PC", shortName: "AP Police PC", name: "AP Police Constable (APSLPRB)", state: "AP", category: "STATE_LEVEL" },
  { code: "TN_POLICE_PC", shortName: "TN Police PC", name: "Tamil Nadu Police Constable (TNUSRB Grade II)", state: "TN", category: "STATE_LEVEL" },
  { code: "TS_TSPSC_GROUP2", shortName: "TSPSC Group II", name: "TSPSC Group II Services", state: "TS", category: "STATE_LEVEL" },
  { code: "SSC_GD", shortName: "SSC GD", name: "SSC General Duty Constable", state: null, category: "GOVT_JOBS" },
  { code: "RRB_NTPC", shortName: "RRB NTPC", name: "RRB Non-Technical Popular Categories", state: null, category: "GOVT_JOBS" },
  { code: "SSC_MTS", shortName: "SSC MTS", name: "SSC Multi Tasking Staff", state: null, category: "GOVT_JOBS" },
];

describe("alias bridge — the SCT PC regression", () => {
  it("resolves the official Telangana/Andhra constable designation to BOTH states", () => {
    const hit = resolveAliases("sct pc");
    expect(hit.codes.has("TS_POLICE_PC")).toBe(true);
    expect(hit.codes.has("AP_POLICE_PC")).toBe(true);
  });

  it("puts the right constable exams above Tamil Nadu for an SCT PC search", () => {
    const out = contextualExamFilter("SCT PC", EXAMS).map((e) => e.code);
    expect(out.slice(0, 2).sort()).toEqual(["AP_POLICE_PC", "TS_POLICE_PC"]);
    // Tamil Nadu must not be the answer to a Telangana designation. It is
    // dropped outright here — the designation is not in its name and the
    // alias does not list it — which is stronger than merely ranking lower.
    expect(out).not.toContain("TN_POLICE_PC");
  });

  it("narrows to one state when the query names it", () => {
    const out = contextualExamFilter("telangana sct pc", EXAMS).map((e) => e.code);
    expect(out[0]).toBe("TS_POLICE_PC");
  });
});

describe("alias bridge — post names students actually type", () => {
  const cases: Array<[string, string]> = [
    ["station master", "RRB_NTPC"],
    ["havaldar", "SSC_MTS"],
    ["crpf", "SSC_GD"],
    ["gd constable", "SSC_GD"],
    // 15 Sep 2026 search misses, now exams of their own.
    ["ksrp", "KA_KSRP"],
    ["srpc", "KA_KSRP"],
    ["mpreao", "MP_RAEO"],
    ["raeo", "MP_RAEO"],
    ["krishi vistar adhikari", "MP_RAEO"],
  ];
  for (const [query, code] of cases) {
    it(`"${query}" reaches ${code}`, () => {
      expect(resolveAliases(query).codes.has(code)).toBe(true);
    });
  }

  it("carries the Telangana TG rebrand, which no exam name spells", () => {
    // TSPSC became TGPSC in 2024; the stored names still say TSPSC.
    expect(resolveAliases("tgpsc").codes.has("TS_TSPSC_GROUP2")).toBe(true);
  });
});

describe("alias bridge — safety invariants", () => {
  it("never fires on an unrelated query", () => {
    const hit = resolveAliases("nothing to see here");
    expect(hit.codes.size).toBe(0);
    expect(hit.state).toBe(null);
  });

  it("short keys match as whole words, not inside longer ones", () => {
    // "ima" (Indian Military Academy) must not fire inside "himachal".
    const inside = resolveAliases("himachal teacher");
    expect(inside.codes.has("CDS")).toBe(false);
    // …but does fire when the aspirant actually types it.
    expect(resolveAliases("ima ota").codes.has("CDS")).toBe(true);
  });

  it("an empty query returns every exam untouched", () => {
    expect(contextualExamFilter("   ", EXAMS)).toHaveLength(EXAMS.length);
  });
});

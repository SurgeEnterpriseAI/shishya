// examKind / examKindLabel / STATE_CET_CODES / entranceGroupOf (26 Sep 2026).
// The state-CET list is exact (confirmed against the prod DB on 26 Sep 2026)
// and never pattern-matched: HR_HSSC_CET matches /CET/ but is the Haryana
// Staff Selection Commission's recruitment eligibility test.

import { describe, it, expect } from "vitest";
import {
  ENTRANCE_GROUPS,
  STATE_CET_CODES,
  entranceGroupOf,
  examKind,
  examKindLabel,
  isStateCetCode,
} from "@/lib/exam-kind";

describe("examKind", () => {
  it("maps the entrance categories to entrance", () => {
    for (const [code, category] of [
      ["JEE_MAIN", "ENGINEERING"],
      ["GATE_CSE", "ENGINEERING"],
      ["NEET_UG", "MEDICAL"],
      ["AILET", "LAW"],
      ["CAT", "MBA"],
      ["CUET_UG", "UNIVERSITY"],
      ["NID_DAT", "UNIVERSITY"],
    ]) {
      expect(examKind({ code, category }), code).toBe("entrance");
    }
  });

  it("olympiads, professional and government", () => {
    expect(examKind({ code: "IOQM", category: "OLYMPIAD" })).toBe("olympiad");
    expect(examKind({ code: "CA_FOUNDATION", category: "OTHER" })).toBe("professional");
    expect(examKind({ code: "CS_FOUNDATION", category: "OTHER" })).toBe("professional");
    for (const [code, category] of [
      ["SSC_CGL", "GOVT_JOBS"],
      ["CDS", "GOVT_JOBS"],
      ["UPSC_PRELIMS", "CIVIL_SERVICES"],
      ["SBI_PO", "BANKING"],
      ["CTET", "TEACHING"],
      ["KA_KPSC_KAS", "STATE_LEVEL"],
    ]) {
      expect(examKind({ code, category }), code).toBe("government");
    }
  });

  it("NDA is an entrance exam although the DB files it under GOVT_JOBS", () => {
    expect(examKind({ code: "NDA", category: "GOVT_JOBS" })).toBe("entrance");
    expect(examKindLabel({ code: "NDA", category: "GOVT_JOBS" })).toBe("Entrance exam");
  });

  it("every state CET is an entrance exam", () => {
    for (const code of STATE_CET_CODES) {
      expect(examKind({ code, category: "STATE_LEVEL" }), code).toBe("entrance");
      expect(isStateCetCode(code)).toBe(true);
    }
  });

  it("HR_HSSC_CET is a recruitment test, not a state CET", () => {
    expect(isStateCetCode("HR_HSSC_CET")).toBe(false);
    expect(STATE_CET_CODES).not.toContain("HR_HSSC_CET");
    expect(examKind({ code: "HR_HSSC_CET", category: "STATE_LEVEL" })).toBe("government");
    expect(examKindLabel({ code: "HR_HSSC_CET", category: "STATE_LEVEL" })).toBe("Government recruitment exam");
  });

  it("an unknown category is government, never guessed as entrance", () => {
    expect(examKind({ code: "X", category: null })).toBe("government");
    expect(examKind({ code: "X" })).toBe("government");
  });
});

describe("STATE_CET_CODES", () => {
  // The 25 the code pattern finds, plus AS_ASSAMCEE, BR_BCECE and BR_DCECE —
  // admission tests by name that no CET-style code pattern catches.
  it("is exactly the 28 admission tests confirmed in the DB on 26 Sep 2026", () => {
    expect([...STATE_CET_CODES].sort()).toEqual([
      "AP_EAMCET", "AP_ICET", "AP_LAWCET", "AP_POLYCET",
      "AS_ASSAMCEE", "BR_BCECE", "BR_DCECE",
      "GJ_GUJCET", "HP_POLYTECHNIC", "JK_JKCET",
      "KA_COMEDK", "KA_KCET", "KL_KEAM",
      "MH_MAHCET_LAW", "MH_MAHCET_MBA", "MH_MHTCET", "MH_NURSING_CET",
      "OD_OJEE", "PB_PUNJABCET", "RJ_REAP",
      "TS_EAMCET", "TS_ICET", "TS_LAWCET", "TS_POLYCET",
      "UK_POLYTECHNIC", "UP_JEECUP", "UP_UPCET", "WB_WBJEE",
    ]);
    expect(new Set(STATE_CET_CODES).size).toBe(STATE_CET_CODES.length);
  });
});

describe("examKindLabel", () => {
  it("has the four honest labels", () => {
    expect(examKindLabel({ code: "SSC_GD", category: "GOVT_JOBS" })).toBe("Government recruitment exam");
    expect(examKindLabel({ code: "KA_KCET", category: "STATE_LEVEL" })).toBe("Entrance exam");
    expect(examKindLabel({ code: "SOF_IMO", category: "OLYMPIAD" })).toBe("Olympiad");
    expect(examKindLabel({ code: "CA_FOUNDATION", category: "OTHER" })).toBe("Professional exam");
  });
});

describe("entranceGroupOf — the /exams/entrance landing's groups", () => {
  it("files each entrance exam in one group, government and professional in none", () => {
    expect(entranceGroupOf({ code: "JEE_ADVANCED", category: "ENGINEERING" })).toBe("engineering");
    expect(entranceGroupOf({ code: "NEET_PG", category: "MEDICAL" })).toBe("medical");
    expect(entranceGroupOf({ code: "NIFT", category: "UNIVERSITY" })).toBe("university");
    expect(entranceGroupOf({ code: "LSAT_INDIA", category: "LAW" })).toBe("law");
    expect(entranceGroupOf({ code: "CAT", category: "MBA" })).toBe("management");
    expect(entranceGroupOf({ code: "NDA", category: "GOVT_JOBS" })).toBe("defence");
    expect(entranceGroupOf({ code: "NSEP", category: "OLYMPIAD" })).toBe("olympiad");
    expect(entranceGroupOf({ code: "WB_WBJEE", category: "STATE_LEVEL" })).toBe("state-cet");
    expect(entranceGroupOf({ code: "HR_HSSC_CET", category: "STATE_LEVEL" })).toBeNull();
    expect(entranceGroupOf({ code: "CDS", category: "GOVT_JOBS" })).toBeNull();
    expect(entranceGroupOf({ code: "CA_FOUNDATION", category: "OTHER" })).toBeNull();
  });

  it("every group key it returns is a listed group, and every entrance-kind exam has a group", () => {
    const keys = new Set(ENTRANCE_GROUPS.map((g) => g.key));
    for (const e of [
      { code: "JEE_MAIN", category: "ENGINEERING" },
      { code: "NDA", category: "GOVT_JOBS" },
      { code: "KA_KCET", category: "STATE_LEVEL" },
      { code: "IOQM", category: "OLYMPIAD" },
    ]) {
      const g = entranceGroupOf(e);
      expect(g).not.toBeNull();
      expect(keys.has(g!)).toBe(true);
      expect(["entrance", "olympiad"]).toContain(examKind(e));
    }
  });
});

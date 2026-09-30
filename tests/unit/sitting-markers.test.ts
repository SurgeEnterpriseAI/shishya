// Sitting / stage markers (30 Sep 2026, official-watch review),
// src/lib/sitting-markers.ts. The labels below are the live tracker's own
// shapes (read-only look at NDA, CDS, RRB NTPC, SSC CGL/CHSL, JEE Main, IBPS /
// SBI PO rows on 30 Sep 2026) and the bodies' printed wording. No DB.

import { describe, it, expect } from "vitest";
import { hasFamily, markerConflict, releaseVersion, sittingMarkers, sittingMarkersOf } from "@/lib/sitting-markers";

const m = (text: string, names: string[] = []) => [...sittingMarkers(text, names)].sort();

describe("sittingMarkers — the families that tell sittings apart", () => {
  it("the exam's own ordinal: UPSC's '(I)' / '(II)', 'Examination-II', the tracker's 'NDA 2' / 'CDS II'", () => {
    expect(m("Answer Key: National Defence Academy and Naval Academy Examination (I), 2026")).toEqual(["sitting:1"]);
    expect(m("Combined Defence Services Examination (II), 2026")).toEqual(["sitting:2"]);
    expect(m("NDA & NA (II) 2026 exam")).toEqual(["sitting:2"]);
    expect(m("CDS Examination-II 2026")).toEqual(["sitting:2"]);
    expect(m("NDA 2 2026 exam", ["NDA"])).toEqual(["sitting:2"]);
    expect(m("CDS II 2026 provisional answer key", ["CDS"])).toEqual(["sitting:2"]);
    expect(m("Answer key — NDA 1 2026", ["NDA"])).toEqual(["sitting:1"]);
    expect(m("AFCAT 01/2026 result", ["AFCAT"])).toEqual(["sitting:1"]);
  });
  it("a year, a paper, an annexure or a download counter is never the exam's ordinal", () => {
    expect(m("NDA 2026 exam", ["NDA"])).toEqual([]);
    expect(m("Answer key Paper (I) and Paper (II)")).toEqual([]);
    expect(m("Annexure (2) — Download (1)")).toEqual([]);
    expect(m("Examination 2026 — 1st shift")).toEqual([]);
  });
  it("numbered stages, lists included; roman numerals read as digits", () => {
    expect(m("Final Answer Key of Combined Graduate Level Examination 2026 (Tier-I)")).toEqual(["tier:1"]);
    expect(m("Tier 1 exam concludes")).toEqual(["tier:1"]);
    expect(m("Result of Tier-I & II")).toEqual(["tier:1", "tier:2"]);
    expect(m("CBT-I exam Phase 2 (Undergraduate posts)")).toEqual(["cbt:1", "phase:2"]);
    // The CEN is no stage number; since 30 Sep 2026 it is its own family (RRB
    // lists by CEN — tests/unit/official-listings.test.ts "cen markers").
    expect(m("Answer key — CBT 2 Undergraduate (CEN 07/2025)")).toEqual(["cbt:2", "cen:07/2025"]);
    expect(m("JEE Main 2026 Session 2 exam (Paper 1)")).toEqual(["session:2"]);
  });
  it("prelims / mains — 'JEE Main' is the exam, 'Preliminary Key' is a provisional key", () => {
    expect(m("Prelims exam (Day 1)")).toEqual(["pm:prelims"]);
    expect(m("UPSC CSE Prelims Answer Key 2026")).toEqual(["pm:prelims"]);
    expect(m("Civil Services (Preliminary) Examination, 2026")).toEqual(["pm:prelims"]);
    expect(m("Mains Exam")).toEqual(["pm:mains"]);
    expect(m("Civil Services (Main) Examination")).toEqual(["pm:mains"]);
    expect(m("JEE Main 2026 answer key")).toEqual([]);
    expect(m("Group-II Preliminary Key")).toEqual([]);
    expect(m("Preliminary Answer Key of Group-I")).toEqual([]);
  });
  it("parts of one sitting and test types are never compared", () => {
    expect(m("Prelims exam (Day 2) Shift 3 Set A")).toEqual(["pm:prelims"]);
    expect(m("SSC CHSL 2025 Typing Test")).toEqual([]);
  });
});

describe("markerConflict — both sides name the family and share nothing", () => {
  const due = (labels: string[], names: string[] = []) => sittingMarkersOf(labels, names);
  it("(I) vs a (II) sitting; Tier-I vs Tier 2; prelims vs mains", () => {
    expect(markerConflict(due(["NDA 2 2026 exam"], ["NDA"]), sittingMarkers("Examination (I), 2026"))).toBe("sitting");
    expect(markerConflict(due(["Tier 2 exam"]), sittingMarkers("(Tier-I)"))).toBe("tier");
    expect(markerConflict(due(["Mains Exam"]), sittingMarkers("Prelims result"))).toBe("pm");
  });
  it("the same one, a list naming it, or one side silent → no conflict", () => {
    expect(markerConflict(due(["Tier 1 exam begins", "Tier 1 exam concludes"]), sittingMarkers("(Tier-I)"))).toBeNull();
    expect(markerConflict(due(["Tier 2 exam"]), sittingMarkers("Result of Tier-I & II"))).toBeNull();
    expect(markerConflict(due(["Tier 2 exam"]), sittingMarkers("Final result"))).toBeNull();
    expect(markerConflict(due(["Written exam"]), sittingMarkers("(Tier-I)"))).toBeNull();
  });
  it("families are compared one by one: a shared paper never hides another session", () => {
    const want = due(["JEE Main 2026 Session 2 exam (Paper 1)"]);
    expect(markerConflict(want, sittingMarkers("JEE Main 2026 Session 1 answer key (Paper 1)"))).toBe("session");
  });
  it("the sitting's labels are unioned (a multi-day sitting)", () => {
    expect([...due(["CBT-I exam Phase 1", "CBT-I exam Phase 2"])].sort()).toEqual(["cbt:1", "phase:1", "phase:2"]);
    expect(hasFamily(due(["NDA 2 2026 exam"], ["NDA"]), "sitting")).toBe(true);
    expect(hasFamily(due(["NDA 2026 exam"], ["NDA"]), "sitting")).toBe(false);
  });
});

describe("releaseVersion", () => {
  it("provisional vs final key; written vs final result; neither or both → null", () => {
    expect(releaseVersion("ANSWER_KEY", "Provisional Answer Key")).toBe("provisional");
    expect(releaseVersion("ANSWER_KEY", "Tentative answer keys")).toBe("provisional");
    expect(releaseVersion("ANSWER_KEY", "Preliminary Key")).toBe("provisional");
    expect(releaseVersion("ANSWER_KEY", "Final answer key (expected)")).toBe("final");
    expect(releaseVersion("ANSWER_KEY", "Answer key")).toBeNull();
    expect(releaseVersion("RESULT", "Written result")).toBe("written");
    expect(releaseVersion("RESULT", "Final Result declared")).toBe("final");
    expect(releaseVersion("RESULT", "Final result of the written exam")).toBeNull();
  });
});

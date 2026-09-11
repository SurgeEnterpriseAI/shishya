// Pure unit tests for acceptedPlanDays / announcedExamDays
// (src/lib/exam-week-mail.ts). No DB. Run with: npm test
//
// The rule under test: an official or reported exam day beats a student's
// typed coach-plan date. Measured 11 Sep 2026 — every coach plan within
// three days of an announced day was EARLY, and the eve mail went out on
// the wrong night.

import { describe, it, expect } from "vitest";
import { acceptedPlanDays, announcedExamDays } from "@/lib/exam-week-mail";
import { buildTimeline } from "@/lib/exam-timeline";

describe("acceptedPlanDays — announced day wins", () => {
  it("routes a plan dated one day early to the announced eve, not its own", () => {
    // NDA official 13 Sep. Student's plan says 12 Sep.
    const announced = ["2026-09-13"];
    // On the 11th (target = tomorrow = 12th): the plan date 12 must NOT be accepted.
    expect(acceptedPlanDays(announced, "2026-09-12")).not.toContain("2026-09-12");
    // On the 12th (target = 13th): plan dates 10..16 all map to the 13th.
    const forThe13th = acceptedPlanDays(announced, "2026-09-13");
    expect(forThe13th).toContain("2026-09-12");
    expect(forThe13th).toContain("2026-09-13");
    expect(forThe13th).toContain("2026-09-11");
  });

  it("keeps the student's own date when nothing is announced nearby", () => {
    expect(acceptedPlanDays([], "2026-09-08")).toEqual(["2026-09-08"]);
    // An announced day 10 days away is not "nearby".
    expect(acceptedPlanDays(["2026-09-18"], "2026-09-08")).toEqual(["2026-09-08"]);
  });

  it("assigns each plan date to its NEAREST announced day when two are close", () => {
    // Two announced sittings, 12th and 15th. Plan on the 14th → 15th, not 12th.
    const announced = ["2026-09-12", "2026-09-15"];
    expect(acceptedPlanDays(announced, "2026-09-15")).toContain("2026-09-14");
    expect(acceptedPlanDays(announced, "2026-09-12")).not.toContain("2026-09-14");
    expect(acceptedPlanDays(announced, "2026-09-12")).toContain("2026-09-11");
  });

  it("a target that is not itself announced only accepts plans that map to it", () => {
    // Announced 13th; target 10th (three days early): the 10th maps to the 13th, so nothing is accepted for the 10th.
    expect(acceptedPlanDays(["2026-09-13"], "2026-09-10")).toEqual([]);
  });
});

describe("announcedExamDays", () => {
  it("lists official and reported EXAM rows only, never expected or non-exam rows", () => {
    const rows = [
      { id: "a", label: "Exam", date: "2026-09-13T00:00:00.000Z", isExamDay: true, kind: "EXAM", confidence: "official", url: "https://upsc.gov.in/x" },
      { id: "b", label: "Exam (estimate)", date: "2026-09-25T00:00:00.000Z", isExamDay: true, kind: "EXAM", confidence: "expected", url: null },
      { id: "c", label: "Admit card", date: "2026-09-10T00:00:00.000Z", isExamDay: false, kind: "ADMIT_CARD", confidence: "official", url: "https://upsc.gov.in/y" },
    ];
    const timeline = buildTimeline(rows as any, new Date("2026-09-11T06:00:00Z"), "https://upsc.gov.in");
    expect(announcedExamDays(timeline)).toEqual(["2026-09-13"]);
  });
});

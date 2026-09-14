import { describe, expect, it } from "vitest";
import { STANDING_MIN_ENTRIES, estimateScore, sittingKey, standingView, validCounts } from "@/lib/score-standing";

describe("validCounts", () => {
  it("accepts counts that fit the paper", () => {
    expect(validCounts({ attempted: 70, correct: 60, wrong: 10 }, 80)).toEqual({ attempted: 70, correct: 60, wrong: 10 });
    expect(validCounts({ attempted: 0, correct: 0, wrong: 0 }, 80)).toEqual({ attempted: 0, correct: 0, wrong: 0 });
  });

  it("refuses counts no answer sheet could have", () => {
    expect(validCounts({ attempted: 81, correct: 60, wrong: 10 }, 80)).toBeNull();
    expect(validCounts({ attempted: 50, correct: 45, wrong: 10 }, 80)).toBeNull();
    expect(validCounts({ attempted: 50, correct: -1, wrong: 10 }, 80)).toBeNull();
    expect(validCounts({ attempted: 50, correct: 4.5, wrong: 10 }, 80)).toBeNull();
  });
});

describe("estimateScore", () => {
  it("applies the marking scheme and rounds like the calculator", () => {
    expect(estimateScore({ attempted: 70, correct: 60, wrong: 10 }, { marksPerQ: 2, negativeMark: 0.5, scored: 80 })).toBe(115);
    expect(estimateScore({ attempted: 3, correct: 2, wrong: 1 }, { marksPerQ: 1, negativeMark: 0.33, scored: 100 })).toBe(1.67);
    expect(estimateScore({ attempted: 150, correct: 120, wrong: 30 }, { marksPerQ: 1, negativeMark: 0, scored: 150 })).toBe(120);
  });
});

describe("sittingKey", () => {
  it("keys a sitting by its IST day and stage label", () => {
    expect(sittingKey({ day: "2026-09-07", label: "Special TET 2026 exam (In-Service Teachers)" })).toBe(
      "2026-09-07|special-tet-2026-exam-in-service-teachers",
    );
    expect(sittingKey(null)).toBeNull();
    expect(sittingKey({ day: "", label: "Exam" })).toBeNull();
  });
});

describe("standingView", () => {
  it("says nothing without entries and only the count below the threshold", () => {
    expect(standingView({ n: 0, higher: 0, tied: 0 })).toEqual({ kind: "hidden" });
    expect(standingView({ n: STANDING_MIN_ENTRIES - 1, higher: 3, tied: 1 })).toEqual({ kind: "count", n: STANDING_MIN_ENTRIES - 1 });
  });

  it("gives higher and lower counts once enough candidates have added a score", () => {
    expect(standingView({ n: 40, higher: 10, tied: 2 })).toEqual({ kind: "position", n: 40, higher: 10, lower: 28 });
    expect(standingView({ n: 30, higher: 0, tied: 30 })).toEqual({ kind: "position", n: 30, higher: 0, lower: 0 });
  });
});

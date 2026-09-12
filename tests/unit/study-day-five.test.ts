// Tests for the pure half of the "resume, never stack" rule in
// src/lib/study-day-five.ts. /api/mocks stores whatever the validated
// scope allows (it only 400s on an EMPTY pool and its top-up never leaves
// the requested topic / exam), so today's 5 on a thin topic is a 3-4 id
// set — selectTodaysDailyFive must recognise it, or /today builds another
// set on every tap and the results block keeps offering "Open today's 5".

import { describe, it, expect } from "vitest";
import { DAILY_FIVE_COUNT, selectTodaysDailyFive } from "@/lib/study-day-five";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `q${i + 1}`);

describe("selectTodaysDailyFive", () => {
  it("matches a full 5-question set", () => {
    expect(selectTodaysDailyFive([{ id: "m5", questionIds: ids(DAILY_FIVE_COUNT) }])).toBe("m5");
  });

  it("matches a thin-pool set with fewer than 5 ids (the stacking bug)", () => {
    expect(selectTodaysDailyFive([{ id: "m4", questionIds: ids(4) }])).toBe("m4");
    expect(selectTodaysDailyFive([{ id: "m1", questionIds: ids(1) }])).toBe("m1");
  });

  it("never resumes an empty set", () => {
    expect(selectTodaysDailyFive([{ id: "m0", questionIds: [] }])).toBeNull();
  });

  it("ignores larger sets (a 10-question topic drill is not today's 5)", () => {
    expect(selectTodaysDailyFive([{ id: "m10", questionIds: ids(10) }])).toBeNull();
    expect(selectTodaysDailyFive([{ id: "m6", questionIds: ids(6) }])).toBeNull();
  });

  it("returns the EARLIEST qualifying set, skipping non-qualifying ones before it", () => {
    const today = [
      { id: "empty", questionIds: [] },
      { id: "drill10", questionIds: ids(10) },
      { id: "first5", questionIds: ids(5) },
      { id: "second4", questionIds: ids(4) },
    ];
    expect(selectTodaysDailyFive(today)).toBe("first5");
  });

  it("is null when there is nothing today", () => {
    expect(selectTodaysDailyFive([])).toBeNull();
  });
});

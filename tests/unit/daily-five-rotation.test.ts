// Daily-5 topic rotation (15 Sep 2026). Students were served the same thin
// weakest topic's handful of questions every morning; the picker now hands
// the day to the next weakest topic that still has 5 unseen questions.
// Pure — no DB. Run with: npx vitest run tests/unit/daily-five-rotation.test.ts

import { describe, it, expect } from "vitest";
import { chooseDailyFiveTopic, DAILY_FIVE_COUNT, ROTATION_DEPTH, type TopicFreshness } from "@/lib/study-day-five";

const w = (topicId: string) => ({ topicId });
const fresh = (entries: Record<string, number>) =>
  new Map<string, TopicFreshness>(Object.entries(entries).map(([k, unseen]) => [k, { total: unseen + 10, unseen }]));

describe("chooseDailyFiveTopic", () => {
  it("no weak topics → null", () => {
    expect(chooseDailyFiveTopic([], fresh({}))).toBeNull();
  });

  it("freshness unknown (DB error) → the weakest, not rotated", () => {
    expect(chooseDailyFiveTopic([w("a"), w("b")], null)).toEqual({ pick: w("a"), rotated: false });
  });

  it("the weakest topic keeps the day while it has 5 unseen questions", () => {
    expect(chooseDailyFiveTopic([w("a"), w("b")], fresh({ a: DAILY_FIVE_COUNT, b: 40 }))).toEqual({ pick: w("a"), rotated: false });
  });

  it("an exhausted weakest topic hands the day to the next weakest with 5 unseen", () => {
    expect(chooseDailyFiveTopic([w("a"), w("b"), w("c")], fresh({ a: 2, b: 4, c: 9 }))).toEqual({ pick: w("c"), rotated: true });
  });

  it("none has 5 unseen → the most unseen, ties to the weaker", () => {
    expect(chooseDailyFiveTopic([w("a"), w("b"), w("c")], fresh({ a: 1, b: 3, c: 3 }))).toEqual({ pick: w("b"), rotated: true });
  });

  it("every topic exhausted → the weakest again (the API then serves least-recently-seen)", () => {
    expect(chooseDailyFiveTopic([w("a"), w("b")], fresh({ a: 0, b: 0 }))).toEqual({ pick: w("a"), rotated: false });
  });

  it("a topic with no validated questions counts as exhausted", () => {
    expect(chooseDailyFiveTopic([w("a"), w("b")], fresh({ b: 6 }))).toEqual({ pick: w("b"), rotated: true });
  });

  it(`looks only at the ${ROTATION_DEPTH} weakest`, () => {
    const ranked = ["a", "b", "c", "d", "e", "f"].map(w);
    expect(chooseDailyFiveTopic(ranked, fresh({ a: 0, b: 0, c: 0, d: 0, e: 0, f: 50 }))).toEqual({ pick: w("a"), rotated: false });
  });
});

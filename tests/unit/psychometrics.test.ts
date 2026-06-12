// Tests for the student-model math: IRT updates, FSRS scheduling, and CAT
// item selection. These pin the directional behaviour of the engine —
// abilities move toward evidence, memories decay and consolidate, selection
// targets the productive-struggle zone.

import { describe, it, expect } from "vitest";
import {
  pCorrect,
  itemInformation,
  updateOnResponse,
  seedItemFromDifficulty,
  thetaToMastery,
} from "@/lib/psychometrics/irt";
import {
  initialState,
  review,
  retrievability,
  ratingFromAccuracy,
} from "@/lib/psychometrics/fsrs";
import { selectItems, selectAdaptiveSet } from "@/lib/psychometrics/select";

describe("IRT 2PL", () => {
  it("gives 50% at theta == b and monotonically more when theta rises", () => {
    expect(pCorrect(0, { a: 1, b: 0 })).toBeCloseTo(0.5);
    expect(pCorrect(1, { a: 1, b: 0 })).toBeGreaterThan(0.7);
    expect(pCorrect(-1, { a: 1, b: 0 })).toBeLessThan(0.3);
  });

  it("raises theta on a correct answer and lowers it on a wrong one", () => {
    const ability = { theta: 0, se: 1, attempts: 0 };
    const item = { b: 0, a: 1, attempts: 50 };
    const up = updateOnResponse(ability, item, true);
    const down = updateOnResponse(ability, item, false);
    expect(up.ability.theta).toBeGreaterThan(0);
    expect(down.ability.theta).toBeLessThan(0);
  });

  it("moves theta more for a surprising result than an expected one", () => {
    const strong = { theta: 2, se: 0.5, attempts: 20 };
    const easyItem = { b: -1, a: 1, attempts: 100 };
    // strong student failing an easy item = big surprise
    const fail = updateOnResponse(strong, easyItem, false);
    // strong student passing an easy item = expected
    const pass = updateOnResponse(strong, easyItem, true);
    expect(Math.abs(fail.ability.theta - strong.theta)).toBeGreaterThan(
      Math.abs(pass.ability.theta - strong.theta),
    );
  });

  it("calibrates item difficulty downward when students keep beating it", () => {
    const item = { b: 1, a: 1, attempts: 10 };
    const r = updateOnResponse({ theta: 0, se: 1, attempts: 5 }, item, true);
    expect(r.item.b).toBeLessThan(1);
  });

  it("shrinks standard error as evidence accumulates", () => {
    let ability = { theta: 0, se: 1, attempts: 0 };
    const item = { b: 0, a: 1, attempts: 0 };
    for (let i = 0; i < 10; i++) {
      ability = updateOnResponse(ability, item, i % 2 === 0).ability;
    }
    expect(ability.se).toBeLessThan(1);
    expect(ability.attempts).toBe(10);
  });

  it("seeds item difficulty from the factory label", () => {
    expect(seedItemFromDifficulty("EASY").b).toBeLessThan(0);
    expect(seedItemFromDifficulty("MEDIUM").b).toBe(0);
    expect(seedItemFromDifficulty("HARD").b).toBeGreaterThan(0);
  });

  it("projects theta to a bounded 0..1 mastery", () => {
    expect(thetaToMastery(0)).toBeCloseTo(0.5);
    expect(thetaToMastery(10)).toBeLessThanOrEqual(0.98);
    expect(thetaToMastery(-10)).toBeGreaterThanOrEqual(0.02);
  });
});

describe("FSRS scheduling", () => {
  const now = new Date("2026-06-12T10:00:00Z");

  it("decays retrievability over time", () => {
    expect(retrievability(0, 5)).toBe(1);
    expect(retrievability(5, 5)).toBeLessThan(1);
    expect(retrievability(50, 5)).toBeLessThan(retrievability(5, 5));
  });

  it("schedules a later due date after a good review than after a lapse", () => {
    const fresh = initialState(now);
    const good = review(fresh, "GOOD", now);
    const again = review(fresh, "AGAIN", now);
    expect(good.due.getTime()).toBeGreaterThan(again.due.getTime());
    expect(again.lapses).toBe(1);
  });

  it("grows stability across consecutive successful reviews", () => {
    let s = initialState(now);
    s = review(s, "GOOD", now);
    const s1 = s.stability;
    const later = new Date(s.due.getTime() + 86_400_000);
    s = review(s, "GOOD", later);
    expect(s.stability).toBeGreaterThan(s1);
  });

  it("collapses stability on a lapse without zeroing it", () => {
    let s = initialState(now);
    s = review(s, "EASY", now);
    s = review(s, "GOOD", new Date(s.due.getTime()));
    const before = s.stability;
    s = review(s, "AGAIN", new Date(s.due.getTime()));
    expect(s.stability).toBeLessThan(before);
    expect(s.stability).toBeGreaterThan(0);
  });

  it("maps topic accuracy to sensible ratings", () => {
    expect(ratingFromAccuracy(0.2)).toBe("AGAIN");
    expect(ratingFromAccuracy(0.5)).toBe("HARD");
    expect(ratingFromAccuracy(0.8)).toBe("GOOD");
    expect(ratingFromAccuracy(1)).toBe("EASY");
  });
});

describe("CAT selection", () => {
  const candidates = [
    { questionId: "easy", a: 1, b: -2 },
    { questionId: "matched", a: 1, b: 0 },
    { questionId: "hard", a: 1, b: 2 },
  ];

  it("max-information picks the ability-matched item", () => {
    const picked = selectItems(0, candidates, { count: 1, topK: 1 });
    expect(picked[0].questionId).toBe("matched");
  });

  it("information peaks where p is near 0.5", () => {
    expect(itemInformation(0, { a: 1, b: 0 })).toBeGreaterThan(itemInformation(0, { a: 1, b: 2 }));
  });

  it("never repeats and respects exclusions", () => {
    const picked = selectItems(0, candidates, {
      count: 3,
      topK: 1,
      excludeIds: new Set(["matched"]),
    });
    const ids = picked.map((p) => p.questionId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain("matched");
  });

  it("adaptive set blends core, confidence, and stretch items", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      questionId: `q${i}`,
      a: 1,
      b: -3 + (i / 29) * 6,
    }));
    const set = selectAdaptiveSet(0, many, 10, { topK: 1 });
    expect(set.length).toBe(10);
    const bs = set.map((s) => s.b);
    expect(Math.min(...bs)).toBeLessThan(-0.5); // has confidence builders
    expect(Math.max(...bs)).toBeGreaterThan(0.5); // has stretch items
  });
});

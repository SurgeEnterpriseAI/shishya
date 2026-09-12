// Pure unit tests for src/lib/question-pick.ts — the seen-exclusion
// helper every per-student picker uses. No DB. No network.
// Run with: npx vitest run tests/unit/seen-exclusion.test.ts

import { describe, it, expect } from "vitest";
import {
  SEEN_WINDOW_DAYS,
  bankLine,
  countRepeats,
  dedupeById,
  dedupeIds,
  partitionBySeen,
  pickTiered,
  pickWithSeenExclusion,
  seenSummary,
  shapeCandidates,
  shuffleWith,
  type SeenMap,
} from "@/lib/question-pick";

function q(n: number) {
  return { id: `q${n}` };
}
function pool(n: number) {
  return Array.from({ length: n }, (_, i) => q(i + 1));
}
function seenOf(entries: Record<string, number>): SeenMap {
  return new Map(Object.entries(entries));
}
/** Deterministic LCG so shuffles are reproducible across runs. */
function seeded(seed = 1) {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

describe("SEEN_WINDOW_DAYS", () => {
  it("is one positive constant", () => {
    expect(SEEN_WINDOW_DAYS).toBeGreaterThan(0);
    expect(Number.isInteger(SEEN_WINDOW_DAYS)).toBe(true);
  });
});

describe("pickWithSeenExclusion — unseen first", () => {
  it("never picks a seen question while enough unseen exist", () => {
    const seen = seenOf({ q1: 100, q2: 200, q3: 300, q4: 400 });
    const { picked, repeats, unseenAvailable } = pickWithSeenExclusion(pool(10), 5, seen, seeded());
    expect(picked).toHaveLength(5);
    expect(repeats).toBe(0);
    expect(unseenAvailable).toBe(6);
    for (const p of picked) expect(seen.has(p.id)).toBe(false);
  });

  it("with no seen map entries everything is unseen", () => {
    const { picked, repeats, unseenAvailable } = pickWithSeenExclusion(pool(6), 3, new Map(), seeded());
    expect(picked).toHaveLength(3);
    expect(repeats).toBe(0);
    expect(unseenAvailable).toBe(6);
  });
});

describe("pickWithSeenExclusion — least-recently-seen fallback", () => {
  it("tops up with the oldest-seen questions in ascending lastSeenAt order", () => {
    // q1 unseen; q2..q6 seen at 50,10,40,20,30 → LRS order q3(10), q5(20), q6(30), q4(40), q2(50)
    const seen = seenOf({ q2: 50, q3: 10, q4: 40, q5: 20, q6: 30 });
    const { picked, repeats, unseenAvailable } = pickWithSeenExclusion(pool(6), 4, seen, seeded());
    expect(picked.map((p) => p.id)).toEqual(["q1", "q3", "q5", "q6"]);
    expect(repeats).toBe(3);
    expect(unseenAvailable).toBe(1);
  });

  it("never falls back to a random whole-pool recycle: yesterday's question is picked last", () => {
    const seen = seenOf({ q1: 1, q2: 2, q3: 3, q4: 4, q5: 5 });
    const { picked } = pickWithSeenExclusion(pool(5), 4, seen, seeded());
    expect(picked.map((p) => p.id)).toEqual(["q1", "q2", "q3", "q4"]);
    expect(picked.some((p) => p.id === "q5")).toBe(false);
  });
});

describe("pickWithSeenExclusion — no duplicates, bounded by the unique pool", () => {
  it("ignores duplicate ids in the input pool", () => {
    const dup = [q(1), q(2), q(1), q(3), q(2)];
    const { picked } = pickWithSeenExclusion(dup, 10, new Map(), seeded());
    const ids = picked.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(["q1", "q2", "q3"]);
  });

  it("count larger than the pool returns every unique item and counts repeats honestly", () => {
    const seen = seenOf({ q2: 10, q4: 20, zz: 5 });
    const { picked, repeats } = pickWithSeenExclusion([...pool(4), q(2)], 50, seen, seeded());
    expect(picked).toHaveLength(4);
    expect(repeats).toBe(2);
  });

  it("count <= 0 picks nothing", () => {
    expect(pickWithSeenExclusion(pool(3), 0, new Map()).picked).toEqual([]);
    expect(pickWithSeenExclusion(pool(3), -2, new Map()).picked).toEqual([]);
  });
});

describe("pickWithSeenExclusion — determinism", () => {
  it("same seed → same order twice", () => {
    const a = pickWithSeenExclusion(pool(20), 8, new Map(), seeded(7)).picked.map((p) => p.id);
    const b = pickWithSeenExclusion(pool(20), 8, new Map(), seeded(7)).picked.map((p) => p.id);
    expect(a).toEqual(b);
  });

  it("shuffleWith is a copy and keeps every element", () => {
    const src = pool(9);
    const out = shuffleWith(src, seeded(3));
    expect(out).not.toBe(src);
    expect(out.map((p) => p.id).sort()).toEqual(src.map((p) => p.id).sort());
    expect(src.map((p) => p.id)).toEqual(pool(9).map((p) => p.id)); // untouched
  });
});

describe("pickTiered — priority tiers", () => {
  it("takes unseen from every tier before any seen question from tier 0", () => {
    const strict = [q(1), q(2)]; // q1 seen, q2 unseen
    const fallback = [q(3), q(4)]; // both unseen
    const seen = seenOf({ q1: 5 });
    const { picked, repeats } = pickTiered([strict, fallback], 3, seen, seeded());
    const ids = picked.map((p) => p.id);
    expect(ids[0]).toBe("q2");
    expect(ids.slice(1).sort()).toEqual(["q3", "q4"]);
    expect(repeats).toBe(0);
  });

  it("then takes least-recently-seen from tier 0 before tier 1", () => {
    const strict = [q(1), q(2)]; // seen at 50, 10
    const fallback = [q(3)]; // seen at 1 (older, but lower tier)
    const seen = seenOf({ q1: 50, q2: 10, q3: 1 });
    const { picked, repeats } = pickTiered([strict, fallback], 2, seen, seeded());
    expect(picked.map((p) => p.id)).toEqual(["q2", "q1"]);
    expect(repeats).toBe(2);
  });

  it("an id present in two tiers is picked once", () => {
    const { picked } = pickTiered([[q(1), q(2)], [q(2), q(3)]], 5, new Map(), seeded());
    const ids = picked.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(["q1", "q2", "q3"]);
  });
});

describe("shapeCandidates — pool handed to a self-picking generator", () => {
  it("returns only unseen when there are at least `floor` of them", () => {
    const seen = seenOf({ q1: 1, q2: 2 });
    const out = shapeCandidates(pool(8), seen, 5);
    expect(out.map((p) => p.id)).toEqual(["q3", "q4", "q5", "q6", "q7", "q8"]);
  });

  it("tops up with exactly enough least-recently-seen to reach `floor`", () => {
    const seen = seenOf({ q1: 30, q2: 10, q3: 20 });
    const out = shapeCandidates([q(1), q(2), q(3), q(4)], seen, 3);
    expect(out.map((p) => p.id)).toEqual(["q4", "q2", "q3"]);
  });

  it("never exceeds the unique pool", () => {
    const seen = seenOf({ q1: 1, q2: 2 });
    expect(shapeCandidates([q(1), q(2), q(1)], seen, 10)).toHaveLength(2);
  });
});

describe("partitionBySeen / dedupe", () => {
  it("equal lastSeenAt → tie-break by id ascending", () => {
    const seen = seenOf({ q9: 7, q2: 7, q5: 7 });
    const { unseen, seenLrs } = partitionBySeen([q(9), q(2), q(5), q(1)], seen);
    expect(unseen.map((p) => p.id)).toEqual(["q1"]);
    expect(seenLrs.map((p) => p.id)).toEqual(["q2", "q5", "q9"]);
  });

  it("dedupeById keeps the first occurrence in input order", () => {
    const a = { id: "x", v: 1 };
    const b = { id: "x", v: 2 };
    expect(dedupeById([a, q(1), b])).toEqual([a, q(1)]);
    expect(dedupeIds(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
  });
});

describe("seenSummary / countRepeats / bankLine — honest numbers", () => {
  it("seenSummary counts only ids that are in the bank", () => {
    const seen = seenOf({ q1: 1, q3: 3, other: 9 });
    expect(seenSummary([...pool(4), q(1)], seen)).toEqual({ bankSize: 4, seenInBank: 2 });
  });

  it("countRepeats ignores unknown ids and dedupes", () => {
    const seen = seenOf({ q1: 1, q2: 2 });
    expect(countRepeats(["q1", "q1", "q2", "q7"], seen)).toBe(2);
    expect(countRepeats([], seen)).toBe(0);
  });

  it("bankLine states the real numbers and promises no refresh cadence", () => {
    const line = bankLine({ size: 338, seen: 291, repeats: 4 });
    expect(line).toBe("You have seen 291 of the 338 validated questions in this bank; this set repeats 4.");
    expect(line.toLowerCase()).not.toMatch(/fresh|weekly|daily|new set/);
  });
});

// Public-statistics helpers (27 Sep 2026): the k-gate every public cell on
// /shishya-in-numbers, /press and /pulse goes through, the small-group
// merge and the sparkline geometry. No DB, no network.

import { describe, expect, it } from "vitest";
import {
  K_MIN,
  SUPPRESSED,
  cell,
  formatInt,
  formatPct,
  joinLabels,
  mergeSmallBuckets,
  publishable,
  ratioCell,
  share,
  shareCell,
  sparklinePath,
  subsetPublishable,
} from "@/lib/public-stats";

describe("k-gate", () => {
  it("is twenty (founder privacy rule, 27 Sep 2026)", () => {
    expect(K_MIN).toBe(20);
  });

  it("prints a count only at or above K_MIN", () => {
    expect(cell(19)).toBe(SUPPRESSED);
    expect(cell(20)).toBe("20");
    expect(cell(1909)).toBe("1,909");
    expect(cell(null)).toBe(SUPPRESSED);
    expect(cell(undefined)).toBe(SUPPRESSED);
    expect(cell(Number.NaN)).toBe(SUPPRESSED);
    expect(publishable(0)).toBe(false);
  });

  it("uses Indian digit grouping", () => {
    expect(formatInt(100000)).toBe("1,00,000");
    expect(formatInt(36690)).toBe("36,690");
  });

  it("prints a share only when numerator AND denominator are at least K_MIN", () => {
    expect(shareCell(213, 742)).toBe("28.7%");
    expect(shareCell(19, 742)).toBe(SUPPRESSED);
    expect(shareCell(22, 19)).toBe(SUPPRESSED);
    expect(shareCell(20, 20)).toBe("100.0%");
    expect(shareCell(0, 0)).toBe(SUPPRESSED);
  });

  // 27 Sep 2026 (fixer review): "128 of 143" also prints 143 − 128 = 15.
  it("prints a subset beside its group only when the rest is 0 or at least K_MIN", () => {
    expect(subsetPublishable(128, 143)).toBe(false);
    expect(shareCell(128, 143)).toBe(SUPPRESSED);
    expect(subsetPublishable(123, 143)).toBe(true);
    expect(subsetPublishable(143, 143)).toBe(true);
    expect(subsetPublishable(142, 143)).toBe(false);
    expect(subsetPublishable(144, 143)).toBe(false);
    expect(subsetPublishable(19, 143)).toBe(false);
    expect(subsetPublishable(null, 143)).toBe(false);
    expect(shareCell(106, 143)).toBe("74.1%");
  });

  it("computes shares and ratios safely", () => {
    expect(share(1, 0)).toBeNull();
    expect(share(null, 4)).toBeNull();
    expect(formatPct(null)).toBe(SUPPRESSED);
    expect(formatPct(8.7123, 1)).toBe("8.7%");
    expect(ratioCell(485, 217)).toBe("2.24");
    expect(ratioCell(485, 19)).toBe(SUPPRESSED);
  });
});

describe("mergeSmallBuckets", () => {
  it("merges the smallest group into the next-smallest until every group is at least k", () => {
    // 14-20 Sep 2026 sign-ups: search 21, direct 15, other 1 → one group of 37.
    const out = mergeSmallBuckets([
      { key: "ai", label: "AI assistants", n: 106 },
      { key: "search", label: "Search engines", n: 21 },
      { key: "direct", label: "Direct or unknown", n: 15 },
      { key: "other", label: "Other websites", n: 1 },
      { key: "email", label: "Email", n: 0 },
    ]);
    expect(out.map((g) => g.n)).toEqual([106, 37]);
    expect(out[1].merged).toBe(true);
    expect(out[1].keys.sort()).toEqual(["direct", "other", "search"]);
    expect(out[1].label).toBe("Search engines + Direct or unknown + Other websites");
    for (const g of out) expect(g.n).toBeGreaterThanOrEqual(K_MIN);
  });

  it("leaves groups alone when all are big enough and sorts largest first", () => {
    const out = mergeSmallBuckets([
      { key: "a", label: "A", n: 25 },
      { key: "b", label: "B", n: 90 },
    ]);
    expect(out.map((g) => g.key)).toEqual(["b", "a"]);
    expect(out.every((g) => !g.merged)).toBe(true);
  });

  it("collapses to one group when the total is under k (never prints a small cell as its own)", () => {
    const out = mergeSmallBuckets([
      { key: "a", label: "A", n: 3 },
      { key: "b", label: "B", n: 4 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].n).toBe(7);
  });

  it("joins merged labels with + so a label that contains 'and' stays readable", () => {
    const out = mergeSmallBuckets([
      { key: "social", label: "Social and messaging", n: 21 },
      { key: "other", label: "Other websites", n: 2 },
    ]);
    expect(out[0].label).toBe("Social and messaging + Other websites");
  });

  it("joins labels in plain English", () => {
    expect(joinLabels([])).toBe("");
    expect(joinLabels(["A"])).toBe("A");
    expect(joinLabels(["A", "B"])).toBe("A and B");
    expect(joinLabels(["A", "B", "C"])).toBe("A, B and C");
  });
});

describe("sparklinePath", () => {
  it("draws one point per value inside the viewBox, dot on the last", () => {
    const g = sparklinePath([1, 2, 3, 4], 120, 28, 2);
    expect(g.d.startsWith("M2 ")).toBe(true);
    expect((g.d.match(/L/g) ?? []).length).toBe(3);
    expect(g.last).toEqual({ x: 118, y: 2 });
  });

  it("breaks the line at a null and starts again", () => {
    const g = sparklinePath([null, null, 5, 6]);
    expect(g.d.startsWith("M")).toBe(true);
    expect((g.d.match(/M/g) ?? []).length).toBe(1);
    const h = sparklinePath([5, null, 6]);
    expect((h.d.match(/M/g) ?? []).length).toBe(2);
  });

  it("returns an empty path for no values", () => {
    const g = sparklinePath([null, null]);
    expect(g.d).toBe("");
    expect(g.last).toBeNull();
  });
});

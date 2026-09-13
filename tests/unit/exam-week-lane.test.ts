// Pure unit tests for orderRefreshQueue (src/lib/exam-refresh-lane.ts).
// No DB. Run with: npm test
//
// The rule under test (13 Sep 2026): exams in an exam-week phase are
// refreshed first, whatever their size, so a key or question paper the
// conducting body posts on exam evening reaches the tracker the same day.
// The tail keeps the pre-existing order.

import { describe, it, expect } from "vitest";
import { orderRefreshQueue, LANE_MAX_PER_RUN, type QueueExam, type LaneState } from "@/lib/exam-refresh-lane";

const HOUR = 3600_000;
const NOW = Date.parse("2026-09-13T14:45:00Z");

function exam(id: string, candidates: number, hoursAgo: number): QueueExam {
  return { id, code: id, candidatesPerYear: candidates, lastRefreshedMs: NOW - hoursAgo * HOUR };
}

describe("orderRefreshQueue — exam-week lane", () => {
  it("puts a small exam in exam week ahead of every large stale exam", () => {
    const exams = [exam("SSC_CGL", 3_000_000, 48), exam("NDA", 350_000, 2)];
    const lanes = new Map<string, LaneState>([["NDA", { phase: "today-pm", tier: "official" }]]);
    const { lane, tail } = orderRefreshQueue(exams, lanes, { nowMs: NOW });
    expect(lane.map((e) => e.id)).toEqual(["NDA"]);
    expect(tail.map((e) => e.id)).toEqual(["SSC_CGL"]);
  });

  it("orders the lane today-pm → today-am → window → post → eve, announced before expected", () => {
    const exams = ["A", "B", "C", "D", "E", "F"].map((id) => exam(id, 100, 1));
    const lanes = new Map<string, LaneState>([
      ["A", { phase: "eve", tier: "official" }],
      ["B", { phase: "post", tier: "official" }],
      ["C", { phase: "today-pm", tier: "expected" }],
      ["D", { phase: "today-pm", tier: "official" }],
      ["E", { phase: "window", tier: "reported" }],
      ["F", { phase: "today-am", tier: "official" }],
    ]);
    const { lane } = orderRefreshQueue(exams, lanes, { nowMs: NOW });
    expect(lane.map((e) => e.id)).toEqual(["D", "C", "F", "E", "B", "A"]);
  });

  it("never admits the 'week' phase and caps the lane per run", () => {
    const ids = Array.from({ length: LANE_MAX_PER_RUN + 3 }, (_, i) => `X${i}`);
    const exams = [...ids.map((id) => exam(id, 100, 1)), exam("W", 9_000_000, 1)];
    const lanes = new Map<string, LaneState>([
      ...ids.map((id) => [id, { phase: "post", tier: "official" }] as [string, LaneState]),
      ["W", { phase: "week", tier: "official" }],
    ]);
    const { lane, tail } = orderRefreshQueue(exams, lanes, { nowMs: NOW });
    expect(lane).toHaveLength(LANE_MAX_PER_RUN);
    expect(lane.some((e) => e.id === "W")).toBe(false);
    // Lane overflow and the week-phase exam fall back to the tail.
    expect(tail.map((e) => e.id)).toContain("W");
    expect(tail).toHaveLength(ids.length - LANE_MAX_PER_RUN + 1);
  });

  it("laneOnly returns only the named phases and an empty tail", () => {
    const exams = [exam("A", 100, 1), exam("B", 100, 1), exam("C", 100, 1)];
    const lanes = new Map<string, LaneState>([
      ["A", { phase: "today-pm", tier: "official" }],
      ["B", { phase: "eve", tier: "official" }],
    ]);
    const { lane, tail } = orderRefreshQueue(exams, lanes, { nowMs: NOW, laneOnly: ["today-pm"] });
    expect(lane.map((e) => e.id)).toEqual(["A"]);
    expect(tail).toEqual([]);
  });

  it("keeps the tail order: stale top-N first, then most-stale-first", () => {
    const exams = [
      exam("SMALL_OLD", 10, 200),
      exam("BIG_STALE", 5_000_000, 30),
      exam("BIG_FRESH", 4_000_000, 2),
      exam("SMALL_NEWER", 20, 100),
    ];
    const { lane, tail } = orderRefreshQueue(exams, new Map(), { nowMs: NOW, topN: 2 });
    expect(lane).toEqual([]);
    expect(tail.map((e) => e.id)).toEqual(["BIG_STALE", "SMALL_OLD", "SMALL_NEWER", "BIG_FRESH"]);
  });
});

// Pure unit tests for orderRefreshQueue (src/lib/exam-refresh-lane.ts).
// No DB. Run with: npm test
//
// The rule under test (13 Sep 2026): exams in an exam-week phase are
// refreshed first, whatever their size, so a key or question paper the
// conducting body posts on exam evening reaches the tracker the same day.
// 7 Oct 2026: a lane exam rests between refreshes (decision D2, option C),
// and the tail is picked by hub visitors, not by size (plan build 5d).

import { describe, it, expect } from "vitest";
import {
  orderRefreshQueue,
  laneRestMs,
  tailIntervalDays,
  LANE_MAX_PER_RUN,
  type QueueExam,
  type LaneState,
} from "@/lib/exam-refresh-lane";

const HOUR = 3600_000;
const DAY = 24 * HOUR;
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
    const exams = ["A", "B", "C", "D", "E", "F"].map((id) => exam(id, 100, 24));
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
    const exams = [...ids.map((id) => exam(id, 100, 24)), exam("W", 9_000_000, 24)];
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
});

describe("option C (7 Oct 2026): a lane exam rests between refreshes", () => {
  // Runs at 06:45 and 18:45 IST (12 hours apart) and the 20:15 exam-evening run.
  const state = (phase: LaneState["phase"], daysTo: number | null = null): LaneState => ({ phase, tier: "official", daysTo });
  const pick = (s: LaneState, hoursAgo: number, laneOnly?: LaneState["phase"][]) => {
    const r = orderRefreshQueue([exam("E", 100, hoursAgo)], new Map([["E", s]]), { nowMs: NOW, laneOnly });
    return { lane: r.lane.map((e) => e.id), resting: r.resting.map((e) => e.id), tail: r.tail.map((e) => e.id) };
  };

  it("twice a day on the day before, the exam day and the 2 days after: picked again 12 hours later", () => {
    for (const s of [state("eve", 1), state("today-am", 0), state("post", -1), state("post", -2)]) {
      expect(pick(s, 12).lane, s.phase).toEqual(["E"]);
      expect(pick(s, 6).resting, s.phase).toEqual(["E"]);
    }
    expect(laneRestMs(state("eve", 1))).toBe(10 * HOUR);
  });

  it("exam evening: refreshed at 18:45 and again at 20:15", () => {
    expect(laneRestMs(state("today-pm", 0))).toBe(0);
    expect(pick(state("today-pm", 0), 1.5, ["today-pm"]).lane).toEqual(["E"]);
  });

  it("once a day on the other days of a window and 3 to 7 days after: skipped at 12 hours, picked at 24", () => {
    for (const s of [state("window", -1), state("post", -3), state("post", -7), state("post")]) {
      expect(pick(s, 12).resting, `${s.phase} ${s.daysTo}`).toEqual(["E"]);
      expect(pick(s, 24).lane, `${s.phase} ${s.daysTo}`).toEqual(["E"]);
    }
  });

  it("after a missed run (an outage) the next run picks it: the rule is a gap, not a slot", () => {
    expect(pick(state("post", -4), 30).lane).toEqual(["E"]);
  });

  it("the once-a-day refresh is taken at the evening run; the morning run keeps to exams near their exam day", () => {
    const MORNING = Date.parse("2026-09-14T01:15:00Z"); // 06:45 IST
    const at = (s: LaneState, hoursAgo: number) =>
      orderRefreshQueue([{ id: "E", code: "E", candidatesPerYear: 100, lastRefreshedMs: MORNING - hoursAgo * HOUR }], new Map([["E", s]]), { nowMs: MORNING });
    // refreshed at yesterday's 06:45 (24 h) or 18:45 (12 h): waits for this evening
    expect(at(state("window", -2), 24).lane).toEqual([]);
    expect(at(state("post", -5), 12).lane).toEqual([]);
    // yesterday's evening run was missed (last refresh 36 h ago): this morning takes it
    expect(at(state("window", -2), 36).lane.map((e) => e.id)).toEqual(["E"]);
    // near the exam day: both runs
    expect(at(state("eve", 1), 12).lane.map((e) => e.id)).toEqual(["E"]);
    expect(at(state("post", -1), 12).lane.map((e) => e.id)).toEqual(["E"]);
  });

  it("a resting exam is in neither the lane nor the tail", () => {
    const r = pick(state("window", -2), 6);
    expect(r.lane).toEqual([]);
    expect(r.tail).toEqual([]);
  });
});

describe("5d (7 Oct 2026): the tail is picked by hub visitors", () => {
  it("target interval: 30+ visitors 7 days, 10-29 14 days, fewer 42 days", () => {
    expect([tailIntervalDays(83), tailIntervalDays(30), tailIntervalDays(29), tailIntervalDays(10), tailIntervalDays(9), tailIntervalDays(0)]).toEqual([7, 7, 14, 14, 42, 42]);
  });

  it("the size of an exam no longer buys a slot: a well-read small exam goes before a big exam nobody opened", () => {
    const exams = [exam("SBI_CLERK", 5_000_000, 10 * 24), exam("AP_APPSC_GROUP2", 50_000, 10 * 24)];
    const visitors = new Map([["AP_APPSC_GROUP2", 83]]);
    const { tail } = orderRefreshQueue(exams, new Map(), { nowMs: NOW, visitors });
    expect(tail.map((e) => e.id)).toEqual(["AP_APPSC_GROUP2", "SBI_CLERK"]);
  });

  it("most overdue against its own interval first; nothing refreshed in the last 7 days", () => {
    const exams = [
      exam("HOT_8D", 100, 8 * 24), // 30+ visitors, 8/7 = 1.14
      exam("MID_20D", 100, 20 * 24), // 10-29, 20/14 = 1.43
      exam("COLD_40D", 100, 40 * 24), // 0, 40/42 = 0.95
      exam("HOT_3D", 100, 3 * 24), // refreshed 3 days ago: not eligible
      exam("NEVER", 100, NOW / HOUR), // never refreshed
    ];
    const visitors = new Map([
      ["HOT_8D", 40],
      ["MID_20D", 12],
      ["HOT_3D", 90],
    ]);
    const { tail } = orderRefreshQueue(exams, new Map(), { nowMs: NOW, visitors });
    expect(tail.map((e) => e.id)).toEqual(["NEVER", "MID_20D", "HOT_8D", "COLD_40D"]);
  });

  it("240 simulated days at 6 calls a day: none picked two days running; a 30+ hub every 8 days at most, 10-29 every 15, any exam every 45", () => {
    // The 2 Oct hub-visitor read less the 6 lane exams (plan.md 5d, sim-exam-pick.cjs):
    // 8 hubs with 30+ visitors, 12 with 10-29, 98 with 1-9, 68 with none.
    const pop: { id: string; v: number; last: number; maxGap: number; prev: number }[] = [];
    const add = (n: number, v: number, p: string) => {
      for (let i = 0; i < n; i++) pop.push({ id: `${p}${i}`, v, last: NOW - ((i * 7) % 60) * DAY, maxGap: 0, prev: -99 });
    };
    add(8, 40, "H");
    add(12, 15, "M");
    add(98, 3, "L");
    add(68, 0, "Z");
    const visitors = new Map(pop.map((p) => [p.id, p.v]));
    let consecutive = 0;
    for (let d = 0; d < 240; d++) {
      const now = NOW + d * DAY;
      const exams = pop.map((p) => ({ id: p.id, code: p.id, candidatesPerYear: 0, lastRefreshedMs: p.last }));
      const { tail } = orderRefreshQueue(exams, new Map(), { nowMs: now, visitors });
      for (const t of tail.slice(0, 6)) {
        const p = pop.find((x) => x.id === t.id)!;
        if (p.prev === d - 1) consecutive++;
        if (d >= 90) p.maxGap = Math.max(p.maxGap, (now - p.last) / DAY); // steady state
        p.prev = d;
        p.last = now;
      }
    }
    expect(consecutive).toBe(0);
    for (const p of pop) {
      const waiting = (NOW + 239 * DAY - p.last) / DAY;
      const worst = Math.max(p.maxGap, waiting);
      expect(worst, p.id).toBeLessThanOrEqual(p.v >= 30 ? 8 : p.v >= 10 ? 15 : 45);
    }
  });

  it("lane overflow (exam-week exams past the lane cap) heads the tail", () => {
    const ids = Array.from({ length: LANE_MAX_PER_RUN + 1 }, (_, i) => `X${i}`);
    const exams = [...ids.map((id) => exam(id, 100, 24)), exam("OTHER", 100, 30 * 24)];
    const lanes = new Map<string, LaneState>(ids.map((id) => [id, { phase: "post", tier: "official", daysTo: -1 }] as [string, LaneState]));
    const { tail } = orderRefreshQueue(exams, lanes, { nowMs: NOW, visitors: new Map() });
    expect(tail.map((e) => e.id)).toEqual(["X6", "OTHER"]);
  });

  it("when the visitor read failed, most-stale-first over everything (no 7-day floor, no size tier)", () => {
    const exams = [exam("BIG_FRESH", 5_000_000, 2), exam("SMALL_OLD", 10, 200), exam("BIG_STALE", 4_000_000, 30)];
    const { tail } = orderRefreshQueue(exams, new Map(), { nowMs: NOW, visitors: null });
    expect(tail.map((e) => e.id)).toEqual(["SMALL_OLD", "BIG_STALE", "BIG_FRESH"]);
  });
});

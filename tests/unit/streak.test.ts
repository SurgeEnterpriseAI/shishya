// Tests for study-streak math — date-walking logic is the classic place
// for an off-by-one to silently show students the wrong streak.

import { describe, it, expect } from "vitest";
import { computeStreak, istDay } from "@/lib/db/streak";

const T = 20_000; // arbitrary "today" day-index

describe("computeStreak", () => {
  it("returns zeros with no activity", () => {
    expect(computeStreak(new Set(), T)).toMatchObject({ current: 0, best: 0, activeToday: false });
  });

  it("counts a single active day today as a 1-day streak", () => {
    const s = computeStreak(new Set([T]), T);
    expect(s).toMatchObject({ current: 1, best: 1, activeToday: true });
  });

  it("keeps yesterday's streak alive when today is not yet active", () => {
    const s = computeStreak(new Set([T - 3, T - 2, T - 1]), T);
    expect(s.current).toBe(3);
    expect(s.activeToday).toBe(false);
  });

  it("breaks the streak after a full missed day", () => {
    const s = computeStreak(new Set([T - 3, T - 2]), T); // missed yesterday
    expect(s.current).toBe(0);
    expect(s.best).toBe(2);
  });

  it("extends through today when active today and yesterday", () => {
    const s = computeStreak(new Set([T - 1, T]), T);
    expect(s).toMatchObject({ current: 2, best: 2, activeToday: true });
  });

  it("best streak survives in history even when current is shorter", () => {
    const s = computeStreak(new Set([T - 10, T - 9, T - 8, T - 7, T - 1, T]), T);
    expect(s.current).toBe(2);
    expect(s.best).toBe(4);
  });

  it("duplicate activity on the same day counts once", () => {
    const s = computeStreak(new Set([T, T]), T);
    expect(s.current).toBe(1);
  });

  it("builds last7 oldest-first with today at index 6", () => {
    const s = computeStreak(new Set([T, T - 6]), T);
    expect(s.last7).toEqual([true, false, false, false, false, false, true]);
  });

  it("computes the next milestone and distance to it", () => {
    const s = computeStreak(new Set([T - 1, T]), T); // current 2
    expect(s.nextMilestone).toBe(3);
    expect(s.toNextMilestone).toBe(1);
  });

  it("flags hitMilestoneToday exactly on a milestone reached today", () => {
    const three = computeStreak(new Set([T - 2, T - 1, T]), T); // current 3, active today
    expect(three.hitMilestoneToday).toBe(true);
    const four = computeStreak(new Set([T - 3, T - 2, T - 1, T]), T); // current 4
    expect(four.hitMilestoneToday).toBe(false);
  });

  it("has no next milestone past the top of the ladder", () => {
    const days = new Set<number>();
    for (let i = 0; i < 100; i++) days.add(T - i);
    const s = computeStreak(days, T);
    expect(s.current).toBe(100);
    expect(s.nextMilestone).toBeNull();
  });
});

describe("istDay", () => {
  it("flips the day at IST midnight, not UTC midnight", () => {
    // 18:31 UTC = 00:01 IST next day
    const before = new Date("2026-06-12T18:29:00Z");
    const after = new Date("2026-06-12T18:31:00Z");
    expect(istDay(after)).toBe(istDay(before) + 1);
  });
});

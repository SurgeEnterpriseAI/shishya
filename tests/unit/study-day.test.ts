// Tests for the ONE study-day definition (src/lib/study-day.ts): IST
// bucketing, source kinds, and the four-word streak state that the results
// block, StreakCard and both crons share.

import { describe, it, expect } from "vitest";
import {
  bucketStudyDays,
  istDay,
  istDayStartUtc,
  streakState,
  STUDY_DAY_SOURCES,
  type StudyDaySource,
} from "@/lib/study-day";
import { computeStreak } from "@/lib/db/streak";

const DAY_MS = 86_400_000;

describe("istDay", () => {
  it("flips the day at IST midnight (18:30 UTC), not UTC midnight", () => {
    const before = new Date("2026-06-12T18:29:00Z"); // 23:59 IST 12 Jun
    const after = new Date("2026-06-12T18:31:00Z"); // 00:01 IST 13 Jun
    expect(istDay(after)).toBe(istDay(before) + 1);
  });

  it("keeps 23:00 UTC and 10:00 UTC the next UTC day on ONE IST day", () => {
    // 23:00 UTC 12 Jun = 04:30 IST 13 Jun; 10:00 UTC 13 Jun = 15:30 IST 13 Jun
    expect(istDay(new Date("2026-06-12T23:00:00Z"))).toBe(istDay(new Date("2026-06-13T10:00:00Z")));
  });
});

describe("istDayStartUtc", () => {
  it("is the inverse of istDay: start <= t < start + 1 day", () => {
    for (const iso of ["2026-06-12T18:29:00Z", "2026-06-12T18:31:00Z", "2026-09-11T03:20:00Z", "2026-01-01T00:00:00Z"]) {
      const t = new Date(iso);
      const start = istDayStartUtc(istDay(t));
      expect(start.getTime()).toBeLessThanOrEqual(t.getTime());
      expect(t.getTime()).toBeLessThan(start.getTime() + DAY_MS);
      expect(istDay(start)).toBe(istDay(t));
    }
  });

  it("lands on 18:30 UTC of the previous UTC day", () => {
    const start = istDayStartUtc(istDay(new Date("2026-09-11T03:20:00Z")));
    expect(start.toISOString()).toBe("2026-09-10T18:30:00.000Z");
  });
});

describe("bucketStudyDays", () => {
  it("skips rows with a null timestamp", () => {
    const out = bucketStudyDays([{ userId: "u1", at: null, source: "attempt" }]);
    expect(out.size).toBe(0);
  });

  it("collapses several rows on one IST day into one entry", () => {
    const out = bucketStudyDays([
      { userId: "u1", at: new Date("2026-06-12T23:00:00Z"), source: "attempt" }, // 04:30 IST 13 Jun
      { userId: "u1", at: new Date("2026-06-13T10:00:00Z"), source: "chat" }, // 15:30 IST 13 Jun
      { userId: "u1", at: new Date("2026-06-13T18:00:00Z"), source: "topic-complete" }, // 23:30 IST 13 Jun
    ]);
    expect(out.get("u1")?.size).toBe(1);
  });

  it("splits 23:59 IST and 00:01 IST into two days", () => {
    const out = bucketStudyDays([
      { userId: "u1", at: new Date("2026-06-12T18:29:00Z") },
      { userId: "u1", at: new Date("2026-06-12T18:31:00Z") },
    ]);
    expect(out.get("u1")?.size).toBe(2);
  });

  it("groups users separately", () => {
    const out = bucketStudyDays([
      { userId: "u1", at: new Date("2026-06-12T10:00:00Z") },
      { userId: "u2", at: new Date("2026-06-12T10:00:00Z") },
      { userId: "u2", at: new Date("2026-06-13T10:00:00Z") },
    ]);
    expect(out.get("u1")?.size).toBe(1);
    expect(out.get("u2")?.size).toBe(2);
    expect(out.has("u3")).toBe(false);
  });

  it("counts every declared source kind equally (a coach topic completion is a study day)", () => {
    const base = Date.UTC(2026, 5, 1, 10); // 15:30 IST 1 Jun
    const rows = STUDY_DAY_SOURCES.map((source, i) => ({
      userId: "u1",
      at: new Date(base + i * DAY_MS),
      source,
    }));
    const out = bucketStudyDays(rows);
    expect(out.get("u1")?.size).toBe(STUDY_DAY_SOURCES.length);
  });

  it("declares exactly the four sources — and no bare page-open source", () => {
    const expected: StudyDaySource[] = ["attempt", "chat", "descriptive", "topic-complete"];
    expect([...STUDY_DAY_SOURCES].sort()).toEqual([...expected].sort());
    expect((STUDY_DAY_SOURCES as readonly string[]).includes("topic-read")).toBe(false);
  });

  it("feeds computeStreak: three consecutive IST days = a 3-day streak", () => {
    const rows = [
      { userId: "u1", at: new Date("2026-06-11T10:00:00Z"), source: "attempt" as const },
      { userId: "u1", at: new Date("2026-06-12T10:00:00Z"), source: "topic-complete" as const },
      { userId: "u1", at: new Date("2026-06-13T10:00:00Z"), source: "descriptive" as const },
    ];
    const days = bucketStudyDays(rows).get("u1")!;
    const s = computeStreak(days, istDay(new Date("2026-06-13T12:00:00Z")));
    expect(s.current).toBe(3);
    expect(s.activeToday).toBe(true);
  });
});

describe("streakState", () => {
  it.each([
    [{ current: 2, activeToday: true }, "kept"],
    [{ current: 7, activeToday: true }, "kept"],
    [{ current: 1, activeToday: true }, "started"],
    [{ current: 3, activeToday: false }, "at-risk"],
    [{ current: 1, activeToday: false }, "at-risk"],
    [{ current: 0, activeToday: false }, "none"],
  ] as const)("%o → %s", (input, expected) => {
    expect(streakState(input)).toBe(expected);
  });

  it("agrees with computeStreak on the at-risk case (studied yesterday, not today)", () => {
    const T = 20_000;
    const s = computeStreak(new Set([T - 2, T - 1]), T);
    expect(streakState(s)).toBe("at-risk");
    const kept = computeStreak(new Set([T - 1, T]), T);
    expect(streakState(kept)).toBe("kept");
  });
});

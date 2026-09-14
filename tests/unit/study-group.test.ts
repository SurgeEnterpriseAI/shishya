import { describe, expect, it } from "vitest";
import {
  boardName,
  GROUP_NAME_MAX,
  GROUP_TOKEN_RE,
  istWeekStart,
  newGroupToken,
  rankBoard,
  sanitizeGroupName,
  type MemberWeek,
} from "@/lib/study-group";

// Same arithmetic as istDay in src/lib/study-day.ts (kept local: that module loads the DB client).
const istDayOf = (iso: string) => Math.floor((new Date(iso).getTime() + 5.5 * 3600_000) / 86_400_000);

describe("sanitizeGroupName", () => {
  it("collapses spaces and drops symbols, keeps letters and digits in any script", () => {
    expect(sanitizeGroupName("  CGL   2026  friends 🎯 ")).toBe("CGL 2026 friends");
    expect(sanitizeGroupName("एसएससी दोस्त")).toBe("एसएससी दोस्त");
    expect(sanitizeGroupName("గ్రూప్ 1 స్నేహితులు")).toBe("గ్రూప్ 1 స్నేహితులు");
    expect(sanitizeGroupName("Team <script>")).toBe("Team script");
  });
  it("caps the length and refuses names with nothing left", () => {
    expect(Array.from(sanitizeGroupName("a".repeat(80)) ?? "").length).toBe(GROUP_NAME_MAX);
    expect(sanitizeGroupName("!!! 🎯")).toBeNull();
    expect(sanitizeGroupName("")).toBeNull();
    expect(sanitizeGroupName(42)).toBeNull();
  });
});

describe("boardName", () => {
  it("first word of the account name, any script", () => {
    expect(boardName("Asha Rani")).toBe("Asha");
    expect(boardName("वेणु गोपाल")).toBe("वेणु");
    expect(boardName("  ")).toBeNull();
    expect(boardName(null)).toBeNull();
    expect(Array.from(boardName("Abcdefghijklmnopqrstuvwxyz") ?? "").length).toBe(20);
  });
});

describe("istWeekStart", () => {
  const mon = istDayOf("2026-09-14T00:00:00+05:30"); // a Monday
  it("Monday to Sunday, in IST", () => {
    expect(istWeekStart(mon)).toBe(mon);
    expect(istWeekStart(istDayOf("2026-09-17T12:00:00+05:30"))).toBe(mon);
    expect(istWeekStart(istDayOf("2026-09-20T23:59:00+05:30"))).toBe(mon);
    expect(istWeekStart(istDayOf("2026-09-21T00:00:00+05:30"))).toBe(mon + 7);
    // 00:30 IST Monday is still Sunday in UTC — the IST week has already turned.
    expect(istWeekStart(istDayOf("2026-09-21T00:30:00+05:30"))).toBe(mon + 7);
  });
  it("day 0 (Thursday 1 Jan 1970) belongs to the week of Monday 29 Dec 1969", () => {
    expect(istWeekStart(0)).toBe(-3);
  });
});

describe("rankBoard", () => {
  const now = new Date("2026-09-17T12:00:00+05:30");
  const at = (h: number) => new Date(now.getTime() - h * 3600_000);
  const m = (userId: string, days: number, questions: number, joinedHoursAgo: number): MemberWeek => ({
    userId,
    name: userId,
    days,
    questions,
    joinedAt: at(joinedHoursAgo),
  });

  it("most days first, then most questions; equal pairs share a rank", () => {
    const rows = rankBoard([m("A", 3, 40, 100), m("B", 5, 10, 200), m("C", 3, 40, 50), m("D", 0, 0, 1)], "C", now);
    expect(rows.map((r) => `${r.rank}${r.name}`)).toEqual(["1B", "2A", "2C", "4D"]);
    expect(rows.find((r) => r.isYou)?.name).toBe("C");
    expect(rows.filter((r) => r.isNew).map((r) => r.name)).toEqual(["D"]);
  });
  it("questions break a days tie", () => {
    const rows = rankBoard([m("A", 2, 5, 100), m("B", 2, 30, 100)], "A", now);
    expect(rows.map((r) => `${r.rank}${r.name}`)).toEqual(["1B", "2A"]);
  });
});

describe("tokens", () => {
  it("invite tokens use the challenge link alphabet", () => {
    for (let i = 0; i < 20; i++) expect(GROUP_TOKEN_RE.test(newGroupToken())).toBe(true);
  });
});

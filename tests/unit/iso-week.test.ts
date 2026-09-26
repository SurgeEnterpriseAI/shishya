// ISO weeks in IST (27 Sep 2026) — the week maths behind the weekly tables
// on /shishya-in-numbers and the /pulse archive. No DB, no network.

import { describe, expect, it } from "vitest";
import {
  addWeeks,
  istDayLabel,
  istDayString,
  isoWeek,
  lastCompleteWeek,
  parseWeekSlug,
  weekFromMondayDay,
  weekOf,
  weeksBack,
  weeksBetween,
  weeksInIsoYear,
} from "@/lib/iso-week";

describe("iso-week", () => {
  it("week 39 of 2026 is Monday 21 to Sunday 27 Sep, starting 18:30 UTC on the Sunday before", () => {
    const w = isoWeek(2026, 39);
    expect(w.slug).toBe("2026-w39");
    expect(w.startDay).toBe("2026-09-21");
    expect(w.endDay).toBe("2026-09-27");
    expect(w.start).toBe("2026-09-20T18:30:00.000Z");
    expect(w.end).toBe("2026-09-27T18:30:00.000Z");
    expect(w.label).toBe("21–27 Sep 2026");
  });

  it("labels weeks that cross a month or a year", () => {
    expect(isoWeek(2026, 36).label).toBe("31 Aug–6 Sep 2026");
    expect(isoWeek(2026, 1).label).toBe("29 Dec 2025–4 Jan 2026");
  });

  it("buckets instants by the IST calendar day", () => {
    // 27 Sep 2026 00:09 IST is still Sunday 26 Sep in UTC.
    const now = new Date("2026-09-26T18:39:27Z");
    expect(istDayString(now)).toBe("2026-09-27");
    expect(weekOf(now).slug).toBe("2026-w39");
    // Monday 00:00 IST is the first instant of the week.
    expect(weekOf(new Date("2026-09-20T18:30:00Z")).slug).toBe("2026-w39");
    expect(weekOf(new Date("2026-09-20T18:29:59Z")).slug).toBe("2026-w38");
  });

  it("the last complete week never includes the week in progress", () => {
    expect(lastCompleteWeek(new Date("2026-09-26T18:39:27Z")).slug).toBe("2026-w38");
    // Monday 28 Sep 00:00 IST: week 39 has just ended.
    expect(lastCompleteWeek(new Date("2026-09-27T18:30:00Z")).slug).toBe("2026-w39");
  });

  it("maps a Postgres IST-Monday bucket to its week", () => {
    expect(weekFromMondayDay("2026-09-14").slug).toBe("2026-w38");
    expect(weekFromMondayDay(new Date("2026-08-17T00:00:00Z")).slug).toBe("2026-w34");
  });

  it("parses only real week slugs", () => {
    expect(parseWeekSlug("2026-w38")?.label).toBe("14–20 Sep 2026");
    expect(parseWeekSlug("2026-w00")).toBeNull();
    expect(parseWeekSlug("2025-w53")).toBeNull();
    expect(parseWeekSlug("2026-w53")?.slug).toBe("2026-w53");
    expect(parseWeekSlug("2026-W38")).toBeNull();
    expect(parseWeekSlug("2026-w7")).toBeNull();
    expect(parseWeekSlug("../etc")).toBeNull();
    expect(weeksInIsoYear(2026)).toBe(53);
    expect(weeksInIsoYear(2025)).toBe(52);
  });

  it("steps and ranges across a year boundary", () => {
    expect(addWeeks(isoWeek(2026, 53), 1).slug).toBe("2027-w01");
    expect(addWeeks(isoWeek(2027, 1), -1).slug).toBe("2026-w53");
    expect(weeksBack(isoWeek(2026, 38), 8).map((w) => w.slug)).toEqual([
      "2026-w31",
      "2026-w32",
      "2026-w33",
      "2026-w34",
      "2026-w35",
      "2026-w36",
      "2026-w37",
      "2026-w38",
    ]);
    expect(weeksBetween(isoWeek(2026, 38), isoWeek(2026, 39)).map((w) => w.slug)).toEqual(["2026-w38", "2026-w39"]);
    expect(weeksBetween(isoWeek(2026, 39), isoWeek(2026, 38))).toEqual([]);
  });

  it("formats a day label with a fixed month name", () => {
    expect(istDayLabel("2026-09-27")).toBe("27 Sep 2026");
  });

  it("returns plain JSON (survives an unstable_cache round trip)", () => {
    const w = isoWeek(2026, 38);
    expect(JSON.parse(JSON.stringify(w))).toEqual(w);
  });
});

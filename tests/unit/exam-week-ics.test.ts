// Pure unit tests for src/lib/exam-week-ics.ts (Exam Week Mode wave 2).
// No DB. No network. Run with: npm test

import { describe, it, expect } from "vitest";
import { buildExamWeekIcs, examWeekCalendarRows, icsEscape, icsFold } from "@/lib/exam-week-ics";

const exam = { code: "SSC_CGL", shortName: "SSC CGL", name: "SSC Combined Graduate Level" };
// 12 Sep 2026, 11:30 IST — the eve of an expected 13 Sep exam day.
const now = new Date("2026-09-12T06:00:00Z");
const rows = [
  { id: "d1", label: "Tier 1", date: "2026-09-13T00:00:00.000Z", isExamDay: true, kind: "EXAM", confidence: "expected", url: null },
  { id: "d2", label: "Answer key", date: "2026-09-20T00:00:00.000Z", isExamDay: false, kind: "ANSWER_KEY", confidence: "official", url: "https://ssc.gov.in/key" },
  { id: "d3", label: "Result", date: "2026-11-01T00:00:00.000Z", isExamDay: false, kind: "RESULT", confidence: null, url: null },
  // Untyped legacy seed row — must never enter the calendar.
  { id: "legacy", label: "Tier 1 exam date", date: "2026-09-14T00:00:00.000Z", isExamDay: true, kind: null, confidence: null, url: null },
];

const octets = (s: string) => new TextEncoder().encode(s).length;

describe("exam-week .ics", () => {
  it("emits one all-day VEVENT per typed row, tier word in SUMMARY, source + hub in DESCRIPTION", () => {
    const events = examWeekCalendarRows(rows, null, now);
    expect(events.map((r) => r.id)).toEqual(["d1", "d2", "d3"]);
    const ics = buildExamWeekIcs(exam, events, now);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("SUMMARY:SSC CGL Tier 1 (expected)");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260913");
    expect(ics).toContain("DTEND;VALUE=DATE:20260914");
    expect(ics).toContain("STATUS:TENTATIVE");
    expect(ics).toContain("SUMMARY:SSC CGL Answer key (official)");
    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics).toContain("https://ssc.gov.in/key");
    expect(ics).toContain("https://shishya.in/exams/SSC_CGL");
    expect(ics).not.toContain("UID:SSC_CGL-EXAM-2026-09-14"); // the untyped legacy row
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    // RFC 5545: every physical line ≤ 75 octets.
    expect(ics.split("\r\n").every((l) => octets(l) <= 75)).toBe(true);
  });

  it("never invents a missing answer key / result", () => {
    const events = examWeekCalendarRows([rows[0]], null, now);
    expect(events).toHaveLength(1);
    expect(buildExamWeekIcs(exam, events, now).match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it("outside exam week lists only upcoming typed exam / key / result rows", () => {
    const events = examWeekCalendarRows(rows, null, new Date("2026-10-15T06:00:00Z"));
    expect(events.map((r) => r.id)).toEqual(["d3"]);
  });

  it("keeps the same UID when the tracker row is re-created (no duplicate events)", () => {
    // exam-data-writer archives + re-creates generated rows on every
    // refresh, so the row id changes while the event does not. A
    // re-download must UPDATE the calendar entry, not add a second one.
    const before = examWeekCalendarRows([rows[0], rows[1]], null, now);
    const after = examWeekCalendarRows(
      [
        { ...rows[0], id: "regenerated-1" },
        { ...rows[1], id: "regenerated-2" },
      ],
      null,
      now,
    );
    const uids = (ics: string) => ics.split("\r\n").filter((l) => l.startsWith("UID:"));
    expect(uids(buildExamWeekIcs(exam, before, now))).toEqual(uids(buildExamWeekIcs(exam, after, now)));
    expect(uids(buildExamWeekIcs(exam, before, now))).toEqual([
      "UID:SSC_CGL-EXAM-2026-09-13@shishya.in",
      "UID:SSC_CGL-ANSWER_KEY-2026-09-20@shishya.in",
    ]);
  });

  it("escapes and folds per RFC 5545", () => {
    expect(icsEscape("a,b;c\nd\\e")).toBe("a\\,b\\;c\\nd\\\\e");
    const folded = icsFold("X".repeat(100));
    const lines = folded.split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[1].startsWith(" ")).toBe(true);
    expect(lines.every((l) => octets(l) <= 75)).toBe(true);
    // Multi-byte text folds on octets, not characters.
    const hindi = icsFold("क".repeat(60));
    expect(hindi.split("\r\n").every((l) => octets(l) <= 75)).toBe(true);
  });
});

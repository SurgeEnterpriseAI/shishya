// Pure unit tests for the exam-day phase + poll gate in src/lib/exam-week.ts
// (11 Sep 2026). No DB. Run with: npx vitest run tests/unit/exam-week-phase.test.ts
//
// What changed: the "how was the paper?" poll used to open at the fixed
// 18:00 IST today-pm flip, hours after NDA's 16:30 finish and a morning
// SBI PO Mains sitting. examDayPollOpen() now opens it on today-am once the
// first sitting is over (16 Sep 2026: its END, firstShiftEndIst — it was the
// start, while every candidate was still in the hall; else noon IST) while
// the PHASE still flips at 18:00 for everything else.

import { describe, it, expect } from "vitest";
import {
  computeExamWeekState,
  examDayPollOpen,
  firstShiftEndIst,
  firstShiftStartIst,
  POLL_DEFAULT_OPEN_IST_HOUR,
  TODAY_PM_IST_HOUR,
} from "@/lib/exam-week";
import type { TimelineInput } from "@/lib/exam-timeline";

const d = (iso: string) => `${iso}T00:00:00.000Z`;
/** An instant on IST day `day` at IST clock time hh:mm. */
const ist = (day: string, hh: number, mm = 0) => new Date(Date.parse(`${day}T00:00:00Z`) - 330 * 60_000 + (hh * 60 + mm) * 60_000);

const official: TimelineInput = {
  id: "nda",
  label: "NDA & NA (II) 2026 written exam",
  date: d("2026-09-13"),
  isExamDay: true,
  kind: "EXAM",
  confidence: "official",
  url: "https://upsc.gov.in/examinations/nda-ii-2026",
  notes: "Paper I Mathematics 10:00 AM to 12:30 PM; Paper II GAT 2:00 PM to 4:30 PM",
};
const OFFICIAL_URL = "https://upsc.gov.in";

describe("computeExamWeekState — exam-day phase", () => {
  it("eve the day before, today-am before 18:00 IST, today-pm from 18:00, post after", () => {
    expect(computeExamWeekState([official], OFFICIAL_URL, ist("2026-09-12", 18, 30)).phase).toBe("eve");
    expect(computeExamWeekState([official], OFFICIAL_URL, ist("2026-09-13", 9, 30)).phase).toBe("today-am");
    expect(computeExamWeekState([official], OFFICIAL_URL, ist("2026-09-13", 17, 59)).phase).toBe("today-am");
    expect(computeExamWeekState([official], OFFICIAL_URL, ist("2026-09-13", TODAY_PM_IST_HOUR)).phase).toBe("today-pm");
    expect(computeExamWeekState([official], OFFICIAL_URL, ist("2026-09-14", 8, 30)).phase).toBe("post");
  });

  it("keeps the tier on the focus row (an expected day is still 'today-am', for the caller to gate)", () => {
    const expected: TimelineInput = { ...official, id: "est", confidence: "expected", url: null };
    const s = computeExamWeekState([expected], OFFICIAL_URL, ist("2026-09-13", 14));
    expect(s.phase).toBe("today-am");
    expect(s.tier).toBe("expected");
    const o = computeExamWeekState([official], OFFICIAL_URL, ist("2026-09-13", 14));
    expect(o.tier).toBe("official");
    expect(o.focusDay).toBe("2026-09-13");
  });

  it("ignores untyped legacy rows entirely", () => {
    const legacy: TimelineInput = { id: "seed", label: "Exam date", date: d("2026-09-13"), isExamDay: true, kind: null, confidence: null, url: null };
    expect(computeExamWeekState([legacy], OFFICIAL_URL, ist("2026-09-13", 14)).phase).toBe("none");
  });
});

describe("firstShiftStartIst — the earliest clock time a row names", () => {
  it("reads 12-hour and 24-hour spellings and returns the earliest", () => {
    expect(firstShiftStartIst("10:00 AM to 12:30 PM; 2:00 PM to 4:30 PM")).toBe(10);
    expect(firstShiftStartIst("Shift 1: 9 AM, Shift 2: 2:30 pm")).toBe(9);
    expect(firstShiftStartIst("Reporting 8.30 a.m., paper 10.30 am")).toBe(8.5);
    expect(firstShiftStartIst("Paper from 14:00 hrs")).toBe(14);
    expect(firstShiftStartIst("Exam 09:00-11:00 and 13:00-15:00")).toBe(9);
    expect(firstShiftStartIst("Afternoon sitting only: 2:00 PM")).toBe(14);
  });

  it("returns null when the text names no time (dates, years, marks, the no-key note)", () => {
    expect(firstShiftStartIst(null)).toBeNull();
    expect(firstShiftStartIst("")).toBeNull();
    expect(firstShiftStartIst("Tier 1 on 12 Sep 2026, 100 marks · no key published for this stage")).toBeNull();
    expect(firstShiftStartIst("Total amount 25 items")).toBeNull();
  });
});

describe("firstShiftEndIst — when the first sitting a row names is over", () => {
  it("reads the end of the earliest-starting range, in 12- and 24-hour spellings", () => {
    expect(firstShiftEndIst("Online exam begins — shifts 09:00–12:00 and 14:30–17:30 (end date not announced)")).toBe(12);
    expect(firstShiftEndIst("Paper I 10:00 AM to 12:30 PM; Paper II GAT 2:00 PM to 4:30 PM")).toBe(12.5);
    expect(firstShiftEndIst("Written test — Kalyana Karnataka (859 posts), 15:00–16:30")).toBe(16.5);
    expect(firstShiftEndIst("Shift 1: 9:00 AM to 10:00 AM; reporting 7:30 AM")).toBe(10);
    expect(firstShiftEndIst("Evening 2:00 PM - 4:00 PM, morning 9 am to 11 am")).toBe(11);
  });

  it("reads '12 noon', a start borrowing the end's am/pm, and never a shift / day number (review, 16 Sep 2026)", () => {
    const mlMpsc = "Prelims exam (Paper I: 10 AM - 12 noon, Paper II: 2 PM - 4 PM)";
    expect(firstShiftStartIst(mlMpsc)).toBe(10);
    expect(firstShiftEndIst(mlMpsc)).toBe(12);
    const cds = "Conducted in three sessions: English (9-11 AM), GK (12:30-2:30 PM), Mathematics (4-6 PM)";
    expect(firstShiftStartIst(cds)).toBe(9);
    expect(firstShiftEndIst(cds)).toBe(11);
    const uppsc = "Two objective-type papers on same day: GS-I (9:30-11:30 AM) and GS-II (2:30-4:30 PM)";
    expect(firstShiftStartIst(uppsc)).toBe(9.5);
    expect(firstShiftEndIst(uppsc)).toBe(11.5);
    expect(firstShiftEndIst("Single sitting 11-1 PM")).toBe(13);
    // A number that names the shift / day / paper is not a start hour.
    expect(firstShiftStartIst("Shift 3 - 9 AM to 12 PM")).toBe(9);
    expect(firstShiftEndIst("Shift 3 - 9 AM to 12 PM")).toBe(12);
    expect(firstShiftStartIst("Day 5 – 10 AM to 1 PM")).toBe(10);
    expect(firstShiftStartIst("Paper 2 - 10 AM")).toBe(10);
    expect(firstShiftStartIst("the afternoon sitting")).toBeNull();
  });

  it("falls back to the start when no range is named, null with no time", () => {
    expect(firstShiftEndIst("Shift 1: 9 AM, Shift 2: 2:30 pm")).toBe(9);
    expect(firstShiftEndIst("Paper from 14:00 hrs")).toBe(14);
    expect(firstShiftEndIst("Tier 1 on 12 Sep 2026, 100 marks")).toBeNull();
    expect(firstShiftEndIst(null)).toBeNull();
  });
});

describe("examDayPollOpen — when the exam-day block may ask the question", () => {
  const stateAt = (rows: TimelineInput[], when: Date) => computeExamWeekState(rows, OFFICIAL_URL, when);

  it("opens when the first sitting ENDS when the EXAM row carries a time range (16 Sep 2026)", () => {
    // NDA: "Paper I 10:00 AM to 12:30 PM; Paper II GAT 2:00 PM to 4:30 PM".
    expect(examDayPollOpen(stateAt([official], ist("2026-09-13", 10)), ist("2026-09-13", 10))).toBe(false);
    expect(examDayPollOpen(stateAt([official], ist("2026-09-13", 12, 29)), ist("2026-09-13", 12, 29))).toBe(false);
    expect(examDayPollOpen(stateAt([official], ist("2026-09-13", 12, 30)), ist("2026-09-13", 12, 30))).toBe(true);
    expect(examDayPollOpen(stateAt([official], ist("2026-09-13", 16, 30)), ist("2026-09-13", 16, 30))).toBe(true);
  });

  it("MP RAEO 09:00–12:00 and KSRP 10:30–12:00 / 15:00–16:30 both open at 12:00, not while candidates are in the hall", () => {
    const raeo: TimelineInput = {
      ...official,
      id: "raeo",
      label: "Online exam begins — shifts 09:00–12:00 and 14:30–17:30 (end date not announced)",
      date: d("2026-09-17"),
      notes: null,
    };
    expect(examDayPollOpen(stateAt([raeo], ist("2026-09-17", 9, 30)), ist("2026-09-17", 9, 30))).toBe(false);
    expect(examDayPollOpen(stateAt([raeo], ist("2026-09-17", 11, 59)), ist("2026-09-17", 11, 59))).toBe(false);
    expect(examDayPollOpen(stateAt([raeo], ist("2026-09-17", 12)), ist("2026-09-17", 12))).toBe(true);
    const morning: TimelineInput = { ...official, id: "k1", label: "Written test — outside Kalyana Karnataka (1,455 posts), 10:30–12:00", date: d("2026-09-20"), notes: null };
    const afternoon: TimelineInput = { ...morning, id: "k2", label: "Written test — Kalyana Karnataka (KSRP, KSISF, IRB; 859 posts), 15:00–16:30" };
    const at = (hh: number, mm = 0) => ist("2026-09-20", hh, mm);
    expect(examDayPollOpen(stateAt([afternoon, morning], at(11)), at(11))).toBe(false);
    expect(examDayPollOpen(stateAt([afternoon, morning], at(12)), at(12))).toBe(true);
  });

  it("a row that names only a start opens at that start", () => {
    const startOnly: TimelineInput = { ...official, id: "s", notes: "Shift 1 from 9 AM" };
    expect(examDayPollOpen(stateAt([startOnly], ist("2026-09-13", 8, 59)), ist("2026-09-13", 8, 59))).toBe(false);
    expect(examDayPollOpen(stateAt([startOnly], ist("2026-09-13", 9)), ist("2026-09-13", 9))).toBe(true);
  });

  it("opens at noon IST when the row names no time", () => {
    const untimed: TimelineInput = { ...official, id: "sbi", label: "SBI PO Mains", notes: null };
    expect(POLL_DEFAULT_OPEN_IST_HOUR).toBe(12);
    expect(examDayPollOpen(stateAt([untimed], ist("2026-09-13", 11, 59)), ist("2026-09-13", 11, 59))).toBe(false);
    expect(examDayPollOpen(stateAt([untimed], ist("2026-09-13", 12)), ist("2026-09-13", 12))).toBe(true);
  });

  it("is always open from 18:00 IST, whatever the row says", () => {
    const late: TimelineInput = { ...official, id: "late", notes: "Evening shift 7:00 PM to 9:00 PM" };
    expect(examDayPollOpen(stateAt([late], ist("2026-09-13", 17, 59)), ist("2026-09-13", 17, 59))).toBe(false);
    expect(examDayPollOpen(stateAt([late], ist("2026-09-13", 18)), ist("2026-09-13", 18))).toBe(true);
  });

  it("reads only the focus day's rows inside a multi-day window", () => {
    // Window: 12 Sep (untimed) and 13 Sep (10 AM). On the 12th the focus
    // is the 12th, so the 10 AM on the 13th's row must not open it early.
    const day1: TimelineInput = { ...official, id: "d1", date: d("2026-09-12"), notes: null };
    const day2: TimelineInput = { ...official, id: "d2", date: d("2026-09-13") };
    const s = stateAt([day1, day2], ist("2026-09-12", 10, 30));
    expect(s.phase).toBe("today-am");
    expect(s.focusDay).toBe("2026-09-12");
    expect(examDayPollOpen(s, ist("2026-09-12", 10, 30))).toBe(false);
    expect(examDayPollOpen(s, ist("2026-09-12", 12))).toBe(true);
  });
});

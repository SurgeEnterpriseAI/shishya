// Pure unit tests for the exam-day phase + poll gate in src/lib/exam-week.ts
// (11 Sep 2026). No DB. Run with: npx vitest run tests/unit/exam-week-phase.test.ts
//
// What changed: the "how was the paper?" poll used to open at the fixed
// 18:00 IST today-pm flip, hours after NDA's 16:30 finish and a morning
// SBI PO Mains sitting. examDayPollOpen() now opens it on today-am from
// the first shift's start (the EXAM row's own label / notes timing, else
// noon IST) while the PHASE still flips at 18:00 for everything else.

import { describe, it, expect } from "vitest";
import {
  computeExamWeekState,
  examDayPollOpen,
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

describe("examDayPollOpen — when the exam-day block may ask the question", () => {
  const stateAt = (rows: TimelineInput[], when: Date) => computeExamWeekState(rows, OFFICIAL_URL, when);

  it("opens at the first shift's start when the EXAM row carries timings", () => {
    expect(examDayPollOpen(stateAt([official], ist("2026-09-13", 9, 59)), ist("2026-09-13", 9, 59))).toBe(false);
    expect(examDayPollOpen(stateAt([official], ist("2026-09-13", 10)), ist("2026-09-13", 10))).toBe(true);
    expect(examDayPollOpen(stateAt([official], ist("2026-09-13", 16, 30)), ist("2026-09-13", 16, 30))).toBe(true);
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

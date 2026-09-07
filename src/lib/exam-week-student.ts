// Exam Week Mode — per-STUDENT helpers on top of the shared state
// machine (wave 2, 6 Sep 2026). Pure functions, no DB.
//
//   • shiftDayIso / shiftableDays / applyShiftDay — a signed-in student
//     inside a multi-day CBT window (SSC CGL 12–25 Sep) picks their OWN
//     shift day (Enrollment.shiftDate). The hub / tracker block and the
//     verdict poll then key off that day: "week" while it is 2+ days out,
//     "eve" the day before, "today-am/pm" on the day, "post" after — even
//     while the window itself is still running for everybody else.
//   • examDone — "the last announced exam day is behind this student" for
//     the coach rollover card (dashboard MissionCard, /coach?next=1).
//
// Honesty rules carried over from src/lib/exam-week.ts: only typed rows
// count; an EXPECTED exam day is an estimate, so it is never offered as a
// shift chip and never counts as "done".

import { computeExamWeekState, istDay, istHour, type ExamWeekState } from "@/lib/exam-week";
import { buildTimeline, type TimelineInput, type TimelineRow } from "@/lib/exam-timeline";

const DAY_MS = 86_400_000;

/** The rollover card stops asking this many days after the last exam day
 *  (a stale previous-cycle row must not read as "your exam is done"). */
export const ROLLOVER_MAX_DAYS = 90;

export const ISO_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function dayDiff(fromDay: string, toDay: string): number {
  return Math.round((Date.parse(toDay + "T00:00:00Z") - Date.parse(fromDay + "T00:00:00Z")) / DAY_MS);
}

/** Enrollment.shiftDate (@db.Date → UTC midnight; ISO strings on cache
 *  hits) → "YYYY-MM-DD", or null. */
export function shiftDayIso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

/** Window days a student may pick as their shift: announced (official /
 *  reported) exam-day rows of the window, earliest first, one per day. */
export function shiftableDays(state: ExamWeekState): TimelineRow[] {
  const seen = new Set<string>();
  const out: TimelineRow[] = [];
  for (const r of state.windowDays) {
    if (r.tier === "expected") continue;
    const day = istDay(r.date);
    if (seen.has(day)) continue;
    seen.add(day);
    out.push(r);
  }
  return out;
}

/**
 * Re-key a base exam-week state on the student's shift day. Returns the
 * base state untouched when there is no phase, no shift day, or the shift
 * day is not one of this window's announced exam days (a stale value from
 * an earlier cycle must not move the block).
 */
export function applyShiftDay(base: ExamWeekState, shiftDay: string | null | undefined, now: Date = new Date()): ExamWeekState {
  if (base.phase === "none" || !shiftDay || !ISO_DAY_RE.test(shiftDay)) return base;
  const row = shiftableDays(base).find((r) => istDay(r.date) === shiftDay);
  if (!row) return base;
  const today = istDay(now);
  const d = dayDiff(today, shiftDay);
  const phase: ExamWeekState["phase"] =
    d >= 2 ? "week" : d === 1 ? "eve" : d === 0 ? (istHour(now) >= 18 ? "today-pm" : "today-am") : "post";
  return { ...base, phase, focus: row, focusDay: shiftDay, tier: row.tier, daysTo: d };
}

/**
 * Has this exam's LAST announced exam day passed — with no announced exam
 * day still ahead — within the last ROLLOVER_MAX_DAYS? True in the shared
 * "post" phase and for up to 90 days beyond it. Expected-tier rows never
 * qualify: an estimate is not a paper the student sat.
 */
export function examDone(rows: TimelineInput[], officialUrl: string | null | undefined, now: Date = new Date()): boolean {
  const state = computeExamWeekState(rows, officialUrl, now);
  if (state.phase === "post") return state.tier !== "expected";
  if (state.phase !== "none") return false;
  const typed = rows.filter((r) => typeof r.kind === "string" && r.kind.length > 0);
  const examDays = buildTimeline(typed, now, officialUrl).filter((r) => r.kind === "EXAM" && r.tier !== "expected");
  if (examDays.length === 0) return false;
  const today = istDay(now);
  const days = examDays.map((r) => istDay(r.date)).sort();
  if (days[days.length - 1] >= today) return false;
  const ago = dayDiff(days[days.length - 1], today);
  return ago >= 1 && ago <= ROLLOVER_MAX_DAYS;
}

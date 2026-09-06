// Exam Week Mode — shared state machine (6 Sep 2026).
//
// One pure function every exam-week surface reads (hub block, cutoff page,
// tracker, emails, context.md/llms lines), so all of them agree on WHICH
// exam day is in focus and WHAT phase today is in IST:
//
//   none      no exam day within [-7, +7] days
//   week      2..7 days before the exam
//   eve       the day before
//   today-am  exam day, before 18:00 IST
//   today-pm  exam day, 18:00 IST onwards ("how was the paper?")
//   window    the exam is a multi-day/multi-shift window and today is inside it
//   post      1..7 days after the (last) exam day
//
// Honesty rules baked in: the focus row keeps its source tier (official /
// reported / expected) and callers must print it next to every date; the
// answer-key / result rows are only ever what the tracker holds — callers
// print "not announced yet" when null, never a guessed date.

import { buildTimeline, type TimelineInput, type TimelineRow, type SourceTier } from "@/lib/exam-timeline";

export type ExamWeekPhase = "none" | "week" | "eve" | "today-am" | "today-pm" | "window" | "post";

export interface ExamWeekState {
  phase: ExamWeekPhase;
  /** The exam-day row in focus (null when phase === "none"). */
  focus: TimelineRow | null;
  /** IST calendar date of the focus row, "YYYY-MM-DD". */
  focusDay: string | null;
  tier: SourceTier | null;
  /** Days from today (IST) to the focus day: positive = upcoming, negative = past. */
  daysTo: number | null;
  /** Last exam-day date of a multi-day window (same as focus for single-day exams). */
  windowEnd: TimelineRow | null;
  /** All exam-day rows that form the window (focus first). */
  windowDays: TimelineRow[];
  /** Nearest ANSWER_KEY row on/after the focus day, if the tracker has one. */
  answerKey: TimelineRow | null;
  /** Nearest RESULT row on/after the focus day, if the tracker has one. */
  result: TimelineRow | null;
  /** Next exam-day row for this exam after the window (e.g. Tier 2 / Mains). */
  nextStage: TimelineRow | null;
}

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" of an instant in IST. */
export function istDay(d: Date): string {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Hour of day (0-23) in IST. */
export function istHour(d: Date): number {
  return new Date(d.getTime() + IST_OFFSET_MS).getUTCHours();
}

function dayDiff(fromDay: string, toDay: string): number {
  return Math.round((Date.parse(toDay + "T00:00:00Z") - Date.parse(fromDay + "T00:00:00Z")) / DAY_MS);
}

const TIER_RANK: Record<SourceTier, number> = { official: 0, reported: 1, expected: 2 };

/**
 * Compute the exam-week state from the exam's tracker rows.
 * @param rows        ExamImportantDate rows (archived rows must already be excluded)
 * @param officialUrl the exam's conducting-body URL (ExamEligibility.officialUrl) — drives the tier
 * @param now         instant to evaluate at (tests pass a fixed date)
 */
export function computeExamWeekState(
  rows: TimelineInput[],
  officialUrl?: string | null,
  now: Date = new Date(),
): ExamWeekState {
  const timeline = buildTimeline(rows, now, officialUrl);
  const today = istDay(now);
  const examDays = timeline
    .filter((r) => r.isExamDay || r.kind === "EXAM")
    .map((r) => ({ row: r, day: istDay(r.date) }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const none: ExamWeekState = {
    phase: "none", focus: null, focusDay: null, tier: null, daysTo: null,
    windowEnd: null, windowDays: [], answerKey: null, result: null, nextStage: null,
  };
  if (examDays.length === 0) return none;

  // Candidate focus rows: exam days within [-7, +7] of today. Prefer the
  // best tier, then the one nearest to today (upcoming before past on ties).
  const candidates = examDays
    .map((e) => ({ ...e, diff: dayDiff(today, e.day) }))
    .filter((e) => e.diff >= -7 && e.diff <= 7);
  if (candidates.length === 0) return none;
  candidates.sort((a, b) =>
    TIER_RANK[a.row.tier] - TIER_RANK[b.row.tier] ||
    Math.abs(a.diff) - Math.abs(b.diff) ||
    b.diff - a.diff,
  );
  // A window is a run of exam days no more than 14 days apart. Anchor the
  // window on the EARLIEST candidate so "window" covers SSC-style CBTs.
  const earliest = [...candidates].sort((a, b) => a.diff - b.diff)[0];
  const windowDays: typeof examDays = [earliest];
  for (const e of examDays) {
    if (e.day <= earliest.day) continue;
    const last = windowDays[windowDays.length - 1];
    if (dayDiff(last.day, e.day) <= 14) windowDays.push(e);
    else break;
  }
  const first = windowDays[0];
  const last = windowDays[windowDays.length - 1];
  const focus = candidates[0].row === first.row ? first : candidates[0];
  const daysTo = dayDiff(today, first.day);
  const daysAfterLast = dayDiff(last.day, today);

  let phase: ExamWeekPhase = "none";
  if (daysTo >= 2 && daysTo <= 7) phase = "week";
  else if (daysTo === 1) phase = "eve";
  else if (daysTo === 0) phase = istHour(now) >= 18 ? "today-pm" : "today-am";
  else if (daysTo < 0 && today <= last.day) phase = "window";
  else if (daysAfterLast >= 1 && daysAfterLast <= 7) phase = "post";
  if (phase === "none") return none;

  const after = (kind: string) =>
    timeline
      .filter((r) => r.kind === kind && istDay(r.date) >= first.day)
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null;
  const nextStage = examDays.find((e) => dayDiff(last.day, e.day) > 14)?.row ?? null;

  return {
    phase,
    focus: focus.row,
    focusDay: focus.day,
    tier: focus.row.tier,
    daysTo,
    windowEnd: last.row,
    windowDays: windowDays.map((w) => w.row),
    answerKey: after("ANSWER_KEY"),
    result: after("RESULT"),
    nextStage,
  };
}

/** Human "date (tier)" fragment, e.g. "13 Sep (official)". Caller supplies the localised tier word. */
export function dateWithTier(row: TimelineRow, tierWord: string, locale: string = "en"): string {
  const d = new Date(row.date.getTime() + IST_OFFSET_MS);
  const day = d.toLocaleDateString(locale === "hi" ? "hi-IN" : locale === "te" ? "te-IN" : "en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${day} (${tierWord})`;
}

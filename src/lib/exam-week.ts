// Exam Week Mode — shared state machine (6 Sep 2026).
//
// One pure function every exam-week surface reads (hub block, cutoff page,
// tracker, emails, context.md/llms lines), so all of them agree on WHICH
// exam day is in focus and WHAT phase today is in IST:
//
//   none      no exam day within [-7, +7] days
//   week      2..7 days before the (first) exam day
//   eve       the day before
//   today-am  exam day, before 18:00 IST
//   today-pm  exam day, 18:00 IST onwards ("how was the paper?")
//   window    the exam is a multi-day/multi-shift window and today is inside it
//   post      1..7 days after the (last) exam day
//
// Honesty rules baked in: only TYPED rows count (kind set) — untyped legacy
// seed rows never open a phase; the focus row keeps its source tier
// (official / reported / expected) and callers must print it next to every
// date; answer-key / result rows are only ever what the tracker holds —
// callers print "not announced yet" when null, never a guessed date.
//
// Window semantics (review fix, 6 Sep): a window is a chain of exam-day rows
// no more than 14 days apart, built from ALL exam days (not just those near
// today), so a 12–25 Sep CBT window stays "window" on its 8th day instead of
// turning back into "week/eve" for the last row. Inside a window the FOCUS
// is the latest exam day on or before today — the day students can rate —
// never a future row.

import { buildTimeline, type TimelineInput, type TimelineRow, type SourceTier } from "@/lib/exam-timeline";

export type ExamWeekPhase = "none" | "week" | "eve" | "today-am" | "today-pm" | "window" | "post";

export interface ExamWeekState {
  phase: ExamWeekPhase;
  /** The exam-day row in focus (null when phase === "none"). Before the
   *  window: its first day. Inside/after: the latest exam day ≤ today. */
  focus: TimelineRow | null;
  /** IST calendar date of the focus row, "YYYY-MM-DD" — the poll's key. */
  focusDay: string | null;
  tier: SourceTier | null;
  /** Days from today (IST) to the window's FIRST day: positive = upcoming, negative = past. */
  daysTo: number | null;
  /** Last exam-day row of the window (same as focus for single-day exams). */
  windowEnd: TimelineRow | null;
  /** All exam-day rows that form the window, earliest first. */
  windowDays: TimelineRow[];
  /** Nearest ANSWER_KEY row on/after the window's first day, if the tracker has one. */
  answerKey: TimelineRow | null;
  /** Nearest RESULT row on/after the window's first day, if the tracker has one. */
  result: TimelineRow | null;
  /** Next exam-day row for this exam after the window (e.g. Tier 2 / Mains). */
  nextStage: TimelineRow | null;
}

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;
const WINDOW_GAP_DAYS = 14;
const NEAR_DAYS = 7;

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

const NONE: ExamWeekState = {
  phase: "none", focus: null, focusDay: null, tier: null, daysTo: null,
  windowEnd: null, windowDays: [], answerKey: null, result: null, nextStage: null,
};

/**
 * Compute the exam-week state from the exam's tracker rows.
 * @param rows        ExamImportantDate rows (archived rows must already be excluded;
 *                    untyped legacy rows are ignored here)
 * @param officialUrl the exam's conducting-body URL (ExamEligibility.officialUrl) — drives the tier
 * @param now         instant to evaluate at (tests pass a fixed date)
 */
export function computeExamWeekState(
  rows: TimelineInput[],
  officialUrl?: string | null,
  now: Date = new Date(),
): ExamWeekState {
  // Typed rows only: the May-2026 seed left untyped rows (kind null) that
  // buildTimeline would otherwise promote to EXAM via isExamDay.
  const typed = rows.filter((r) => typeof r.kind === "string" && r.kind.length > 0);
  const timeline = buildTimeline(typed, now, officialUrl);
  const today = istDay(now);
  const examDays = timeline
    .filter((r) => r.kind === "EXAM")
    .map((r) => ({ row: r, day: istDay(r.date) }))
    .sort((a, b) => a.day.localeCompare(b.day) || TIER_RANK[a.row.tier] - TIER_RANK[b.row.tier]);
  if (examDays.length === 0) return NONE;

  // Chains: consecutive exam days ≤ 14 days apart form one window.
  const chains: (typeof examDays)[] = [];
  for (const e of examDays) {
    const cur = chains[chains.length - 1];
    if (cur && dayDiff(cur[cur.length - 1].day, e.day) <= WINDOW_GAP_DAYS) cur.push(e);
    else chains.push([e]);
  }

  // The relevant chain: one with any day within [-7, +7] of today. If several
  // qualify (rare), prefer the one whose nearest day is best-tier, then nearest.
  const scored = chains
    .map((c) => {
      const near = c
        .map((e) => ({ e, diff: dayDiff(today, e.day) }))
        .filter((x) => x.diff >= -NEAR_DAYS && x.diff <= NEAR_DAYS)
        .sort((a, b) => TIER_RANK[a.e.row.tier] - TIER_RANK[b.e.row.tier] || Math.abs(a.diff) - Math.abs(b.diff) || b.diff - a.diff);
      return { c, near: near[0] ?? null };
    })
    .filter((x) => x.near);
  if (scored.length === 0) return NONE;
  scored.sort((a, b) => TIER_RANK[a.near!.e.row.tier] - TIER_RANK[b.near!.e.row.tier] || Math.abs(a.near!.diff) - Math.abs(b.near!.diff));
  const chain = scored[0].c;
  const first = chain[0];
  const last = chain[chain.length - 1];
  const daysTo = dayDiff(today, first.day);
  const daysAfterLast = dayDiff(last.day, today);

  let phase: ExamWeekPhase = "none";
  let focus = first;
  if (daysTo >= 2 && daysTo <= NEAR_DAYS) phase = "week";
  else if (daysTo === 1) phase = "eve";
  else if (daysTo <= 0 && today <= last.day) {
    // Inside the window: focus = latest exam day on or before today.
    focus = [...chain].reverse().find((e) => e.day <= today) ?? first;
    phase = focus.day === today ? (istHour(now) >= 18 ? "today-pm" : "today-am") : "window";
  } else if (daysAfterLast >= 1 && daysAfterLast <= NEAR_DAYS) {
    phase = "post";
    focus = last;
  }
  if (phase === "none") return NONE;

  const after = (kind: string) =>
    timeline
      .filter((r) => r.kind === kind && istDay(r.date) >= first.day)
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null;
  const nextStage = examDays.find((e) => dayDiff(last.day, e.day) > WINDOW_GAP_DAYS)?.row ?? null;

  return {
    phase,
    focus: focus.row,
    focusDay: focus.day,
    tier: focus.row.tier,
    daysTo,
    windowEnd: last.row,
    windowDays: chain.map((w) => w.row),
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

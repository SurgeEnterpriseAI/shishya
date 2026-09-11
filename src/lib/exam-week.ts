// Exam Week Mode — shared state machine (6 Sep 2026).
//
// One pure function every exam-week surface reads (hub block, cutoff page,
// tracker, emails, context.md/llms lines), so all of them agree on WHICH
// exam day is in focus and WHAT phase today is in IST:
//
//   none      no exam day within [-7, +7] days
//   week      2..7 days before the (first) exam day
//   eve       the day before
//   today-am  exam day, before 18:00 IST (TODAY_PM_IST_HOUR)
//   today-pm  exam day, 18:00 IST onwards ("how was the paper?")
//   window    the exam is a multi-day/multi-shift window and today is inside it
//   post      1..7 days after the (last) exam day
//
// The poll itself opens EARLIER than today-pm (11 Sep 2026): NDA's second
// paper ends 16:30 IST and SBI PO Mains is a morning sitting, so a fixed
// 18:00 gate asked "how was the paper?" hours after students had left the
// hall. examDayPollOpen() below answers "may the block show the poll on
// today-am?" — from the first shift's start when the EXAM row's label /
// notes name a time, else from noon IST — while the PHASE keeps flipping
// at 18:00 for everything else (mails, alert copy, cache keys).
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
  /** Days from today (IST) to the FOCUS day: positive = upcoming, negative
   *  = past. Always describes `focusDay`, so a caller can print the two
   *  together — inside a long window that is the day students just sat,
   *  not the day the window opened. */
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
/** Exam day flips from today-am to today-pm at this IST hour. */
export const TODAY_PM_IST_HOUR = 18;
/** With no timing on the EXAM row, "done with your paper?" is first asked
 *  from this IST hour on exam day — a single morning sitting is over by then. */
export const POLL_DEFAULT_OPEN_IST_HOUR = 12;

/** "YYYY-MM-DD" of an instant in IST. */
export function istDay(d: Date): string {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Hour of day (0-23) in IST. */
export function istHour(d: Date): number {
  return new Date(d.getTime() + IST_OFFSET_MS).getUTCHours();
}

/** Fractional hour of day in IST (10.5 = 10:30). */
function istHourFrac(d: Date): number {
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  return ist.getUTCHours() + ist.getUTCMinutes() / 60;
}

/**
 * Earliest clock time named in a tracker row's label / notes, as a
 * fractional IST hour — the first shift's start. Reads "10:00 AM to
 * 12:30 PM", "9 am", "10.30 AM", "Shift 1: 09:00", "14:00 hrs". Returns
 * null when the text names no time (dates, years and marks never match).
 */
export function firstShiftStartIst(text: string | null | undefined): number | null {
  if (!text) return null;
  let best: number | null = null;
  const take = (h: number) => {
    if (best === null || h < best) best = h;
  };
  // 12-hour clock with am/pm (a.m. / p.m. spellings too).
  const rest = text.replace(/\b(\d{1,2})(?:[:.](\d{2}))?\s*([ap])\.?m\.?(?![a-z])/gi, (_, h: string, m: string | undefined, ap: string) => {
    const hour = Number(h);
    const min = m ? Number(m) : 0;
    if (hour >= 1 && hour <= 12 && min <= 59) {
      take((hour % 12) + (ap.toLowerCase() === "p" ? 12 : 0) + min / 60);
    }
    return " ";
  });
  // 24-hour clock ("14:00", "09:00 hrs") on what is left.
  for (const m of rest.matchAll(/\b(\d{1,2}):(\d{2})\b/g)) {
    const hour = Number(m[1]);
    const min = Number(m[2]);
    if (hour <= 23 && min <= 59) take(hour + min / 60);
  }
  return best;
}

/**
 * May the exam-day block show "done with your paper?" now? True from
 * TODAY_PM_IST_HOUR regardless; earlier on exam day once the first shift
 * has plausibly started — the earliest time the focus day's EXAM rows
 * name in their label / notes, else POLL_DEFAULT_OPEN_IST_HOUR. Reads
 * only the clock: the caller still gates on an ANNOUNCED tier.
 */
export function examDayPollOpen(
  state: Pick<ExamWeekState, "focus" | "focusDay" | "windowDays">,
  now: Date = new Date(),
): boolean {
  const h = istHourFrac(now);
  if (h >= TODAY_PM_IST_HOUR) return true;
  const rows = [state.focus, ...state.windowDays].filter(
    (r): r is TimelineRow => !!r && (!state.focusDay || istDay(r.date) === state.focusDay),
  );
  const starts = rows.map((r) => firstShiftStartIst(`${r.label ?? ""}\n${r.notes ?? ""}`)).filter((x): x is number => x !== null);
  const opensAt = starts.length ? Math.min(...starts) : POLL_DEFAULT_OPEN_IST_HOUR;
  return h >= opensAt;
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
  // Distance to the window's FIRST day — this is what decides the phase
  // (week / eve / inside / post). The value REPORTED as daysTo is
  // re-based on the focus row further down, so daysTo and focusDay always
  // describe the same day; applyShiftDay does the same for a shift day.
  const daysToFirst = dayDiff(today, first.day);
  const daysAfterLast = dayDiff(last.day, today);

  let phase: ExamWeekPhase = "none";
  let focus = first;
  if (daysToFirst >= 2 && daysToFirst <= NEAR_DAYS) phase = "week";
  else if (daysToFirst === 1) phase = "eve";
  else if (daysToFirst <= 0 && today <= last.day) {
    // Inside the window: focus = latest exam day on or before today.
    focus = [...chain].reverse().find((e) => e.day <= today) ?? first;
    phase = focus.day === today ? (istHour(now) >= TODAY_PM_IST_HOUR ? "today-pm" : "today-am") : "window";
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
    daysTo: dayDiff(today, focus.day),
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

// refresh-exam-data queue ordering — pure, unit-tested (13 Sep 2026,
// exam-week lane).
//
// Audit 11 Sep 2026: the tracker refresh had no exam-week lane. The queue
// was "top-15-by-candidates if stale, then most-stale-first", so NDA
// (350k candidates) and CDS (250k) — both outside the top 15 — were
// refreshed on whatever day the staleness rotation reached them, and a
// key / question paper UPSC posts on exam evening was seen at 06:45 IST
// the next day at best. On exam night the tracker, the hub block, the
// /live + /reactions pages and the alert mail all read these rows.
//
// Two tiers per run, in this order:
//   LANE  every exam in an exam-week phase where new official rows are
//         likely (eve / today-am / today-pm / window / post), ordered
//           today-pm → today-am → window → post → eve   (LANE_RANK)
//           then announced days (official / reported) before expected
//           then candidatesPerYear desc, then most-stale-first
//         and capped at LANE_MAX_PER_RUN. An expected-tier exam day still
//         earns a lane slot (this refresh is how it becomes official) —
//         after the announced ones.
//   TAIL  the other exams (see 7 Oct below).
// `laneOnly` (the 20:15 IST run) returns only the lane, filtered to the
// named phases, and an empty tail.
//
// 7 Oct 2026 (decision D2, option C): a lane exam RESTS after a refresh.
// Measured 23 Sep-7 Oct: the same 6 exam-week exams were called 3-4 times a
// day (e.g. SOF_IGKO, CS_FOUNDATION x4 on 6 Oct), each call about $0.21, and
// most of what the repeats wrote was the same dates restated. Now:
//   today-pm                                  no rest   (18:45 and 20:15 on exam evening)
//   eve, today-am, post up to 2 days after    10 hours  (twice a day: 06:45 and 18:45)
//   window, post 3 to 7 days after            20 hours, at the evening run (once a day, 18:45)
// The once-a-day refresh waits for the evening run (most first-seen dates
// came at 18:45; the day's notices are up by then) unless the last refresh
// is LANE_FAR_CATCH_UP_MS old, so a run lost to an outage does not cost the
// day. This keeps the morning run to the exams near their exam day and the
// lane under the guard's $2.05 "exam-info" cap (src/lib/ai/spend-guard.ts).
// A resting exam is in neither the lane nor the tail.
//
// 7 Oct 2026 (plan build 5d): the TAIL is picked by hub visitors, not by
// size. TOP_N-by-candidates is gone: it gave the 15 biggest exams every
// slot (193 calls reached 27 exams in 10 days; AP_APPSC_GROUP2, 83 hub
// visitors that week, had none). Each exam gets a target interval from its
// hub's human visitors in the last 7 days — 30+ → 7 days, 10-29 → 14, fewer
// → 42 — and is eligible only when not refreshed in the last 7 days; the
// most overdue against its own interval goes first. Lane overflow (exam-week
// exams past the lane cap) heads the tail. When the visitor read failed
// (`visitors` null), the tail is most-stale-first over everything.
//
// No DB, no model calls: src/lib/exam-refresh-run.ts feeds it.

import type { ExamWeekPhase } from "@/lib/exam-week";
import type { SourceTier } from "@/lib/official-source";

/** Phases that put an exam in the lane ("week" is deliberately out: a
 *  T-7..T-2 exam changes slowly and the tail rotation covers it). */
export const LANE_PHASES: ReadonlySet<ExamWeekPhase> = new Set<ExamWeekPhase>(["today-pm", "today-am", "window", "post", "eve"]);

/** Lower = earlier in the lane. */
export const LANE_RANK: Readonly<Record<string, number>> = { "today-pm": 0, "today-am": 1, window: 2, post: 3, eve: 4 };

/** Lane cap per run — bounds the lane's spend at LANE_MAX_PER_RUN × the
 *  per-exam cost regardless of how many exams share a window. */
export const LANE_MAX_PER_RUN = 6;

const HOUR_MS = 3600_000;
const DAY_MS = 24 * HOUR_MS;

/** Option C: rest after a refresh, near the exam day (twice a day). */
export const LANE_REST_NEAR_MS = 10 * HOUR_MS;
/** Option C: rest after a refresh, other exam-week days (once a day). */
export const LANE_REST_FAR_MS = 20 * HOUR_MS;
/** Option C: the once-a-day refresh is taken from this IST hour (the 18:45 run)… */
export const LANE_FAR_EVENING_IST_HOUR = 18;
/** …or by any run once the last refresh is this old (the evening run was missed). */
export const LANE_FAR_CATCH_UP_MS = 30 * HOUR_MS;

/** 5d: a tail exam is eligible only when not refreshed for this long. */
export const TAIL_MIN_AGE_MS = 7 * DAY_MS;

const TIER_RANK: Record<SourceTier, number> = { official: 0, reported: 1, expected: 2 };

export interface QueueExam {
  id: string;
  code: string;
  candidatesPerYear: number | null;
  /** max(last generated news row, last refresh attempt), ms since epoch; 0 = never. */
  lastRefreshedMs: number;
}

export interface LaneState {
  phase: ExamWeekPhase;
  tier: SourceTier | null;
  /** Days from today (IST) to the focus exam day; negative = past (ExamWeekState.daysTo). */
  daysTo?: number | null;
}

export type LaneExam = QueueExam & LaneState;

export interface OrderOptions {
  nowMs: number;
  /** Restrict the lane to these phases and return no tail (the 20:15 IST run). */
  laneOnly?: ExamWeekPhase[];
  laneMax?: number;
  /** Human hub visitors per exam CODE, last 7 days. null/undefined = the read failed → most-stale-first. */
  visitors?: ReadonlyMap<string, number> | null;
}

/** How long an exam-week exam rests after a refresh (option C). */
export function laneRestMs(state: LaneState): number {
  if (state.phase === "today-pm") return 0;
  if (state.phase === "eve" || state.phase === "today-am") return LANE_REST_NEAR_MS;
  if (state.phase === "post" && typeof state.daysTo === "number" && state.daysTo >= -2) return LANE_REST_NEAR_MS;
  return LANE_REST_FAR_MS;
}

/** Is this exam-week exam resting at `nowMs` (option C)? */
export function laneResting(state: LaneState, lastRefreshedMs: number, nowMs: number): boolean {
  const age = nowMs - lastRefreshedMs;
  const rest = laneRestMs(state);
  if (age < rest) return true;
  if (rest !== LANE_REST_FAR_MS) return false;
  const istHour = new Date(nowMs + 330 * 60_000).getUTCHours();
  return istHour < LANE_FAR_EVENING_IST_HOUR && age < LANE_FAR_CATCH_UP_MS;
}

/** 5d: target refresh interval (days) for a tail exam from its hub's 7-day visitors. */
export function tailIntervalDays(visitors: number): number {
  return visitors >= 30 ? 7 : visitors >= 10 ? 14 : 42;
}

/**
 * Split the active exams into the lane (exam-week phases, ordered as
 * above, capped), the tail (the other exams, 5d order) and the resting
 * exam-week exams (refreshed too recently, option C). `lanes` maps exam id
 * → its exam-week state (from loadExamWeekExams); exams absent from the
 * map are not in exam week.
 */
export function orderRefreshQueue(
  exams: QueueExam[],
  lanes: ReadonlyMap<string, LaneState>,
  opts: OrderOptions,
): { lane: LaneExam[]; tail: QueueExam[]; resting: LaneExam[] } {
  const laneMax = opts.laneMax ?? LANE_MAX_PER_RUN;
  const allowed = opts.laneOnly ? new Set<ExamWeekPhase>(opts.laneOnly) : null;

  const laneAll: LaneExam[] = [];
  const resting: LaneExam[] = [];
  for (const e of exams) {
    const s = lanes.get(e.id);
    if (!s || !LANE_PHASES.has(s.phase)) continue;
    if (allowed && !allowed.has(s.phase)) continue;
    const entry: LaneExam = { ...e, phase: s.phase, tier: s.tier, daysTo: s.daysTo ?? null };
    if (laneResting(s, e.lastRefreshedMs, opts.nowMs)) resting.push(entry);
    else laneAll.push(entry);
  }
  laneAll.sort(
    (a, b) =>
      (LANE_RANK[a.phase] ?? 99) - (LANE_RANK[b.phase] ?? 99) ||
      TIER_RANK[a.tier ?? "expected"] - TIER_RANK[b.tier ?? "expected"] ||
      (b.candidatesPerYear ?? 0) - (a.candidatesPerYear ?? 0) ||
      a.lastRefreshedMs - b.lastRefreshedMs,
  );
  const lane = laneAll.slice(0, laneMax);
  if (allowed) return { lane, tail: [], resting };

  const laneIds = new Set(lane.map((l) => l.id));
  const restingIds = new Set(resting.map((r) => r.id));
  // Exam-week exams past the lane cap: first in the tail, most stale first.
  const overflow = laneAll.slice(laneMax).sort((a, b) => a.lastRefreshedMs - b.lastRefreshedMs);
  const overflowIds = new Set(overflow.map((o) => o.id));
  const rest = exams.filter((e) => !laneIds.has(e.id) && !restingIds.has(e.id) && !overflowIds.has(e.id));

  if (!opts.visitors) {
    // The visitor read failed: most-stale-first over everything.
    return { lane, tail: [...overflow, ...rest.sort((a, b) => a.lastRefreshedMs - b.lastRefreshedMs)], resting };
  }
  const visitors = opts.visitors;
  const seen = (e: QueueExam) => visitors.get(e.code) ?? 0;
  const age = (e: QueueExam) => opts.nowMs - e.lastRefreshedMs;
  const overdue = (e: QueueExam) => age(e) / (tailIntervalDays(seen(e)) * DAY_MS);
  const eligible = rest
    .filter((e) => age(e) >= TAIL_MIN_AGE_MS)
    .sort((a, b) => overdue(b) - overdue(a) || seen(b) - seen(a) || a.lastRefreshedMs - b.lastRefreshedMs);
  return { lane, tail: [...overflow, ...eligible], resting };
}

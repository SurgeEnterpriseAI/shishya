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
//   TAIL  the existing ordering, unchanged: TOP_N-by-candidates exams
//         that are > STALE_MS old first, then most-stale-first over
//         everything not already in the lane.
// `laneOnly` (the 20:15 IST run) returns only the lane, filtered to the
// named phases, and an empty tail.
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

/** Freshness tier (25 Aug 2026): the TOP_N biggest exams refresh at least
 *  once every STALE_MS; everything else is most-stale-first. */
export const TOP_N = 15;
export const STALE_MS = 20 * 3600_000;

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
}

export type LaneExam = QueueExam & LaneState;

export interface OrderOptions {
  nowMs: number;
  /** Restrict the lane to these phases and return no tail (the 20:15 IST run). */
  laneOnly?: ExamWeekPhase[];
  laneMax?: number;
  topN?: number;
  staleMs?: number;
}

/**
 * Split the active exams into the lane (exam-week phases, ordered as
 * above, capped) and the tail (the pre-existing ordering over the rest).
 * `lanes` maps exam id → its exam-week state (from loadExamWeekExams);
 * exams absent from the map are not in exam week.
 */
export function orderRefreshQueue(
  exams: QueueExam[],
  lanes: ReadonlyMap<string, LaneState>,
  opts: OrderOptions,
): { lane: LaneExam[]; tail: QueueExam[] } {
  const laneMax = opts.laneMax ?? LANE_MAX_PER_RUN;
  const topN = opts.topN ?? TOP_N;
  const staleMs = opts.staleMs ?? STALE_MS;
  const allowed = opts.laneOnly ? new Set<ExamWeekPhase>(opts.laneOnly) : null;

  const laneAll: LaneExam[] = [];
  for (const e of exams) {
    const s = lanes.get(e.id);
    if (!s || !LANE_PHASES.has(s.phase)) continue;
    if (allowed && !allowed.has(s.phase)) continue;
    laneAll.push({ ...e, phase: s.phase, tier: s.tier });
  }
  laneAll.sort(
    (a, b) =>
      (LANE_RANK[a.phase] ?? 99) - (LANE_RANK[b.phase] ?? 99) ||
      TIER_RANK[a.tier ?? "expected"] - TIER_RANK[b.tier ?? "expected"] ||
      (b.candidatesPerYear ?? 0) - (a.candidatesPerYear ?? 0) ||
      a.lastRefreshedMs - b.lastRefreshedMs,
  );
  const lane = laneAll.slice(0, laneMax);
  if (allowed) return { lane, tail: [] };

  const laneIds = new Set(lane.map((l) => l.id));
  // TOP_N is decided over ALL active exams (as before the lane existed),
  // so an exam's freshness tier does not depend on who else is in exam week.
  const topIds = new Set(
    [...exams]
      .sort((a, b) => (b.candidatesPerYear ?? 0) - (a.candidatesPerYear ?? 0))
      .slice(0, topN)
      .map((e) => e.id),
  );
  const tail = exams
    .filter((e) => !laneIds.has(e.id))
    .sort((a, b) => {
      const la = a.lastRefreshedMs;
      const lb = b.lastRefreshedMs;
      const pa = topIds.has(a.id) && opts.nowMs - la > staleMs ? 0 : 1;
      const pb = topIds.has(b.id) && opts.nowMs - lb > staleMs ? 0 : 1;
      return pa - pb || la - lb;
    });
  return { lane, tail };
}

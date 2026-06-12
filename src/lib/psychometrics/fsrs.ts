// FSRS-style spaced repetition for topic review scheduling.
//
// Models each (student, topic) as a memory with stability S (days until
// retrievability falls to 90%) and difficulty D (1..10). Retrievability
// decays over time; a review updates S and D and reschedules the next due
// date. This drives "what should I revise today" — the piece a weakness
// score alone can't give you, because it has no concept of forgetting.
//
// Simplified FSRS v4.5-shaped implementation with fixed default weights —
// good behaviour out of the box; the weights can be fit to Shishya's own
// review logs later (flywheel). Pure math; persistence lives in apply.ts.

export type Rating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export interface MemoryState {
  stability: number; // days
  difficulty: number; // 1..10
  reps: number;
  lapses: number;
  lastReview: Date | null;
  due: Date;
}

export function initialState(now: Date): MemoryState {
  return { stability: 1, difficulty: 5, reps: 0, lapses: 0, lastReview: null, due: now };
}

/** Retrievability after `elapsedDays` given stability S (power forgetting curve). */
export function retrievability(elapsedDays: number, stability: number): number {
  if (elapsedDays <= 0) return 1;
  return Math.pow(1 + elapsedDays / (9 * stability), -1);
}

const RATING_VALUE: Record<Rating, number> = { AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4 };

// Target retention when scheduling the next review.
const REQUEST_RETENTION = 0.9;
const MAX_INTERVAL_DAYS = 180;

/** Interval (days) at which retrievability decays to the target retention. */
export function nextIntervalDays(stability: number): number {
  const days = 9 * stability * (1 / REQUEST_RETENTION - 1);
  return Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(days)));
}

function nextDifficulty(d: number, rating: Rating): number {
  // GOOD keeps difficulty roughly stable; AGAIN raises it; EASY lowers it.
  // Mean-reverts toward 5 so difficulty doesn't get stuck at the extremes.
  const delta = -(RATING_VALUE[rating] - 3) * 0.8;
  const reverted = (d + delta) * 0.95 + 5 * 0.05;
  return clamp(reverted, 1, 10);
}

function stabilityAfterSuccess(s: number, d: number, r: number, rating: Rating): number {
  // Growth is larger when: the memory was nearly forgotten (low R), the
  // topic is easy (low D), or the answer felt easy (rating bonus).
  const hardPenalty = rating === "HARD" ? 0.6 : 1;
  const easyBonus = rating === "EASY" ? 1.4 : 1;
  const growth = Math.exp(0.9) * (11 - d) * Math.pow(s, -0.1) * (Math.exp((1 - r) * 1.3) - 1);
  return s * (1 + growth * hardPenalty * easyBonus * 0.25);
}

function stabilityAfterLapse(s: number, d: number, r: number): number {
  // Forgetting collapses stability but not all the way to zero — relearning
  // is faster than first learning.
  const next = 0.6 * Math.pow(s, 0.3) * Math.exp((1 - r) * 0.7) * ((11 - d) / 10 + 0.3);
  return clamp(next, 0.3, s); // never increases on a lapse
}

/** Apply one review at `now` with the given rating; returns the new state. */
export function review(state: MemoryState, rating: Rating, now: Date): MemoryState {
  const elapsedDays = state.lastReview
    ? Math.max(0, (now.getTime() - state.lastReview.getTime()) / 86_400_000)
    : 0;
  const r = state.lastReview ? retrievability(elapsedDays, state.stability) : 1;

  let stability: number;
  let lapses = state.lapses;
  if (rating === "AGAIN") {
    stability = state.reps === 0 ? 0.5 : stabilityAfterLapse(state.stability, state.difficulty, r);
    lapses += 1;
  } else if (state.reps === 0) {
    // First exposure: seed stability by rating.
    stability = rating === "EASY" ? 4 : rating === "GOOD" ? 2 : 1;
  } else {
    stability = stabilityAfterSuccess(state.stability, state.difficulty, r, rating);
  }

  const difficulty = nextDifficulty(state.difficulty, rating);
  const interval = rating === "AGAIN" ? 1 : nextIntervalDays(stability);
  const due = new Date(now.getTime() + interval * 86_400_000);

  return { stability, difficulty, reps: state.reps + 1, lapses, lastReview: now, due };
}

/**
 * Map a mock-attempt outcome on a topic to a review rating.
 * accuracy = correct/total on that topic within the attempt.
 */
export function ratingFromAccuracy(accuracy: number): Rating {
  if (accuracy < 0.4) return "AGAIN";
  if (accuracy < 0.65) return "HARD";
  if (accuracy < 0.9) return "GOOD";
  return "EASY";
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// Study streak — consecutive days with meaningful study activity.
//
// WHAT counts as a study day is defined ONCE in src/lib/study-day.ts
// (submitted attempt incl. live tests, tutor chat, descriptive attempt,
// TopicStudyState.completedAt — never a bare page open) and loaded through
// studyDaysFor(). This file owns only the streak MATH over those days.
// Days are reckoned in IST (UTC+5:30) — the audience is Indian students,
// and a streak that flips at 5:30 in the evening because of UTC would
// feel broken.
//
// Pure read model: computed on demand from existing tables, no new schema.

import { istDay, studyDaysFor } from "@/lib/study-day";

// Re-exported so existing consumers (dashboard, crons, tests) keep one
// import path; the definition lives with the study-day loader.
export { istDay };

const WINDOW_DAYS = 90; // streaks longer than this cap at 90 — plenty

/** Streak milestones worth celebrating / racing toward. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100] as const;

export interface StudyStreak {
  /** Consecutive active days ending today or yesterday. */
  current: number;
  /** Longest run inside the 90-day window. */
  best: number;
  /** True when the student has already studied today (IST). */
  activeToday: boolean;
  /**
   * Activity for the last 7 IST days, oldest first. Index 6 = today.
   * Drives the dot-calendar on the streak card (the visual that makes
   * streaks addictive — you can SEE the run and the gap you'd leave).
   */
  last7: boolean[];
  /** Next milestone strictly above `current`, or null past the top one. */
  nextMilestone: number | null;
  /** Days remaining to hit `nextMilestone` (0 when none). */
  toNextMilestone: number;
  /** True when TODAY's activity just landed the streak exactly on a
   *  milestone — the moment to celebrate. */
  hitMilestoneToday: boolean;
}

/** Pure streak computation over a set of active day-indexes. Exported for tests. */
export function computeStreak(activeDays: Set<number>, today: number): StudyStreak {
  const last7 = Array.from({ length: 7 }, (_, i) => activeDays.has(today - 6 + i));

  if (activeDays.size === 0) {
    return {
      current: 0, best: 0, activeToday: false, last7,
      nextMilestone: STREAK_MILESTONES[0], toNextMilestone: STREAK_MILESTONES[0],
      hitMilestoneToday: false,
    };
  }

  const activeToday = activeDays.has(today);

  // Current streak: walk backwards from today (or yesterday — studying
  // yesterday but not yet today keeps the streak alive until midnight).
  let current = 0;
  let cursor = activeToday ? today : today - 1;
  while (activeDays.has(cursor)) {
    current += 1;
    cursor -= 1;
  }

  // Best streak in the window.
  const sorted = [...activeDays].sort((a, b) => a - b);
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
    if (run > best) best = run;
  }

  const nextMilestone = STREAK_MILESTONES.find((m) => m > current) ?? null;
  return {
    current,
    best: Math.max(best, current),
    activeToday,
    last7,
    nextMilestone,
    toNextMilestone: nextMilestone ? nextMilestone - current : 0,
    hitMilestoneToday: activeToday && (STREAK_MILESTONES as readonly number[]).includes(current),
  };
}

export async function getStudyStreak(userId: string): Promise<StudyStreak> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);
  // One loader, one definition (11 Sep 2026): the old typed
  // descriptiveAttempt call here silently dropped essay days behind a
  // .catch(() => []) on a stale generated client, and coach topic
  // completions never counted at all.
  const activeDays = await studyDaysFor(userId, since);
  return computeStreak(activeDays, istDay(new Date()));
}

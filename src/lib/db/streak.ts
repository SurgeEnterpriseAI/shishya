// Study streak — consecutive days with meaningful study activity.
//
// A day counts as "active" when the student submitted a mock attempt OR
// opened a tutor chat session that day. Days are reckoned in IST (UTC+5:30)
// — the audience is Indian students, and a streak that flips at 5:30 in the
// evening because of UTC would feel broken.
//
// Pure read model: computed on demand from existing tables, no new schema.

import { prisma } from "@/lib/db/prisma";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const WINDOW_DAYS = 90; // streaks longer than this cap at 90 — plenty

export interface StudyStreak {
  /** Consecutive active days ending today or yesterday. */
  current: number;
  /** Longest run inside the 90-day window. */
  best: number;
  /** True when the student has already studied today (IST). */
  activeToday: boolean;
}

/** IST calendar-day index for a timestamp (days since epoch, IST). */
export function istDay(d: Date): number {
  return Math.floor((d.getTime() + IST_OFFSET_MS) / 86_400_000);
}

/** Pure streak computation over a set of active day-indexes. Exported for tests. */
export function computeStreak(activeDays: Set<number>, today: number): StudyStreak {
  if (activeDays.size === 0) return { current: 0, best: 0, activeToday: false };

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

  return { current, best: Math.max(best, current), activeToday };
}

export async function getStudyStreak(userId: string): Promise<StudyStreak> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);

  const [attempts, chats] = await Promise.all([
    prisma.attempt.findMany({
      where: {
        userId,
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
        finishedAt: { gte: since },
      },
      select: { finishedAt: true },
    }),
    prisma.chatSession.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);

  const activeDays = new Set<number>();
  for (const a of attempts) if (a.finishedAt) activeDays.add(istDay(a.finishedAt));
  for (const c of chats) activeDays.add(istDay(c.createdAt));

  return computeStreak(activeDays, istDay(new Date()));
}

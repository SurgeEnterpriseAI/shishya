// Phase resolution — figuring out which (if any) phase article is
// relevant for an exam based on its exam-day date and the current
// wall-clock time.
//
// Rules (ALL in IST, because every exam we cover is Indian):
//
//   CHECKLIST   T-7 through T-1 day inclusive — any time those days
//   LIVE        Exam day, 06:00 IST → 18:00 IST
//   REACTIONS   18:00 IST on exam day, through T+3 day 18:00 IST
//   (none)      Outside the above windows
//
// We treat the stored `examDate` (Prisma DateTime, typically the
// midnight-UTC of the calendar date that was seeded — e.g. for UPSC
// Prelims it's 2026-05-24T00:00:00Z) as identifying the exam's IST
// calendar day. That date in IST = the same May 24, just starting at
// 05:30 IST relative to the stored midnight-UTC.
//
// Two consumers share this:
//   1. UpcomingExamsSidebar — to render the phase chip
//   2. refresh-phase-articles cron — to know which articles to refresh
//
// Keeping the logic in one file means both can't drift out of sync.

import type { ExamPhase } from "@prisma/client";

/** IANA "Asia/Kolkata" is UTC+5:30 with no DST. */
const IST_OFFSET_HOURS = 5.5;
const IST_OFFSET_MS = IST_OFFSET_HOURS * 3600 * 1000;
const MS_PER_DAY = 86_400_000;

/**
 * Returns the IST calendar day number for a given Date. Two Dates
 * that share an IST calendar day return the same number, regardless
 * of underlying UTC representation. Difference between two values
 * gives the day delta directly.
 *
 * Implementation: shift to IST then floor at midnight.
 */
export function istDayNumber(date: Date): number {
  return Math.floor((date.getTime() + IST_OFFSET_MS) / MS_PER_DAY);
}

/** Returns the hour-of-day in IST as a float (0.000 to 23.999). */
export function istHourOfDay(date: Date): number {
  const istMs = date.getTime() + IST_OFFSET_MS;
  const dayStartMs = Math.floor(istMs / MS_PER_DAY) * MS_PER_DAY;
  return (istMs - dayStartMs) / 3600_000;
}

/**
 * Returns the relevant phase for an exam given the exam day and
 * "now", or null if no phase article should be surfaced right now.
 *
 * @param examDate The exam day, as stored in ExamImportantDate.date
 *                 (typically midnight UTC of the IST calendar day).
 * @param now      Current time. Defaulted to Date.now().
 */
export function resolvePhase(examDate: Date, now: Date = new Date()): ExamPhase | null {
  const daysFromExam = istDayNumber(examDate) - istDayNumber(now);

  // Future days
  if (daysFromExam >= 1 && daysFromExam <= 7) return "CHECKLIST";

  // Exam day — hour-of-day in IST decides LIVE vs REACTIONS
  if (daysFromExam === 0) {
    const hour = istHourOfDay(now);
    // Before 06:00 IST is technically still the morning of exam day
    // — treat as LIVE so early-bird traffic gets the live page (the
    // article will be the "checklist still applies" copy at that
    // hour but routing-wise the user should land on the same URL).
    if (hour < 18) return "LIVE";
    return "REACTIONS";
  }

  // Past days
  if (daysFromExam < 0 && daysFromExam >= -3) return "REACTIONS";

  return null;
}

/** Phase → URL slug used in /exams/[code]/<slug>. */
export const PHASE_SLUG: Record<ExamPhase, "checklist" | "live" | "reactions"> = {
  CHECKLIST: "checklist",
  LIVE: "live",
  REACTIONS: "reactions",
};

// ONE definition of a "study day" (11 Sep 2026 audit).
//
// Three surfaces used to disagree about what counts as studying:
// getStudyStreak (attempt + chat + descriptive through the typed client),
// the Daily-5 cron (attempt + chat only) and the evening-nudge cron
// (attempt + chat only). A plan-holder who completed coach tasks all week
// was told "Start your streak today" and never qualified for the evening
// rescue (needs streak ≥ 2). This module is the single source of truth:
// every consumer loads days through loadStudyDays() / studyDaysFor() and
// never re-derives them from its own queries.
//
// An IST calendar day is a study day when ANY of these happened on it:
//
//   attempt         Attempt SUBMITTED / AUTO_SUBMITTED, bucketed by
//                   finishedAt. Live-test attempts are ordinary Attempt
//                   rows on a system Mock (generatedBy = "live-test"), so
//                   this leg covers them — no separate leg needed.
//   chat            a tutor ChatSession opened (createdAt).
//   descriptive     a DescriptiveAttempt written (createdAt).
//   topic-complete  TopicStudyState.completedAt — the student pressed
//                   "Mark topic done". A bare page open only bumps readAt
//                   (POST /api/me/topic-progress action "read" on every
//                   notes view), and readAt NEVER counts.
//
// "Coach task marked done" is not stored anywhere: /api/coach/today derives
// done-ness from TopicStudyState + today's attempts, and the only row a
// coach topic task persists is TopicStudyState.completedAt. That leg IS the
// coach signal — do not add a phantom source for it. Caveat, by design:
// TopicStudyState is unique per (userId, topicId), so re-completing a topic
// MOVES its study day and "uncomplete" removes it.
//
// Raw SQL on purpose: TopicStudyState and DescriptiveAttempt are raw-SQL
// everywhere else in the repo (the generated client on dev machines
// predates them), and the old typed descriptiveAttempt call in
// getStudyStreak silently dropped essay days behind a .catch(() => []).

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

/** IST calendar-day index for a timestamp (days since epoch, IST). */
export function istDay(d: Date): number {
  return Math.floor((d.getTime() + IST_OFFSET_MS) / DAY_MS);
}

/** The UTC instant at which IST day `dayIdx` begins (IST midnight). */
export function istDayStartUtc(dayIdx: number): Date {
  return new Date(dayIdx * DAY_MS - IST_OFFSET_MS);
}

export type StudyDaySource = "attempt" | "chat" | "descriptive" | "topic-complete";

/** The complete list — anything not here does not make a day count. */
export const STUDY_DAY_SOURCES: readonly StudyDaySource[] = [
  "attempt",
  "chat",
  "descriptive",
  "topic-complete",
] as const;

export interface StudyDayRow {
  userId: string;
  /** Null rows are skipped (e.g. an attempt with no finishedAt). */
  at: Date | null;
  source?: StudyDaySource;
}

/** Pure: group raw activity rows into per-user sets of IST day indexes. */
export function bucketStudyDays(rows: readonly StudyDayRow[]): Map<string, Set<number>> {
  const out = new Map<string, Set<number>>();
  for (const r of rows) {
    if (!r.userId || !r.at) continue;
    let days = out.get(r.userId);
    if (!days) {
      days = new Set<number>();
      out.set(r.userId, days);
    }
    days.add(istDay(r.at));
  }
  return out;
}

/**
 * Load study days for a batch of users since `since`, one UNION ALL query.
 * Users with no activity simply have no entry (callers use `?? new Set()`).
 * Empty input returns an empty Map without touching the DB — Prisma.join
 * throws on an empty list.
 */
export async function loadStudyDays(userIds: readonly string[], since: Date): Promise<Map<string, Set<number>>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return new Map();
  const rows = await prisma.$queryRaw<StudyDayRow[]>`
    SELECT "userId", "finishedAt" AS at, 'attempt' AS source
      FROM "Attempt"
     WHERE "userId" IN (${Prisma.join(ids)})
       AND status IN ('SUBMITTED', 'AUTO_SUBMITTED')
       AND "finishedAt" >= ${since}
    UNION ALL
    SELECT "userId", "createdAt" AS at, 'chat' AS source
      FROM "ChatSession"
     WHERE "userId" IN (${Prisma.join(ids)})
       AND "createdAt" >= ${since}
    UNION ALL
    SELECT "userId", "createdAt" AS at, 'descriptive' AS source
      FROM "DescriptiveAttempt"
     WHERE "userId" IN (${Prisma.join(ids)})
       AND "createdAt" >= ${since}
    UNION ALL
    SELECT "userId", "completedAt" AS at, 'topic-complete' AS source
      FROM "TopicStudyState"
     WHERE "userId" IN (${Prisma.join(ids)})
       AND "completedAt" IS NOT NULL
       AND "completedAt" >= ${since}
  `;
  return bucketStudyDays(rows);
}

/** Single-user convenience over loadStudyDays. */
export async function studyDaysFor(userId: string, since: Date): Promise<Set<number>> {
  const map = await loadStudyDays([userId], since);
  return map.get(userId) ?? new Set<number>();
}

// ── Streak state — the four words every surface uses ─────────────────────

export type StreakState = "kept" | "started" | "at-risk" | "none";

/**
 * kept     — active today and the run is ≥ 2 days ("today counts")
 * started  — active today, day 1 of a run
 * at-risk  — a live run (studied through yesterday) with nothing yet today
 * none     — no live run
 *
 * Pure so the results block, StreakCard and tests share one truth table.
 */
export function streakState(s: { current: number; activeToday: boolean }): StreakState {
  if (s.activeToday) return s.current >= 2 ? "kept" : "started";
  return s.current > 0 ? "at-risk" : "none";
}

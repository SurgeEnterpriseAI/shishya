// Annual recognition leaderboard helpers.
//
// The framework activates each year on November 1 IST: from that
// date until December 31, the /recognition page shows the running
// top-N contributors for the calendar year ending Dec 31. Outside
// that window the page shows a scaffold (no live leaderboard) so the
// recognition feels like an event, not a 365-day grind.
//
// Per the spec Phase 1.5: scaffold only — leaderboard activates
// Nov 2026. The compute path is ready; the UI just doesn't surface
// it until the activation window.

import { prisma } from "./prisma";

export const RECOGNITION_ACTIVATION = {
  /** Year the first leaderboard activates. Set so we ship dormant scaffolding. */
  FIRST_YEAR: 2026,
  /** Month (1-12) when the window opens within each year. */
  WINDOW_OPEN_MONTH: 11,
  /** Month (1-12, inclusive) when the window closes within each year. */
  WINDOW_CLOSE_MONTH: 12,
  /** How many contributors per category. */
  TOP_N: 10,
};

export type RecognitionStatus =
  | { kind: "DORMANT"; nextActivationYear: number }
  | { kind: "ACTIVE"; year: number; windowEnd: Date };

/**
 * Decide if the annual recognition window is currently open. Uses
 * IST (UTC+5:30) so an admin in any timezone gets the same answer.
 */
export function recognitionStatus(now: Date = new Date()): RecognitionStatus {
  // IST = UTC + 5:30
  const istMs = now.getTime() + (5.5 * 60 * 60 * 1000);
  const ist = new Date(istMs);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth() + 1; // 1-12
  if (
    year >= RECOGNITION_ACTIVATION.FIRST_YEAR &&
    month >= RECOGNITION_ACTIVATION.WINDOW_OPEN_MONTH &&
    month <= RECOGNITION_ACTIVATION.WINDOW_CLOSE_MONTH
  ) {
    return {
      kind: "ACTIVE",
      year,
      windowEnd: new Date(Date.UTC(year, 11, 31, 18, 30, 0)), // Dec 31 23:59 IST = Dec 31 18:30 UTC
    };
  }
  // Next activation: November 1 of the next FIRST_YEAR-or-later year.
  const next = year < RECOGNITION_ACTIVATION.FIRST_YEAR
    ? RECOGNITION_ACTIVATION.FIRST_YEAR
    : (month > RECOGNITION_ACTIVATION.WINDOW_CLOSE_MONTH ? year + 1 : year);
  return { kind: "DORMANT", nextActivationYear: next };
}

export interface LeaderboardRow {
  userId: string;
  name: string | null;
  handle: string | null;
  badgeLevel: string;
  /** Number of confirmed verifications THIS YEAR. */
  verificationCount: number;
  /** Sum of contribution score deltas from THIS YEAR's activity. */
  yearScore: number;
}

/**
 * Top-N contributors for the calendar year [yearStart, yearEnd].
 * Counts confirmed verifications + accepted suggestions + validated
 * flags. Ties broken by earliest activity in the year so old hands
 * rank above late-year sprinters.
 *
 * Available year-round; the UI gate is in /recognition. This lets
 * us cron-export the leaderboard mid-year for internal tracking
 * without exposing it publicly.
 */
export async function computeAnnualLeaderboard(year: number, limit = RECOGNITION_ACTIVATION.TOP_N): Promise<LeaderboardRow[]> {
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

  return prisma.$queryRaw<LeaderboardRow[]>`
    WITH year_acts AS (
      SELECT v."userId",
             COUNT(*) FILTER (
               WHERE v."actionType"::text = 'VERIFY'
                 AND v."resolutionStatus"::text <> 'DISMISSED'
             )::int AS verifications,
             COUNT(*) FILTER (
               WHERE v."actionType"::text = 'SUGGEST_UPDATE'
                 AND v."resolutionStatus"::text = 'VALIDATED'
             )::int AS suggestions_accepted,
             COUNT(*) FILTER (
               WHERE v."actionType"::text = 'FLAG'
                 AND v."resolutionStatus"::text = 'VALIDATED'
             )::int AS flags_validated,
             MIN(v."createdAt") AS first_action
      FROM "Verification" v
      WHERE v."createdAt" >= ${yearStart}
        AND v."createdAt" <  ${yearEnd}
      GROUP BY v."userId"
    )
    SELECT
      u."id" AS "userId",
      u."name",
      u."handle",
      u."badgeLevel"::text AS "badgeLevel",
      ya.verifications AS "verificationCount",
      (ya.verifications * 1 + ya.flags_validated * 2 + ya.suggestions_accepted * 3) AS "yearScore"
    FROM year_acts ya
    JOIN "User" u ON u."id" = ya."userId"
    ORDER BY (ya.verifications * 1 + ya.flags_validated * 2 + ya.suggestions_accepted * 3) DESC,
             ya.first_action ASC
    LIMIT ${limit}
  `;
}

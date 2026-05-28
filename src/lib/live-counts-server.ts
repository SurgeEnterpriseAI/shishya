// Server-side live activity counts.
//
// REAL NUMBERS ONLY (no synthetic floor). Until 27 May 2026 these
// counters carried a +1000 fixed floor so the strip didn't read
// "3 students helped till now" on day 1. Founder call: that's
// dishonest social proof and will burn trust faster than the floor
// helps. We display what's actually true and let the metric grow.
//
// The four numbers the homepage strip + sidebar block surface are:
//   uniqueVisitors  — DISTINCT AnalyticsEvent.{userId | anonId} over
//                     PAGE_VIEW events all-time. Closest thing we have
//                     to "how many real humans have seen Shishya".
//   mocksAttempted  — total Attempt rows. The single biggest activation
//                     KPI — every signup → first mock conversion is the
//                     metric Shishya optimises for.
//   totalSignups    — total User rows. The most concrete trust number;
//                     "98 students" reads more honestly than
//                     "1,098 helped" even though the second sounds
//                     bigger.
//   signupsLast7Days — momentum signal next to totalSignups. Reads as
//                      "98 signed up · 14 this week" so visitors see
//                      it's actively growing, not a stale platform.

import { prisma } from "@/lib/db/prisma";

export interface LiveCounts {
  /** Total distinct visitors who've ever been seen via a PAGE_VIEW.
   *  Counts userId + anonId distinct values — anonymous sessions are
   *  cookie-tracked for 30 days. */
  uniqueVisitors: number;
  /** Total PAGE_VIEW rows. "All-time pageviews" social-proof number. */
  totalPageViews: number;
  /** PAGE_VIEW rows in the last 24 h. Live "fresh traffic" signal. */
  pageViewsLast24h: number;
  /** Total mock attempts ever started (any status). */
  mocksAttempted: number;
  /** Total signed-up users. */
  totalSignups: number;
  /** Signups in the last 7 days. Momentum signal — reads as
   *  "98 signed up · 14 this week" in the UI. */
  signupsLast7Days: number;
  /** Active in last 30 min (distinct users hitting Attempt /
   *  ChatMessage / User.createdAt). Powers the small pulsing
   *  "X active right now" line in the sidebar block. */
  activeNow: number;
  /** Mocks submitted in the last 24h. Live "today's activity" number
   *  for the sidebar block. */
  mocksToday: number;
}

export async function getLiveCounts(now: Date = new Date()): Promise<LiveCounts> {
  const cutoff30m = new Date(now.getTime() - 30 * 60 * 1000);
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const cutoff7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    uniqueVisitorsRows,
    totalPageViews,
    pageViewsLast24h,
    mocksAttempted,
    totalSignups,
    signupsLast7Days,
    activeNowRows,
    mocksToday,
  ] = await Promise.all([
    // Distinct visitors all-time. COALESCE(userId, anonId) so a single
    // person who later signs in doesn't get counted as two people.
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT COALESCE("userId", "anonId"))::bigint AS count
      FROM "AnalyticsEvent"
      WHERE kind = 'PAGE_VIEW'
    `,
    // Total PAGE_VIEW rows ever. Reads as "X pageviews so far" social
    // proof — bigger number than uniqueVisitors so visually impressive.
    prisma.analyticsEvent.count({ where: { kind: "PAGE_VIEW" } }),
    // PAGE_VIEW rows in the last 24 h — live freshness signal.
    prisma.analyticsEvent.count({
      where: { kind: "PAGE_VIEW", createdAt: { gte: cutoff24h } },
    }),
    prisma.attempt.count(),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: cutoff7d } } }),
    // Distinct active users in the last 30 min — same union pattern
    // we had before, kept for the sidebar block's "live now" feel.
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT "userId")::bigint AS count FROM (
        SELECT "userId" FROM "Attempt" WHERE "updatedAt" >= ${cutoff30m}
        UNION
        SELECT cs."userId" FROM "ChatMessage" cm
          JOIN "ChatSession" cs ON cs.id = cm."sessionId"
          WHERE cm."createdAt" >= ${cutoff30m}
        UNION
        SELECT id FROM "User" WHERE "createdAt" >= ${cutoff30m}
      ) AS s
    `,
    prisma.attempt.count({
      where: {
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
        finishedAt: { gte: cutoff24h },
      },
    }),
  ]);

  return {
    uniqueVisitors: Number(uniqueVisitorsRows[0]?.count ?? 0),
    totalPageViews,
    pageViewsLast24h,
    mocksAttempted,
    totalSignups,
    signupsLast7Days,
    activeNow: Number(activeNowRows[0]?.count ?? 0),
    mocksToday,
  };
}

// Backwards-compat re-export kept so any older import path keeps
// working through one deploy cycle. Drop after a week if no callers
// reach for the old name.
export const getBlendedLiveCounts = getLiveCounts;
export type BlendedLiveCounts = LiveCounts;

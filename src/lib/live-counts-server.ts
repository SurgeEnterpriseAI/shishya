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
  /** PAGE_VIEW rows TODAY (since IST midnight). Calendar-day number, not
   *  a rolling 24 h window — resets each midnight IST. */
  pageViewsToday: number;
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
  /** Mocks submitted TODAY (since IST midnight). Calendar-day, not a
   *  rolling 24 h window. */
  mocksToday: number;
  /** Walk-ins: page views by verified BROWSERS that carry no identity —
   *  the single-page landers. They're humans too (a crawler can't be
   *  classified 'browser' AND they reached us somehow), we just don't
   *  know their seriousness yet. Countable only since the 31 Jul 2026
   *  classification cutover, so it starts small and grows honestly.
   *  Includes each future-aspirant's very first page view (identity
   *  starts on their second view) — i.e. this is "human first-touch
   *  landings", which is exactly what a walk-in is. */
  walkIns: number;
}

export async function getLiveCounts(now: Date = new Date()): Promise<LiveCounts> {
  const cutoff30m = new Date(now.getTime() - 30 * 60 * 1000);
  const cutoff7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  // Start of TODAY in IST (audience is Indian) — "today's numbers" reset
  // at IST midnight instead of sliding on a rolling 24 h window.
  const IST_MS = 5.5 * 3600_000;
  const istMidnightMs = Math.floor((now.getTime() + IST_MS) / 86_400_000) * 86_400_000;
  const dayStart = new Date(istMidnightMs - IST_MS);

  const [
    uniqueVisitorsRows,
    totalPageViewsRows,
    pageViewsTodayRows,
    mocksAttempted,
    totalSignups,
    signupsLast7Days,
    activeNowRows,
    mocksToday,
    walkInsRows,
    overlapRows,
  ] = await Promise.all([
    // Distinct HUMAN visitors all-time — crawler/human separation
    // (31 Jul 2026, founder call after July's phantom-visitor audit).
    //
    // A visitor counts only if their id was seen on 2+ page views.
    // Why this rule: JS-rendering crawlers used to mint a fresh anonId
    // per page (no cookie kept), so one sweep = hundreds of phantom
    // "visitors" — by month-end, 70% of all ids had exactly one view.
    // A cookie-less client can never reach 2 views on one id, so this
    // single rule cleans BOTH the historical rows and anything a
    // stealth crawler does in future. The ingest API additionally tags
    // events client='bot'/'browser' and never mints ids for bots.
    // Trade-off, accepted: genuine one-page bouncers are excluded —
    // we'd rather understate a public number than inflate it.
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM (
        SELECT COALESCE("userId", "anonId") AS k
        FROM "AnalyticsEvent"
        WHERE kind = 'PAGE_VIEW' AND COALESCE("userId", "anonId") IS NOT NULL
        GROUP BY 1
        HAVING COUNT(*) >= 2
      ) humans
    `,
    // Total PAGE_VIEW rows, excluding ingest-tagged bot fetches.
    // (Pre-tagging bot rows can't be identified and remain — the
    // number converges to human-only as tagged days accumulate.)
    // Raw SQL: the generated client predates the "client" column.
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "AnalyticsEvent"
      WHERE kind = 'PAGE_VIEW' AND ("client" IS NULL OR "client" <> 'bot')
    `,
    // PAGE_VIEW rows TODAY, bots excluded.
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "AnalyticsEvent"
      WHERE kind = 'PAGE_VIEW' AND "createdAt" >= ${dayStart}
        AND ("client" IS NULL OR "client" <> 'bot')
    `,
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
        finishedAt: { gte: dayStart },
      },
    }),
    // Walk-ins: browser-classified, identity-less page views = human
    // first-touch landings (see interface doc). Raw SQL — generated
    // client predates the "client" column.
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "AnalyticsEvent"
      WHERE kind = 'PAGE_VIEW' AND "client" = 'browser'
        AND "userId" IS NULL AND "anonId" IS NULL
    `,
    // Overlap correction for the combined "aspirants" number: an
    // identity first seen AFTER the classification cutover already left
    // exactly one identity-less landing event (their first page) in the
    // walk-ins count before their cookie kicked in. Subtracting these
    // keeps engaged + landings an honest people-count, not a sum that
    // double-counts every new engaged visitor.
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM (
        SELECT COALESCE("userId", "anonId") AS k
        FROM "AnalyticsEvent"
        WHERE kind = 'PAGE_VIEW' AND COALESCE("userId", "anonId") IS NOT NULL
        GROUP BY 1
        HAVING COUNT(*) >= 2 AND MIN("createdAt") >= '2026-07-30T20:00:00Z'
      ) post_cutover_engaged
    `,
  ]);

  // Combined "aspirants" (founder call, 31 Jul): engaged visitors PLUS
  // verified-browser single-page landers — they reached Shishya via a
  // govt-job search, so they're aspirants too, seriousness unknown yet.
  // Overlap-corrected so a lander who later engages counts once.
  const engaged = Number(uniqueVisitorsRows[0]?.count ?? 0);
  const landers = Number(walkInsRows[0]?.count ?? 0);
  const overlap = Number(overlapRows[0]?.count ?? 0);

  return {
    uniqueVisitors: engaged + Math.max(0, landers - overlap),
    totalPageViews: Number(totalPageViewsRows[0]?.count ?? 0),
    pageViewsToday: Number(pageViewsTodayRows[0]?.count ?? 0),
    mocksAttempted,
    totalSignups,
    signupsLast7Days,
    activeNow: Number(activeNowRows[0]?.count ?? 0),
    mocksToday,
    walkIns: Number(walkInsRows[0]?.count ?? 0),
  };
}

// Backwards-compat re-export kept so any older import path keeps
// working through one deploy cycle. Drop after a week if no callers
// reach for the old name.
export const getBlendedLiveCounts = getLiveCounts;
export type BlendedLiveCounts = LiveCounts;

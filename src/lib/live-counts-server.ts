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
    // Distinct HUMAN visitors all-time — definitions audited 16 Aug 2026
    // after the founder caught a 17-day undercount (~80-130 real
    // humans/day invisible). Three provable-human classes:
    //   (a) engaged — id seen on 2+ page views (cookie came back; a
    //       cookie-less crawler can never reach 2 views on one id);
    //   (b) referred bouncers WITH id — single-view ids whose view
    //       carries a real external referrer (post-16-Aug ingest stamps
    //       the id on referred first-hits; crawlers don't send
    //       Referer, so these are humans who bounced);
    //   (c) gap-era referred landers — identity-less browser PVs with a
    //       referrer (31 Jul → 16 Aug, when first-hits carried no id).
    // Overlap: engaged visitors whose identity began in the gap era
    // left exactly one identity-less landing each — subtracted below.
    // Pre-cutover crawler-minted ids (1 view, no referrer) stay out of
    // every class. We'd still rather understate than inflate.
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM (
        SELECT COALESCE("userId", "anonId") AS k
        FROM "AnalyticsEvent"
        WHERE kind = 'PAGE_VIEW' AND COALESCE("userId", "anonId") IS NOT NULL
        GROUP BY 1
        HAVING COUNT(*) >= 2
           OR (bool_or("refHost" IS NOT NULL) AND COUNT(*) = 1)
      ) humans
    `,
    // Total PAGE_VIEW rows: ingest-tagged bot fetches excluded, and the
    // pre-tagging crawler era cleaned by excluding views from phantom
    // ids (single view, no referrer, minted before the 30 Jul cutover —
    // the server minted ids for every fetch back then, so one crawler
    // sweep = hundreds of one-view ids).
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "AnalyticsEvent" e
      WHERE e.kind = 'PAGE_VIEW' AND (e."client" IS NULL OR e."client" <> 'bot')
        AND (COALESCE(e."userId", e."anonId") IS NULL
          OR COALESCE(e."userId", e."anonId") NOT IN (
          SELECT k FROM (
            SELECT COALESCE("userId", "anonId") AS k
            FROM "AnalyticsEvent"
            WHERE kind = 'PAGE_VIEW' AND "anonId" IS NOT NULL
              AND "createdAt" < '2026-07-30T20:00:00Z'
            GROUP BY 1
            HAVING COUNT(*) = 1 AND bool_or("refHost" IS NOT NULL) = FALSE
          ) phantoms
        ))
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
    // Walk-ins: ALL identity-less browser page views — founder call
    // (16 Aug 2026): "no genuine visit should miss." This includes the
    // no-referrer landings (WhatsApp-app opens, privacy browsers, typed
    // URLs) at the cost of counting any cookie-less crawler that spoofs
    // a browser UA and sends no referrer. Known crawlers stay excluded
    // (ingest-tagged bots never enter; July's phantom-id sweeps are
    // scrubbed elsewhere). Public number: complete over pristine.
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "AnalyticsEvent"
      WHERE kind = 'PAGE_VIEW' AND "client" = 'browser'
        AND "userId" IS NULL AND "anonId" IS NULL
    `,
    // Overlap correction: an identity that BEGAN in the gap era (between
    // the 30 Jul cutover and the 16 Aug referred-first-hit fix) left its
    // first landing as an identity-less event before the cookie kicked
    // in — subtract so those people aren't counted twice. Identities
    // born after the fix carry their id from the first event, so they
    // leave no orphan landing and need no correction.
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM (
        SELECT COALESCE("userId", "anonId") AS k
        FROM "AnalyticsEvent"
        WHERE kind = 'PAGE_VIEW' AND COALESCE("userId", "anonId") IS NOT NULL
        GROUP BY 1
        HAVING COUNT(*) >= 2
          AND MIN("createdAt") >= '2026-07-30T20:00:00Z'
          AND MIN("createdAt") < '2026-08-16T17:00:00Z'
      ) gap_era_engaged
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

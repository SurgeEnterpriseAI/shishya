// Server-side live activity counts.
//
// Used by /api/live-counts to feed the landing-page strip ("X students
// preparing right now / Y in a mock / Zk students helped till now")
// with REAL DB numbers + a 1,000-row synthetic floor so the strip
// doesn't show "3 students helped till now" on day 1.
//
// The +1,000 floor lets us go live with social proof that's mostly
// honest: the floor is fixed, real activity is added on top, and as
// the platform grows the floor becomes a smaller share of the
// displayed number.

import { prisma } from "@/lib/db/prisma";

export interface BlendedLiveCounts {
  /** "Students preparing on Shishya right now" — distinct active users
   *  in the last 30 min + synthetic floor. */
  online: number;
  /** Students mid-mock right now. Real IN_PROGRESS attempts + tiny floor. */
  mocksInProgress: number;
  /** Cumulative "students helped" — total signups + 1000. */
  totalEver: number;
  /** Mock submissions in the last 24h. Real number; no synthetic boost. */
  mocksToday: number;
  /** Active discussions — kept as a small synthetic for now (replace
   *  with real "threads with replies in the last hour" later). */
  activeDiscussions: number;
}

const SYNTHETIC_FLOOR_TOTAL = 1_000;
const SYNTHETIC_FLOOR_ONLINE_BASE = 1_000;
const SYNTHETIC_FLOOR_MOCKS_BASE = 3;

export async function getBlendedLiveCounts(now: Date = new Date()): Promise<BlendedLiveCounts> {
  const cutoff30m = new Date(now.getTime() - 30 * 60 * 1000);
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Run in parallel. Each query is a simple COUNT — fast on indexed columns.
  const [totalUsers, activeNowRows, mocksInProgress, mocksToday] = await Promise.all([
    prisma.user.count(),
    // Distinct users active in the last 30 min. Active = touched at least
    // one of Attempt / ChatMessage / their own signup row.
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
      where: { status: "IN_PROGRESS", updatedAt: { gte: cutoff30m } },
    }),
    prisma.attempt.count({
      where: {
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
        finishedAt: { gte: cutoff24h },
      },
    }),
  ]);

  const realActiveNow = Number(activeNowRows[0]?.count ?? 0);

  // Deterministic minute-keyed jitter so consecutive ticks feel organic
  // without spamming the DB. Same minute → same numbers (cache-friendly).
  const minute = Math.floor(now.getTime() / 60_000);
  const onlineJitter = Math.floor(pseudoRandom(minute) * 200); // 0–199
  const mocksJitter = Math.floor(pseudoRandom(minute + 7) * 5); // 0–4
  const discussionsJitter = Math.floor(pseudoRandom(minute + 41) * 25); // 0–24

  return {
    online: realActiveNow + SYNTHETIC_FLOOR_ONLINE_BASE + onlineJitter,
    mocksInProgress: mocksInProgress + SYNTHETIC_FLOOR_MOCKS_BASE + mocksJitter,
    totalEver: totalUsers + SYNTHETIC_FLOOR_TOTAL,
    mocksToday,
    activeDiscussions: 12 + discussionsJitter,
  };
}

function pseudoRandom(seed: number): number {
  let x = (seed * 9301 + 49297) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return ((x >>> 0) % 100_000) / 100_000;
}

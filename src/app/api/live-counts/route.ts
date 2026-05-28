// GET /api/live-counts — REAL activity counters for the landing-page
// strip and the discussion-sidebar block.
//
// Cached for 30 s (s-maxage). The strip polls every ~30 s, so 1,000
// concurrent visitors only cost one real DB query per 30 s.
//
// Counters surfaced (all REAL — synthetic floor removed 27 May 2026):
//   uniqueVisitors    distinct PAGE_VIEW user/anon ids all-time
//   mocksAttempted    total Attempt rows
//   totalSignups      total User rows
//   signupsLast7Days  momentum signal
//   activeNow         distinct active users in last 30 min
//   mocksToday        mocks submitted in last 24 h

import { getLiveCounts } from "@/lib/live-counts-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const counts = await getLiveCounts(new Date());
    return Response.json(counts, {
      headers: {
        "cache-control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("[live-counts] failed", err);
    // Graceful zero-fallback so the strip never breaks the home page
    // if Neon stutters. Component has stable first-paint values to
    // bridge any flash.
    return Response.json({
      uniqueVisitors: 0,
      totalPageViews: 0,
      pageViewsLast24h: 0,
      mocksAttempted: 0,
      totalSignups: 0,
      signupsLast7Days: 0,
      activeNow: 0,
      mocksToday: 0,
    });
  }
}

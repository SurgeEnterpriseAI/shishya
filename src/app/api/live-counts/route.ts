// GET /api/live-counts — DB-backed activity counters for the
// landing-page strip and the discussion-sidebar block.
//
// Cached for 30 seconds (s-maxage). The strip polls every ~30s, so
// 1,000 visitors hammering this endpoint at the same time only cost
// one real DB query per 30s. Stays well under any DB rate ceiling.

import { getBlendedLiveCounts } from "@/lib/live-counts-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const counts = await getBlendedLiveCounts(new Date());
    return Response.json(counts, {
      headers: {
        // Edge + browser cache for 30s. stale-while-revalidate lets a
        // stale response serve while a fresh one is being computed.
        "cache-control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("[live-counts] failed", err);
    // Graceful fallback so the strip never breaks the home page if the
    // DB stutters. Returns plausible numbers based on the synthetic
    // floor alone.
    return Response.json({
      online: 1_050,
      mocksInProgress: 5,
      totalEver: 1_050,
      mocksToday: 0,
      activeDiscussions: 18,
    });
  }
}

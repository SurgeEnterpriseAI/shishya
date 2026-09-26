// GET /api/live-counts — REAL activity counters for the landing-page
// strip and the discussion-sidebar block.
//
// Cached for 30 s (s-maxage) + 60 s stale-while-revalidate. The strip
// polls every ~30 s, so 1,000 concurrent visitors only cost one real DB
// round per 30 s per edge region. Inside that read the supply / all-time
// scan counts are memoised for 10 min (SUPPLY_TTL_MS in
// src/lib/live-counts-server.ts).
//
// Shape: LiveCounts — every field is defined, one honest sentence each,
// in LIVE_COUNT_DEFINITIONS (src/lib/live-counts-server.ts). 26 Sep 2026:
// grew from 9 fields (visitors, page views, mocks, sign-ups, active now)
// to 21 — AI tutor questions, questions answered, live tests, exam goals
// and the content supply (exams, practice questions, topic notes, school
// chapters, languages), each with its own cost note there. All REAL —
// synthetic floor removed 27 May 2026.

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
    // 26 Sep 2026 review: this used to answer 200 with every count at 0,
    // and the strip took those zeros as real — one Neon stutter put
    // "0 visitors · 0 mock exams taken · 0 signed up" on the home page.
    // A failure is now a 503 that no cache keeps; the strip's poll skips
    // a non-ok reply, so it keeps its last-known numbers (or its shell
    // before the first reply). Never a typed number, never a fake zero.
    return Response.json(
      { error: "unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}

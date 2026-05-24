// GET /api/cron/refresh-phase-articles — Vercel cron entry.
//
// Runs every 2 hours (per vercel.json). Finds every (examId, phase)
// pair currently in a phase window, scrapes free public sources,
// summarises via Claude, upserts the article.
//
// Auth: Bearer ${CRON_SECRET}. Vercel cron injects this header
// automatically; manual invocations need to include it explicitly.

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min — scraping + Claude can be slow
export const dynamic = "force-dynamic";

import { refreshPhaseArticles } from "@/lib/refresh-phase-articles";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ error: "CRON_SECRET not configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // Allow ?examCode=XYZ for one-off manual debugging of a single exam.
  const url = new URL(req.url);
  const examCodeOverride = url.searchParams.get("examCode") ?? undefined;

  const started = Date.now();
  const report = await refreshPhaseArticles({ examCodeOverride });
  const elapsedMs = Date.now() - started;

  return new Response(
    JSON.stringify(
      {
        ok: true,
        elapsedMs,
        ...report,
      },
      null,
      2,
    ),
    { headers: { "content-type": "application/json" } },
  );
}

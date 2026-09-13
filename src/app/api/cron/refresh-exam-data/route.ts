// GET /api/cron/refresh-exam-data — refresh of news + important dates for
// a subset of exams, 3×/day (vercel.json "15 1,7,13 * * *" = 06:45 /
// 12:45 / 18:45 IST). Goal: every exam gets refreshed at least once per
// week without blowing the daily budget, and exams in exam week are never
// left to the rotation.
//
// Strategy (src/lib/exam-refresh-run.ts):
//   - EXAM-WEEK LANE first (13 Sep 2026): every exam in eve / today-am /
//     today-pm / window / post — ≤ 6 per run, today-pm → eve, announced
//     days before expected, biggest first — so a key / question paper
//     UPSC or SSC posts on exam evening reaches the tracker, the hub
//     block, /live and the alert mail the same day, whatever the exam's
//     size (NDA / CDS sit outside the top 15).
//   - then the TOP_N-stale-first + most-stale-first tail (self-healing:
//     anything missed today is at the front of the queue tomorrow).
//   - For each exam, call src/lib/ai/exam-info.ts and replace its
//     AI-generated rows (preserving human-curated and prior official rows).
//   - A 4th run at 20:15 IST is the lane only: /api/cron/refresh-exam-data/today-pm.
//
// Auth: Bearer ${CRON_SECRET}. `?lane=today-pm` restricts a manual run to
// the exam-evening lane (same as the today-pm route).

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { runExamDataRefresh } from "@/lib/exam-refresh-run";

export async function GET(req: Request) {
  // ── auth ─────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ error: "CRON_SECRET not configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const laneOnly = new URL(req.url).searchParams.get("lane") === "today-pm" ? (["today-pm"] as const) : undefined;
  const body = await runExamDataRefresh(laneOnly ? { laneOnly: [...laneOnly] } : {});
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

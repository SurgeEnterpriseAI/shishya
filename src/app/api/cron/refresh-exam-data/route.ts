// GET /api/cron/refresh-exam-data — refresh of news + important dates for
// a subset of exams, twice a day (vercel.json "15 1,13 * * *" = 06:45 /
// 18:45 IST). Goal: exams in exam week are never left to the rotation, the
// rest are refreshed by how many people read their hub, and none of it
// spends the credit the tutor needs.
//
// 7 Oct 2026: the 12:45 IST run is gone. Over 23 Sep-7 Oct each full run
// cost about $1.65 (7-8 web-searched calls) and the three wrote the same
// kind of rows; first-seen official dates that were current and stuck:
// 06:45 12, 12:45 6, 18:45 15, 20:15 1 (scripts/tmp-fix-b2-examinfo.ts).
// Exam-week exams now rest between refreshes (src/lib/exam-refresh-lane.ts)
// and every call asks the background spend guard first
// (src/lib/ai/spend-guard.ts).
//
// Strategy (src/lib/exam-refresh-run.ts):
//   - EXAM-WEEK LANE first (13 Sep 2026): every exam in eve / today-am /
//     today-pm / window / post — ≤ 6 per run, today-pm → eve, announced
//     days before expected, biggest first — so a key / question paper
//     UPSC or SSC posts on exam evening reaches the tracker, the hub
//     block, /live and the alert mail the same day, whatever the exam's
//     size (NDA / CDS sit outside the top 15).
//   - then the tail: the most overdue exam by its hub's visitors (7, 14 or
//     42 days), 3 a run (self-healing: anything missed is still overdue
//     next run).
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
import { createSpendGuard } from "@/lib/ai/spend-guard";

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
  const guard = createSpendGuard();
  const body = await runExamDataRefresh(laneOnly ? { laneOnly: [...laneOnly], guard } : { guard });
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

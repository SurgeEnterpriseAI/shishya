// GET /api/cron/indexnow-examweek — daily IndexNow submission of the
// exam-week URL set (Exam Week Mode, 6 Sep 2026).
//
// Why a separate path: Vercel cron paths carrying a query string
// ("/api/cron/indexnow?scope=examweek") are undocumented, so the daily
// schedule (vercel.json "45 2 * * *") points here instead. The behaviour is
// exactly the ?scope=examweek branch of /api/cron/indexnow — same auth,
// same helper (src/lib/indexnow-examweek.ts) — and that query-string
// branch stays available for manual runs.
// Auth: Bearer ${CRON_SECRET}.

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

import { submitExamWeekIndexNow } from "@/lib/indexnow-examweek";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const report = await submitExamWeekIndexNow();
  return Response.json(report, { status: report.ok ? 200 : 500 });
}

// 4 AM IST nightly cron — the AI coach's night shift. For every active
// plan-holder (activity in the last 7 days), Claude reads their persona
// and writes today's plan + morning note into CoachDay before they wake
// up. Failures are silent per-user: the deterministic engine covers
// anyone the night shift missed.
// Auth: Bearer ${CRON_SECRET}. Schedule: 30 22 * * * (4:00 AM IST).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { activePlanUserIds, generateCoachDay } from "@/lib/coach-plan";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const userIds = await activePlanUserIds();
  let planned = 0;
  let failed = 0;
  let skipped = 0;
  const started = Date.now();
  for (const uid of userIds) {
    // Leave 30s headroom so a long tail never hits the function limit.
    if (Date.now() - started > (maxDuration - 30) * 1000) break;
    const r = await generateCoachDay(uid);
    if (r === "planned") planned++;
    else if (r === "failed") failed++;
    else skipped++;
  }
  return Response.json({ ok: true, total: userIds.length, planned, failed, skipped });
}

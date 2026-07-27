// Saturday cron — create next Sunday's All-India Live Tests.
// Auth: Bearer ${CRON_SECRET}. Schedule: 0 16 * * 6 (9:30 PM IST Sat).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { createWeeklyLiveTests } from "@/lib/live-test";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const results = await createWeeklyLiveTests();
  return Response.json({ ok: true, results });
}

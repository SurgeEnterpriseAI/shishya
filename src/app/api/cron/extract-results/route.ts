// Daily cron — structure freshly-published result announcements from
// the news stream into ExamResult rows (feeds the calendar Results tab
// and /results hub). Runs after the morning news refresh.
// Auth: Bearer ${CRON_SECRET}. Schedule: 15 2 * * * (7:45 AM IST).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { extractResults } from "@/lib/results-extract";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const out = await extractResults({ days: 3, cap: 20 });
  return Response.json({ ok: true, ...out });
}

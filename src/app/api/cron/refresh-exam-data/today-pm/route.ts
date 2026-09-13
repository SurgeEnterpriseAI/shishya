// GET /api/cron/refresh-exam-data/today-pm — the 20:15 IST run
// (vercel.json "45 14 * * *"): exam-evening lane ONLY.
//
// UPSC, SSC and the state PSCs post answer keys / question papers on the
// evening of the paper; the 18:45 IST general run (which already sees
// today-pm exams first) is often too early for them, and the next general
// run is 06:45 IST the following day. This run refreshes only exams whose
// exam day is today and is past 18:00 IST (phase today-pm, ≤ 6 exams) —
// no staleness tail, so it is cheap and short.
//
// Separate path rather than "?lane=today-pm" on the main route: Vercel
// cron paths carrying a query string are undocumented (see
// /api/cron/indexnow-examweek). The main route still accepts ?lane= for
// manual runs. Auth: Bearer ${CRON_SECRET}.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { runExamDataRefresh } from "@/lib/exam-refresh-run";

export async function GET(req: Request) {
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

  const body = await runExamDataRefresh({ laneOnly: ["today-pm"] });
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

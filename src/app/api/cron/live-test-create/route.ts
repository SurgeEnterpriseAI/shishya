// Daily cron — create next Sunday's All-India Live Tests (idempotent: a
// paper exists once per (exam, Sunday)), plus — Exam Week Mode wave 2 —
// one rehearsal paper per exam whose announced exam day is 3–7 days out
// (once per exam day; see createRehearsalLiveTests in src/lib/live-test.ts).
// Auth: Bearer ${CRON_SECRET}. Schedule (vercel.json): 0 1 * * * (6:30 AM IST).

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
  const rehearsals = results.filter((r) => r.rehearsal);
  return Response.json({
    ok: true,
    results,
    rehearsals: { total: rehearsals.length, created: rehearsals.filter((r) => r.created).length },
  });
}

// POST /api/coach/rebuild — on-demand AI plan rebuild for the signed-in
// student. Fired by CoachRebuildPing when the rendered plan was the
// deterministic fallback (night-brain skipped them: lapsed 7+ days, or
// a cron miss). Runs the same generateCoachDay the 4 AM cron uses, so
// a comeback student's plan upgrades from skeleton to personally
// re-triaged within their first minutes back — not the next morning.
//
// Cost guard: fires at most once per (user, day) in practice — the
// client pings only when no CoachDay row exists for today, and the
// @@unique(userId, date) key makes races harmless.

import { auth } from "@/lib/auth";
import { generateCoachDay } from "@/lib/coach-plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ ok: false }, { status: 401 });
  try {
    const result = await generateCoachDay(userId);
    return Response.json({ ok: true, result });
  } catch {
    return Response.json({ ok: false, result: "failed" }, { status: 500 });
  }
}

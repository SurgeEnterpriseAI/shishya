// GET /api/cron/demand-mine — daily demand mining (1 Sep 2026).
//
// Classifies yesterday's free-form user text into demand clusters via
// one Claude call (src/lib/demand-mine.ts) → /admin/demand heatmap.
// Sundays also run the consolidation pass (merge near-duplicate
// clusters + write the founder's "build next" digest).
//
// Scheduled 20:00 UTC (1:30 AM IST) with a 26h lookback window — the
// (source, sourceId) unique key makes overlap harmless.
//
// 7 Oct 2026: can-wait work for the background spend guard
// (src/lib/ai/spend-guard.ts, "demand-mine"): asked before every call; a
// held night mines nothing (re-run with ?hours= to cover it), and an empty
// balance stops the run at its first failed call.

import { prisma } from "@/lib/db/prisma";
import { consolidateDemand, mineDemand, type MineGate } from "@/lib/demand-mine";
import { createSpendGuard } from "@/lib/ai/spend-guard";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const hours = Math.min(24 * 14, Math.max(1, Number(url.searchParams.get("hours") ?? 26)));
  const until = new Date();
  const since = new Date(until.getTime() - hours * 3600_000);

  const guard = createSpendGuard();
  const gate: MineGate = {
    allow: async () => (await guard.allow("demand-mine")).allow,
    failed: (err) => guard.noteFailure("demand-mine", err),
  };
  const mined = await mineDemand(prisma, since, until, gate);

  // Consolidate on Sundays (UTC) or on demand via ?consolidate=1.
  let consolidated: { merges: number; digest: string | null } | null = null;
  if (until.getUTCDay() === 0 || url.searchParams.get("consolidate") === "1") {
    consolidated = await consolidateDemand(prisma, gate);
  }

  return Response.json({ ok: true, windowHours: hours, ...mined, consolidated, spendGuard: guard.summary() });
}

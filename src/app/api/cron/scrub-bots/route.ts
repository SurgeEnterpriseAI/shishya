// GET /api/cron/scrub-bots — hourly high-confidence botnet scrub.
//
// The stealth crawler floods the walk-in bucket overnight; the portal
// counter used to show the inflated number until the manual scrub ran.
// Running the scrub hourly keeps the public counters never more than an
// hour stale, so the botnet inflation is never visible (founder call,
// 21 Aug 2026). Removes only unmistakable botnets (≥15 IPs on one UA, no
// referrer, 1 view/IP) and restores everything ambiguous to human.
//
// Auth: Bearer ${CRON_SECRET}. Idempotent + self-correcting.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { prisma } from "@/lib/db/prisma";
import { runBotScrub } from "@/lib/bot-scrub";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const r = await runBotScrub(prisma);
    return Response.json({ ok: true, ...r });
  } catch (e) {
    console.error("[scrub-bots] failed", e);
    return Response.json({ ok: false, error: String((e as Error)?.message ?? e).slice(0, 200) }, { status: 500 });
  }
}

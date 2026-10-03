// GET /api/cron/daily-current-affairs — generate today's exam-relevant
// current-affairs digest (Claude + web_search) and store it under
// today's IST date. Runs each morning (see vercel.json). Auth: Bearer
// ${CRON_SECRET}.
//
// Idempotent: the (date, title) unique + ON CONFLICT upsert means a
// re-run the same day refreshes items rather than duplicating them.
//
// 3 Oct 2026 (fix C15): same-day catch-up. vercel.json runs this at 06:30,
// 14:30 and 20:30 IST ("0 1,9,15 * * *"); a failed morning run was never
// repeated (12 of the last 30 days have no page). Before any model call the
// route checks today's IST date:
//   - today already has rows                         → 200 skipped "already-written"
//   - a current-affairs ledger row (AiUsage) for today → 200 skipped "paid-run-stored-nothing"
//     (a paid run that stored nothing — 12, 17, 27 Sep — is not paid for again that day)
//   - either count fails                             → 500, no model call (the next slot tries again)
// Only today: a past missing day stays missing (a digest written later and
// filed under an earlier date would carry the wrong day's news). Most a day
// can cost: one paid call. An empty AI balance ("credit") answers 200
// { ok: false, stopped: "credit" }; any other failure keeps the 500.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { generateDailyCurrentAffairs } from "@/lib/current-affairs";
import { prisma } from "@/lib/db/prisma";
import { classifyTutorFailure } from "@/lib/ai/tutor-failure";

function istDateStr(now = new Date()): string {
  // IST = UTC+5:30; format the IST calendar date as YYYY-MM-DD.
  const ist = new Date(now.getTime() + 5.5 * 3600_000);
  return ist.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const istDate = istDateStr();

  // Is today already done? Read before any model call; a failed read makes no call.
  try {
    const [{ n: written }] = await prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM "CurrentAffair" WHERE date = ${istDate}::date`;
    if (Number(written) > 0) {
      return Response.json({ ok: true, date: istDate, skipped: "already-written" });
    }
    const paid = await prisma.aiUsage.count({ where: { feature: "current-affairs", ref: istDate } });
    if (paid > 0) {
      return Response.json({ ok: true, date: istDate, skipped: "paid-run-stored-nothing" });
    }
  } catch (err) {
    console.error("[daily-current-affairs] today's check failed; no model call", (err as Error)?.message);
    return Response.json({ ok: false, date: istDate, error: "today's check failed" }, { status: 500 });
  }

  try {
    const { items, inputTokens, outputTokens } = await generateDailyCurrentAffairs({ istDate });
    const estCost = (inputTokens * 3 + outputTokens * 15) / 1_000_000;
    return Response.json({
      ok: true,
      date: istDate,
      items: items.length,
      estCostUsd: Number(estCost.toFixed(3)),
    });
  } catch (err) {
    if (classifyTutorFailure(err) === "credit") {
      // The AI balance is empty: nothing was paid and nothing written. The next slot tries again.
      console.warn("[daily-current-affairs] stopped: AI credit", (err as Error)?.message);
      return Response.json({ ok: false, date: istDate, stopped: "credit" });
    }
    console.error("[daily-current-affairs] generation failed", (err as Error)?.message);
    return Response.json({ ok: false, date: istDate, error: (err as Error)?.message }, { status: 500 });
  }
}

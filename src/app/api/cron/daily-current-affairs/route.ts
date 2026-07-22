// GET /api/cron/daily-current-affairs — generate today's exam-relevant
// current-affairs digest (Claude + web_search) and store it under
// today's IST date. Runs each morning (see vercel.json). Auth: Bearer
// ${CRON_SECRET}.
//
// Idempotent: the (date, title) unique + ON CONFLICT upsert means a
// re-run the same day refreshes items rather than duplicating them.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { generateDailyCurrentAffairs } from "@/lib/current-affairs";

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
    console.error("[daily-current-affairs] generation failed", (err as Error)?.message);
    return Response.json({ ok: false, date: istDate, error: (err as Error)?.message }, { status: 500 });
  }
}

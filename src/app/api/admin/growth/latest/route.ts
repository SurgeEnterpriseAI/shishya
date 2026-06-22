// GET /api/admin/growth/latest — the most recent Gemini growth report
// (metrics + narrative + suggestions). This is what the Claude developer
// routine reads each week to pick up its build list. Bearer ${CRON_SECRET}.
//
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//        "https://shishya.in/api/admin/growth/latest"
//
// ?open=1 returns only still-open suggestions.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const onlyOpen = new URL(req.url).searchParams.get("open") === "1";
  const recent = await prisma.growthReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, weekStart: true, metrics: true, narrative: true, suggestions: true, model: true, createdAt: true },
  });
  if (!recent.length) {
    return Response.json({ ok: true, report: null, message: "No growth report yet — run /api/cron/growth-analysis." });
  }

  if (!onlyOpen) {
    return Response.json({ ok: true, report: recent[0] });
  }

  // open=1: return the MOST RECENT report that still has open suggestions.
  // A failed/blank run (Gemini errored → 0 suggestions) must not hide the
  // prior week's unshipped build list from the developer.
  const isOpen = (s: any) => s?.status !== "done" && s?.status !== "skipped";
  for (const r of recent) {
    const open = ((r.suggestions as any[] | null) ?? []).filter(isOpen);
    if (open.length) return Response.json({ ok: true, report: { ...r, suggestions: open } });
  }
  return Response.json({ ok: true, report: { ...recent[0], suggestions: [] }, message: "No open suggestions across recent reports." });
}

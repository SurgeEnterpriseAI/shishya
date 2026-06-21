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

  const report = await prisma.growthReport.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true, weekStart: true, metrics: true, narrative: true, suggestions: true, model: true, createdAt: true },
  });
  if (!report) return Response.json({ ok: true, report: null, message: "No growth report yet — run /api/cron/growth-analysis." });

  let suggestions = (report.suggestions as any[] | null) ?? [];
  if (new URL(req.url).searchParams.get("open") === "1") {
    suggestions = suggestions.filter((s) => s?.status !== "done" && s?.status !== "skipped");
  }

  return Response.json({ ok: true, report: { ...report, suggestions } });
}

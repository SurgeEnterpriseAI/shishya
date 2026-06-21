// GET /api/cron/growth-analysis — weekly Gemini growth analyst.
//
// 1. Compute the week's growth-metrics snapshot.
// 2. Feed it (+ last week's suggestions and their status) to Gemini, which
//    returns a prose read + a prioritized build list for Claude.
// 3. Persist a GrowthReport row.
// 4. Email the founder the digest.
//
// Runs weekly via Vercel cron. Also triggerable on demand with the same
// Bearer ${CRON_SECRET} (handy to test once GEMINI_API_KEY is set).

import { prisma } from "@/lib/db/prisma";
import { computeGrowthMetrics } from "@/lib/growth/metrics";
import { analyzeGrowth, type GrowthSuggestion } from "@/lib/growth/gemini";
import { sendGrowthReportEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${expected}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const metrics = await computeGrowthMetrics(now);

  // Last week's suggestions, so Gemini can review what shipped.
  const prev = await prisma.growthReport.findFirst({
    orderBy: { createdAt: "desc" },
    select: { suggestions: true },
  });
  const priorSuggestions = (prev?.suggestions as unknown as GrowthSuggestion[] | null) ?? null;

  const analysis = await analyzeGrowth(metrics, priorSuggestions);

  const weekStart = new Date(now.getTime() - 7 * 86_400_000);
  const report = await prisma.growthReport.create({
    data: {
      weekStart,
      metrics: metrics as unknown as object,
      narrative: analysis?.narrative ?? null,
      suggestions: (analysis?.suggestions ?? null) as unknown as object,
      model: analysis?.model ?? null,
    },
    select: { id: true },
  });

  // Email the founder.
  const to = process.env.GROWTH_REPORT_TO || "venumuvva@gmail.com";
  const tw = metrics.thisWeek;
  const metricsLine =
    `Visitors ${tw.uniqueVisitors} (${metrics.deltas.uniqueVisitors ?? "—"}% WoW) · ` +
    `Signups ${tw.signups} · Conversion ${tw.conversionPct}% · ` +
    `Aptitude ${metrics.aptitude.attempts} (${metrics.aptitude.passed} cleared) · ` +
    `Funnel: ${metrics.funnel.visitors}→engaged ${metrics.funnel.engaged}→signup ${metrics.funnel.signups}`;
  const emailed = await sendGrowthReportEmail({
    to,
    weekLabel: metrics.window.thisWeek.to,
    metricsLine,
    narrative: analysis?.narrative ?? "",
    priorReview: analysis?.priorReview ?? "",
    suggestions: (analysis?.suggestions ?? []).map((s) => ({
      title: s.title,
      category: s.category,
      effort: s.effort,
      expectedImpact: s.expectedImpact,
    })),
    analysed: Boolean(analysis),
  });

  return Response.json({
    ok: true,
    reportId: report.id,
    analysed: Boolean(analysis),
    model: analysis?.model ?? null,
    suggestionCount: analysis?.suggestions.length ?? 0,
    emailed,
    metricsLine,
  });
}

// POST /api/admin/growth/suggestion — update one suggestion's status after
// Claude ships (or skips) it, so next week Gemini can review what landed.
// Bearer ${CRON_SECRET}.
//
// Body: { reportId, suggestionId, status: "done"|"skipped", commit?, note? }

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const Body = z.object({
  reportId: z.string().min(1),
  suggestionId: z.string().min(1),
  status: z.enum(["open", "done", "skipped"]),
  commit: z.string().max(80).optional(),
  note: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = Body.parse(await req.json());
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "invalid body" }, { status: 400 });
  }

  const report = await prisma.growthReport.findUnique({
    where: { id: body.reportId },
    select: { suggestions: true },
  });
  if (!report) return Response.json({ error: "report not found" }, { status: 404 });

  const suggestions = ((report.suggestions as any[] | null) ?? []).map((s) =>
    s?.id === body.suggestionId
      ? { ...s, status: body.status, ...(body.commit ? { commit: body.commit } : {}), ...(body.note ? { note: body.note } : {}) }
      : s
  );
  const matched = suggestions.some((s) => s?.id === body.suggestionId);
  if (!matched) return Response.json({ error: "suggestion id not found in report" }, { status: 404 });

  await prisma.growthReport.update({
    where: { id: body.reportId },
    data: { suggestions: suggestions as unknown as object },
  });

  return Response.json({ ok: true, updated: body.suggestionId, status: body.status });
}

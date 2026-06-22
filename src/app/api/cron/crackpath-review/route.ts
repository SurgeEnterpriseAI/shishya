// GET /api/cron/crackpath-review — Gemini (architect) reviews every task
// Claude has marked "built", judging whether the build matches the design +
// acceptance criteria. Approves it, or kicks it back to "needs_changes" with
// specific feedback for Claude's next pass. Bearer ${CRON_SECRET}.
//
// Runs a few times a day (so reviews land between the Claude builder's
// runs) and is also triggerable on demand.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

import { prisma } from "@/lib/db/prisma";
import { reviewBuild } from "@/lib/crackpath/architect";

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${expected}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const built = await prisma.crackPathTask.findMany({
    where: { status: "built" },
    orderBy: { seq: "asc" },
    take: 10,
  });

  const reviewed: Array<{ title: string; approved: boolean }> = [];
  for (const t of built) {
    const verdict = await reviewBuild({
      title: t.title,
      spec: t.spec,
      acceptanceCriteria: ((t.acceptanceCriteria as string[] | null) ?? []),
      buildReport: t.buildReport ?? "(no build report provided)",
      commit: t.commit,
      iteration: t.iteration,
    });
    if (!verdict) continue; // Gemini unavailable this run — leave as built, retry next run

    const feedback =
      verdict.feedback +
      (verdict.requiredChanges.length ? "\n\nRequired changes:\n- " + verdict.requiredChanges.join("\n- ") : "");

    await prisma.crackPathTask.update({
      where: { id: t.id },
      data: verdict.approved
        ? { status: "approved", approved: true, reviewFeedback: verdict.feedback }
        : { status: "needs_changes", approved: false, reviewFeedback: feedback },
    });
    reviewed.push({ title: t.title, approved: verdict.approved });
  }

  return Response.json({
    ok: true,
    builtFound: built.length,
    reviewed: reviewed.length,
    approved: reviewed.filter((r) => r.approved).length,
    needsChanges: reviewed.filter((r) => !r.approved).length,
    detail: reviewed,
  });
}

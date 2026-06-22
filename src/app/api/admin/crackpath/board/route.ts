// GET /api/admin/crackpath/board — the Crack Path loop board: every task
// with its current status, build report, and Gemini's review verdict.
// Bearer ${CRON_SECRET}.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const tasks = await prisma.crackPathTask.findMany({ orderBy: { seq: "asc" } });
  const by = (s: string) => tasks.filter((t) => t.status === s).length;

  return Response.json({
    ok: true,
    summary: {
      total: tasks.length,
      designed: by("designed"),
      built: by("built"),
      needsChanges: by("needs_changes"),
      approved: by("approved"),
    },
    tasks: tasks.map((t) => ({
      seq: t.seq,
      phase: t.phase,
      title: t.title,
      effort: t.effort,
      status: t.status,
      iteration: t.iteration,
      commit: t.commit,
      acceptanceCriteria: t.acceptanceCriteria,
      reviewFeedback: t.reviewFeedback,
    })),
  });
}

// GET /api/cron/abandon-ghost-attempts
//
// Nightly cleanup. Marks IN_PROGRESS attempts as ABANDONED when they
// show no real student activity:
//   - status = IN_PROGRESS
//   - startedAt older than 12 hours ago
//   - zero answered questions
//
// Why: ghost attempts pollute the dashboard recovery banner and
// /admin/insights "in-progress" counts. They represent students who
// landed on /mocks/[id], saw the timer + question count, and bounced
// instantly. Keeping them in IN_PROGRESS forever lies about platform
// engagement and crowds the recovery UI with dead entries.
//
// Idempotent: safe to call any time. Cron runs nightly at 02:45 UTC
// (08:15 IST) so the cleanup runs before students start their day.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";

const GHOST_THRESHOLD_HOURS = 12;

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${expected}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - GHOST_THRESHOLD_HOURS * 3600_000);
  const candidates = await prisma.attempt.findMany({
    where: { status: "IN_PROGRESS", startedAt: { lt: cutoff } },
    select: { id: true, answers: true },
  });

  const ghostIds: string[] = [];
  for (const a of candidates) {
    const ans = (a.answers as any[]) ?? [];
    if (ans.length === 0 || ans.every((x) => !x?.chosen)) ghostIds.push(a.id);
  }

  if (ghostIds.length === 0) {
    return Response.json({ scanned: candidates.length, abandoned: 0 });
  }

  const res = await prisma.attempt.updateMany({
    where: { id: { in: ghostIds } },
    data: { status: "ABANDONED", finishedAt: new Date() },
  });

  return Response.json({ scanned: candidates.length, abandoned: res.count });
}

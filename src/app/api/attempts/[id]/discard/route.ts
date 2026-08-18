// POST /api/attempts/:id/discard — abandon an in-progress attempt.
//
// Used by the expired-resume interstitial (audit 18 Aug 2026) when a
// student chooses to throw away a timed-out attempt and start fresh.
// Marks the row ABANDONED so it leaves the "resume" surfaces and never
// enters scoring or rank. Owner-gated; only IN_PROGRESS rows change.

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ok, unauth } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return unauth();
  const { id } = await ctx.params;
  await prisma.$executeRaw`
    UPDATE "Attempt" SET status = 'ABANDONED', "finishedAt" = NOW(), "updatedAt" = NOW()
    WHERE id = ${id} AND "userId" = ${session.user.id} AND status = 'IN_PROGRESS'`;
  return ok({ discarded: true });
}

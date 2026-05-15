// POST /api/feedback/[id]/upvote — toggle upvote for the current user.
//
// Idempotent: a second click removes the upvote. We update the
// denormalised upvoteCount in the same transaction so the ideas board
// reads stay cheap.

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { bad, notFound, ok, serverError, unauth } from "@/lib/http";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();
    const rl = await checkRateLimit("explain", session.user.id);
    if (!rl.ok) return rateLimited(rl);

    const { id } = await params;
    const existing = await prisma.featureRequest.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return notFound("request");

    const already = await prisma.featureRequestUpvote.findUnique({
      where: { requestId_userId: { requestId: id, userId: session.user.id } },
    });

    let upvoted: boolean;
    if (already) {
      await prisma.$transaction([
        prisma.featureRequestUpvote.delete({ where: { id: already.id } }),
        prisma.featureRequest.update({
          where: { id },
          data: { upvoteCount: { decrement: 1 } },
        }),
      ]);
      upvoted = false;
    } else {
      await prisma.$transaction([
        prisma.featureRequestUpvote.create({
          data: { requestId: id, userId: session.user.id },
        }),
        prisma.featureRequest.update({
          where: { id },
          data: { upvoteCount: { increment: 1 } },
        }),
      ]);
      upvoted = true;
    }

    const fresh = await prisma.featureRequest.findUnique({
      where: { id },
      select: { upvoteCount: true },
    });
    return ok({ upvoted, upvoteCount: fresh?.upvoteCount ?? 0 });
  } catch (err: any) {
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

// POST /api/discussions/:id/messages — post a reply (auth required)
//   { content: string }
//
// Updates the parent thread's messageCount + lastActivityAt atomically so
// the home-page list bubbles fresh threads to the top without a separate
// recompute step.

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { bad, forbidden, notFound, ok, parseBody, serverError, unauth } from "@/lib/http";

const Body = z.object({
  content: z.string().min(2).max(4000),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();
    const { id } = await ctx.params;
    const body = await parseBody(req, Body);

    const thread = await prisma.discussion.findUnique({ where: { id }, select: { id: true, locked: true } });
    if (!thread) return notFound("discussion");
    if (thread.locked) return forbidden();

    const author = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });
    const authorName = author?.name ?? author?.email?.split("@")[0] ?? "Anonymous";

    // Single transaction: append the message + bump thread denormalised counters.
    const [message] = await prisma.$transaction([
      prisma.discussionMessage.create({
        data: {
          threadId: id,
          authorId: session.user.id,
          authorName,
          content: body.content.trim(),
        },
      }),
      prisma.discussion.update({
        where: { id },
        data: {
          lastActivityAt: new Date(),
          messageCount: { increment: 1 },
        },
      }),
    ]);

    return ok({
      message: {
        id: message.id,
        authorName: message.authorName,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

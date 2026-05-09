// GET /api/discussions/:id — thread + paginated messages (public read)

import { prisma } from "@/lib/db/prisma";
import { ok, notFound, serverError } from "@/lib/http";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const thread = await prisma.discussion.findUnique({
      where: { id },
      include: {
        exam: { select: { code: true, shortName: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 200, // sane upper bound; pagination later if a thread blows past this
        },
      },
    });
    if (!thread) return notFound("discussion");
    return ok({
      thread: {
        id: thread.id,
        title: thread.title,
        examCode: thread.exam?.code ?? null,
        examShort: thread.exam?.shortName ?? null,
        authorName: thread.authorName,
        pinned: thread.pinned,
        locked: thread.locked,
        createdAt: thread.createdAt.toISOString(),
        lastActivityAt: thread.lastActivityAt.toISOString(),
        messageCount: thread.messageCount,
        messages: thread.messages.map((m) => ({
          id: m.id,
          authorName: m.authorName,
          authorId: m.authorId,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        })),
      },
    });
  } catch (err) {
    return serverError(err);
  }
}

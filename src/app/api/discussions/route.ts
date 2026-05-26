// GET /api/discussions  — list of recent threads (public, paginated)
//   ?examCode=SSC_CGL   — optional, scopes to a specific exam
//   ?limit=10           — default 10, max 50
//   ?cursor=<isoDate>   — for "older threads" pagination by lastActivityAt
//
// POST /api/discussions — create a new thread (auth required)
//   { title: string, body: string, examCode?: string }

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { bad, ok, parseBody, serverError, unauth } from "@/lib/http";

// ─── GET ──────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const examCode = url.searchParams.get("examCode") ?? undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "10", 10), 50);
    const cursor = url.searchParams.get("cursor"); // ISO date

    const where: any = {};
    if (examCode) where.exam = { code: examCode };
    if (cursor) where.lastActivityAt = { lt: new Date(cursor) };

    const items = await prisma.discussion.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { lastActivityAt: "desc" }],
      take: limit,
      include: {
        exam: { select: { code: true, shortName: true } },
      },
    });

    return ok({
      items: items.map((d) => ({
        id: d.id,
        title: d.title,
        examCode: d.exam?.code ?? null,
        examShort: d.exam?.shortName ?? null,
        authorName: d.authorName,
        messageCount: d.messageCount,
        pinned: d.pinned,
        locked: d.locked,
        isSeed: d.isSeed,
        createdAt: d.createdAt.toISOString(),
        lastActivityAt: d.lastActivityAt.toISOString(),
      })),
      nextCursor: items.length === limit ? items[items.length - 1].lastActivityAt.toISOString() : null,
    });
  } catch (err) {
    return serverError(err);
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────
const CreateBody = z.object({
  title: z.string().min(8).max(140),
  body: z.string().min(10).max(4000),
  examCode: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();
    const body = await parseBody(req, CreateBody);

    let examId: string | null = null;
    if (body.examCode) {
      const exam = await prisma.exam.findUnique({ where: { code: body.examCode }, select: { id: true } });
      if (!exam) return bad(`Unknown exam ${body.examCode}`);
      examId = exam.id;
    }

    const author = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });
    const authorName = author?.name ?? author?.email?.split("@")[0] ?? "Anonymous";

    const thread = await prisma.discussion.create({
      data: {
        title: body.title.trim(),
        examId,
        authorId: session.user.id,
        authorName,
        lastActivityAt: new Date(),
        messageCount: 1,
        messages: {
          create: {
            authorId: session.user.id,
            authorName,
            content: body.body.trim(),
          },
        },
      },
      select: { id: true },
    });

    return ok({ id: thread.id });
  } catch (err: any) {
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

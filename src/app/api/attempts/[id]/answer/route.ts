// POST /api/attempts/:id/answer — record one answer during the attempt.
// We accept partial submissions so the UI can save progress as the student answers.

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { bad, notFound, ok, serverError, unauth, forbidden, parseBody } from "@/lib/http";

const Body = z.object({
  questionId: z.string(),
  chosen: z.string().nullable(),
  timeSec: z.number().min(0).max(3600),
  marked: z.boolean().optional(),
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

    const attempt = await prisma.attempt.findUnique({ where: { id } });
    if (!attempt) return notFound("attempt");
    if (attempt.userId !== session.user.id) return forbidden();
    if (attempt.status !== "IN_PROGRESS") return bad("Attempt already submitted");

    const answers = ((attempt.answers as any[]) ?? []).filter(
      (a) => a.questionId !== body.questionId
    );
    answers.push({
      questionId: body.questionId,
      chosen: body.chosen,
      timeSec: body.timeSec,
      marked: body.marked ?? false,
      // 'correct' is computed only at submit, not here — UI shouldn't know yet.
    });

    await prisma.attempt.update({
      where: { id },
      data: { answers },
    });

    return ok({ saved: true });
  } catch (err: any) {
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

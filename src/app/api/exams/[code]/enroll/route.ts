// POST /api/exams/:code/enroll — enroll the current user in an exam track

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { bad, ok, notFound, serverError, unauth, parseBody } from "@/lib/http";

const Body = z.object({
  targetDate: z.string().datetime().optional(),
  goalScore: z.number().min(0).max(100).optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ code: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();

    const { code } = await ctx.params;
    const exam = await prisma.exam.findUnique({ where: { code } });
    if (!exam) return notFound("exam");

    const body = await parseBody(req, Body);

    const enrollment = await prisma.enrollment.upsert({
      where: { userId_examId: { userId: session.user.id, examId: exam.id } },
      update: {
        active: true,
        targetDate: body.targetDate ? new Date(body.targetDate) : null,
        goalScore: body.goalScore ?? null,
      },
      create: {
        userId: session.user.id,
        examId: exam.id,
        targetDate: body.targetDate ? new Date(body.targetDate) : null,
        goalScore: body.goalScore ?? null,
      },
    });
    return ok({ enrollment });
  } catch (err: any) {
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

// POST /api/exams/:code/enroll — enroll the current user in an exam track

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { realExamKey } from "@/lib/db/exam-scope";
import { ensureEnrollment } from "@/lib/db/enrollment";
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
    const exam = await prisma.exam.findUnique({ where: realExamKey({ code }) });
    if (!exam) return notFound("exam");

    const body = await parseBody(req, Body);

    // 26 Sep 2026: one enrolment door (src/lib/db/enrollment.ts); the exam
    // above is a real one (realExamKey) — a school code was 404 already.
    const enrollment = await ensureEnrollment(session.user.id, exam, {
      active: true,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      goalScore: body.goalScore ?? null,
    });
    return ok({ enrollment });
  } catch (err: any) {
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

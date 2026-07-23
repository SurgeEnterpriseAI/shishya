// POST /api/questions/:id/report
// Body: { reason: string }
//
// Students flag a question they believe is wrong (bad answer key, broken
// translation, missing data, etc.). We persist a QuestionReport row so
// admin can sweep through under /admin and fix or remove the question.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { after } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { bad, notFound, ok, serverError, unauth, parseBody } from "@/lib/http";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { adjudicateQuestion } from "@/lib/question-sweep";

const Body = z.object({
  reason: z.string().trim().min(3).max(1000),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();
    // Keep a generous limit so a session reviewing many questions doesn't
    // hit the cap; uses the same Upstash counter as the chat limiter.
    const rl = await checkRateLimit("explain", session.user.id);
    if (!rl.ok) return rateLimited(rl);

    const { id } = await ctx.params;
    const body = await parseBody(req, Body);

    const q = await prisma.question.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!q) return notFound("question");

    const report = await prisma.questionReport.create({
      data: {
        questionId: id,
        userId: session.user.id,
        reason: body.reason,
      },
      select: { id: true, createdAt: true },
    });

    // INSTANT adjudication — re-solve the question with Claude the moment
    // it's flagged. If the student is right, the answer key is corrected
    // (or the question invalidated) within seconds, not at the weekly
    // sweep. Runs AFTER the response so the report submits instantly;
    // best-effort, so a failure just leaves it for the weekly sweep.
    after(async () => {
      try {
        await adjudicateQuestion(id, "claude:instant-report");
      } catch (err) {
        console.error("[report] instant adjudication failed", id, (err as Error)?.message);
      }
    });

    return ok({ reportId: report.id, createdAt: report.createdAt });
  } catch (err: any) {
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

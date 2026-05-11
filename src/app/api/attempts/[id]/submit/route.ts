// POST /api/attempts/:id/submit — finalise the attempt:
//   1. Score every answer (correct/marks)
//   2. Update WeaknessMap rows
//   3. Emit a MOCK_COMPLETED progress event
//
// Used to also call runDiagnostic() inline, but the result was thrown
// away (the /results page does its own queries) and the Claude round-
// trip added 10–30s of staring at "Submitting…". The diagnostic
// narrative is now generated on-demand from the results page.

// A 100-Q mock spans 10-20 topics; each WeaknessMap upsert is a
// round-trip from the US Lambda to the Asia Neon DB. Even at 30s the
// sequential loop was breaching Vercel's default 10s timeout for some
// users. We now parallelise the upserts, but keep a generous ceiling
// here so a cold Neon connection doesn't kill the submit.
export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ok, notFound, serverError, unauth, forbidden, bad } from "@/lib/http";
import { scoreAttempt } from "@/lib/scoring";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();
    const { id } = await ctx.params;

    const attempt = await prisma.attempt.findUnique({
      where: { id },
      include: { mock: { include: { exam: true } } },
    });
    if (!attempt) return notFound("attempt");
    if (attempt.userId !== session.user.id) return forbidden();
    if (attempt.status !== "IN_PROGRESS") return bad("Attempt already submitted");

    // ── Score ────────────────────────────────────────────────────────────
    const questions = await prisma.question.findMany({
      where: { id: { in: attempt.mock.questionIds } },
      include: { topic: { select: { id: true, code: true, name: true } } },
    });
    const exam = attempt.mock.exam;
    const submittedAnswers = (attempt.answers as any[]) ?? [];

    // Pure scoring computation. See src/lib/scoring.ts and tests/unit/scoring.test.ts.
    const { scored, scoreRaw, scoreMax, scorePct, topicAgg, topicScores } = scoreAttempt({
      questionIds: attempt.mock.questionIds,
      questionsById: new Map(
        questions.map((q) => [
          q.id,
          {
            id: q.id,
            answerKey: q.answerKey,
            topicId: q.topic.id,
            topicCode: q.topic.code,
            topicName: q.topic.name,
            difficulty: q.difficulty,
          },
        ])
      ),
      submittedAnswers,
      marksPerQ: exam.marksPerQ,
      negativeMark: exam.negativeMark,
    });

    const finishedAt = new Date();
    const durationSec = Math.max(
      1,
      Math.round((finishedAt.getTime() - attempt.startedAt.getTime()) / 1000)
    );

    // Fan out: the attempt update, every weakness upsert, and the progress
    // event are all independent writes. Issuing them in parallel collapses
    // ~20 round-trips into one wall-clock window (Asia DB latency stays
    // ~700ms either way, but we wait once instead of 20 times). On a 100-Q
    // mock spanning ~15 topics this drops submit from ~14s to ~1s.
    const userId = session.user.id;
    const examId = exam.id;
    const weaknessUpserts = [...topicAgg.entries()].map(([topicId, t]) =>
      prisma.weaknessMap.upsert({
        where: {
          userId_examId_topicId: { userId, examId, topicId },
        },
        update: {
          attemptsCount: { increment: t.total },
          correctCount: { increment: t.correct },
          masteryScore: t.score,
          avgTimeSec: t.total === 0 ? null : t.timeSum / t.total,
          lastSeenAt: finishedAt,
        },
        create: {
          userId,
          examId,
          topicId,
          attemptsCount: t.total,
          correctCount: t.correct,
          masteryScore: t.score,
          avgTimeSec: t.total === 0 ? null : t.timeSum / t.total,
        },
      })
    );

    await Promise.all([
      prisma.attempt.update({
        where: { id },
        data: {
          status: "SUBMITTED",
          finishedAt,
          durationSec,
          answers: scored as unknown as Prisma.InputJsonValue,
          scoreRaw,
          scoreMax,
          scorePct,
          topicScores: topicScores as unknown as Prisma.InputJsonValue,
        },
      }),
      ...weaknessUpserts,
      prisma.progressEvent.create({
        data: {
          userId,
          examId,
          type: "MOCK_COMPLETED",
          delta: scorePct,
          metadata: { mockId: attempt.mockId, attemptId: id },
        },
      }),
    ]);

    return ok({
      attemptId: id,
      scoreRaw,
      scoreMax,
      scorePct,
      topicScores,
      durationSec,
    });
  } catch (err) {
    return serverError(err);
  }
}

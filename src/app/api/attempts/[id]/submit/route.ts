// POST /api/attempts/:id/submit — finalise the attempt:
//   1. Score every answer (correct/marks)
//   2. Update WeaknessMap rows
//   3. Run AI diagnostic (background-friendly: returns immediately if NO_AI=true)
//
// Returns the scored attempt + diagnostic summary.

import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { runDiagnostic } from "@/lib/ai";
import { getSyllabusContext } from "@/lib/db/syllabus";
import { ok, notFound, serverError, unauth, forbidden, bad } from "@/lib/http";
import { scoreAttempt } from "@/lib/scoring";
import type { AttemptSnapshot } from "@/lib/ai/types";

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

    await prisma.attempt.update({
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
    });

    // ── Update WeaknessMap (rolling counts) ─────────────────────────────
    for (const [topicId, t] of topicAgg) {
      await prisma.weaknessMap.upsert({
        where: {
          userId_examId_topicId: { userId: session.user.id, examId: exam.id, topicId },
        },
        update: {
          attemptsCount: { increment: t.total },
          correctCount: { increment: t.correct },
          masteryScore: t.score,
          avgTimeSec: t.total === 0 ? null : t.timeSum / t.total,
          lastSeenAt: new Date(),
        },
        create: {
          userId: session.user.id,
          examId: exam.id,
          topicId,
          attemptsCount: t.total,
          correctCount: t.correct,
          masteryScore: t.score,
          avgTimeSec: t.total === 0 ? null : t.timeSum / t.total,
        },
      });
    }

    // Progress event
    await prisma.progressEvent.create({
      data: {
        userId: session.user.id,
        examId: exam.id,
        type: "MOCK_COMPLETED",
        delta: scorePct,
        metadata: { mockId: attempt.mockId, attemptId: id },
      },
    });

    // ── Diagnostic ──────────────────────────────────────────────────────
    let diagnostic: any = null;
    if (process.env.NO_AI !== "true") {
      try {
        const syllabus = await getSyllabusContext(exam.code);
        const snapshot: AttemptSnapshot = {
          attemptId: id,
          mockId: attempt.mockId,
          examCode: exam.code,
          startedAt: attempt.startedAt.toISOString(),
          finishedAt: finishedAt.toISOString(),
          durationSec,
          answers: scored as any,
          scoreRaw,
          scoreMax,
          scorePct,
          topicScores: topicScores as any,
        };
        diagnostic = await runDiagnostic({
          attempt: snapshot,
          syllabus,
          language: "EN", // TODO: read from user.preferredLang
        });
      } catch (err) {
        console.error("[shishya] diagnostic failed (non-fatal):", err);
      }
    }

    return ok({
      attemptId: id,
      scoreRaw,
      scoreMax,
      scorePct,
      topicScores,
      durationSec,
      diagnostic,
    });
  } catch (err) {
    return serverError(err);
  }
}

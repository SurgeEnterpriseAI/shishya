// GET /api/attempts/:id — fetch attempt details (post-submit reveals answers/solutions)

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ok, notFound, serverError, unauth, forbidden } from "@/lib/http";
import { attemptPaperIds } from "@/lib/attempt-paper";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();
    const { id } = await ctx.params;

    const attempt = await prisma.attempt.findUnique({
      where: { id },
      include: { mock: true },
    });
    if (!attempt) return notFound("attempt");
    if (attempt.userId !== session.user.id) return forbidden();

    const submitted = attempt.status === "SUBMITTED" || attempt.status === "AUTO_SUBMITTED";

    // 26 Sep 2026: the paper THIS attempt had (its graded list, or the
    // paper persisted when it started), not the mock's current ids —
    // src/lib/attempt-paper.ts.
    const paperIds = attemptPaperIds({
      questionIds: attempt.mock.questionIds,
      answers: attempt.answers,
      startedAt: attempt.startedAt,
      config: attempt.mock.config,
    });

    // Reveal Q details only after submission
    const questions = await prisma.question.findMany({
      where: { id: { in: paperIds } },
      include: { topic: { select: { code: true, name: true } } },
    });
    const byId = new Map(questions.map((q) => [q.id, q]));
    const orderedQs = paperIds.map((qid) => {
      const q = byId.get(qid);
      if (!q) return null;
      return {
        id: q.id,
        type: q.type,
        difficulty: q.difficulty,
        body: q.body,
        options: q.options,
        topic: q.topic,
        language: q.language,
        ...(submitted && { answerKey: q.answerKey, solution: q.solution }),
      };
    }).filter(Boolean);

    return ok({
      attempt: {
        id: attempt.id,
        status: attempt.status,
        startedAt: attempt.startedAt,
        finishedAt: attempt.finishedAt,
        durationSec: attempt.durationSec,
        scoreRaw: attempt.scoreRaw,
        scoreMax: attempt.scoreMax,
        scorePct: attempt.scorePct,
        topicScores: attempt.topicScores,
        answers: attempt.answers,
        mock: { id: attempt.mock.id, title: attempt.mock.title, config: attempt.mock.config },
        questions: orderedQs,
      },
    });
  } catch (err) {
    return serverError(err);
  }
}

// GET /api/mocks/:id — fetch the mock with its questions (no answers/solutions
// returned — those are revealed only after submission).

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ok, notFound, serverError, unauth, forbidden } from "@/lib/http";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();
    const { id } = await ctx.params;

    const mock = await prisma.mock.findUnique({ where: { id } });
    if (!mock) return notFound("mock");
    // System-template mocks (userId null) are public; user mocks are private.
    if (mock.userId && mock.userId !== session.user.id) return forbidden();

    const questions = await prisma.question.findMany({
      where: { id: { in: mock.questionIds } },
      include: { topic: { select: { code: true, name: true } } },
    });
    // Preserve mock's question order
    const byId = new Map(questions.map((q) => [q.id, q]));
    const orderedQs = mock.questionIds
      .map((qid) => byId.get(qid))
      .filter((q): q is NonNullable<typeof q> => Boolean(q))
      .map((q) => ({
        id: q.id,
        type: q.type,
        difficulty: q.difficulty,
        body: q.body,
        options: q.options,
        // intentionally omitted: answerKey, solution
        topic: q.topic,
        language: q.language,
      }));

    return ok({
      mock: {
        id: mock.id,
        title: mock.title,
        config: mock.config,
        durationMin: (mock.config as any)?.durationMin ?? 30,
        questionCount: orderedQs.length,
        questions: orderedQs,
      },
    });
  } catch (err) {
    return serverError(err);
  }
}

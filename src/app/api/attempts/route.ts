// POST /api/attempts — start a new attempt on a mock

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { bad, notFound, ok, serverError, unauth, forbidden, parseBody } from "@/lib/http";

const Body = z.object({
  mockId: z.string(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();
    const body = await parseBody(req, Body);

    const mock = await prisma.mock.findUnique({
      where: { id: body.mockId },
      select: { id: true, userId: true, examId: true, generatedBy: true },
    });
    if (!mock) return notFound("mock");
    if (mock.userId && mock.userId !== session.user.id) return forbidden();

    // Live-test window guard (audit 18 Aug 2026). The shared Sunday paper
    // must not be startable BEFORE it opens (that would leak the
    // questions early). After it closes, starting is allowed as ordinary
    // practice — but the attempt won't be ranked (liveTestRank counts
    // only in-window attempts, so a late run never rewrites the board).
    if (mock.generatedBy === "live-test") {
      const lt = await prisma.$queryRaw<{ opensAt: Date; closesAt: Date }[]>`
        SELECT "opensAt", "closesAt" FROM "LiveTest" WHERE "mockId" = ${mock.id} LIMIT 1`;
      if (lt[0] && Date.now() < lt[0].opensAt.getTime()) {
        return bad("This All-India Live Test hasn't opened yet. It goes live Sunday 6 AM IST — come back then to compete for a national rank.");
      }
    }

    // Auto-enrol the student on the exam when they start any mock — covers
    // SME pre-built mocks (RRB Group D — Full Mock 1, etc.) which are
    // launched directly via this endpoint, not through /api/mocks. Without
    // this, the user never gets a WeaknessMap, never sees recommendations,
    // and never receives the daily brief. We saw the gap when Sachin
    // started 3 mocks without ever enrolling.
    await prisma.enrollment.upsert({
      where: { userId_examId: { userId: session.user.id, examId: mock.examId } },
      update: {},
      create: { userId: session.user.id, examId: mock.examId },
    });

    const attempt = await prisma.attempt.create({
      data: {
        mockId: mock.id,
        userId: session.user.id,
        status: "IN_PROGRESS",
        answers: [],
      },
    });

    return ok({ attempt: { id: attempt.id, startedAt: attempt.startedAt } });
  } catch (err: any) {
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

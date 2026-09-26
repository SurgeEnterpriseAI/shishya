// POST /api/attempts — start a new attempt on a mock

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ensureEnrollment } from "@/lib/db/enrollment";
import { bad, notFound, ok, serverError, unauth, forbidden, parseBody } from "@/lib/http";
import { canServePaper, paperSkeleton, servedPaperIds } from "@/lib/served-paper";

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
      select: {
        id: true,
        userId: true,
        examId: true,
        generatedBy: true,
        questionIds: true,
        exam: { select: { category: true } },
      },
    });
    if (!mock) return notFound("mock");
    if (mock.userId && mock.userId !== session.user.id) return forbidden();

    // 26 Sep 2026: the same rule as /mocks/[id] (src/lib/served-paper.ts) —
    // the attempt starts with the paper the mock can serve (validated, not
    // withdrawn) persisted on it, and a paper too short to start is refused.
    const qs = await prisma.question.findMany({
      where: { id: { in: mock.questionIds } },
      select: { id: true, validated: true, tags: true },
    });
    const paperIds = servedPaperIds(mock, new Map(qs.map((q) => [q.id, q])));
    if (!canServePaper(paperIds)) {
      return bad("This mock is being rebuilt — its questions are going through an answer check. Please try another mock for now.");
    }

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
    // 26 Sep 2026: through the one enrolment door (src/lib/db/enrollment.ts).
    await ensureEnrollment(session.user.id, { id: mock.examId, category: mock.exam.category });

    const attempt = await prisma.attempt.create({
      data: {
        mockId: mock.id,
        userId: session.user.id,
        status: "IN_PROGRESS",
        // The persisted paper: one skeleton row per served question, with
        // its slot (src/lib/served-paper.ts paperSkeleton).
        answers: paperSkeleton(paperIds) as unknown as Prisma.InputJsonValue,
      },
    });

    return ok({ attempt: { id: attempt.id, startedAt: attempt.startedAt } });
  } catch (err: any) {
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

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

    const mock = await prisma.mock.findUnique({ where: { id: body.mockId } });
    if (!mock) return notFound("mock");
    if (mock.userId && mock.userId !== session.user.id) return forbidden();

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

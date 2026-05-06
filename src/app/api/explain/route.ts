// POST /api/explain — generate a step-by-step explanation for a question.
// Body: { questionId, studentChosen?, detailLevel? }

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { explainSolution } from "@/lib/ai";
import { bad, notFound, ok, serverError, unauth, parseBody } from "@/lib/http";

const Body = z.object({
  questionId: z.string(),
  studentChosen: z.string().nullable().optional(),
  detailLevel: z.enum(["BRIEF", "STANDARD", "DEEP"]).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();
    const body = await parseBody(req, Body);

    const q = await prisma.question.findUnique({ where: { id: body.questionId } });
    if (!q) return notFound("question");

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const language = (user?.preferredLang ?? "EN") as any;

    const explanation = await explainSolution({
      question: {
        id: q.id,
        topicId: q.topicId,
        topicCode: "", // not used by explainer
        difficulty: q.difficulty,
        body: q.body,
        options: q.options as any,
        answerKey: q.answerKey,
        solution: q.solution,
        language: q.language as any,
      },
      studentChosen: body.studentChosen ?? null,
      language,
      detailLevel: body.detailLevel ?? "STANDARD",
    });

    return ok({ explanation });
  } catch (err: any) {
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

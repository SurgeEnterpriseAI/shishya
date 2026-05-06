// PATCH  /api/admin/questions/:id — edit + validate or reject a question
// DELETE /api/admin/questions/:id — hard delete (use sparingly; prefer rejection-via-flag)

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/admin";
import { bad, forbidden, notFound, ok, parseBody, serverError } from "@/lib/http";

const Patch = z.object({
  body: z.string().optional(),
  options: z
    .array(z.object({ key: z.string(), text: z.string() }))
    .min(2)
    .optional(),
  answerKey: z.string().optional(),
  solution: z.string().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  topicCode: z.string().optional(),
  tags: z.array(z.string()).optional(),
  // Validation flow:
  //   - { validated: true }  → marks AI_GENERATED → AI_VALIDATED, stamps validatedBy/At
  //   - { validated: false } → un-validates (e.g., found a bug post-publish)
  //   - { reject: true }     → soft-reject: validated stays false; tag "rejected"
  validated: z.boolean().optional(),
  reject: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = await parseBody(req, Patch);

    const existing = await prisma.question.findUnique({
      where: { id },
      include: { topic: true },
    });
    if (!existing) return notFound("question");

    const data: any = {};
    if (body.body != null) data.body = body.body;
    if (body.options != null) data.options = body.options;
    if (body.answerKey != null) data.answerKey = body.answerKey;
    if (body.solution != null) data.solution = body.solution;
    if (body.difficulty != null) data.difficulty = body.difficulty;
    if (body.tags != null) data.tags = body.tags;

    // Move to a different topic (within the same exam)
    if (body.topicCode && body.topicCode !== existing.topic.code) {
      const newTopic = await prisma.topic.findFirst({
        where: {
          code: body.topicCode,
          subject: { examId: existing.examId },
        },
      });
      if (!newTopic) return bad(`Topic ${body.topicCode} not found in this exam`);
      data.topicId = newTopic.id;
    }

    if (body.reject) {
      data.validated = false;
      data.tags = [...(body.tags ?? existing.tags ?? []), "rejected"];
      data.metadata = { ...(existing.metadata as any), rejectedBy: admin.email, rejectedAt: new Date().toISOString() };
    } else if (body.validated === true) {
      data.validated = true;
      data.validatedBy = admin.email;
      data.validatedAt = new Date();
      // Promote source: AI_GENERATED → AI_VALIDATED
      if (existing.source === "AI_GENERATED") data.source = "AI_VALIDATED";
    } else if (body.validated === false) {
      data.validated = false;
    }

    const updated = await prisma.question.update({ where: { id }, data });
    return ok({ question: updated });
  } catch (err: any) {
    if (err?.status === 403) return forbidden();
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    await prisma.question.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (err: any) {
    if (err?.status === 403) return forbidden();
    return serverError(err);
  }
}

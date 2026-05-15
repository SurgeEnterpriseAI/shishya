// POST /api/attempts/:id/answer — record one answer during the attempt.
// We accept partial submissions so the UI can save progress as the student answers.

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { bad, ok, serverError, unauth, parseBody } from "@/lib/http";

const Body = z.object({
  questionId: z.string(),
  chosen: z.string().nullable(),
  timeSec: z.number().min(0).max(3600),
  marked: z.boolean().optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();
    const { id } = await ctx.params;
    const body = await parseBody(req, Body);

    // Single round-trip: drop any prior answer for this questionId,
    // append the new one, and atomically update — all in one UPDATE.
    // Previously we did findUnique → mutate JSON in JS → update, which
    // cost ~2× Asia-DB latency (1.6s+). With 100 saves per long mock
    // that was a major contributor to mock-taking sluggishness.
    //
    // Authorisation: the WHERE clause includes userId + status check, so
    // the row only updates for the legitimate owner of an in-progress
    // attempt. If 0 rows match (wrong user, already submitted, or no
    // such attempt) updateCount === 0 and we surface that as a 400.
    const newAnswer = {
      questionId: body.questionId,
      chosen: body.chosen,
      timeSec: body.timeSec,
      marked: body.marked ?? false,
      // 'correct' is computed only at submit, not here.
    };
    const newAnswerJson = JSON.stringify([newAnswer]);

    const updated = await prisma.$executeRaw(Prisma.sql`
      UPDATE "Attempt"
      SET "answers" = COALESCE(
        (
          SELECT jsonb_agg(elem)
            FROM jsonb_array_elements(COALESCE("answers", '[]'::jsonb)) elem
           WHERE elem->>'questionId' != ${body.questionId}
        ),
        '[]'::jsonb
      ) || ${newAnswerJson}::jsonb,
          "updatedAt" = NOW()
      WHERE "id" = ${id}
        AND "userId" = ${session.user.id}
        AND "status" = 'IN_PROGRESS'
    `);

    if (updated === 0) {
      return bad("attempt not found, not yours, or already submitted");
    }
    return ok({ saved: true });
  } catch (err: any) {
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

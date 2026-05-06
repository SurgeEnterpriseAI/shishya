// POST /api/admin/questions/bulk-validate
//
// Validates multiple questions in one shot, scoped by the same filters used
// on /admin/questions. Used after spot-checking a topic — flips the rest to
// validated without 50 individual clicks.
//
// Hard caps:
//   - Caller must explicitly opt in by sending `confirmCount` matching the
//     server's count for the same filter. Prevents the accidental "validate
//     everything" footgun.
//   - Only operates on questions that are NOT already validated. Already-
//     validated questions are untouched.
//
// Body:
//   {
//     filter: { examCode?, topicCode?, source?, q? },
//     confirmCount: number,    // must match server's count for this filter
//   }

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/admin";
import { bad, forbidden, ok, parseBody, serverError } from "@/lib/http";

const Body = z.object({
  filter: z.object({
    examCode: z.string().optional(),
    topicCode: z.string().optional(),
    source: z.enum(["AI_GENERATED", "AI_VALIDATED", "SME", "PYQ", "COMMUNITY"]).optional(),
    q: z.string().optional(),
  }),
  confirmCount: z.number().int().nonnegative(),
});

const HARD_CAP = 1000;

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await parseBody(req, Body);

    const where: Prisma.QuestionWhereInput = { validated: false };
    if (body.filter.examCode) where.exam = { code: body.filter.examCode };
    if (body.filter.topicCode) where.topic = { code: body.filter.topicCode };
    if (body.filter.source) where.source = body.filter.source;
    if (body.filter.q) where.body = { contains: body.filter.q, mode: "insensitive" };

    const serverCount = await prisma.question.count({ where });

    if (serverCount === 0) {
      return ok({ validated: 0, message: "No unvalidated questions match the filter." });
    }

    if (serverCount > HARD_CAP) {
      return bad(
        `Filter matches ${serverCount} questions. Cap is ${HARD_CAP}. Narrow your filter (e.g. by topic) first.`
      );
    }

    if (body.confirmCount !== serverCount) {
      return bad(
        `confirmCount (${body.confirmCount}) does not match server count (${serverCount}). The list may have changed; re-fetch and try again.`
      );
    }

    // Two-step update so we only flip source on AI_GENERATED rows. SME-authored
    // questions keep their source; their `validated` flag is what matters.
    const [aiPromoted, others] = await prisma.$transaction([
      prisma.question.updateMany({
        where: { ...where, source: "AI_GENERATED" },
        data: {
          validated: true,
          validatedBy: admin.email,
          validatedAt: new Date(),
          source: "AI_VALIDATED",
        },
      }),
      prisma.question.updateMany({
        where: { ...where, source: { not: "AI_GENERATED" } },
        data: {
          validated: true,
          validatedBy: admin.email,
          validatedAt: new Date(),
        },
      }),
    ]);

    const total = aiPromoted.count + others.count;
    return ok({
      validated: total,
      aiPromoted: aiPromoted.count,
      otherValidated: others.count,
      message: `Marked ${total} questions as validated (${aiPromoted.count} AI promoted to AI_VALIDATED).`,
    });
  } catch (err: any) {
    if (err?.status === 403) return forbidden();
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

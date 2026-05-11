// POST /api/admin/questions/bulk-validate
//
// Validates multiple questions in one shot, scoped by the same filters used
// on /admin/questions. Used after spot-checking a topic — flips the rest to
// validated without 50 individual clicks.
//
// Guard rails:
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

// Allow validating large bulks (e.g. the ~13k AI-generated UPSSSC PET
// comprehension passages). The hard ceiling stays in place purely as a
// runaway-query guard.
const HARD_CAP = 50_000;

// Server-side batch size for the updateMany loop. Keeps each statement
// well below pgbouncer's transaction window even when running ~13k+ rows.
const BATCH_SIZE = 1_000;

export const runtime = "nodejs";
export const maxDuration = 60;

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

    // Batched, two-step update. We do the AI-promotion pass first (which
    // also flips source → AI_VALIDATED) and then mop up any remaining
    // non-AI sources. updateMany with `take` isn't supported in Prisma,
    // so each batch selects ids first, then updates by id list. Loop
    // exits when nothing matches the unvalidated filter anymore.
    let aiPromoted = 0;
    let otherValidated = 0;
    const validatedAt = new Date();

    // ─ Pass 1: AI_GENERATED → AI_VALIDATED
    while (true) {
      const batch = await prisma.question.findMany({
        where: { ...where, source: "AI_GENERATED" },
        select: { id: true },
        take: BATCH_SIZE,
      });
      if (batch.length === 0) break;
      const ids = batch.map((b) => b.id);
      const res = await prisma.question.updateMany({
        where: { id: { in: ids } },
        data: {
          validated: true,
          validatedBy: admin.email,
          validatedAt,
          source: "AI_VALIDATED",
        },
      });
      aiPromoted += res.count;
      if (batch.length < BATCH_SIZE) break;
    }

    // ─ Pass 2: everything else still unvalidated (SME, PYQ, COMMUNITY, …)
    while (true) {
      const batch = await prisma.question.findMany({
        where: { ...where, source: { not: "AI_GENERATED" } },
        select: { id: true },
        take: BATCH_SIZE,
      });
      if (batch.length === 0) break;
      const ids = batch.map((b) => b.id);
      const res = await prisma.question.updateMany({
        where: { id: { in: ids } },
        data: {
          validated: true,
          validatedBy: admin.email,
          validatedAt,
        },
      });
      otherValidated += res.count;
      if (batch.length < BATCH_SIZE) break;
    }

    const total = aiPromoted + otherValidated;
    return ok({
      validated: total,
      aiPromoted,
      otherValidated,
      message: `Marked ${total} questions as validated (${aiPromoted} AI promoted to AI_VALIDATED).`,
    });
  } catch (err: any) {
    if (err?.status === 403) return forbidden();
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

const Body = z.object({
  filter: z.object({
    examCode: z.string().optional(),
    topicCode: z.string().optional(),
    source: z.enum(["AI_GENERATED", "AI_VALIDATED", "SME", "PYQ", "COMMUNITY"]).optional(),
    q: z.string().optional(),
  }),
  confirmCount: z.number().int().nonnegative(),
});

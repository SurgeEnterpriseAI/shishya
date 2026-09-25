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
//   - Never re-validates a withdrawn question (tag "rejected"), one that
//     was validated once and later pulled (validatedAt set), or one the
//     answer-check firewall already failed (metadata.factoryVerify on an
//     unvalidated row) — 25 Sep 2026, src/lib/question-withdrawn.ts. A bulk
//     run would otherwise put them in front of students; the admin editor's
//     single-question Validate is the deliberate way back.
//
// Body:
//   {
//     filter: { examCode?, topicCode?, source?, q? },
//     confirmCount: number,    // must match server's count for this filter:
//                              // the eligible rows, or every unvalidated row
//                              // (what /admin/questions shows as pending)
//   }

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/admin";
import { bad, forbidden, ok, parseBody, serverError } from "@/lib/http";
import { BULK_HELD_BACK, BULK_VALIDATABLE, bulkConfirmMatches, heldBackNote as heldBackNoteFor } from "@/lib/question-withdrawn";

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

    const filter: Prisma.QuestionWhereInput = {};
    if (body.filter.examCode) filter.exam = { code: body.filter.examCode };
    if (body.filter.topicCode) filter.topic = { code: body.filter.topicCode };
    if (body.filter.source) filter.source = body.filter.source;
    if (body.filter.q) filter.body = { contains: body.filter.q, mode: "insensitive" };
    // Unvalidated, never validated before, not withdrawn, not failed by the
    // answer-check firewall. Every batch below re-applies it, so a question
    // withdrawn mid-run is not flipped either.
    const where: Prisma.QuestionWhereInput = { ...filter, ...BULK_VALIDATABLE };

    const [serverCount, heldBack] = await Promise.all([
      prisma.question.count({ where }),
      prisma.question.count({ where: { ...filter, ...BULK_HELD_BACK } }),
    ]);
    const heldBackNote = heldBackNoteFor(heldBack);

    if (serverCount === 0) {
      return ok({
        validated: 0,
        heldBack,
        message: `No unvalidated questions to bulk-validate match the filter.${heldBackNote}`,
      });
    }

    if (serverCount > HARD_CAP) {
      return bad(
        `Filter matches ${serverCount} questions. Cap is ${HARD_CAP}. Narrow your filter (e.g. by topic) first.`
      );
    }

    if (!bulkConfirmMatches(body.confirmCount, serverCount, heldBack)) {
      return bad(
        `confirmCount (${body.confirmCount}) does not match server count (${serverCount}${heldBack ? `, or ${serverCount + heldBack} with the ${heldBack} held back` : ""}). The list may have changed; re-fetch and try again.`
      );
    }

    // Batched, two-step update. We do the AI-promotion pass first (which
    // also flips source → AI_VALIDATED) and then mop up any remaining
    // non-AI sources. updateMany with `take` isn't supported in Prisma,
    // so each batch selects ids first, then updates by id list. Loop
    // exits when nothing matches the unvalidated filter anymore.
    // 25 Sep 2026: each pass ANDs its source onto the filter instead of
    // overwriting it — `{ ...where, source }` replaced a source filter, so a
    // run confirmed for source=PYQ also flipped that exam's AI_GENERATED
    // rows, uncounted. The update re-checks the filter too (a question
    // withdrawn between select and update stays withdrawn).
    let aiPromoted = 0;
    let otherValidated = 0;
    const validatedAt = new Date();

    // ─ Pass 1: AI_GENERATED → AI_VALIDATED
    while (true) {
      const batch = await prisma.question.findMany({
        where: { AND: [where, { source: "AI_GENERATED" }] },
        select: { id: true },
        take: BATCH_SIZE,
      });
      if (batch.length === 0) break;
      const ids = batch.map((b) => b.id);
      const res = await prisma.question.updateMany({
        where: { AND: [where, { id: { in: ids } }] },
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
        where: { AND: [where, { source: { not: "AI_GENERATED" } }] },
        select: { id: true },
        take: BATCH_SIZE,
      });
      if (batch.length === 0) break;
      const ids = batch.map((b) => b.id);
      const res = await prisma.question.updateMany({
        where: { AND: [where, { id: { in: ids } }] },
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
      heldBack,
      message: `Marked ${total} questions as validated (${aiPromoted} AI promoted to AI_VALIDATED).${heldBackNote}`,
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

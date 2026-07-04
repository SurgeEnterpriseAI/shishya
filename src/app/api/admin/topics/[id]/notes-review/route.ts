// POST /api/admin/topics/:id/notes-review — mark a topic's AI-generated
// teaching note as validated or back to needs-review (Crack Path Task 1
// human-review mechanism). Bearer ${CRON_SECRET} OR signed-in admin.
//
// Operates on the dedicated `TopicTeachingNote` model, keyed by topicId.
// Body: { action: "validate" | "needs_review", validatorId?: string }

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { isCurrentUserAdmin } from "@/lib/admin";

const Body = z.object({
  action: z.enum(["validate", "needs_review"]),
  validatorId: z.string().max(64).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Dual auth: Bearer CRON_SECRET (cron / scripts) OR a signed-in admin
  // (the /admin/teaching-notes UI consumes this endpoint from the browser).
  const expected = process.env.CRON_SECRET;
  const viaBearer = Boolean(expected) && req.headers.get("authorization") === `Bearer ${expected}`;
  let adminUserId: string | undefined;
  if (!viaBearer) {
    const { isAdmin, userId } = await isCurrentUserAdmin();
    if (!isAdmin) return Response.json({ error: "unauthorized" }, { status: 401 });
    adminUserId = userId;
  }
  const { id } = await params;
  let body;
  try {
    body = Body.parse(await req.json());
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "invalid body" }, { status: 400 });
  }

  // The note is keyed by topicId (:id is the Topic id). Must exist to review.
  const note = await prisma.topicTeachingNote.findUnique({ where: { topicId: id }, select: { id: true } });
  if (!note) return Response.json({ error: "topic has no notes to review" }, { status: 400 });

  // validatorId must be a real User.id (FK → User). Prefer the signed-in
  // admin's id; fall back to a body-supplied id (cron path). An email or
  // free-text value isn't a valid FK, so we only set it when it resolves.
  const candidate = adminUserId ?? body.validatorId;
  let validatorId: string | null = null;
  if (body.action === "validate" && candidate) {
    const u = await prisma.user.findUnique({ where: { id: candidate }, select: { id: true } });
    validatorId = u?.id ?? null;
  }

  const updated = await prisma.topicTeachingNote.update({
    where: { topicId: id },
    data:
      body.action === "validate"
        ? { validatedAt: new Date(), validatorId }
        : { validatedAt: null, validatorId: null },
    select: { validatedAt: true },
  });

  return Response.json({
    ok: true,
    topicId: id,
    status: updated.validatedAt ? "validated" : "needs_review",
  });
}

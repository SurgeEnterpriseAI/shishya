// POST /api/admin/topics/:id/notes-review — mark a topic's AI-generated
// teaching note as validated or back to needs-review (Crack Path Task 1
// human-review mechanism). Bearer ${CRON_SECRET}.
//
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
  let adminEmail: string | undefined;
  if (!viaBearer) {
    const { isAdmin, email } = await isCurrentUserAdmin();
    if (!isAdmin) return Response.json({ error: "unauthorized" }, { status: 401 });
    adminEmail = email;
  }
  const { id } = await params;
  let body;
  try {
    body = Body.parse(await req.json());
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "invalid body" }, { status: 400 });
  }

  const topic = await prisma.topic.findUnique({ where: { id }, select: { id: true, notes: true } });
  if (!topic) return Response.json({ error: "topic not found" }, { status: 404 });
  if (!topic.notes) return Response.json({ error: "topic has no notes to review" }, { status: 400 });

  const updated = await prisma.topic.update({
    where: { id },
    data:
      body.action === "validate"
        ? { notesValidatedAt: new Date(), notesValidatedBy: body.validatorId ?? adminEmail ?? "admin" }
        : { notesValidatedAt: null, notesValidatedBy: null },
    select: { id: true, notesValidatedAt: true },
  });

  return Response.json({
    ok: true,
    topicId: updated.id,
    status: updated.notesValidatedAt ? "validated" : "needs_review",
  });
}

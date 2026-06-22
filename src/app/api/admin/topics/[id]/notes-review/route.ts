// POST /api/admin/topics/:id/notes-review — mark a topic's AI-generated
// teaching note as validated or back to needs-review (Crack Path Task 1
// human-review mechanism). Bearer ${CRON_SECRET}.
//
// Body: { action: "validate" | "needs_review", validatorId?: string }

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const Body = z.object({
  action: z.enum(["validate", "needs_review"]),
  validatorId: z.string().max(64).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
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
        ? { notesValidatedAt: new Date(), notesValidatedBy: body.validatorId ?? "admin" }
        : { notesValidatedAt: null, notesValidatedBy: null },
    select: { id: true, notesValidatedAt: true },
  });

  return Response.json({
    ok: true,
    topicId: updated.id,
    status: updated.notesValidatedAt ? "validated" : "needs_review",
  });
}

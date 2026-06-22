// GET /api/topics/:id/teaching-notes — the AI-generated teaching note for a
// topic (Crack Path "Learn" layer). Public read: the Learn pages render
// this. Returns the note markdown + generation/validation metadata.
//
// Notes live on Topic.notes (the existing teaching-material field the AI
// content factory populates) — no separate model needed.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topic = await prisma.topic.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      notes: true,
      notesGeneratedAt: true,
      notesValidatedAt: true,
      subject: { select: { name: true, exam: { select: { code: true, shortName: true } } } },
    },
  });
  if (!topic) return Response.json({ error: "topic not found" }, { status: 404 });

  return Response.json({
    ok: true,
    topicId: topic.id,
    code: topic.code,
    name: topic.name,
    subject: topic.subject?.name ?? null,
    exam: topic.subject?.exam ? { code: topic.subject.exam.code, shortName: topic.subject.exam.shortName } : null,
    hasNotes: Boolean(topic.notes),
    notes: topic.notes ?? null,
    generatedAt: topic.notesGeneratedAt,
    status: topic.notesValidatedAt ? "validated" : topic.notes ? "needs_review" : "missing",
  });
}

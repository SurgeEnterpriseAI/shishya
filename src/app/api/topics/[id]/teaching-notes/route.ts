// GET /api/topics/:id/teaching-notes — the AI-generated teaching note for a
// topic (Crack Path "Learn" layer). Public read: the Learn pages render
// this. Returns the note markdown + generation/validation metadata.
//
// Content lives in the dedicated `TopicTeachingNote` model (one row per
// topic), fetched here via the Topic.teachingNote 1:1 relation.

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
      teachingNote: {
        select: { content: true, generatedAt: true, validatedAt: true },
      },
      subject: { select: { name: true, exam: { select: { code: true, shortName: true } } } },
    },
  });
  if (!topic) return Response.json({ error: "topic not found" }, { status: 404 });

  const note = topic.teachingNote;
  return Response.json({
    ok: true,
    topicId: topic.id,
    code: topic.code,
    name: topic.name,
    subject: topic.subject?.name ?? null,
    exam: topic.subject?.exam ? { code: topic.subject.exam.code, shortName: topic.subject.exam.shortName } : null,
    hasNotes: Boolean(note?.content),
    notes: note?.content ?? null,
    generatedAt: note?.generatedAt ?? null,
    status: note?.validatedAt ? "validated" : note?.content ? "needs_review" : "missing",
  });
}

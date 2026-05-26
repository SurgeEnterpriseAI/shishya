// DELETE /api/i/enrollments/[id] — institution admin removes a student
// from a batch. We soft-cancel by setting status="LEFT" instead of
// hard-deleting, so we retain a historical record of who was ever
// enrolled (useful for future "alumni" features + audit trail).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireInstitutionSession } from "@/lib/institution-auth";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { institution } = await requireInstitutionSession();
  const { id } = await params;

  // Ownership: only allow removing rows belonging to a batch whose
  // course belongs to THIS institution.
  const enrollment = await prisma.batchEnrollment.findUnique({
    where: { id },
    include: {
      batch: { include: { course: { select: { institutionId: true } } } },
    },
  });
  if (!enrollment || enrollment.batch.course.institutionId !== institution.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await prisma.batchEnrollment.update({
    where: { id },
    data: { status: "LEFT" },
  });
  return NextResponse.json({ ok: true });
}

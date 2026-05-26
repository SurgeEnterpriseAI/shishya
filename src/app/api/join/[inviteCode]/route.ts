// POST /api/join/[inviteCode] — student joins a batch via shared link.
//
// Requires the visitor to be signed in as a STUDENT (NextAuth session).
// If they're not, /join/[code] page bounces them to /login first; this
// endpoint just 401s.
//
// Idempotent: if the student already has an ACTIVE enrollment, we 200
// without creating a duplicate. If they previously LEFT, we revive the
// row by flipping status back to ACTIVE. Re-clicking the link is safe.
//
// Capacity check is server-authoritative — the UI's "full" message is
// nice-to-have, not the gate.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  const { inviteCode } = await params;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  if (!userId) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  const batch = await prisma.batch.findUnique({
    where: { inviteCode },
    include: {
      course: { select: { name: true, institution: { select: { name: true } } } },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
  });
  if (!batch || batch.archived) {
    return NextResponse.json({ error: "Invite link is no longer valid" }, { status: 404 });
  }

  // Check existing row first — idempotent flow.
  const existing = await prisma.batchEnrollment.findUnique({
    where: { batchId_userId: { batchId: batch.id, userId } },
  });

  if (existing?.status === "ACTIVE") {
    return NextResponse.json({ ok: true, already: true, batchName: batch.name });
  }

  // Capacity check (server-side authoritative).
  if (
    batch.capacity != null &&
    batch._count.enrollments >= batch.capacity &&
    existing?.status !== "ACTIVE"
  ) {
    return NextResponse.json(
      { error: "This batch is full." },
      { status: 409 },
    );
  }

  if (existing) {
    // Re-activating a LEFT/COMPLETED enrollment.
    await prisma.batchEnrollment.update({
      where: { id: existing.id },
      data: { status: "ACTIVE", enrolledAt: new Date() },
    });
  } else {
    await prisma.batchEnrollment.create({
      data: { batchId: batch.id, userId, status: "ACTIVE" },
    });
  }

  return NextResponse.json({
    ok: true,
    batchName: batch.name,
    courseName: batch.course.name,
    institutionName: batch.course.institution.name,
  });
}

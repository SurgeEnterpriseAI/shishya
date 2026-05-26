// GET /api/i/batches  — list this institution's batches (with counts)
// POST /api/i/batches — create a new course + batch in one call.
//
// We auto-create a Course row implicitly when the institution adds
// their first batch. This is a UX shortcut for v1: most coaching
// centres think of "the SSC CGL 2026 morning batch" as one thing,
// not as "a course + a batch within it". The Course→Batch separation
// stays in the schema for future-flex (one course can run multiple
// concurrent batches), but the form/API merges them in v1.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireInstitutionSession } from "@/lib/institution-auth";

export const runtime = "nodejs";

const Body = z.object({
  // Course-level
  courseName: z.string().min(3).max(120).trim(),
  examCode: z.string().max(40).trim().nullable().optional(),
  description: z.string().max(2000).trim().nullable().optional(),
  durationWeeks: z.number().int().positive().max(208).nullable().optional(),
  feesInr: z.number().int().nonnegative().max(10_000_000).nullable().optional(),
  // Batch-level
  batchName: z.string().min(3).max(120).trim(),
  startDate: z.string().nullable().optional(), // ISO date "YYYY-MM-DD"
  endDate: z.string().nullable().optional(),
  mode: z.enum(["ONLINE", "OFFLINE", "HYBRID"]).default("ONLINE"),
  capacity: z.number().int().positive().max(10_000).nullable().optional(),
});

export async function GET() {
  const { institution } = await requireInstitutionSession();
  const batches = await prisma.batch.findMany({
    where: { course: { institutionId: institution.id }, archived: false },
    orderBy: [{ archived: "asc" }, { createdAt: "desc" }],
    include: {
      course: { select: { id: true, name: true, examCode: true } },
      _count: { select: { enrollments: true } },
    },
  });
  return NextResponse.json({
    items: batches.map((b) => ({
      id: b.id,
      name: b.name,
      mode: b.mode,
      startDate: b.startDate?.toISOString() ?? null,
      endDate: b.endDate?.toISOString() ?? null,
      inviteCode: b.inviteCode,
      capacity: b.capacity,
      enrolled: b._count.enrollments,
      course: b.course,
    })),
  });
}

export async function POST(req: NextRequest) {
  const { institution } = await requireInstitutionSession();

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    const msg =
      err instanceof z.ZodError ? err.issues[0]?.message ?? "invalid input" : "bad body";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Validate examCode if provided — silently drop unknown codes so the
  // form doesn't reject due to a typo; we just don't link the exam.
  let validExamCode: string | null = null;
  if (body.examCode) {
    const code = body.examCode.toUpperCase();
    const exam = await prisma.exam.findUnique({
      where: { code },
      select: { code: true },
    });
    if (exam) validExamCode = exam.code;
  }

  const startDate = body.startDate ? new Date(body.startDate) : null;
  const endDate = body.endDate ? new Date(body.endDate) : null;

  const created = await prisma.$transaction(async (tx) => {
    const course = await tx.course.create({
      data: {
        institutionId: institution.id,
        name: body.courseName,
        examCode: validExamCode,
        description: body.description ?? null,
        durationWeeks: body.durationWeeks ?? null,
        feesInr: body.feesInr ?? null,
      },
    });
    const batch = await tx.batch.create({
      data: {
        courseId: course.id,
        name: body.batchName,
        mode: body.mode,
        startDate,
        endDate,
        capacity: body.capacity ?? null,
      },
    });
    return { course, batch };
  });

  return NextResponse.json({
    ok: true,
    courseId: created.course.id,
    batchId: created.batch.id,
    inviteCode: created.batch.inviteCode,
  });
}

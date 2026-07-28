// POST /api/coach { examCode, examDate: "YYYY-MM-DD", dailyMinutes }
// Creates/updates the student's Personal Coach commitment. The plan
// itself is computed fresh on every dashboard/coach load (see
// src/lib/coach-plan.ts) — this stores only the three intake answers.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

const Body = z.object({
  examCode: z.string().min(1),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dailyMinutes: z.union([z.literal(45), z.literal(90), z.literal(180)]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "sign in" }, { status: 401 });
  const userId = session.user.id;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 });
  const { examCode, examDate, dailyMinutes } = parsed.data;

  const date = new Date(examDate + "T00:00:00Z");
  const daysLeft = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  if (daysLeft < 1 || daysLeft > 730) {
    return Response.json(
      { error: "Pick a future exam date (within the next two years)." },
      { status: 400 },
    );
  }

  const exam = await prisma.exam.findUnique({
    where: { code: examCode },
    select: { id: true, active: true },
  });
  if (!exam?.active) return Response.json({ error: "exam not found" }, { status: 404 });

  await prisma.$executeRaw`
    INSERT INTO "CoachPlan" (id, "userId", "examId", "examDate", "dailyMinutes", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, ${userId}, ${exam.id}, ${date}, ${dailyMinutes}, NOW(), NOW())
    ON CONFLICT ("userId", "examId")
    DO UPDATE SET "examDate" = ${date}, "dailyMinutes" = ${dailyMinutes}, "updatedAt" = NOW()`;

  // Ensure enrollment exists so the rest of the platform (Daily-5,
  // dashboard, emails) treats this exam as theirs.
  await prisma.enrollment
    .upsert({
      where: { userId_examId: { userId, examId: exam.id } },
      update: { active: true },
      create: { userId, examId: exam.id },
    })
    .catch(() => null);

  return Response.json({ ok: true });
}

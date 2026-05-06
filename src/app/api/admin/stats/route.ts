// GET /api/admin/stats — quick counters for the admin landing.

import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/admin";
import { ok, forbidden, serverError } from "@/lib/http";

export async function GET() {
  try {
    await requireAdmin();
    const [
      totalQuestions,
      validatedQuestions,
      pendingAi,
      totalUsers,
      totalAttempts,
    ] = await Promise.all([
      prisma.question.count(),
      prisma.question.count({ where: { validated: true } }),
      prisma.question.count({ where: { source: "AI_GENERATED", validated: false } }),
      prisma.user.count(),
      prisma.attempt.count({ where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } } }),
    ]);
    return ok({
      questions: { total: totalQuestions, validated: validatedQuestions, pendingAi },
      users: totalUsers,
      submittedAttempts: totalAttempts,
    });
  } catch (err: any) {
    if (err?.status === 403) return forbidden();
    return serverError(err);
  }
}

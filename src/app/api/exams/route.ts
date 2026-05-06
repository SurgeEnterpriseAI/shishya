// GET /api/exams — list all active exams (public, no auth needed)

import { prisma } from "@/lib/db/prisma";
import { ok, serverError } from "@/lib/http";

export async function GET() {
  try {
    const exams = await prisma.exam.findMany({
      where: { active: true },
      orderBy: { candidatesPerYear: "desc" },
      select: {
        id: true,
        code: true,
        name: true,
        shortName: true,
        category: true,
        description: true,
        durationMin: true,
        totalQuestions: true,
        totalMarks: true,
        marksPerQ: true,
        negativeMark: true,
        languages: true,
        candidatesPerYear: true,
      },
    });
    return ok({ exams });
  } catch (err) {
    return serverError(err);
  }
}

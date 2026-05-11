// GET /api/exams — list all active exams (public, no auth needed)
//
// This endpoint is hit by the home page, the dashboard's "Explore other exams"
// section, and external monitoring. The underlying rows change at most a few
// times a day (when new exams go Live). We let Next serve a cached copy and
// revalidate every 60s — at 10k concurrent students this trims thousands of
// duplicate queries per minute from Neon.
export const revalidate = 60;

import { prisma } from "@/lib/db/prisma";
import { ok, serverError } from "@/lib/http";

export async function GET() {
  try {
    const rows = await prisma.exam.findMany({
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
        state: true,
        _count: {
          select: {
            questions: { where: { validated: true } },
            mocks: { where: { userId: null } },
          },
        },
      },
    });
    // Same Live criterion as the home page's loadExams(): an exam is Live
    // when it has at least one validated question OR one system mock
    // (Mock.userId = null). The home page uses this to flip the badge from
    // "Coming" → "Live"; surfacing it here lets external dashboards and
    // monitoring scripts read the same source of truth.
    const exams = rows.map(({ _count, ...e }) => ({
      ...e,
      live: ((_count?.questions ?? 0) > 0) || ((_count?.mocks ?? 0) > 0),
      validatedQuestions: _count?.questions ?? 0,
      systemMocks: _count?.mocks ?? 0,
    }));
    return ok({ exams });
  } catch (err) {
    return serverError(err);
  }
}

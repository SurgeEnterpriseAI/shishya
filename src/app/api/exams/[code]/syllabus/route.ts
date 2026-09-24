// GET /api/exams/:code/syllabus — full syllabus tree for an exam

import { getSyllabusContext } from "@/lib/db/syllabus";
import { ok, notFound, serverError } from "@/lib/http";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await ctx.params;
    // 24 Sep 2026: examFacts (raw tracker rows, expected tier included) feed
    // the tutor prompt, which labels them; this public JSON never carried
    // them and must not start serving unlabelled estimates.
    const { examFacts: _tutorOnly, ...syllabus } = await getSyllabusContext(code);
    return ok({ syllabus });
  } catch (err: any) {
    if (String(err?.message ?? "").includes("Exam not found")) return notFound("exam");
    return serverError(err);
  }
}

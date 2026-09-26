// Platform counts for the machine files (26 Sep 2026, B-machine-crawl).
//
// The DB reads behind the computed platform description on /context.md and
// the first line of /llms-full.txt (the pure wording lives in
// src/lib/section-context.ts). Each read throws on failure; the callers catch
// and fall back to the number-free static description — a file with no
// count beats a file with a wrong one.
//
// 26 Sep 2026: mirrors the counting rules of src/lib/site-description.ts
// (built in parallel); the integrator may switch both callers to one module.

import { prisma } from "@/lib/db/prisma";
import { REAL_EXAM_SQL, REAL_EXAM_WHERE, SCHOOL_CATEGORY } from "@/lib/db/exam-scope";
import { WITHDRAWN_TAG } from "@/lib/question-withdrawn";

export interface ExamCatalogRow {
  code: string;
  category: string;
  state: string | null;
}

/** Every live real exam (REAL_EXAM_WHERE): code, category and state. */
export async function loadRealExamCatalog(): Promise<ExamCatalogRow[]> {
  const rows = await prisma.exam.findMany({
    where: REAL_EXAM_WHERE,
    select: { code: true, category: true, state: true },
    orderBy: { code: "asc" },
  });
  return rows.map((r) => ({ code: r.code, category: String(r.category), state: r.state }));
}

/** Practice questions that passed the AI answer-check before going live:
 *  validated, not withdrawn, on a live real exam or a school chapter,
 *  validated by the question factory with its answer-check record. */
export async function loadCheckedQuestionCount(): Promise<number> {
  const rows = await prisma.$queryRaw<{ n: bigint | number }[]>`
    SELECT COUNT(*)::bigint AS n
    FROM "Question" q
    JOIN "Exam" e ON e.id = q."examId"
    WHERE q.validated = TRUE AND NOT (${WITHDRAWN_TAG} = ANY(q.tags))
      AND (${REAL_EXAM_SQL} OR e."category"::text = ${SCHOOL_CATEGORY})
      AND q."validatedBy" LIKE 'factory:%' AND q.metadata ? 'factoryVerify'`;
  return Number(rows[0]?.n ?? 0);
}

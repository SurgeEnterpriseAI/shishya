// What the "guest tutor is off" line on a kids' exam may point to (14 Oct
// 2026, Release 2 — src/lib/kids-tutor.ts). Reads only, all cached: the exam
// (code, short name), its practice counts (src/lib/db/exam-practice.ts, the
// hub's own rule) and whether the hub lists the body's sample papers
// (src/lib/official-papers-db.ts). A failed read claims nothing: no practice,
// no papers — the line then points to the exam's page.

import { prisma } from "@/lib/db/prisma";
import { realExamKey } from "@/lib/db/exam-scope";
import { examPracticeState } from "@/lib/db/exam-practice";
import { loadOfficialSamplePapers } from "@/lib/official-papers-db";
import type { KidsTutorOffer } from "@/lib/kids-tutor";

/** The offer for `code`, or null when no active real exam has that code. */
export async function loadKidsTutorOffer(code: string): Promise<KidsTutorOffer | null> {
  let exam: { id: string; code: string; shortName: string; active: boolean } | null = null;
  try {
    exam = await prisma.exam.findUnique({
      where: realExamKey({ code }),
      select: { id: true, code: true, shortName: true, active: true },
    });
  } catch {
    exam = null;
  }
  if (!exam || !exam.active) return null;
  const [practice, samples] = await Promise.all([examPracticeState(exam.code), loadOfficialSamplePapers(exam.id)]);
  return {
    examCode: exam.code,
    exam: exam.shortName || exam.code,
    hasQuestions: practice.questions > 0,
    hasSamplePapers: samples.length > 0,
  };
}

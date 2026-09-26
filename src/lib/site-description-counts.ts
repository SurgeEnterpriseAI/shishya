// The numbers for the computed site description (26 Sep 2026).
//
// src/lib/site-description.ts holds the words; this file reads the counts
// they print, each from the one place that already defines it, so no
// surface ever types a number:
//
//   exams             prisma.exam.count({ where: REAL_EXAM_WHERE })
//   checkedQuestions  validated, not withdrawn ("rejected" tag), on a live
//                     real exam or a school container, AND passed by the
//                     answer-check firewall: validatedBy LIKE 'factory:%'
//                     and metadata ? 'factoryVerify'
//                     (scripts/verify-question-bank.ts sets both on a pass)
//   chapters          schoolSurfaceCounts(loadSchoolSurface()).chapters
//   chaptersWithNotes school chapters with BOTH usable notes and a checked
//                     guest quiz — the sentence says "notes and checked
//                     practice". On 26 Sep 2026 this equals the surface's
//                     indexableChapters (5); it is counted as "both" so the
//                     sentence stays true if a notes-only chapter appears.
//   colleges / scholarships / careers   the data arrays' lengths
//   indianLanguages   INDIAN_LANGUAGE_COUNT (derived from i18n locales)
//
// Server-only (Prisma + the school surface's unstable_cache). Callers wrap
// the call in try/catch and fall back to siteDescriptionStatic().

import { prisma } from "@/lib/db/prisma";
import { REAL_EXAM_SQL, REAL_EXAM_WHERE, SCHOOL_CATEGORY } from "@/lib/db/exam-scope";
import { WITHDRAWN_TAG } from "@/lib/question-withdrawn";
import { CHAPTER_INDEXABLE_MIN_QUESTIONS, loadSchoolSurface, schoolSurfaceCounts } from "@/lib/school/surface";
import { COLLEGES, NIRF_SOURCE_YEAR } from "@/lib/colleges-data";
// 26 Sep 2026 (repair): the schemes, never the one outside aggregator
// (Buddy4Study) the raw catalogue holds — src/lib/scholarship-schemes.ts.
import { SCHOLARSHIP_SCHEMES } from "@/lib/scholarship-schemes";
import { CAREERS } from "@/data/careers";
import { INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import type { SiteDescriptionCounts } from "@/lib/site-description";

type CountRow = { count: bigint | number | null };

/** Answer-checked practice questions (see the header for the rule). */
export async function countCheckedQuestions(): Promise<number> {
  const rows = await prisma.$queryRaw<CountRow[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "Question" q
    JOIN "Exam" e ON e.id = q."examId"
    WHERE q.validated = TRUE
      AND NOT (${WITHDRAWN_TAG} = ANY(q.tags))
      AND (${REAL_EXAM_SQL} OR e."category"::text = ${SCHOOL_CATEGORY})
      AND q."validatedBy" LIKE 'factory:%'
      AND (q.metadata ? 'factoryVerify')
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function loadSiteDescriptionCounts(): Promise<SiteDescriptionCounts> {
  const [exams, checkedQuestions, surface] = await Promise.all([
    prisma.exam.count({ where: REAL_EXAM_WHERE }),
    countCheckedQuestions(),
    loadSchoolSurface(),
  ]);
  let chaptersWithNotes = 0;
  for (const c of surface.classes) {
    for (const s of c.subjects) {
      for (const ch of s.chapters) {
        if (ch.hasNotes && ch.validatedQuestions >= CHAPTER_INDEXABLE_MIN_QUESTIONS) chaptersWithNotes++;
      }
    }
  }
  return {
    exams,
    checkedQuestions,
    chapters: schoolSurfaceCounts(surface).chapters,
    chaptersWithNotes,
    colleges: COLLEGES.length,
    scholarships: SCHOLARSHIP_SCHEMES.length,
    careers: CAREERS.length,
    indianLanguages: INDIAN_LANGUAGE_COUNT,
    collegeRankYear: NIRF_SOURCE_YEAR,
  };
}

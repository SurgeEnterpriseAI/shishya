// Which exam sub-pages actually render (16 Sep 2026). Every surface that
// links an exam's /cutoff, /tricks, /guide, /syllabus or /build-mock page —
// the sitemap, llms-full.txt, context.md, the hub buttons and FAQ JSON-LD,
// the checklist, the tracker, ExamWeekBlock, the exam-week AEO lines, the
// day-after and result-day mails, IndexNow — asks THIS module, which mirrors
// each page's own rule. The 16 Sep scout found MP_RAEO and KA_KSRP (active
// since 15 Sep) with no rank bands, tricks or guide and 12 exams with no
// subjects, while all five pages were linked everywhere, sitemap included.
//
//   /cutoff     ExamRankBand rows with archivedAt NULL   (cutoff/page.tsx notFound)
//   /tricks     an ExamTricks row with content          (tricks/page.tsx notFound)
//   /guide      an ExamGuide row with content           (guide/page.tsx notFound)
//   /syllabus   at least one Subject                    (syllabus/page.tsx notFound)
//   /buildMock  a topic with >= 3 validated questions   (the page renders empty
//               otherwise — the sitemap's long-standing "buildable" rule)
//               25 Sep 2026: withdrawn questions (tag "rejected") do not
//               count — the builder's pools drop them since batch 2a, so a
//               topic held up only by withdrawn rows cannot build.

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { REAL_EXAM_SQL } from "@/lib/db/exam-scope";
import { WITHDRAWN_TAG } from "@/lib/question-withdrawn";

export interface ExamPageGates {
  cutoff: boolean;
  tricks: boolean;
  guide: boolean;
  syllabus: boolean;
  buildMock: boolean;
}

/** Minimum validated questions a topic needs before the builder can use it. */
export const BUILDABLE_TOPIC_MIN = 3;

/** What a surface assumes when the gate read fails. Links on a page fall
 *  back to OPEN (the page was reachable before this module existed); the
 *  sitemap, llms-full.txt and IndexNow fall back to CLOSED — a smaller
 *  machine surface beats one that points crawlers at 404s. */
export const GATES_OPEN: ExamPageGates = { cutoff: true, tricks: true, guide: true, syllabus: true, buildMock: true };
export const GATES_CLOSED: ExamPageGates = { cutoff: false, tricks: false, guide: false, syllabus: false, buildMock: false };

type GateRow = { code: string; cutoff: boolean; tricks: boolean; guide: boolean; syllabus: boolean; buildMock: boolean };

async function readGates(): Promise<GateRow[]> {
  return prisma.$queryRaw<GateRow[]>`
    SELECT e.code,
      EXISTS (SELECT 1 FROM "ExamRankBand" b WHERE b."examId" = e.id AND b."archivedAt" IS NULL) AS cutoff,
      EXISTS (SELECT 1 FROM "ExamTricks" t WHERE t."examId" = e.id AND COALESCE(t.content, '') <> '') AS tricks,
      EXISTS (SELECT 1 FROM "ExamGuide" g WHERE g."examId" = e.id AND COALESCE(g.content, '') <> '') AS guide,
      EXISTS (SELECT 1 FROM "Subject" s WHERE s."examId" = e.id) AS syllabus,
      EXISTS (
        SELECT 1 FROM "Question" q
        WHERE q."examId" = e.id AND q.validated = TRUE
          AND NOT (${WITHDRAWN_TAG} = ANY(q.tags))
        GROUP BY q."topicId" HAVING COUNT(*) >= ${BUILDABLE_TOPIC_MIN}
      ) AS "buildMock"
    FROM "Exam" e
    WHERE ${REAL_EXAM_SQL}`; // 25 Sep 2026: real exams only; a school class container links no /exams page
}

const cachedGates = unstable_cache(
  async (): Promise<Record<string, ExamPageGates>> => {
    const rows = await readGates();
    const out: Record<string, ExamPageGates> = {};
    for (const r of rows) {
      out[r.code] = { cutoff: !!r.cutoff, tricks: !!r.tricks, guide: !!r.guide, syllabus: !!r.syllabus, buildMock: !!r.buildMock };
    }
    return out;
  },
  ["exam-page-gates-v1"],
  { revalidate: 600, tags: ["exam-shared"] },
);

/** Gates for every active exam, keyed by exam code. Throws on a failed read —
 *  the caller picks GATES_OPEN or GATES_CLOSED for its surface. */
export async function loadExamPageGates(): Promise<Map<string, ExamPageGates>> {
  return new Map(Object.entries(await cachedGates()));
}

/** Gates for one exam. An exam missing from the map (inactive) gets
 *  GATES_CLOSED; a failed read gets `onError` (default GATES_OPEN, for links
 *  on a rendered page). */
export async function examPageGates(code: string, onError: ExamPageGates = GATES_OPEN): Promise<ExamPageGates> {
  try {
    return (await loadExamPageGates()).get(code) ?? GATES_CLOSED;
  } catch {
    return onError;
  }
}

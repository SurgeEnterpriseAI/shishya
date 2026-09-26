// Cached practice counts for every live real exam (27 Sep 2026) — the reader
// behind src/lib/exam-practice-state.ts's one rule, for the surfaces that do
// not already hold the hub's cached payload: the sitemap, the site search,
// llms-full.txt, context.md and the /updates, /cutoff, /syllabus and /guide
// pages. The hub itself applies the same rule to the same counts in its own
// payload (getExamShared: validatedQuestionCount, systemMocks), so a hub and
// its sub-pages can never use two different definitions.
//
// One grouped read of REAL exams (active, not a school container — the
// exam-scope rule), cached 10 minutes under the hub payload's tag
// ("exam-shared"), so the first question that lands on an exam flips every
// surface within one cache window. Counts, in the hub's own terms:
//   questions    validated questions (a withdrawn one is validated=false);
//   systemMocks  shared mocks (userId NULL), live-test papers excluded — the
//                hub never lists those (src/lib/db/exam-cache.ts).

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { REAL_EXAM_SQL } from "@/lib/db/exam-scope";
import { NO_PRACTICE, practiceStateFromCounts, type ExamPracticeState, type PracticeCatalogRow } from "@/lib/exam-practice-state";

type Row = { code: string; shortName: string; category: string; state: string | null; candidatesPerYear: number | null; questions: number; systemMocks: number };

async function readPracticeRows(): Promise<Row[]> {
  return prisma.$queryRaw<Row[]>`
    SELECT e.code, e."shortName", e.category::text AS category, e.state, e."candidatesPerYear",
      COALESCE(q.n, 0)::int AS questions, COALESCE(m.n, 0)::int AS "systemMocks"
    FROM "Exam" e
    LEFT JOIN (SELECT "examId", COUNT(*) AS n FROM "Question" WHERE validated = TRUE GROUP BY 1) q ON q."examId" = e.id
    LEFT JOIN (
      SELECT "examId", COUNT(*) AS n FROM "Mock"
      WHERE "userId" IS NULL AND "generatedBy" IS DISTINCT FROM 'live-test'
      GROUP BY 1
    ) m ON m."examId" = e.id
    WHERE ${REAL_EXAM_SQL}`;
}

const cachedRows = unstable_cache(readPracticeRows, ["exam-practice-v1"], { revalidate: 600, tags: ["exam-shared"] });

/** Every live real exam with its practice state, keyed by code. Throws on a
 *  failed read — the caller picks what a failure claims for its surface. */
export async function loadExamPracticeStates(): Promise<Map<string, PracticeCatalogRow>> {
  const rows = await cachedRows();
  return new Map(
    rows.map((r) => [
      r.code,
      {
        code: r.code,
        shortName: r.shortName,
        category: r.category,
        state: r.state ?? null,
        candidatesPerYear: r.candidatesPerYear ?? null,
        practice: practiceStateFromCounts({ questions: Number(r.questions), systemMocks: Number(r.systemMocks) }),
      },
    ]),
  );
}

/** One exam's practice state. An exam missing from the map (inactive,
 *  unknown, a school container) has none; a failed read returns `onError`
 *  (default: no practice — a page never promises practice it cannot vouch for). */
export async function examPracticeState(code: string, onError: ExamPracticeState = NO_PRACTICE): Promise<ExamPracticeState> {
  try {
    return (await loadExamPracticeStates()).get(code)?.practice ?? NO_PRACTICE;
  } catch {
    return onError;
  }
}

/** 27 Sep 2026 (fixer): the codes of the live real exams that HAVE practice —
 *  for the readers that promise practice on an ENROLLED exam (the Daily-5
 *  mail, /today's pick, the coach intake): an enrolment can sit on an exam
 *  with none (/chat enrols the exam it opens; the AI tutor is the one call to
 *  action on a no-practice hub). Null on a failed read — the caller keeps its
 *  old behaviour (a mail run or /today must not stop on a cache miss). */
export async function practiceExamCodes(): Promise<Set<string> | null> {
  try {
    const rows = await loadExamPracticeStates();
    return new Set([...rows.values()].filter((r) => r.practice.hasPractice).map((r) => r.code));
  } catch (err) {
    console.error("[exam-practice] practice read failed — enrolments not filtered:", err);
    return null;
  }
}

/** The catalogue as a list (for relatedPracticeExams); [] on a failed read. */
export async function practiceCatalog(): Promise<PracticeCatalogRow[]> {
  try {
    return [...(await loadExamPracticeStates()).values()];
  } catch {
    return [];
  }
}

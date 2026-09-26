// Reads behind /mock-tests (26 Sep 2026) — src/lib/mock-catalogue.ts has
// the rules; this file only fetches the rows they run on. SELECT only.
//
// Four reads, all scoped to live real exams (src/lib/db/exam-scope.ts — no
// school container is ever listed):
//   1. the exams (REAL_EXAM_WHERE);
//   2. every shared mock (userId NULL, not a live-test paper) with the number
//      of its questionIds that still exist;
//   3. for the mocks the hub lists: distinct existing questions and their
//      written languages, per exam;
//   4. the live tracker rows (archivedAt NULL) in the hub title's window, and
//      each exam's official portal URL (the official tier).
// A failed read throws: the ISR page keeps its last good copy instead of
// caching an empty list.

import { prisma } from "./prisma";
import { REAL_EXAM_SQL, REAL_EXAM_WHERE } from "./exam-scope";
import { istDay } from "@/lib/exam-week";
import {
  DATE_WINDOW_AHEAD_DAYS,
  DATE_WINDOW_PAST_DAYS,
  LIVE_TEST_GENERATOR,
  countedMockIds,
  countedMocksByExam,
  type CatalogueMock,
  type CatalogueQuestionStat,
  type MockCatalogueInput,
} from "@/lib/mock-catalogue";

export async function loadMockCatalogueInput(now: Date = new Date()): Promise<MockCatalogueInput> {
  const exams = await prisma.exam.findMany({
    where: REAL_EXAM_WHERE,
    orderBy: { code: "asc" },
    select: { id: true, code: true, shortName: true, name: true, category: true, state: true },
  });

  const mocks = await prisma.$queryRaw<CatalogueMock[]>`
    SELECT m.id, m."examId", m."generatedBy", m."createdAt",
           (SELECT COUNT(*)::int FROM "Question" q WHERE q.id = ANY(m."questionIds")) AS "questionCount"
    FROM "Mock" m JOIN "Exam" e ON e.id = m."examId"
    WHERE m."userId" IS NULL AND m."generatedBy" <> ${LIVE_TEST_GENERATOR} AND ${REAL_EXAM_SQL}
    ORDER BY m."createdAt" ASC, m.id ASC
  `;

  const ids = countedMockIds(mocks);
  const questionStats =
    ids.length === 0
      ? []
      : await prisma.$queryRaw<CatalogueQuestionStat[]>`
          SELECT x."examId", COUNT(DISTINCT q.id)::int AS questions,
                 ARRAY_AGG(DISTINCT q.language::text) AS languages
          FROM (SELECT m."examId", unnest(m."questionIds") AS qid FROM "Mock" m WHERE m.id = ANY(${ids}::text[])) x
          JOIN "Question" q ON q.id = x.qid
          GROUP BY x."examId"
        `;

  const examIds = [...countedMocksByExam(mocks).keys()];
  const today = new Date(`${istDay(now)}T00:00:00.000Z`);
  const from = new Date(today.getTime() - DATE_WINDOW_PAST_DAYS * 86_400_000);
  const to = new Date(today.getTime() + DATE_WINDOW_AHEAD_DAYS * 86_400_000);
  const [dateRows, eligibility] =
    examIds.length === 0
      ? [[], []]
      : await Promise.all([
          prisma.examImportantDate.findMany({
            where: { examId: { in: examIds }, archivedAt: null, date: { gte: from, lte: to } },
            orderBy: [{ date: "asc" }, { id: "asc" }],
            select: {
              id: true,
              examId: true,
              label: true,
              date: true,
              isExamDay: true,
              kind: true,
              confidence: true,
              url: true,
              notes: true,
              source: true,
              createdAt: true,
            },
          }),
          prisma.examEligibility.findMany({ where: { examId: { in: examIds } }, select: { examId: true, officialUrl: true } }),
        ]);

  return {
    exams: exams.map((e) => ({ ...e, category: String(e.category) })),
    mocks,
    questionStats,
    dateRows,
    officialUrls: new Map(eligibility.map((r) => [r.examId, r.officialUrl ?? null] as const)),
  };
}

/** Newest shared mock's createdAt — the /mock-tests sitemap lastmod
 *  (mockTestsSitemapEntries). Null when there is none. */
export async function loadNewestSharedMockAt(): Promise<Date | null> {
  const r = await prisma.$queryRaw<{ at: Date | null }[]>`
    SELECT MAX(m."createdAt") AS at
    FROM "Mock" m JOIN "Exam" e ON e.id = m."examId"
    WHERE m."userId" IS NULL AND m."generatedBy" <> ${LIVE_TEST_GENERATOR} AND ${REAL_EXAM_SQL}
  `;
  return r[0]?.at ?? null;
}

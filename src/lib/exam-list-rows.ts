// One cached read of every real exam for the exam list pages (26 Sep 2026,
// G4 honest page families): /exams/category/{slug}, /exams/after/{level} and
// the "By qualification" block on /exams/state/{slug} and /find-your-exam.
//
// Each row carries only what those pages print, all from the DB:
//   • the exam's names, category, state and updatedAt (a real timestamp for
//     the sitemap);
//   • its ExamEligibility (175 of 179 rows are AI-drafted — the pages label
//     them "indicative" and link the official site; the hand-checked
//     src/data/exam-deep-content.ts eligibility is preferred where it exists);
//   • the mock-test count the exam's hub and /mock-tests show — computed by
//     the same rule (src/lib/mock-catalogue.ts countedMocksByExam: shared
//     mocks, never a live-test paper, the hub's list, only mocks whose
//     questions still exist). 27 Sep 2026 (repair): it counted every Mock
//     with userId null, live-test papers included, so 25 exams showed more
//     "mock tests" here than on their own hub (SSC CGL 32 vs 22);
//   • the next exam day from the tracker, with its tier (official /
//     reported / expected), computed here by buildTimeline + stageOf at load
//     time — so the cache holds one small object per exam, not the rows. The
//     cache lives an hour, so a next-exam day can be up to an hour stale.
// vacanciesApprox is NOT read: it has no source field (the critic's rule).
// A failed read throws (the page's ISR keeps its last good render).

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { REAL_EXAM_SQL, REAL_EXAM_WHERE } from "@/lib/db/exam-scope";
import { SUPPRESSED_SOURCE, buildTimeline, stageOf } from "@/lib/exam-timeline";
import { LIVE_TEST_GENERATOR, countedMocksByExam, type CatalogueMock } from "@/lib/mock-catalogue";

export interface ExamListRow {
  code: string;
  shortName: string;
  name: string;
  category: string;
  state: string | null;
  candidatesPerYear: number | null;
  /** ISO timestamp of the Exam row. */
  updatedAt: string;
  mockCount: number;
  eligibility: {
    minAge: number | null;
    maxAge: number | null;
    educationTags: string[];
    educationNote: string | null;
    officialUrl: string | null;
    officialName: string | null;
  } | null;
  /** The next exam day on the tracker, or null. */
  nextExam: { day: string; tier: "official" | "reported" | "expected"; label: string } | null;
}

export async function loadExamListRows(now: Date = new Date()): Promise<ExamListRow[]> {
  const exams = await prisma.exam.findMany({
    where: REAL_EXAM_WHERE,
    select: {
      id: true,
      code: true,
      shortName: true,
      name: true,
      category: true,
      state: true,
      candidatesPerYear: true,
      updatedAt: true,
      eligibility: { select: { minAge: true, maxAge: true, educationTags: true, educationNote: true, officialUrl: true, officialName: true } },
    },
    orderBy: [{ candidatesPerYear: { sort: "desc", nulls: "last" } }, { shortName: "asc" }],
  });
  // The /mock-tests read (src/lib/db/mock-catalogue-db.ts), counted by the
  // same pure rule, so the three surfaces cannot disagree.
  const mocks = await prisma.$queryRaw<CatalogueMock[]>`
    SELECT m.id, m."examId", m."generatedBy", m."createdAt",
           (SELECT COUNT(*)::int FROM "Question" q WHERE q.id = ANY(m."questionIds")) AS "questionCount"
    FROM "Mock" m JOIN "Exam" e ON e.id = m."examId"
    WHERE m."userId" IS NULL AND m."generatedBy" <> ${LIVE_TEST_GENERATOR} AND ${REAL_EXAM_SQL}
  `;
  const mockCounts = countedMocksByExam(mocks);
  const from = new Date(now.getTime() - 2 * 86_400_000);
  const to = new Date(now.getTime() + 400 * 86_400_000);
  const dates = await prisma.examImportantDate.findMany({
    where: {
      archivedAt: null,
      examId: { in: exams.map((e) => e.id) },
      date: { gte: from, lte: to },
      OR: [{ source: null }, { source: { not: SUPPRESSED_SOURCE } }],
    },
    select: { id: true, examId: true, label: true, date: true, isExamDay: true, kind: true, confidence: true, url: true, notes: true, source: true },
    orderBy: [{ date: "asc" }, { id: "asc" }],
  });
  const byExam = new Map<string, typeof dates>();
  for (const d of dates) byExam.set(d.examId, [...(byExam.get(d.examId) ?? []), d]);

  return exams.map((e) => {
    const timeline = buildTimeline(byExam.get(e.id) ?? [], now, e.eligibility?.officialUrl ?? null);
    const next = stageOf(timeline).nextExam;
    return {
      code: e.code,
      shortName: e.shortName,
      name: e.name,
      category: String(e.category),
      state: e.state,
      candidatesPerYear: e.candidatesPerYear,
      updatedAt: e.updatedAt.toISOString(),
      mockCount: mockCounts.get(e.id)?.length ?? 0,
      eligibility: e.eligibility
        ? {
            minAge: e.eligibility.minAge,
            maxAge: e.eligibility.maxAge,
            educationTags: e.eligibility.educationTags,
            educationNote: e.eligibility.educationNote,
            officialUrl: e.eligibility.officialUrl,
            officialName: e.eligibility.officialName,
          }
        : null,
      nextExam: next ? { day: next.day, tier: next.tier, label: next.label } : null,
    };
  });
}

/** Cached for page renders (hourly, busted with the exam catalog). */
// v2 (27 Sep 2026): mockCount now follows the hub's rule — a new key so no
// cached v1 row (live-test papers counted) is served after the deploy.
export const getExamListRows = unstable_cache(() => loadExamListRows(), ["exam-list-rows-v2"], {
  revalidate: 3600,
  tags: ["exam-catalog"],
});

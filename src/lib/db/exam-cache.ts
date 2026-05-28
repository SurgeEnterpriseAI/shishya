// Cached reads for the public exam landing page.
//
// The shared part of /exams/[code] — exam + subjects + mocks + news +
// dates + rank bands — barely changes between requests, but we were
// re-querying Postgres on every page view. With unstable_cache the same
// payload is served from Next's data cache for `revalidate` seconds, and
// only the user-specific part (enrollment, weakness, recent attempts)
// stays on the per-request path.
//
// Tags let us bust selectively from the cron jobs and admin endpoints
// when news/dates/rank bands change.

import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

export const EXAM_CACHE_TTL = 600; // 10 minutes

/** Shared exam payload — safe to cache across all users. */
export const getExamShared = unstable_cache(
  async (code: string) => {
    const exam = await prisma.exam.findUnique({
      where: { code },
      include: {
        subjects: {
          orderBy: { orderIdx: "asc" },
          include: {
            topics: {
              where: { parentId: null },
              orderBy: { orderIdx: "asc" },
              include: { children: true },
            },
          },
        },
      },
    });
    if (!exam) return null;

    const [validatedQuestionCount, newsItems, importantDates, pyqYears, systemMocks, leaderboard, rankBands] =
      await Promise.all([
        prisma.question.count({ where: { examId: exam.id, validated: true } }),
        // archivedAt IS NULL filter keeps the per-exam page showing
        // only the CURRENT generation of news/dates. Older cycles
        // (postponements from last year, prior cutoff notifications)
        // live on in the table but surface only on the archive page
        // /exams/[code]/archive. See refresh-exam-data cron.
        prisma.examNewsItem.findMany({
          where: { examId: exam.id, archivedAt: null },
          orderBy: { publishedAt: "desc" },
          take: 5,
        }),
        prisma.examImportantDate.findMany({
          where: { examId: exam.id, archivedAt: null },
          orderBy: { date: "asc" },
          take: 10,
        }),
        prisma.question.groupBy({
          by: ["pyqYear"],
          where: { examId: exam.id, source: "PYQ", pyqYear: { not: null } },
          _count: true,
          orderBy: { pyqYear: "desc" },
        }),
        prisma.mock.findMany({
          where: { examId: exam.id, userId: null },
          orderBy: [{ createdAt: "asc" }],
          take: 24,
          select: { id: true, title: true, type: true, questionIds: true, config: true },
        }),
        prisma.attempt.findMany({
          where: {
            mock: { examId: exam.id },
            status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
            scorePct: { not: null },
          },
          orderBy: { scorePct: "desc" },
          take: 10,
          select: {
            id: true,
            scorePct: true,
            userId: true,
            finishedAt: true,
            user: { select: { name: true } },
          },
        }),
        prisma.examRankBand.findMany({
          where: { examId: exam.id, archivedAt: null },
          orderBy: { orderIdx: "asc" },
          select: {
            scorePctMin: true,
            scorePctMax: true,
            rankMin: true,
            rankMax: true,
            label: true,
            outcomes: true,
            source: true,
          },
        }),
      ]);

    return {
      exam,
      validatedQuestionCount,
      newsItems,
      importantDates,
      pyqYears,
      systemMocks,
      leaderboard,
      rankBands,
    };
  },
  ["exam-shared-v1"],
  { revalidate: EXAM_CACHE_TTL, tags: ["exam-shared"] },
);

/** Shape of the dashboard's exam-recommendations list. Shared across all
 *  users and cheap to cache. */
export const getDashboardExams = unstable_cache(
  async () => {
    return prisma.exam.findMany({
      where: { active: true },
      orderBy: [{ candidatesPerYear: "desc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        shortName: true,
        name: true,
        category: true,
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
  },
  ["dashboard-exams-v1"],
  { revalidate: EXAM_CACHE_TTL, tags: ["exam-catalog"] },
);

/** Cache the full exams catalog listing for /exams. */
export const getExamCatalog = unstable_cache(
  async () => {
    const exams = await prisma.exam.findMany({
      where: { active: true },
      orderBy: [{ category: "asc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        shortName: true,
        name: true,
        category: true,
        description: true,
        languages: true,
        totalQuestions: true,
        durationMin: true,
      },
    });

    const counts = await prisma.question.groupBy({
      by: ["examId"],
      where: { examId: { in: exams.map((e) => e.id) }, validated: true },
      _count: { _all: true },
    });
    const byId = new Map(counts.map((c) => [c.examId, c._count._all]));

    const mockCounts = await prisma.mock.groupBy({
      by: ["examId"],
      where: { userId: null, examId: { in: exams.map((e) => e.id) } },
      _count: { _all: true },
    });
    const mockByExam = new Map(mockCounts.map((c) => [c.examId, c._count._all]));

    return exams.map((e) => ({
      ...e,
      validatedQuestionCount: byId.get(e.id) ?? 0,
      mockCount: mockByExam.get(e.id) ?? 0,
    }));
  },
  ["exam-catalog-v1"],
  { revalidate: EXAM_CACHE_TTL, tags: ["exam-catalog"] },
);

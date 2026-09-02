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

    const [validatedQuestionCount, newsItems, importantDates, pyqYears, systemMocks, examStats, rankBands] =
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
        // take:40 (was 24) — an exam that grows past 24 system mocks used
        // to silently hide its NEWEST papers (createdAt asc), so freshly
        // added ones like SSC CGL 2025 Shift 2/3 never rendered (20 Aug
        // 2026). 40 gives headroom; the mocks section still groups by kind.
        // Live-test papers are EXCLUDED from the hub list (22 Aug 2026):
        // they were listed with a direct "Take →" link a week before
        // opening, leaking the paper and voiding the student's ranked run.
        // Their home is /live-test (banner on the hub points there).
        prisma.mock
          .findMany({
            where: {
              examId: exam.id,
              userId: null,
              generatedBy: { not: "live-test" },
            },
            orderBy: [{ createdAt: "asc" }],
            take: 40,
            select: { id: true, title: true, type: true, questionIds: true, config: true },
          })
          .then(async (mocks) => {
            // The real-pattern full-length paper (1 Sep 2026) is the
            // NEWEST shared mock, so on flagship exams with 40+ older
            // shared mocks the createdAt-asc take(40) silently dropped
            // it — no hub tile, no FAQ entry. Always include it, first.
            const fp = await prisma.mock.findFirst({
              where: { examId: exam.id, userId: null, generatedBy: "system:full-pattern-v1" },
              select: { id: true, title: true, type: true, questionIds: true, config: true },
            });
            if (fp && !mocks.some((m) => m.id === fp.id)) return [fp, ...mocks];
            return mocks;
          }),
        // PRIVACY: no named leaderboard on the public page — other
        // students' names/scores must never show to anonymous visitors.
        // The page shows AGGREGATE participation stats to everyone;
        // an individual's own rank/percentile renders only for that
        // signed-in user (myBest, queried per-request in the page).
        prisma.$queryRaw<
          { students: number; attempts: number; avgpct: number | null; toppct: number | null }[]
        >`
          SELECT COUNT(DISTINCT a."userId")::int AS students,
                 COUNT(*)::int AS attempts,
                 AVG(a."scorePct")::float AS avgpct,
                 MAX(a."scorePct")::float AS toppct
          FROM "Attempt" a JOIN "Mock" m ON m.id = a."mockId"
          WHERE m."examId" = ${exam.id}
            AND a.status IN ('SUBMITTED','AUTO_SUBMITTED')
            AND a."scorePct" IS NOT NULL
        `.then((r) => ({
          students: r[0]?.students ?? 0,
          attempts: r[0]?.attempts ?? 0,
          avgPct: r[0]?.avgpct ?? null,
          topPct: r[0]?.toppct ?? null,
        })),
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
      examStats,
      rankBands,
    };
  },
  ["exam-shared-v2"],
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

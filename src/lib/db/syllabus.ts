// Builds the SyllabusContext object that AI services consume.
//
// Syllabus barely changes between deploys, but it's fetched on every tutor
// call (POST /api/chat) — at 10k concurrent students that would be ~5k+
// DB hits per second pulling the same rows. We wrap it in unstable_cache
// so each (examCode) reads from the in-memory Next data cache for up to 5
// minutes between revalidations.
//
// Exam facts (24 Sep 2026): the context also carries what the tutor's
// per-exam facts are built from — the pattern from the Exam row, the
// exam's tracker rows and which exam pages exist (src/lib/ai/exam-facts.ts).
// The chat route hands this object to tutorStream for signed-in AND guest
// chats, so this is the one place both get them. A failed facts read leaves
// `examFacts` unset and the syllabus still loads — the tutor answers as it
// did before, it never fails over a tracker read. 5 minutes is fine for the
// rows: the tracker refresh runs 3x a day.
//
// Only date-FREE data is cached here (review fix, 24 Sep 2026). In a route
// handler Next 15's unstable_cache returns a stale entry at once and
// revalidates in the background, so after a quiet night the first chat got
// the previous evening's "as of" day and an exam that is today still
// "upcoming". "Today", past/upcoming and the date window are worked out when
// the prompt is built (tutorSystemBlocks → buildTutorExamFacts). Cache key
// v3: a v2 entry holds the old, date-baked shape.

import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { realExamKey } from "./exam-scope";
import type { Exam } from "@prisma/client";
import type { SyllabusContext, TutorExamFactsSource } from "../ai/types";
import { loadExamPageGates } from "../exam-page-gates";
import { rowCitation } from "../exam-timeline";

/** Tracker rows read per exam. The busiest exam holds 43 live rows (24 Sep
 *  2026); past this the newest are kept and rowsComplete is false. */
export const TRACKER_ROW_LIMIT = 200;

type ExamRow = Pick<
  Exam,
  | "id"
  | "code"
  | "name"
  | "shortName"
  | "description"
  | "totalQuestions"
  | "scoredQuestions"
  | "totalMarks"
  | "marksPerQ"
  | "negativeMark"
  | "durationMin"
  | "languages"
>;

/**
 * Read everything buildTutorExamFacts needs for one exam, none of it
 * relative to today: every non-archived tracker row (as /updates shows
 * them — the facts builder picks what to list when the prompt is built),
 * page gates from the shared gate module, null when that read fails (the
 * block then says nothing about gated pages rather than guess). Returns
 * undefined on any other failure.
 */
export async function loadTutorExamFactsSource(exam: ExamRow): Promise<TutorExamFactsSource | undefined> {
  try {
    const [rowsNewestFirst, elig, fullPattern, pyq, papers, pages] = await Promise.all([
      prisma.examImportantDate.findMany({
        where: { examId: exam.id, archivedAt: null },
        orderBy: [{ date: "desc" }, { id: "desc" }],
        take: TRACKER_ROW_LIMIT,
        select: { id: true, label: true, date: true, isExamDay: true, kind: true, confidence: true, url: true, source: true },
      }),
      prisma.examEligibility.findUnique({ where: { examId: exam.id }, select: { officialUrl: true, officialName: true } }),
      prisma.mock
        .findFirst({ where: { examId: exam.id, userId: null, generatedBy: "system:full-pattern-v1" }, select: { id: true } })
        .then((m) => m != null),
      // Same rule as the PYQ year page: a year with no validated PYQ
      // question renders an empty page, so it is not offered.
      prisma.question.groupBy({
        by: ["pyqYear"],
        where: { examId: exam.id, source: "PYQ", pyqYear: { not: null }, validated: true },
        _count: true,
      }),
      // The hub's "has an official question paper" rule: anything but an
      // answer key alone or a listing page.
      prisma.$queryRaw<{ year: string }[]>`
        SELECT DISTINCT year FROM "OfficialPaper"
        WHERE "examId" = ${exam.id} AND "archivedAt" IS NULL AND kind NOT IN ('answer key', 'listing page')`,
      loadExamPageGates()
        .then((m) => m.get(exam.code) ?? null)
        .catch(() => null),
    ]);
    return {
      exam: {
        code: exam.code,
        name: exam.name,
        shortName: exam.shortName,
        description: exam.description,
        totalQuestions: exam.totalQuestions,
        scoredQuestions: exam.scoredQuestions,
        totalMarks: exam.totalMarks,
        marksPerQ: exam.marksPerQ,
        negativeMark: exam.negativeMark,
        durationMin: exam.durationMin,
        languages: exam.languages.map(String),
      },
      // Oldest first, as the tracker lists them; JSON-safe for the cache.
      rows: [...rowsNewestFirst].reverse().map((r) => ({
        id: r.id,
        label: r.label,
        date: r.date.toISOString(),
        isExamDay: r.isExamDay,
        kind: r.kind ?? null,
        confidence: r.confidence ?? null,
        url: rowCitation(r),
      })),
      rowsComplete: rowsNewestFirst.length < TRACKER_ROW_LIMIT,
      officialUrl: elig?.officialUrl ?? null,
      officialName: elig?.officialName ?? null,
      pages,
      fullPatternMock: fullPattern,
      pyqYears: pyq.map((p) => p.pyqYear).filter((y): y is number => y != null),
      officialPaperYears: papers.map((p) => p.year),
    };
  } catch (err) {
    console.warn(`[syllabus] exam facts read failed for ${exam.code}:`, (err as Error)?.message ?? err);
    return undefined;
  }
}

export async function buildSyllabusContext(examCode: string): Promise<SyllabusContext> {
  // 26 Sep 2026: realExamKey — a SCHOOL_BOARD container throws "Exam not
  // found" like an unknown code, so the tutor, /api/exams/[code]/syllabus,
  // mocks and the adaptive quiz never build a syllabus for a school class.
  const exam = await prisma.exam.findUnique({
    where: realExamKey({ code: examCode }),
    include: {
      subjects: {
        orderBy: { orderIdx: "asc" },
        include: {
          topics: {
            where: { parentId: null },
            orderBy: { orderIdx: "asc" },
            include: {
              children: { orderBy: { orderIdx: "asc" } },
            },
          },
        },
      },
    },
  });
  if (!exam) throw new Error(`Exam not found: ${examCode}`);

  const examFacts = await loadTutorExamFactsSource(exam);

  return {
    examCode: exam.code,
    examName: exam.name,
    examShortName: exam.shortName,
    subjects: exam.subjects.map((s) => ({
      code: s.code,
      name: s.name,
      weight: s.weight,
      topics: s.topics.map((t) => ({
        code: t.code,
        name: t.name,
        description: t.description ?? undefined,
        subtopics: t.children.map((c) => ({
          code: c.code,
          name: c.name,
          description: c.description ?? undefined,
        })),
      })),
    })),
    ...(examFacts ? { examFacts } : {}),
  };
}

export const getSyllabusContext = unstable_cache(
  buildSyllabusContext,
  ["syllabus-v3"],
  { revalidate: 300, tags: ["syllabus"] }, // 5 min TTL
);

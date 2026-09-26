// Share-card data (26 Sep 2026, share-images group) — reads the same rows the
// pages render, for the per-page cards (src/lib/og/page-card-text.ts turns
// them into words). Resolution mirrors each page's own resolve():
//   • school: the seeded class (getLiveSchoolClass — the cached surface the
//     pages, sitemap and llms-full.txt share), else the 25 Sep hardcoded form
//     (findClassSyllabus / findSubject / findChapter);
//   • current affairs: the CurrentAffair rows of that IST date;
//   • entrance: the catalogue groups /exams/entrance renders.
// An image route must not 500 (GSC "Server error (5xx)" on exam cards, 2 Sep
// 2026): a failed read gives a plainer card that is still true — the board
// and class only, "Daily current affairs", the entrance title's own list —
// never a claim the page might not make.

import { prisma } from "@/lib/db/prisma";
import { getExamCatalog } from "@/lib/db/exam-cache";
import { ENTRANCE_GROUPS, entranceGroupOf } from "@/lib/exam-kind";
import { chapterLabel, cisceSubjectLinks, cisceSubjectsWithPdf, ncertBooksForSubject, ncertChapterMeta } from "@/lib/school/books";
import { getLiveSchoolClass, getSchoolOfficialLinks } from "@/lib/school/db";
import { hasSchoolGuestQuiz } from "@/lib/school/scope";
import { parseSchoolClassSlug, type SchoolSurfaceChapter, type SchoolSurfaceClass } from "@/lib/school/surface";
import { findBoard, type Board } from "@/lib/schooling-data";
import { findClassSyllabus, findChapter, findSubject, mainBooks } from "@/lib/schooling-subjects";
import {
  isCurrentAffairsDate,
  istDate,
  type CurrentAffairsCardInput,
  type SchoolChapterCardInput,
  type SchoolClassCardInput,
  type SchoolOursCounts,
  type SchoolSubjectCardInput,
} from "./page-card-text";

/** Chapters, and how many have Shishya notes / checked practice / both. */
export function schoolOursCounts(chapters: readonly Pick<SchoolSurfaceChapter, "hasNotes" | "validatedQuestions">[]): SchoolOursCounts {
  let both = 0;
  let notes = 0;
  let practice = 0;
  for (const ch of chapters) {
    const quiz = hasSchoolGuestQuiz(ch);
    if (ch.hasNotes && quiz) both++;
    if (ch.hasNotes) notes++;
    if (quiz) practice++;
  }
  return { chapters: chapters.length, both, notes, practice };
}

/** NCERT chapters whose official chapter PDF is known (the class's DB link
 *  rows when read, else the committed spine's pdfUrl). */
export function ncertPdfChapters(
  cls: number,
  chapters: readonly Pick<SchoolSurfaceChapter, "code">[],
  byChapter: Readonly<Record<string, string>> | null = null,
): number {
  return chapters.filter((c) => Boolean(byChapter?.[c.code] ?? ncertChapterMeta(cls, c.code)?.pdfUrl)).length;
}

/** A /schooling/{board}/class-{n} segment, resolved as the pages resolve it. */
export type SchoolClassResolved =
  | { kind: "unknown" }
  /** The seeded-surface read failed: say only the board and class. */
  | { kind: "unread"; board: Board; cls: number }
  | { kind: "live"; board: Board; cls: number; live: SchoolSurfaceClass }
  | { kind: "legacy"; board: Board; cls: number };

export async function resolveSchoolClass(slug: string, classSlug: string): Promise<SchoolClassResolved> {
  const board = findBoard(slug);
  const cls = parseSchoolClassSlug(classSlug);
  if (!board || cls === null || !board.classes.includes(cls)) return { kind: "unknown" };
  try {
    const live = await getLiveSchoolClass(slug, cls);
    return live ? { kind: "live", board, cls, live } : { kind: "legacy", board, cls };
  } catch {
    return { kind: "unread", board, cls };
  }
}

/** Pure over the resolved class (tests and probes call it with surface rows). */
export function schoolClassInputOf(r: SchoolClassResolved): SchoolClassCardInput {
  if (r.kind === "unknown") return { kind: "unknown" };
  if (r.kind === "unread") return { kind: "plain", boardShortName: r.board.shortName, cls: r.cls };
  if (r.kind === "legacy") {
    return { kind: "legacy", boardSlug: r.board.slug, boardShortName: r.board.shortName, cls: r.cls, hasSyllabus: Boolean(findClassSyllabus(r.board.slug, r.cls)) };
  }
  const { live, board, cls } = r;
  return {
    kind: "live",
    boardShortName: board.shortName,
    cls,
    curriculum: live.curriculum,
    subjectNames: live.subjects.map((s) => s.name),
    ours: schoolOursCounts(live.subjects.flatMap((s) => s.chapters)),
    pdfChapters: live.curriculum === "NCERT" ? ncertPdfChapters(cls, live.subjects.flatMap((s) => s.chapters)) : 0,
    ciscePdfSubjects: live.curriculum === "CISCE" ? cisceSubjectsWithPdf(cls, live.subjects.map((s) => s.name)) : 0,
  };
}

export async function schoolClassCardInput(slug: string, classSlug: string): Promise<SchoolClassCardInput> {
  return schoolClassInputOf(await resolveSchoolClass(slug, classSlug));
}

export function schoolSubjectInputOf(r: SchoolClassResolved, subjectSlug: string): SchoolSubjectCardInput {
  if (r.kind === "live") {
    const { live, board, cls } = r;
    const subject = live.subjects.find((s) => s.slug === subjectSlug);
    if (!subject) return { kind: "class", classInput: schoolClassInputOf(r) };
    const isNcert = live.curriculum === "NCERT";
    const ours = schoolOursCounts(subject.chapters);
    const books = isNcert ? ncertBooksForSubject(cls, subject.code) : [];
    return {
      kind: "live",
      boardShortName: board.shortName,
      cls,
      curriculum: live.curriculum,
      subjectName: subject.name,
      ours,
      pdfChapters: isNcert ? ncertPdfChapters(cls, subject.chapters) : 0,
      noBook: isNcert && books.length === 0 && ours.chapters === 0,
      subjectPdf: !isNcert && cisceSubjectLinks(cls, subject.name).length > 0,
    };
  }
  if (r.kind === "legacy") {
    const s = findSubject(r.board.slug, r.cls, subjectSlug);
    if (s) return { kind: "legacy", boardShortName: r.board.shortName, cls: r.cls, subjectName: s.name, hasBooks: mainBooks(s).length > 0 };
  }
  return { kind: "class", classInput: schoolClassInputOf(r) };
}

export async function schoolSubjectCardInput(slug: string, classSlug: string, subjectSlug: string): Promise<SchoolSubjectCardInput> {
  return schoolSubjectInputOf(await resolveSchoolClass(slug, classSlug), subjectSlug);
}

/** Pure over the resolved class and the class's official chapter links
 *  (`byChapter`: Topic.code → PDF URL; null when the read failed). */
export function schoolChapterInputOf(
  r: SchoolClassResolved,
  subjectSlug: string,
  chapterSlug: string,
  byChapter: Readonly<Record<string, string>> | null,
): SchoolChapterCardInput {
  if (r.kind === "live") {
    const { live, board, cls } = r;
    const subject = live.subjects.find((s) => s.slug === subjectSlug);
    const chapter = subject?.chapters.find((c) => c.slug === chapterSlug);
    if (subject && chapter) {
      const meta = ncertChapterMeta(cls, chapter.code);
      return {
        kind: "live",
        boardShortName: board.shortName,
        cls,
        subjectName: subject.name,
        label: chapterLabel(meta),
        hasNotes: chapter.hasNotes,
        quiz: hasSchoolGuestQuiz(chapter),
        // The page links links.byChapter ?? the spine's pdfUrl ?? the notes'
        // own official URL; the first two are checked here (no link known =
        // no claim).
        officialPdf: Boolean(byChapter?.[chapter.code] ?? meta?.pdfUrl),
      };
    }
  } else if (r.kind === "legacy") {
    const s = findSubject(r.board.slug, r.cls, subjectSlug);
    const ch = findChapter(r.board.slug, r.cls, subjectSlug, chapterSlug);
    if (s && ch) return { kind: "legacy", boardShortName: r.board.shortName, cls: r.cls, subjectName: s.name, number: ch.number };
  }
  return { kind: "subject", subjectInput: schoolSubjectInputOf(r, subjectSlug) };
}

export async function schoolChapterCardInput(
  slug: string,
  classSlug: string,
  subjectSlug: string,
  chapterSlug: string,
): Promise<SchoolChapterCardInput> {
  const r = await resolveSchoolClass(slug, classSlug);
  const links = r.kind === "live" ? await getSchoolOfficialLinks(r.live.examCode).catch(() => null) : null;
  return schoolChapterInputOf(r, subjectSlug, chapterSlug, links?.byChapter ?? null);
}

/** The digest's rows for a date, grouped by category in the page's order
 *  (ORDER BY category). A failed read = no rows (the generic card). */
export async function currentAffairsCardInput(date: string, now: Date = new Date()): Promise<CurrentAffairsCardInput> {
  const today = istDate(now);
  if (!isCurrentAffairsDate(date)) return { date, count: 0, categories: [], today };
  const rows = await prisma
    .$queryRawUnsafe<{ category: string; n: number }[]>(
      `SELECT category, count(*)::int AS n FROM "CurrentAffair" WHERE date = $1::date GROUP BY category ORDER BY category`,
      date,
    )
    .catch(() => [] as { category: string; n: number }[]);
  return { date, count: rows.reduce((sum, r) => sum + Number(r.n), 0), categories: rows.map((r) => r.category), today };
}

/** The ENTRANCE_GROUPS labels with at least one exam in the catalogue — the
 *  sections /exams/entrance renders; [] on a failed read. */
export async function entranceGroupLabels(): Promise<string[]> {
  try {
    const catalog = await getExamCatalog();
    const keys = new Set<string>();
    for (const e of catalog) {
      if (e.category === "SCHOOL_BOARD") continue;
      const g = entranceGroupOf({ code: e.code, category: String(e.category) });
      if (g) keys.add(g);
    }
    return ENTRANCE_GROUPS.filter((g) => keys.has(g.key)).map((g) => g.label);
  } catch {
    return [];
  }
}

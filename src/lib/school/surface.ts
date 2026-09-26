// School search surface (26 Sep 2026): the one loader the sitemap,
// llms-full.txt and the class / subject context.md files read the school
// section from, plus the URL rules every school page shares.
//
// Why: on 26 Sep 2026 the founder decided the school section goes live and
// discoverable — someone searching Google, ChatGPT or any agent for a school
// chapter must find Shishya's page. The section had left every search surface
// on 25 Sep (noindex, out of the sitemap, off llms.txt / robots) because
// nothing on it was checked content. The DB now holds the official NCERT /
// CISCE spine (scripts/seed-school-spine.ts: one SCHOOL_BOARD Exam per
// (curriculum, class), one Subject per subject, one Topic per verified
// chapter) and, chapter by chapter, Shishya's own notes (TopicTeachingNote)
// and answer-checked practice questions (Question rows, validated) written by
// scripts/school-content-batch.ts.
//
// Rules:
//   * Board and class pages are always indexable: they list the official
//     structure with the official links. A subject page is indexable only
//     when it lists chapters (isSchoolSubjectIndexable, 26 Sep 2026) — one
//     that is only an official book or syllabus link is noindex,follow.
//   * A chapter page is indexable only when Shishya has something of its own
//     there — usable notes (src/lib/topic-notes.ts) or a checked guest quiz
//     (>= SCHOOL_GUEST_QUIZ_MIN validated, non-withdrawn MCQs on the chapter
//     and its pieces). ONE rule, src/lib/school/scope.ts
//     isSchoolChapterIndexable, shared with the chapter page's robots meta.
//     A bare chapter page (title, book, official link, "not ready yet") stays
//     off the sitemap: a thin page in the index is the 17 Sep not-indexed
//     clean-up all over again.
//   * School containers by CATEGORY and code, never by `active`
//     (SCHOOL_CONTAINER_WHERE, src/lib/school/scope.ts): every school row was
//     seeded active=false and stays so — `active` means "a real exam whose
//     bank is open", and the real-exam surfaces keep school rows out by
//     category. tests/unit/exam-scope-guard.test.ts allow-lists this file for
//     exactly that. Go-live is per chapter, by content.
//   * Counts are computed from the rows, never typed.
//   * lastModified only from real timestamps — a note's updatedAt, a
//     validated question's updatedAt, the Exam row's own updatedAt — never
//     new Date() (the 25 Aug 2026 sitemap honesty rule).
//   * No textbook text and no chapter body leaves this module: names, codes,
//     counts and dates only.
//
// URL scheme — the pages under src/app/schooling/** build their links and
// resolve their params with THESE helpers, so the sitemap, the context files
// and the pages can never disagree:
//   /schooling/{board}                        board = "cbse" (NCERT_Cnn) | "icse-cisce" (CISCE_Cnn)
//   /schooling/{board}/class-{n}
//   /schooling/{board}/class-{n}/{subject}    subject = lower-kebab of Subject.code
//   /schooling/{board}/class-{n}/{subject}/{chapter}
//       chapter = kebab of Topic.name; when two books of one subject print the
//       same chapter title (Class 12 Geography Part I / II "Transport and
//       Communication", Class 10 First Flight vs Words and Expressions 2 …)
//       the slug carries the NCERT book code: "introduction-leec1". 10 of the
//       1,146 seeded chapters needed that on 26 Sep 2026. When ONE book prints
//       a title more than once (Class 9 Skill Education, "Additional
//       Vocations" ×3 in iekv1) the second and later carry the whole
//       Topic.code: "additional-vocations-iekv1-ch08" — three chapters on one
//       URL would all have served chapter 4 (fixer, 26 Sep 2026).
//   /schooling/{board}/class-{n}/context.md  and  …/{subject}/context.md
//
// What the DB rows cannot say — whether NCERT publishes a book for a subject
// at all, CISCE's per-subject syllabus PDFs vs one stage document — comes
// from the committed spine through an optional resolver (SchoolDocsResolver,
// passed by sitemap.ts and llms-full.txt as context.ts schoolClassIdentity),
// so this module still never imports the curriculum JSON itself.
//
// Cached SCHOOL_REVALIDATE seconds (unstable_cache, tag "school-surface"):
// the sitemap, llms-full.txt and every context.md fetch share one pair of
// reads. Dates are ISO strings in the cached shape — unstable_cache
// round-trips through JSON, so a Date would come back as a string anyway.

import { unstable_cache } from "next/cache";
import type { MetadataRoute } from "next";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { SCHOOL_CATEGORY } from "@/lib/db/exam-scope";
import { WITHDRAWN_TAG } from "@/lib/question-withdrawn";
import { usableNotesSql } from "@/lib/topic-notes";
import { SCHOOL_CONTAINER_WHERE, SCHOOL_GUEST_QUIZ_MIN, SCHOOL_REVALIDATE, isSchoolChapterIndexable } from "./scope";

// ── Boards, classes, codes ─────────────────────────────────────────────

export type SchoolCurriculum = "NCERT" | "CISCE";

export interface SchoolBoardInfo {
  curriculum: SchoolCurriculum;
  /** The /schooling/{board} segment (src/lib/schooling-data.ts BOARDS slugs). */
  slug: string;
  shortName: string;
  /** How a class of this board is named on machine surfaces. */
  label: string;
}

/** The two curricula the DB holds (seed-school-spine.ts). CBSE prescribes NCERT
 *  textbooks, so the NCERT_Cnn trees sit under /schooling/cbse. */
export const SCHOOL_BOARDS: readonly SchoolBoardInfo[] = [
  { curriculum: "NCERT", slug: "cbse", shortName: "CBSE", label: "CBSE (NCERT textbooks)" },
  { curriculum: "CISCE", slug: "icse-cisce", shortName: "ICSE / ISC", label: "CISCE (ICSE / ISC)" },
];

const EXAM_CODE = /^(NCERT|CISCE)_C(0[1-9]|1[0-2])$/;

/** The board a school container belongs to, from its Exam.code; null for a
 *  code this surface has no URL for (a future state-board container). */
export function schoolBoardForExamCode(code: string): SchoolBoardInfo | null {
  const m = EXAM_CODE.exec(code);
  return m ? (SCHOOL_BOARDS.find((b) => b.curriculum === m[1]) ?? null) : null;
}

/** NCERT_C06 → 6; null when the code is not a school container code. */
export function schoolClassOfExamCode(code: string): number | null {
  const m = EXAM_CODE.exec(code);
  return m ? Number(m[2]) : null;
}

/** ("cbse", 6) → NCERT_C06; null for a board slug this surface does not serve. */
export function schoolExamCode(boardSlug: string, cls: number): string | null {
  const board = SCHOOL_BOARDS.find((b) => b.slug === boardSlug);
  if (!board || !Number.isInteger(cls) || cls < 1 || cls > 12) return null;
  return `${board.curriculum}_C${String(cls).padStart(2, "0")}`;
}

/** "class-6" → 6; null for anything else (the pages 404 on null). */
export function parseSchoolClassSlug(classSlug: string): number | null {
  const m = /^class-([1-9]|1[0-2])$/.exec(classSlug);
  return m ? Number(m[1]) : null;
}

// ── Slugs ─────────────────────────────────────────────────────────────

/** Lower-case, ASCII letters and digits, hyphen-joined; diacritics folded
 *  ("Baudhāyana" → "baudhayana"). */
export function kebab(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Subject.code → URL segment: SOCIAL_SCIENCE → social-science. */
export function schoolSubjectSlug(code: string): string {
  return code.toLowerCase().replace(/_/g, "-");
}

/** URL segment → Subject.code: social-science → SOCIAL_SCIENCE. */
export function schoolSubjectCodeFromSlug(slug: string): string {
  return slug.toUpperCase().replace(/-/g, "_");
}

/** The NCERT book code in a chapter Topic.code: "fegp1.ch01" → "fegp1"
 *  ("iemh1-2026.ch03" → "iemh1-2026" keeps an edition tag). */
export function schoolBookCodeOf(topicCode: string): string {
  const i = topicCode.indexOf(".ch");
  return i > 0 ? topicCode.slice(0, i) : topicCode;
}

/** Chapter slugs for the chapters of ONE subject, keyed by Topic.code: the
 *  kebab title, plus "-{bookCode}" wherever two chapters of the subject share
 *  a title (or a title has no ASCII letters at all). Deterministic for a
 *  given chapter list, so pages and sitemap agree. */
export function schoolChapterSlugs<T extends { code: string; name: string }>(chapters: readonly T[]): Map<string, string> {
  const base = new Map<string, string>();
  const count = new Map<string, number>();
  for (const c of chapters) {
    const k = kebab(c.name);
    base.set(c.code, k);
    count.set(k, (count.get(k) ?? 0) + 1);
  }
  const out = new Map<string, string>();
  const taken = new Set<string>();
  for (const c of chapters) {
    const k = base.get(c.code) ?? "";
    const dup = k === "" || (count.get(k) ?? 0) > 1;
    let slug = dup ? `${k ? `${k}-` : ""}${kebab(schoolBookCodeOf(c.code))}` : k;
    // 26 Sep 2026 (pages builder): one book can print the same title more than
    // once (Class 9 Skill Education lists "Additional Vocations" three times in
    // iekv1), so the book code alone left three chapters on one URL. A slug
    // already taken falls back to the whole Topic.code: "additional-vocations-iekv1-ch08".
    if (taken.has(slug)) slug = `${k ? `${k}-` : ""}${kebab(c.code)}`;
    taken.add(slug);
    out.set(c.code, slug);
  }
  return out;
}

/** The chapter of a subject that a URL segment names, or undefined. */
export function findSchoolChapterBySlug<T extends { code: string; name: string }>(chapters: readonly T[], slug: string): T | undefined {
  const slugs = schoolChapterSlugs(chapters);
  return chapters.find((c) => slugs.get(c.code) === slug);
}

// ── Paths ─────────────────────────────────────────────────────────────

export function schoolBoardPath(boardSlug: string): string {
  return `/schooling/${boardSlug}`;
}
export function schoolClassPath(boardSlug: string, cls: number): string {
  return `${schoolBoardPath(boardSlug)}/class-${cls}`;
}
export function schoolSubjectPath(boardSlug: string, cls: number, subjectSlug: string): string {
  return `${schoolClassPath(boardSlug, cls)}/${subjectSlug}`;
}
export function schoolChapterPath(boardSlug: string, cls: number, subjectSlug: string, chapterSlug: string): string {
  return `${schoolSubjectPath(boardSlug, cls, subjectSlug)}/${chapterSlug}`;
}

// ── The indexable rule ────────────────────────────────────────────────

/** Validated, non-withdrawn MCQs a chapter needs to be indexable without
 *  notes — the guest quiz's own minimum (src/lib/school/scope.ts). */
export const CHAPTER_INDEXABLE_MIN_QUESTIONS: number = SCHOOL_GUEST_QUIZ_MIN;

export { isSchoolChapterIndexable };

// ── Surface shape ─────────────────────────────────────────────────────

export interface SchoolSurfaceChapter {
  /** Topic.code, e.g. fegp1.ch01. */
  code: string;
  /** Topic.name — the chapter title as NCERT prints it. */
  name: string;
  orderIdx: number;
  slug: string;
  bookCode: string;
  hasNotes: boolean;
  /** Validated, non-withdrawn MCQs on the chapter and its pieces. */
  validatedQuestions: number;
  /** ISO timestamps; null when there is nothing of ours on the chapter. */
  noteUpdatedAt: string | null;
  questionsUpdatedAt: string | null;
  indexable: boolean;
  /** Newest of the two timestamps above; null without Shishya content. */
  lastModified: string | null;
}

export interface SchoolSurfaceSubject {
  code: string;
  name: string;
  slug: string;
  orderIdx: number;
  /** Top-level chapters only (pieces inside a chapter PDF are child topics of
   *  their chapter and have no page of their own). */
  chapters: SchoolSurfaceChapter[];
  /** Newest chapter lastModified; null when no chapter has Shishya content. */
  lastModified: string | null;
}

export interface SchoolSurfaceClass {
  examCode: string;
  curriculum: SchoolCurriculum;
  boardSlug: string;
  cls: number;
  /** Exam.name, e.g. "NCERT Class 6". */
  name: string;
  /** Exam.updatedAt (ISO) — the row's own timestamp, the class page's fallback lastmod. */
  updatedAt: string;
  subjects: SchoolSurfaceSubject[];
  /** Newest subject lastModified; null when the class has no Shishya content. */
  lastModified: string | null;
}

export interface SchoolSurface {
  /** School containers this surface has a URL for, by Exam.code. */
  classes: SchoolSurfaceClass[];
  /** ISO time of the DB read (the data-as-of line on machine files). */
  readAt: string;
}

export interface SchoolSurfaceCounts {
  boards: number;
  classes: number;
  subjects: number;
  chapters: number;
  chaptersWithNotes: number;
  chaptersWithPractice: number;
  indexableChapters: number;
}

export function schoolSurfaceCounts(surface: Pick<SchoolSurface, "classes">): SchoolSurfaceCounts {
  const out: SchoolSurfaceCounts = { boards: 0, classes: 0, subjects: 0, chapters: 0, chaptersWithNotes: 0, chaptersWithPractice: 0, indexableChapters: 0 };
  const boards = new Set<string>();
  for (const c of surface.classes) {
    boards.add(c.boardSlug);
    out.classes++;
    for (const s of c.subjects) {
      out.subjects++;
      for (const ch of s.chapters) {
        out.chapters++;
        if (ch.hasNotes) out.chaptersWithNotes++;
        if (ch.validatedQuestions >= CHAPTER_INDEXABLE_MIN_QUESTIONS) out.chaptersWithPractice++;
        if (ch.indexable) out.indexableChapters++;
      }
    }
  }
  out.boards = boards.size;
  return out;
}

export function classCounts(c: Pick<SchoolSurfaceClass, "subjects">): SchoolSurfaceCounts {
  return schoolSurfaceCounts({ classes: [{ subjects: c.subjects } as SchoolSurfaceClass] });
}

// ── What the spine adds: official documents per subject ───────────────

/** Per subject, what the committed curriculum spine knows and the DB rows do
 *  not: NCERT's books (or an index entry with no book yet) and CISCE's
 *  per-subject syllabus PDFs. Structurally src/lib/school/context.ts
 *  SchoolSubjectIdentity. */
export interface SchoolSubjectDocs {
  books: readonly unknown[];
  syllabusUrls: readonly string[];
  /** NCERT index entries that name the subject but publish no book yet. */
  notYetPublished?: readonly string[];
}

/** Per class: its subjects' documents and CISCE's stage document (Classes
 *  1-8 have one curriculum PDF for the stage and no per-subject syllabus).
 *  Structurally context.ts SchoolClassIdentity, so the callers pass
 *  schoolClassIdentity straight in. */
export interface SchoolClassDocs {
  subjects: ReadonlyMap<string, SchoolSubjectDocs>;
  levelDocument: { title: string; url: string } | null;
}

/** 26 Sep 2026 (fixer): resolves a class's documents from the spine. Without
 *  it llms-full.txt printed "official syllabus link" for every CISCE subject
 *  of Classes 1-8 (the council publishes no per-subject PDF there) and the
 *  sitemap listed NCERT Class 9 ICT — a subject with no book and no chapter,
 *  a page of one sentence. */
export type SchoolDocsResolver = (curriculum: SchoolCurriculum, cls: number) => SchoolClassDocs | null;

/** A subject page is indexable only when it lists chapters (each with its
 *  official chapter PDF).
 *
 *  26 Sep 2026 (G1 index hygiene): until today a subject page also counted
 *  as indexable when it linked one official document of its own — an NCERT
 *  book, a CISCE syllabus PDF — or sat under a CISCE stage document. Such a
 *  page is the official link and nothing more (a bare link in the index is
 *  what Google's scaled-content policy demotes), so it now renders
 *  noindex,follow and leaves the sitemap: all 199 CISCE subject pages (CISCE
 *  prescribes syllabuses, not one textbook series — no chapter list) and the
 *  35 NCERT subject pages whose book chapters are not seeded (Hindi, Urdu,
 *  Sanskrit, Sangeet, Creative Writing and Translation), plus NCERT Class 9
 *  ICT which was already out. The 90 NCERT subject pages with a chapter list
 *  stay indexable; board and class pages are unchanged. Counts from
 *  scripts/tmp-w2-g1-school.ts on 26 Sep 2026.
 *
 *  `docs` (the spine resolver) no longer decides anything; the parameter
 *  stays so the pages, the sitemap and llms-full.txt keep one call shape. */
export function isSchoolSubjectIndexable(s: Pick<SchoolSurfaceSubject, "code" | "chapters">, docs?: SchoolClassDocs | null): boolean {
  void docs;
  return s.chapters.length > 0;
}

// ── DB read ───────────────────────────────────────────────────────────

const iso = (d: Date | string | null | undefined): string | null => (d == null ? null : d instanceof Date ? d.toISOString() : String(d));
const newest = (...xs: (string | null)[]): string | null => xs.reduce<string | null>((m, x) => (x && (!m || x > m) ? x : m), null);

/** Raw twin of SCHOOL_CONTAINER_WHERE for "Exam" e: the category only, no
 *  `active` test (see the header). */
const SCHOOL_CONTAINER_SQL: Prisma.Sql = Prisma.raw(`e."category"::text = '${SCHOOL_CATEGORY}'`);

interface ExamRow {
  code: string;
  name: string;
  updatedAt: Date;
  subjects: { code: string; name: string; orderIdx: number }[];
}

interface ChapterRow {
  examCode: string;
  subjectCode: string;
  code: string;
  name: string;
  orderIdx: number;
  hasNotes: boolean;
  noteUpdatedAt: Date | null;
  validatedQuestions: number;
  questionsUpdatedAt: Date | null;
}

/** Two reads: the school containers with their subjects, and every top-level
 *  chapter with its content flags. Throws on a failed read; the callers fall
 *  back to an EMPTY surface (a smaller machine surface beats a wrong one —
 *  the sitemap rule). */
export async function readSchoolSurface(now: Date = new Date()): Promise<SchoolSurface> {
  const exams: ExamRow[] = await prisma.exam.findMany({
    where: SCHOOL_CONTAINER_WHERE,
    select: {
      code: true,
      name: true,
      updatedAt: true,
      subjects: { select: { code: true, name: true, orderIdx: true }, orderBy: [{ orderIdx: "asc" }, { code: "asc" }] },
    },
    orderBy: { code: "asc" },
  });
  if (exams.length === 0) return { classes: [], readAt: now.toISOString() };

  // The practice count is the chapter page's own (src/lib/school/scope.ts
  // SCHOOL_SERVABLE_QUESTION_WHERE): validated MCQs not withdrawn, on the
  // chapter and its pieces (a piece is a child Topic of its chapter). The
  // aggregate joins by examId — school questions carry their container's id
  // (checked 26 Sep 2026) — so the (examId, topicId) index does the work and
  // no row of a real exam is counted.
  const rows = await prisma.$queryRaw<ChapterRow[]>`
    SELECT e.code AS "examCode", s.code AS "subjectCode", t.code, t.name, t."orderIdx",
      ${usableNotesSql(Prisma.sql`tn.content`)} AS "hasNotes",
      tn."updatedAt" AS "noteUpdatedAt",
      COALESCE(q.n, 0)::int AS "validatedQuestions",
      q."updatedAt" AS "questionsUpdatedAt"
    FROM "Topic" t
    JOIN "Subject" s ON s.id = t."subjectId"
    JOIN "Exam" e ON e.id = s."examId"
    LEFT JOIN "TopicTeachingNote" tn ON tn."topicId" = t.id
    LEFT JOIN (
      SELECT COALESCE(qt."parentId", qt.id) AS "chapterId", COUNT(*)::int AS n, MAX(q."updatedAt") AS "updatedAt"
      FROM "Question" q
      JOIN "Topic" qt ON qt.id = q."topicId"
      WHERE q."examId" IN (SELECT e.id FROM "Exam" e WHERE ${SCHOOL_CONTAINER_SQL})
        AND q.validated = TRUE AND q.type = 'MCQ' AND NOT (${WITHDRAWN_TAG} = ANY(q.tags))
      GROUP BY COALESCE(qt."parentId", qt.id)
    ) q ON q."chapterId" = t.id
    WHERE ${SCHOOL_CONTAINER_SQL} AND t."parentId" IS NULL
    ORDER BY e.code, s."orderIdx", t."orderIdx", t.code`;

  const byExamSubject = new Map<string, ChapterRow[]>();
  for (const r of rows) {
    const k = `${r.examCode}|${r.subjectCode}`;
    byExamSubject.set(k, [...(byExamSubject.get(k) ?? []), r]);
  }

  const classes: SchoolSurfaceClass[] = [];
  for (const e of exams) {
    const board = schoolBoardForExamCode(e.code);
    const cls = schoolClassOfExamCode(e.code);
    // A SCHOOL_BOARD row whose code this surface has no URL for (a state
    // board container seeded later) is skipped until its pages exist.
    if (!board || cls === null) continue;
    const subjects: SchoolSurfaceSubject[] = e.subjects.map((s) => {
      const chapterRows = byExamSubject.get(`${e.code}|${s.code}`) ?? [];
      const slugs = schoolChapterSlugs(chapterRows);
      const chapters: SchoolSurfaceChapter[] = chapterRows.map((r) => {
        const hasNotes = r.hasNotes === true;
        const validatedQuestions = Number(r.validatedQuestions ?? 0);
        const noteUpdatedAt = hasNotes ? iso(r.noteUpdatedAt) : null;
        const questionsUpdatedAt = validatedQuestions > 0 ? iso(r.questionsUpdatedAt) : null;
        return {
          code: r.code,
          name: r.name,
          orderIdx: r.orderIdx,
          slug: slugs.get(r.code) ?? kebab(r.name),
          bookCode: schoolBookCodeOf(r.code),
          hasNotes,
          validatedQuestions,
          noteUpdatedAt,
          questionsUpdatedAt,
          indexable: isSchoolChapterIndexable({ hasNotes, validatedQuestions }),
          lastModified: newest(noteUpdatedAt, questionsUpdatedAt),
        };
      });
      return {
        code: s.code,
        name: s.name,
        slug: schoolSubjectSlug(s.code),
        orderIdx: s.orderIdx,
        chapters,
        lastModified: newest(...chapters.map((c) => c.lastModified)),
      };
    });
    classes.push({
      examCode: e.code,
      curriculum: board.curriculum,
      boardSlug: board.slug,
      cls,
      name: e.name,
      updatedAt: e.updatedAt.toISOString(),
      subjects,
      lastModified: newest(...subjects.map((s) => s.lastModified)),
    });
  }
  return { classes, readAt: now.toISOString() };
}

const cachedSurface = unstable_cache(async (): Promise<SchoolSurface> => readSchoolSurface(), ["school-surface-v1"], {
  revalidate: SCHOOL_REVALIDATE,
  tags: ["school-surface"],
});

/** The school surface, cached SCHOOL_REVALIDATE seconds. Throws on a failed read. */
export async function loadSchoolSurface(): Promise<SchoolSurface> {
  return cachedSurface();
}

/** The empty surface every machine caller falls back to on a failed read. */
export const EMPTY_SCHOOL_SURFACE: SchoolSurface = { classes: [], readAt: "" };

/** One class of the surface by (board slug, class number); undefined when
 *  the board is unknown or the class has no container. */
export function findSchoolClass(surface: Pick<SchoolSurface, "classes">, boardSlug: string, cls: number): SchoolSurfaceClass | undefined {
  const code = schoolExamCode(boardSlug, cls);
  return code ? surface.classes.find((c) => c.examCode === code) : undefined;
}

// ── Sitemap ───────────────────────────────────────────────────────────

const date = (s: string | null | undefined): Date | undefined => (s ? new Date(s) : undefined);

/** Sitemap entries for the school section: each board with a class, every
 *  class, every INDEXABLE subject (isSchoolSubjectIndexable — one with a
 *  chapter list, 26 Sep 2026), and every INDEXABLE chapter. lastModified: a
 *  chapter's own content timestamp; a subject's newest chapter (omitted when
 *  it has none); a class's newest subject, else the Exam row's updatedAt; a
 *  board's newest class. */
export function schoolSitemapEntries(surface: Pick<SchoolSurface, "classes">, base: string, docs?: SchoolDocsResolver): MetadataRoute.Sitemap {
  const out: MetadataRoute.Sitemap = [];
  const boardMod = new Map<string, string | null>();
  for (const c of surface.classes) {
    const classMod = c.lastModified ?? c.updatedAt;
    boardMod.set(c.boardSlug, newest(boardMod.get(c.boardSlug) ?? null, classMod));
  }
  for (const b of SCHOOL_BOARDS) {
    if (!boardMod.has(b.slug)) continue;
    out.push({ url: `${base}${schoolBoardPath(b.slug)}`, lastModified: date(boardMod.get(b.slug)), changeFrequency: "weekly", priority: 0.8 });
  }
  for (const c of surface.classes) {
    const cd = docs?.(c.curriculum, c.cls) ?? null;
    out.push({ url: `${base}${schoolClassPath(c.boardSlug, c.cls)}`, lastModified: date(c.lastModified ?? c.updatedAt), changeFrequency: "weekly", priority: 0.8 });
    for (const s of c.subjects) {
      if (!isSchoolSubjectIndexable(s, cd)) continue;
      out.push({
        url: `${base}${schoolSubjectPath(c.boardSlug, c.cls, s.slug)}`,
        ...(s.lastModified ? { lastModified: date(s.lastModified) } : {}),
        changeFrequency: "monthly",
        priority: 0.7,
      });
      for (const ch of s.chapters) {
        if (!ch.indexable) continue;
        out.push({
          url: `${base}${schoolChapterPath(c.boardSlug, c.cls, s.slug, ch.slug)}`,
          lastModified: date(ch.lastModified),
          changeFrequency: "monthly",
          priority: 0.7,
        });
      }
    }
  }
  return out;
}

// ── llms-full.txt ─────────────────────────────────────────────────────

/** The one line that says what a chapter holds of ours — the same words on
 *  every machine surface. */
export function chapterContentLabel(ch: Pick<SchoolSurfaceChapter, "hasNotes" | "validatedQuestions">): string {
  const parts: string[] = [];
  if (ch.hasNotes) parts.push("Shishya notes");
  if (ch.validatedQuestions >= CHAPTER_INDEXABLE_MIN_QUESTIONS) parts.push(`${ch.validatedQuestions} answer-checked practice questions`);
  return parts.length ? parts.join(" + ") : "Shishya notes and practice not ready yet";
}

/** The one sentence every machine surface says about practice and children
 *  (26 Sep 2026, fixer): what the code does, not more. The school quiz
 *  (src/components/school/SchoolChapterQuiz.tsx) keeps no account, profile
 *  or browser record, but its finish sends the same anonymous QUIZ_ATTEMPTED
 *  beacon every page view's analytics sends (/api/analytics: chapter and
 *  score under the rotating anonymous cookie id) — so "stores nothing" was
 *  untrue, and no school page offers a sign-in, so "parents may sign in to
 *  keep track" was too.
 *  26 Sep 2026 (student mode): the founder opened Class 8-12 pages to
 *  student sign-in, the AI tutor and account practice
 *  (src/lib/school/student-classes.ts); Classes 1-7 stay as they were. The
 *  line says both, and the age line the pages carry. */
export const SCHOOL_CHILDREN_LINE =
  "Class 1-7 school pages have no chat tutor, offer no sign-in and ask no child to create an account. On Class 8-12 pages a student may sign in to practise a chapter with Shishya's own answer-checked questions and to ask the AI tutor about it — for students 13 and above, with a one-time self-declared age band, and the tutor says it is an AI. The 5-question practice on every chapter page needs no account, and no result is saved to any account or profile from it: Shishya records only an anonymous usage event (which chapter was practised and the score), the same cookie-based analytics every page view sends. A signed-in student's own practice set is saved to that account.";

/** The CISCE class line of llms-full.txt: per-subject syllabus PDFs where
 *  the council publishes them (ICSE / ISC classes), the stage curriculum
 *  document otherwise — from the spine; without it, no claim. */
function cisceClassDocsLine(subjects: number, cd: SchoolClassDocs | null, subjectCodes: string[]): string {
  const tail = "CISCE prescribes syllabuses, not one textbook series, so there is no chapter map and no Shishya notes or practice yet";
  if (!cd) return `- ${subjects} subjects (${tail}; the official CISCE documents are linked on the class page and in its context file).`;
  const withSyllabus = subjectCodes.filter((code) => (cd.subjects.get(code)?.syllabusUrls.length ?? 0) > 0).length;
  const level = cd.levelDocument ? `${cd.levelDocument.title}: ${cd.levelDocument.url}` : null;
  if (withSyllabus === 0) {
    return level
      ? `- ${subjects} subjects; CISCE publishes one curriculum document for this stage, ${level} — no per-subject syllabus PDF (${tail}).`
      : `- ${subjects} subjects; no CISCE syllabus PDF is held for this class (${tail}).`;
  }
  const each = withSyllabus === subjects ? "each with CISCE's official syllabus PDF" : `${withSyllabus} with CISCE's official syllabus PDF`;
  return `- ${subjects} subjects, ${each}${level ? `; ${level}` : ""} (${tail}).`;
}

/** What a subject with no chapter list has, for its llms-full.txt line. */
function noChapterBit(curriculum: SchoolCurriculum, cd: SchoolClassDocs | null, code: string): string {
  const d = cd?.subjects.get(code);
  if (curriculum === "CISCE") {
    if (!cd) return "no chapter map (official CISCE documents on the class page)";
    if ((d?.syllabusUrls.length ?? 0) > 0) return "official syllabus link";
    return cd.levelDocument ? "no per-subject syllabus PDF; see the stage curriculum document on the class page" : "no CISCE syllabus PDF held";
  }
  if (d && d.books.length === 0) {
    return d.notYetPublished?.length ? "no textbook published yet (NCERT's index lists this subject as forthcoming)" : "no NCERT textbook listed";
  }
  return "chapter list not available yet";
}

/** The "## School" block of llms-full.txt: every class with its context
 *  file, one line per subject with computed counts, and the indexable chapter
 *  URLs. Empty when no container exists (the block is then omitted). */
export function schoolLlmsFullLines(surface: Pick<SchoolSurface, "classes">, site: string, docs?: SchoolDocsResolver): string[] {
  if (surface.classes.length === 0) return [];
  const n = schoolSurfaceCounts(surface);
  const L: string[] = [];
  L.push("## School — CBSE (NCERT textbooks) and CISCE (ICSE / ISC), by class");
  L.push(
    `> Live now: ${n.classes} class page${n.classes === 1 ? "" : "s"}, ${n.subjects} subject pages, ${n.chapters} chapters listed with the official NCERT chapter link; ${n.chaptersWithNotes} chapter${n.chaptersWithNotes === 1 ? "" : "s"} with Shishya's own study notes and ${n.chaptersWithPractice} with answer-checked practice (${CHAPTER_INDEXABLE_MIN_QUESTIONS}+ questions). Board pages: ${SCHOOL_BOARDS.map((b) => `${site}${schoolBoardPath(b.slug)}`).join(" · ")}. Every class has a machine-readable brief at ${site}/schooling/{board}/class-{n}/context.md (subjects, official book or syllabus links, every chapter and what Shishya holds for it); every subject at …/{subject}/context.md.`,
  );
  L.push(
    `> Honesty: chapter pages link NCERT's own PDF and reproduce no textbook text. Practice questions are Shishya's own, written by AI and answer-checked before they are shown — never NCERT exercises, board questions or previous-year questions. A chapter marked "not ready yet" has no Shishya notes or practice. ${SCHOOL_CHILDREN_LINE}`,
  );
  L.push("");
  for (const c of surface.classes) {
    const board = SCHOOL_BOARDS.find((b) => b.slug === c.boardSlug);
    const cc = classCounts(c);
    const cd = docs?.(c.curriculum, c.cls) ?? null;
    const classUrl = `${site}${schoolClassPath(c.boardSlug, c.cls)}`;
    L.push(`### ${c.name} — ${board?.label ?? c.boardSlug} — ${classUrl} (context file: ${classUrl}/context.md)`);
    L.push(
      c.curriculum === "CISCE"
        ? cisceClassDocsLine(cc.subjects, cd, c.subjects.map((s) => s.code))
        : `- ${cc.subjects} subjects · ${cc.chapters} chapters listed · ${cc.chaptersWithNotes} with Shishya notes · ${cc.chaptersWithPractice} with answer-checked practice`,
    );
    for (const s of c.subjects) {
      const subjectUrl = `${site}${schoolSubjectPath(c.boardSlug, c.cls, s.slug)}`;
      const sc = classCounts({ subjects: [s] });
      const chapterBit =
        s.chapters.length === 0
          ? noChapterBit(c.curriculum, cd, s.code)
          : `${s.chapters.length} chapter${s.chapters.length === 1 ? "" : "s"}${sc.indexableChapters ? ` · ${sc.chaptersWithNotes} with notes · ${sc.chaptersWithPractice} with checked practice` : " · notes and practice not ready yet"}`;
      L.push(`- ${s.name} — ${subjectUrl} — ${chapterBit}`);
      for (const ch of s.chapters) {
        if (!ch.indexable) continue;
        L.push(`  - ${ch.name} — ${chapterContentLabel(ch)}: ${site}${schoolChapterPath(c.boardSlug, c.cls, s.slug, ch.slug)}`);
      }
    }
    L.push("");
  }
  return L;
}

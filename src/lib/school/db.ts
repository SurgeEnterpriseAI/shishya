// School page loaders (26 Sep 2026) — the cached DB reads behind
// /schooling/{board}/class-{n}[/{subject}[/{chapter}]].
//
// The structure (live classes → subjects → chapters, with each chapter's
// notes / practice flags and its slug) comes from src/lib/school/surface.ts,
// the SAME cached read the sitemap, llms-full.txt and context.md use, so a
// page can never show a chapter the sitemap does not know or call indexable
// what the sitemap calls thin. This module adds what only a page needs:
//   * the official links (KnowledgeSource rows the seed wrote: the NCERT
//     chapter PDF per chapter, CISCE's regulation / syllabus PDFs per class);
//   * one chapter's note content (TopicTeachingNote) and its pieces.
// Every read is pinned to a school container by CATEGORY and code
// (SCHOOL_CONTAINER_WHERE, like surface.ts — the containers are inactive by
// design, see scope.ts) and cached SCHOOL_REVALIDATE seconds (unstable_cache, tag
// "school-surface", so whatever busts the surface busts these). No AI, no
// writes, no per-request query: a page is one or two cached calls.

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { hasUsableNotes } from "@/lib/topic-notes";
import { prepareSchoolNotes, type PreparedSchoolNotes } from "./notes";
import { SCHOOL_CONTAINER_WHERE, SCHOOL_REVALIDATE } from "./scope";
import {
  findSchoolClass,
  loadSchoolSurface,
  type SchoolSurfaceChapter,
  type SchoolSurfaceClass,
  type SchoolSurfaceSubject,
} from "./surface";

export interface SchoolOfficialLinks {
  /** Topic.code → the official NCERT chapter PDF. */
  byChapter: Record<string, string>;
  /** Class-level documents (CISCE regulations / syllabus PDFs): title + url. */
  classDocs: { title: string; url: string }[];
}

const EMPTY_LINKS: SchoolOfficialLinks = { byChapter: {}, classDocs: [] };

/** The official link rows of one class container. A failed read gives
 *  no links (the page then shows the spine's PDF URL for a chapter). */
export const getSchoolOfficialLinks = unstable_cache(
  async (examCode: string): Promise<SchoolOfficialLinks> => {
    const exam = await prisma.exam.findUnique({ where: { ...SCHOOL_CONTAINER_WHERE, code: examCode }, select: { code: true } });
    if (!exam) return EMPTY_LINKS;
    const rows = await prisma.knowledgeSource.findMany({
      where: { examCode: exam.code, archivedAt: null, url: { not: null } },
      select: { topicCode: true, url: true, title: true },
      orderBy: [{ topicCode: "asc" }, { title: "asc" }],
    });
    const byChapter: Record<string, string> = {};
    const classDocs: { title: string; url: string }[] = [];
    for (const r of rows) {
      if (!r.url) continue;
      if (r.topicCode) {
        if (!byChapter[r.topicCode]) byChapter[r.topicCode] = r.url;
      } else if (!classDocs.some((d) => d.url === r.url)) {
        classDocs.push({ title: r.title, url: r.url });
      }
    }
    return { byChapter, classDocs };
  },
  ["school-official-links-v1"],
  { revalidate: SCHOOL_REVALIDATE, tags: ["school-surface"] },
);

export interface SchoolChapterDetail {
  /** Shishya's notes, prepared for rendering; null when the chapter has none. */
  notes: PreparedSchoolNotes | null;
  /** ISO time the notes were written; null without notes. */
  notesAt: string | null;
  /** Pieces printed inside this chapter's PDF (child topics): poems, unit lessons, parts. */
  pieces: { code: string; name: string }[];
}

/** One live chapter's own content. Null when the chapter is not under a
 *  school container (the page 404s, exactly like an unknown chapter). */
export const getSchoolChapterDetail = unstable_cache(
  async (examCode: string, topicCode: string): Promise<SchoolChapterDetail | null> => {
    const topic = await prisma.topic.findFirst({
      where: { code: topicCode, parentId: null, subject: { exam: { ...SCHOOL_CONTAINER_WHERE, code: examCode } } },
      select: {
        teachingNote: { select: { content: true, generatedAt: true } },
        children: { select: { code: true, name: true }, orderBy: { orderIdx: "asc" } },
      },
    });
    if (!topic) return null;
    const content = topic.teachingNote?.content;
    const notes = hasUsableNotes(content) ? prepareSchoolNotes(content) : null;
    return {
      notes,
      notesAt: notes && topic.teachingNote?.generatedAt ? topic.teachingNote.generatedAt.toISOString() : null,
      pieces: topic.children.map((c) => ({ code: c.code, name: c.name })),
    };
  },
  ["school-chapter-detail-v1"],
  { revalidate: SCHOOL_REVALIDATE, tags: ["school-surface"] },
);

// 26 Sep 2026 (fixer): a failed surface read THROWS here — it is not turned
// into "no live class". The pages read undefined as "class not seeded" and
// fall back to the 25 Sep hardcoded, noindex form, so a Neon timeout during
// a background regeneration would have rendered a chapter that is in the
// sitemap with notes and 35+ checked questions as a noindex "not ready yet"
// page, and ISR would have served that to every visitor and crawler for the
// full 10-minute window ("Submitted URL marked noindex", the 17 Sep
// clean-up). Thrown, the regeneration fails and ISR keeps the last good
// page; a cold path 500s and is retried — what the exam topic pages do.
// The machine surfaces (sitemap, llms-full.txt, context.md) keep their own
// catch to the empty surface: an empty list there is honest.

/** The seeded class of a board, or undefined (not seeded / unknown board)
 *  — the page then falls back to its 25 Sep hardcoded form, never to an
 *  empty page. A failed read throws (see above). */
export async function getLiveSchoolClass(boardSlug: string, cls: number): Promise<SchoolSurfaceClass | undefined> {
  return findSchoolClass(await loadSchoolSurface(), boardSlug, cls);
}

/** Every live class of a board, in class order. A failed read throws. */
export async function getLiveSchoolClasses(boardSlug: string): Promise<SchoolSurfaceClass[]> {
  const surface = await loadSchoolSurface();
  return surface.classes.filter((c) => c.boardSlug === boardSlug).sort((a, b) => a.cls - b.cls);
}

export interface LiveSchoolSubject {
  cls: SchoolSurfaceClass;
  subject: SchoolSurfaceSubject;
}

/** A live subject by its URL segment. */
export async function getLiveSchoolSubject(boardSlug: string, cls: number, subjectSlug: string): Promise<LiveSchoolSubject | undefined> {
  const live = await getLiveSchoolClass(boardSlug, cls);
  const subject = live?.subjects.find((s) => s.slug === subjectSlug);
  return live && subject ? { cls: live, subject } : undefined;
}

export interface LiveSchoolChapter extends LiveSchoolSubject {
  chapter: SchoolSurfaceChapter;
  prev: SchoolSurfaceChapter | null;
  next: SchoolSurfaceChapter | null;
}

/** A live chapter by its URL segment, with its neighbours in the subject. */
export async function getLiveSchoolChapter(boardSlug: string, cls: number, subjectSlug: string, chapterSlug: string): Promise<LiveSchoolChapter | undefined> {
  const live = await getLiveSchoolSubject(boardSlug, cls, subjectSlug);
  if (!live) return undefined;
  const list = live.subject.chapters;
  const i = list.findIndex((c) => c.slug === chapterSlug);
  if (i < 0) return undefined;
  return { ...live, chapter: list[i], prev: i > 0 ? list[i - 1] : null, next: i < list.length - 1 ? list[i + 1] : null };
}

/** Computed counts for the copy: chapters listed, with notes, with practice. */
export function chapterCounts(chapters: readonly Pick<SchoolSurfaceChapter, "hasNotes" | "validatedQuestions" | "indexable">[], quizMin: number) {
  let notes = 0;
  let practice = 0;
  let indexable = 0;
  for (const c of chapters) {
    if (c.hasNotes) notes++;
    if (c.validatedQuestions >= quizMin) practice++;
    if (c.indexable) indexable++;
  }
  return { chapters: chapters.length, notes, practice, indexable };
}

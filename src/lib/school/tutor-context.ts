// The school tutor's context loaders (26 Sep 2026) — what POST /api/chat and
// /chat read for a signed-in student of Class 8-12, and the daily-cap count.
//
//   • buildSchoolTutorContext / getSchoolTutorContext — the class container
//     as the tutor machinery's SyllabusContext (subjects → chapters, no exam
//     facts, no mock routing) plus the SchoolTutorScope the school prompt
//     renders (src/lib/school/tutor-persona.ts): class, board, the Shishya
//     class and subject pages. Read by CATEGORY and code
//     (SCHOOL_CONTAINER_WHERE — the containers are inactive by design,
//     src/lib/school/scope.ts) through the Subject table, never through
//     prisma.exam.*: a real exam's code finds no school subject and gives
//     null, so the route's unknown-exam branch (404) runs, and no keyed exam
//     lookup is added to tests/unit/exam-scope-guard.test.ts's scan.
//   • buildSchoolChapterFocus / getSchoolChapterFocus — one chapter: title,
//     code, its Shishya page (the surface's slug rule, so the URL is the one
//     the chapter page and sitemap use), the OFFICIAL link (the seed's
//     KnowledgeSource row, else the note's own official-link line), the
//     pieces inside its PDF, and Shishya's OWN notes (TopicTeachingNote,
//     prepared by src/lib/school/notes.ts and capped). No textbook text is
//     ever fetched: there is none in the DB to fetch, and nothing here
//     reads a URL.
//   • countSchoolTutorMessagesToday — the account's USER rows on school
//     sessions since 00:00 IST (src/lib/school/tutor-cap.ts). ChatSession is
//     indexed by userId and ChatMessage by (sessionId, createdAt), so the
//     count is a user's sessions joined to today's rows — no scan.
//
// Cached SCHOOL_REVALIDATE seconds under the "school-surface" tag, like the
// page loaders (src/lib/school/db.ts): whatever busts the pages busts these.
// The build* twins are the uncached bodies for scripts outside the Next
// runtime (scripts/tmp-school4-tutor-prompt.ts prints the exact prompt).

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { hasUsableNotes } from "@/lib/topic-notes";
import type { SyllabusContext } from "@/lib/ai/types";
import { prepareSchoolNotes } from "./notes";
import { SCHOOL_CONTAINER_WHERE, SCHOOL_REVALIDATE } from "./scope";
import { studentModeClassOfExamCode } from "./student-classes";
import { schoolBoardForExamCode, schoolChapterPath, schoolChapterSlugs, schoolClassPath, schoolSubjectPath, schoolSubjectSlug } from "./surface";
import { SCHOOL_NOTES_EXCERPT_CHARS, type SchoolChapterFocus, type SchoolTutorScope } from "./tutor-persona";
import { schoolTutorDayStart } from "./tutor-cap";

export interface SchoolTutorContext {
  /** The container row as the chat route needs it (id for ChatSession.examId). */
  exam: { id: string; code: string; name: string; shortName: string; category: string };
  scope: SchoolTutorScope;
  /** The class in the exam tutor's syllabus shape, so tutorStream takes it unchanged. */
  syllabus: SyllabusContext;
}

/** Uncached body of getSchoolTutorContext. Null for a Class 1-7 container,
 *  a real exam's code, an unknown code, or a container with no subjects. */
export async function buildSchoolTutorContext(examCode: string): Promise<SchoolTutorContext | null> {
  const cls = studentModeClassOfExamCode(examCode);
  const board = schoolBoardForExamCode(examCode);
  if (cls === null || !board) return null;
  const subjects = await prisma.subject.findMany({
    where: { exam: { ...SCHOOL_CONTAINER_WHERE, code: examCode } },
    orderBy: { orderIdx: "asc" },
    select: {
      code: true,
      name: true,
      weight: true,
      exam: { select: { id: true, code: true, name: true, shortName: true, category: true } },
      topics: { where: { parentId: null }, orderBy: { orderIdx: "asc" }, select: { code: true, name: true } },
    },
  });
  if (subjects.length === 0) return null;
  const exam = subjects[0].exam;
  const scope: SchoolTutorScope = {
    examCode: exam.code,
    curriculum: board.curriculum,
    cls,
    boardShort: board.shortName,
    boardLabel: board.label,
    classPath: schoolClassPath(board.slug, cls),
    subjects: subjects.map((s) => ({
      code: s.code,
      name: s.name,
      path: schoolSubjectPath(board.slug, cls, schoolSubjectSlug(s.code)),
      chapters: s.topics.map((t) => ({ code: t.code, name: t.name })),
    })),
  };
  const syllabus: SyllabusContext = {
    examCode: exam.code,
    examName: exam.name,
    examShortName: exam.shortName,
    subjects: subjects.map((s) => ({
      code: s.code,
      name: s.name,
      weight: s.weight,
      topics: s.topics.map((t) => ({ code: t.code, name: t.name })),
    })),
  };
  return { exam, scope, syllabus };
}

export const getSchoolTutorContext = unstable_cache(buildSchoolTutorContext, ["school-tutor-context-v1"], {
  revalidate: SCHOOL_REVALIDATE,
  tags: ["school-surface"],
});

/** Uncached body of getSchoolChapterFocus. Null when the chapter is not a
 *  top-level chapter of that Class 8-12 container. */
export async function buildSchoolChapterFocus(examCode: string, topicCode: string): Promise<SchoolChapterFocus | null> {
  const cls = studentModeClassOfExamCode(examCode);
  const board = schoolBoardForExamCode(examCode);
  if (cls === null || !board) return null;
  const topic = await prisma.topic.findFirst({
    where: { code: topicCode, parentId: null, subject: { exam: { ...SCHOOL_CONTAINER_WHERE, code: examCode } } },
    select: {
      code: true,
      name: true,
      teachingNote: { select: { content: true } },
      children: { orderBy: { orderIdx: "asc" }, select: { code: true, name: true } },
      subject: {
        select: {
          code: true,
          name: true,
          topics: { where: { parentId: null }, orderBy: { orderIdx: "asc" }, select: { code: true, name: true } },
        },
      },
    },
  });
  if (!topic) return null;
  // The seed's official-link row for this chapter (src/lib/school/db.ts reads
  // the same rows for the page); the note's own link line is the fallback.
  const link = await prisma.knowledgeSource.findFirst({
    where: { examCode, topicCode, archivedAt: null, url: { not: null } },
    orderBy: { title: "asc" },
    select: { url: true },
  });
  const content = topic.teachingNote?.content;
  const prepared = hasUsableNotes(content) ? prepareSchoolNotes(content) : null;
  const slug = schoolChapterSlugs(topic.subject.topics).get(topic.code) ?? "";
  return {
    code: topic.code,
    name: topic.name,
    subjectCode: topic.subject.code,
    subjectName: topic.subject.name,
    path: schoolChapterPath(board.slug, cls, schoolSubjectSlug(topic.subject.code), slug),
    officialUrl: link?.url ?? prepared?.officialUrl ?? null,
    notes: prepared ? prepared.markdown.slice(0, SCHOOL_NOTES_EXCERPT_CHARS) : null,
    pieces: topic.children.map((c) => ({ code: c.code, name: c.name })),
  };
}

export const getSchoolChapterFocus = unstable_cache(buildSchoolChapterFocus, ["school-chapter-focus-v1"], {
  revalidate: SCHOOL_REVALIDATE,
  tags: ["school-surface"],
});

/** USER messages the account sent on school chats since 00:00 IST today. */
export async function countSchoolTutorMessagesToday(userId: string, now: Date = new Date()): Promise<number> {
  return prisma.chatMessage.count({
    where: {
      role: "USER",
      createdAt: { gte: schoolTutorDayStart(now) },
      session: { userId, exam: SCHOOL_CONTAINER_WHERE },
    },
  });
}

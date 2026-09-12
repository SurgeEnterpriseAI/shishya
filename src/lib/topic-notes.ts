// The ONE rule for "this topic has study notes" (audit 11 Sep 2026: the
// coach was sending 1,012 of 1,419 enrolments to "Study notes are still
// being prepared").
//
// It is exactly what /exams/[code]/topics/[topicCode]/page.tsx renders
// on: the topic's TopicTeachingNote row exists AND its content is a
// non-empty string (page.tsx: `const notes = topic.teachingNote?.content`
// … `{notes ? <article/> : <empty-state/>}`). The deprecated Topic.notes
// columns (prisma/schema.prisma, "no longer read or written") are never
// consulted, so a stale value there can never make the coach believe a
// page has notes that the page itself will not show.
//
// Every surface that decides between "read the notes" and "notes not
// ready" must go through one of these two — never an inline check — so
// the coach, the topic page and the syllabus checklist can't disagree.

import { Prisma } from "@prisma/client";

/** Minimum characters of TopicTeachingNote.content that count as notes.
 *  1 = "non-empty", identical to the topic page's truthiness check. */
export const MIN_USABLE_NOTE_CHARS = 1;

/** JS form — pass `topic.teachingNote?.content` (undefined/null when the
 *  1:1 row is missing). */
export function hasUsableNotes(content: string | null | undefined): boolean {
  return typeof content === "string" && content.length >= MIN_USABLE_NOTE_CHARS;
}

/** SQL twin for raw queries. `content` is the column reference of the
 *  LEFT-JOINed TopicTeachingNote alias, e.g. `Prisma.sql\`tn.content\``;
 *  a missing row (NULL) is "no notes". Same threshold as hasUsableNotes. */
export function usableNotesSql(content: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`(${content} IS NOT NULL AND length(${content}) >= ${MIN_USABLE_NOTE_CHARS})`;
}

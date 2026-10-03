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

// ── Cut-off texts (3 Oct 2026, fix plan C9) ─────────────────────────────
// The Hindi-note, tricks and guide generators stored whatever came back,
// including replies stopped at their token cap: 246 of 420 Hindi notes, at
// least 12 tricks and 7 guides end mid-word or mid-bold. Those three
// generators now refuse such a reply (stop_reason "max_tokens"); these two
// pure checks find the texts already stored.

/** Markdown headings ("#" to "######" and a space) in a note. */
export function noteHeadingCount(markdown: string | null | undefined): number {
  return (markdown ?? "").split(/\r?\n/).filter((l) => /^#{1,6}\s/.test(l.trim())).length;
}

/** True when a stored text stops mid-sentence: its last non-empty line holds
 *  an odd number of "**" (bold opened and never closed), or ends on a letter
 *  with no closing mark ("… Chemistry is generally"). A mechanical test: an
 *  English bullet that simply omits its full stop also reads as cut. */
export function isCutOff(markdown: string | null | undefined): boolean {
  const lines = (markdown ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const last = lines[lines.length - 1];
  if (!last) return false;
  if ((last.match(/\*\*/g) ?? []).length % 2 === 1) return true;
  return /[\p{L}\p{M}]$/u.test(last);
}

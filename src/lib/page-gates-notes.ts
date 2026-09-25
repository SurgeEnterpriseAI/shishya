// Which active exams have study notes (16 Sep 2026) — at least one topic with
// usable notes, the topic page's own rule (src/lib/topic-notes.ts). Cached
// 10 min like src/lib/exam-page-gates.ts, so the news permalinks share one
// read. The permalink funnel said "Syllabus & study notes" and its meta
// description "…PYQs & study notes on Shishya" for all exams, while 127 of
// the 168 exams with a syllabus have no notes and their syllabus page says
// so. Copy: newsPermalinkCopy in src/lib/page-gates-copy.ts.

import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { REAL_EXAM_SQL } from "@/lib/db/exam-scope";
import { usableNotesSql } from "@/lib/topic-notes";

const cachedNotesExamCodes = unstable_cache(
  async (): Promise<string[]> => {
    const rows = await prisma.$queryRaw<{ code: string }[]>`
      SELECT DISTINCT e.code FROM "TopicTeachingNote" n
      JOIN "Topic" t ON t.id = n."topicId" JOIN "Subject" s ON s.id = t."subjectId" JOIN "Exam" e ON e.id = s."examId"
      WHERE ${REAL_EXAM_SQL} AND ${usableNotesSql(Prisma.sql`n.content`)}`; // 25 Sep 2026: real exams only
    return rows.map((r) => r.code);
  },
  ["exam-notes-codes-v1"],
  { revalidate: 600, tags: ["exam-shared"] },
);

/** true / false for an exam's notes; null when the read failed. */
export async function examHasNotes(code: string): Promise<boolean | null> {
  try {
    return (await cachedNotesExamCodes()).includes(code);
  } catch {
    return null;
  }
}

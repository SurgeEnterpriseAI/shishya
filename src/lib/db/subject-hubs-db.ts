// Reads behind /subjects/{slug} (27 Sep 2026) — src/lib/subject-hubs.ts has
// the rules; this file only fetches the rows they run on. SELECT only.
//
// Two reads:
//   1. every syllabus section (Subject) of the live real exams
//      (REAL_EXAM_SQL — no school container, no inactive exam), with its
//      exam's code, names and category; subjectHubOf() picks the sections
//      that count for a hub;
//   2. the topics of the sections that count, each with the topic page's own
//      notes rule (usableNotesSql = hasUsableNotes) and its own validated
//      ("checked") question count — the topic page adds its sub-topics'
//      counts, and so does buildSubjectHubs().
// Question has no topicId index, so the counts are one grouped pass over the
// validated questions (≈35k rows on 27 Sep 2026) rather than a per-topic
// lookup. A failed read throws: the ISR page keeps its last good copy
// instead of caching an empty hub.

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { REAL_EXAM_SQL } from "./exam-scope";
import { usableNotesSql } from "@/lib/topic-notes";
import {
  buildSubjectHubs,
  subjectHubOf,
  type HubSectionRow,
  type HubTopicRow,
  type SubjectHub,
  type SubjectHubSlug,
} from "@/lib/subject-hubs";

interface SectionSqlRow {
  subjectId: string;
  subjectName: string;
  code: string;
  shortName: string;
  name: string;
  category: string;
}

export async function loadSubjectHubInput(): Promise<{ sections: HubSectionRow[]; topics: HubTopicRow[] }> {
  const rows = await prisma.$queryRaw<SectionSqlRow[]>`
    SELECT s.id AS "subjectId", s.name AS "subjectName", e.code, e."shortName", e.name, e.category::text AS category
    FROM "Subject" s JOIN "Exam" e ON e.id = s."examId"
    WHERE ${REAL_EXAM_SQL}
    ORDER BY e.code ASC, s."orderIdx" ASC, s.id ASC
  `;
  const sections: HubSectionRow[] = rows.map((r) => ({
    subjectId: r.subjectId,
    subjectName: r.subjectName,
    exam: { code: r.code, shortName: r.shortName, name: r.name, category: r.category },
  }));

  const counted = sections.filter((s) => subjectHubOf({ name: s.subjectName }, s.exam) !== null).map((s) => s.subjectId);
  if (counted.length === 0) return { sections, topics: [] };

  const topics = await prisma.$queryRaw<HubTopicRow[]>`
    SELECT t.id, t."subjectId", t."parentId", t.code, t.name,
           ${usableNotesSql(Prisma.sql`tn.content`)} AS "hasNotes",
           COALESCE(qc.n, 0)::int AS "checkedOwn"
    FROM "Topic" t
    LEFT JOIN "TopicTeachingNote" tn ON tn."topicId" = t.id
    LEFT JOIN (
      SELECT q."topicId", COUNT(*)::int AS n
      FROM "Question" q
      WHERE q.validated = TRUE
      GROUP BY q."topicId"
    ) qc ON qc."topicId" = t.id
    WHERE t."subjectId" = ANY(${counted}::text[])
    ORDER BY t."subjectId" ASC, t."orderIdx" ASC, t.code ASC, t.id ASC
  `;
  return { sections, topics: topics.map((t) => ({ ...t, hasNotes: t.hasNotes === true, checkedOwn: Number(t.checkedOwn) })) };
}

/** Every hub, built from one pair of reads. */
export async function loadSubjectHubs(): Promise<Map<SubjectHubSlug, SubjectHub>> {
  const { sections, topics } = await loadSubjectHubInput();
  return buildSubjectHubs(sections, topics);
}

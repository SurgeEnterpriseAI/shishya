// Builds the SyllabusContext object that AI services consume.
//
// Syllabus barely changes between deploys, but it's fetched on every tutor
// call (POST /api/chat) — at 10k concurrent students that would be ~5k+
// DB hits per second pulling the same rows. We wrap it in unstable_cache
// so each (examCode) reads from the in-memory Next data cache for up to 5
// minutes between revalidations.

import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import type { SyllabusContext } from "../ai/types";

async function buildSyllabusContext(examCode: string): Promise<SyllabusContext> {
  const exam = await prisma.exam.findUnique({
    where: { code: examCode },
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
  };
}

export const getSyllabusContext = unstable_cache(
  buildSyllabusContext,
  ["syllabus-v1"],
  { revalidate: 300, tags: ["syllabus"] }, // 5 min TTL
);

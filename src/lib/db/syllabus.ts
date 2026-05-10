// Builds the SyllabusContext object that AI services consume.
// Cached at the request level — syllabus rarely changes; safe to memoise.

import { prisma } from "./prisma";
import type { SyllabusContext } from "../ai/types";

export async function getSyllabusContext(examCode: string): Promise<SyllabusContext> {
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

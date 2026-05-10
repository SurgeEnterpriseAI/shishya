// Generic system-mock seeder. Resolves the question list at seed time
// (TOPIC_FILTER → query DB; PRESET_IDS → match against tag) and persists
// as a Mock row with userId=null so all enrolled users see it.

import { PrismaClient } from "@prisma/client";
import type { SystemMock } from "./_types";

const prisma = new PrismaClient();

export async function seedSystemMock(mock: SystemMock) {
  const exam = await prisma.exam.findUnique({ where: { code: mock.examCode } });
  if (!exam) throw new Error(`Exam ${mock.examCode} not seeded.`);

  let questionIds: string[] = [];
  let pickerSnapshot: any = mock.picker;

  if (mock.picker.kind === "PRESET_IDS") {
    // Find every question whose tags contain ANY of the listed prefixes.
    const qs = await prisma.question.findMany({
      where: {
        examId: exam.id,
        tags: { hasSome: mock.picker.questionTags },
      },
      select: { id: true, tags: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    questionIds = qs.map((q) => q.id);
  } else {
    const subjects = await prisma.subject.findMany({
      where: { examId: exam.id },
      include: { topics: true },
    });
    const topicByCode = new Map<string, string>();
    for (const s of subjects) for (const t of s.topics) topicByCode.set(t.code, t.id);
    const topicIds = mock.picker.topicCodes
      .map((c) => topicByCode.get(c))
      .filter((id): id is string => Boolean(id));

    if (topicIds.length === 0) {
      console.warn(`  ⚠ ${mock.examCode}/${mock.slug}: no matching topics — picker yields 0`);
    }

    const need = mock.picker.difficultyMix;
    const pulls = (["EASY", "MEDIUM", "HARD"] as const).map(async (d) => {
      if (need[d] === 0) return [];
      const qs = await prisma.question.findMany({
        where: { examId: exam.id, validated: true, difficulty: d, topicId: { in: topicIds } },
        select: { id: true },
        take: need[d],
        orderBy: { id: "asc" },
      });
      return qs.map((q) => q.id);
    });
    const buckets = await Promise.all(pulls);
    questionIds = buckets.flat();
  }

  const slug = `system:${mock.slug}`;
  const existing = await prisma.mock.findFirst({
    where: {
      examId: exam.id,
      userId: null,
      title: { equals: mock.title },
      generatedBy: slug,
    },
    select: { id: true },
  });

  const data = {
    examId: exam.id,
    userId: null,
    type: mock.type === "PYQ_FULL"
      ? "FULL" as const
      : mock.type === "TOPIC_DRILL"
      ? "TOPIC" as const
      : "FULL" as const,
    title: mock.title,
    config: {
      durationMin: mock.durationMin,
      description: mock.description,
      picker: pickerSnapshot,
      count: questionIds.length,
    } as any,
    questionIds,
    generatedBy: slug,
  };

  if (existing) {
    await prisma.mock.update({ where: { id: existing.id }, data });
    console.log(`  ✓ updated ${mock.examCode}/${mock.slug} (${questionIds.length} qs)`);
  } else {
    await prisma.mock.create({ data });
    console.log(`  ✓ created ${mock.examCode}/${mock.slug} (${questionIds.length} qs)`);
  }
}

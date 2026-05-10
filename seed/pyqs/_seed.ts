// Generic PYQ seeder. Takes a typed PYQPaper and upserts each question with
// source=PYQ + pyqYear. Idempotent on (examId, pyqYear, tags including the
// per-paper "pyq:<exam>:<year>:<shift>:<slug>" marker).

import { PrismaClient, QuestionSource } from "@prisma/client";
import type { PYQPaper } from "./_types";

const prisma = new PrismaClient();

export async function seedPYQPaper(paper: PYQPaper) {
  const exam = await prisma.exam.findUnique({ where: { code: paper.examCode } });
  if (!exam) throw new Error(`Exam ${paper.examCode} not seeded.`);

  // Build topicCode → topic.id lookup once (subjects → topics).
  const subjects = await prisma.subject.findMany({
    where: { examId: exam.id },
    include: { topics: true },
  });
  const topicByCode = new Map<string, string>();
  for (const s of subjects) for (const t of s.topics) topicByCode.set(t.code, t.id);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  for (const q of paper.questions) {
    const topicId = topicByCode.get(q.topicCode);
    if (!topicId) {
      console.warn(`  ⚠ unknown topic ${q.topicCode} — skipping ${q.slug}`);
      skipped += 1;
      continue;
    }
    const marker = `pyq:${paper.examCode}:${paper.year}:${paper.shift ?? "main"}:${q.slug}`;
    const existing = await prisma.question.findFirst({
      where: { examId: exam.id, tags: { has: marker } },
      select: { id: true },
    });
    const data = {
      examId: exam.id,
      topicId,
      type: q.type ?? "MCQ" as const,
      difficulty: q.difficulty,
      body: q.body,
      options: q.options,
      answerKey: q.answerKey,
      solution: q.solution,
      source: QuestionSource.PYQ,
      pyqYear: paper.year,
      validated: true, // PYQs are authoritative
      tags: [marker, ...(q.tags ?? []), `pyq:${paper.year}`],
    };
    if (existing) {
      await prisma.question.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.question.create({ data });
      inserted += 1;
    }
  }
  console.log(
    `  ${paper.examCode} ${paper.year}${paper.shift ? ` (${paper.shift})` : ""}: ` +
      `${inserted} new, ${updated} updated, ${skipped} skipped`
  );
}

if (require.main === module) {
  // CLI: npx tsx seed/pyqs/_seed.ts <path-to-paper-file.ts>
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: npx tsx seed/pyqs/_seed.ts <path-to-paper-file.ts>");
    process.exit(1);
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(path);
  const paper: PYQPaper = mod.default ?? mod.paper;
  if (!paper) {
    console.error(`File ${path} must export default a PYQPaper or named export 'paper'.`);
    process.exit(1);
  }
  seedPYQPaper(paper)
    .catch((err) => { console.error(err); process.exit(1); })
    .finally(() => prisma.$disconnect());
}

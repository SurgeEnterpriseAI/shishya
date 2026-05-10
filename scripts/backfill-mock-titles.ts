// scripts/backfill-mock-titles.ts
//
// One-shot backfill that rewrites Mock.title to use Exam.shortName
// instead of Exam.name (the long form). Fixes legacy AI-generated mocks
// whose titles were built before the generator was switched to shortName.
//
// Idempotent: a mock whose title doesn't contain the long name is left
// alone. System mocks already used shortName from day one — they'll be
// no-ops here.
//
// USAGE
//   tsx scripts/backfill-mock-titles.ts --dry-run
//   tsx scripts/backfill-mock-titles.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const exams = await prisma.exam.findMany({
    select: { id: true, name: true, shortName: true },
  });
  const examById = new Map(exams.map((e) => [e.id, e]));

  // Only fetch mocks whose title still contains the long form for any exam.
  // Cheaper than scanning every mock; correct because we'd no-op them anyway.
  const candidates: { id: string; examId: string; title: string }[] = [];
  for (const exam of exams) {
    if (exam.name === exam.shortName) continue; // nothing to rewrite
    const matches = await prisma.mock.findMany({
      where: { examId: exam.id, title: { contains: exam.name } },
      select: { id: true, examId: true, title: true },
    });
    candidates.push(...matches);
  }

  if (candidates.length === 0) {
    console.log("Nothing to backfill — every mock title already uses shortName.");
    await prisma.$disconnect();
    return;
  }

  console.log(`\n=== backfill-mock-titles ===`);
  console.log(`Mode:               ${dryRun ? "DRY RUN" : "LIVE — will update DB"}`);
  console.log(`Candidate mocks:    ${candidates.length}\n`);

  let updated = 0;
  let skipped = 0;
  for (const m of candidates) {
    const exam = examById.get(m.examId);
    if (!exam) continue;
    const next = m.title.split(exam.name).join(exam.shortName);
    if (next === m.title) {
      skipped += 1;
      continue;
    }
    if (dryRun) {
      console.log(`  [dry] ${m.id}  '${m.title}' → '${next}'`);
    } else {
      await prisma.mock.update({ where: { id: m.id }, data: { title: next } });
    }
    updated += 1;
  }

  console.log(`\n${dryRun ? "Would update" : "Updated"}: ${updated}`);
  console.log(`No-op:        ${skipped}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

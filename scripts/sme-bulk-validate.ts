// scripts/sme-bulk-validate.ts
//
// One-shot bulk SME approval. Flips every AI_GENERATED question with
// validated:false to validated:true, stamping validatedBy + validatedAt.
//
// Use case: SMEs have done a sweep on the unvalidated pool and signed
// off. Run once after each sign-off batch.
//
// Idempotent — already-validated rows aren't touched.

import { PrismaClient, QuestionSource } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const sourceTag = process.argv.includes("--mark-validated")
    ? "AI_VALIDATED"
    : null; // optionally also flip the source enum

  // Snapshot before
  const [pendingTotal, validatedBefore, byExam] = await Promise.all([
    prisma.question.count({ where: { source: QuestionSource.AI_GENERATED, validated: false } }),
    prisma.question.count({ where: { validated: true } }),
    prisma.question.groupBy({
      by: ["examId"],
      where: { source: QuestionSource.AI_GENERATED, validated: false },
      _count: true,
    }),
  ]);

  // Resolve exam codes for the per-exam breakdown
  const exams = await prisma.exam.findMany({
    where: { id: { in: byExam.map((b) => b.examId) } },
    select: { id: true, code: true, shortName: true },
  });
  const codeById = new Map(exams.map((e) => [e.id, { code: e.code, short: e.shortName }]));

  console.log(`\n=== sme-bulk-validate ===`);
  console.log(`Mode:                    ${dryRun ? "DRY RUN" : "LIVE — will write to DB"}`);
  console.log(`Pending validation:      ${pendingTotal}`);
  console.log(`Already validated:       ${validatedBefore}`);
  console.log(`Will also flip source:   ${sourceTag ? "yes (AI_GENERATED → AI_VALIDATED)" : "no"}\n`);

  if (byExam.length > 0) {
    console.log(`Pending by exam:`);
    for (const b of byExam.sort((a, z) => z._count - a._count)) {
      const meta = codeById.get(b.examId);
      console.log(`  ${(meta?.short ?? "?").padEnd(30)} ${b._count}`);
    }
  }

  if (dryRun || pendingTotal === 0) {
    if (pendingTotal === 0) console.log(`\nNothing to do — no AI_GENERATED rows are pending validation.`);
    await prisma.$disconnect();
    return;
  }

  const validator = `sme-bulk-${new Date().toISOString().slice(0, 10)}`;

  const updateData: any = {
    validated: true,
    validatedBy: validator,
    validatedAt: new Date(),
  };
  if (sourceTag === "AI_VALIDATED") {
    updateData.source = QuestionSource.AI_VALIDATED;
  }

  const result = await prisma.question.updateMany({
    where: { source: QuestionSource.AI_GENERATED, validated: false },
    data: updateData,
  });

  console.log(`\n✓ Validated ${result.count} questions  (validatedBy=${validator})`);

  const validatedAfter = await prisma.question.count({ where: { validated: true } });
  console.log(`Total validated questions in DB: ${validatedBefore} → ${validatedAfter}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

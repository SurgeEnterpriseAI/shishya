// scripts/validate-all-ai-questions.ts
//
// Marks every unvalidated AI_GENERATED question as validated, promoting
// source to AI_VALIDATED. Same effect as clicking "Bulk validate N pending"
// in the admin UI — but via direct DB write, no HTTP cap, no rate limit.
//
// Batches by 1000 so the pooled pgbouncer connection isn't held for a
// single huge transaction.
//
// 25 Sep 2026: withdrawn questions (tag "rejected"), ones validated once
// and later pulled (validatedAt set) and ones the answer-check firewall
// already failed (metadata.factoryVerify) are held back, as in the admin
// bulk validate (src/lib/question-withdrawn.ts).

import { PrismaClient } from "@prisma/client";
import { BULK_HELD_BACK, BULK_VALIDATABLE } from "../src/lib/question-withdrawn";

const p = new PrismaClient();
const BATCH_SIZE = 1000;
const VALIDATED_BY = process.env.VALIDATED_BY ?? "system:bulk:overnight";

async function main() {
  const total = await p.question.count({
    where: { ...BULK_VALIDATABLE, source: "AI_GENERATED" },
  });
  console.log(`Unvalidated AI_GENERATED questions: ${total}`);
  const heldBack = await p.question.count({ where: BULK_HELD_BACK });
  console.log(`Held back (withdrawn, pulled or failed check, any source): ${heldBack}`);

  let aiPromoted = 0;
  while (true) {
    const batch = await p.question.findMany({
      where: { ...BULK_VALIDATABLE, source: "AI_GENERATED" },
      select: { id: true },
      take: BATCH_SIZE,
    });
    if (batch.length === 0) break;
    const res = await p.question.updateMany({
      where: { id: { in: batch.map((b) => b.id) } },
      data: {
        validated: true,
        validatedBy: VALIDATED_BY,
        validatedAt: new Date(),
        source: "AI_VALIDATED",
      },
    });
    aiPromoted += res.count;
    console.log(`  + ${res.count}  (running total: ${aiPromoted})`);
    if (batch.length < BATCH_SIZE) break;
  }

  // Also flip any other unvalidated SOURCE rows (SME drafts, PYQ stubs).
  let otherValidated = 0;
  while (true) {
    const batch = await p.question.findMany({
      where: { ...BULK_VALIDATABLE, source: { not: "AI_GENERATED" } },
      select: { id: true },
      take: BATCH_SIZE,
    });
    if (batch.length === 0) break;
    const res = await p.question.updateMany({
      where: { id: { in: batch.map((b) => b.id) } },
      data: {
        validated: true,
        validatedBy: VALIDATED_BY,
        validatedAt: new Date(),
      },
    });
    otherValidated += res.count;
    if (batch.length < BATCH_SIZE) break;
  }

  console.log(`\n=== summary ===`);
  console.log(`AI_GENERATED → AI_VALIDATED: ${aiPromoted}`);
  console.log(`Other unvalidated promoted:  ${otherValidated}`);
  console.log(`Total validated:             ${aiPromoted + otherValidated}`);

  // How many exams cleared the validated-question minimum threshold now?
  const exams = await p.exam.findMany({
    where: { active: true },
    select: { id: true, code: true },
  });
  const counts = await p.question.groupBy({
    by: ["examId"],
    where: { validated: true, examId: { in: exams.map((e) => e.id) } },
    _count: { _all: true },
  });
  const byId = new Map(counts.map((c) => [c.examId, c._count._all]));
  const withMin = exams.filter((e) => (byId.get(e.id) ?? 0) >= 20).length;
  console.log(`Exams with >=20 validated questions: ${withMin}/${exams.length}`);

  await p.$disconnect();
}

main().catch(async (e) => { console.error(e); await p.$disconnect(); process.exit(1); });

// scripts/check-exam-intel.ts
//
// Reports how many exams have news / dates / rank-bands populated.
// Read-only.

import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const exams = await p.exam.findMany({
    where: { active: true },
    select: { id: true, code: true },
  });
  const examIds = exams.map((e) => e.id);

  const [newsAgg, datesAgg, bandsAgg] = await Promise.all([
    p.examNewsItem.groupBy({
      by: ["examId"],
      where: { examId: { in: examIds } },
      _count: { _all: true },
    }),
    p.examImportantDate.groupBy({
      by: ["examId"],
      where: { examId: { in: examIds } },
      _count: { _all: true },
    }),
    p.examRankBand.groupBy({
      by: ["examId"],
      where: { examId: { in: examIds } },
      _count: { _all: true },
    }),
  ]);

  const newsBy = new Map(newsAgg.map((r) => [r.examId, r._count._all]));
  const datesBy = new Map(datesAgg.map((r) => [r.examId, r._count._all]));
  const bandsBy = new Map(bandsAgg.map((r) => [r.examId, r._count._all]));

  let withNews = 0, withDates = 0, withBands = 0;
  const missingAll: string[] = [];
  const onlyBands: string[] = [];
  for (const e of exams) {
    const n = newsBy.get(e.id) ?? 0;
    const d = datesBy.get(e.id) ?? 0;
    const b = bandsBy.get(e.id) ?? 0;
    if (n > 0) withNews += 1;
    if (d > 0) withDates += 1;
    if (b > 0) withBands += 1;
    if (n === 0 && d === 0 && b === 0) missingAll.push(e.code);
    else if (n === 0 && d === 0) onlyBands.push(e.code);
  }

  console.log(`Total active exams: ${exams.length}`);
  console.log(`With news:    ${withNews}`);
  console.log(`With dates:   ${withDates}`);
  console.log(`With bands:   ${withBands}`);
  console.log(`Missing ALL three: ${missingAll.length}`);
  if (missingAll.length > 0 && missingAll.length <= 30) {
    console.log("  " + missingAll.join(", "));
  } else if (missingAll.length > 30) {
    console.log("  (first 30) " + missingAll.slice(0, 30).join(", ") + " …");
  }
  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});

// Inventory: validated questions + system mocks per exam.
// Read-only. Used to decide which exams need seeding.

import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const exams = await p.exam.findMany({
    where: { active: true },
    orderBy: { code: "asc" },
    select: { id: true, code: true, shortName: true },
  });

  const examIds = exams.map((e) => e.id);

  const [validatedAgg, mockAgg] = await Promise.all([
    p.question.groupBy({
      by: ["examId"],
      where: { validated: true, examId: { in: examIds } },
      _count: { _all: true },
    }),
    p.mock.groupBy({
      by: ["examId"],
      where: { userId: null, examId: { in: examIds } },
      _count: { _all: true },
    }),
  ]);

  const validatedByExam = new Map(validatedAgg.map((r) => [r.examId, r._count._all]));
  const mockByExam = new Map(mockAgg.map((r) => [r.examId, r._count._all]));

  const rows = exams.map((e) => ({
    code: e.code,
    shortName: e.shortName,
    qs: validatedByExam.get(e.id) ?? 0,
    mocks: mockByExam.get(e.id) ?? 0,
  }));

  const withMinQs = rows.filter((r) => r.qs >= 20);
  const withMocks = rows.filter((r) => r.mocks >= 1);
  const thin = rows.filter((r) => r.qs < 20);

  console.log(`Total active exams:                 ${rows.length}`);
  console.log(`Exams with >=20 validated Qs:       ${withMinQs.length}`);
  console.log(`Exams with >=1 system mock:         ${withMocks.length}`);
  console.log(`Exams missing system mock:          ${rows.length - withMocks.length}`);
  console.log(`Thin exams (<20 validated Qs):      ${thin.length}\n`);

  if (thin.length > 0) {
    console.log(`Thin exams (code · q-count · mocks):`);
    for (const r of thin) {
      console.log(`  ${r.code.padEnd(22)} ${String(r.qs).padStart(5)} Qs   ${r.mocks} mocks`);
    }
  }

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

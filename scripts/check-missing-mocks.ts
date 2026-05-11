// List exams without any system mock — these are the ones that need
// either topic seeding (most of these) or a custom seed script.

import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const exams = await p.exam.findMany({
    where: { active: true },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      shortName: true,
      _count: { select: { subjects: true, mocks: true } },
    },
  });

  const haveMock = new Set(
    (
      await p.mock.groupBy({
        by: ["examId"],
        where: { userId: null, examId: { in: exams.map((e) => e.id) } },
        _count: { _all: true },
      })
    ).map((r) => r.examId),
  );

  const missing = exams.filter((e) => !haveMock.has(e.id));
  console.log(`Missing system mock: ${missing.length}`);
  for (const e of missing) {
    const topicCount = await p.topic.count({
      where: { subject: { examId: e.id } },
    });
    console.log(`  ${e.code.padEnd(22)} subjects=${e._count.subjects} topics=${topicCount}`);
  }
  await p.$disconnect();
}

main().catch(async (e) => { console.error(e); await p.$disconnect(); process.exit(1); });

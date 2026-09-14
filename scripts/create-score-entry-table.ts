// Creates the ScoreEntry table (14 Sep 2026): score estimates candidates chose
// to add on /exams/[code]/score-estimate. Raw SQL, idempotent, additive.
//   npx dotenv-cli -e .env.local -- npx tsx scripts/create-score-entry-table.ts
// Mirrors the ScoreEntry model in prisma/schema.prisma (Prisma index names).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "ScoreEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "sitting" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "attempted" INTEGER NOT NULL,
    "correct" INTEGER NOT NULL,
    "wrong" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "maxMarks" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "ScoreEntry_examId_sitting_keyHash_key" ON "ScoreEntry"("examId", "sitting", "keyHash")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ScoreEntry_examId_sitting_score_idx" ON "ScoreEntry"("examId", "sitting", "score")`,
  );
  const [row] = await prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*)::int AS n FROM "ScoreEntry"`);
  console.log(`ScoreEntry: ${row.n} rows`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

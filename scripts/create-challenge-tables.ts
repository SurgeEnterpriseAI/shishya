// Creates the Challenge a friend tables (14 Sep 2026). Raw SQL, idempotent,
// additive — safe to run before the release that reads them.
//   npx dotenv-cli -e .env.local -- npx tsx scripts/create-challenge-tables.ts
// Shapes mirror the Challenge / ChallengePlay / ChallengeWatch models in
// prisma/schema.prisma (index names follow Prisma's convention).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Challenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceRef" TEXT,
    "questionIds" TEXT[] NOT NULL,
    "creatorUserId" TEXT,
    "creatorAnonId" TEXT,
    "creatorKeyHash" TEXT NOT NULL,
    "creatorName" TEXT,
    "creatorCorrect" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastEmailAt" TIMESTAMP(3),
    "lastPushAt" TIMESTAMP(3)
  )`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Challenge_createdAt_idx" ON "Challenge"("createdAt")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Challenge_creatorUserId_idx" ON "Challenge"("creatorUserId")`);

  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "ChallengePlay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengeId" TEXT NOT NULL,
    "playerUserId" TEXT,
    "playerAnonId" TEXT,
    "playerKeyHash" TEXT NOT NULL,
    "playerName" TEXT,
    "choices" JSONB NOT NULL,
    "correct" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "ChallengePlay_challengeId_playerKeyHash_key" ON "ChallengePlay"("challengeId", "playerKeyHash")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ChallengePlay_challengeId_createdAt_idx" ON "ChallengePlay"("challengeId", "createdAt")`,
  );

  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "ChallengeWatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengeId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "failCount" INTEGER NOT NULL DEFAULT 0
  )`);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "ChallengeWatch_challengeId_endpoint_key" ON "ChallengeWatch"("challengeId", "endpoint")`,
  );

  const rows = await prisma.$queryRawUnsafe<{ t: string; n: number }[]>(`
    SELECT 'Challenge' AS t, COUNT(*)::int AS n FROM "Challenge"
    UNION ALL SELECT 'ChallengePlay', COUNT(*)::int FROM "ChallengePlay"
    UNION ALL SELECT 'ChallengeWatch', COUNT(*)::int FROM "ChallengeWatch"`);
  for (const r of rows) console.log(`${r.t}: ${r.n} rows`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

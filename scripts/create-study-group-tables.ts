// Creates the study group tables (14 Sep 2026). Raw SQL, idempotent,
// additive — safe to run before the release that reads them.
//   npx dotenv-cli -e .env.local -- npx tsx scripts/create-study-group-tables.ts
// Shapes mirror the StudyGroup / StudyGroupMember models in
// prisma/schema.prisma (index names follow Prisma's convention).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StudyGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3)
  )`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "StudyGroup_token_key" ON "StudyGroup"("token")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StudyGroup_ownerUserId_idx" ON "StudyGroup"("ownerUserId")`);

  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StudyGroupMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3)
  )`);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "StudyGroupMember_groupId_userId_key" ON "StudyGroupMember"("groupId", "userId")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "StudyGroupMember_userId_leftAt_idx" ON "StudyGroupMember"("userId", "leftAt")`,
  );

  const rows = await prisma.$queryRawUnsafe<{ t: string; n: number }[]>(`
    SELECT 'StudyGroup' AS t, COUNT(*)::int AS n FROM "StudyGroup"
    UNION ALL SELECT 'StudyGroupMember', COUNT(*)::int FROM "StudyGroupMember"`);
  for (const r of rows) console.log(`${r.t}: ${r.n} rows`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

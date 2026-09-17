// "A friend joined your group" — schema for the maker's notifications
// (16 Sep 2026). Raw SQL, idempotent, additive — safe to run before or after
// the release that reads it (src/lib/study-group-db.ts skips phone and email,
// and stores the in-app row as ADMIN_MESSAGE, until it has run).
//   npx dotenv-cli -e .env.local -- npx tsx scripts/create-study-group-notify.ts
// WRITES TO PRODUCTION (.env.local = the production database): founder
// approval first.
//
//   • StudyGroup."lastPushAt" / "lastEmailAt" — the per-group caps (one phone
//     notification per 20 min, one email per 6 h), claimed atomically.
//   • StudyGroupWatch — devices the maker turned on for a group (a copy of
//     ChallengeWatch).
//   • NotificationType 'STUDY_GROUP_JOINED' — the in-app row's type.
// Mirror in prisma/schema.prisma: the two StudyGroup columns, a
// StudyGroupWatch model like ChallengeWatch (@@unique([groupId, endpoint])),
// and STUDY_GROUP_JOINED in enum NotificationType.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "StudyGroup" ADD COLUMN IF NOT EXISTS "lastPushAt" TIMESTAMP(3), ADD COLUMN IF NOT EXISTS "lastEmailAt" TIMESTAMP(3)`,
  );

  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "StudyGroupWatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "failCount" INTEGER NOT NULL DEFAULT 0
  )`);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "StudyGroupWatch_groupId_endpoint_key" ON "StudyGroupWatch"("groupId", "endpoint")`,
  );

  // Its own statement, outside any transaction: a value added in a
  // transaction can't be used until that transaction commits.
  await prisma.$executeRawUnsafe(`ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'STUDY_GROUP_JOINED'`);

  const cols = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'StudyGroup' AND column_name IN ('lastPushAt', 'lastEmailAt') ORDER BY column_name`,
  );
  const watch = await prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*)::int AS n FROM "StudyGroupWatch"`);
  const value = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT COUNT(*)::int AS n FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname = 'NotificationType' AND e.enumlabel = 'STUDY_GROUP_JOINED'`,
  );
  console.log(`StudyGroup cap columns: ${cols.map((c) => c.column_name).join(", ") || "MISSING"}`);
  console.log(`StudyGroupWatch: ${watch[0]?.n ?? 0} rows`);
  console.log(`NotificationType STUDY_GROUP_JOINED: ${Number(value[0]?.n ?? 0) > 0 ? "present" : "MISSING"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

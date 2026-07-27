import { prisma } from "../src/lib/db/prisma";

async function main() {
  // 1. Users with more than 1 mock attempt
  const multiAttempt = await prisma.$queryRaw<Array<{ email: string; n: bigint; firstAt: Date; lastAt: Date }>>`
    SELECT u."email", COUNT(a.*)::bigint AS n, MIN(a."startedAt") AS "firstAt", MAX(a."startedAt") AS "lastAt"
    FROM "User" u
    JOIN "Attempt" a ON a."userId" = u."id"
    GROUP BY u."email"
    HAVING COUNT(a.*) > 1
    ORDER BY COUNT(a.*) DESC, MAX(a."startedAt") DESC
  `;
  console.log(`USERS WITH 2+ MOCK ATTEMPTS: ${multiAttempt.length}`);
  for (const r of multiAttempt) {
    const days = Math.floor((r.lastAt.getTime() - r.firstAt.getTime()) / 86_400_000);
    console.log(`  ${r.email.padEnd(34)}  ${String(r.n).padStart(2)} attempts  span=${days}d`);
  }

  // 2. Users who came back on a DIFFERENT calendar day (UTC) after signup
  const multiDay = await prisma.$queryRaw<Array<{ email: string; days: bigint; createdAt: Date }>>`
    SELECT u."email", COUNT(DISTINCT DATE(a."startedAt"))::bigint AS days, u."createdAt"
    FROM "User" u
    JOIN "Attempt" a ON a."userId" = u."id"
    GROUP BY u."email", u."createdAt"
    HAVING COUNT(DISTINCT DATE(a."startedAt")) > 1
    ORDER BY days DESC
  `;
  console.log(`\nUSERS ACTIVE ON 2+ DIFFERENT DAYS: ${multiDay.length}`);
  for (const r of multiDay) {
    console.log(`  ${r.email.padEnd(34)}  ${r.days} active days`);
  }

  // 3. Total counts
  const [totalUsers, anyAttempt] = await Promise.all([
    prisma.user.count(),
    prisma.$queryRaw<Array<{ n: bigint }>>`SELECT COUNT(DISTINCT "userId")::bigint AS n FROM "Attempt"`,
  ]);
  console.log(`\nTOTAL`);
  console.log(`  total signups:                       ${totalUsers}`);
  console.log(`  signups who took at least 1 mock:    ${anyAttempt[0]?.n ?? 0n}`);
  console.log(`  signups with 2+ mock attempts:       ${multiAttempt.length}`);
  console.log(`  signups active on 2+ calendar days:  ${multiDay.length}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

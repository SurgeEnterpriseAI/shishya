import { prisma } from "../src/lib/db/prisma";

async function main() {
  const now = new Date();
  const h1 = new Date(now.getTime() - 60 * 60 * 1000);
  const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [users, usersToday, usersHour, attemptsTotal, attemptsToday, attemptsHour, finishedToday, chatMsgsToday, mocksTotal, transTotal, transToday] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: h24 } } }),
    prisma.user.count({ where: { createdAt: { gte: h1 } } }),
    prisma.attempt.count(),
    prisma.attempt.count({ where: { startedAt: { gte: h24 } } }),
    prisma.attempt.count({ where: { startedAt: { gte: h1 } } }),
    prisma.attempt.count({ where: { finishedAt: { gte: h24 } } }),
    prisma.$queryRaw<Array<{ n: bigint }>>`SELECT COUNT(*)::bigint AS n FROM "ChatMessage" WHERE "createdAt" >= ${h24}`,
    prisma.mock.count(),
    prisma.$queryRaw<Array<{ n: bigint }>>`SELECT COUNT(*)::bigint AS n FROM "QuestionTranslation"`,
    prisma.$queryRaw<Array<{ n: bigint }>>`SELECT COUNT(*)::bigint AS n FROM "QuestionTranslation" WHERE "createdAt" >= ${h24}`,
  ]);

  const onlineCutoff = new Date(now.getTime() - 15 * 60 * 1000);
  const activeAttemptsNow = await prisma.attempt.count({
    where: { finishedAt: null, startedAt: { gte: onlineCutoff } },
  });

  const recentSignups = await prisma.$queryRaw<Array<{ id: string; email: string; createdAt: Date; signupReferrerHost: string | null; signupReferrerUrl: string | null }>>`
    SELECT "id", "email", "createdAt", "signupReferrerHost", "signupReferrerUrl"
    FROM "User"
    WHERE "createdAt" >= ${d7}
    ORDER BY "createdAt" DESC
    LIMIT 20
  `;

  console.log(`as of ${now.toISOString()}\n`);
  console.log("USERS");
  console.log(`  total:        ${users}`);
  console.log(`  last hour:    ${usersHour}`);
  console.log(`  last 24h:     ${usersToday}`);
  console.log();
  console.log("MOCK ATTEMPTS");
  console.log(`  total:        ${attemptsTotal}`);
  console.log(`  last hour:    ${attemptsHour}`);
  console.log(`  last 24h:     ${attemptsToday}`);
  console.log(`  submitted 24h: ${finishedToday}`);
  console.log(`  active now (started ≤15m, not submitted): ${activeAttemptsNow}`);
  console.log();
  console.log("OTHER");
  console.log(`  AI chat msgs 24h: ${chatMsgsToday[0]?.n ?? 0n}`);
  console.log(`  mocks generated:  ${mocksTotal}`);
  console.log(`  translations:     ${transTotal[0]?.n ?? 0n} total / ${transToday[0]?.n ?? 0n} in last 24h`);
  console.log();

  console.log(`SIGNUPS LAST 7 DAYS (${recentSignups.length})`);
  let attributed = 0;
  for (const u of recentSignups) {
    const ref = u.signupReferrerHost || "-";
    if (ref !== "-") attributed++;
    console.log(`  ${u.createdAt.toISOString()}  ${u.email.slice(0, 32).padEnd(34)} ref=${ref}`);
  }
  console.log(`\nattribution captured on ${attributed}/${recentSignups.length} recent signups`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

import { prisma } from "../src/lib/db/prisma";

async function main() {
  const totalByLocale = await prisma.$queryRaw<Array<{locale: string; n: bigint}>>`
    SELECT "locale", COUNT(*)::bigint AS n
    FROM "QuestionTranslation"
    GROUP BY "locale"
    ORDER BY n DESC
  `;
  console.log("translation counts by locale:");
  for (const r of totalByLocale) console.log(`  ${r.locale}: ${r.n}`);

  const recent = await prisma.$queryRaw<Array<{locale: string; createdAt: Date; questionId: string}>>`
    SELECT "locale", "createdAt", "questionId"
    FROM "QuestionTranslation"
    WHERE "createdAt" > NOW() - INTERVAL '2 hours'
    ORDER BY "createdAt" DESC
    LIMIT 20
  `;
  console.log("\nrecent translations (last 2h):", recent.length);
  for (const r of recent) console.log(`  ${r.locale} ${r.createdAt.toISOString()} ${r.questionId}`);

  const newSignups = await prisma.$queryRaw<Array<{id: string; email: string; createdAt: Date; signupReferrerUrl: string | null; signupReferrerHost: string | null}>>`
    SELECT "id", "email", "createdAt", "signupReferrerUrl", "signupReferrerHost"
    FROM "User"
    WHERE "createdAt" > NOW() - INTERVAL '12 hours'
    ORDER BY "createdAt" DESC
  `;
  console.log("\nrecent signups (last 12h):", newSignups.length);
  for (const u of newSignups) console.log(`  ${u.email.slice(0,30)} @${u.createdAt.toISOString()} ref="${u.signupReferrerHost ?? '-'}" url="${u.signupReferrerUrl ?? '-'}"`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

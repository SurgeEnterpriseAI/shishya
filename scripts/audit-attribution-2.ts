import { prisma } from "../src/lib/db/prisma";

async function main() {
  // 1. ALL users whose attribution ever populated
  const tagged = await prisma.$queryRaw<Array<{ host: string | null; n: bigint }>>`
    SELECT "signupReferrerHost" AS host, COUNT(*)::bigint AS n
    FROM "User"
    GROUP BY "signupReferrerHost"
    ORDER BY n DESC
  `;
  console.log("All-time signup attribution breakdown:");
  for (const r of tagged) console.log(`  ${r.host ?? "<NULL>"}: ${r.n}`);

  // 2. Recent NULL users — what time-of-day, what pattern?
  const recentNull = await prisma.$queryRaw<Array<{
    email: string;
    createdAt: Date;
    emailVerified: Date | null;
    onboardedAt: Date | null;
  }>>`
    SELECT "email", "createdAt", "emailVerified", "onboardedAt"
    FROM "User"
    WHERE "signupReferrerHost" IS NULL
      AND "createdAt" >= NOW() - INTERVAL '24 hours'
    ORDER BY "createdAt" DESC
    LIMIT 10
  `;
  console.log(`\nRecent NULL-ref signups in last 24h: ${recentNull.length}`);
  for (const u of recentNull) {
    console.log(`  ${u.createdAt.toISOString()}  ${u.email.slice(0, 32).padEnd(34)} verified=${u.emailVerified?.toISOString().slice(0, 19) ?? "-"}  onboarded=${u.onboardedAt?.toISOString().slice(0, 19) ?? "-"}`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

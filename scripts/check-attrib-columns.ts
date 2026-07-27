import { prisma } from "../src/lib/db/prisma";

async function main() {
  // 1. Do the signup attribution columns exist?
  const cols = await prisma.$queryRaw<Array<{column_name: string; data_type: string; is_nullable: string}>>`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'User' AND column_name LIKE 'signup%'
    ORDER BY column_name
  `;
  console.log("User signup* columns:");
  for (const c of cols) console.log(`  ${c.column_name}  ${c.data_type}  nullable=${c.is_nullable}`);

  // 2. Are any users at all in the table populated for these columns?
  const populated = await prisma.$queryRaw<Array<{n: bigint}>>`
    SELECT COUNT(*)::bigint AS n
    FROM "User"
    WHERE "signupReferrerUrl" IS NOT NULL AND "signupReferrerUrl" != ''
  `;
  console.log(`\nusers with signupReferrerUrl populated: ${populated[0]?.n ?? 0n}`);

  // 3. Latest 3 signups + onboardedAt + emailVerified (to know if Google flow completed)
  const latest = await prisma.$queryRaw<Array<{id: string; email: string; createdAt: Date; emailVerified: Date | null; onboardedAt: Date | null}>>`
    SELECT "id", "email", "createdAt", "emailVerified", "onboardedAt"
    FROM "User"
    ORDER BY "createdAt" DESC
    LIMIT 5
  `;
  console.log("\nlatest 5 users:");
  for (const u of latest) {
    console.log(`  ${u.email.slice(0,32)} created=${u.createdAt.toISOString()} verified=${u.emailVerified?.toISOString() ?? '-'} onboarded=${u.onboardedAt?.toISOString() ?? '-'}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

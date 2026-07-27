import { prisma } from "../src/lib/db/prisma";

async function main() {
  // 1. Look at every user signed up in the last 6 hours
  const recent = await prisma.$queryRaw<Array<{
    id: string;
    email: string;
    createdAt: Date;
    signupReferrerUrl: string | null;
    signupReferrerHost: string | null;
  }>>`
    SELECT "id", "email", "createdAt", "signupReferrerUrl", "signupReferrerHost"
    FROM "User"
    WHERE "createdAt" > NOW() - INTERVAL '6 hours'
    ORDER BY "createdAt" DESC
  `;
  console.log("signups in last 6h:", recent.length);
  for (const u of recent) {
    console.log(
      `  ${u.createdAt.toISOString()}  ${u.email.slice(0, 32).padEnd(34)}` +
      `  url=${JSON.stringify(u.signupReferrerUrl)}  host=${JSON.stringify(u.signupReferrerHost)}`
    );
  }

  // 2. Check the columns' actual data type / nullability
  const cols = await prisma.$queryRaw<Array<{ column_name: string; data_type: string; is_nullable: string }>>`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'User' AND column_name LIKE 'signup%'
    ORDER BY column_name
  `;
  console.log("\nUser columns:");
  for (const c of cols) console.log(`  ${c.column_name} ${c.data_type} nullable=${c.is_nullable}`);

  // 3. Distinct signupReferrerHost values across all rows
  const dist = await prisma.$queryRaw<Array<{ host: string | null; n: bigint }>>`
    SELECT "signupReferrerHost" AS host, COUNT(*)::bigint AS n
    FROM "User"
    GROUP BY "signupReferrerHost"
    ORDER BY n DESC
  `;
  console.log("\ndistinct signupReferrerHost values:");
  for (const r of dist) console.log(`  ${JSON.stringify(r.host)}: ${r.n}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

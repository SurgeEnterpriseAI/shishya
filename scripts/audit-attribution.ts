// Audit attribution coverage on signups SINCE the middleware fix (commit 3b49b40)
// landed in production. The fix went out around 18:00 UTC May 17.

import { prisma } from "../src/lib/db/prisma";

const FIX_DEPLOY_UTC = new Date("2026-05-17T18:00:00Z");

async function main() {
  const recent = await prisma.$queryRaw<Array<{
    email: string;
    createdAt: Date;
    signupReferrerHost: string | null;
    signupReferrerUrl: string | null;
  }>>`
    SELECT "email", "createdAt", "signupReferrerHost", "signupReferrerUrl"
    FROM "User"
    WHERE "createdAt" >= ${FIX_DEPLOY_UTC}
    ORDER BY "createdAt" DESC
  `;
  console.log(`signups since fix deploy (${FIX_DEPLOY_UTC.toISOString()}): ${recent.length}`);

  let withRef = 0;
  let directTagged = 0;
  let nullRef = 0;
  for (const u of recent) {
    const ref = u.signupReferrerHost;
    if (!ref) nullRef++;
    else if (ref === "direct") directTagged++;
    else withRef++;
    console.log(`  ${u.createdAt.toISOString()}  ${u.email.slice(0, 32).padEnd(34)}  ref=${ref ?? "NULL"}`);
  }

  console.log(`\n--- summary ---`);
  console.log(`captured external ref:   ${withRef}`);
  console.log(`captured as direct:      ${directTagged}`);
  console.log(`NULL (capture failed):   ${nullRef}`);
  console.log(`coverage:                ${recent.length > 0 ? Math.round(((withRef + directTagged) * 100) / recent.length) : 0}%`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

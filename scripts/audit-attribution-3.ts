// Phase 0.2: thorough attribution audit.
// Look at signups that should have been attribution-captured (after the
// `await` fix at ~09:30 UTC) and bucket them.

import { prisma } from "../src/lib/db/prisma";

const AWAIT_FIX = new Date("2026-05-17T09:30:00Z");
const MIDDLEWARE_FIX = new Date("2026-05-17T14:00:00Z"); // 3b49b40

async function main() {
  const rows = await prisma.$queryRaw<Array<{
    email: string;
    createdAt: Date;
    signupReferrerHost: string | null;
    emailVerified: Date | null;
    onboardedAt: Date | null;
  }>>`
    SELECT "email", "createdAt", "signupReferrerHost", "emailVerified", "onboardedAt"
    FROM "User"
    WHERE "createdAt" >= ${AWAIT_FIX}
    ORDER BY "createdAt" ASC
  `;
  console.log(`signups since the await-fix at ${AWAIT_FIX.toISOString()}: ${rows.length}\n`);

  let postMiddleware_captured = 0;
  let postMiddleware_null = 0;
  let postMiddleware_neverReachedDashboard = 0;
  let preMiddleware_captured = 0;
  let preMiddleware_null = 0;

  for (const u of rows) {
    const phase = u.createdAt >= MIDDLEWARE_FIX ? "AFTER-mw" : "BEFORE-mw";
    const captured = u.signupReferrerHost && u.signupReferrerHost !== "";
    const reachedDashboard = u.onboardedAt !== null; // proxy: did they at least see the dashboard?
    console.log(
      `  ${u.createdAt.toISOString()} ${phase} ` +
      `ref=${u.signupReferrerHost ?? "NULL"} ` +
      `verified=${u.emailVerified ? "Y" : "N"} ` +
      `dashboard=${reachedDashboard ? "Y" : "N"} ` +
      `${u.email.slice(0, 28)}`,
    );
    if (phase === "AFTER-mw") {
      if (captured) postMiddleware_captured++;
      else if (!reachedDashboard) postMiddleware_neverReachedDashboard++;
      else postMiddleware_null++;
    } else {
      if (captured) preMiddleware_captured++;
      else preMiddleware_null++;
    }
  }

  console.log(`\n--- buckets ---`);
  console.log(`BEFORE the /api/auth/signin/* matcher fix (await-fix only):`);
  console.log(`  captured:                 ${preMiddleware_captured}`);
  console.log(`  NULL:                     ${preMiddleware_null}`);
  console.log(`AFTER the matcher fix:`);
  console.log(`  captured:                 ${postMiddleware_captured}`);
  console.log(`  NULL (never hit dashboard, can't capture): ${postMiddleware_neverReachedDashboard}`);
  console.log(`  NULL (reached dashboard but capture failed): ${postMiddleware_null}`);
  console.log(`\nCRITICAL: if the third bucket is >0, the await-fix isn't holding.`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

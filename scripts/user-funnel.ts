// User funnel + engagement-depth snapshot (complements user-activity.ts).
//
//   npx tsx scripts/user-funnel.ts
//
// Read-only. Answers: how many sign up, how far down the funnel they get,
// how deep the engaged ones go, where they come from.

import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const DAY = 86_400_000;
const ago = (d: number) => new Date(Date.now() - d * DAY);
const pct = (n: number, d: number) => (d <= 0 || n < 0 ? "—" : `${Math.round((n / d) * 100)}%`);

async function main() {
  const [
    users, onboarded, enrolledUsers, usersWithAttempt, usersWithChat,
    submitted, inProgress, chatSessions,
    signups1, signups7, signups30, active1, active7, startedTotal,
  ] = await Promise.all([
    p.user.count(),
    p.user.count({ where: { onboardedAt: { not: null } } }),
    p.user.count({ where: { enrollments: { some: { active: true } } } }),
    p.user.count({ where: { mocks: { some: {} } } }),
    p.user.count({ where: { chatSessions: { some: {} } } }),
    p.attempt.count({ where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } } }),
    p.attempt.count({ where: { status: "IN_PROGRESS" } }),
    p.chatSession.count(),
    p.user.count({ where: { createdAt: { gte: ago(1) } } }),
    p.user.count({ where: { createdAt: { gte: ago(7) } } }),
    p.user.count({ where: { createdAt: { gte: ago(30) } } }),
    p.attempt.count({ where: { startedAt: { gte: ago(1) } } }),
    p.attempt.count({ where: { startedAt: { gte: ago(7) } } }),
    p.attempt.count(),
  ]);

  console.log("=== FUNNEL ===");
  console.log(`signed up:       ${users}`);
  console.log(`onboarded:       ${onboarded} (${pct(onboarded, users)})`);
  console.log(`enrolled:        ${enrolledUsers} (${pct(enrolledUsers, users)})`);
  console.log(`started a mock:  ${usersWithAttempt} (${pct(usersWithAttempt, users)})`);
  console.log(`used tutor:      ${usersWithChat} (${pct(usersWithChat, users)})`);

  console.log("\n=== TOTALS ===");
  console.log(`submitted attempts: ${submitted} | in-progress: ${inProgress} | chat sessions: ${chatSessions}`);
  console.log(`attempt completion: ${pct(submitted, startedTotal)} (${submitted}/${startedTotal} started)`);

  console.log("\n=== RECENCY ===");
  console.log(`signups 24h/7d/30d: ${signups1} / ${signups7} / ${signups30}`);
  console.log(`attempts 24h/7d:    ${active1} / ${active7}`);

  const byUser = await p.attempt.groupBy({
    by: ["userId"],
    where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } },
    _count: { _all: true },
  });
  const doers = byUser.length;
  const total = byUser.reduce((s, r) => s + r._count._all, 0);
  console.log("\n=== ENGAGEMENT DEPTH ===");
  console.log(`users who submitted >=1: ${doers}`);
  console.log(`avg submitted / doer:    ${doers ? (total / doers).toFixed(1) : 0}`);
  console.log(`>=2 mocks: ${byUser.filter((r) => r._count._all >= 2).length} (${pct(byUser.filter((r) => r._count._all >= 2).length, doers)} of doers)`);
  console.log(`>=5 mocks: ${byUser.filter((r) => r._count._all >= 5).length}`);

  const sources = await p.$queryRawUnsafe<Array<{ host: string; n: number }>>(`
    SELECT COALESCE(NULLIF("signupReferrerHost", ''), '(direct/unknown)') AS host, COUNT(*)::int AS n
    FROM "User" GROUP BY 1 ORDER BY n DESC LIMIT 10
  `);
  console.log("\n=== SIGNUP SOURCES ===");
  for (const r of sources) console.log(`  ${r.host}: ${r.n}`);

  // Signup trend by day, last 14d.
  const trend = await p.$queryRawUnsafe<Array<{ d: string; n: number }>>(`
    SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS d, COUNT(*)::int AS n
    FROM "User" WHERE "createdAt" >= now() - interval '14 days'
    GROUP BY 1 ORDER BY 1
  `);
  console.log("\n=== SIGNUPS / DAY (14d) ===");
  for (const r of trend) console.log(`  ${r.d}: ${r.n}`);

  await p.$disconnect();
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });

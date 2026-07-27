// Read-only user activity report. Run periodically to spot trends.
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const now = Date.now();
  const h1 = new Date(now - 3600000);
  const h6 = new Date(now - 21600000);
  const h12 = new Date(now - 43200000);
  const h24 = new Date(now - 86400000);

  const [uTotal, uH1, uH6, uH12, uH24] = await Promise.all([
    p.user.count(),
    p.user.count({ where: { createdAt: { gte: h1 } } }),
    p.user.count({ where: { createdAt: { gte: h6 } } }),
    p.user.count({ where: { createdAt: { gte: h12 } } }),
    p.user.count({ where: { createdAt: { gte: h24 } } }),
  ]);
  const [aH1, aH6, aH12, aH24, aTotal] = await Promise.all([
    p.attempt.groupBy({ by: ["userId"], where: { startedAt: { gte: h1 } } }).then((r) => r.length),
    p.attempt.groupBy({ by: ["userId"], where: { startedAt: { gte: h6 } } }).then((r) => r.length),
    p.attempt.groupBy({ by: ["userId"], where: { startedAt: { gte: h12 } } }).then((r) => r.length),
    p.attempt.groupBy({ by: ["userId"], where: { startedAt: { gte: h24 } } }).then((r) => r.length),
    p.attempt.groupBy({ by: ["userId"] }).then((r) => r.length),
  ]);
  const [mH1, mH6, mH24, mTotal, mSub24] = await Promise.all([
    p.attempt.count({ where: { startedAt: { gte: h1 } } }),
    p.attempt.count({ where: { startedAt: { gte: h6 } } }),
    p.attempt.count({ where: { startedAt: { gte: h24 } } }),
    p.attempt.count(),
    p.attempt.count({ where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, finishedAt: { gte: h24 } } }),
  ]);
  const [cH24, cTotal, enTotal, enH24] = await Promise.all([
    p.chatMessage.count({ where: { createdAt: { gte: h24 } } }),
    p.chatMessage.count(),
    p.enrollment.count(),
    p.enrollment.count({ where: { createdAt: { gte: h24 } } }),
  ]);
  const [frTotal, frH24, qrTotal, qrH24] = await Promise.all([
    p.featureRequest.count(),
    p.featureRequest.count({ where: { createdAt: { gte: h24 } } }),
    p.questionReport.count(),
    p.questionReport.count({ where: { createdAt: { gte: h24 } } }),
  ]);

  const recentSignups = await p.user.findMany({
    where: { createdAt: { gte: h24 } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { email: true, name: true, createdAt: true },
  });
  const recentMocks = await p.attempt.findMany({
    where: { startedAt: { gte: h24 } },
    orderBy: { startedAt: "desc" },
    take: 10,
    include: {
      user: { select: { email: true, name: true } },
      mock: { select: { title: true, exam: { select: { shortName: true } } } },
    },
  });

  const j = (label: string, v: any) => console.log(label.padEnd(36) + v);

  console.log("=== USERS ===");
  j("Total signups ever:", uTotal);
  j("  in last 1h:", uH1);
  j("  in last 6h:", uH6);
  j("  in last 12h:", uH12);
  j("  in last 24h:", uH24);
  console.log();
  console.log("=== ACTIVE STUDENTS (started a mock) ===");
  j("All-time distinct active:", aTotal);
  j("  in last 1h:", aH1);
  j("  in last 6h:", aH6);
  j("  in last 12h:", aH12);
  j("  in last 24h:", aH24);
  console.log();
  console.log("=== MOCK ATTEMPTS ===");
  j("All-time started:", mTotal);
  j("  started in last 1h:", mH1);
  j("  started in last 6h:", mH6);
  j("  started in last 24h:", mH24);
  j("  submitted in last 24h:", mSub24);
  console.log();
  console.log("=== ENGAGEMENT (24h vs total) ===");
  j("Chat messages:", `${cH24} / ${cTotal}`);
  j("Enrollments:", `${enH24} / ${enTotal}`);
  j("Feature requests:", `${frH24} / ${frTotal}`);
  j("Question reports:", `${qrH24} / ${qrTotal}`);
  console.log();
  console.log("=== RECENT SIGNUPS (last 24h, up to 10) ===");
  if (recentSignups.length === 0) console.log("  none");
  for (const u of recentSignups) {
    const mins = Math.round((now - u.createdAt.getTime()) / 60000);
    const ago = mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
    console.log(`  ${ago.padEnd(8)}  ${(u.name || "-").padEnd(22)}  ${u.email}`);
  }
  console.log();
  console.log("=== RECENT MOCK ATTEMPTS (last 24h, up to 10) ===");
  if (recentMocks.length === 0) console.log("  none");
  for (const a of recentMocks) {
    const mins = Math.round((now - a.startedAt.getTime()) / 60000);
    const ago = mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
    const who = a.user.name || (a.user.email?.split("@")[0] ?? "anon");
    console.log(`  ${ago.padEnd(8)}  ${who.padEnd(20)}  ${(a.mock.exam.shortName || "?").padEnd(22)}  ${a.status}`);
  }

  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

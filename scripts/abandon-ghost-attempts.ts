// scripts/abandon-ghost-attempts.ts
//
// One-shot + cron-friendly cleanup. Marks IN_PROGRESS attempts as
// ABANDONED when they show no real student activity:
//
//   - status = IN_PROGRESS
//   - startedAt older than 12 hours ago
//   - zero answered questions (no answers array element with .chosen)
//
// Why: ghost attempts pollute the dashboard recovery banner, mess up
// /admin/insights analytics, and make "active students" counts look
// healthier than they are. Real students who paused mid-mock are
// detectable because answers.length > 0 — those are NOT touched.
//
// Idempotent: safe to run any time. Run once now to clean the backlog
// (Sachin's 3 RRB mocks, Vamsi's 5-day-old ones, etc.) and add to the
// daily cron to keep it tidy going forward.
//
// USAGE
//   npx tsx scripts/abandon-ghost-attempts.ts            # process + commit
//   npx tsx scripts/abandon-ghost-attempts.ts --dry-run  # preview, no writes

import { PrismaClient } from "@prisma/client";

const GHOST_THRESHOLD_HOURS = 12;

async function main() {
  const dry = process.argv.includes("--dry-run");
  const p = new PrismaClient();

  const cutoff = new Date(Date.now() - GHOST_THRESHOLD_HOURS * 3600_000);
  const candidates = await p.attempt.findMany({
    where: { status: "IN_PROGRESS", startedAt: { lt: cutoff } },
    select: { id: true, userId: true, answers: true, startedAt: true, mockId: true },
  });

  const ghosts = candidates.filter((a) => {
    const ans = (a.answers as any[]) ?? [];
    // "Ghost" = no actual student input. Either empty array OR every
    // entry has chosen === null/undefined (we sometimes pre-seed
    // skeletons). Real students leave at least one `chosen`.
    return ans.length === 0 || ans.every((x) => !x?.chosen);
  });

  console.log(`Scanned ${candidates.length} IN_PROGRESS attempts older than ${GHOST_THRESHOLD_HOURS}h`);
  console.log(`Ghosts (zero answered): ${ghosts.length}`);
  if (ghosts.length === 0) {
    await p.$disconnect();
    return;
  }

  if (dry) {
    console.log(`\nDry run — would mark these ABANDONED:`);
    for (const g of ghosts) {
      const ageH = ((Date.now() - g.startedAt.getTime()) / 3600_000).toFixed(1);
      console.log(`  ${g.id}  user=${g.userId.slice(-6)}  age=${ageH}h`);
    }
    await p.$disconnect();
    return;
  }

  const res = await p.attempt.updateMany({
    where: { id: { in: ghosts.map((g) => g.id) } },
    data: { status: "ABANDONED", finishedAt: new Date() },
  });
  console.log(`\nMarked ${res.count} attempts as ABANDONED.`);

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

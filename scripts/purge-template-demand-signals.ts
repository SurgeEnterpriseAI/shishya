// Removes demand signals that were mined from Shishya's own prefilled tutor
// prompts (15 Sep 2026). The miner's old prefix list missed 16 templates, so
// clusters such as "calculation speed tips" and "syllabus coverage guide"
// counted our own buttons ("Give me 3 fastest shortcuts to solve …", "Go
// deeper on … — examples and edge cases I should know") as student demand.
// Same rule the 1 Sep purge of "Quiz me on" signals followed: a quote must be
// the student's own words. Dry run by default; --apply deletes.
//
//   npx dotenv-cli -e .env.local -- npx tsx scripts/purge-template-demand-signals.ts [--apply]

import { PrismaClient } from "@prisma/client";
import { isOurTutorPrompt } from "../src/lib/tutor-templates";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  const rows = await prisma.$queryRaw<{ id: string; clusterKey: string; quote: string; source: string }[]>`
    SELECT id, "clusterKey", quote, source FROM "DemandSignal" WHERE source IN ('chat', 'guest-chat')`;
  const ours = rows.filter((r) => isOurTutorPrompt(r.quote));
  const byCluster = new Map<string, number>();
  for (const r of ours) byCluster.set(r.clusterKey, (byCluster.get(r.clusterKey) ?? 0) + 1);
  console.log(`chat signals: ${rows.length} · from Shishya's own prompts: ${ours.length}`);
  for (const [k, n] of [...byCluster.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${n}`);
  for (const r of ours.slice(0, 12)) console.log(`    - ${r.quote.slice(0, 110)}`);
  if (!APPLY) {
    console.log("dry run — re-run with --apply to delete");
    return;
  }
  const deleted = await prisma.$executeRaw`DELETE FROM "DemandSignal" WHERE id = ANY(${ours.map((r) => r.id)})`;
  console.log(`deleted ${deleted} signals`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

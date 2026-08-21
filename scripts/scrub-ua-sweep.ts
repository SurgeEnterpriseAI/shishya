// scripts/scrub-ua-sweep.ts — manual run of the high-confidence botnet
// scrub. Same logic as the hourly cron (/api/cron/scrub-bots); both call
// runBotScrub() in src/lib/bot-scrub.ts (single source of truth).
//
// Removes ONLY unmistakable botnets (≥15 distinct IPs on one UA, no
// referrer, 1 view/IP) and restores everything ambiguous to human. See
// src/lib/bot-scrub.ts for the full rationale (founder rule 20 Aug 2026).
//
// USAGE: npx tsx --env-file=.env.local scripts/scrub-ua-sweep.ts
import { PrismaClient } from "@prisma/client";
import { runBotScrub } from "../src/lib/bot-scrub";

const p = new PrismaClient();
async function main() {
  const r = await runBotScrub(p as any);
  console.log(`convicted botnet UAs: ${r.convicted}`);
  console.log(`restored ${r.restored} rows to human (below the botnet bar)`);
  console.log(`tagged ${r.tagged} page-view rows as botnet`);
  console.log(`tagged ${r.beacons} non-PAGE_VIEW beacon rows`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());

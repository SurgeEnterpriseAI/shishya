// One-off: mine the last N days of free-form user text into demand
// signals so /admin/demand starts with a month of insight instead of
// an empty grid. Safe to re-run — (source, sourceId) dedupes forever.
//
//   npx tsx --env-file=.env.local scripts/backfill-demand.ts [--days 30]
//
// Runs in 5-day windows (keeps each Claude batch small), then one
// consolidation pass at the end.

import { prisma } from "../src/lib/db/prisma";
import { consolidateDemand, mineDemand } from "../src/lib/demand-mine";

const days = Math.max(1, Number(process.argv[process.argv.indexOf("--days") + 1] ?? 30) || 30);

async function main() {
  const now = Date.now();
  const STEP = 5;
  let totals = { scanned: 0, demands: 0, inserted: 0 };
  for (let back = days; back > 0; back -= STEP) {
    const since = new Date(now - back * 86_400_000);
    const until = new Date(now - Math.max(0, back - STEP) * 86_400_000);
    const r = await mineDemand(prisma, since, until);
    totals = { scanned: totals.scanned + r.scanned, demands: totals.demands + r.demands, inserted: totals.inserted + r.inserted };
    console.log(`  ${since.toISOString().slice(0, 10)} → ${until.toISOString().slice(0, 10)}  scanned=${r.scanned} demands=${r.demands} inserted=${r.inserted}`);
  }
  console.log("mining totals:", JSON.stringify(totals));
  const c = await consolidateDemand(prisma);
  console.log(`consolidation: merges=${c.merges}`);
  if (c.digest) console.log("digest:", c.digest);
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

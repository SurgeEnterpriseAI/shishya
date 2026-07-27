// One-off backfill: extract structured results from the last 30 days of
// news so the Results tab launches populated. Run:
//   DATABASE_URL=... ANTHROPIC_API_KEY=... npx tsx scripts/seed-results.ts

import { extractResults } from "../src/lib/results-extract";

async function main() {
  const out = await extractResults({ days: 30, cap: 80 });
  console.log(`scanned=${out.scanned} inserted=${out.inserted} skipped=${out.skipped}`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});

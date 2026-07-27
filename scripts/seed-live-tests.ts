// One-off / manual: create next Sunday's All-India Live Tests now
// (the Saturday cron does this weekly in prod). Run:
//   DATABASE_URL=... npx tsx scripts/seed-live-tests.ts

import { createWeeklyLiveTests, nextSundayWindowUTC } from "../src/lib/live-test";

async function main() {
  const { opensAt, closesAt } = nextSundayWindowUTC();
  console.log(
    `Creating live tests for window ${opensAt.toISOString()} → ${closesAt.toISOString()}`,
  );
  const results = await createWeeklyLiveTests();
  for (const r of results) {
    console.log(`  ${r.created ? "CREATED" : "exists "} ${r.examCode} → mock ${r.mockId}`);
  }
  if (!results.length) console.log("  (no exams had enough enrollment/questions)");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});

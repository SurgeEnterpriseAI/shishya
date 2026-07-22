// One-shot: generate today's current-affairs digest so the pages have
// content immediately (the daily cron takes over from tomorrow).
import { generateDailyCurrentAffairs } from "../src/lib/current-affairs";

async function main() {
  const ist = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
  console.log("Generating current affairs for", ist, "…");
  const r = await generateDailyCurrentAffairs({ istDate: ist });
  console.log(`items: ${r.items.length} | est $${((r.inputTokens * 3 + r.outputTokens * 15) / 1e6).toFixed(3)}`);
  for (const it of r.items) console.log(`  • [${it.category}] ${it.title}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error("FAILED:", e); process.exit(1); });

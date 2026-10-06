// One-shot: generate today's current-affairs digest so the pages have
// content immediately (the daily cron takes over from tomorrow).
//
// 6 Oct 2026 (B2): runs the cron's own slot (src/lib/current-affairs-slot.ts),
// so a hand seed obeys the same rule: no call when today already has rows,
// when another run's call is in flight, or when this slot has already paid
// (one paid call per slot; before 06:30 IST one call is allowed).
import { runCurrentAffairsSlot } from "../src/lib/current-affairs-slot";

async function main() {
  const r = await runCurrentAffairsSlot(new Date());
  console.log("Current affairs for", r.istDate, "→", r.kind);
  if (r.kind === "skipped") console.log("  ", JSON.stringify(r.decision));
  if (r.kind === "call-failed") throw r.error;
  if (r.kind === "written") {
    console.log(`items: ${r.written} | est $${((r.inputTokens * 3 + r.outputTokens * 15) / 1e6).toFixed(3)}`);
    for (const it of r.items) console.log(`  • [${it.category}] ${it.title}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error("FAILED:", e); process.exit(1); });

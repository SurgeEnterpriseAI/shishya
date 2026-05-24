// Manually run the phase-article refresh. Useful for:
//   - One-off smoke testing
//   - Forcing a refresh outside the 2-hour window
//   - Debugging a single exam (--exam UPSC_PRELIMS)
//
// Run with:
//   set -a && source <(awk -F= '/^DATABASE_URL=|^ANTHROPIC_API_KEY=/ {gsub(/^"|"$/,"",$2); print}' .env.local) && set +a
//   npx tsx scripts/refresh-phase-articles.ts [--exam CODE]

import { refreshPhaseArticles } from "../src/lib/refresh-phase-articles";

async function main() {
  const examFlag = process.argv.indexOf("--exam");
  const examCodeOverride = examFlag !== -1 ? process.argv[examFlag + 1] : undefined;

  console.log(`Starting phase-article refresh${examCodeOverride ? ` (only ${examCodeOverride})` : ""}…`);
  const t0 = Date.now();
  // Override min-minutes to 0 for manual runs so we always force a re-summary.
  const report = await refreshPhaseArticles({
    examCodeOverride,
    minMinutesBetweenRuns: 0,
  });
  const ms = Date.now() - t0;

  console.log(`\nFinished in ${(ms / 1000).toFixed(1)}s`);
  console.log(`Candidates considered: ${report.candidatesConsidered}`);
  console.log(`Claude calls: ${report.claudeCalls}`);
  console.log(`\n✓ Refreshed (${report.refreshed.length}):`);
  for (const r of report.refreshed) {
    console.log(`  - ${r.examCode} ${r.phase} (${r.snippetCount} snippets) — ${r.title}`);
  }
  if (report.skipped.length > 0) {
    console.log(`\n⏭  Skipped (${report.skipped.length}):`);
    for (const s of report.skipped) console.log(`  - ${s.examCode} ${s.phase} — ${s.reason}`);
  }
  if (report.errors.length > 0) {
    console.log(`\n✗ Errors (${report.errors.length}):`);
    for (const e of report.errors) console.log(`  - ${e.examCode} ${e.phase} — ${e.error}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

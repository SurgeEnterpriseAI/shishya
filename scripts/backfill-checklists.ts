// One-shot backfill: generate evergreen CHECKLIST phase articles for every
// exam currently in its T-7..T-1 window that doesn't already have one.
//
// WHY this exists separately from the 2-hour cron: the cron scrapes
// Reddit/RSS first, and a slow/hung source can kill the run before it ever
// reaches the (lowest-priority) CHECKLIST candidates. A last-minute
// checklist is evergreen exam knowledge — it needs no scraped chatter — so
// this script skips scraping entirely and calls the summariser with an
// empty snippet set (the knowledge-only path added to summarisePhase).
//
// Run with:
//   set -a && source <(awk -F= '/^DATABASE_URL=|^DIRECT_URL=|^ANTHROPIC_API_KEY=/ {gsub(/^"|"$/,"",$2); print $1"="$2}' .env.local) && set +a
//   npx tsx scripts/backfill-checklists.ts [--limit N] [--dry]

import { prisma } from "../src/lib/db/prisma";
import { resolvePhase } from "../src/lib/exam-phase";
import { summarisePhase } from "../src/lib/ai/phase-summariser";

async function main() {
  const dry = process.argv.includes("--dry");
  const limFlag = process.argv.indexOf("--limit");
  const limit = limFlag !== -1 ? Number(process.argv[limFlag + 1]) : 40;

  const now = new Date();
  // CHECKLIST window is T-1..T-7; pull a slightly wider date band and let
  // resolvePhase() be the source of truth (it's IST-aware).
  const from = new Date(now.getTime() - 1 * 86_400_000);
  const to = new Date(now.getTime() + 8 * 86_400_000);

  const rows = await prisma.examImportantDate.findMany({
    where: {
      date: { gte: from, lte: to },
      isExamDay: true,
      archivedAt: null,
      exam: { active: true },
    },
    include: { exam: { select: { id: true, code: true, shortName: true, name: true } } },
    orderBy: { date: "asc" },
  });

  // Dedupe to (examId) — one checklist per exam — keeping only those whose
  // current phase is CHECKLIST.
  const seen = new Set<string>();
  const targets: { examId: string; code: string; short: string; name: string }[] = [];
  for (const r of rows) {
    if (resolvePhase(r.date, now) !== "CHECKLIST") continue;
    if (seen.has(r.exam.id)) continue;
    seen.add(r.exam.id);
    targets.push({ examId: r.exam.id, code: r.exam.code, short: r.exam.shortName, name: r.exam.name });
  }

  // Skip exams that already have an active CHECKLIST article.
  const needing: typeof targets = [];
  for (const t of targets) {
    const existing = await prisma.examPhaseArticle.findFirst({
      where: { examId: t.examId, phase: "CHECKLIST", archivedAt: null },
      select: { id: true },
    });
    if (!existing) needing.push(t);
  }

  console.log(`In CHECKLIST window: ${targets.length} exams`);
  console.log(`Already have a checklist: ${targets.length - needing.length}`);
  console.log(`Need a checklist: ${needing.length}`);
  console.log(needing.map((t) => t.code).join(", ") || "(none)");
  if (dry) {
    await prisma.$disconnect();
    return;
  }

  let made = 0;
  for (const t of needing.slice(0, limit)) {
    process.stdout.write(`  ${t.code} … `);
    try {
      const summary = await summarisePhase({
        examShortName: t.short,
        examName: t.name,
        examCode: t.code,
        phase: "CHECKLIST",
        snippets: [], // knowledge-only — no scraping
      });
      if (!summary) {
        console.log("skipped (summariser returned null)");
        continue;
      }
      const nowTs = new Date();
      await prisma.examPhaseArticle.create({
        data: {
          examId: t.examId,
          phase: "CHECKLIST",
          slug: "checklist",
          title: summary.title,
          summarySnippet: summary.summarySnippet,
          bodyMarkdown: summary.bodyMarkdown,
          sourcesScraped: summary.sourcesUsed,
          lastUpdatedAt: nowTs,
          lastScrapedAt: nowTs,
        },
      });
      made++;
      console.log(`✓ ${summary.title.slice(0, 60)}`);
    } catch (err) {
      console.log(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\nDone. Created ${made} checklist article(s).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

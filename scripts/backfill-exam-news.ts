// scripts/backfill-exam-news.ts
//
// One-shot catch-up for the news-staleness incident (2026-07-05): the daily
// refresh-exam-data cron processed its slice alphabetically and was killed at
// maxDuration mid-run, so 105 of 177 exams sat frozen at 54+ days. The cron is
// now most-stale-first + time-guarded (self-healing), but at ~12-16 exams/day
// it would take a week to clear the backlog. This script clears it in one run
// from the local machine (no serverless time limit), using the exact same
// per-exam logic as the cron: generateExamInfo (web search on), archive prior
// AI rows, insert fresh news + important dates.
//
// USAGE
//   npx tsx scripts/backfill-exam-news.ts                # stale >7d, $10 cap
//   npx tsx scripts/backfill-exam-news.ts --budget 15
//   npx tsx scripts/backfill-exam-news.ts --stale-days 3
//
// Idempotent: re-running skips exams already refreshed within --stale-days.

import { prisma } from "../src/lib/db/prisma";
import { generateExamInfo } from "../src/lib/ai/exam-info";

const GEN_SOURCE = "ai-generated:claude";
const COST_PER_EXAM_USD = 0.06; // sonnet + web search, conservative
const CONCURRENCY = Math.max(1, Number(process.env.NEWS_CONCURRENCY ?? 4));

function arg(name: string, dflt: number): number {
  const i = process.argv.indexOf(name);
  return i > -1 ? parseFloat(process.argv[i + 1]) : dflt;
}
const BUDGET_USD = arg("--budget", 10);
const STALE_DAYS = arg("--stale-days", 7);

async function main() {
  const staleness = await prisma.examNewsItem.groupBy({
    by: ["examId"],
    where: { source: GEN_SOURCE },
    _max: { createdAt: true },
  });
  const lastByExam = new Map(
    staleness.map((s) => [s.examId, s._max.createdAt?.getTime() ?? 0]),
  );
  const cutoff = Date.now() - STALE_DAYS * 24 * 3600 * 1000;
  const exams = (
    await prisma.exam.findMany({
      where: { active: true },
      select: { id: true, code: true, name: true, shortName: true, category: true },
    })
  )
    .filter((e) => (lastByExam.get(e.id) ?? 0) < cutoff)
    .sort((a, b) => (lastByExam.get(a.id) ?? 0) - (lastByExam.get(b.id) ?? 0));

  console.log(`Backfill: ${exams.length} exams stale >${STALE_DAYS}d · budget $${BUDGET_USD} · conc ${CONCURRENCY}`);

  let spent = 0, done = 0, failed = 0, cursor = 0, stop = false;

  const worker = async (): Promise<void> => {
    while (!stop) {
      if (spent >= BUDGET_USD) { stop = true; return; }
      const i = cursor++;
      if (i >= exams.length) return;
      const exam = exams[i];
      try {
        const info = await generateExamInfo(
          {
            examCode: exam.code,
            examName: exam.name,
            examShortName: exam.shortName,
            category: String(exam.category),
          },
          { useWebSearch: true },
        );
        const now = new Date();
        await prisma.examNewsItem.updateMany({
          where: { examId: exam.id, source: GEN_SOURCE, archivedAt: null },
          data: { archivedAt: now },
        });
        await prisma.examImportantDate.updateMany({
          where: { examId: exam.id, source: GEN_SOURCE, archivedAt: null },
          data: { archivedAt: now },
        });
        for (const n of info.news) {
          await prisma.examNewsItem.create({
            data: {
              examId: exam.id,
              title: n.title,
              body: n.body,
              source: GEN_SOURCE,
              publishedAt: new Date(now.getTime() - n.daysAgo * 24 * 60 * 60 * 1000),
            },
          });
        }
        for (const d of info.dates) {
          await prisma.examImportantDate.create({
            data: {
              examId: exam.id,
              label: d.label,
              date: new Date(now.getTime() + d.daysFromNow * 24 * 60 * 60 * 1000),
              isExamDay: d.isExamDay,
              notes: d.notes,
              source: GEN_SOURCE,
            },
          });
        }
        spent += COST_PER_EXAM_USD;
        done++;
        console.log(`  ✓ ${exam.code.padEnd(22)} news=${info.news.length} dates=${info.dates.length}  ~$${spent.toFixed(2)}  (${done + failed}/${exams.length})`);
      } catch (err: any) {
        failed++;
        console.warn(`  ✗ ${exam.code}: ${String(err?.message ?? err).slice(0, 100)}`);
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  console.log(`\nDone. refreshed=${done} failed=${failed} skipped=${exams.length - done - failed} est=$${spent.toFixed(2)}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

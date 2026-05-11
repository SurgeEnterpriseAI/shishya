// scripts/seed-news-dates-all.ts
//
// Generates plausible news bullets + important dates for every active exam
// using Claude (src/lib/ai/exam-info.ts). Idempotent: replaces previously
// AI-generated rows (source = "ai-generated:claude") but never deletes
// human-curated rows (those with source = null or a real URL).
//
// USAGE
//   npx dotenv-cli -e .env.local -- npx tsx scripts/seed-news-dates-all.ts
//   npx dotenv-cli -e .env.local -- npx tsx scripts/seed-news-dates-all.ts --exams SSC_CGL,RRB_NTPC
//   npx dotenv-cli -e .env.local -- npx tsx scripts/seed-news-dates-all.ts --top 30
//   npx dotenv-cli -e .env.local -- npx tsx scripts/seed-news-dates-all.ts --refresh
//
// FLAGS
//   --exams CSV    explicit exam codes
//   --top N        process N most popular exams (enrollment count, then code)
//   --refresh      ALSO overwrite exams that already have AI-generated data
//                  newer than 7 days. Without this flag those are skipped
//                  so the script is cheap to re-run.
//   --budget USD   soft cost cap (default $20 — each exam costs ~$0.03-0.06)
//   --dry-run      print plan; no Anthropic calls or DB writes

import { PrismaClient } from "@prisma/client";
import { generateExamInfo } from "../src/lib/ai/exam-info";

const GEN_SOURCE = "ai-generated:claude";
const REFRESH_AFTER_DAYS = 7;
// Sonnet 4.5 input ~$3/M, output ~$15/M. Each exam call: ~1k input + ~1.5k
// output ≈ $0.026. Round up for prompt cache miss + retries.
const COST_PER_EXAM_USD = 0.04;

interface Args {
  exams?: string[];
  top?: number;
  refresh: boolean;
  budget: number;
  dryRun: boolean;
}

function parseArgs(): Args {
  const a: any = { refresh: false, budget: 20, dryRun: false };
  const argv = process.argv;
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case "--exams":   a.exams = next().split(",").map((s: string) => s.trim()); break;
      case "--top":     a.top = parseInt(next(), 10); break;
      case "--refresh": a.refresh = true; break;
      case "--budget":  a.budget = parseFloat(next()); break;
      case "--dry-run": a.dryRun = true; break;
    }
  }
  return a as Args;
}

const p = new PrismaClient();

async function pickExams(args: Args) {
  if (args.exams) {
    return p.exam.findMany({
      where: { code: { in: args.exams }, active: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, shortName: true, category: true },
    });
  }
  if (args.top) {
    const enroll = await p.enrollment.groupBy({
      by: ["examId"],
      _count: { _all: true },
      orderBy: { _count: { userId: "desc" } as any },
    });
    const top = enroll.slice(0, args.top).map((r) => r.examId);
    const exams = await p.exam.findMany({
      where: { id: { in: top }, active: true },
      select: { id: true, code: true, name: true, shortName: true, category: true },
    });
    // Pad with code-ordered exams if enrollments < top
    if (top.length < args.top) {
      const more = await p.exam.findMany({
        where: { id: { notIn: top }, active: true },
        orderBy: { code: "asc" },
        take: args.top - top.length,
        select: { id: true, code: true, name: true, shortName: true, category: true },
      });
      exams.push(...more);
    }
    return exams;
  }
  return p.exam.findMany({
    where: { active: true },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, shortName: true, category: true },
  });
}

async function main() {
  const args = parseArgs();
  const exams = await pickExams(args);

  console.log(`=== seed-news-dates-all ===`);
  console.log(`Exams in scope: ${exams.length}`);
  console.log(`Refresh stale (older than ${REFRESH_AFTER_DAYS}d): ${args.refresh ? "YES" : "no"}`);
  console.log(`Budget: $${args.budget.toFixed(2)}  Mode: ${args.dryRun ? "DRY RUN" : "LIVE"}\n`);

  // Find exams that already have fresh AI-generated data so we can skip them.
  const cutoff = new Date(Date.now() - REFRESH_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const fresh = args.refresh
    ? new Set<string>()
    : new Set(
        (
          await p.examNewsItem.findMany({
            where: {
              examId: { in: exams.map((e) => e.id) },
              source: GEN_SOURCE,
              createdAt: { gte: cutoff },
            },
            select: { examId: true },
            distinct: ["examId"],
          })
        ).map((r) => r.examId),
      );

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let spentUSD = 0;

  for (const exam of exams) {
    if (fresh.has(exam.id)) {
      console.log(`  (skip) ${exam.code.padEnd(22)} fresh data exists`);
      skipped += 1;
      continue;
    }
    if (spentUSD >= args.budget) {
      console.log(`\n[budget] stopping — estimated spend $${spentUSD.toFixed(2)} >= $${args.budget.toFixed(2)}`);
      break;
    }

    console.log(`  → ${exam.code.padEnd(22)} ${exam.shortName}`);
    if (args.dryRun) {
      processed += 1;
      spentUSD += COST_PER_EXAM_USD;
      continue;
    }

    try {
      const info = await generateExamInfo({
        examCode: exam.code,
        examName: exam.name,
        examShortName: exam.shortName,
        category: String(exam.category),
      });
      const now = new Date();

      // Replace previous AI-generated rows (preserve human-curated ones).
      await p.examNewsItem.deleteMany({
        where: { examId: exam.id, source: GEN_SOURCE },
      });
      await p.examImportantDate.deleteMany({
        where: { examId: exam.id, source: GEN_SOURCE },
      });

      for (const n of info.news) {
        await p.examNewsItem.create({
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
        await p.examImportantDate.create({
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

      console.log(`     ✓ ${info.news.length} news, ${info.dates.length} dates  (in=${info.inputTokens} out=${info.outputTokens})`);
      processed += 1;
      spentUSD += COST_PER_EXAM_USD;
    } catch (err) {
      console.error(`     ✗ ${exam.code} failed:`, (err as Error).message);
      failed += 1;
    }
  }

  console.log(`\n=== summary ===`);
  console.log(`Processed: ${processed}`);
  console.log(`Skipped (fresh): ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Estimated spend: ~$${spentUSD.toFixed(2)}`);
  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});

// scripts/seed-rank-bands.ts
//
// Generates AI rank→outcome bands for every exam (or a chosen subset).
// Idempotent: replaces previously AI-generated rows (source =
// "ai-generated:claude") on each run; human-curated rows are preserved.
//
// USAGE
//   npx dotenv-cli -e .env.local -- npx tsx scripts/seed-rank-bands.ts
//   npx dotenv-cli -e .env.local -- npx tsx scripts/seed-rank-bands.ts --top 25
//   npx dotenv-cli -e .env.local -- npx tsx scripts/seed-rank-bands.ts --exams JEE_MAIN,NEET_UG
//   npx dotenv-cli -e .env.local -- npx tsx scripts/seed-rank-bands.ts --refresh --top 30
//
// FLAGS
//   --exams CSV    explicit exam codes
//   --top N        process N most popular exams (enrollment then code)
//   --refresh      ALSO overwrite exams that already have AI-generated bands
//   --budget USD   soft cost cap (default $15 — ~$0.04-0.08 per exam)
//   --dry-run

import { PrismaClient } from "@prisma/client";
import { generateRankBands } from "../src/lib/ai/rank-bands";

const GEN_SOURCE = "ai-generated:claude";
const COST_PER_EXAM_USD = 0.06;

interface Args {
  exams?: string[];
  top?: number;
  refresh: boolean;
  budget: number;
  dryRun: boolean;
}

function parseArgs(): Args {
  const a: any = { refresh: false, budget: 15, dryRun: false };
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
    const popIds = enroll.slice(0, args.top).map((r) => r.examId);
    const popExams = await p.exam.findMany({
      where: { id: { in: popIds }, active: true },
      select: { id: true, code: true, name: true, shortName: true, category: true },
    });
    if (popExams.length < args.top) {
      const more = await p.exam.findMany({
        where: { id: { notIn: popIds }, active: true },
        orderBy: { code: "asc" },
        take: args.top - popExams.length,
        select: { id: true, code: true, name: true, shortName: true, category: true },
      });
      popExams.push(...more);
    }
    return popExams;
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

  console.log(`=== seed-rank-bands ===`);
  console.log(`Exams in scope: ${exams.length}`);
  console.log(`Refresh existing: ${args.refresh ? "YES" : "no"}`);
  console.log(`Budget: $${args.budget.toFixed(2)}  Mode: ${args.dryRun ? "DRY RUN" : "LIVE"}\n`);

  const haveAi = args.refresh
    ? new Set<string>()
    : new Set(
        (
          await p.examRankBand.findMany({
            where: { examId: { in: exams.map((e) => e.id) }, source: GEN_SOURCE },
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
    if (haveAi.has(exam.id)) {
      console.log(`  (skip) ${exam.code.padEnd(22)} ai bands exist`);
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
      const { bands, inputTokens, outputTokens } = await generateRankBands({
        examCode: exam.code,
        examName: exam.name,
        examShortName: exam.shortName,
        category: String(exam.category),
      });
      if (bands.length === 0) {
        console.log(`     ✗ empty bands — Claude returned no usable rows`);
        failed += 1;
        spentUSD += COST_PER_EXAM_USD;
        continue;
      }

      await p.examRankBand.deleteMany({
        where: { examId: exam.id, source: GEN_SOURCE },
      });

      // Insert in display order: highest score band first => orderIdx 0.
      const sorted = bands.slice().sort((a, b) => b.scorePctMin - a.scorePctMin);
      let idx = 0;
      for (const b of sorted) {
        await p.examRankBand.create({
          data: {
            examId: exam.id,
            scorePctMin: b.scorePctMin,
            scorePctMax: b.scorePctMax,
            rankMin: b.rankMin,
            rankMax: b.rankMax,
            label: b.label,
            outcomes: b.outcomes,
            orderIdx: idx++,
            source: GEN_SOURCE,
          },
        });
      }
      console.log(`     ✓ ${bands.length} bands  (in=${inputTokens} out=${outputTokens})`);
      processed += 1;
      spentUSD += COST_PER_EXAM_USD;
    } catch (err) {
      console.error(`     ✗ ${exam.code} failed:`, (err as Error).message);
      failed += 1;
    }
  }

  console.log(`\n=== summary ===`);
  console.log(`Processed: ${processed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Estimated spend: ~$${spentUSD.toFixed(2)}`);
  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});

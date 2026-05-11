// scripts/seed-syllabus-ai.ts
//
// For exams without any seeded syllabus (Subject/Topic rows), have Claude
// generate the canonical structure based on the official exam notification.
// Used to bootstrap state-PSC long-tail exams so minimal-mocks can run.
//
// USAGE
//   npx tsx scripts/seed-syllabus-ai.ts --exams AP_APPSC_GROUP1,WB_WBCS
//   npx tsx scripts/seed-syllabus-ai.ts --missing   # all exams with zero topics
//   npx tsx scripts/seed-syllabus-ai.ts --dry-run

import { PrismaClient } from "@prisma/client";
import { generateSyllabus } from "../src/lib/ai/syllabus";

const p = new PrismaClient();

interface Args {
  exams?: string[];
  missing: boolean;
  dryRun: boolean;
  budget: number;
}

function parseArgs(): Args {
  const a: any = { missing: false, dryRun: false, budget: 5 };
  const argv = process.argv;
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case "--exams":   a.exams = next().split(",").map((s: string) => s.trim()); break;
      case "--missing": a.missing = true; break;
      case "--budget":  a.budget = parseFloat(next()); break;
      case "--dry-run": a.dryRun = true; break;
    }
  }
  return a as Args;
}

async function pickExams(args: Args) {
  if (args.exams) {
    return p.exam.findMany({
      where: { code: { in: args.exams }, active: true },
      select: { id: true, code: true, name: true, shortName: true, category: true },
    });
  }
  if (args.missing) {
    const all = await p.exam.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, shortName: true, category: true },
    });
    const counts = await p.subject.groupBy({
      by: ["examId"],
      where: { examId: { in: all.map((e) => e.id) } },
      _count: { _all: true },
    });
    const have = new Set(counts.map((c) => c.examId));
    return all.filter((e) => !have.has(e.id));
  }
  return [];
}

const COST_PER_EXAM_USD = 0.15;

async function main() {
  const args = parseArgs();
  const exams = await pickExams(args);

  console.log(`=== seed-syllabus-ai ===`);
  console.log(`Exams in scope: ${exams.length}`);
  console.log(`Budget: $${args.budget.toFixed(2)}  Mode: ${args.dryRun ? "DRY RUN" : "LIVE"}\n`);

  let processed = 0;
  let failed = 0;
  let spentUSD = 0;

  for (const exam of exams) {
    if (spentUSD >= args.budget) {
      console.log(`\n[budget] stopping at $${spentUSD.toFixed(2)}`);
      break;
    }
    console.log(`  → ${exam.code.padEnd(22)} ${exam.shortName}`);
    if (args.dryRun) {
      processed += 1;
      spentUSD += COST_PER_EXAM_USD;
      continue;
    }
    try {
      const { subjects, inputTokens, outputTokens } = await generateSyllabus({
        examCode: exam.code,
        examName: exam.name,
        examShortName: exam.shortName,
        category: String(exam.category),
      });
      if (subjects.length === 0) {
        console.log(`     ✗ empty syllabus`);
        failed += 1;
        spentUSD += COST_PER_EXAM_USD;
        continue;
      }

      let subjOrder = 0;
      for (const s of subjects) {
        const subjRow = await p.subject.upsert({
          where: { examId_code: { examId: exam.id, code: s.code } },
          create: {
            examId: exam.id,
            code: s.code,
            name: s.name,
            weight: s.weight,
            orderIdx: subjOrder++,
          },
          update: { name: s.name, weight: s.weight, orderIdx: subjOrder - 1 },
        });

        let topicOrder = 0;
        for (const t of s.topics) {
          const topicRow = await p.topic.upsert({
            where: { subjectId_code: { subjectId: subjRow.id, code: t.code } },
            create: {
              subjectId: subjRow.id,
              code: t.code,
              name: t.name,
              description: t.description ?? null,
              orderIdx: topicOrder++,
            },
            update: { name: t.name, description: t.description ?? null, orderIdx: topicOrder - 1 },
          });

          if (t.subtopics) {
            let subOrder = 0;
            for (const st of t.subtopics) {
              await p.topic.upsert({
                where: { subjectId_code: { subjectId: subjRow.id, code: st.code } },
                create: {
                  subjectId: subjRow.id,
                  parentId: topicRow.id,
                  code: st.code,
                  name: st.name,
                  description: st.description ?? null,
                  orderIdx: subOrder++,
                },
                update: {
                  parentId: topicRow.id,
                  name: st.name,
                  description: st.description ?? null,
                  orderIdx: subOrder - 1,
                },
              });
            }
          }
        }
      }
      console.log(`     ✓ ${subjects.length} subjects, ${subjects.reduce((n, s) => n + s.topics.length, 0)} topics  (in=${inputTokens} out=${outputTokens})`);
      processed += 1;
      spentUSD += COST_PER_EXAM_USD;
    } catch (err) {
      console.error(`     ✗ ${exam.code} failed:`, (err as Error).message);
      failed += 1;
    }
  }

  console.log(`\n=== summary ===`);
  console.log(`Processed: ${processed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Estimated spend: ~$${spentUSD.toFixed(2)}`);
  await p.$disconnect();
}

main().catch(async (e) => { console.error(e); await p.$disconnect(); process.exit(1); });

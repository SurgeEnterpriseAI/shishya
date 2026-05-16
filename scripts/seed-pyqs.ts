// scripts/seed-pyqs.ts
//
// Web-search-grounded PYQ-pattern seeder. Walks exams in popularity
// order (candidatesPerYear DESC, then enrollment count, then code).
// For each exam, generates 25+ PYQ-pattern questions spread across
// the last 5 years and the exam's topics, persists them as
// source = PYQ with pyqYear set.
//
// USAGE
//   npx tsx scripts/seed-pyqs.ts                    # all 163 in popularity order
//   npx tsx scripts/seed-pyqs.ts --top 30           # top 30 by popularity
//   npx tsx scripts/seed-pyqs.ts --exams SSC_CGL,RRB_NTPC
//   npx tsx scripts/seed-pyqs.ts --target 50        # try for 50 questions per exam
//   npx tsx scripts/seed-pyqs.ts --budget 40        # soft $ cap (default 30)
//   npx tsx scripts/seed-pyqs.ts --dry-run
//
// Cost model: each generatePYQPatternBatch call uses web_search (4-6
// searches per call) + ~5k input + ~3-5k output. Roughly $0.10-0.15
// per batch of ~15 questions. So 25 PYQs/exam = ~2 batches = ~$0.30
// per exam. 50 exams = ~$15. The default budget covers the top 100+.

import { PrismaClient } from "@prisma/client";
import { generatePYQPatternBatch, MAX_QUESTIONS_PER_CALL } from "../src/lib/ai/pyq-generator";

const COST_PER_BATCH = 0.15;
const DEFAULT_TARGET = 100;
const YEARS_BACK = 5;
const MAX_BATCHES_PER_EXAM = 10; // 10 × 15 = 150 questions max per exam

interface Args {
  exams?: string[];
  top?: number;
  target: number;
  budget: number;
  parallel: number;
  dryRun: boolean;
  refresh: boolean;
}

function parseArgs(): Args {
  // Default budget set high so the script runs the full popularity
  // sweep without manual intervention. Use --budget to cap.
  // Parallel=2 leaves headroom on the 21-connection direct pool even
  // when both exams are simultaneously doing their 15-question insert
  // burst. parallel=3 hit P2024 timeouts in prod.
  const a: any = { target: DEFAULT_TARGET, budget: 1000, parallel: 2, dryRun: false, refresh: false };
  const argv = process.argv;
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case "--exams":    a.exams = next().split(",").map((s: string) => s.trim()); break;
      case "--top":      a.top = parseInt(next(), 10); break;
      case "--target":   a.target = parseInt(next(), 10); break;
      case "--budget":   a.budget = parseFloat(next()); break;
      case "--parallel": a.parallel = parseInt(next(), 10); break;
      case "--refresh":  a.refresh = true; break;
      case "--dry-run":  a.dryRun = true; break;
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
      select: { id: true, code: true, name: true, shortName: true, category: true, candidatesPerYear: true },
    });
  }
  // Popularity order: candidatesPerYear DESC nulls last, then code.
  const all = await p.exam.findMany({
    where: { active: true },
    orderBy: [{ candidatesPerYear: { sort: "desc", nulls: "last" } }, { code: "asc" }],
    select: { id: true, code: true, name: true, shortName: true, category: true, candidatesPerYear: true },
  });
  return args.top ? all.slice(0, args.top) : all;
}

async function pickTopics(examId: string) {
  // Use top-level topics across all subjects of the exam. Cap at 8 per
  // batch — more than that bloats the prompt and the model loses
  // track of which topicCode is valid.
  const subjects = await p.subject.findMany({
    where: { examId },
    orderBy: { orderIdx: "asc" },
    select: {
      name: true,
      topics: {
        where: { parentId: null },
        orderBy: { orderIdx: "asc" },
        select: { id: true, code: true, name: true },
      },
    },
  });
  const flat: Array<{ id: string; code: string; name: string; subjectName: string }> = [];
  for (const s of subjects) {
    for (const t of s.topics) {
      flat.push({ id: t.id, code: t.code, name: t.name, subjectName: s.name });
    }
  }
  return flat;
}

async function main() {
  const args = parseArgs();
  const exams = await pickExams(args);

  console.log(`\n=== seed-pyqs ===`);
  console.log(`Exams in scope:   ${exams.length}`);
  console.log(`Target / exam:    ${args.target} PYQs minimum`);
  console.log(`Budget (soft):    $${args.budget.toFixed(2)}`);
  console.log(`Refresh existing: ${args.refresh ? "YES" : "no"}`);
  console.log(`Mode:             ${args.dryRun ? "DRY RUN" : "LIVE"}\n`);

  const currentYear = new Date().getFullYear();
  // Use last 5 calendar years, biased towards recent (e.g. 2024, 2023, 2022, 2021, 2020).
  // Skip the current year — papers usually publish post-conduct.
  const years = Array.from({ length: YEARS_BACK }, (_, i) => currentYear - 1 - i);

  // Shared counters protected by serial-ish access (we await each exam
  // result before moving on; JS is single-threaded inside the script
  // itself, the parallelism happens in the I/O wait).
  const counters = {
    processed: 0,
    skipped: 0,
    failed: 0,
    noTopics: 0,
    spentUSD: 0,
    totalCreated: 0,
  };
  let budgetExceeded = false;

  async function runExam(exam: typeof exams[number]): Promise<void> {
    if (budgetExceeded) return;

    // Idempotence: if exam already has the target PYQs and --refresh
    // isn't set, skip.
    const existingPYQs = await p.question.count({
      where: { examId: exam.id, source: "PYQ" },
    });
    if (existingPYQs >= args.target && !args.refresh) {
      console.log(`  (skip) ${exam.code.padEnd(22)} ${existingPYQs} PYQs already`);
      counters.skipped += 1;
      return;
    }

    const topics = await pickTopics(exam.id);
    if (topics.length === 0) {
      console.log(`  (gap)  ${exam.code.padEnd(22)} no topics seeded — run seed-syllabus-ai first`);
      counters.noTopics += 1;
      return;
    }

    const popLabel = exam.candidatesPerYear
      ? `cps=${(exam.candidatesPerYear / 1e6).toFixed(1)}M`
      : "cps=n/a";
    console.log(`  → ${exam.code.padEnd(22)} ${exam.shortName.padEnd(28)} ${popLabel}  topics=${topics.length}  have=${existingPYQs}`);
    if (args.dryRun) {
      counters.processed += 1;
      const batches = Math.ceil((args.target - existingPYQs) / MAX_QUESTIONS_PER_CALL);
      counters.spentUSD += batches * COST_PER_BATCH;
      return;
    }

    let createdHere = 0;
    let needed = args.target - existingPYQs;
    let batchIdx = 0;
    const allSources = new Set<string>();

    while (needed > 0 && !budgetExceeded) {
      batchIdx += 1;
      // Rotate topic windows across batches so we cover the breadth
      // rather than hammering the same 8 topics each call.
      const topicsForBatch = topics
        .slice((batchIdx - 1) * 8, (batchIdx - 1) * 8 + 8);
      const useTopics = topicsForBatch.length > 0
        ? topicsForBatch
        : topics.slice(((batchIdx - 1) * 8) % Math.max(1, topics.length), ((batchIdx - 1) * 8) % Math.max(1, topics.length) + 8);
      const fallbackTopics = useTopics.length > 0 ? useTopics : topics.slice(0, Math.min(8, topics.length));

      try {
        const { questions, sources } = await generatePYQPatternBatch({
          examCode: exam.code,
          examName: exam.name,
          examShortName: exam.shortName,
          category: String(exam.category),
          topics: fallbackTopics,
          years,
          targetCount: Math.min(needed, MAX_QUESTIONS_PER_CALL),
        });
        for (const s of sources) allSources.add(s);

        if (questions.length === 0) {
          console.log(`     ✗ ${exam.code} batch ${batchIdx} returned 0 usable questions`);
          counters.spentUSD += COST_PER_BATCH;
          break;
        }

        // Serialize the per-batch inserts to keep concurrent pool
        // usage bounded. With parallel=2 exams × 15 parallel writes
        // we'd peak at 30 simultaneous, which exceeds the 21-conn
        // direct pool. Per-batch serial inserts cap at 2 concurrent
        // (one per exam wave member). Cost: +~2s per batch wall-clock.
        for (const q of questions) {
          await p.question.create({
            data: {
              examId: exam.id,
              topicId: q.topicId,
              type: "MCQ",
              difficulty: q.difficulty,
              body: q.body,
              options: q.options,
              answerKey: q.answerKey,
              solution: q.solution,
              source: "PYQ",
              pyqYear: q.pyqYear,
              validated: true,
              validatedBy: "system:pyq-pattern",
              validatedAt: new Date(),
              language: "EN",
              metadata: { sources: [...allSources].slice(0, 5) },
            },
          });
        }

        createdHere += questions.length;
        needed -= questions.length;
        counters.spentUSD += COST_PER_BATCH;
        console.log(`     ✓ ${exam.code} batch ${batchIdx}: +${questions.length}  (have ${existingPYQs + createdHere}, spent $${counters.spentUSD.toFixed(2)})`);

        if (counters.spentUSD >= args.budget) {
          budgetExceeded = true;
          break;
        }
        if (batchIdx >= MAX_BATCHES_PER_EXAM) break;
      } catch (err) {
        console.error(`     ✗ ${exam.code} batch ${batchIdx} failed:`, (err as Error).message);
        counters.spentUSD += COST_PER_BATCH * 0.5;
        counters.failed += 1;
        break;
      }
    }

    if (createdHere > 0) {
      counters.processed += 1;
      counters.totalCreated += createdHere;
    }
  }

  // Run exams in parallel waves of `args.parallel`. Each wave waits
  // for all members to finish before kicking off the next so we
  // don't pile too many concurrent Anthropic + DB sessions.
  for (let i = 0; i < exams.length; i += args.parallel) {
    if (budgetExceeded) {
      console.log(`\n[budget] stopping at $${counters.spentUSD.toFixed(2)}`);
      break;
    }
    const wave = exams.slice(i, i + args.parallel);
    await Promise.all(wave.map(runExam));
  }
  const { processed, skipped, failed, noTopics, spentUSD, totalCreated } = counters;

  console.log(`\n=== summary ===`);
  console.log(`Exams processed:    ${processed}`);
  console.log(`Exams skipped:      ${skipped} (already had >=${args.target} PYQs)`);
  console.log(`Exams gap (no topics): ${noTopics}`);
  console.log(`Failed batches:     ${failed}`);
  console.log(`PYQs created:       ${totalCreated}`);
  console.log(`Estimated spend:    ~$${spentUSD.toFixed(2)}`);
  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});

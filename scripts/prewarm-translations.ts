// scripts/prewarm-translations.ts
//
// Pre-populates the QuestionTranslation cache for the most popular locales
// so the first student doesn't have to wait 10+ seconds for the cold
// Anthropic batch to come back.
//
// Strategy:
//   - For each exam in scope, take the union of all questionIds referenced
//     by its system mocks (mock.userId = null).
//   - For each target locale that isn't already cached for those questions,
//     batch-translate via translateBatch().
//
// USAGE
//   npx dotenv-cli -e .env.local -- npx tsx scripts/prewarm-translations.ts \
//     --exams SSC_CGL,RRB_NTPC,NEET_UG --locales hi,te,ta
//
//   npx dotenv-cli -e .env.local -- npx tsx scripts/prewarm-translations.ts \
//     --top 20 --locales hi,te
//
// FLAGS
//   --exams CSV         explicit exam codes
//   --top N             use the N most popular exams (by enrollment count;
//                       falls back to alphabetical if no enrollments)
//   --locales CSV       which locales to warm; default "hi"
//   --max-q N           cap questions translated per (exam, locale); default 100
//   --budget USD        soft cost cap; stops launching new batches once hit
//   --dry-run           print plan; no Anthropic calls

import { PrismaClient } from "@prisma/client";
import { translateBatch, MAX_BATCH_SIZE } from "../src/lib/ai/translator";
import { findTranslations, upsertTranslation } from "../src/lib/db/questionTranslations";
import { locales as ALL_LOCALES, type Locale } from "../src/lib/i18n";

interface Args {
  exams?: string[];
  top?: number;
  locales: Locale[];
  maxQ: number;
  budget: number;
  dryRun: boolean;
}

function parseArgs(): Args {
  const a: any = { locales: ["hi"], maxQ: 100, budget: 50, dryRun: false };
  const argv = process.argv;
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case "--exams":     a.exams = next().split(",").map((s: string) => s.trim()); break;
      case "--top":       a.top = parseInt(next(), 10); break;
      case "--locales":   a.locales = next().split(",").map((s: string) => s.trim()).filter((s: string) => (ALL_LOCALES as readonly string[]).includes(s)); break;
      case "--max-q":     a.maxQ = parseInt(next(), 10); break;
      case "--budget":    a.budget = parseFloat(next()); break;
      case "--dry-run":   a.dryRun = true; break;
    }
  }
  return a as Args;
}

// Sonnet 4.5 cost model — rough. Input ~$3/M, output ~$15/M.
// A batch of 30 Qs is ~6k input + ~6k output → ~$0.10/batch.
const COST_PER_BATCH_USD = 0.10;

const p = new PrismaClient();

async function pickExams(args: Args): Promise<{ id: string; code: string; shortName: string }[]> {
  if (args.exams) {
    return p.exam.findMany({
      where: { code: { in: args.exams }, active: true },
      select: { id: true, code: true, shortName: true },
    });
  }
  if (args.top) {
    // Order by enrollment count, fall back to code.
    const enroll = await p.enrollment.groupBy({
      by: ["examId"],
      _count: { _all: true },
      orderBy: { _count: { userId: "desc" } as any },
    });
    const ids = enroll.slice(0, args.top).map((r) => r.examId);
    const exams = await p.exam.findMany({
      where: { id: { in: ids }, active: true },
      select: { id: true, code: true, shortName: true },
    });
    return ids.map((id) => exams.find((e) => e.id === id)).filter((x): x is NonNullable<typeof x> => !!x);
  }
  return p.exam.findMany({
    where: { active: true },
    orderBy: { code: "asc" },
    select: { id: true, code: true, shortName: true },
    take: 20,
  });
}

async function main() {
  const args = parseArgs();
  if (args.locales.length === 0) {
    console.error("No valid --locales given.");
    process.exit(1);
  }

  const exams = await pickExams(args);
  console.log(`\n=== prewarm-translations ===`);
  console.log(`Exams:    ${exams.length}`);
  console.log(`Locales:  ${args.locales.join(", ")}`);
  console.log(`Max Q/exam/locale: ${args.maxQ}`);
  console.log(`Budget:   $${args.budget.toFixed(2)} (soft)`);
  console.log(`Mode:     ${args.dryRun ? "DRY RUN" : "LIVE"}\n`);

  let spentUSD = 0;
  let translated = 0;

  for (const exam of exams) {
    // All system mocks for this exam → union of their questionIds.
    const mocks = await p.mock.findMany({
      where: { examId: exam.id, userId: null },
      select: { questionIds: true },
    });
    const qSet = new Set<string>();
    for (const m of mocks) for (const qid of m.questionIds) qSet.add(qid);
    let allQIds = [...qSet].slice(0, args.maxQ);
    if (allQIds.length === 0) {
      console.log(`  (skip) ${exam.code.padEnd(20)} no system mock questions yet`);
      continue;
    }

    for (const locale of args.locales) {
      if (spentUSD >= args.budget) {
        console.log(`\n[budget] stopping — spent ~$${spentUSD.toFixed(2)} >= $${args.budget.toFixed(2)}`);
        await p.$disconnect();
        return;
      }
      const cached = await findTranslations(allQIds, locale);
      const missIds = allQIds.filter((id) => !cached.has(id));
      if (missIds.length === 0) {
        console.log(`  ${exam.code.padEnd(20)} [${locale}]   all ${allQIds.length} already cached`);
        continue;
      }
      const sources = await p.question.findMany({
        where: { id: { in: missIds } },
        select: { id: true, body: true, options: true, solution: true },
      });
      console.log(`  ${exam.code.padEnd(20)} [${locale}]   ${sources.length} to translate`);

      if (args.dryRun) {
        spentUSD += Math.ceil(sources.length / MAX_BATCH_SIZE) * COST_PER_BATCH_USD;
        translated += sources.length;
        continue;
      }

      for (let i = 0; i < sources.length; i += MAX_BATCH_SIZE) {
        const slice = sources.slice(i, i + MAX_BATCH_SIZE).map((q) => ({
          id: q.id,
          body: q.body,
          options: Array.isArray(q.options) ? (q.options as any) : [],
          solution: q.solution,
        }));
        try {
          const { translated: rows } = await translateBatch({ locale, questions: slice });
          for (const r of rows) {
            try {
              await upsertTranslation({
                questionId: r.id,
                locale,
                body: r.body,
                options: r.options,
                solution: r.solution,
                generator: "claude-sonnet-4-5/translator-v1/prewarm",
              });
              translated += 1;
            } catch (err) {
              console.error(`    upsert ${r.id} failed`, err);
            }
          }
          spentUSD += COST_PER_BATCH_USD;
        } catch (err) {
          console.error(`    ✗ batch ${exam.code}/${locale} #${i} failed:`, (err as Error).message);
        }
      }
    }
  }

  console.log(`\n=== summary ===`);
  console.log(`Translations written: ${translated}`);
  console.log(`Estimated spend:      ~$${spentUSD.toFixed(2)}`);
  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});

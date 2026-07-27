// Pre-translate the ENTIRE question bank into a target locale and persist
// to QuestionTranslation. Run once per locale. Idempotent — checks the
// cache before every batch, so a stop/resume just skips what's already done.
//
// Usage:
//   npx --yes dotenv-cli -e .env.local -- npx tsx scripts/backfill-translations.ts hi
//   npx ... scripts/backfill-translations.ts te --concurrency=8 --limit=500
//
// CLI args:
//   <locale>           required; one of the locales in src/lib/i18n.ts
//   --concurrency=N    parallel translateBatch calls (default 5; max 10)
//   --limit=N          stop after N translations (useful for cost calibration)
//   --skip=N           skip the first N questions (resume from index)
//
// Strategy:
//   1. Pull all question IDs + bodies + options + solutions from DB.
//   2. Query existing cached translations for this locale → compute miss set.
//   3. Chunk misses by MAX_BATCH_SIZE (4 for Indic), fire N parallel calls.
//   4. On success: upsert into QuestionTranslation immediately.
//   5. On failure: log + continue. A second pass picks up the gaps.
//
// Expected cost on Haiku 4.5: roughly $0.005-0.008 per question per locale
// (with prompt cache hits). Time: ~1-2h per locale at concurrency=5.

import { prisma } from "../src/lib/db/prisma";
import { translateBatch, MAX_BATCH_SIZE } from "../src/lib/ai/translator";
import { upsertTranslation } from "../src/lib/db/questionTranslations";
import { locales, type Locale } from "../src/lib/i18n";

interface Args {
  locale: Locale;
  concurrency: number;
  limit: number | null;
  skip: number;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const positional = argv.filter((a) => !a.startsWith("--"));
  const flags = Object.fromEntries(
    argv.filter((a) => a.startsWith("--")).map((a) => {
      const [k, v] = a.slice(2).split("=");
      return [k, v ?? "true"];
    }),
  );
  const locale = positional[0] as Locale;
  if (!locale || !(locales as readonly string[]).includes(locale)) {
    throw new Error(`first arg must be one of: ${locales.join(", ")}`);
  }
  if (locale === "en") {
    throw new Error("English is the source; no translation needed.");
  }
  return {
    locale,
    concurrency: Math.min(10, Math.max(1, parseInt(flags.concurrency ?? "5", 10))),
    limit: flags.limit ? parseInt(flags.limit, 10) : null,
    skip: flags.skip ? parseInt(flags.skip, 10) : 0,
  };
}

interface QuestionRow {
  id: string;
  body: string;
  options: { key: string; text: string }[];
  solution: string;
}

async function main() {
  const args = parseArgs();
  const t0 = Date.now();
  console.log(`backfill: locale=${args.locale}, concurrency=${args.concurrency}, batch=${MAX_BATCH_SIZE}`);

  // 1. Load all questions (id + body + options + solution only).
  const allQuestions = await prisma.question.findMany({
    select: { id: true, body: true, options: true, solution: true },
    orderBy: { id: "asc" }, // deterministic order = predictable resume
  });
  console.log(`questions in bank: ${allQuestions.length}`);

  // 2. Look up which ones are already translated for this locale.
  const alreadyCached = await prisma.questionTranslation.findMany({
    where: { locale: args.locale, questionId: { in: allQuestions.map((q) => q.id) } },
    select: { questionId: true },
  });
  const cachedSet = new Set(alreadyCached.map((r) => r.questionId));
  console.log(`already cached: ${cachedSet.size}`);

  // 3. Build the miss list.
  const allMisses = allQuestions
    .filter((q) => !cachedSet.has(q.id))
    .slice(args.skip);
  const misses = args.limit ? allMisses.slice(0, args.limit) : allMisses;
  console.log(`to translate: ${misses.length}${args.limit ? ` (limit=${args.limit})` : ""}`);
  if (misses.length === 0) {
    console.log("nothing to do.");
    return;
  }

  // 4. Chunk into batches of MAX_BATCH_SIZE.
  const batches: QuestionRow[][] = [];
  for (let i = 0; i < misses.length; i += MAX_BATCH_SIZE) {
    batches.push(
      misses.slice(i, i + MAX_BATCH_SIZE).map((q) => ({
        id: q.id,
        body: q.body,
        options: Array.isArray(q.options) ? (q.options as any) : [],
        solution: q.solution,
      })),
    );
  }
  console.log(`batches: ${batches.length} of ${MAX_BATCH_SIZE} max each`);

  // 5. Run waves of `concurrency` parallel translateBatch calls.
  let done = 0;
  let failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < batches.length; i += args.concurrency) {
    const wave = batches.slice(i, i + args.concurrency);
    const results = await Promise.allSettled(
      wave.map(async (slice) => {
        const out = await translateBatch({ locale: args.locale, questions: slice });
        return { slice, out };
      }),
    );

    for (const r of results) {
      if (r.status === "rejected") {
        failed += MAX_BATCH_SIZE; // approx; actual could be less on last wave
        const reason: any = r.reason;
        console.error(`  ✗ batch failed: ${reason?.message?.slice(0, 120)}`);
        continue;
      }
      const { out } = r.value;
      // Persist each translation immediately so a crash doesn't lose work.
      for (const t of out.translated) {
        try {
          await upsertTranslation({
            questionId: t.id,
            locale: args.locale,
            body: t.body,
            options: t.options,
            solution: t.solution,
            generator: "claude-haiku-4-5/translator-v1-backfill",
          });
          done++;
        } catch (e: any) {
          failed++;
          console.error(`  ✗ persist failed for ${t.id}: ${e?.message?.slice(0, 80)}`);
        }
      }
    }

    // Progress meter every 5 waves.
    if (i % (args.concurrency * 5) === 0 || i + args.concurrency >= batches.length) {
      const elapsedSec = (Date.now() - startTime) / 1000;
      const rate = done / elapsedSec;
      const remaining = misses.length - done - failed;
      const etaMin = rate > 0 ? Math.round(remaining / rate / 60) : 0;
      console.log(
        `  [${new Date().toISOString().slice(11, 19)}] done=${done} failed=${failed} ` +
        `rate=${rate.toFixed(1)}/s eta=${etaMin}min`,
      );
    }
  }

  const totalSec = Math.round((Date.now() - t0) / 1000);
  console.log(`\ncomplete: ${done} translated, ${failed} failed, ${totalSec}s wall time`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("fatal:", e);
    process.exit(1);
  });

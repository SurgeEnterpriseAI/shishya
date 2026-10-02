// scripts/generate-questions.ts
//
// Bulk-generate questions for an exam topic, subject, or whole exam, using
// Claude. Output is saved to the DB as `AI_GENERATED` and `validated: false`,
// so it stays out of live mocks until an SME stamps it via /admin/questions.
//
// This is the *production* version of the proof-of-concept that produced
// `seed/questions/ssc-cgl-quant.ts`. The same SME-validation gate applies.
//
// ── Spend guard, ledger and journal (30 Sep 2026) ──────────────────────────
// The state-exam depth plan (30 Sep 2026) runs ~3,750 questions through this
// script. It had no ceiling and wrote no AiUsage rows, and it spends from
// the credit balance the live tutor shares. The rules and their tests live
// in src/lib/ai/question-gen-run.ts; this file is the glue:
//   • --max-usd is REQUIRED for any run that calls the API, dry runs too.
//     The next call is not made when its worst case would cross it. Every
//     reply is priced from its usage and ledgered as AiUsage
//     "state-depth-gen" (ref = exam code).
//   • Each batch is saved as it arrives. A journal under
//     D:/CodexProjects/shishya-data/generate-question-runs/ records the run's
//     spend and, per topic, what is saved. A stopped run continues with
//     --resume <runId> and never regenerates what it already saved.
//   • The key: ANTHROPIC_BULK_API_KEY when set, else the shared
//     ANTHROPIC_API_KEY only with --allow-shared-key (founder, 30 Sep 2026).
//   • 2 Oct 2026: before the first call the run passes bulkPreflight()
//     (src/lib/ai/batch.ts), which prints the cap as days of student use
//     (about $5.3 a day) and that the balance is not reloaded automatically.
//   • An API error (empty balance, spend limit, bad key) stops the run. The
//     SDK's own retries are off. A 429 or 529 (not billed) is called again
//     after 20 s and then 60 s. A 400 about one topic's request gives up on
//     that topic, and the same refusal on the next topic stops the run.
//   • If the run dies on a database error, the resume command is printed.
//   • --verify and --auto-validate are REFUSED: they checked at full price on
//     the shared key with no ceiling. Answer-check with
//     scripts/verify-question-bank.ts (batch prices, its own spend guard).
//   • --no-ai runs only with --dry-run: it writes placeholder rows, and
//     .env.local is the production database.
//   • An unknown flag is refused rather than warned about.
//
// USAGE
//   npx tsx --env-file=.env.local scripts/generate-questions.ts --exam SSC_CGL --topic quant.percentage --count 2 --no-ai --dry-run   (free plumbing test)
//   npx tsx --env-file=.env.local scripts/generate-questions.ts --exam TS_ICET --all --count 5 --max-usd 3
//   npx tsx --env-file=.env.local scripts/generate-questions.ts --exam TS_TET --all --skip-subjects LANG1,LANG2 --count 2 --max-usd 2.5
//   npx tsx --env-file=.env.local scripts/generate-questions.ts --resume <runId> --max-usd 4
//
// FLAGS
//   --exam <CODE>            required for a fresh run (e.g. SSC_CGL, RRB_NTPC)
//   --topic <code>           single topic; e.g. quant.percentage
//   --subject <code>         all topics in this subject; e.g. QUANT
//   --all                    all topics in the exam
//   --skip-subjects <A,B>    leave these subjects out (language papers this generator cannot write)
//   --count <n>              questions per topic (default 20)
//   --batch-size <n>         questions per Claude call (default 10)
//   --difficulty <mix>       e.g. "EASY:0.3,MEDIUM:0.5,HARD:0.2" (default same)
//   --avoid-recent <n>       load N most-recent Q bodies per topic and ask Claude to avoid (default 50)
//   --retry <n>              extra calls per batch when a reply is unusable (default 1)
//   --language <EN|HI>       HI writes stems, options and solutions in Hindi (General Hindi topics)
//   --max-usd <usd>          hard ceiling on the run's spend at list price; required unless --no-ai
//   --dry-run                one batch per topic, printed; nothing saved, no journal (the calls are still billed and ledgered)
//   --no-ai                  offline stub generator, no API spend; only with --dry-run
//   --resume <runId>         continue a stopped run from its journal (its own settings; name a --max-usd)
//   --journal <path>         journal file instead of <journal folder>/<runId>.json
//   --force                  start a fresh run although an unfinished journal covers the exam
//   --allow-shared-key       with no ANTHROPIC_BULK_API_KEY, run on the shared ANTHROPIC_API_KEY

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient, QuestionSource, Language } from "@prisma/client";
import { bulkPreflight, resolveBulkKey } from "../src/lib/ai/batch";
import { recordAiUsageAwaited } from "../src/lib/ai/usage";
import {
  GEN_JOURNAL_DIR,
  GEN_LEDGER_FEATURE,
  GEN_MAX_TOKENS,
  VERIFY_SCRIPT,
  assertGenSettings,
  genCrashResumeHint,
  genJournalPath,
  genResumeCommand,
  genRunId,
  loadGenJournal,
  newGenJournal,
  openGenJournals,
  parseGenArgs,
  planSummary,
  reconcileSaved,
  resolveGenRunMode,
  runGeneration,
  saveGenJournal,
  selectTargets,
  settingsFromArgs,
  worstCaseCallUsd,
  type GenJournal,
  type GenTopicContext,
  type GenTopicInput,
  type GeneratedQuestion,
} from "../src/lib/ai/question-gen-run";
import type { Difficulty } from "../src/lib/ai/types";

// ─────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";
const fmtUsd = (n: number) => `$${n.toFixed(2)}`;

function printHelpAndExit(code = 0): never {
  console.log(
    `Bulk-generate Shishya questions via Claude, under a spend ceiling.

Usage:
  npx tsx --env-file=.env.local scripts/generate-questions.ts --exam SSC_CGL --topic quant.percentage --count 2 --no-ai --dry-run
  npx tsx --env-file=.env.local scripts/generate-questions.ts --exam TS_ICET --all --count 5 --max-usd 3
  npx tsx --env-file=.env.local scripts/generate-questions.ts --exam TS_TET --all --skip-subjects LANG1,LANG2 --count 2 --max-usd 2.5
  npx tsx --env-file=.env.local scripts/generate-questions.ts --resume <runId> --max-usd 4

Required:
  --exam <CODE>          exam code (e.g. SSC_CGL); not with --resume
  one of: --topic | --subject | --all
  --max-usd <usd>        hard ceiling on the run's spend (list price), checked before every call;
                         required for every run that calls the API, dry runs included

Optional:
  --skip-subjects <A,B>  leave these subjects out (language papers)
  --count <n>            questions per topic (default 20)
  --batch-size <n>       Qs per Claude call (default 10)
  --difficulty <mix>     "EASY:0.3,MEDIUM:0.5,HARD:0.2"
  --avoid-recent <n>     load N recent Q bodies per topic to dedupe (default 50)
  --retry <n>            retries per batch on an unusable reply (default 1)
  --language <EN|HI>     HI writes the questions in Hindi
  --dry-run              print one batch per topic; don't save (still billed + ledgered)
  --no-ai                use offline stub (no API call); only with --dry-run
  --resume <runId>       continue a stopped run from its journal
  --journal <path>       journal file (default ${GEN_JOURNAL_DIR}/<runId>.json)
  --force                start a fresh run although an unfinished journal covers the exam
  --allow-shared-key     no ANTHROPIC_BULK_API_KEY: run on the shared ANTHROPIC_API_KEY

Removed (refused): --verify, --auto-validate. Answer-check with scripts/verify-question-bank.ts.
`);
  process.exit(code);
}

// ─────────────────────────────────────────────────────────────────────────
// Prompts
// ─────────────────────────────────────────────────────────────────────────
const SYSTEM_PERSONA = `You write high-quality multiple-choice questions for Indian competitive exam preparation. Each question:
- Tests one concept clearly. No trick questions.
- Has exactly 4 options labelled A, B, C, D.
- Has exactly one unambiguously correct answer.
- Has a step-by-step solution that a student can follow without prior knowledge.
- Uses plain English, no LaTeX. Math is written as plain text (e.g. "x² + 1").
- Reflects the difficulty level requested (easy = direct application, medium = 2-3 steps, hard = multi-concept).
- Mirrors the style of past papers — realistic numbers, India-relevant context.

You never invent claims about specific exam years or answer keys from real exams.
You never produce harmful, biased, or controversial content.`;

// --language HI (15 Sep 2026): General Hindi is asked in Hindi (MP RAEO Part A).
const LANGUAGE_HI_BLOCK = `
# Language
Write every question stem, option and solution in Hindi (Devanagari script), as a Hindi-medium paper of this exam prints them. This overrides the plain-English instruction.
`;

const OUTPUT_SCHEMA = `Return STRICT JSON — a single array, no markdown, no commentary:

[
  {
    "body": "Full question stem.",
    "options": [
      { "key": "A", "text": "..." },
      { "key": "B", "text": "..." },
      { "key": "C", "text": "..." },
      { "key": "D", "text": "..." }
    ],
    "answerKey": "B",
    "solution": "Step-by-step explanation. Show all working for math. 3-6 short sentences.",
    "difficulty": "EASY" | "MEDIUM" | "HARD",
    "tags": ["short-tag", "another-tag"]
  }
]

Rules:
- Output an ARRAY, not an object.
- Include EXACTLY the number of questions requested.
- Each "answerKey" MUST be one of A, B, C, D and MUST match an option key.
- Each "options" array MUST have exactly 4 entries with keys A, B, C, D in order.
- Tags are 1-3 short kebab-case strings (e.g. "percentage", "successive-discount").`;

/** One call's params: the same prompt the pre-30-Sep generateBatch sent, built before the call so the guard can price it. */
function buildParams(args: {
  model: string;
  examName: string;
  examCode: string;
  syllabusBlock: string;
  topic: GenTopicInput;
  ctx: GenTopicContext;
  count: number;
  difficultyTargets: Record<Difficulty, number>;
  language: "EN" | "HI";
}): Anthropic.Messages.MessageCreateParamsNonStreaming {
  const userPrompt = `Generate exactly ${args.count} questions on this topic.

# Topic
- Exam: ${args.examName} (${args.examCode})
- Topic name: **${args.topic.name}**
- Topic code: \`${args.topic.code}\`
${args.topic.description ? `- Description: ${args.topic.description}` : ""}
${args.language === "HI" ? LANGUAGE_HI_BLOCK : ""}
# Difficulty distribution
- EASY: ${args.difficultyTargets.EASY}
- MEDIUM: ${args.difficultyTargets.MEDIUM}
- HARD: ${args.difficultyTargets.HARD}

${args.ctx.fewShotBlock}

${args.ctx.avoidBlock}

${OUTPUT_SCHEMA}`;

  return {
    model: args.model,
    max_tokens: GEN_MAX_TOKENS,
    system: [
      { type: "text", text: SYSTEM_PERSONA, cache_control: { type: "ephemeral" } },
      { type: "text", text: args.syllabusBlock, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userPrompt }],
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseGenArgs(process.argv.slice(2));
  if (args.help) printHelpAndExit();
  // Refusals first (--verify, --no-ai without --dry-run, no --max-usd), before any key or row is read.
  const mode = resolveGenRunMode(args);
  const prisma = new PrismaClient();

  try {
    // 1. A resumed run reads its own settings from its journal.
    let journal: GenJournal | null = null;
    let file: string | null = null;
    if (args.resume) {
      file = args.journal ?? genJournalPath(GEN_JOURNAL_DIR, args.resume);
      journal = loadGenJournal(file);
      if (args.exam && args.exam !== journal.exam) throw new Error(`--exam ${args.exam} does not match the journal's exam ${journal.exam}`);
      console.log(`\n=== resuming ${journal.runId} from ${file} (${journal.status}; ${fmtUsd(journal.spentUsd)} spent over ${journal.calls} calls)`);
      if (journal.status === "done") {
        console.log("   The run is done; nothing to generate.");
        return;
      }
    }
    const settings = journal?.settings ?? settingsFromArgs(args, MODEL);
    assertGenSettings(settings);
    const examCode = journal?.exam ?? args.exam!;

    // 2. The key and the model's price, still before the first database read.
    let client: Anthropic | null = null;
    if (mode.callsApi) {
      const worstReply = worstCaseCallUsd(settings.model, 0, GEN_MAX_TOKENS); // throws for a model the guard cannot price
      const key = resolveBulkKey(process.env, args.allowSharedKey);
      console.log(
        `=== spend guard: --max-usd ${fmtUsd(mode.maxUsd!)} (list price, checked before every call) · model ${settings.model} · a reply filling ${GEN_MAX_TOKENS} tokens costs ${fmtUsd(worstReply)} · ` +
          `key ${key.env}${key.shared ? " (the SHARED key the live tutor uses; --allow-shared-key, founder decision 30 Sep 2026)" : ""} · ledger feature "${GEN_LEDGER_FEATURE}"`,
      );
      // 2 Oct 2026: the shared pre-flight every bulk script passes before its first call. It refuses
      // without a cap and prints the cap as days of student use on a balance nothing reloads.
      bulkPreflight({ script: "generate-questions.ts", maxUsd: mode.maxUsd });
      // maxRetries 0 (30 Sep 2026 review): the SDK's own retries also re-send a call that
      // timed out or lost its connection, which the server may have finished and billed,
      // so the cap would count one of two paid calls. runGeneration retries only a 429/529
      // (refused before any work, not billed), and each of its retries goes through the guard.
      client = new Anthropic({ apiKey: key.key, maxRetries: 0 });
    }

    // 3. Exam and topics.
    const exam = await prisma.exam.findUnique({
      where: { code: examCode },
      include: {
        subjects: {
          include: {
            topics: {
              where: { parentId: null },
              orderBy: { orderIdx: "asc" },
              include: { children: true },
            },
            _count: { select: { topics: true } },
          },
          orderBy: { orderIdx: "asc" },
        },
      },
    });
    if (!exam) throw new Error(`Exam ${examCode} not found. Did you run \`npm run seed:exams\`?`);

    // Build syllabus block (cached on every Claude call for this run)
    const syllabusBlock = renderSyllabusBlock(exam);
    const topicsById = new Map<string, GenTopicInput>();
    for (const s of exam.subjects) for (const t of s.topics) topicsById.set(t.id, { id: t.id, code: t.code, name: t.name, description: t.description });

    if (!journal) {
      const targets = selectTargets(examCode, exam.subjects, settings);
      const runId = genRunId(examCode);
      if (mode.writes) {
        // An unfinished run over this exam still owes its topics: resume it rather than paying for them twice.
        for (const o of openGenJournals(GEN_JOURNAL_DIR, examCode)) {
          const msg = `run ${o.runId} (${o.status}) over ${examCode} is unfinished: ${o.questions} questions still to go, ${fmtUsd(o.spentUsd)} spent. Continue it with ${genResumeCommand(path.join(GEN_JOURNAL_DIR, `${o.file}.json`), { maxUsd: "<usd>", allowSharedKey: args.allowSharedKey })}`;
          if (!args.force) throw new Error(`${msg}, or pass --force to start a new run regardless`);
          console.warn(`   ! ${msg}`);
        }
        file = args.journal ?? genJournalPath(GEN_JOURNAL_DIR, runId);
        if (fs.existsSync(file)) throw new Error(`journal ${file} already exists: continue it with --resume, or name another --journal`);
      }
      journal = newGenJournal(runId, examCode, settings, targets);
      if (mode.writes) {
        saveGenJournal(file!, journal);
        console.log(`\n=== run ${runId} → ${file}`);
      }
    } else {
      // The database is the truth for what an earlier invocation saved.
      const fixed = reconcileSaved(journal, await savedCountsForRun(prisma, exam.id, journal.runId));
      if (fixed.length) console.log(`   saved counts taken from the database for: ${fixed.join(", ")}`);
      journal.status = "running";
      saveGenJournal(file!, journal);
    }

    const plan = planSummary(journal);
    console.log(
      `Generating ${plan.questions} Qs over ${plan.topics} topic(s) in ${examCode} (~${plan.calls} calls of up to ${settings.batchSize})` +
        `${settings.skipSubjects.length ? ` · skipping subjects ${settings.skipSubjects.join(", ")}` : ""}` +
        `${mode.callsApi ? ` · spent so far ${fmtUsd(journal.spentUsd)} of ${fmtUsd(mode.maxUsd!)}` : ""}...`,
    );
    if (!mode.writes) console.log(`[DRY RUN] One batch per topic; no DB writes, no journal.${mode.callsApi ? " The calls are billed and ledgered." : " No API call."}`);

    const runJournal = journal;
    const journalFile = file;
    const result = await runGeneration(runJournal, topicsById, {
      examCode,
      mode,
      buildParams: (topic, want, ctx, mix) =>
        buildParams({ model: settings.model, examName: exam.name, examCode: exam.code, syllabusBlock, topic, ctx, count: want, difficultyTargets: mix, language: settings.language }),
      context: (topic) => topicContext(prisma, topic, settings.avoidRecent),
      call: (params) => client!.messages.create(params),
      ledger: (message, latencyMs) => recordAiUsageAwaited(GEN_LEDGER_FEATURE, message, { model: message.model || settings.model, ref: examCode, latencyMs }),
      save: (topic, qs) => saveQuestions(prisma, exam.id, topic.id, qs, settings.model, runJournal.runId),
      persist: mode.writes ? (j) => saveGenJournal(journalFile!, j) : undefined,
    }).catch((e: unknown) => {
      // 30 Sep 2026 review: a database error in save or context leaves the journal "running",
      // and a fresh run over this exam is refused until it is resumed: say how.
      const hint = genCrashResumeHint(mode, journalFile, args.allowSharedKey);
      if (hint) console.error(`\n   ${hint}`);
      throw e;
    });

    // Cost summary
    console.log("\n──────── Token usage (this invocation) ────────");
    console.log(`  Calls:          ${result.calls}`);
    console.log(`  Input:          ${result.tokens.input.toLocaleString()}`);
    console.log(`  Output:         ${result.tokens.output.toLocaleString()}`);
    console.log(`  Cache create:   ${result.tokens.cacheWrite.toLocaleString()}`);
    console.log(`  Cache read:     ${result.tokens.cacheRead.toLocaleString()}`);
    console.log(`  Spent:          ${fmtUsd(result.spentUsd)} (from each reply's usage; ledgered as AiUsage "${GEN_LEDGER_FEATURE}", ref ${examCode})`);
    if (mode.writes) console.log(`  Run total:      ${fmtUsd(runJournal.spentUsd)} over ${runJournal.calls} calls · ceiling ${fmtUsd(mode.maxUsd ?? 0)} · journal ${journalFile}`);
    console.log(`\n──────── Result ────────`);
    console.log(`  Accepted: ${result.accepted}`);
    console.log(`  Rejected: ${result.rejected}`);
    if (result.gaveUp.length) console.log(`  Topics given up: ${result.gaveUp.join(", ")}`);
    if (!mode.writes) {
      console.log("  [DRY RUN] nothing was saved — re-run without --dry-run to persist.");
    } else {
      console.log(`  Saved:    ${result.saved} (validated:false, source:AI_GENERATED)`);
      console.log("  Review at: /admin/questions?source=AI_GENERATED&validated=false");
      console.log(`  Answer-check next (dry run first): ${VERIFY_SCRIPT} --exams ${examCode} --scope unvalidated`);
    }
    if (result.stop) {
      console.log(`\n=== STOPPED by the spend guard (${result.stop.reason}): ${result.stop.remainingQuestions} questions still to go`);
      if (mode.writes && journalFile) {
        console.log(`   To continue${result.stop.reason === "api-error" ? " once the cause above is fixed" : ""}:\n${genResumeCommand(journalFile, { maxUsd: result.stop.suggestedMaxUsd, allowSharedKey: args.allowSharedKey })}`);
      }
      process.exitCode = 2;
    }
  } finally {
    await prisma.$disconnect();
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────
function renderSyllabusBlock(exam: any): string {
  const lines: string[] = [];
  lines.push(`# ${exam.name} (${exam.code}) — Syllabus`);
  for (const s of exam.subjects) {
    lines.push(`\n## ${s.name} [${s.code}]`);
    for (const t of s.topics) {
      lines.push(`- **${t.name}** [\`${t.code}\`]${t.description ? ` — ${t.description}` : ""}`);
      for (const c of t.children ?? []) {
        lines.push(`  - ${c.name} [\`${c.code}\`]${c.description ? ` — ${c.description}` : ""}`);
      }
    }
  }
  return lines.join("\n");
}

/** Few-shot examples and the stems to avoid for one topic (read-only). */
async function topicContext(prisma: PrismaClient, topic: GenTopicInput, avoidRecent: number): Promise<GenTopicContext> {
  // Few-shot examples: pick up to 3 validated questions on this topic
  const fewShot = await prisma.question.findMany({
    where: { topicId: topic.id, validated: true },
    take: 3,
    orderBy: { createdAt: "asc" },
  });
  const fewShotBlock = fewShot.length
    ? "# Style examples (already validated for this topic — match this style)\n" +
      fewShot
        .map((q, i) => {
          const opts = (q.options as { key: string; text: string }[])
            .map((o) => `${o.key}. ${o.text}`)
            .join("  ");
          return `Example ${i + 1} [${q.difficulty}]\nQ: ${q.body}\n${opts}\nAnswer: ${q.answerKey}\nSolution: ${q.solution}`;
        })
        .join("\n\n")
    : "";

  // Avoid recent
  const recent = avoidRecent > 0
    ? await prisma.question.findMany({
        where: { topicId: topic.id },
        take: avoidRecent,
        orderBy: { createdAt: "desc" },
        select: { body: true },
      })
    : [];
  const avoidBlock = recent.length
    ? "# Avoid generating questions whose stem is essentially the same as any of these\n" +
      recent.map((r, i) => `${i + 1}. ${r.body.slice(0, 200)}`).join("\n")
    : "";
  return { fewShotBlock, avoidBlock, recentBodies: recent.map((r) => r.body) };
}

/**
 * One batch, all or nothing, as soon as it arrives (30 Sep 2026: saved per
 * batch, not per topic, so a stop mid-topic keeps what was paid for).
 * metadata.genRun names the run; a resume counts it to reconcile its journal.
 */
async function saveQuestions(
  prisma: PrismaClient,
  examId: string,
  topicId: string,
  qs: GeneratedQuestion[],
  model: string,
  runId: string,
): Promise<string[]> {
  const created = await prisma.$transaction(
    qs.map((q) =>
      prisma.question.create({
        data: {
          examId,
          topicId,
          type: "MCQ",
          difficulty: q.difficulty,
          body: q.body,
          options: q.options,
          answerKey: q.answerKey,
          solution: q.solution,
          language: questionLanguage(q.body),
          source: "AI_GENERATED" as QuestionSource,
          validated: false,
          tags: q.tags,
          metadata: { generator: model, batch: `bulk-${new Date().toISOString().slice(0, 10)}`, genRun: runId },
        },
        select: { id: true },
      }),
    ),
  );
  return created.map((c) => c.id);
}

/** Rows each topic already holds from this run (metadata.genRun), keyed by topic id. */
async function savedCountsForRun(prisma: PrismaClient, examId: string, runId: string): Promise<Record<string, number>> {
  const rows = await prisma.$queryRaw<Array<{ topicId: string; n: number }>>`
    SELECT q."topicId" AS "topicId", COUNT(*)::int AS n
      FROM "Question" q
     WHERE q."examId" = ${examId} AND q.metadata->>'genRun' = ${runId}
     GROUP BY q."topicId"`;
  return Object.fromEntries(rows.map((r) => [r.topicId, Number(r.n)]));
}

// A question written mostly in Devanagari (General Hindi topics — MP RAEO,
// 15 Sep 2026) is stored as HI, so the in-test translator never "translates"
// Hindi into Hindi. Everything else stays EN, as before.
function questionLanguage(body: string): Language {
  const latin = body.match(/[A-Za-z]/g)?.length ?? 0;
  const devanagari = body.match(/[ऀ-ॿ]/g)?.length ?? 0;
  return devanagari > 0 && devanagari >= latin ? ("HI" as Language) : ("EN" as Language);
}

main().catch((err) => {
  console.error("\n❌ Generation failed:", err.message ?? err);
  process.exit(1);
});

// scripts/generate-questions.ts
//
// Bulk-generate questions for an exam topic, subject, or whole exam, using
// Claude. Output is saved to the DB as `AI_GENERATED` and `validated: false`,
// so it stays out of live mocks until an SME stamps it via /admin/questions.
//
// This is the *production* version of the proof-of-concept that produced
// `seed/questions/ssc-cgl-quant.ts`. The same SME-validation gate applies.
//
// USAGE
//   tsx scripts/generate-questions.ts --exam SSC_CGL --topic quant.percentage --count 30
//   tsx scripts/generate-questions.ts --exam SSC_CGL --subject QUANT --count 20
//   tsx scripts/generate-questions.ts --exam SSC_CGL --all --count 15
//   tsx scripts/generate-questions.ts --exam SSC_CGL --topic quant.percentage --count 5 --dry-run
//
// FLAGS
//   --exam <CODE>            required (e.g. SSC_CGL, RRB_NTPC)
//   --topic <code>           single topic; e.g. quant.percentage
//   --subject <code>         all topics in this subject; e.g. QUANT
//   --all                    all topics in the exam
//   --count <n>              questions per topic (default 20)
//   --batch-size <n>         questions per Claude call (default 10)
//   --difficulty <mix>       e.g. "EASY:0.3,MEDIUM:0.5,HARD:0.2" (default same)
//   --avoid-recent <n>       load N most-recent Q bodies per topic and ask Claude to avoid (default 50)
//   --dry-run                print first batch JSON; don't save to DB
//   --no-ai                  use offline stub generator (for plumbing tests, no API spend)

import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient, Difficulty, QuestionSource, Language } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────────────────────────────────
interface CliArgs {
  exam: string;
  topic?: string;
  subject?: string;
  all: boolean;
  count: number;
  batchSize: number;
  difficulty: Record<Difficulty, number>;
  avoidRecent: number;
  dryRun: boolean;
  noAi: boolean;
  retry: number;
}

interface GeneratedQuestion {
  body: string;
  options: { key: string; text: string }[];
  answerKey: string;
  solution: string;
  difficulty: Difficulty;
  tags: string[];
}

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";
const DEFAULT_DIFFICULTY: Record<Difficulty, number> = {
  EASY: 0.3,
  MEDIUM: 0.5,
  HARD: 0.2,
};

// Pricing for token-spend estimate (USD per 1M tokens). Approximate; adjust if Anthropic publishes new rates.
const PRICE_INPUT_PER_M = 3.0;
const PRICE_OUTPUT_PER_M = 15.0;
const PRICE_CACHE_WRITE_PER_M = 3.75;
const PRICE_CACHE_READ_PER_M = 0.3;

// ─────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────
function parseArgs(argv: string[]): CliArgs {
  const args: any = { all: false, count: 20, batchSize: 10, avoidRecent: 50, dryRun: false, noAi: false, retry: 1 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--exam": args.exam = next(); break;
      case "--topic": args.topic = next(); break;
      case "--subject": args.subject = next(); break;
      case "--all": args.all = true; break;
      case "--count": args.count = parseInt(next(), 10); break;
      case "--batch-size": args.batchSize = parseInt(next(), 10); break;
      case "--avoid-recent": args.avoidRecent = parseInt(next(), 10); break;
      case "--difficulty": args.difficulty = parseDifficultyMix(next()); break;
      case "--retry": args.retry = parseInt(next(), 10); break;
      case "--dry-run": args.dryRun = true; break;
      case "--no-ai": args.noAi = true; break;
      case "--help": case "-h": printHelpAndExit();
      default:
        if (a.startsWith("--")) console.warn(`(warn) unknown flag: ${a}`);
    }
  }
  if (!args.exam) {
    console.error("error: --exam is required");
    printHelpAndExit(1);
  }
  if (!args.topic && !args.subject && !args.all) {
    console.error("error: must pass --topic, --subject, or --all");
    printHelpAndExit(1);
  }
  if (!args.difficulty) args.difficulty = DEFAULT_DIFFICULTY;
  return args as CliArgs;
}

function parseDifficultyMix(spec: string): Record<Difficulty, number> {
  const out: any = { EASY: 0, MEDIUM: 0, HARD: 0 };
  for (const part of spec.split(",")) {
    const [k, v] = part.split(":").map((s) => s.trim());
    if (!["EASY", "MEDIUM", "HARD"].includes(k)) throw new Error(`bad difficulty key: ${k}`);
    out[k] = parseFloat(v);
  }
  const sum = out.EASY + out.MEDIUM + out.HARD;
  if (Math.abs(sum - 1) > 0.05) throw new Error(`difficulty mix must sum to 1.0 (got ${sum})`);
  return out;
}

function printHelpAndExit(code = 0): never {
  console.log(
    `Bulk-generate Shishya questions via Claude.

Usage:
  tsx scripts/generate-questions.ts --exam SSC_CGL --topic quant.percentage --count 30
  tsx scripts/generate-questions.ts --exam SSC_CGL --subject QUANT --count 20
  tsx scripts/generate-questions.ts --exam SSC_CGL --all --count 15

Required:
  --exam <CODE>          exam code (e.g. SSC_CGL)
  one of: --topic | --subject | --all

Optional:
  --count <n>            questions per topic (default 20)
  --batch-size <n>       Qs per Claude call (default 10)
  --difficulty <mix>     "EASY:0.3,MEDIUM:0.5,HARD:0.2"
  --avoid-recent <n>     load N recent Q bodies per topic to dedupe (default 50)
  --retry <n>            retries per batch on JSON parse / validation failure (default 1)
  --dry-run              print first batch; don't save
  --no-ai                use offline stub (no API call)
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

// ─────────────────────────────────────────────────────────────────────────
// Generation
// ─────────────────────────────────────────────────────────────────────────
interface TokenStats {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  calls: number;
}

const totals: TokenStats = { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, calls: 0 };

async function generateBatch(
  client: Anthropic,
  args: {
    examName: string;
    examCode: string;
    syllabusBlock: string;
    topic: { code: string; name: string; description?: string | null };
    fewShotBlock: string;
    avoidBlock: string;
    count: number;
    difficultyTargets: Record<Difficulty, number>;
  }
): Promise<{ questions: GeneratedQuestion[]; rawText: string }> {
  const userPrompt = `Generate exactly ${args.count} questions on this topic.

# Topic
- Exam: ${args.examName} (${args.examCode})
- Topic name: **${args.topic.name}**
- Topic code: \`${args.topic.code}\`
${args.topic.description ? `- Description: ${args.topic.description}` : ""}

# Difficulty distribution
- EASY: ${args.difficultyTargets.EASY}
- MEDIUM: ${args.difficultyTargets.MEDIUM}
- HARD: ${args.difficultyTargets.HARD}

${args.fewShotBlock}

${args.avoidBlock}

${OUTPUT_SCHEMA}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: [
      { type: "text", text: SYSTEM_PERSONA, cache_control: { type: "ephemeral" } },
      { type: "text", text: args.syllabusBlock, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  totals.calls += 1;
  totals.inputTokens += response.usage.input_tokens;
  totals.outputTokens += response.usage.output_tokens;
  totals.cacheCreationTokens += response.usage.cache_creation_input_tokens ?? 0;
  totals.cacheReadTokens += response.usage.cache_read_input_tokens ?? 0;

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Claude returned invalid JSON: ${(err as Error).message}\nRaw: ${cleaned.slice(0, 500)}`);
  }
  if (!Array.isArray(parsed)) throw new Error("Claude must return a JSON array of questions");
  return { questions: parsed, rawText: cleaned };
}

// ─────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────
function validateGenerated(q: any): { ok: true; q: GeneratedQuestion } | { ok: false; reason: string } {
  if (!q || typeof q !== "object") return { ok: false, reason: "not an object" };
  if (typeof q.body !== "string" || q.body.trim().length < 10) return { ok: false, reason: "body too short" };
  if (!Array.isArray(q.options) || q.options.length !== 4) return { ok: false, reason: "must have 4 options" };
  const keys = q.options.map((o: any) => o?.key);
  const expected = ["A", "B", "C", "D"];
  if (JSON.stringify(keys) !== JSON.stringify(expected)) return { ok: false, reason: "options must be keyed A/B/C/D in order" };
  for (const o of q.options) {
    if (typeof o.text !== "string" || o.text.trim().length === 0) return { ok: false, reason: "empty option text" };
  }
  if (!expected.includes(q.answerKey)) return { ok: false, reason: `answerKey must be A/B/C/D, got ${q.answerKey}` };
  if (typeof q.solution !== "string" || q.solution.trim().length < 20) return { ok: false, reason: "solution too short" };
  if (!["EASY", "MEDIUM", "HARD"].includes(q.difficulty)) return { ok: false, reason: `invalid difficulty: ${q.difficulty}` };
  const tags = Array.isArray(q.tags) ? q.tags.filter((t: any) => typeof t === "string") : [];

  return {
    ok: true,
    q: {
      body: q.body.trim(),
      options: q.options.map((o: any) => ({ key: o.key, text: o.text.trim() })),
      answerKey: q.answerKey,
      solution: q.solution.trim(),
      difficulty: q.difficulty,
      tags,
    },
  };
}

function dedupeAgainst(existing: Set<string>, q: GeneratedQuestion): boolean {
  const key = q.body.toLowerCase().replace(/\s+/g, " ").slice(0, 120);
  if (existing.has(key)) return false;
  existing.add(key);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────
// Offline stub (used when --no-ai)
// ─────────────────────────────────────────────────────────────────────────
function offlineStub(count: number, topicCode: string, mix: Record<Difficulty, number>): GeneratedQuestion[] {
  const diffs: Difficulty[] = [];
  diffs.push(...Array(Math.round(count * mix.EASY)).fill("EASY"));
  diffs.push(...Array(Math.round(count * mix.MEDIUM)).fill("MEDIUM"));
  while (diffs.length < count) diffs.push("HARD");
  return diffs.slice(0, count).map((d, i) => ({
    body: `[STUB ${topicCode} #${i + 1}] What is 2 + 2?`,
    options: [
      { key: "A", text: "3" },
      { key: "B", text: "4" },
      { key: "C", text: "5" },
      { key: "D", text: "22" },
    ],
    answerKey: "B",
    solution: "Two plus two equals four. This is a placeholder generated in --no-ai mode for plumbing tests.",
    difficulty: d,
    tags: ["stub"],
  }));
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv);
  const prisma = new PrismaClient();

  try {
    const exam = await prisma.exam.findUnique({
      where: { code: args.exam },
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
    if (!exam) throw new Error(`Exam ${args.exam} not found. Did you run \`npm run seed:exams\`?`);

    // Build syllabus block (cached on every Claude call for this run)
    const syllabusBlock = renderSyllabusBlock(exam);

    // Decide which topics to generate for
    const allTopics = exam.subjects.flatMap((s) => s.topics);
    let targets: typeof allTopics = [];
    if (args.topic) {
      const t = allTopics.find((x) => x.code === args.topic);
      if (!t) throw new Error(`Topic ${args.topic} not found in ${args.exam}.`);
      targets = [t];
    } else if (args.subject) {
      const s = exam.subjects.find((x) => x.code === args.subject);
      if (!s) throw new Error(`Subject ${args.subject} not found in ${args.exam}.`);
      targets = s.topics;
    } else if (args.all) {
      targets = allTopics;
    }
    if (targets.length === 0) throw new Error("No target topics resolved.");

    const client = args.noAi ? null : new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
    if (!args.noAi && !process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not set. Use --no-ai to test plumbing without spending.");
    }

    console.log(`Generating ${args.count} Qs for ${targets.length} topic(s) in ${args.exam}...`);
    if (args.dryRun) console.log("[DRY RUN] No DB writes will occur.");

    let totalAccepted = 0;
    let totalRejected = 0;

    for (const topic of targets) {
      console.log(`\n→ ${topic.code} — ${topic.name}`);

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
      const recent = args.avoidRecent > 0
        ? await prisma.question.findMany({
            where: { topicId: topic.id },
            take: args.avoidRecent,
            orderBy: { createdAt: "desc" },
            select: { body: true },
          })
        : [];
      const avoidBlock = recent.length
        ? "# Avoid generating questions whose stem is essentially the same as any of these\n" +
          recent.map((r, i) => `${i + 1}. ${r.body.slice(0, 200)}`).join("\n")
        : "";
      const dedupeSet = new Set(recent.map((r) => r.body.toLowerCase().replace(/\s+/g, " ").slice(0, 120)));

      // Generate in batches
      const accepted: GeneratedQuestion[] = [];
      let pending = args.count;

      while (pending > 0) {
        const want = Math.min(pending, args.batchSize);
        const batchTargets: Record<Difficulty, number> = {
          EASY: Math.round(want * args.difficulty.EASY) / want,
          MEDIUM: Math.round(want * args.difficulty.MEDIUM) / want,
          HARD: 1 - (Math.round(want * args.difficulty.EASY) / want) - (Math.round(want * args.difficulty.MEDIUM) / want),
        };

        let batch: GeneratedQuestion[] = [];
        if (args.noAi) {
          batch = offlineStub(want, topic.code, args.difficulty);
        } else {
          // Retry up to args.retry times on JSON parse / shape errors.
          let lastErr: Error | null = null;
          for (let attempt = 0; attempt <= args.retry; attempt++) {
            try {
              const result = await generateBatch(client!, {
                examName: exam.name,
                examCode: exam.code,
                syllabusBlock,
                topic,
                fewShotBlock,
                avoidBlock,
                count: want,
                difficultyTargets: batchTargets,
              });
              batch = result.questions;
              lastErr = null;
              break;
            } catch (e: any) {
              lastErr = e;
              const remaining = args.retry - attempt;
              if (remaining > 0) {
                console.warn(`   ⚠ batch failed (${e.message?.slice(0, 100)}), retrying… (${remaining} attempt${remaining === 1 ? "" : "s"} left)`);
              }
            }
          }
          if (lastErr) {
            console.error(`   ✗ batch failed after retries: ${lastErr.message}`);
            break; // stop this topic; move on to the next
          }
        }

        // Validate each
        let batchAccepted = 0;
        let batchRejected = 0;
        for (const raw of batch) {
          const v = validateGenerated(raw);
          if (!v.ok) {
            console.warn(`  ⚠ rejected: ${v.reason}`);
            batchRejected++;
            continue;
          }
          if (!dedupeAgainst(dedupeSet, v.q)) {
            console.warn(`  ⚠ rejected: duplicate body`);
            batchRejected++;
            continue;
          }
          accepted.push(v.q);
          batchAccepted++;
        }
        totalAccepted += batchAccepted;
        totalRejected += batchRejected;

        console.log(`   batch: ${batchAccepted} ok / ${batchRejected} rejected (running total: ${accepted.length}/${args.count})`);

        if (args.dryRun && accepted.length > 0) {
          console.log("\n[DRY RUN] First accepted question for this topic:");
          console.log(JSON.stringify(accepted[0], null, 2));
          break; // single batch in dry-run
        }
        if (batchAccepted === 0) {
          console.warn(`   no accepts in last batch — stopping for ${topic.code}`);
          break;
        }
        pending -= batchAccepted;
      }

      // Save (skip in dry-run)
      if (!args.dryRun && accepted.length > 0) {
        await saveQuestions(prisma, exam.id, topic.id, accepted);
        console.log(`   saved ${accepted.length} questions to DB (validated:false, source:AI_GENERATED)`);
      }
    }

    // Cost summary
    console.log("\n──────── Token usage ────────");
    console.log(`  Calls:          ${totals.calls}`);
    console.log(`  Input:          ${totals.inputTokens.toLocaleString()}`);
    console.log(`  Output:         ${totals.outputTokens.toLocaleString()}`);
    console.log(`  Cache create:   ${totals.cacheCreationTokens.toLocaleString()}`);
    console.log(`  Cache read:     ${totals.cacheReadTokens.toLocaleString()}`);
    const cost =
      (totals.inputTokens / 1_000_000) * PRICE_INPUT_PER_M +
      (totals.outputTokens / 1_000_000) * PRICE_OUTPUT_PER_M +
      (totals.cacheCreationTokens / 1_000_000) * PRICE_CACHE_WRITE_PER_M +
      (totals.cacheReadTokens / 1_000_000) * PRICE_CACHE_READ_PER_M;
    console.log(`  Estimated cost: $${cost.toFixed(4)}`);
    console.log(`\n──────── Result ────────`);
    console.log(`  Accepted: ${totalAccepted}`);
    console.log(`  Rejected: ${totalRejected}`);
    if (args.dryRun) console.log("  [DRY RUN] nothing was saved — re-run without --dry-run to persist.");
    else console.log("  Review at: /admin/questions?source=AI_GENERATED&validated=false");
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

async function saveQuestions(
  prisma: PrismaClient,
  examId: string,
  topicId: string,
  qs: GeneratedQuestion[]
) {
  for (const q of qs) {
    await prisma.question.create({
      data: {
        examId,
        topicId,
        type: "MCQ",
        difficulty: q.difficulty,
        body: q.body,
        options: q.options,
        answerKey: q.answerKey,
        solution: q.solution,
        language: "EN" as Language,
        source: "AI_GENERATED" as QuestionSource,
        validated: false,
        tags: q.tags,
        metadata: { generator: MODEL, batch: `bulk-${new Date().toISOString().slice(0, 10)}` },
      },
    });
  }
}

main().catch((err) => {
  console.error("\n❌ Generation failed:", err.message ?? err);
  process.exit(1);
});

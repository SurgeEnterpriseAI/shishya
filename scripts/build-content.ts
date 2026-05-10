// scripts/build-content.ts
//
// Category-aware content orchestrator. Iterates exams (filtered by category
// or by code list), and for each topic tops up the question count to a
// per-topic target via Claude. Idempotent — re-running picks up where it
// left off and never duplicates.
//
// Generated questions land tagged AI_GENERATED + validated:false so they
// stay out of live mocks until SMEs approve them at /admin/questions.
//
// USAGE
//   tsx scripts/build-content.ts --category OLYMPIAD --target 5 --budget 50
//   tsx scripts/build-content.ts --exams SSC_CGL,IBPS_PO,NEET_UG --target 3
//   tsx scripts/build-content.ts --all --target 5 --budget 200
//   tsx scripts/build-content.ts --all --target 10 --dry-run
//
// FLAGS
//   --category <name>    only exams in this ExamCategory (GOVT_JOBS, OLYMPIAD, ...)
//   --exams <CSV>        explicit comma-separated list of exam codes
//   --all                every active exam (mutually exclusive with --category/--exams)
//   --target <n>         minimum total questions per topic after run (default 5)
//   --batch-size <n>     questions per Claude call (default 5)
//   --budget <USD>       abort once estimated token spend exceeds this (default 50)
//   --max-topics <n>     cap topics processed across all exams (debug; default Infinity)
//   --dry-run            print what would be generated; no API calls, no DB writes
//
// PRECONDITIONS
//   - Run seed/exams/seed-all.ts first so subjects + topics exist
//   - DATABASE_URL + ANTHROPIC_API_KEY in env (use dotenv-cli)

import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient, Difficulty, QuestionSource } from "@prisma/client";

const PRICE_INPUT_PER_M = 3.0;
const PRICE_OUTPUT_PER_M = 15.0;
const PRICE_CACHE_WRITE_PER_M = 3.75;
const PRICE_CACHE_READ_PER_M = 0.3;
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";

interface CliArgs {
  category?: string;
  exams?: string[];
  all: boolean;
  target: number;
  batchSize: number;
  budgetUsd: number;
  maxTopics: number;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const a: any = { all: false, target: 5, batchSize: 5, budgetUsd: 50, maxTopics: Infinity, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case "--category":   a.category = next(); break;
      case "--exams":      a.exams = next().split(",").map((s: string) => s.trim()).filter(Boolean); break;
      case "--all":        a.all = true; break;
      case "--target":     a.target = parseInt(next(), 10); break;
      case "--batch-size": a.batchSize = parseInt(next(), 10); break;
      case "--budget":     a.budgetUsd = parseFloat(next()); break;
      case "--max-topics": a.maxTopics = parseInt(next(), 10); break;
      case "--dry-run":    a.dryRun = true; break;
      case "--help": case "-h":
        console.log(__usageText());
        process.exit(0);
    }
  }
  if (!a.category && !a.exams && !a.all) {
    console.error("error: must pass --category, --exams, or --all");
    console.log(__usageText());
    process.exit(1);
  }
  return a as CliArgs;
}

function __usageText() {
  return `Usage: tsx scripts/build-content.ts [--category X | --exams A,B,C | --all] [--target N] [--budget USD]`;
}

const SYSTEM_PERSONA = `You write high-quality multiple-choice questions for Indian competitive exam preparation. Each question:
- Tests one concept clearly. No trick questions.
- Has exactly 4 options labelled A, B, C, D.
- Has exactly one unambiguously correct answer.
- Has a step-by-step solution that a student can follow without prior knowledge.
- Uses plain English, no LaTeX. Math is written as plain text (e.g. "x² + 1").
- Reflects the difficulty level requested.
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
]`;

interface Counts {
  in: number; out: number; cacheW: number; cacheR: number; calls: number;
  insertedQs: number; rejectedQs: number; topicsProcessed: number;
}

const totals: Counts = { in: 0, out: 0, cacheW: 0, cacheR: 0, calls: 0, insertedQs: 0, rejectedQs: 0, topicsProcessed: 0 };

function spendUsd(): number {
  return (
    (totals.in * PRICE_INPUT_PER_M) / 1_000_000 +
    (totals.out * PRICE_OUTPUT_PER_M) / 1_000_000 +
    (totals.cacheW * PRICE_CACHE_WRITE_PER_M) / 1_000_000 +
    (totals.cacheR * PRICE_CACHE_READ_PER_M) / 1_000_000
  );
}

async function main() {
  const args = parseArgs(process.argv);
  const prisma = new PrismaClient();
  const client = args.dryRun ? null : new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
  if (!args.dryRun && !process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set. Use --dry-run to plan without spending.");
  }

  // Resolve target exams
  let where: any = { active: true };
  if (args.category) where.category = args.category;
  if (args.exams) where.code = { in: args.exams };
  const exams = await prisma.exam.findMany({
    where,
    orderBy: { code: "asc" },
    include: {
      subjects: {
        include: {
          topics: {
            where: { parentId: null },
            include: { children: true },
          },
        },
      },
    },
  });
  if (exams.length === 0) {
    console.error(`No active exams matched the filter.`);
    process.exit(1);
  }

  console.log(`\n=== build-content ===`);
  console.log(`Filter:   ${args.category ?? args.exams?.join(",") ?? "all"}`);
  console.log(`Target:   ${args.target} questions per topic`);
  console.log(`Budget:   $${args.budgetUsd.toFixed(2)} (estimated)`);
  console.log(`Exams:    ${exams.length}`);
  console.log(`Mode:     ${args.dryRun ? "DRY RUN" : "LIVE — will hit Anthropic + write to DB"}\n`);

  outer: for (const exam of exams) {
    const allTopics = exam.subjects.flatMap((s) => s.topics);
    if (allTopics.length === 0) {
      console.log(`(skip) ${exam.code} — no topics seeded`);
      continue;
    }
    console.log(`\n→ ${exam.code} — ${exam.shortName} (${allTopics.length} topics)`);

    // Cached system block: persona + syllabus tree.
    const syllabusBlock = renderSyllabusBlock(exam);

    for (const topic of allTopics) {
      if (totals.topicsProcessed >= args.maxTopics) {
        console.log(`(stop) max-topics reached`);
        break outer;
      }
      if (spendUsd() >= args.budgetUsd) {
        console.log(`(stop) budget reached: $${spendUsd().toFixed(2)} ≥ $${args.budgetUsd}`);
        break outer;
      }
      // Existing question count for this topic + its child subtopics.
      const topicIds = [topic.id, ...topic.children.map((c) => c.id)];
      const have = await prisma.question.count({
        where: { topicId: { in: topicIds } },
      });
      const want = Math.max(0, args.target - have);
      if (want === 0) {
        console.log(`  • ${topic.code.padEnd(40)} ${have}/${args.target}  (skip)`);
        continue;
      }

      console.log(`  → ${topic.code.padEnd(40)} ${have}/${args.target}  (gen ${want})`);
      totals.topicsProcessed += 1;

      if (args.dryRun) continue;

      // Few-shot from validated questions on this topic, if any
      const fewShot = await prisma.question.findMany({
        where: { topicId: topic.id, validated: true },
        take: 2,
        orderBy: { createdAt: "asc" },
        select: { body: true, options: true, answerKey: true, solution: true, difficulty: true },
      });
      const fewShotBlock = fewShot.length
        ? "\n# Style examples (already validated for this topic — match this style)\n" +
          fewShot.map((q, i) => {
            const opts = (q.options as { key: string; text: string }[]).map((o) => `${o.key}. ${o.text}`).join("  ");
            return `Example ${i + 1} [${q.difficulty}]\nQ: ${q.body}\n${opts}\nAnswer: ${q.answerKey}\nSolution: ${q.solution}`;
          }).join("\n\n")
        : "";

      // Avoid recent — load up to 20 most-recent stems on this topic
      const recent = await prisma.question.findMany({
        where: { topicId: topic.id },
        take: 20,
        orderBy: { createdAt: "desc" },
        select: { body: true },
      });
      const avoidBlock = recent.length
        ? "\n# Avoid generating questions whose stem is essentially the same as any of these\n" +
          recent.map((r, i) => `${i + 1}. ${r.body.slice(0, 200)}`).join("\n")
        : "";

      // Generate in batches of args.batchSize
      let pending = want;
      while (pending > 0) {
        const n = Math.min(pending, args.batchSize);
        const userPrompt = `Generate exactly ${n} questions on this topic.

# Topic
- Exam: ${exam.name} (${exam.code})
- Topic name: **${topic.name}**
- Topic code: \`${topic.code}\`
${topic.description ? `- Description: ${topic.description}` : ""}

# Difficulty distribution
- EASY: 0.3
- MEDIUM: 0.5
- HARD: 0.2
${fewShotBlock}
${avoidBlock}

${OUTPUT_SCHEMA}`;

        let raw: any[];
        try {
          const response = await client!.messages.create({
            model: MODEL,
            max_tokens: 8000,
            system: [
              { type: "text", text: SYSTEM_PERSONA, cache_control: { type: "ephemeral" } },
              { type: "text", text: syllabusBlock, cache_control: { type: "ephemeral" } },
            ],
            messages: [{ role: "user", content: userPrompt }],
          });
          totals.calls += 1;
          totals.in += response.usage.input_tokens;
          totals.out += response.usage.output_tokens;
          totals.cacheW += response.usage.cache_creation_input_tokens ?? 0;
          totals.cacheR += response.usage.cache_read_input_tokens ?? 0;
          const text = response.content
            .filter((b): b is Anthropic.TextBlock => b.type === "text")
            .map((b) => b.text)
            .join("\n");
          const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
          raw = JSON.parse(cleaned);
          if (!Array.isArray(raw)) throw new Error("not an array");
        } catch (err: any) {
          console.warn(`     ✗ batch failed: ${err.message?.slice(0, 100)}`);
          break;
        }

        for (const r of raw) {
          const v = validateOne(r);
          if (!v.ok) { totals.rejectedQs += 1; continue; }
          await prisma.question.create({
            data: {
              examId: exam.id,
              topicId: topic.id,
              type: "MCQ",
              difficulty: v.q.difficulty,
              body: v.q.body,
              options: v.q.options,
              answerKey: v.q.answerKey,
              solution: v.q.solution,
              source: QuestionSource.AI_GENERATED,
              validated: false,
              tags: [...v.q.tags, `gen:${new Date().toISOString().slice(0, 10)}`],
            },
          });
          totals.insertedQs += 1;
        }
        pending = Math.max(0, pending - n);
      }
    }

    // Mid-run progress: per-exam summary
    console.log(`  ─ ${exam.code} done. running total: ${totals.insertedQs} inserted, $${spendUsd().toFixed(2)} spent`);
  }

  await prisma.$disconnect();
  console.log(`\n=== build-content summary ===`);
  console.log(`Topics processed: ${totals.topicsProcessed}`);
  console.log(`Questions inserted: ${totals.insertedQs}`);
  console.log(`Questions rejected: ${totals.rejectedQs}`);
  console.log(`Claude calls: ${totals.calls}`);
  console.log(`Tokens — in:${totals.in} out:${totals.out} cacheW:${totals.cacheW} cacheR:${totals.cacheR}`);
  console.log(`Estimated spend: $${spendUsd().toFixed(2)}`);
}

interface ValidatedQ {
  body: string;
  options: { key: string; text: string }[];
  answerKey: string;
  solution: string;
  difficulty: Difficulty;
  tags: string[];
}

function validateOne(q: any): { ok: true; q: ValidatedQ } | { ok: false; reason: string } {
  if (!q || typeof q !== "object") return { ok: false, reason: "not object" };
  if (typeof q.body !== "string" || q.body.trim().length < 10) return { ok: false, reason: "body too short" };
  if (!Array.isArray(q.options) || q.options.length !== 4) return { ok: false, reason: "options !4" };
  const keys = q.options.map((o: any) => o?.key);
  if (JSON.stringify(keys) !== JSON.stringify(["A", "B", "C", "D"])) return { ok: false, reason: "options not A-D" };
  if (!["A", "B", "C", "D"].includes(q.answerKey)) return { ok: false, reason: "bad answerKey" };
  if (typeof q.solution !== "string" || q.solution.length < 20) return { ok: false, reason: "solution short" };
  if (!["EASY", "MEDIUM", "HARD"].includes(q.difficulty)) return { ok: false, reason: "bad difficulty" };
  return {
    ok: true,
    q: {
      body: q.body.trim(),
      options: q.options.map((o: any) => ({ key: o.key, text: String(o.text).trim() })),
      answerKey: q.answerKey,
      solution: q.solution.trim(),
      difficulty: q.difficulty,
      tags: Array.isArray(q.tags) ? q.tags.filter((t: any) => typeof t === "string").slice(0, 5) : [],
    },
  };
}

function renderSyllabusBlock(exam: any): string {
  const lines: string[] = [`# Syllabus — ${exam.name} (${exam.code})`];
  for (const subject of exam.subjects) {
    lines.push(`\n## ${subject.name} [${subject.code}]`);
    for (const t of subject.topics) {
      lines.push(`- **${t.name}** [\`${t.code}\`]${t.description ? ` — ${t.description}` : ""}`);
      if (t.children?.length) {
        for (const c of t.children) {
          lines.push(`  - ${c.name} [\`${c.code}\`]${c.description ? ` — ${c.description}` : ""}`);
        }
      }
    }
  }
  return lines.join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

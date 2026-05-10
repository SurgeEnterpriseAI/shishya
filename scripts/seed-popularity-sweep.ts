// scripts/seed-popularity-sweep.ts
//
// Walks every exam in popularity order (candidatesPerYear DESC) and, for
// each one, ensures:
//   1) A question pool large enough to back N distinct full-length mocks
//      (target pool = pool_multiplier × exam.totalQuestions).
//   2) N system mocks (Mock #1..N) assembled from that pool.
//
// Idempotent + resumable:
//   - If an exam already has ≥ N system mocks under generatedBy="system:full-mock-<i>"
//     and a sufficient pool, the exam is skipped entirely.
//   - If only some mocks exist or the pool is short, only the missing pieces
//     are generated.
//   - Hard $ budget cap (--budget) so a runaway loop never blows token spend.
//
// USAGE
//   tsx scripts/seed-popularity-sweep.ts --mocks 10 --budget 300
//   tsx scripts/seed-popularity-sweep.ts --mocks 10 --budget 100 --top 20
//   tsx scripts/seed-popularity-sweep.ts --mocks 10 --budget 50 --dry-run
//
// FLAGS
//   --mocks <N>              full-length system mocks per exam (default 10)
//   --pool-multiplier <m>    pool size = m × totalQuestions (default 2 — gives
//                            mocks ~50% unique question overlap)
//   --top <n>                cap to top-N most-popular exams (default all 163)
//   --budget <USD>           abort when estimated spend ≥ this (default 300)
//   --include-unvalidated    let assembled mocks pull AI_GENERATED + validated
//                            (default: yes — without this flag we can't ship
//                            mocks for any exam without SME-validated content)
//   --validated-only         strict mode: only validated questions enter mocks
//   --dry-run                print plan; no API calls, no DB writes
//
// PRECONDITIONS
//   - DATABASE_URL + ANTHROPIC_API_KEY in env (use dotenv-cli)
//   - All exam metadata + syllabi seeded (run seed/exams/seed-all.ts first)

import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient, Difficulty, QuestionSource, MockType } from "@prisma/client";

// Anthropic pricing (USD per 1M tokens). Rough — replace if rates change.
const PRICE_INPUT_PER_M = 3.0;
const PRICE_OUTPUT_PER_M = 15.0;
const PRICE_CACHE_WRITE_PER_M = 3.75;
const PRICE_CACHE_READ_PER_M = 0.3;
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";

interface CliArgs {
  mocks: number;
  poolMultiplier: number;
  top: number;
  budgetUsd: number;
  includeUnvalidated: boolean;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const a: any = { mocks: 10, poolMultiplier: 2, top: Infinity, budgetUsd: 300, includeUnvalidated: true, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case "--mocks":              a.mocks = parseInt(next(), 10); break;
      case "--pool-multiplier":    a.poolMultiplier = parseFloat(next()); break;
      case "--top":                a.top = parseInt(next(), 10); break;
      case "--budget":             a.budgetUsd = parseFloat(next()); break;
      case "--include-unvalidated": a.includeUnvalidated = true; break;
      case "--validated-only":     a.includeUnvalidated = false; break;
      case "--dry-run":            a.dryRun = true; break;
      case "--help": case "-h":
        console.log(`Usage: tsx scripts/seed-popularity-sweep.ts [flags]\n  --mocks <N>  --pool-multiplier <m>  --top <n>  --budget <USD>  --validated-only  --dry-run`);
        process.exit(0);
    }
  }
  return a as CliArgs;
}

const SYSTEM_PERSONA = `You write high-quality multiple-choice questions for Indian competitive exam preparation. Each question:
- Tests one concept clearly. No trick questions.
- Has exactly 4 options labelled A, B, C, D.
- Has exactly one unambiguously correct answer.
- Has a step-by-step solution that a student can follow without prior knowledge.
- Uses plain English, no LaTeX. Math is written as plain text.
- Mirrors the style of past papers — realistic numbers, India-relevant context.

You never invent claims about specific exam years or answer keys from real exams.`;

const OUTPUT_SCHEMA = `Return STRICT JSON — a single array, no markdown, no commentary:

[{"body":"...","options":[{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."}],"answerKey":"B","solution":"...","difficulty":"EASY"|"MEDIUM"|"HARD","tags":["..."]}]`;

interface Counts {
  in: number; out: number; cacheW: number; cacheR: number; calls: number;
  qInserted: number; qRejected: number; mocksCreated: number; mocksUpdated: number; examsCompleted: number;
}
const totals: Counts = { in: 0, out: 0, cacheW: 0, cacheR: 0, calls: 0, qInserted: 0, qRejected: 0, mocksCreated: 0, mocksUpdated: 0, examsCompleted: 0 };

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

  const allExams = await prisma.exam.findMany({
    where: { active: true },
    orderBy: [
      { candidatesPerYear: { sort: "desc", nulls: "last" } },
      { code: "asc" },
    ],
    include: {
      subjects: { include: { topics: { where: { parentId: null }, include: { children: true } } } },
    },
  });
  const examsInScope = Number.isFinite(args.top) ? allExams.slice(0, args.top) : allExams;

  console.log(`\n=== seed-popularity-sweep ===`);
  console.log(`Exams in scope:    ${examsInScope.length} (of ${allExams.length} total)`);
  console.log(`Mocks per exam:    ${args.mocks}`);
  console.log(`Pool multiplier:   ${args.poolMultiplier}x exam.totalQuestions`);
  console.log(`Mock pool source:  ${args.includeUnvalidated ? "validated + AI_GENERATED" : "validated only"}`);
  console.log(`Budget cap:        $${args.budgetUsd.toFixed(2)}`);
  console.log(`Mode:              ${args.dryRun ? "DRY RUN" : "LIVE — will hit Anthropic + write DB"}\n`);

  for (const exam of examsInScope) {
    if (spendUsd() >= args.budgetUsd) {
      console.log(`\n(stop) budget reached: $${spendUsd().toFixed(2)} ≥ $${args.budgetUsd}`);
      break;
    }

    const allTopics = exam.subjects.flatMap((s) => s.topics);
    if (allTopics.length === 0) {
      console.log(`(skip) ${exam.code.padEnd(22)} no topics seeded — run seed-all first`);
      continue;
    }

    const baseWhere: any = { examId: exam.id };
    if (!args.includeUnvalidated) baseWhere.validated = true;
    const poolHave = await prisma.question.count({ where: baseWhere });
    const poolTarget = Math.ceil(args.poolMultiplier * exam.totalQuestions);
    const perTopicTarget = Math.max(1, Math.ceil(poolTarget / allTopics.length));

    // Count existing system mocks of the per-mock kind
    const mocksHave = await prisma.mock.count({
      where: { examId: exam.id, userId: null, generatedBy: { startsWith: "system:full-mock:" } },
    });

    const cps = exam.candidatesPerYear ? `${(exam.candidatesPerYear / 1_000_000).toFixed(1)}M` : "—";
    console.log(`\n→ ${exam.code.padEnd(22)} ${exam.shortName.padEnd(30)} cps=${cps.padStart(6)}  pool=${poolHave}/${poolTarget}  mocks=${mocksHave}/${args.mocks}`);

    if (poolHave >= poolTarget && mocksHave >= args.mocks) {
      console.log(`  ✓ already at target; skipping`);
      totals.examsCompleted += 1;
      continue;
    }

    // ── Phase A: top-up questions per topic ─────────────────────────
    if (poolHave < poolTarget) {
      const syllabusBlock = renderSyllabusBlock(exam);

      for (const topic of allTopics) {
        if (spendUsd() >= args.budgetUsd) break;
        const topicIds = [topic.id, ...topic.children.map((c) => c.id)];
        const have = await prisma.question.count({ where: { topicId: { in: topicIds } } });
        const want = Math.max(0, perTopicTarget - have);
        if (want === 0) continue;

        if (args.dryRun) {
          console.log(`     [dry] ${topic.code.padEnd(38)} ${have}/${perTopicTarget}  (gen ${want})`);
          continue;
        }

        const recent = await prisma.question.findMany({
          where: { topicId: topic.id }, take: 15, orderBy: { createdAt: "desc" }, select: { body: true },
        });
        const avoidBlock = recent.length
          ? "\n# Avoid generating questions whose stem is essentially the same as any of these\n" +
            recent.map((r, i) => `${i + 1}. ${r.body.slice(0, 200)}`).join("\n")
          : "";

        let pending = want;
        const BATCH = 5;
        while (pending > 0) {
          const n = Math.min(pending, BATCH);
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
              .map((b) => b.text).join("\n");
            const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
            raw = JSON.parse(cleaned);
            if (!Array.isArray(raw)) throw new Error("not an array");
          } catch (err: any) {
            console.warn(`       ✗ ${topic.code} batch failed: ${err.message?.slice(0, 100)}`);
            break;
          }

          for (const r of raw) {
            const v = validateOne(r);
            if (!v.ok) { totals.qRejected += 1; continue; }
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
            totals.qInserted += 1;
          }
          pending = Math.max(0, pending - n);
        }
      }
      const newPool = await prisma.question.count({ where: baseWhere });
      console.log(`  pool: ${poolHave} → ${newPool}  (target ${poolTarget})  spent so far: $${spendUsd().toFixed(2)}`);
    }

    if (args.dryRun) continue;

    // ── Phase B: assemble N full-length mocks ───────────────────────
    const finalPoolIds = await prisma.question.findMany({
      where: baseWhere,
      select: { id: true },
      orderBy: { id: "asc" },
    });
    if (finalPoolIds.length < Math.min(20, exam.totalQuestions)) {
      console.warn(`  ⚠ pool too small (${finalPoolIds.length}); skipping mock assembly`);
      continue;
    }
    const poolIds = finalPoolIds.map((q) => q.id);
    const N = args.mocks;
    const M = exam.totalQuestions;

    for (let i = 1; i <= N; i++) {
      // Deterministic shuffle seeded by exam.code + mock index
      const shuffled = deterministicShuffle(poolIds, `${exam.code}:${i}`);
      const questionIds = shuffled.slice(0, Math.min(M, shuffled.length));
      const generatedBy = `system:full-mock:${i}`;
      const title = `${exam.shortName} — Full Mock ${i}`;

      const existing = await prisma.mock.findFirst({
        where: { examId: exam.id, userId: null, generatedBy },
      });
      const data = {
        examId: exam.id,
        userId: null,
        type: "FULL" as MockType,
        title,
        config: {
          durationMin: exam.durationMin,
          description: `Full-length mock ${i} of ${N} for ${exam.shortName}. Pool drawn from ${args.includeUnvalidated ? "validated + AI-drafted (awaiting SME review)" : "validated"} questions.`,
          mockIndex: i,
          autoGenerated: true,
        } as any,
        questionIds,
      };
      if (existing) {
        await prisma.mock.update({ where: { id: existing.id }, data });
        totals.mocksUpdated += 1;
      } else {
        await prisma.mock.create({ data: { ...data, generatedBy } });
        totals.mocksCreated += 1;
      }
    }

    totals.examsCompleted += 1;
    console.log(`  ✓ ${exam.code.padEnd(22)} done. mocks_total=${N}  spent=$${spendUsd().toFixed(2)}`);
  }

  await prisma.$disconnect();

  console.log(`\n=== seed-popularity-sweep summary ===`);
  console.log(`Exams completed:   ${totals.examsCompleted}`);
  console.log(`Questions inserted: ${totals.qInserted}  (rejected ${totals.qRejected})`);
  console.log(`Mocks created/updated: ${totals.mocksCreated}/${totals.mocksUpdated}`);
  console.log(`Claude calls:      ${totals.calls}`);
  console.log(`Tokens — in:${totals.in} out:${totals.out} cacheW:${totals.cacheW} cacheR:${totals.cacheR}`);
  console.log(`Estimated spend:   $${spendUsd().toFixed(2)}`);
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

/** xmur3 string hash → mulberry32 prng. Deterministic shuffle of the pool. */
function deterministicShuffle<T>(input: T[], seed: string): T[] {
  const arr = [...input];
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let s = (h ^ (h >>> 16)) >>> 0;
  const rand = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

main().catch((err) => { console.error(err); process.exit(1); });

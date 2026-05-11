// scripts/seed-minimal-mocks.ts
//
// Cheap, fast mock seeder for the long tail of exams that have NO
// questions yet. Goal: every active exam has at least one playable mock.
//
// For each exam in scope WITHOUT an existing system mock:
//   1. Pick a representative subject (the one with most topics) and 1-2
//      child topics under it.
//   2. Call Claude once to generate ~15-20 MCQs across those topics.
//   3. Persist questions (source = AI_GENERATED, validated = false).
//   4. Build a single "Quick Practice" Mock from those questions.
//
// This is intentionally lighter than scripts/seed-popularity-sweep.ts —
// each exam costs ~$0.20-0.40 rather than $1-3, so the full long tail
// (~100 exams) fits in a $30-40 budget instead of $200+.
//
// USAGE
//   npx dotenv-cli -e .env.local -- npx tsx scripts/seed-minimal-mocks.ts --budget 30
//   npx dotenv-cli -e .env.local -- npx tsx scripts/seed-minimal-mocks.ts --exams CG_TET,JK_JKCET
//   npx dotenv-cli -e .env.local -- npx tsx scripts/seed-minimal-mocks.ts --dry-run
//
// FLAGS
//   --exams CSV     explicit exam codes
//   --top N         pick top-N popularity (rare for long-tail; uses code-asc fallback)
//   --budget USD    soft cap (default $30)
//   --per-exam N    how many questions per exam (default 20)
//   --dry-run

import { PrismaClient } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";
const COST_PER_EXAM_USD = 0.25;

interface Args {
  exams?: string[];
  top?: number;
  budget: number;
  perExam: number;
  dryRun: boolean;
}

function parseArgs(): Args {
  const a: any = { budget: 30, perExam: 20, dryRun: false };
  const argv = process.argv;
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case "--exams":    a.exams = next().split(",").map((s: string) => s.trim()); break;
      case "--top":      a.top = parseInt(next(), 10); break;
      case "--budget":   a.budget = parseFloat(next()); break;
      case "--per-exam": a.perExam = parseInt(next(), 10); break;
      case "--dry-run":  a.dryRun = true; break;
    }
  }
  return a as Args;
}

const p = new PrismaClient();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY not set.");
  process.exit(1);
}

const SYSTEM = `You are generating exam-prep multiple-choice questions for a free Indian entrance-exam platform.

Produce STRICT JSON only, no fences. Each question must be:
- factually correct and answerable from common-knowledge or syllabus topics
- 4 options (A/B/C/D) with exactly ONE correct answer
- 1-2 sentence solution explaining why the answer is correct
- Difficulty mix: roughly half EASY, third MEDIUM, rest HARD
- No copyrighted text. No questions about hyper-current events. Plain, board-style phrasing.

JSON schema:
{
  "questions": [
    {
      "topicCode": "subject.topic.subtopic",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "body": "...",
      "options": [
        { "key": "A", "text": "..." },
        { "key": "B", "text": "..." },
        { "key": "C", "text": "..." },
        { "key": "D", "text": "..." }
      ],
      "answerKey": "A",
      "solution": "..."
    },
    ...
  ]
}`;

async function generateMinimalSet(input: {
  examName: string;
  examShortName: string;
  topics: Array<{ id: string; code: string; name: string; subjectName: string }>;
  count: number;
}): Promise<Array<{
  topicId: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  body: string;
  options: { key: string; text: string }[];
  answerKey: string;
  solution: string;
}>> {
  const topicSummary = input.topics
    .map((t) => `${t.code}  [${t.subjectName} → ${t.name}]`)
    .join("\n");

  const userPrompt = `Generate ${input.count} multiple-choice questions for this Indian entrance exam.

Exam: ${input.examName} (${input.examShortName})

Topics available — each question MUST reference one of these topic codes EXACTLY:
${topicSummary}

Spread questions across all listed topics roughly evenly. Return STRICT JSON per the system schema.`;

  // 20 questions × ~250 tokens each + JSON wrapping easily hits 5000+.
  // Cap at 8000 to give plenty of headroom so JSON never truncates.
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  const parsed = extractJson(text);
  if (!parsed || !Array.isArray(parsed.questions)) {
    throw new Error(`bad JSON: ${text.slice(0, 200)}`);
  }

  const topicByCode = new Map(input.topics.map((t) => [t.code, t.id]));
  const fallbackTopicId = input.topics[0]?.id;

  return parsed.questions
    .filter((q: any) =>
      typeof q?.body === "string" &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      typeof q.answerKey === "string" &&
      ["A", "B", "C", "D"].includes(q.answerKey),
    )
    .map((q: any) => ({
      topicId: topicByCode.get(q.topicCode) ?? fallbackTopicId!,
      difficulty: (["EASY", "MEDIUM", "HARD"].includes(q.difficulty) ? q.difficulty : "MEDIUM") as any,
      body: String(q.body).slice(0, 2000),
      options: q.options.map((o: any) => ({
        key: String(o.key ?? "").slice(0, 2),
        text: String(o.text ?? "").slice(0, 500),
      })),
      answerKey: q.answerKey,
      solution: String(q.solution ?? "").slice(0, 1000),
    }))
    .filter((q: any) => q.topicId);
}

function extractJson(text: string): any | null {
  let body = text.trim();
  if (body.startsWith("```")) body = body.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  try { return JSON.parse(body); } catch {}
  const first = body.indexOf("{");
  const last = body.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  try { return JSON.parse(body.slice(first, last + 1)); } catch { return null; }
}

async function main() {
  const args = parseArgs();

  // Find exams that need seeding (no mocks at all).
  const allExams = await p.exam.findMany({
    where: { active: true },
    orderBy: { code: "asc" },
    select: {
      id: true, code: true, name: true, shortName: true, durationMin: true,
      subjects: {
        include: { topics: { include: { children: true }, take: 10 } },
      },
    },
  });

  const haveMocks = new Set(
    (await p.mock.groupBy({
      by: ["examId"],
      where: { userId: null, examId: { in: allExams.map((e) => e.id) } },
      _count: { _all: true },
    })).map((r) => r.examId),
  );

  let scope = allExams.filter((e) => !haveMocks.has(e.id));
  if (args.exams) scope = scope.filter((e) => args.exams!.includes(e.code));
  if (args.top) scope = scope.slice(0, args.top);

  console.log(`=== seed-minimal-mocks ===`);
  console.log(`Exams without mocks:    ${allExams.length - haveMocks.size}`);
  console.log(`In scope this run:      ${scope.length}`);
  console.log(`Questions per exam:     ${args.perExam}`);
  console.log(`Budget:                 $${args.budget.toFixed(2)}`);
  console.log(`Mode:                   ${args.dryRun ? "DRY RUN" : "LIVE"}\n`);

  let processed = 0;
  let failed = 0;
  let noTopics = 0;
  let spentUSD = 0;

  for (const exam of scope) {
    if (spentUSD >= args.budget) {
      console.log(`\n[budget] stopping — spent $${spentUSD.toFixed(2)} >= $${args.budget.toFixed(2)}`);
      break;
    }

    // Pick top subject by topic count, then 4-6 topics across that subject.
    const subjectsBySize = [...exam.subjects].sort((a, b) => (b.topics?.length ?? 0) - (a.topics?.length ?? 0));
    const topSubject = subjectsBySize[0];
    if (!topSubject || (topSubject.topics?.length ?? 0) === 0) {
      console.log(`  (skip) ${exam.code.padEnd(22)} no seeded topics`);
      noTopics += 1;
      continue;
    }
    // Flatten: include any child topics under the chosen top-level topics.
    const flatTopics: Array<{ id: string; code: string; name: string; subjectName: string }> = [];
    for (const t of topSubject.topics) {
      flatTopics.push({ id: t.id, code: t.code, name: t.name, subjectName: topSubject.name });
      for (const c of t.children ?? []) {
        flatTopics.push({ id: c.id, code: c.code, name: c.name, subjectName: topSubject.name });
      }
    }
    const topics = flatTopics.slice(0, 6);

    console.log(`  → ${exam.code.padEnd(22)} ${exam.shortName}  (${topics.length} topics)`);
    if (args.dryRun) {
      processed += 1;
      spentUSD += COST_PER_EXAM_USD;
      continue;
    }

    try {
      const rows = await generateMinimalSet({
        examName: exam.name,
        examShortName: exam.shortName,
        topics,
        count: args.perExam,
      });
      if (rows.length < 5) {
        console.log(`     ✗ Claude returned only ${rows.length} usable questions; skipping mock build`);
        failed += 1;
        spentUSD += COST_PER_EXAM_USD;
        continue;
      }

      const created = await Promise.all(
        rows.map((r) =>
          p.question.create({
            data: {
              examId: exam.id,
              topicId: r.topicId,
              type: "MCQ",
              difficulty: r.difficulty,
              body: r.body,
              options: r.options,
              answerKey: r.answerKey,
              solution: r.solution,
              source: "AI_GENERATED",
              validated: false,
              language: "EN",
            },
          }),
        ),
      );

      await p.mock.create({
        data: {
          examId: exam.id,
          userId: null,
          title: `${exam.shortName} — Quick Practice`,
          type: "FULL",
          config: {
            durationMin: exam.durationMin || 30,
            description: `${created.length}-question AI-drafted practice set covering ${topSubject.name}. SME-validation pending.`,
            autoGenerated: true,
            fallback: true,
          },
          questionIds: created.map((c) => c.id),
          generatedBy: "system:auto:minimal-mock",
        },
      });

      console.log(`     ✓ ${created.length} questions + 1 mock`);
      processed += 1;
      spentUSD += COST_PER_EXAM_USD;
    } catch (err) {
      console.error(`     ✗ ${exam.code} failed:`, (err as Error).message);
      failed += 1;
    }
  }

  console.log(`\n=== summary ===`);
  console.log(`Processed: ${processed}`);
  console.log(`No-topics skipped: ${noTopics}`);
  console.log(`Failed: ${failed}`);
  console.log(`Estimated spend: ~$${spentUSD.toFixed(2)}`);
  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});

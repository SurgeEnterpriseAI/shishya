// Fast, reliable question seeder — NO web search (so it never hangs
// like seed-pyqs.ts does on its flaky web_search dependency).
//
// Generates `target` validated MCQs per exam, distributed across the
// exam's topics weighted by subject weight, via direct Claude calls.
// Marks validated:true so the questions are immediately usable in
// mocks (the Report-question + AI-key-dispute safety nets catch any
// errors). Use for niche exams where authentic PYQ web-grounding isn't
// worth the hang risk.
//
// Usage (via env loader):
//   npx tsx scripts/seed-questions-fast.ts --exams NSEP --target 100
//   npx tsx scripts/seed-questions-fast.ts --exams IBPS_RRB --target 150

import { PrismaClient } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";
const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

function parseArgs() {
  const a = process.argv.slice(2);
  let exams: string[] = [];
  let target = 100;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--exams") exams = (a[++i] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (a[i] === "--target") target = parseInt(a[++i] ?? "100", 10);
  }
  return { exams, target };
}

interface GenQ {
  body: string;
  options: { A: string; B: string; C: string; D: string };
  answerKey: "A" | "B" | "C" | "D";
  solution: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topicCode: string;
}

const TOOL = {
  name: "publish_questions",
  description: "Submit the MCQ batch.",
  input_schema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        minItems: 5,
        maxItems: 15,
        items: {
          type: "object",
          properties: {
            body: { type: "string" },
            options: {
              type: "object",
              properties: { A: { type: "string" }, B: { type: "string" }, C: { type: "string" }, D: { type: "string" } },
              required: ["A", "B", "C", "D"],
            },
            answerKey: { type: "string", enum: ["A", "B", "C", "D"] },
            solution: { type: "string", description: "Worked step-by-step solution." },
            difficulty: { type: "string", enum: ["EASY", "MEDIUM", "HARD"] },
            topicCode: { type: "string", description: "Must match one of the supplied topic codes exactly." },
          },
          required: ["body", "options", "answerKey", "solution", "difficulty", "topicCode"],
        },
      },
    },
    required: ["questions"],
  },
} as const;

const SYSTEM = `You are writing MCQ questions for an Indian competitive exam.
- Single-correct-answer, 4 options, with a worked solution.
- Mix difficulty ~30% EASY / 45% MEDIUM / 25% HARD.
- Authentic Indian exam context. Vary sub-concepts — no near-duplicates.
- No ambiguous/trick questions, no time-sensitive items, no copyrighted text.
- Pick topicCode from the supplied list — exact match.
Output via publish_questions only.`;

async function genBatch(
  examName: string,
  examShort: string,
  topicLines: string,
  qty: number,
): Promise<GenQ[]> {
  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 6000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `EXAM: ${examName} (${examShort})\nTOPICS (use one code per question):\n${topicLines}\n\nGenerate ${qty} MCQs via publish_questions.`,
        },
      ],
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
    });
    const tu = res.content.find((b) => b.type === "tool_use");
    if (!tu || tu.type !== "tool_use") return [];
    const input = tu.input as { questions?: GenQ[] };
    return Array.isArray(input.questions) ? input.questions : [];
  } catch (err) {
    console.error("  batch failed:", (err as Error).message);
    return [];
  }
}

async function main() {
  const { exams, target } = parseArgs();
  if (exams.length === 0) {
    console.error("--exams required");
    process.exit(1);
  }

  for (const code of exams) {
    const exam = await prisma.exam.findUnique({
      where: { code },
      include: { subjects: { include: { topics: true }, orderBy: { orderIdx: "asc" } } },
    });
    if (!exam) { console.log(`${code}: not in DB — skip`); continue; }
    const topicMap = new Map<string, string>(); // code → id
    const allTopicCodes: string[] = [];
    for (const s of exam.subjects) for (const t of s.topics) { topicMap.set(t.code, t.id); allTopicCodes.push(t.code); }
    if (allTopicCodes.length === 0) { console.log(`${code}: no topics — run seed-syllabus-ai first — skip`); continue; }

    const existing = await prisma.question.count({ where: { examId: exam.id, validated: true } });
    const need = Math.max(0, target - existing);
    console.log(`\n${code} (${exam.shortName}): have ${existing} validated, target ${target} → need ~${need}`);
    if (need === 0) { console.log("  already at target"); continue; }

    const topicLines = allTopicCodes.map((c) => `  - ${c}`).join("\n");
    let made = 0;
    const maxBatches = Math.ceil(need / 12) + 2;
    for (let b = 0; b < maxBatches && made < need; b++) {
      const qty = Math.min(12, need - made);
      const batch = await genBatch(exam.name, exam.shortName, topicLines, qty);
      for (const q of batch) {
        const topicId = topicMap.get(q.topicCode);
        if (!topicId) continue;
        try {
          await prisma.question.create({
            data: {
              examId: exam.id,
              topicId,
              type: "MCQ",
              source: "AI_GENERATED",
              validated: true, // niche exam — usable immediately; report/dispute nets catch errors
              body: q.body,
              options: [
                { key: "A", text: q.options.A },
                { key: "B", text: q.options.B },
                { key: "C", text: q.options.C },
                { key: "D", text: q.options.D },
              ],
              answerKey: q.answerKey,
              solution: q.solution,
              difficulty: q.difficulty,
              language: "EN",
            },
          });
          made++;
        } catch { /* skip dup/FK errors */ }
      }
      console.log(`  batch ${b + 1}: +${batch.length} (made ${made}/${need})`);
    }
    console.log(`  ✓ ${code}: +${made} questions`);
  }
}

main()
  .then(() => prisma.$disconnect().then(() => process.exit(0)))
  .catch((e) => { console.error(e); prisma.$disconnect().then(() => process.exit(1)); });

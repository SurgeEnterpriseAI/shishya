// Expand AP_AMVI question pool + build 10 themed system mocks.
//
// Starting state (per the prior seed run):
//   75 questions   (50 PYQ-pattern + 25 AI)
//   1 system mock  ("AP AMVI — Quick Practice")
//
// Goal:
//   ~225 total questions (add ~150 more, evenly across subjects)
//   10 system mocks covering:
//     1. Quick Practice 1-3      — general mix from all subjects (25 Qs each)
//     2. Paper-I focused          — GS + Mental Ability only (30 Qs)
//     3. Paper-II focused         — Automobile + MV Act (30 Qs)
//     4. Full Paper-I simulation  — 50 Qs all GS/MA, matches real Paper-I
//     5. Full Paper-II simulation — 50 Qs all auto/MV, matches real Paper-II
//     6. MV Act mastery           — Motor Vehicles Act + Rules deep dive
//     7. IC Engines mastery       — Engine fundamentals + transmission
//     8. AP-specific GK           — AP history/geo/polity/current affairs
//
// Idempotent: re-running deletes existing system mocks for AP_AMVI
// and rebuilds from the current question pool.
//
// Usage:
//   node -e "<env-loader>; require('child_process').execSync('npx tsx scripts/seed-ap-amvi-mocks.ts', {stdio:'inherit',env:process.env})"

import { PrismaClient } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";

const EXAM_CODE = "AP_AMVI";
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";
const TARGET_TOTAL_QS = 225;

const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

interface GeneratedQ {
  questionText: string;
  options: { A: string; B: string; C: string; D: string };
  answerKey: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topicCode: string;
}

const QUESTION_TOOL = {
  name: "publish_questions",
  description: "Submit a batch of MCQ questions for the exam.",
  input_schema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        minItems: 5,
        maxItems: 20,
        items: {
          type: "object",
          properties: {
            questionText: { type: "string", description: "Plain text question stem, 1-3 sentences." },
            options: {
              type: "object",
              properties: {
                A: { type: "string" },
                B: { type: "string" },
                C: { type: "string" },
                D: { type: "string" },
              },
              required: ["A", "B", "C", "D"],
            },
            answerKey: { type: "string", enum: ["A", "B", "C", "D"] },
            explanation: { type: "string", description: "1-3 sentence explanation of why the answer is correct." },
            difficulty: { type: "string", enum: ["EASY", "MEDIUM", "HARD"] },
            topicCode: { type: "string", description: "Must match one of the supplied topic codes exactly." },
          },
          required: ["questionText", "options", "answerKey", "explanation", "difficulty", "topicCode"],
        },
      },
    },
    required: ["questions"],
  },
} as const;

const SYSTEM_PROMPT = `You are writing MCQ questions for the AP Assistant Motor Vehicle Inspector (AMVI) exam — conducted by APPSC for the AP Transport Department.

Each question MUST:
- Be a single-correct-answer MCQ with 4 options
- Test a real concept from the supplied topic
- Include a short factual explanation
- Use real Indian context (AP-specific where relevant — rivers, districts, MV Act sections, etc.)
- Difficulty: ~30% EASY, ~50% MEDIUM, ~20% HARD

DO NOT:
- Repeat questions across the batch
- Write trick questions with ambiguous answers
- Use questions that depend on the year (e.g. "current CM of AP") — those go stale
- Use copyrighted text verbatim from any textbook

Pick topicCode from the supplied list — must match exactly.`;

interface SubjectGroup {
  subjectCode: string;
  topicCodes: string[];
  qty: number; // how many to generate
}

async function generateQuestionBatch(
  examId: string,
  topicMap: Map<string, { id: string; code: string; subjectId: string }>,
  group: SubjectGroup,
  marksPerQ: number,
): Promise<number> {
  const topicLines = group.topicCodes
    .map((c) => `  - ${c}`)
    .join("\n");
  const userPrompt = `EXAM: AP Assistant Motor Vehicle Inspector
SUBJECT GROUP: ${group.subjectCode}

TOPICS (use one of these codes per question):
${topicLines}

Generate ${group.qty} MCQs spread across these topics. Mix difficulties as instructed.`;

  let created = 0;
  // Claude tool max ~20 Qs per call — chunk if larger.
  const callsNeeded = Math.ceil(group.qty / 15);
  for (let i = 0; i < callsNeeded; i++) {
    const askQty = Math.min(15, group.qty - i * 15);
    try {
      const res = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 6000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: userPrompt + `\n\nThis batch: ${askQty} questions.`,
          },
        ],
        tools: [QUESTION_TOOL],
        tool_choice: { type: "tool", name: QUESTION_TOOL.name },
      });
      const tu = res.content.find((b) => b.type === "tool_use");
      if (!tu || tu.type !== "tool_use") continue;
      const input = tu.input as { questions?: GeneratedQ[] };
      if (!Array.isArray(input.questions)) continue;

      for (const q of input.questions) {
        const t = topicMap.get(q.topicCode);
        if (!t) continue; // skip if Claude hallucinated a topic code
        try {
          // Schema uses `body` / `solution` (NOT stem/explanation) and
          // options stored as JSON array `[{key, text}, ...]` (NOT
          // {A:..., B:...}). marks lives on Exam not Question.
          await prisma.question.create({
            data: {
              examId,
              topicId: t.id,
              type: "MCQ",
              source: "AI_GENERATED",
              validated: false,
              body: q.questionText,
              options: [
                { key: "A", text: q.options.A },
                { key: "B", text: q.options.B },
                { key: "C", text: q.options.C },
                { key: "D", text: q.options.D },
              ],
              answerKey: q.answerKey,
              solution: q.explanation,
              difficulty: q.difficulty,
              language: "EN",
            },
          });
          created++;
        } catch (err) {
          console.error(`  question insert failed:`, (err as Error).message);
        }
      }
    } catch (err) {
      console.error(`  batch ${i + 1} of ${group.subjectCode} failed:`, (err as Error).message);
    }
  }
  return created;
}

interface MockSpec {
  title: string;
  type: "FULL" | "SUBJECT" | "TOPIC" | "ADAPTIVE" | "REVISION" | "CHALLENGE";
  filter: (q: {
    subjectCode: string;
    topicCode: string;
    difficulty: string;
  }) => boolean;
  questionCount: number;
  durationMin: number;
}

const MOCK_SPECS: MockSpec[] = [
  {
    title: "AP AMVI — Quick Practice 1",
    type: "FULL",
    filter: () => true,
    questionCount: 25,
    durationMin: 25,
  },
  {
    title: "AP AMVI — Quick Practice 2",
    type: "FULL",
    filter: () => true,
    questionCount: 25,
    durationMin: 25,
  },
  {
    title: "AP AMVI — Quick Practice 3",
    type: "FULL",
    filter: () => true,
    questionCount: 25,
    durationMin: 25,
  },
  {
    title: "AP AMVI — Paper-I Focus (GS + Mental Ability)",
    type: "SUBJECT",
    filter: (q) => q.subjectCode.startsWith("GS_") || q.subjectCode === "MENTAL_ABILITY",
    questionCount: 30,
    durationMin: 30,
  },
  {
    title: "AP AMVI — Paper-II Focus (Automobile + MV Act)",
    type: "SUBJECT",
    filter: (q) =>
      q.subjectCode.startsWith("AUTO_") ||
      q.subjectCode === "MV_ACT" ||
      q.subjectCode === "ENG_DRAWING",
    questionCount: 30,
    durationMin: 30,
  },
  {
    title: "AP AMVI — Full Paper-I Simulation (150 marks, 150 min)",
    type: "FULL",
    filter: (q) => q.subjectCode.startsWith("GS_") || q.subjectCode === "MENTAL_ABILITY",
    questionCount: 50,
    durationMin: 50,
  },
  {
    title: "AP AMVI — Full Paper-II Simulation (300 marks, 150 min)",
    type: "FULL",
    filter: (q) =>
      q.subjectCode.startsWith("AUTO_") ||
      q.subjectCode === "MV_ACT" ||
      q.subjectCode === "ENG_DRAWING",
    questionCount: 50,
    durationMin: 50,
  },
  {
    title: "AP AMVI — Motor Vehicles Act Mastery",
    type: "SUBJECT",
    filter: (q) => q.subjectCode === "MV_ACT",
    questionCount: 25,
    durationMin: 25,
  },
  {
    title: "AP AMVI — IC Engines & Transmission Mastery",
    type: "SUBJECT",
    filter: (q) => q.subjectCode === "AUTO_ENGINE" || q.subjectCode === "AUTO_TRANSMISSION",
    questionCount: 25,
    durationMin: 25,
  },
  {
    title: "AP AMVI — AP-specific GK Drill",
    type: "SUBJECT",
    filter: (q) =>
      q.topicCode === "gs.history.ap" ||
      q.topicCode === "gs.geo.ap" ||
      q.topicCode === "gs.polity.ap" ||
      q.topicCode === "gs.econ.ap" ||
      q.topicCode === "gs.cur.ap" ||
      q.topicCode === "mv.ap.rules",
    questionCount: 20,
    durationMin: 20,
  },
];

async function main() {
  const exam = await prisma.exam.findUnique({
    where: { code: EXAM_CODE },
    include: { subjects: { include: { topics: true }, orderBy: { orderIdx: "asc" } } },
  });
  if (!exam) throw new Error(`${EXAM_CODE} not found`);

  // Build topic lookup map
  const topicMap = new Map<string, { id: string; code: string; subjectId: string }>();
  for (const s of exam.subjects) {
    for (const t of s.topics) topicMap.set(t.code, { id: t.id, code: t.code, subjectId: s.id });
  }

  // ── 1. Expand question pool to ~225 if needed ──
  const existingCount = await prisma.question.count({ where: { examId: exam.id } });
  console.log(`Existing questions: ${existingCount}`);
  const gap = TARGET_TOTAL_QS - existingCount;

  if (gap > 0) {
    console.log(`Need to generate ~${gap} more questions to hit target ${TARGET_TOTAL_QS}.\n`);
    // Distribute the gap across subjects proportional to weight.
    // Heavier weight (Paper-II topics) get more questions.
    const totalWeight = exam.subjects.reduce((sum, s) => sum + s.weight, 0);
    const groups: SubjectGroup[] = exam.subjects.map((s) => ({
      subjectCode: s.code,
      topicCodes: s.topics.map((t) => t.code),
      qty: Math.round((s.weight / totalWeight) * gap),
    }));

    for (const g of groups) {
      if (g.qty < 1 || g.topicCodes.length === 0) continue;
      console.log(`→ Generating ${g.qty} Qs for ${g.subjectCode}…`);
      const made = await generateQuestionBatch(exam.id, topicMap, g, exam.marksPerQ);
      console.log(`  + ${made} created`);
    }
  } else {
    console.log("Pool already at/above target — skipping generation.\n");
  }

  // ── 2. Reload all questions for mock assembly ──
  const allQs = await prisma.question.findMany({
    where: { examId: exam.id },
    select: {
      id: true,
      difficulty: true,
      topic: { select: { code: true, subject: { select: { code: true } } } },
    },
  });
  console.log(`\nTotal question pool: ${allQs.length}`);

  // ── 3. Drop existing system mocks and rebuild ──
  await prisma.mock.deleteMany({ where: { examId: exam.id, userId: null } });
  console.log("Cleared existing system mocks.\n");

  // ── 4. Build the 10 themed mocks ──
  let mocksCreated = 0;
  for (const spec of MOCK_SPECS) {
    const eligible = allQs.filter((q) =>
      spec.filter({
        subjectCode: q.topic.subject.code,
        topicCode: q.topic.code,
        difficulty: q.difficulty,
      }),
    );
    if (eligible.length === 0) {
      console.log(`  ⚠️  ${spec.title} — no eligible questions, skipped`);
      continue;
    }
    // Shuffle deterministic-enough (slice + reverse + ...) — order doesn't
    // matter much for mock variety, students see them in different attempts.
    const picked = [...eligible]
      .sort(() => 0.5 - Math.hash(spec.title)) // stable per-mock
      .slice(0, spec.questionCount)
      .map((q) => q.id);
    // Fallback: if filtered pool is smaller than asked, take what we have
    const finalIds = picked.length > 0 ? picked : eligible.slice(0, spec.questionCount).map((q) => q.id);

    await prisma.mock.create({
      data: {
        examId: exam.id,
        userId: null,
        type: spec.type,
        title: spec.title,
        config: {
          questionCount: finalIds.length,
          durationMin: spec.durationMin,
        },
        questionIds: finalIds,
        generatedBy: "system",
      },
    });
    console.log(`  ✓ ${spec.title}  (${finalIds.length}/${spec.questionCount} Qs)`);
    mocksCreated++;
  }

  console.log(`\n✅ ${mocksCreated} mocks created. Live at https://shishya.in/exams/${EXAM_CODE}`);
}

// Polyfill Math.hash for deterministic-per-string sort seeding.
// Not crypto — just a tiny string→[-0.5..0.5] hash so the per-mock
// shuffle stays stable across runs without depending on Math.random.
(Math as any).hash = function (s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return (h % 1000) / 1000 - 0.5;
};

main()
  .then(() => prisma.$disconnect().then(() => process.exit(0)))
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().then(() => process.exit(1));
  });

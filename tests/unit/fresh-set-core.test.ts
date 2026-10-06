// "Generate 10 fresh questions" must give a set the student can play (6 Oct 2026).
//
// The bug: POST /api/mocks/fresh wrote 10 new AI questions as validated:false
// and built a CHALLENGE mock on them. Since 26 Sep 2026 (ebd0a9c) every mock
// serves only answer-checked questions (src/lib/served-paper.ts), so each
// fresh set served 0 of its 10 questions and opened on "This mock is being
// rebuilt": 105 sets for 34 students, none played.
//
// This file holds the one check that fails on the old route and passes with
// the fix: press the button the way the results page does, then read the
// mock the route made through the same rule the mock page uses when the
// attempt starts (src/app/mocks/[id]/page.tsx: servedPaperIds → the paper).
// Every question the set holds must be served, and the paper must be long
// enough to start. It imports only files that existed before the fix (the
// route and served-paper), so it runs against both. The bank rows carry the
// answer check's record (validatedBy 'factory:…' + metadata.factoryVerify),
// as the questions a fresh set may hold must.
// The rest of the fix is pinned in tests/unit/fresh-checked-set.test.ts.
//
// No DB, no network, no model: auth, Prisma, analytics, the usage ledger
// and the SDK client are mocked (the old route called the model; the new
// one must not).

import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = {
  id: string;
  examId: string;
  topicId: string;
  type: string;
  difficulty: string;
  body: string;
  options: unknown;
  answerKey: string;
  solution: string;
  validated: boolean;
  validatedBy: string | null;
  validatedAt: Date | null;
  tags: string[];
  pyqYear: number | null;
  language: string;
  metadata: unknown;
};

const db = vi.hoisted(() => ({
  questions: new Map<string, Row>(),
  mocks: [] as { id: string; questionIds: string[]; [k: string]: unknown }[],
  seen: [] as string[],
  nextId: 1,
}));

vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "u1" } })) }));
vi.mock("@/lib/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/analytics")>()),
  recordEvent: vi.fn(async () => undefined),
}));
vi.mock("@/lib/ai/usage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/usage")>()),
  recordAiUsage: vi.fn(() => 0),
}));
// The old route asked the model for 10 questions; give it 10 well-formed ones.
vi.mock("@/lib/ai/client", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/ai/client")>();
  const questions = Array.from({ length: 10 }, (_, i) => ({
    body: `AI draft question ${i + 1}: what is ${i + 2} percent of 200?`,
    options: { A: "2", B: "4", C: `${(i + 2) * 2}`, D: "8" },
    answerKey: "C",
    solution: `${i + 2} percent of 200 is ${(i + 2) * 2}, because 200 × ${i + 2} / 100 = ${(i + 2) * 2}.`,
    difficulty: "MEDIUM",
  }));
  const create = vi.fn(async () => ({
    content: [{ type: "tool_use", id: "tu1", name: "publish_questions", input: { questions } }],
    usage: { input_tokens: 10, output_tokens: 10 },
  }));
  return { ...real, anthropic: { messages: { create } } };
});

vi.mock("@/lib/db/prisma", () => {
  /** The answer check's record, as the SQL rule of src/lib/exam-answer-check.ts reads it. */
  const checked = (q: Row): boolean =>
    (q.validatedBy ?? "").startsWith("factory:") &&
    !!q.metadata &&
    typeof q.metadata === "object" &&
    Object.prototype.hasOwnProperty.call(q.metadata, "factoryVerify");
  const matches = (q: Row, where: Record<string, any> | undefined): boolean => {
    if (!where) return true;
    if (where.examId && q.examId !== where.examId) return false;
    if (where.validated === true && q.validated !== true) return false;
    if (where.validated === false && q.validated !== false) return false;
    const notHas = where.NOT?.tags?.has;
    if (notHas && q.tags.includes(notHas)) return false;
    const idIn = where.id?.in;
    if (Array.isArray(idIn) && !idIn.includes(q.id)) return false;
    return true;
  };
  const prisma: Record<string, any> = {
    exam: {
      findUnique: vi.fn(async () => ({ id: "e1", code: "SSC_CGL", name: "SSC Combined Graduate Level", shortName: "SSC CGL", category: "SSC" })),
    },
    topic: {
      findFirst: vi.fn(async () => ({ id: "t-pct", code: "quant.percentage", name: "Percentage", subjectId: "s-quant", parentId: null })),
      findMany: vi.fn(async () => [
        { id: "t-pct", code: "quant.percentage", name: "Percentage", subjectId: "s-quant", parentId: null },
        { id: "t-ratio", code: "quant.ratio", name: "Ratio", subjectId: "s-quant", parentId: null },
      ]),
    },
    attempt: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => ({
        id: "a1",
        userId: "u1",
        topicScores: { "t-pct": { topicCode: "quant.percentage", topicName: "Percentage", correct: 1, total: 5, score: 0.2 } },
        answers: [],
        mock: { examId: "e1", questionIds: ["q01", "q02"] },
      })),
    },
    question: {
      findMany: vi.fn(async (args?: { where?: Record<string, any> }) => [...db.questions.values()].filter((q) => matches(q, args?.where))),
      create: vi.fn(async ({ data }: { data: Partial<Row> }) => {
        const id = `ai-${db.nextId++}`;
        db.questions.set(id, {
          id,
          examId: String(data.examId),
          topicId: String(data.topicId),
          type: String(data.type ?? "MCQ"),
          difficulty: String(data.difficulty ?? "MEDIUM"),
          body: String(data.body ?? ""),
          options: data.options ?? [],
          answerKey: String(data.answerKey ?? "A"),
          solution: String(data.solution ?? ""),
          validated: data.validated === true,
          validatedBy: null,
          validatedAt: null,
          tags: [],
          pyqYear: null,
          language: "EN",
          metadata: null,
        });
        return { id };
      }),
    },
    mock: {
      count: vi.fn(async () => 0),
      findFirst: vi.fn(async () => null),
      create: vi.fn(async ({ data }: { data: { questionIds: string[]; [k: string]: unknown } }) => {
        const m = { id: `m-${db.mocks.length + 1}`, ...data };
        db.mocks.push(m);
        return m;
      }),
    },
    $queryRaw: vi.fn(async (strings: unknown, ...values: unknown[]) => {
      const sql = Array.isArray(strings) ? strings.join("?") : "";
      if (sql.includes("pg_advisory_xact_lock")) return [{ ok: 1 }];
      if (sql.includes('"answerChecked"')) {
        // The fixed route's pool read: the exam's servable rows in the
        // paper's language, each with the answer check's record.
        const lang = values.find((v) => typeof v === "string" && /^[A-Z]{2}$/.test(v)) ?? "EN";
        return [...db.questions.values()]
          .filter((q) => values.includes(q.examId) && q.validated && !q.tags.includes("rejected") && q.language === lang)
          .map((q) => ({ ...q, answerChecked: checked(q) }));
      }
      return db.seen.map((qid) => ({ qid }));
    }),
    $executeRaw: vi.fn(async () => 1),
  };
  prisma.$transaction = vi.fn(async (ops: unknown) => (Array.isArray(ops) ? Promise.all(ops) : (ops as (p: unknown) => unknown)(prisma)));
  return { prisma };
});

import { POST } from "@/app/api/mocks/fresh/route";
import { canServePaper, servedPaperIds } from "@/lib/served-paper";

const BODIES = [
  "A shopkeeper marks an article 40% above cost and gives a discount of 25%. What is his profit percent?",
  "The population of a town rises by 10% in the first year and falls by 10% in the second. What is the net change?",
  "If the price of sugar rises by 25%, by what percent must a family cut its use to keep the spending the same?",
  "A student scores 45% and fails by 30 marks; another scores 60% and gets 15 marks more than the pass mark. Find the maximum marks.",
  "What percent of a day is 36 minutes?",
  "Two numbers are respectively 20% and 50% more than a third number. What percent is the first of the second?",
  "In an election a candidate who got 35% of the votes lost by 450 votes. How many votes were cast?",
  "The salary of a worker is first increased by 20% and then decreased by 20%. What is the net change in his salary?",
  "A's income is 25% more than B's. By what percent is B's income less than A's?",
  "If 30% of a number is 12 less than 50% of the same number, what is the number?",
  "A mixture of 40 litres has milk and water in the ratio 3:1. How much water must be added to make the ratio 2:1?",
  "The ratio of the ages of A and B is 4:5 and the sum of their ages is 54 years. What is A's age?",
  "Divide 1,260 rupees among A, B and C in the ratio 2:3:4. What does C get?",
  "If a:b = 2:3 and b:c = 4:5, what is a:c?",
  "The ratio of boys to girls in a class is 7:5. If there are 84 students, how many are girls?",
];

function seedPool() {
  db.questions.clear();
  db.mocks.length = 0;
  db.nextId = 1;
  BODIES.forEach((body, i) => {
    const id = `q${String(i + 1).padStart(2, "0")}`;
    db.questions.set(id, {
      id,
      examId: "e1",
      topicId: i < 10 ? "t-pct" : "t-ratio",
      type: "MCQ",
      difficulty: ["EASY", "MEDIUM", "HARD"][i % 3],
      body,
      options: [
        { key: "A", text: "one" },
        { key: "B", text: "two" },
        { key: "C", text: "three" },
        { key: "D", text: "four" },
      ],
      answerKey: "ABCD"[i % 4],
      solution: "Worked solution with the steps written out in full for the student to follow.",
      validated: true,
      validatedBy: "factory:verify",
      validatedAt: new Date("2026-09-20T00:00:00Z"),
      tags: [],
      pyqYear: null,
      language: "EN",
      metadata: { factoryVerify: { decision: "ACCEPT", agreement: 1, confidence: 0.95 } },
    });
  });
  // The attempt the student just finished held the first two questions.
  db.seen = ["q01", "q02"];
}

function press(body: Record<string, unknown>) {
  return new Request("https://shishya.in/api/mocks/fresh", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  seedPool();
});

describe("Generate 10 fresh questions → a set the student can play", () => {
  it("every question of the new set is served by the mock's own rule, and the paper can start", async () => {
    const res = await POST(press({ examCode: "SSC_CGL", topicCode: "quant.percentage", count: 10, attemptId: "a1" }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { mock?: { id: string } };
    const mock = db.mocks.find((m) => m.id === data.mock?.id);
    expect(mock, "the route made a mock").toBeTruthy();
    const served = servedPaperIds(mock!, db.questions);
    // On the old route: the 10 AI drafts are validated:false → served [] → "being rebuilt".
    expect(served).toHaveLength(10);
    expect(served).toEqual(mock!.questionIds);
    expect(canServePaper(served)).toBe(true);
  });
});

// The pickers batch 2a left on the old rules (25 Sep 2026): the tutor's
// warmup (createAdaptiveQuiz), the coach drill (/api/coach/today/drill), the
// tutor's find_questions_on_topic tool and the exam-page "buildable" gate.
//   1. Seen = ANSWERED (getSeenHistory): never-shown questions first, then
//      shown-but-unanswered (least-recently-shown), then answered (oldest
//      first). The old opened-means-seen map (getSeenQuestions) is never read.
//   2. Withdrawn questions (tag "rejected") are left out of every pool and
//      count they select from; validated-only and the sizes stay as they were.
// Everything runs against a mocked Prisma, auth, seen history and generator
// (no DB, no network, no model).
// Run: npx vitest run tests/unit/pickers-seen-answered.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";

type Diff = "EASY" | "MEDIUM" | "HARD";
interface Row {
  id: string;
  topicId: string;
  difficulty: Diff;
}
interface RawCall {
  sql: string;
  values: unknown[];
}

const state = vi.hoisted(() => ({
  pool: [] as { id: string; topicId: string; difficulty: "EASY" | "MEDIUM" | "HARD" }[],
  history: null as null | { answered: Map<string, number>; shown: Map<string, number> },
  counts: { t: 0, s: 0, e: 0 },
  findManyArgs: [] as any[],
  raw: [] as { sql: string; values: unknown[] }[],
  generatorInputs: [] as any[],
  created: [] as any[],
  oldSeenCalls: 0,
}));

vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "u1" } })) }));
vi.mock("@/lib/answered-questions", () => ({ getSeenHistory: vi.fn(async () => state.history) }));
vi.mock("@/lib/seen-questions", () => ({
  getSeenQuestions: vi.fn(async () => {
    state.oldSeenCalls++;
    return new Map();
  }),
  seenCutoff: () => new Date(0),
}));
vi.mock("@/lib/ai/client", () => ({
  callClaude: vi.fn(),
  cachedSystem: (...b: string[]) => b,
  parseJson: (s: string) => JSON.parse(s),
  extractText: () => "",
  TOKEN_LIMITS: {},
  MODEL: "test",
}));
vi.mock("@/lib/ai/generator", () => ({
  // TOPIC is rule-based in the real generator; here it takes the candidates
  // in the order it was handed them, so the test sees that order.
  generateMock: vi.fn(async (input: any) => {
    state.generatorInputs.push(input);
    const n = input.request.questionCount;
    return {
      title: "t",
      rationale: "r",
      questionIds: input.availableQuestions.slice(0, n).map((q: { id: string }) => q.id),
      durationMin: n,
      topicMix: {},
      difficultyMix: { EASY: 0, MEDIUM: n, HARD: 0 },
    };
  }),
}));
vi.mock("@/lib/db/student-state", () => ({ getStudentState: vi.fn(async () => ({ weaknesses: [] })) }));
vi.mock("@/lib/db/syllabus", () => ({
  getSyllabusContext: vi.fn(async () => ({
    subjects: [{ code: "QA", name: "Quant", weight: 1, topics: [{ code: "T1", name: "Arithmetic" }] }],
  })),
}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    exam: {
      findUnique: vi.fn(async () => ({
        id: "e1",
        code: "SBI_CLERK",
        shortName: "SBI Clerk",
        totalQuestions: 100,
        durationMin: 60,
      })),
    },
    enrollment: { upsert: vi.fn(async () => ({})) },
    topic: {
      findFirst: vi.fn(async () => ({
        id: "t1",
        code: "T1",
        name: "Arithmetic",
        subject: { id: "s1", code: "QA", name: "Quant" },
        children: [],
      })),
    },
    question: {
      findMany: vi.fn(async (args: unknown) => {
        state.findManyArgs.push(args);
        return state.pool.map((r) => ({
          ...r,
          body: `body ${r.id}`,
          options: [],
          answerKey: "A",
          solution: null,
          topic: { code: "T1", name: "Arithmetic" },
        }));
      }),
    },
    mock: {
      create: vi.fn(async ({ data }: { data: any }) => {
        state.created.push(data);
        return { id: "m1", title: data.title };
      }),
    },
    // Tagged-template calls: (strings, ...values). Nested Prisma.sql
    // fragments arrive as values.
    $queryRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = strings.join("?");
      state.raw.push({ sql, values });
      if (sql.includes("'coach-drill'")) return [];
      if (sql.includes("AS t,")) return [state.counts];
      if (sql.includes('FROM "Exam" e')) return [];
      return state.pool.map((r) => ({ id: r.id }));
    }),
  },
}));

import { createAdaptiveQuiz } from "@/lib/ai/adaptive-quiz";
import { GET as drillGET } from "@/app/api/coach/today/drill/route";
import { executeTool } from "@/lib/ai/tools";
import { loadExamPageGates } from "@/lib/exam-page-gates";

function rows(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({ id: `q${i + 1}`, topicId: "t1", difficulty: "MEDIUM" as Diff }));
}
function ids(from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, i) => `q${from + i}`);
}
/** answered q1..q4 (OLDER), shown-only q5..q9 (newer); the rest never shown.
 *  Under the old opened-means-seen map all nine were "seen" and the oldest
 *  (the answered ones) would have been re-served first. */
function heavyHistory() {
  return {
    answered: new Map([["q1", 4], ["q2", 1], ["q3", 3], ["q4", 2]]),
    shown: new Map([["q5", 14], ["q6", 10], ["q7", 12], ["q8", 11], ["q9", 13]]),
  };
}
function sqlOf(match: string): RawCall | undefined {
  return state.raw.find((r) => r.sql.includes(match));
}
function excludesWithdrawn(c: RawCall | undefined): boolean {
  return !!c && /NOT \(\?\s*= ANY\(q\.tags\)\)/.test(c.sql) && c.values.includes("rejected");
}
async function drill() {
  return drillGET(new Request("http://x/api/coach/today/drill?exam=SBI_CLERK&topic=T1"));
}

beforeEach(() => {
  state.pool = [];
  state.history = { answered: new Map(), shown: new Map() };
  state.counts = { t: 0, s: 0, e: 0 };
  state.findManyArgs = [];
  state.raw = [];
  state.generatorInputs = [];
  state.created = [];
  state.oldSeenCalls = 0;
});

// ── 1. Tutor warmup (createAdaptiveQuiz) ───────────────────────────────

describe("createAdaptiveQuiz warmup — seen = answered, no withdrawn", () => {
  it("the topic pool is validated-only and excludes withdrawn questions", async () => {
    state.pool = rows(12);
    await createAdaptiveQuiz("u1", "SBI_CLERK", "T1");
    const where = state.findManyArgs[0].where;
    expect(where).toMatchObject({ examId: "e1", validated: true, NOT: { tags: { has: "rejected" } } });
    expect(where.topicId).toEqual({ in: ["t1"] });
  });

  it("short of never-shown: never-shown, then shown-but-unanswered (oldest shown first), then the oldest answered", async () => {
    state.pool = rows(12);
    state.history = heavyHistory();
    const quiz = await createAdaptiveQuiz("u1", "SBI_CLERK", "T1");
    const handed = state.generatorInputs[0].availableQuestions.map((q: Row) => q.id);
    // 3 never-shown, 5 shown-only by shownAt, then the 2 least-recently answered.
    expect(handed.slice(0, 3).sort()).toEqual(ids(10, 12));
    expect(handed.slice(3, 8)).toEqual(["q6", "q8", "q7", "q9", "q5"]);
    expect(handed.slice(8)).toEqual(["q2", "q4"]);
    expect(state.generatorInputs[0].request.questionCount).toBe(10);
    expect(quiz.warmupQuestionCount).toBe(10);
    expect(state.created[0].questionIds).toHaveLength(10);
    expect(state.oldSeenCalls).toBe(0);
  });

  it("enough never-shown questions: nothing shown or answered is handed to the generator", async () => {
    state.pool = rows(20);
    state.history = heavyHistory();
    await createAdaptiveQuiz("u1", "SBI_CLERK", "T1");
    const handed: string[] = state.generatorInputs[0].availableQuestions.map((q: Row) => q.id);
    expect(handed.sort()).toEqual(ids(10, 20).sort());
    for (const id of ids(1, 9)) expect(handed).not.toContain(id);
  });

  it("a failed history read (null) still builds the warmup, without exclusion", async () => {
    state.pool = rows(12);
    state.history = null;
    const quiz = await createAdaptiveQuiz("u1", "SBI_CLERK", "T1");
    expect(state.generatorInputs[0].availableQuestions).toHaveLength(12);
    expect(quiz.warmupQuestionCount).toBe(10);
    expect(state.oldSeenCalls).toBe(0);
  });

  it("a thin topic keeps its real size (fewer than 10)", async () => {
    state.pool = rows(4);
    const quiz = await createAdaptiveQuiz("u1", "SBI_CLERK", "T1");
    expect(quiz.warmupQuestionCount).toBe(4);
    expect(state.created[0].questionIds).toHaveLength(4);
  });
});

// ── 2. Coach drill ─────────────────────────────────────────────────────

describe("/api/coach/today/drill — seen = answered, no withdrawn", () => {
  it("counts and pool both exclude withdrawn questions; validated MCQ rule kept", async () => {
    state.pool = rows(12);
    state.counts = { t: 12, s: 30, e: 100 };
    const res = await drill();
    expect(res.status).toBe(303);
    const counts = sqlOf("AS t,");
    const pool = sqlOf('SELECT q.id FROM "Question" q');
    for (const c of [counts, pool]) {
      expect(c).toBeDefined();
      expect(c!.sql).toContain("q.validated = TRUE AND q.type = 'MCQ'");
      expect(excludesWithdrawn(c)).toBe(true);
    }
  });

  it("5 from a 12-question topic: the 3 never-shown + the 2 least-recently-shown, no answered question", async () => {
    state.pool = rows(12);
    state.counts = { t: 12, s: 30, e: 100 };
    state.history = heavyHistory();
    const res = await drill();
    expect(res.headers.get("location")).toBe("http://x/mocks/m1");
    const stored = state.created[0];
    expect([...stored.questionIds].sort()).toEqual(["q10", "q11", "q12", "q6", "q8"]);
    for (const id of ids(1, 4)) expect(stored.questionIds).not.toContain(id);
    expect(stored.title).toBe("Coach drill — Arithmetic (5 Qs)");
    expect(stored.config).toMatchObject({ questionCount: 5, coachScope: "topic" });
    expect(state.oldSeenCalls).toBe(0);
  });

  it("everything answered: the oldest answered come back, never twice", async () => {
    state.pool = rows(4);
    state.counts = { t: 4, s: 4, e: 4 };
    state.history = { answered: new Map([["q1", 4], ["q2", 1], ["q3", 3], ["q4", 2]]), shown: new Map() };
    await drill();
    const stored = state.created[0];
    expect([...stored.questionIds].sort()).toEqual(["q1", "q2", "q3", "q4"]);
    expect(stored.title).toBe("Coach drill — Arithmetic (4 Qs)");
  });

  it("a failed history read (null) still builds the drill", async () => {
    state.pool = rows(12);
    state.counts = { t: 12, s: 30, e: 100 };
    state.history = null;
    await drill();
    expect(state.created[0].questionIds).toHaveLength(5);
  });
});

// ── 3. Tutor tool find_questions_on_topic ──────────────────────────────

describe("find_questions_on_topic — seen = answered, no withdrawn", () => {
  const ctx = { userId: "u1", examCode: "SBI_CLERK" } as any;

  it("validated-only pool without withdrawn questions; difficulty filter kept", async () => {
    state.pool = rows(6);
    await executeTool(ctx, "find_questions_on_topic", { topic_code: "T1", difficulty: "HARD", limit: 3 });
    expect(state.findManyArgs[0].where).toMatchObject({
      examId: "e1",
      validated: true,
      NOT: { tags: { has: "rejected" } },
      difficulty: "HARD",
    });
  });

  it("never-shown first, then shown-only, then the oldest answered", async () => {
    state.pool = rows(4);
    state.history = {
      answered: new Map([["q1", 1], ["q2", 5]]),
      shown: new Map([["q3", 9]]),
    };
    const out = await executeTool(ctx, "find_questions_on_topic", { topic_code: "T1", limit: 3 });
    expect(out.ok).toBe(true);
    const got = (out as { ok: true; data: { questions: { id: string }[] } }).data.questions.map((q) => q.id);
    expect(got).toEqual(["q4", "q3", "q1"]);
    expect(state.oldSeenCalls).toBe(0);
  });
});

// ── 4. Exam-page "buildable" gate ──────────────────────────────────────

describe("exam-page-gates buildMock — withdrawn questions don't count", () => {
  it("the >= 3 validated-per-topic EXISTS leaves withdrawn rows out", async () => {
    await loadExamPageGates();
    const gate = sqlOf('FROM "Exam" e');
    expect(gate).toBeDefined();
    const buildable = gate!.sql.slice(gate!.sql.indexOf('FROM "Question" q'));
    expect(buildable).toMatch(/q\.validated = TRUE\s+AND NOT \(\?\s*= ANY\(q\.tags\)\)\s+GROUP BY q\."topicId" HAVING COUNT\(\*\) >= \?/);
    expect(gate!.values).toContain("rejected");
    expect(gate!.values).toContain(3);
  });
});

// A question's cached translations go in the same transaction as the write
// that changes its text (14 Oct 2026, src/lib/question-translation-cache.ts).
// What this pins, per writer, against an in-memory Prisma that records every
// call with the client it was made on:
//   • the helper: one deleteMany on the question's id; changedTranslatedFields
//     counts only a real change (the admin editor sends every field);
//   • the student-report sweep (adjudicateQuestion, sweepReportedQuestions):
//     a key fix = key + note + clear on ONE transaction client; a confirmed
//     key or an invalidation clears nothing; a failed clear fails the fix
//     (the transaction rolls back) and leaves the reports open;
//   • the admin editor PATCH: a changed stem, option, key or solution clears
//     on the transaction client; an unchanged save, a plain Validate, or a
//     difficulty / topic / tags edit does not;
//   • scripts/fix-reported-questions.ts writeKeyFix: key + clear in one
//     transaction (importing the script runs nothing).
// scripts/verify-question-bank.ts runs main() on import; its write is pinned
// by tests/unit/question-translation-cache-writers.test.ts.
// No DB, no network. Run: npx vitest run tests/unit/question-translation-cache.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { changedTranslatedFields, clearQuestionTranslations, TRANSLATED_FIELDS } from "@/lib/question-translation-cache";

const h = vi.hoisted(() => {
  const state = {
    /** Every write, in order: "<client>.<model>.<op> <detail>". */
    log: [] as string[],
    questions: new Map<string, any>(),
    reports: [] as any[],
    /** Cache rows per question (only the count matters here). */
    cache: new Map<string, number>(),
    failClear: false,
    verdict: { correctKey: "C", confidence: "HIGH", reasoning: "Worked: C." } as any,
  };
  const client = (name: string) => ({
    question: {
      findUnique: async ({ where }: any) => {
        const q = state.questions.get(where.id);
        return q ? { ...q, topic: { code: q.topicCode } } : null;
      },
      update: async ({ where, data }: any) => {
        state.log.push(`${name}.question.update ${where.id} ${Object.keys(data).sort().join(",")}`);
        const q = state.questions.get(where.id);
        Object.assign(q, data);
        return q;
      },
    },
    questionTranslation: {
      deleteMany: async ({ where }: any) => {
        state.log.push(`${name}.questionTranslation.deleteMany ${where.questionId}`);
        if (state.failClear) throw new Error("clear failed");
        const n = state.cache.get(where.questionId) ?? 0;
        state.cache.set(where.questionId, 0);
        return { count: n };
      },
    },
  });
  const tx = client("tx");
  const prisma: any = {
    ...client("prisma"),
    questionReport: {
      findMany: async () => state.reports.filter((r) => !r.resolved).map((r) => ({ ...r, question: { ...state.questions.get(r.questionId) } })), // a snapshot, as a DB read is,
      updateMany: async ({ where }: any) => {
        state.log.push(`prisma.questionReport.updateMany ${where.questionId}`);
        let n = 0;
        for (const r of state.reports) if (r.questionId === where.questionId && !r.resolved) (r.resolved = true), n++;
        return { count: n };
      },
    },
    topic: { findFirst: async () => null },
    $queryRaw: async () => [],
    $transaction: async (fn: (t: any) => Promise<unknown>) => {
      state.log.push("BEGIN");
      // A real transaction rolls the key write back when the clear fails;
      // here the snapshot does it, so the test sees the row as Postgres would.
      const snap = new Map([...state.questions].map(([k, v]) => [k, { ...v }]));
      try {
        const r = await fn(tx);
        state.log.push("COMMIT");
        return r;
      } catch (e) {
        state.questions = snap;
        state.log.push("ROLLBACK");
        throw e;
      }
    },
  };
  return { state, prisma };
});

vi.mock("@/lib/db/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/admin", () => ({ requireAdmin: vi.fn(async () => ({ userId: "admin1", email: "admin@shishya.in" })) }));
vi.mock("@/lib/ai/usage", () => ({ recordAiUsage: vi.fn() }));
vi.mock("@/lib/db/notifications", () => ({ createNotification: vi.fn(async () => undefined) }));
vi.mock("@/lib/ai/client", () => ({
  MODEL: "test-model",
  anthropic: {
    messages: {
      create: vi.fn(async () => ({ content: [{ type: "text", text: JSON.stringify(h.state.verdict) }], usage: { input_tokens: 1, output_tokens: 1 } })),
    },
  },
}));

import { anthropic } from "@/lib/ai/client";
import { adjudicateQuestion, keyFixSolution, sweepReportedQuestions } from "@/lib/question-sweep";
import { PATCH as patchQuestion } from "@/app/api/admin/questions/[id]/route";
import { writeKeyFix } from "../../scripts/fix-reported-questions";

const OPTIONS = [
  { key: "A", text: "One" },
  { key: "B", text: "Two" },
  { key: "C", text: "Three" },
  { key: "D", text: "Four" },
];
const question = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  examId: "exam1",
  topicCode: "reason.alphabet_test",
  source: "AI_VALIDATED",
  body: `Stem ${id}`,
  options: OPTIONS.map((o) => ({ ...o })),
  answerKey: "B",
  solution: `Working for ${id}: B.`,
  difficulty: "MEDIUM",
  validated: true,
  validatedBy: "factory:verify-v1",
  validatedAt: null,
  tags: [],
  metadata: null,
  ...over,
});

beforeEach(() => {
  h.state.log = [];
  h.state.questions = new Map([
    ["q1", question("q1")],
    ["q2", question("q2")],
  ]);
  h.state.cache = new Map([
    ["q1", 3],
    ["q2", 2],
  ]);
  h.state.reports = [];
  h.state.failClear = false;
  h.state.verdict = { correctKey: "C", confidence: "HIGH", reasoning: "Worked: C." };
  (anthropic.messages.create as any).mockImplementation(async () => ({ content: [{ type: "text", text: JSON.stringify(h.state.verdict) }], usage: {} }));
});

describe("clearQuestionTranslations / changedTranslatedFields (the helper)", () => {
  it("deletes the question's cache rows on the client it is given and returns the count", async () => {
    const deleteMany = vi.fn(async () => ({ count: 4 }));
    await expect(clearQuestionTranslations({ questionTranslation: { deleteMany } }, "q9")).resolves.toBe(4);
    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(deleteMany).toHaveBeenCalledWith({ where: { questionId: "q9" } });
  });

  it("refuses an empty id (a deleteMany with no id would clear every question's cache)", async () => {
    const deleteMany = vi.fn(async () => ({ count: 0 }));
    await expect(clearQuestionTranslations({ questionTranslation: { deleteMany } }, "")).rejects.toThrow(/question id is required/);
    await expect(clearQuestionTranslations({ questionTranslation: { deleteMany } }, undefined as unknown as string)).rejects.toThrow(/question id is required/);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("covers the stem, the options, the key and the solution", () => {
    expect([...TRANSLATED_FIELDS].sort()).toEqual(["answerKey", "body", "options", "solution"]);
  });

  it("counts only a real change; absent / undefined fields are unchanged; options compare by content", () => {
    const before = { body: "Stem", options: OPTIONS, answerKey: "B", solution: "Working" };
    expect(changedTranslatedFields(before, { ...before })).toEqual([]);
    expect(changedTranslatedFields(before, {})).toEqual([]);
    expect(changedTranslatedFields(before, { answerKey: undefined, solution: undefined })).toEqual([]);
    expect(changedTranslatedFields(before, { answerKey: "C" })).toEqual(["answerKey"]);
    expect(changedTranslatedFields(before, { body: "Stem.", solution: "Working!" })).toEqual(["body", "solution"]);
    // Same options, keys of each object in another order: unchanged.
    expect(changedTranslatedFields(before, { options: OPTIONS.map((o) => ({ text: o.text, key: o.key })) })).toEqual([]);
    expect(changedTranslatedFields(before, { options: OPTIONS.map((o) => (o.key === "D" ? { ...o, text: "More than four" } : o)) })).toEqual(["options"]);
    expect(changedTranslatedFields(before, { options: OPTIONS.slice(0, 3) })).toEqual(["options"]);
    // A stored null solution and an empty one are the same empty text.
    expect(changedTranslatedFields({ solution: null }, { solution: "" })).toEqual([]);
    expect(changedTranslatedFields({ solution: null }, { solution: "x" })).toEqual(["solution"]);
  });
});

describe("student-report sweep (src/lib/question-sweep.ts)", () => {
  it("adjudicateQuestion: a key fix writes key + note and clears the cache on one transaction client", async () => {
    const r = await adjudicateQuestion("q1", "claude:instant-report");
    expect(r).toMatchObject({ questionId: "q1", action: "key-fixed", detail: "B → C; 3 cached translations cleared" });
    expect(h.state.log.slice(0, 4)).toEqual(["BEGIN", "tx.question.update q1 answerKey,solution", "tx.questionTranslation.deleteMany q1", "COMMIT"]);
    expect(h.state.log.filter((l) => l.startsWith("prisma.question.update"))).toEqual([]);
    const q = h.state.questions.get("q1");
    expect(q.answerKey).toBe("C");
    expect(q.solution).toMatch(/^Working for q1: B\.\n\n\[Correction \d{4}-\d{2}-\d{2}: answer key corrected to C after student report \+ independent re-verification\. Worked: C\.\]$/);
    expect(h.state.cache.get("q1")).toBe(0);
    expect(h.state.cache.get("q2")).toBe(2);
  });

  it("adjudicateQuestion: a confirmed key or an invalidation clears nothing", async () => {
    h.state.verdict = { correctKey: "B", confidence: "HIGH", reasoning: "B." };
    expect((await adjudicateQuestion("q1", "x")).action).toBe("confirmed");
    h.state.verdict = { correctKey: null, confidence: "LOW", reasoning: "none fits" };
    expect((await adjudicateQuestion("q2", "x")).action).toBe("invalidated");
    expect(h.state.log.some((l) => l.includes("questionTranslation"))).toBe(false);
    expect(h.state.log).toContain("prisma.question.update q2 validated");
    expect(h.state.cache.get("q1")).toBe(3);
    expect(h.state.cache.get("q2")).toBe(2);
  });

  it("adjudicateQuestion: when the clear fails, the key write rolls back and the reports stay open", async () => {
    h.state.reports = [{ id: "r1", questionId: "q1", resolved: false }];
    h.state.failClear = true;
    await expect(adjudicateQuestion("q1", "x")).rejects.toThrow(/clear failed/);
    expect(h.state.log).toEqual(["BEGIN", "tx.question.update q1 answerKey,solution", "tx.questionTranslation.deleteMany q1", "ROLLBACK"]);
    expect(h.state.questions.get("q1").answerKey).toBe("B");
    expect(h.state.reports[0].resolved).toBe(false);
  });

  it("sweepReportedQuestions: clears only the question whose key it fixed, in that fix's transaction", async () => {
    h.state.reports = [
      { id: "r1", questionId: "q1", resolved: false, createdAt: new Date("2026-10-01") },
      { id: "r2", questionId: "q2", resolved: false, createdAt: new Date("2026-10-02") },
    ];
    const verdicts = [
      { correctKey: "D", confidence: "HIGH", reasoning: "D." },
      { correctKey: "B", confidence: "HIGH", reasoning: "B." },
    ];
    (anthropic.messages.create as any).mockImplementation(async () => ({ content: [{ type: "text", text: JSON.stringify(verdicts.shift()) }], usage: {} }));
    const res = await sweepReportedQuestions({ resolvedBy: "cron:key-sweep" });
    expect(res.map((r) => [r.questionId, r.action, r.detail])).toEqual([
      ["q1", "key-fixed", "B → D; 3 cached translations cleared"],
      ["q2", "confirmed", "key B verified"],
    ]);
    expect(h.state.log).toEqual([
      "BEGIN",
      "tx.question.update q1 answerKey,solution",
      "tx.questionTranslation.deleteMany q1",
      "COMMIT",
      "prisma.questionReport.updateMany q1",
      "prisma.questionReport.updateMany q2",
    ]);
    expect(h.state.cache.get("q2")).toBe(2);
  });

  it("keyFixSolution appends the dated correction note (UTC day) to the old solution", () => {
    expect(keyFixSolution("Old.", "A", "Because A.", new Date("2026-10-14T20:00:00Z"))).toBe(
      "Old.\n\n[Correction 2026-10-14: answer key corrected to A after student report + independent re-verification. Because A.]",
    );
    expect(keyFixSolution(null, "A", "x", new Date("2026-10-14T00:00:00Z"))).toMatch(/^\n\n\[Correction 2026-10-14:/);
  });
});

describe("admin editor PATCH /api/admin/questions/:id", () => {
  async function patch(id: string, body: Record<string, unknown>) {
    const res = await patchQuestion(
      new Request(`http://x/api/admin/questions/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
      { params: Promise.resolve({ id }) },
    );
    return { status: res.status, json: (await res.json()) as any };
  }
  /** What QuestionEditor sends on every save: every field, as loaded. */
  const editorSave = (id: string, over: Record<string, unknown> = {}) => {
    const q = h.state.questions.get(id);
    return { body: q.body, options: q.options, answerKey: q.answerKey, solution: q.solution, difficulty: q.difficulty, topicCode: q.topicCode, tags: q.tags, ...over };
  };

  it("an unchanged Save edits, a plain Validate and a difficulty / tags edit keep the cache", async () => {
    for (const body of [editorSave("q1"), editorSave("q1", { validated: true }), editorSave("q1", { difficulty: "HARD", tags: ["pyq"] })]) {
      const res = await patch("q1", body);
      expect(res.status).toBe(200);
      expect(res.json.translationsCleared).toBe(0);
    }
    expect(h.state.log.some((l) => l.includes("questionTranslation"))).toBe(false);
    expect(h.state.cache.get("q1")).toBe(3);
  });

  it.each([
    ["answerKey", { answerKey: "C" }],
    ["solution", { solution: "Corrected working: C." }],
    ["body", { body: "Stem q1, reworded." }],
    ["options", { options: OPTIONS.map((o) => (o.key === "D" ? { ...o, text: "More than three" } : o)) }],
  ])("a changed %s clears the cache on the transaction client of the same write", async (_f, over) => {
    const res = await patch("q1", editorSave("q1", over));
    expect(res.status).toBe(200);
    expect(res.json.translationsCleared).toBe(3);
    expect(h.state.log).toEqual(["BEGIN", expect.stringMatching(/^tx\.question\.update q1 /), "tx.questionTranslation.deleteMany q1", "COMMIT"]);
    expect(h.state.cache.get("q1")).toBe(0);
    expect(h.state.cache.get("q2")).toBe(2);
  });

  it("a changed key with Validate clears too, and a failed clear fails the save with nothing written", async () => {
    expect((await patch("q2", editorSave("q2", { answerKey: "A", validated: true }))).json.translationsCleared).toBe(2);
    h.state.log = [];
    h.state.failClear = true;
    const res = await patch("q1", editorSave("q1", { answerKey: "D" }));
    expect(res.status).toBe(500);
    expect(h.state.log[h.state.log.length - 1]).toBe("ROLLBACK");
    expect(h.state.questions.get("q1").answerKey).toBe("B");
  });
});

describe("scripts/fix-reported-questions.ts writeKeyFix", () => {
  it("writes the key and clears the cache in one transaction", async () => {
    await expect(writeKeyFix(h.prisma, "q1", "A", "Old.\n\n[Correction …]")).resolves.toBe(3);
    expect(h.state.log).toEqual(["BEGIN", "tx.question.update q1 answerKey,solution", "tx.questionTranslation.deleteMany q1", "COMMIT"]);
    expect(h.state.questions.get("q1")).toMatchObject({ answerKey: "A", solution: "Old.\n\n[Correction …]" });
  });

  it("a failed clear rolls the key back", async () => {
    h.state.failClear = true;
    await expect(writeKeyFix(h.prisma, "q1", "A", "x")).rejects.toThrow(/clear failed/);
    expect(h.state.questions.get("q1").answerKey).toBe("B");
  });
});

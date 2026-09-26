// Keyed exam lookups vs a school container (26 Sep 2026).
//
// The shared loaders (getExamShared, getSyllabusContext / buildSyllabusContext,
// getAnonQuiz) and the one enrolment door are run against a stubbed Prisma
// client holding one real exam (SSC_CGL), one ACTIVE school container
// (NCERT_C09) and one inactive one (CISCE_C10). The stub honours exactly the
// filters Prisma 5 applies for an extended where-unique — `code` / `id` plus
// `category: { not }` — so the tests prove that the null / "Exam not found"
// comes from realExamKey(), not from the stub: the same stub returns the
// school row for a bare `{ code }`.
// No DB, no network. Run: npx vitest run tests/unit/exam-scope-keyed.test.ts

import { describe, it, expect, vi } from "vitest";

type Row = Record<string, unknown> & { id: string; code: string; category: string; active: boolean };

const EXAMS: Row[] = [
  { id: "e-ssc", code: "SSC_CGL", category: "GOVT_JOBS", active: true, name: "SSC Combined Graduate Level", shortName: "SSC CGL", description: "", totalQuestions: 100, scoredQuestions: null, totalMarks: 200, marksPerQ: 2, negativeMark: 0.5, durationMin: 60, languages: ["EN", "HI"], state: null, refreshAttemptedAt: null },
  { id: "e-ncert9", code: "NCERT_C09", category: "SCHOOL_BOARD", active: true, name: "NCERT Class 9", shortName: "NCERT C9", description: "", totalQuestions: 10, scoredQuestions: null, totalMarks: 10, marksPerQ: 1, negativeMark: 0, durationMin: 20, languages: ["EN"], state: null, refreshAttemptedAt: null },
  { id: "e-cisce10", code: "CISCE_C10", category: "SCHOOL_BOARD", active: false, name: "CISCE Class 10", shortName: "ICSE C10", description: "", totalQuestions: 10, scoredQuestions: null, totalMarks: 10, marksPerQ: 1, negativeMark: 0, durationMin: 20, languages: ["EN"], state: null, refreshAttemptedAt: null },
];

/** The where shapes findUnique receives here: a unique key, optionally with
 *  `category: { not }` (what realExamKey adds). Anything else is a test bug. */
function matchExam(where: Record<string, any>): Row | null {
  for (const k of Object.keys(where)) if (!["code", "id", "category"].includes(k)) throw new Error(`stub: unexpected where key ${k}`);
  return (
    EXAMS.find((e) => {
      if (where.code !== undefined && e.code !== where.code) return false;
      if (where.id !== undefined && e.id !== where.id) return false;
      if (where.category !== undefined) {
        if (typeof where.category === "string") return e.category === where.category;
        if (where.category.not !== undefined && e.category === where.category.not) return false;
      }
      return true;
    }) ?? null
  );
}

const calls: { model: string; method: string; args: unknown }[] = [];
const upserts: unknown[] = [];

/** Every other model / method answers with an empty result of the right shape. */
function empty(method: string) {
  if (method === "count") return 0;
  if (["findMany", "groupBy"].includes(method)) return [];
  return null;
}

vi.mock("@/lib/db/prisma", () => {
  const modelProxy = (model: string) =>
    new Proxy(
      {},
      {
        get: (_t, method: string) => async (args: any) => {
          calls.push({ model, method, args });
          if (model === "exam" && (method === "findUnique" || method === "findFirst")) {
            const row = matchExam(args.where);
            if (!row) return null;
            return args.include?.subjects ? { ...row, subjects: [] } : { ...row };
          }
          if (model === "enrollment" && method === "upsert") {
            upserts.push(args);
            return { id: "enr-1", ...args.create };
          }
          return empty(method);
        },
      },
    );
  const prisma = new Proxy(
    {},
    {
      get: (_t, prop: string) => {
        if (prop === "$queryRaw" || prop === "$executeRaw") return async () => [];
        if (prop === "$queryRawUnsafe" || prop === "$executeRawUnsafe") return async () => [];
        return modelProxy(prop);
      },
    },
  );
  return { prisma };
});
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import { realExamKey } from "@/lib/db/exam-scope";
import { getExamShared } from "@/lib/db/exam-cache";
import { buildSyllabusContext, getSyllabusContext } from "@/lib/db/syllabus";
import { getAnonQuiz } from "@/lib/anon-quiz";
import { ensureEnrollment } from "@/lib/db/enrollment";

describe("the stub itself", () => {
  it("returns the school row for a bare key and drops it only under realExamKey", () => {
    expect(matchExam({ code: "NCERT_C09" })?.id).toBe("e-ncert9");
    expect(matchExam({ id: "e-cisce10" })?.id).toBe("e-cisce10");
    expect(matchExam(realExamKey({ code: "NCERT_C09" }))).toBeNull();
    expect(matchExam(realExamKey({ id: "e-cisce10" }))).toBeNull();
    expect(matchExam(realExamKey({ code: "SSC_CGL" }))?.id).toBe("e-ssc");
  });
});

describe("getExamShared (/exams/[code] and every subpage on its payload)", () => {
  it("serves the real exam as before", async () => {
    const shared = await getExamShared("SSC_CGL");
    expect(shared?.exam.code).toBe("SSC_CGL");
    expect(shared?.exam.active).toBe(true);
  });

  it("returns null for a school container — active or not — exactly like an unknown code", async () => {
    expect(await getExamShared("NCERT_C09")).toBeNull();
    expect(await getExamShared("CISCE_C10")).toBeNull();
    expect(await getExamShared("NO_SUCH_EXAM")).toBeNull();
  });

  it("asks Prisma with the category filter beside the unique key", async () => {
    calls.length = 0;
    await getExamShared("NCERT_C09");
    const q = calls.find((c) => c.model === "exam" && c.method === "findUnique");
    expect((q?.args as any).where).toEqual({ code: "NCERT_C09", category: { not: "SCHOOL_BOARD" } });
    // Nothing else was read for it: the loader stopped at the null.
    expect(calls.filter((c) => c.model !== "exam")).toEqual([]);
  });
});

describe("getSyllabusContext (tutor, /api/exams/[code]/syllabus, mocks, adaptive quiz)", () => {
  it("builds the real exam's syllabus", async () => {
    const ctx = await buildSyllabusContext("SSC_CGL");
    expect(ctx.examCode).toBe("SSC_CGL");
  });

  it("throws the same 'Exam not found' for a school container as for an unknown code", async () => {
    await expect(buildSyllabusContext("NCERT_C09")).rejects.toThrow("Exam not found: NCERT_C09");
    await expect(buildSyllabusContext("CISCE_C10")).rejects.toThrow("Exam not found: CISCE_C10");
    await expect(buildSyllabusContext("NO_SUCH_EXAM")).rejects.toThrow("Exam not found: NO_SUCH_EXAM");
    // The cached export is the same function (the route maps this message to 404).
    await expect(getSyllabusContext("NCERT_C09")).rejects.toThrow(/Exam not found/);
  });
});

describe("getAnonQuiz (/exams/[code]/quiz, topic quiz, challenge)", () => {
  it("is null for a school container before any question is read", async () => {
    calls.length = 0;
    expect(await getAnonQuiz({ examCode: "NCERT_C09" })).toBeNull();
    expect(calls.filter((c) => c.model === "question")).toEqual([]);
  });
});

describe("ensureEnrollment (the one door)", () => {
  it("upserts exactly what the callers used to write, for a real exam", async () => {
    upserts.length = 0;
    await ensureEnrollment("u1", { id: "e-ssc", category: "GOVT_JOBS" });
    await ensureEnrollment("u1", { id: "e-ssc", category: "GOVT_JOBS" }, { active: true });
    const when = new Date("2026-12-01T00:00:00Z");
    await ensureEnrollment("u1", { id: "e-ssc", category: "GOVT_JOBS" }, { active: true, targetDate: when, goalScore: 70 });
    await ensureEnrollment("u1", { id: "e-ssc", category: "GOVT_JOBS" }, { shiftDate: when });
    expect(upserts).toEqual([
      { where: { userId_examId: { userId: "u1", examId: "e-ssc" } }, update: {}, create: { userId: "u1", examId: "e-ssc" } },
      { where: { userId_examId: { userId: "u1", examId: "e-ssc" } }, update: { active: true }, create: { userId: "u1", examId: "e-ssc", active: true } },
      {
        where: { userId_examId: { userId: "u1", examId: "e-ssc" } },
        update: { active: true, targetDate: when, goalScore: 70 },
        create: { userId: "u1", examId: "e-ssc", active: true, targetDate: when, goalScore: 70 },
      },
      { where: { userId_examId: { userId: "u1", examId: "e-ssc" } }, update: { shiftDate: when }, create: { userId: "u1", examId: "e-ssc", shiftDate: when } },
    ]);
  });

  it("refuses a school container without touching the table", async () => {
    upserts.length = 0;
    await expect(ensureEnrollment("u1", { id: "e-ncert9", category: "SCHOOL_BOARD" })).rejects.toThrow(/school container/);
    await expect(ensureEnrollment("u1", { id: "e-cisce10", category: "school_board" })).rejects.toThrow(/school container/);
    expect(upserts).toEqual([]);
  });
});

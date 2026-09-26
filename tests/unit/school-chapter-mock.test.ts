// "Practise this chapter" and the age band (26 Sep 2026) — the server side
// of student mode (src/lib/school/student-db.ts) against a stubbed Prisma:
//   • findStudentModeContainer: a Class 8-12 container by code, category
//     pinned, never `active`; null for Class 1-7, a real exam or an unknown
//     code;
//   • declareSchoolBand: writes the band into onbStage, adds the container
//     code to onbPrepCodes (keeping what was there), marks the wizard done,
//     enrols through the door WITH the school flag;
//   • buildSchoolChapterMock: 403 before the band, 404 for a Class 6
//     container or an unknown chapter, only validated non-withdrawn MCQs,
//     unseen first, honest size (7 available → 7, 30 → 10, 4 → 422 and no
//     row), config.school with the chapter and its page, generatedBy
//     "school-chapter", the enrolment on the container;
//   • the two routes: POST /api/mocks/custom with the school flag returns
//     the set, and without it a school code is an unknown exam.
// No DB, no network, no AI. Run: npx vitest run tests/unit/school-chapter-mock.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";

type Q = { id: string; topicId: string; difficulty: "EASY" | "MEDIUM" | "HARD"; validated: boolean; type: string; tags: string[] };

const db = vi.hoisted(() => ({
  exams: [
    { id: "e-c9", code: "NCERT_C09", category: "SCHOOL_BOARD", active: false, shortName: "NCERT 9", name: "NCERT Class 9", durationMin: 15, totalQuestions: 10 },
    { id: "e-c6", code: "NCERT_C06", category: "SCHOOL_BOARD", active: false, shortName: "NCERT 6", name: "NCERT Class 6", durationMin: 15, totalQuestions: 10 },
    { id: "e-ssc", code: "SSC_CGL", category: "GOVT_JOBS", active: true, shortName: "SSC CGL", name: "SSC CGL", durationMin: 60, totalQuestions: 100 },
  ],
  topic: { id: "t1", name: "Polynomials", code: "iemh1.ch02", subject: { name: "Mathematics" }, children: [{ id: "t1p1" }] },
  questions: [] as Q[],
  user: { onbStage: null as string | null, onbPrepCodes: [] as string[] },
  seen: null as null | { answered: Map<string, number>; shown: Map<string, number> },
  calls: [] as { model: string; op: string; args: unknown }[],
  raws: [] as { sql: string; values: unknown[] }[],
  upserts: [] as unknown[],
  created: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    exam: {
      findUnique: async (args: { where: Record<string, unknown>; select?: unknown }) => {
        db.calls.push({ model: "exam", op: "findUnique", args });
        const w = args.where;
        // The school reader pins the category and never reads `active`.
        if ("active" in w) throw new Error("school reader must not read active");
        return db.exams.find((e) => e.code === w.code && (w.category === undefined || e.category === w.category)) ?? null;
      },
    },
    topic: {
      findFirst: async (args: { where: { code: string; parentId: null; subject: { examId: string } } }) => {
        db.calls.push({ model: "topic", op: "findFirst", args });
        return args.where.code === db.topic.code && args.where.subject.examId === "e-c9" && args.where.parentId === null ? db.topic : null;
      },
    },
    question: {
      findMany: async (args: { where: { validated: boolean; type: string; NOT: { tags: { has: string } }; examId: string; topicId: { in: string[] } } }) => {
        db.calls.push({ model: "question", op: "findMany", args });
        const w = args.where;
        return db.questions
          .filter((q) => w.topicId.in.includes(q.topicId) && q.validated === w.validated && q.type === w.type && !q.tags.includes(w.NOT.tags.has))
          .map((q) => ({ id: q.id, topicId: q.topicId, difficulty: q.difficulty }));
      },
    },
    enrollment: {
      upsert: async (args: unknown) => {
        db.upserts.push(args);
        return { id: "enr" };
      },
    },
    mock: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        db.created.push(data);
        return { id: "m-school-1" };
      },
    },
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = strings.join("?");
      db.raws.push({ sql, values });
      if (/SELECT "onbStage", "onbPrepCodes" FROM "User"/.test(sql)) return [{ onbStage: db.user.onbStage, onbPrepCodes: db.user.onbPrepCodes }];
      if (/SELECT "onbPrepCodes" FROM "User"/.test(sql)) return [{ onbPrepCodes: db.user.onbPrepCodes }];
      return [];
    },
    $executeRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = strings.join("?");
      db.raws.push({ sql, values });
      if (/UPDATE "User"/.test(sql)) {
        db.user.onbStage = values[0] as string;
        db.user.onbPrepCodes = values[1] as string[];
      }
      return 1;
    },
  },
}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/answered-questions", () => ({ getSeenHistory: vi.fn(async () => db.seen) }));
vi.mock("@/lib/school/surface", async (orig) => {
  const real = (await orig()) as Record<string, unknown>;
  return {
    ...real,
    loadSchoolSurface: async () => ({
      readAt: "2026-09-26T00:00:00.000Z",
      classes: [
        {
          examCode: "NCERT_C09",
          curriculum: "NCERT",
          boardSlug: "cbse",
          cls: 9,
          name: "NCERT Class 9",
          updatedAt: "2026-09-26T00:00:00.000Z",
          lastModified: null,
          subjects: [{ code: "MATHEMATICS", name: "Mathematics", slug: "mathematics", orderIdx: 0, lastModified: null, chapters: [{ code: "iemh1.ch02", name: "Polynomials", slug: "polynomials", orderIdx: 1, bookCode: "iemh1", hasNotes: true, validatedQuestions: 7, noteUpdatedAt: null, questionsUpdatedAt: null, indexable: true, lastModified: null }] }],
        },
      ],
    }),
  };
});
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "u1" } })) }));
// /api/mocks imports the generator and the CAT engine; neither may run here.
vi.mock("@/lib/ai", () => ({ generateMock: vi.fn(async () => { throw new Error("no AI in this test"); }) }));
vi.mock("@/lib/psychometrics", () => ({ tryCatAdaptiveMock: vi.fn(async () => null) }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({ ok: true })),
  rateLimited: vi.fn(() => new Response("limited", { status: 429 })),
}));

import { buildSchoolChapterMock, declareSchoolBand, findStudentModeContainer, readSchoolProfile, schoolMockConfigOf } from "@/lib/school/student-db";
import { POST as customPost } from "@/app/api/mocks/custom/route";
import { POST as mocksPost } from "@/app/api/mocks/route";

function q(id: string, topicId = "t1", extra: Partial<Q> = {}): Q {
  return { id, topicId, difficulty: "MEDIUM", validated: true, type: "MCQ", tags: [], ...extra };
}
const banded = () => {
  db.user = { onbStage: "CLASS_9_10", onbPrepCodes: ["NCERT_C09"] };
};

beforeEach(() => {
  db.questions = [];
  db.user = { onbStage: null, onbPrepCodes: [] };
  db.seen = { answered: new Map(), shown: new Map() };
  db.calls = [];
  db.raws = [];
  db.upserts = [];
  db.created = [];
});

describe("findStudentModeContainer", () => {
  it("a Class 8-12 container by code, category pinned; Class 1-7, a real exam and an unknown code are null", async () => {
    const c9 = await findStudentModeContainer("NCERT_C09");
    expect(c9).toMatchObject({ id: "e-c9", code: "NCERT_C09", cls: 9, category: "SCHOOL_BOARD" });
    expect((db.calls[0].args as { where: unknown }).where).toEqual({ category: "SCHOOL_BOARD", code: "NCERT_C09" });
    expect(await findStudentModeContainer("NCERT_C06")).toBeNull();
    expect(await findStudentModeContainer("SSC_CGL")).toBeNull();
    expect(await findStudentModeContainer("NO_SUCH")).toBeNull();
    // Class 6 and the real exam were not even looked up: the code rule runs first.
    expect(db.calls.filter((c) => c.model === "exam")).toHaveLength(1);
  });
});

describe("declareSchoolBand + readSchoolProfile", () => {
  it("writes the band into onbStage, adds the container to onbPrepCodes, keeps the wizard's codes, enrols with the school flag", async () => {
    db.user = { onbStage: "UG", onbPrepCodes: ["SSC_CGL"] };
    expect(await readSchoolProfile("u1")).toBeNull();
    const r = await declareSchoolBand("u1", "STUDENT_13_17", "NCERT_C09");
    expect(r).toEqual({ ok: true, profile: { band: "STUDENT_13_17", classCodes: ["NCERT_C09"] } });
    expect(db.user).toEqual({ onbStage: "CLASS_9_10", onbPrepCodes: ["SSC_CGL", "NCERT_C09"] });
    const update = db.raws.find((x) => /UPDATE "User"/.test(x.sql))!;
    expect(update.sql).toMatch(/"onbCompletedAt" = COALESCE\("onbCompletedAt", NOW\(\)\)/);
    expect(db.upserts).toEqual([{ where: { userId_examId: { userId: "u1", examId: "e-c9" } }, update: { active: true }, create: { userId: "u1", examId: "e-c9", active: true } }]);
    expect(await readSchoolProfile("u1")).toEqual({ band: "STUDENT_13_17", classCodes: ["NCERT_C09"] });
    // Answering again on another class adds the code and keeps one row per container.
    await declareSchoolBand("u1", "STUDENT_13_17", "NCERT_C09");
    expect(db.user.onbPrepCodes).toEqual(["SSC_CGL", "NCERT_C09"]);
  });

  it("a parent's and a teacher's stages; a Class 6 container is refused", async () => {
    expect(await declareSchoolBand("u1", "PARENT", "NCERT_C09")).toMatchObject({ ok: true, profile: { band: "PARENT" } });
    expect(db.user.onbStage).toBe("SCHOOL_PARENT");
    expect(await declareSchoolBand("u1", "TEACHER", "NCERT_C09")).toMatchObject({ ok: true, profile: { band: "TEACHER" } });
    expect(db.user.onbStage).toBe("SCHOOL_TEACHER");
    expect(await declareSchoolBand("u1", "STUDENT_18", "NCERT_C09")).toMatchObject({ ok: true, profile: { band: "STUDENT_18" } });
    expect(db.user.onbStage).toBe("SCHOOL_ADULT");
    db.upserts = [];
    expect(await declareSchoolBand("u1", "STUDENT_13_17", "NCERT_C06")).toEqual({ ok: false, status: 404, error: "unknown class" });
    expect(await declareSchoolBand("u1", "STUDENT_13_17", "SSC_CGL")).toEqual({ ok: false, status: 404, error: "unknown class" });
    expect(db.upserts).toEqual([]);
  });
});

describe("buildSchoolChapterMock", () => {
  it("403 before the band is answered, and nothing is read or written", async () => {
    db.questions = Array.from({ length: 12 }, (_, i) => q(`q${i}`));
    const r = await buildSchoolChapterMock({ userId: "u1", examCode: "NCERT_C09", topicCode: "iemh1.ch02", count: 10 });
    expect(r).toEqual({ ok: false, status: 403, error: "school-band-required" });
    expect(db.calls.filter((c) => c.model === "question")).toEqual([]);
    expect(db.created).toEqual([]);
  });

  it("404 for a Class 6 container, a real exam and an unknown chapter", async () => {
    banded();
    expect(await buildSchoolChapterMock({ userId: "u1", examCode: "NCERT_C06", topicCode: "fegp1.ch01", count: 10 })).toEqual({ ok: false, status: 404, error: "unknown exam" });
    expect(await buildSchoolChapterMock({ userId: "u1", examCode: "SSC_CGL", topicCode: "x", count: 10 })).toEqual({ ok: false, status: 404, error: "unknown exam" });
    expect(await buildSchoolChapterMock({ userId: "u1", examCode: "NCERT_C09", topicCode: "iemh1.ch99", count: 10 })).toEqual({ ok: false, status: 404, error: "unknown chapter" });
    expect(db.created).toEqual([]);
  });

  it("7 checked questions → a 7-question set titled with 7, config.school with the chapter and its page, the enrolment on the container", async () => {
    banded();
    db.questions = [
      ...Array.from({ length: 6 }, (_, i) => q(`v${i}`)),
      q("v6", "t1p1"), // a piece inside the chapter counts
      q("u1", "t1", { validated: false }),
      q("w1", "t1", { tags: ["rejected"] }),
      q("n1", "t1", { type: "NUMERIC" }),
    ];
    const r = await buildSchoolChapterMock({ userId: "u1", examCode: "NCERT_C09", topicCode: "iemh1.ch02", count: 10 });
    expect(r).toMatchObject({ ok: true, id: "m-school-1", count: 7, requested: 10, short: true, chapterPath: "/schooling/cbse/class-9/mathematics/polynomials" });
    if (!r.ok) throw new Error("unreachable");
    expect(r.title).toBe("Class 9 Maths — Practice: Polynomials · 7 questions");
    expect(r.line).toBe("Only 7 questions were available for this chapter, so this mock has 7, not 10.");
    expect(r.durationMin).toBe(11); // 7 × 1.5 min (15 min / 10 questions), rounded
    const qWhere = (db.calls.find((c) => c.model === "question")!.args as { where: unknown }).where;
    expect(qWhere).toEqual({ validated: true, type: "MCQ", NOT: { tags: { has: "rejected" } }, examId: "e-c9", topicId: { in: ["t1", "t1p1"] } });
    const stored = db.created[0];
    expect(stored).toMatchObject({ examId: "e-c9", userId: "u1", type: "USER_REQUEST", generatedBy: "school-chapter", title: r.title });
    expect(new Set(stored.questionIds as string[])).toEqual(new Set(["v0", "v1", "v2", "v3", "v4", "v5", "v6"]));
    expect(stored.config).toMatchObject({
      topics: ["t1"],
      topicNames: ["Polynomials"],
      count: 7,
      requestedCount: 10,
      durationMin: 11,
      school: { examCode: "NCERT_C09", topicCode: "iemh1.ch02", chapterName: "Polynomials", subjectName: "Mathematics", cls: 9, chapterPath: "/schooling/cbse/class-9/mathematics/polynomials" },
    });
    expect(schoolMockConfigOf(stored.config)).toEqual({ examCode: "NCERT_C09", topicCode: "iemh1.ch02", chapterName: "Polynomials", subjectName: "Mathematics", cls: 9, chapterPath: "/schooling/cbse/class-9/mathematics/polynomials" });
    expect(db.upserts).toEqual([{ where: { userId_examId: { userId: "u1", examId: "e-c9" } }, update: {}, create: { userId: "u1", examId: "e-c9" } }]);
  });

  it("30 checked questions → 10, unseen first; the honest bank numbers count answered questions", async () => {
    banded();
    db.questions = Array.from({ length: 30 }, (_, i) => q(`q${i}`));
    db.seen = { answered: new Map(Array.from({ length: 25 }, (_, i) => [`q${i}`, i + 1])), shown: new Map() };
    const r = await buildSchoolChapterMock({ userId: "u1", examCode: "NCERT_C09", topicCode: "iemh1.ch02", count: 25 });
    if (!r.ok) throw new Error("unreachable");
    expect(r.count).toBe(10);
    expect(r.requested).toBe(10); // capped at SCHOOL_CHAPTER_MOCK_MAX, so not "short"
    expect(r.short).toBe(false);
    expect(r.line).toBeNull();
    const ids = db.created[0].questionIds as string[];
    for (const id of ["q25", "q26", "q27", "q28", "q29"]) expect(ids).toContain(id); // every never-shown one
    // The other 5 are the LEAST recently answered (q0..q4), never a random recycle.
    expect(ids.filter((id) => Number(id.slice(1)) < 25).sort()).toEqual(["q0", "q1", "q2", "q3", "q4"]);
    expect(r.bank).toMatchObject({ size: 30, seen: 25, repeats: 5, windowDays: 90 });
  });

  it("4 checked questions → 422 with the real number, no row, no enrolment", async () => {
    banded();
    db.questions = Array.from({ length: 4 }, (_, i) => q(`q${i}`));
    const r = await buildSchoolChapterMock({ userId: "u1", examCode: "NCERT_C09", topicCode: "iemh1.ch02", count: 10 });
    expect(r).toEqual({ ok: false, status: 422, error: "Only 4 checked questions are ready for this chapter — practice needs at least 5.", available: 4 });
    expect(db.created).toEqual([]);
    expect(db.upserts).toEqual([]);
  });

  it("schoolMockConfigOf is null for an exam mock and for a malformed value", () => {
    expect(schoolMockConfigOf({ topics: ["t1"], count: 10 })).toBeNull();
    expect(schoolMockConfigOf(null)).toBeNull();
    expect(schoolMockConfigOf({ school: { examCode: "NCERT_C09" } })).toBeNull();
    expect(schoolMockConfigOf({ school: { examCode: "NCERT_C09", topicCode: "x", chapterName: "Y", chapterPath: "https://evil/x" } })).toMatchObject({ chapterPath: null, cls: 9 });
  });
});

describe("the routes", () => {
  async function post(handler: (req: Request) => Promise<Response>, body: Record<string, unknown>) {
    const res = await handler(new Request("http://x/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
    return { status: res.status, data: await res.json() };
  }

  it("POST /api/mocks/custom with the school flag builds the chapter set; without it a school code is an unknown exam", async () => {
    banded();
    db.questions = Array.from({ length: 8 }, (_, i) => q(`q${i}`));
    const ok = await post(customPost, { examCode: "NCERT_C09", school: true, topicCode: "iemh1.ch02", count: 10, difficulty: "MIXED" });
    expect(ok.status).toBe(200);
    expect(ok.data).toMatchObject({ id: "m-school-1", count: 8, requested: 10, short: true, school: true, chapterPath: "/schooling/cbse/class-9/mathematics/polynomials" });
    const unknown = await post(customPost, { examCode: "NCERT_C09", topicIds: ["t1"], count: 10, difficulty: "MIXED" });
    expect(unknown.status).toBe(404);
    expect(unknown.data.error).toBe("unknown exam");
    // The band first.
    db.user = { onbStage: null, onbPrepCodes: [] };
    const gated = await post(customPost, { examCode: "NCERT_C09", school: true, topicCode: "iemh1.ch02", count: 10, difficulty: "MIXED" });
    expect(gated).toEqual({ status: 403, data: { error: "school-band-required" } });
    // A school request without a chapter code is a bad request.
    const bad = await post(customPost, { examCode: "NCERT_C09", school: true, count: 10, difficulty: "MIXED" });
    expect(bad.status).toBe(400);
  });

  it("POST /api/mocks with the school flag answers in its own mock shape; a non-TOPIC school request is refused", async () => {
    banded();
    db.questions = Array.from({ length: 8 }, (_, i) => q(`q${i}`));
    const ok = await post(mocksPost, { examCode: "NCERT_C09", school: true, request: { type: "TOPIC", topicCode: "iemh1.ch02", questionCount: 10 } });
    expect(ok.status).toBe(200);
    expect(ok.data.mock).toMatchObject({ id: "m-school-1", questionCount: 8, requestedCount: 10, short: true, school: true, rationale: null });
    const full = await post(mocksPost, { examCode: "NCERT_C09", school: true, request: { type: "FULL" } });
    expect(full.status).toBe(400);
    const unknown = await post(mocksPost, { examCode: "NCERT_C09", request: { type: "TOPIC", topicCode: "iemh1.ch02", questionCount: 10 } });
    expect(unknown.status).toBe(404);
  });
});

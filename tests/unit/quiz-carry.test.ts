// The guest quiz result carried into the account's weak topics at sign-in
// (30 Sep 2026) — src/lib/quiz-carry.ts, src/lib/db/quiz-carry.ts and
// POST /api/quiz/import against a stubbed Prisma. What it pins:
//   • the stash: v2 keeps question ids + chosen options; a v1 stash, a
//     carried one, a stale one or a malformed one is never sent;
//   • the route: a guest gets 401 and nothing is read or written; the exam
//     goes through realExamKey (a school container is 404); only the exam's
//     own CHECKED questions are graded, against their stored keys — the
//     client's score is never used; one carry per account and stash;
//   • the writes: one transaction — the QuizCarry row (source 'guest-quiz')
//     first, then ONE WeaknessMap upsert for all topics: counts add up,
//     masteryScore stays the last set's accuracy (the quiz's only when it is
//     the newer set); never an Attempt, a Mock or a ProgressEvent (no
//     counter, streak or rank moves); a withdrawn question is never graded,
//     and a stash with nothing left to grade stores nothing and is never
//     called "saved" (review, 30 Sep 2026);
//   • the recall: sends once for a signed-in member only, remembers the carry,
//     never on school pages; honest copy (the tutor, not Daily 5).
// No DB. Run: npx vitest run tests/unit/quiz-carry.test.ts

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const st = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  exam: { id: "e-ssc", active: true } as any,
  questions: [] as any[],
  log: [] as Array<{ op: string; args: any }>,
  txQueries: [] as Array<{ sql: string; values: unknown[] }>,
  txExecs: [] as Array<{ sql: string; values: unknown[] }>,
  inserted: true,
  missingTableOnce: false,
  ensureCalls: [] as string[],
  rate: true,
  txCalls: [] as Array<unknown>,
}));

vi.mock("@/lib/auth", () => ({ auth: async () => st.session }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: async () => ({ ok: st.rate, limit: 10, remaining: 9, reset: 0 }),
  rateLimited: () => new Response("rate limited", { status: 429 }),
}));
vi.mock("@/lib/db/prisma", () => {
  const tx = {
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      if (st.missingTableOnce) {
        st.missingTableOnce = false;
        throw Object.assign(new Error('relation "QuizCarry" does not exist'), { code: "P2010", meta: { code: "42P01" } });
      }
      st.txQueries.push({ sql: strings.join("?"), values });
      return st.inserted ? [{ id: "qc1" }] : [];
    },
    $executeRaw: async (q: { sql: string; values: unknown[] }) => {
      st.txExecs.push({ sql: q.sql, values: q.values });
      return 1;
    },
  };
  return {
    prisma: {
      exam: {
        findUnique: async (args: any) => {
          st.log.push({ op: "exam.findUnique", args });
          return st.exam;
        },
      },
      question: {
        findMany: async (args: any) => {
          st.log.push({ op: "question.findMany", args });
          const withdrawnTag = args.where.NOT?.tags?.has;
          return st.questions.filter(
            (q) =>
              args.where.id.in.includes(q.id) &&
              q.examId === args.where.examId &&
              q.validated === args.where.validated &&
              (args.where.type === undefined || q.type === args.where.type) &&
              !(withdrawnTag && (q.tags ?? []).includes(withdrawnTag)),
          );
        },
      },
      $transaction: async (fn: (t: typeof tx) => Promise<unknown>, opts?: unknown) => {
        st.txCalls.push(opts);
        return fn(tx);
      },
      $executeRawUnsafe: async (sql: string) => {
        st.ensureCalls.push(sql);
        return 0;
      },
    },
  };
});

import {
  QUIZ_CARRY_MAX_AGE_MS,
  carryBodyOf,
  carryOutcome,
  checkCarryBody,
  gradeCarry,
  mergeMastery,
  missedTopicNames,
  parseQuizStash,
  quizMastery,
  quizRecallCopy,
  savedLine,
  stashFingerprint,
  welcomeParts,
} from "@/lib/quiz-carry";
import {
  ENSURE_QUIZ_CARRY_SQL,
  QUIZ_CARRY_TX_OPTIONS,
  carrySeenAt,
  isMissingTableError,
  stashKeyOf,
  weaknessUpsertSql,
} from "@/lib/db/quiz-carry";
import { WITHDRAWN_TAG } from "@/lib/question-withdrawn";
import { POST } from "@/app/api/quiz/import/route";

const NOW = Date.now();
const IDS = ["q1abcdefgh", "q2abcdefgh", "q3abcdefgh", "q4abcdefgh", "q5abcdefgh"];

function stash(over: Record<string, unknown> = {}) {
  return {
    examCode: "SSC_CGL",
    examShort: "SSC CGL",
    topicCode: null,
    scopeLabel: "SSC CGL",
    score: 2,
    total: 5,
    missed: ["…"],
    at: NOW - 3600_000,
    questionIds: IDS,
    choices: ["A", "B", "C", "D", "A"],
    ...over,
  };
}

beforeEach(() => {
  st.session = null;
  st.exam = { id: "e-ssc", active: true };
  const mcq = { type: "MCQ", tags: [] as string[] };
  st.questions = [
    { ...mcq, id: "q1abcdefgh", examId: "e-ssc", validated: true, answerKey: "A", topicId: "t-perc", topic: { name: "Percentages" } },
    { ...mcq, id: "q2abcdefgh", examId: "e-ssc", validated: true, answerKey: "A", topicId: "t-perc", topic: { name: "Percentages" } },
    { ...mcq, id: "q3abcdefgh", examId: "e-ssc", validated: true, answerKey: "C", topicId: "t-tw", topic: { name: "Time & Work" } },
    { ...mcq, id: "q4abcdefgh", examId: "e-other", validated: true, answerKey: "D", topicId: "t-x", topic: { name: "Elsewhere" } },
    { ...mcq, id: "q5abcdefgh", examId: "e-ssc", validated: false, answerKey: "A", topicId: "t-gk", topic: { name: "Unchecked" } },
  ];
  st.log = [];
  st.txQueries = [];
  st.txExecs = [];
  st.inserted = true;
  st.missingTableOnce = false;
  st.ensureCalls = [];
  st.rate = true;
  st.txCalls = [];
});

describe("the stash", () => {
  it("v2 carries ids and choices; v1, carried, stale, mismatched or malformed stashes are never sent", () => {
    const s = parseQuizStash(stash())!;
    expect(carryBodyOf(s, NOW)).toEqual({ examCode: "SSC_CGL", questionIds: IDS, choices: ["A", "B", "C", "D", "A"], at: s.at });
    expect(carryBodyOf(parseQuizStash(stash({ questionIds: undefined, choices: undefined })), NOW)).toBeNull(); // v1
    expect(carryBodyOf(parseQuizStash(stash({ carryDone: true })), NOW)).toBeNull();
    expect(carryBodyOf(parseQuizStash(stash({ at: NOW - QUIZ_CARRY_MAX_AGE_MS - 1 })), NOW)).toBeNull();
    expect(carryBodyOf(parseQuizStash(stash({ at: NOW + 2 * 3600_000 })), NOW)).toBeNull();
    expect(carryBodyOf(parseQuizStash(stash({ choices: ["A"] })), NOW)).toBeNull();
    expect(carryBodyOf(parseQuizStash(stash({ questionIds: ["x"], choices: ["A"] })), NOW)).toBeNull();
    expect(carryBodyOf(parseQuizStash(stash({ choices: ["A", "B", "C", "D", "<script>"] })), NOW)).toBeNull();
    expect(parseQuizStash(null)).toBeNull();
    expect(parseQuizStash({ examCode: "X" })).toBeNull();
    expect(parseQuizStash(stash({ carried: { topics: ["a", 1, "b"] } }))!.carried).toEqual({ topics: ["a", "b"] });
  });

  it("the player stashes the ids and the chosen options", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src/components/AnonQuizPlayer.tsx"), "utf8");
    expect(src).toContain("questionIds: qs.map((qq) => qq.id),");
    expect(src).toContain("choices: nextAnswers.map((a) => a.key),");
  });
});

describe("grading and mastery", () => {
  it("re-grades against the stored keys; each id once; unknown ids ignored", () => {
    const g = gradeCarry(
      { questionIds: ["q1", "q2", "q1", "zz", "q3"], choices: ["a", "B", "B", "A", "C"] },
      [
        { id: "q1", answerKey: "A", topicId: "t1", topicName: "Percentages" },
        { id: "q2", answerKey: "A", topicId: "t1", topicName: "Percentages" },
        { id: "q3", answerKey: "C", topicId: "t2", topicName: "Time & Work" },
      ],
    );
    expect(g.graded).toBe(3);
    expect(g.correct).toBe(2);
    expect(g.topics).toEqual([
      { topicId: "t1", topicName: "Percentages", correct: 1, total: 2 },
      { topicId: "t2", topicName: "Time & Work", correct: 1, total: 1 },
    ]);
    expect(missedTopicNames(g.topics)).toEqual(["Percentages"]);
  });

  it("counts add up; masteryScore stays the LAST set's accuracy — the quiz's only when the quiz is the newer set", () => {
    const at = new Date(NOW);
    // A new topic: the quiz's own share, seen at the quiz's time.
    expect(mergeMastery(null, { correct: 1, total: 2, at })).toEqual({ masteryScore: 0.5, attemptsCount: 2, correctCount: 1, lastSeenAt: at });
    // The quiz is newer than the row's last set: it becomes the last set.
    const older = new Date(NOW - 86_400_000);
    const m = mergeMastery({ masteryScore: 0.9, attemptsCount: 20, correctCount: 17, lastSeenAt: older }, { correct: 0, total: 1, at });
    expect(m).toEqual({ masteryScore: 0, attemptsCount: 21, correctCount: 17, lastSeenAt: at });
    // A mock taken after the quiz (another device): its accuracy and time stand; only the counts grow.
    const newer = new Date(NOW + 3600_000);
    const k = mergeMastery({ masteryScore: 0.9, attemptsCount: 20, correctCount: 17, lastSeenAt: newer }, { correct: 0, total: 1, at });
    expect(k).toEqual({ masteryScore: 0.9, attemptsCount: 21, correctCount: 17, lastSeenAt: newer });
    // Never a blended running average (the old rule gave 18/21 here).
    expect(mergeMastery({ masteryScore: 0.9, attemptsCount: 20, correctCount: 17, lastSeenAt: older }, { correct: 1, total: 1, at }).masteryScore).toBe(1);
    expect(quizMastery({ correct: 0, total: 0 })).toBe(0);
  });

  it("the upsert: ONE statement for every topic, on the (user, exam, topic) key — the same rule as mergeMastery", () => {
    const seen = new Date(NOW - 3600_000);
    const now = new Date(NOW);
    const q = weaknessUpsertSql(
      "u1",
      "e-ssc",
      [
        { topicId: "t1", topicName: "P", correct: 1, total: 2 },
        { topicId: "t2", topicName: "T", correct: 1, total: 1 },
      ],
      seen,
      now,
    )!;
    const sql = q.sql.replace(/\s+/g, " ");
    expect(sql.match(/INSERT INTO "WeaknessMap"/g)).toHaveLength(1);
    expect(sql).toContain(`ON CONFLICT ("userId", "examId", "topicId") DO UPDATE SET`);
    expect(sql).toContain(
      `"masteryScore" = CASE WHEN EXCLUDED."lastSeenAt" >= "WeaknessMap"."lastSeenAt" THEN EXCLUDED."masteryScore" ELSE "WeaknessMap"."masteryScore" END`,
    );
    expect(sql).toContain(`"attemptsCount" = "WeaknessMap"."attemptsCount" + EXCLUDED."attemptsCount"`);
    expect(sql).toContain(`"correctCount" = "WeaknessMap"."correctCount" + EXCLUDED."correctCount"`);
    expect(sql).toContain(`"lastSeenAt" = GREATEST("WeaknessMap"."lastSeenAt", EXCLUDED."lastSeenAt")`);
    expect(sql).not.toMatch(/NULLIF|\* GREATEST/); // the old blend is gone
    // Two value rows of nine: id, user, exam, topic, mastery, answers, right, seen (the quiz's time), updated.
    expect(q.values).toHaveLength(18);
    expect(q.values.slice(1, 9)).toEqual(["u1", "e-ssc", "t1", 0.5, 2, 1, seen, now]);
    expect(q.values.slice(10, 18)).toEqual(["u1", "e-ssc", "t2", 1, 1, 1, seen, now]);
    expect(weaknessUpsertSql("u1", "e-ssc", [], seen, now)).toBeNull();
  });

  it("lastSeenAt is the quiz's own time, never after now", () => {
    const now = new Date(NOW);
    expect(carrySeenAt({ at: NOW - 5000 }, now).getTime()).toBe(NOW - 5000);
    expect(carrySeenAt({ at: NOW + 30 * 60_000 }, now).getTime()).toBe(NOW); // a skewed clock ahead
  });

  it("the carry's identity: same account + exam + time + questions + choices", () => {
    const b = { examCode: "SSC_CGL", questionIds: IDS, choices: ["A", "B", "C", "D", "A"], at: 1 };
    expect(stashKeyOf("u1", b)).toBe(stashKeyOf("u1", { ...b }));
    expect(stashKeyOf("u1", b)).not.toBe(stashKeyOf("u2", b));
    expect(stashKeyOf("u1", b)).not.toBe(stashKeyOf("u1", { ...b, choices: ["B", "B", "C", "D", "A"] }));
    expect(stashFingerprint("u1", b)).toContain("SSC_CGL|1|");
    expect(checkCarryBody(b, NOW)).toBe("stale");
    expect(checkCarryBody({ ...b, at: NOW }, NOW)).toBe("ok");
    expect(checkCarryBody({ ...b, at: NOW, choices: ["A"] }, NOW)).toBe("shape");
  });

  it("the table: created by the ensure pattern with one row per account and stash", () => {
    expect(ENSURE_QUIZ_CARRY_SQL[0]).toContain(`CREATE TABLE IF NOT EXISTS "QuizCarry"`);
    expect(ENSURE_QUIZ_CARRY_SQL[0]).toContain(`"source" TEXT NOT NULL DEFAULT 'guest-quiz'`);
    expect(ENSURE_QUIZ_CARRY_SQL[1]).toBe(`CREATE UNIQUE INDEX IF NOT EXISTS "QuizCarry_userId_stashKey_key" ON "QuizCarry"("userId", "stashKey")`);
    expect(isMissingTableError({ meta: { code: "42P01" } })).toBe(true);
    expect(isMissingTableError(new Error("timeout"))).toBe(false);
  });

  it("the table is mirrored in prisma/schema.prisma (a schema diff never proposes dropping it), with Prisma's index names", () => {
    const schema = fs.readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf8").replace(/\r\n/g, "\n");
    const model = /\nmodel QuizCarry \{([^}]*)\}/.exec(schema)?.[1] ?? "";
    expect(model).not.toBe("");
    // Every column of the ensure SQL is a field of the model, and back.
    const sqlCols = [...ENSURE_QUIZ_CARRY_SQL[0].matchAll(/^\s*"(\w+)" /gm)].map((m) => m[1]).sort();
    const fields = [...model.matchAll(/^\s{2}(\w+)\s+\w+/gm)].map((m) => m[1]).sort();
    expect(fields).toEqual(sqlCols);
    // Prisma's default names = the ensure SQL's: QuizCarry_userId_stashKey_key, QuizCarry_userId_idx.
    expect(model).toContain("@@unique([userId, stashKey])");
    expect(model).toContain("@@index([userId])");
    expect(ENSURE_QUIZ_CARRY_SQL[2]).toContain(`"QuizCarry_userId_idx" ON "QuizCarry"("userId")`);
    expect(fs.readFileSync(path.join(process.cwd(), "scripts/create-quiz-carry-table.ts"), "utf8")).toContain(
      "Mirrors the QuizCarry model in prisma/schema.prisma",
    );
  });
});

describe("POST /api/quiz/import", () => {
  const post = (body: unknown) =>
    POST(new Request("https://shishya.in/api/quiz/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  const body = () => carryBodyOf(parseQuizStash(stash()), NOW)!;

  it("a guest gets 401: nothing read, nothing written", async () => {
    const r = await post(body());
    expect(r.status).toBe(401);
    expect(st.log).toHaveLength(0);
    expect(st.txQueries).toHaveLength(0);
  });

  it("re-grades the exam's own checked questions only, records once, writes the topics", async () => {
    st.session = { user: { id: "u1" } };
    const r = await post({ ...body(), score: 5, total: 5 }); // a client score is ignored
    expect(r.status).toBe(200);
    const j = (await r.json()) as any;
    // q1 A=A ✓, q2 B≠A ✗, q3 C=C ✓; q4 is another exam's, q5 unchecked → ignored.
    expect(j).toEqual({ ok: true, graded: 3, topics: ["Percentages"] });
    expect(st.log[0]).toEqual({ op: "exam.findUnique", args: { where: { code: "SSC_CGL", category: { not: "SCHOOL_BOARD" } }, select: { id: true, active: true } } });
    const qArgs = st.log.find((l) => l.op === "question.findMany")!.args;
    expect(qArgs.where.examId).toBe("e-ssc");
    expect(qArgs.where.validated).toBe(true);
    // The guest quiz's own pool: checked MCQs, never a withdrawn one.
    expect(qArgs.where.type).toBe("MCQ");
    expect(qArgs.where.NOT).toEqual({ tags: { has: WITHDRAWN_TAG } });
    // One QuizCarry row, then ONE upsert for all topics — inside a transaction
    // with room for two ~800 ms round trips.
    expect(st.txCalls).toEqual([QUIZ_CARRY_TX_OPTIONS]);
    expect(QUIZ_CARRY_TX_OPTIONS.timeout).toBeGreaterThan(5_000);
    expect(st.txQueries).toHaveLength(1);
    expect(st.txQueries[0].sql).toContain(`INSERT INTO "QuizCarry"`);
    expect(st.txQueries[0].sql).toContain(`ON CONFLICT ("userId", "stashKey") DO NOTHING`);
    expect(st.txQueries[0].values).toContain("guest-quiz");
    expect(st.txQueries[0].values).toContain(stashKeyOf("u1", body()));
    expect(st.txExecs).toHaveLength(1);
    const v = st.txExecs[0].values;
    expect([v.slice(1, 7), v.slice(10, 16)]).toEqual([
      ["u1", "e-ssc", "t-perc", 0.5, 2, 1],
      ["u1", "e-ssc", "t-tw", 1, 1, 1],
    ]);
    // lastSeenAt = the quiz's own time (the stash's `at`), not the import's.
    expect((v[7] as Date).getTime()).toBe(body().at);
  });

  it("a withdrawn question is never graded nor named as a weak topic", async () => {
    st.session = { user: { id: "u1" } };
    st.questions[1].tags = [WITHDRAWN_TAG]; // q2 (the miss on Percentages) withdrawn after the quiz
    const j = (await (await post(body())).json()) as any;
    expect(j).toEqual({ ok: true, graded: 2, topics: [] });
    expect(st.txExecs[0].values.slice(1, 7)).toEqual(["u1", "e-ssc", "t-perc", 1, 1, 1]);
  });

  it("nothing left to grade: nothing written, and the answer says saved: false (never 'Saved to your Shishya')", async () => {
    st.session = { user: { id: "u1" } };
    for (const q of st.questions) q.tags = [WITHDRAWN_TAG];
    const r = await post(body());
    expect(r.status).toBe(200);
    const j = (await r.json()) as any;
    expect(j).toEqual({ ok: true, graded: 0, saved: false, topics: [] });
    expect(st.txCalls).toHaveLength(0);
    expect(st.txQueries).toHaveLength(0);
    expect(st.txExecs).toHaveLength(0);
    expect(carryOutcome(200, j)).toEqual({ kind: "stop" });
  });

  it("the same stash again writes nothing", async () => {
    st.session = { user: { id: "u1" } };
    st.inserted = false;
    const j = (await (await post(body())).json()) as any;
    expect(j).toMatchObject({ ok: true, already: true });
    expect(st.txExecs).toHaveLength(0);
  });

  it("a school container or unknown exam → 404; stale → 410; malformed → 400; rate-limited → 429", async () => {
    st.session = { user: { id: "u1" } };
    st.exam = null;
    expect((await post({ ...body(), examCode: "NCERT_C06" })).status).toBe(404);
    st.exam = { id: "e-ssc", active: true };
    expect((await post({ ...body(), at: NOW - QUIZ_CARRY_MAX_AGE_MS - 5 })).status).toBe(410);
    expect((await post({ ...body(), choices: ["A"] })).status).toBe(400);
    expect((await post({ nope: true })).status).toBe(400);
    st.rate = false;
    expect((await post(body())).status).toBe(429);
    expect(st.txQueries).toHaveLength(0);
  });

  it("no table yet: it runs the ensure once and carries on", async () => {
    st.session = { user: { id: "u1" } };
    st.missingTableOnce = true;
    const r = await post(body());
    expect(r.status).toBe(200);
    expect(st.ensureCalls).toEqual([...ENSURE_QUIZ_CARRY_SQL]);
    expect(st.txQueries).toHaveLength(1);
  });

  it("never an Attempt, a Mock or a ProgressEvent — no counter moves", () => {
    const files = ["src/app/api/quiz/import/route.ts", "src/lib/db/quiz-carry.ts", "src/lib/quiz-carry.ts"];
    for (const f of files) {
      const src = fs.readFileSync(path.join(process.cwd(), f), "utf8").replace(/^\s*(\/\/|\/\*|\*).*$/gm, "");
      expect(src, f).not.toMatch(/\.attempt\.|"Attempt"|\.mock\.|"Mock"|progressEvent|"ProgressEvent"|analyticsEvent/);
    }
  });
});

describe("the recall card", () => {
  it("honest copy: the tutor, not Daily 5; English unchanged; hi / te", () => {
    const en = quizRecallCopy("en");
    expect(welcomeParts(en, "SSC CGL")).toEqual(["👋 Welcome in — we kept your guest quiz. You scored ", " on SSC CGL."]);
    expect(en.missTail).toBe("Let's turn those misses into marks — start with the topic you're weakest on.");
    expect(savedLine(en, { examShort: "SSC CGL" }, ["Percentages", "Time & Work"])).toBe(
      "✓ Saved to your Shishya: Percentages, Time & Work — the SSC CGL tutor now sees these weak topics.",
    );
    expect(savedLine(en, { examShort: "SSC CGL" }, [])).toBe("✓ Saved to your Shishya — the SSC CGL tutor now sees this result.");
    for (const l of ["en", "hi", "te"]) {
      const c = quizRecallCopy(l);
      expect(`${c.saved} ${c.savedAll}`).not.toMatch(/Daily ?5|डेली|డైలీ/i);
      expect(c.welcome).toContain("{score}");
      expect(c.saved).toContain("{topics}");
    }
  });

  it("answers: saved, stop for good, or try again later", () => {
    expect(carryOutcome(200, { ok: true, topics: ["A", 2, "B"] })).toEqual({ kind: "saved", topics: ["A", "B"] });
    expect(carryOutcome(200, { ok: true, already: true })).toEqual({ kind: "saved", topics: [] });
    expect(carryOutcome(200, { ok: true, graded: 3, already: true, topics: ["A"] })).toEqual({ kind: "saved", topics: ["A"] });
    // A 200 that stored nothing is never "saved" (the card would claim a save that did not happen).
    expect(carryOutcome(200, { ok: true, graded: 0, saved: false, topics: [] })).toEqual({ kind: "stop" });
    expect(carryOutcome(200, { ok: true, graded: 0, topics: [] })).toEqual({ kind: "stop" });
    expect(carryOutcome(200, { ok: true, saved: false })).toEqual({ kind: "stop" });
    for (const s of [400, 404, 410]) expect(carryOutcome(s, null)).toEqual({ kind: "stop" });
    for (const s of [401, 429, 500, 503]) expect(carryOutcome(s, null)).toEqual({ kind: "retry" });
  });

  it("sends only for a signed-in member, once, and remembers it; mounted on hub, dashboard and (silently) the mock page — never school", () => {
    const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8").replace(/\r\n/g, "\n");
    const recall = read("src/components/AnonQuizRecall.tsx");
    expect(recall).toContain("if (!signedIn) return;");
    expect(recall).toContain('fetch("/api/quiz/import"');
    expect(recall).toContain("carryDone: true");
    // The hub: members carry; guests get exactly the element they got before.
    expect(read("src/app/exams/[code]/page.tsx")).toContain(
      "{userId ? <AnonQuizRecall examCode={exam.code} signedIn locale={locale} /> : <AnonQuizRecall examCode={exam.code} />}",
    );
    expect(read("src/app/dashboard/page.tsx")).toContain("<AnonQuizRecall signedIn locale={locale} />");
    const mockPage = read("src/app/mocks/[id]/page.tsx");
    expect(mockPage).toContain('{mock.generatedBy !== "school-chapter" && <AnonQuizRecall signedIn silent />}');
    // School practice has its own player that stashes nothing.
    const school = read("src/components/school/SchoolChapterQuiz.tsx");
    expect(school).not.toContain("shishya_anon_quiz");
    expect(school).not.toContain("localStorage.setItem");
  });
});

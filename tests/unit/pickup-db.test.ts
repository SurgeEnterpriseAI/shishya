// "Pick up where you left off" (30 Sep 2026) — the DB reads
// (src/lib/db/pickup.ts) and GET /api/me/pickup against a stubbed Prisma.
// What it pins:
//   • every read is the member's own rows; the last question comes from
//     general chats and ACTIVE real exams only (never a school chat, never an
//     inactive exam /chat cannot reopen) within 14 days — or one exam for the
//     hub strip; the last result from an active real exam within 30 days;
//   • the quoted question skips Shishya's own prompts; "unanswered" comes from
//     the stored last row; a failed half never hides the other;
//   • the mail loader: one query for the batch, USER rows, real exams or the
//     general chat, "answered" = a non-empty reply stored after the question,
//     the member's latest TYPED question; nothing read for an empty batch;
//   • the route: a guest gets 401 and nothing is read; an exam goes through
//     realExamKey (a school container / inactive / unknown code is 404); the
//     answer is private and never cached.
// No DB. Run: npx vitest run tests/unit/pickup-db.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  log: [] as Array<{ model: string; op: string; args: any }>,
  latest: null as any,
  userRows: [] as any[],
  lastRow: null as any,
  opener: null as any,
  attempt: null as any,
  attemptFails: false,
  exam: { id: "e-ssc", active: true } as any,
  raw: [] as any[],
  rawCalls: [] as Array<{ sql: string; values: unknown[] }>,
  session: null as null | { user: { id: string } },
}));

vi.mock("@/lib/auth", () => ({ auth: async () => calls.session }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    chatMessage: {
      findFirst: async (args: any) => {
        calls.log.push({ model: "chatMessage", op: "findFirst", args });
        if (args.where?.session) return calls.latest;
        if (args.orderBy?.createdAt === "asc") return calls.opener;
        return calls.lastRow;
      },
      findMany: async (args: any) => {
        calls.log.push({ model: "chatMessage", op: "findMany", args });
        return calls.userRows;
      },
    },
    attempt: {
      findFirst: async (args: any) => {
        calls.log.push({ model: "attempt", op: "findFirst", args });
        if (calls.attemptFails) throw new Error("db down");
        return calls.attempt;
      },
    },
    exam: {
      findUnique: async (args: any) => {
        calls.log.push({ model: "exam", op: "findUnique", args });
        return calls.exam;
      },
    },
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      calls.rawCalls.push({ sql: strings.join("?"), values });
      return calls.raw;
    },
  },
}));

import { REAL_EXAM_SQL, REAL_EXAM_WHERE } from "@/lib/db/exam-scope";
import { loadEmailQuestions, loadPickup, loadPickupMock, loadPickupThread } from "@/lib/db/pickup";
import { GET } from "@/app/api/me/pickup/route";

const NOW = new Date("2026-09-30T06:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000);
const DAY = 86_400_000;

beforeEach(() => {
  calls.log = [];
  calls.rawCalls = [];
  calls.latest = {
    sessionId: "s1abcdefg",
    session: { userId: "u1", contextSnapshot: null, exam: { code: "SSC_CGL", shortName: "SSC CGL", category: "GOVT_JOBS" } },
  };
  calls.userRows = [
    { content: "Give me 3 practice questions on this" },
    { content: "Why does successive percentage change multiply?" },
    { content: "I'm weak in Percentages for SSC CGL. Tutor me on this topic." },
  ];
  calls.lastRow = { role: "USER", content: "Give me 3 practice questions on this", createdAt: hoursAgo(3) };
  calls.opener = { content: "I'm weak in Percentages for SSC CGL. Tutor me on this topic." };
  calls.attempt = {
    id: "a1abcdefg",
    userId: "u1",
    scorePct: 55,
    finishedAt: hoursAgo(30),
    topicScores: { t1: { topicCode: "PERC", topicName: "Percentages", correct: 1, total: 4 } },
    mock: { title: "SSC CGL Mock 2", exam: { code: "SSC_CGL", shortName: "SSC CGL", category: "GOVT_JOBS" } },
  };
  calls.attemptFails = false;
  calls.exam = { id: "e-ssc", active: true };
  calls.raw = [];
  calls.session = null;
});

describe("loadPickupThread", () => {
  it("the member's own latest question, 14 days, general chats and active real exams only", async () => {
    const t = await loadPickupThread("u1", { now: NOW });
    const q = calls.log.find((c) => c.model === "chatMessage" && c.op === "findFirst" && c.args.where?.session)!;
    expect(q.args.where.role).toBe("USER");
    expect(q.args.where.session.userId).toBe("u1");
    expect(q.args.where.session.OR).toEqual([{ examId: null }, { exam: REAL_EXAM_WHERE }]);
    expect(q.args.where.createdAt.gte.getTime()).toBe(NOW.getTime() - 14 * DAY);
    expect(q.args.orderBy).toEqual({ createdAt: "desc" });
    // Every follow-up read is that one conversation.
    for (const c of calls.log.filter((c) => !c.args.where?.session)) expect(c.args.where.sessionId).toBe("s1abcdefg");
    expect(t).toMatchObject({
      sessionId: "s1abcdefg",
      examCode: "SSC_CGL",
      examShort: "SSC CGL",
      lastRole: "USER",
      lastUser: "Give me 3 practice questions on this",
      lastTyped: "Why does successive percentage change multiply?",
      opener: "I'm weak in Percentages for SSC CGL. Tutor me on this topic.",
      reviewMockTitle: null,
    });
    expect(t!.lastAt).toEqual(hoursAgo(3));
    // The last row is read among the student's and the tutor's rows only.
    const last = calls.log.find((c) => c.op === "findFirst" && c.args.orderBy?.createdAt === "desc" && !c.args.where?.session)!;
    expect(last.args.where.role).toEqual({ in: ["USER", "ASSISTANT"] });
  });

  it("one exam for the hub strip", async () => {
    await loadPickupThread("u1", { examId: "e-ssc", now: NOW });
    const q = calls.log.find((c) => c.args.where?.session)!;
    expect(q.args.where.session).toEqual({ userId: "u1", examId: "e-ssc" });
  });

  it("never a school conversation, never someone else's, never an empty one", async () => {
    calls.latest.session.exam.category = "SCHOOL_BOARD";
    expect(await loadPickupThread("u1", { now: NOW })).toBeNull();
    calls.latest.session.exam.category = "GOVT_JOBS";
    calls.latest.session.userId = "u2";
    expect(await loadPickupThread("u1", { now: NOW })).toBeNull();
    calls.latest = null;
    expect(await loadPickupThread("u1", { now: NOW })).toBeNull();
  });

  it("a general chat and a mistake review's tag", async () => {
    calls.latest.session.exam = null;
    calls.latest.session.contextSnapshot = { reviewAttemptId: "a1abcdefg", reviewMockTitle: "SSC CGL Mock 2" };
    const t = await loadPickupThread("u1", { now: NOW });
    expect(t).toMatchObject({ examCode: null, examShort: null, reviewMockTitle: "SSC CGL Mock 2" });
  });
});

describe("loadPickupMock / loadPickup", () => {
  it("the last finished mock on an ACTIVE real exam within 30 days (a retired exam's chat links would not open)", async () => {
    const m = await loadPickupMock("u1", { now: NOW });
    const q = calls.log.find((c) => c.model === "attempt")!;
    expect(q.args.where.userId).toBe("u1");
    expect(q.args.where.status).toEqual({ in: ["SUBMITTED", "AUTO_SUBMITTED"] });
    expect(q.args.where.mock).toEqual({ exam: REAL_EXAM_WHERE });
    expect(q.args.where.mock.exam.active).toBe(true);
    expect(q.args.where.finishedAt.gte.getTime()).toBe(NOW.getTime() - 30 * DAY);
    expect(m).toMatchObject({ attemptId: "a1abcdefg", mockTitle: "SSC CGL Mock 2", scorePct: 55, examCode: "SSC_CGL" });
  });

  it("one exam for the hub; never a school attempt or someone else's", async () => {
    await loadPickupMock("u1", { examId: "e-ssc", now: NOW });
    expect(calls.log.find((c) => c.model === "attempt")!.args.where.mock).toEqual({ examId: "e-ssc" });
    calls.attempt.mock.exam.category = "SCHOOL_BOARD";
    expect(await loadPickupMock("u1", { now: NOW })).toBeNull();
    calls.attempt.mock.exam.category = "GOVT_JOBS";
    calls.attempt.userId = "u2";
    expect(await loadPickupMock("u1", { now: NOW })).toBeNull();
  });

  it("a failed half never hides the other", async () => {
    calls.attemptFails = true;
    const d = await loadPickup("u1", { now: NOW });
    expect(d.mock).toBeNull();
    expect(d.thread?.sessionId).toBe("s1abcdefg");
  });
});

describe("loadEmailQuestions (the mail line)", () => {
  it("one query for the batch: USER rows, general chats or active real exams, answered = a non-empty reply after it", async () => {
    calls.raw = [
      { userId: "u1", sessionId: "s1abcdefg", code: "SSC_CGL", content: "Next mistake", createdAt: hoursAgo(1), answered: false, isLastUser: true },
      { userId: "u1", sessionId: "s1abcdefg", code: "SSC_CGL", content: "Why is 1 not prime?", createdAt: hoursAgo(2), answered: true, isLastUser: false },
      { userId: "u2", sessionId: "s2abcdefg", code: null, content: "Which stream after Class 10?", createdAt: hoursAgo(5), answered: false, isLastUser: true },
      { userId: "u3", sessionId: "s3abcdefg", code: null, content: "Give me 3 practice questions on this", createdAt: hoursAgo(5), answered: true, isLastUser: true },
    ];
    const map = await loadEmailQuestions(["u1", "u2", "u3", "u1"], NOW);
    expect(calls.rawCalls).toHaveLength(1);
    const { sql, values } = calls.rawCalls[0];
    expect(sql).toContain(`s."userId" = ANY(?)`);
    expect(sql).toContain(`m.role = 'USER'`);
    expect(sql).toContain(`r.role = 'ASSISTANT'`);
    expect(sql).toContain(`btrim(r.content) <> ''`);
    expect(sql).toContain(`s."examId" IS NULL OR (?)`);
    // Whether the question is still its chat's last student turn (only then can Retry ask it).
    const flat = sql.replace(/\s+/g, " ");
    expect(flat).toContain(
      `NOT EXISTS ( SELECT 1 FROM "ChatMessage" u WHERE u."sessionId" = m."sessionId" AND u.role = 'USER' AND u."createdAt" > m."createdAt" ) AS "isLastUser"`,
    );
    expect(flat).toContain(`x.answered, x."isLastUser"`);
    expect(values).toContain(REAL_EXAM_SQL);
    expect(values[0]).toEqual(["u1", "u2", "u3"]);
    expect((values[1] as Date).getTime()).toBe(NOW.getTime() - 3 * DAY);
    expect(map.get("u1")).toMatchObject({ content: "Why is 1 not prime?", answered: true, isLastUser: false, examCode: "SSC_CGL" });
    expect(map.get("u2")).toMatchObject({ content: "Which stream after Class 10?", answered: false, isLastUser: true, examCode: null });
    expect(map.has("u3")).toBe(false); // only our own words → no line
  });

  it("a row without the flag is never taken as the last turn (no f=answer on a guess)", async () => {
    calls.raw = [{ userId: "u1", sessionId: "s1abcdefg", code: null, content: "Why is 1 not prime?", createdAt: hoursAgo(2), answered: false }];
    const map = await loadEmailQuestions(["u1"], NOW);
    expect(map.get("u1")).toMatchObject({ answered: false, isLastUser: false });
  });

  it("an empty batch reads nothing", async () => {
    expect((await loadEmailQuestions([], NOW)).size).toBe(0);
    expect(calls.rawCalls).toHaveLength(0);
  });
});

describe("GET /api/me/pickup", () => {
  const get = (qs: string) => GET(new Request(`https://shishya.in/api/me/pickup${qs}`));

  it("a guest gets 401 and nothing is read", async () => {
    const r = await get("?examCode=SSC_CGL");
    expect(r.status).toBe(401);
    expect(calls.log).toHaveLength(0);
    expect(r.headers.get("cache-control")).toBe("private, no-store");
  });

  it("an exam goes through realExamKey; unknown, school or inactive → 404; a bad code → 400", async () => {
    calls.session = { user: { id: "u1" } };
    calls.exam = null;
    expect((await get("?examCode=NCERT_C06")).status).toBe(404);
    expect(calls.log[0].args.where).toEqual({ code: "NCERT_C06", category: { not: "SCHOOL_BOARD" } });
    calls.exam = { id: "e-x", active: false };
    expect((await get("?examCode=MP_RAEO")).status).toBe(404);
    expect((await get("?examCode=bad%20code!")).status).toBe(400);
  });

  it("a member: this exam's card, in their language, private", async () => {
    calls.session = { user: { id: "u1" } };
    const r = await get("?examCode=SSC_CGL&lang=hi");
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("private, no-store");
    const j = (await r.json()) as { view: any };
    expect(j.view.title).toBe("जहाँ छोड़ा था, वहीं से शुरू करें");
    expect(j.view.question.answered).toBe(false);
    expect(j.view.question.primary.href).toBe("/chat?examCode=SSC_CGL&session=s1abcdefg&f=answer");
    expect(j.view.mock.href).toBe("/attempts/a1abcdefg/results");
    const threadRead = calls.log.find((c) => c.args.where?.session)!;
    expect(threadRead.args.where.session).toEqual({ userId: "u1", examId: "e-ssc" });
  });
});

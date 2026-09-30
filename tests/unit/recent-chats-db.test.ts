// The DB reads behind saved chats and the tutor's memory (30 Sep 2026) —
// src/lib/db/recent-chats.ts and src/lib/db/student-journey.ts against a
// stubbed Prisma. What it pins:
//   • every read is the member's own rows (userId in every where; a
//     conversation of another account is never reopened);
//   • the lists: one scope for an exam or school chat; general + ACTIVE real
//     exams (never school, never a retired exam /chat cannot reopen) for the
//     general chat and the dashboard; a conversation with no question is
//     skipped; most recently active first;
//   • a reopened chat loads its LAST 30 rows, oldest first, plus its opener;
//   • a review of this attempt: its tag, or (older chats) its exact seed text
//     between this attempt and the next one on the same exam;
//   • the memory loader: 30 days, no school sessions, not the conversation
//     being continued, no tutor text read, and a general chat reads no brief
//     or mock;
//   • (1 Oct 2026 review) reopening a chat marks seen ONLY the member's own
//     late answers it shows that are not seen yet (ASSISTANT rows with
//     lateAnswer, no lateSeenAt) — one idempotent write, none when there is
//     nothing to mark, none for someone else's conversation.
// No DB. Run: npx vitest run tests/unit/recent-chats-db.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  log: [] as Array<{ model: string; op: string; args: any }>,
  sessions: [] as any[],
  messages: [] as any[],
  unique: null as any,
  attempt: null as any,
  exam: { id: "e-ssc" } as any,
  raw: [] as Array<{ sql: string; values: unknown[] }>,
}));

function rec(model: string, op: string, result: (args: any) => unknown) {
  return async (args: any) => {
    calls.log.push({ model, op, args });
    return result(args);
  };
}

/** Prisma's findMany semantics the loaders rely on: where.sessionId.in / role, orderBy createdAt, distinct, take. */
function messagesFor(args: any) {
  let rows = calls.messages.filter((m) => (args.where?.sessionId?.in ? args.where.sessionId.in.includes(m.sessionId) : m.sessionId === args.where?.sessionId));
  if (args.where?.role) rows = rows.filter((m) => m.role === args.where.role);
  rows = [...rows].sort((a, b) => (args.orderBy?.createdAt === "desc" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt));
  if (args.distinct) {
    const seen = new Set<string>();
    rows = rows.filter((m) => (seen.has(m.sessionId) ? false : (seen.add(m.sessionId), true)));
  }
  return typeof args.take === "number" ? rows.slice(0, args.take) : rows;
}

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    chatSession: {
      findMany: rec("chatSession", "findMany", () => calls.sessions),
      findUnique: rec("chatSession", "findUnique", () => calls.unique),
      findFirst: rec("chatSession", "findFirst", () => calls.unique),
    },
    chatMessage: {
      findMany: rec("chatMessage", "findMany", messagesFor),
      findFirst: rec("chatMessage", "findFirst", (args) => messagesFor(args)[0] ?? null),
    },
    attempt: { findFirst: rec("attempt", "findFirst", () => calls.attempt) },
    exam: { findUnique: rec("exam", "findUnique", () => calls.exam) },
    dailyBrief: { findFirst: rec("dailyBrief", "findFirst", () => null) },
    $executeRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      calls.raw.push({ sql: strings.join("?"), values });
      return 1;
    },
  },
}));

import { Prisma } from "@prisma/client";
import { findMistakeReviewChat, listRecentChats, loadResumableChat } from "@/lib/db/recent-chats";
import { getStudentJourney } from "@/lib/db/student-journey";

const T0 = new Date("2026-09-30T06:00:00Z").getTime();
const at = (h: number) => new Date(T0 - h * 3600_000);
const msg = (sessionId: string, role: "USER" | "ASSISTANT", content: string, h: number, metadata: unknown = null) => ({
  id: `${sessionId}-${h}-${role}`,
  sessionId,
  role,
  content,
  metadata,
  createdAt: at(h),
});

beforeEach(() => {
  calls.log = [];
  calls.sessions = [];
  calls.messages = [];
  calls.unique = null;
  calls.attempt = null;
  calls.exam = { id: "e-ssc" };
  calls.raw = [];
});

describe("listRecentChats", () => {
  it("one exam's (or one class's) chats: that examId only, the member's own, 14 days", async () => {
    await listRecentChats("u1", { examId: "e-ssc" }, { limit: 5, now: new Date(T0) });
    const where = calls.log[0].args.where;
    expect(where.userId).toBe("u1");
    expect(where.examId).toBe("e-ssc");
    expect(where.OR).toBeUndefined();
    expect(where.updatedAt.gte.getTime()).toBe(T0 - 14 * 86_400_000);
  });
  it("the general chat and the dashboard: general + real exams, never a school session", async () => {
    calls.sessions = [
      { id: "g1", updatedAt: at(5), contextSnapshot: null, exam: null },
      { id: "x1", updatedAt: at(4), contextSnapshot: null, exam: { code: "SSC_CGL", shortName: "SSC CGL", category: "GOVT_JOBS" } },
      { id: "sc", updatedAt: at(1), contextSnapshot: null, exam: { code: "NCERT_C09", shortName: "NCERT 9", category: "SCHOOL_BOARD" } },
      { id: "empty", updatedAt: at(0.5), contextSnapshot: null, exam: null },
      { id: "rv", updatedAt: at(30), contextSnapshot: { reviewAttemptId: "a1", reviewMockTitle: "Full Mock 3" }, exam: { code: "SSC_CGL", shortName: "SSC CGL", category: "GOVT_JOBS" } },
    ];
    calls.messages = [
      msg("g1", "USER", "Which stream after Class 10?", 5),
      msg("x1", "USER", "What is a ratio?", 4),
      msg("x1", "ASSISTANT", "A ratio…", 3.9),
      msg("x1", "USER", "And a proportion?", 0.2),
      msg("sc", "USER", "What is matter?", 1),
      msg("rv", "USER", "I just took a SSC CGL mock and got 2 questions wrong. Go through my mistakes one by one.", 30),
      msg("rv", "ASSISTANT", "Mistake 1…", 29.9),
    ];
    const rows = await listRecentChats("u1", "general", { limit: 5, now: new Date(T0) });
    expect(calls.log[0].args.where.OR).toEqual([{ examId: null }, { exam: { active: true, category: { not: "SCHOOL_BOARD" } } }]);
    // Most recently active first (x1's last row is 12 minutes old), no school, no empty conversation.
    expect(rows.map((r) => r.id)).toEqual(["x1", "g1", "rv"]);
    expect(rows[0]).toMatchObject({ examCode: "SSC_CGL", examShort: "SSC CGL", opener: "What is a ratio?", lastRole: "USER" });
    expect(rows[0].lastAt.getTime()).toBe(at(0.2).getTime());
    expect(rows[1]).toMatchObject({ examCode: null, lastRole: "USER" });
    expect(rows[2]).toMatchObject({ lastRole: "ASSISTANT", reviewMockTitle: "Full Mock 3" });
    // Message reads are scoped to those sessions.
    for (const c of calls.log.filter((c) => c.model === "chatMessage")) expect(c.args.where.sessionId.in).toEqual(["g1", "x1", "sc", "empty", "rv"]);
    expect(await listRecentChats("u1", "not-school", { limit: 1, now: new Date(T0) })).toHaveLength(1);
  });
  it("the general chat and the dashboard never list a chat on an inactive exam (/chat cannot reopen it); its own scope still lists it", async () => {
    calls.sessions = [
      { id: "live", updatedAt: at(2), contextSnapshot: null, exam: { code: "SSC_CGL", shortName: "SSC CGL", category: "GOVT_JOBS", active: true } },
      { id: "retired", updatedAt: at(1), contextSnapshot: null, exam: { code: "OLD_EXAM", shortName: "Old", category: "GOVT_JOBS", active: false } },
    ];
    calls.messages = [msg("live", "USER", "What is a ratio?", 2), msg("retired", "USER", "What is a mean?", 1)];
    for (const scope of ["general", "not-school"] as const) {
      calls.log = [];
      const rows = await listRecentChats("u1", scope, { limit: 5, now: new Date(T0) });
      // The where asks for active real exams; the loop drops one that slips through.
      expect(calls.log[0].args.where.OR[1]).toEqual({ exam: { active: true, category: { not: "SCHOOL_BOARD" } } });
      expect(calls.log[0].args.select.exam.select.active).toBe(true);
      expect(rows.map((r) => r.id)).toEqual(["live"]);
    }
    // A school class's own list: its containers are inactive by design and stay listed.
    calls.sessions = [{ id: "sc", updatedAt: at(1), contextSnapshot: null, exam: { code: "NCERT_C09", shortName: "NCERT 9", category: "SCHOOL_BOARD", active: false } }];
    calls.messages = [msg("sc", "USER", "What is matter?", 1)];
    expect((await listRecentChats("u1", { examId: "e-c09" }, { limit: 5, now: new Date(T0) })).map((r) => r.id)).toEqual(["sc"]);
  });
  it("reads no message when there is no conversation", async () => {
    expect(await listRecentChats("u1", "general", { limit: 5 })).toEqual([]);
    expect(calls.log.filter((c) => c.model === "chatMessage")).toHaveLength(0);
  });
});

describe("loadResumableChat", () => {
  it("only the member's own conversation", async () => {
    calls.unique = { id: "s1", userId: "someone-else", examId: null, updatedAt: at(1), contextSnapshot: null, exam: null };
    calls.messages = [msg("s1", "USER", "hi", 1)];
    expect(await loadResumableChat("u1", "s1")).toBeNull();
    expect(calls.log.filter((c) => c.model === "chatMessage")).toHaveLength(0);
  });
  it("an empty conversation is not reopened", async () => {
    calls.unique = { id: "s1", userId: "u1", examId: null, updatedAt: at(1), contextSnapshot: null, exam: null };
    expect(await loadResumableChat("u1", "s1")).toBeNull();
  });
  it("the last 30 rows, oldest first, its opener and its scope", async () => {
    calls.unique = { id: "s1", userId: "u1", examId: "e-c09", updatedAt: at(40), contextSnapshot: null, exam: { code: "NCERT_C09", category: "SCHOOL_BOARD" } };
    calls.messages = Array.from({ length: 40 }, (_, i) => msg("s1", i % 2 ? "ASSISTANT" : "USER", `m${i}`, 40 - i));
    const r = await loadResumableChat("u1", "s1");
    expect(r).not.toBeNull();
    expect(r!.rows).toHaveLength(30);
    expect(r!.rows[0].content).toBe("m10");
    expect(r!.rows[29].content).toBe("m39");
    expect(r!.opener).toBe("m0");
    expect(r!).toMatchObject({ examId: "e-c09", examCode: "NCERT_C09", school: true });
    expect(r!.lastAt.getTime()).toBe(at(1).getTime());
    const read = calls.log.find((c) => c.model === "chatMessage" && c.op === "findMany")!;
    expect(read.args).toMatchObject({ where: { sessionId: "s1" }, orderBy: { createdAt: "desc" }, take: 30 });
    // No late answer among them: nothing is written.
    expect(calls.raw).toEqual([]);
  });
  it("marks seen only the late answers it shows that are not seen yet — one idempotent write (1 Oct 2026)", async () => {
    calls.unique = { id: "s1", userId: "u1", examId: null, updatedAt: at(1), contextSnapshot: null, exam: null };
    calls.messages = [
      msg("s1", "USER", "What is GDP?", 5, { turnId: "t1", lateAnsweredAt: T0 - 3600_000 }),
      msg("s1", "ASSISTANT", "GDP is…", 4.99, { lateAnswer: true, lateAnsweredAt: T0 - 3600_000 }),
      msg("s1", "USER", "And GNP?", 4, { turnId: "t2" }),
      msg("s1", "ASSISTANT", "GNP is…", 3.99, { lateAnswer: true, lateAnsweredAt: T0 - 7200_000, lateSeenAt: T0 - 60_000 }),
      msg("s1", "USER", "Thanks", 3),
      msg("s1", "ASSISTANT", "You're welcome", 2.99, { actions: null }),
      // A USER row carrying late fields is never marked.
      msg("s1", "USER", "One more?", 2, { lateAnswer: true }),
    ];
    const r = await loadResumableChat("u1", "s1");
    expect(r!.rows).toHaveLength(7);
    expect(calls.raw).toHaveLength(1);
    const { sql, values } = calls.raw[0];
    const flat = sql.replace(/\s+/g, " ");
    expect(flat).toContain(`UPDATE "ChatMessage" SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('lateSeenAt', ?::bigint)`);
    expect(flat).toContain(`WHERE id = ANY(?) AND role = 'ASSISTANT' AND metadata->>'lateSeenAt' IS NULL`);
    expect(values[1]).toEqual(["s1-4.99-ASSISTANT"]);
    // Reopened again once seen: nothing left to mark.
    calls.raw = [];
    calls.messages[1].metadata = { ...calls.messages[1].metadata, lateSeenAt: T0 };
    await loadResumableChat("u1", "s1");
    expect(calls.raw).toEqual([]);
    // Another account's conversation: never read, never marked.
    calls.unique = { ...calls.unique, userId: "u2" };
    calls.messages[1].metadata = { lateAnswer: true, lateAnsweredAt: T0 - 3600_000 };
    expect(await loadResumableChat("u1", "s1")).toBeNull();
    expect(calls.raw).toEqual([]);
  });
});

describe("findMistakeReviewChat", () => {
  const seed = "I just took a SSC CGL mock and got 2 questions wrong. Go through my mistakes one by one.";
  it("its tag, or the exact seed between this attempt and the next on the same exam", async () => {
    calls.attempt = { finishedAt: at(10) };
    calls.unique = { id: "s9", createdAt: at(20) };
    const r = await findMistakeReviewChat("u1", { attemptId: "a1", examId: "e-ssc", finishedAt: at(24), seed });
    expect(r).toEqual({ id: "s9", startedAt: at(20) });
    const next = calls.log.find((c) => c.model === "attempt")!.args;
    expect(next.where).toMatchObject({ userId: "u1", id: { not: "a1" }, mock: { examId: "e-ssc" }, finishedAt: { gt: at(24) } });
    const where = calls.log.find((c) => c.model === "chatSession")!.args.where;
    expect(where).toMatchObject({ userId: "u1", examId: "e-ssc" });
    expect(where.OR[0]).toEqual({ contextSnapshot: { path: ["reviewAttemptId"], equals: "a1" } });
    expect(where.OR[1]).toEqual({
      contextSnapshot: { equals: Prisma.DbNull },
      createdAt: { gte: at(24), lt: at(10) },
      messages: { some: { role: "USER", content: seed } },
    });
  });
  it("no later attempt: the window stays open; no finish time: the tag only", async () => {
    await findMistakeReviewChat("u1", { attemptId: "a1", examId: "e-ssc", finishedAt: at(24), seed });
    let where = calls.log.find((c) => c.model === "chatSession")!.args.where;
    expect(where.OR[1].createdAt).toEqual({ gte: at(24) });
    calls.log = [];
    await findMistakeReviewChat("u1", { attemptId: "a1", examId: "e-ssc", finishedAt: null, seed });
    expect(calls.log.find((c) => c.model === "attempt")).toBeUndefined();
    where = calls.log.find((c) => c.model === "chatSession")!.args.where;
    expect(where.OR).toHaveLength(1);
  });
});

describe("getStudentJourney — the memory loader", () => {
  it("30 days, own non-school sessions, not the one being continued; no tutor text read", async () => {
    calls.sessions = [
      { id: "a", updatedAt: at(3), exam: { shortName: "SSC CGL" } },
      { id: "b", updatedAt: at(30), exam: null },
    ];
    calls.messages = [
      msg("a", "USER", "why is option B wrong in Q4?", 3),
      msg("a", "ASSISTANT", "Because…", 2.9, { toolCalls: [{ args: { topic_code: "quant.ratio" } }] }),
      msg("b", "USER", "Which stream after Class 10?", 30),
    ];
    const j = await getStudentJourney("u1", "SSC_CGL", { excludeSessionId: "current" });
    const where = calls.log.find((c) => c.model === "chatSession")!.args.where;
    expect(where.userId).toBe("u1");
    expect(where.id).toEqual({ not: "current" });
    expect(where.OR).toEqual([{ examId: null }, { exam: { category: { not: "SCHOOL_BOARD" } } }]);
    expect(Date.now() - where.updatedAt.gte.getTime()).toBeGreaterThanOrEqual(30 * 86_400_000 - 5_000);
    const reads = calls.log.filter((c) => c.model === "chatMessage");
    expect(reads).toHaveLength(2);
    // The all-rows read selects no content; the text read is the student's rows only.
    expect(reads[0].args.select.content).toBeUndefined();
    expect(reads[1].args.where.role).toBe("USER");
    expect(j.examCode).toBe("SSC_CGL");
    expect(j.threads.map((t) => [t.sessionId, t.answered, t.topicCodes])).toEqual([
      ["a", true, ["quant.ratio"]],
      ["b", false, []],
    ]);
    // The newest conversation was answered: no offer (b's older unanswered question is information only).
    expect(j.offer).toBeNull();
    expect(calls.log.some((c) => c.model === "dailyBrief")).toBe(true);
    expect(calls.log.some((c) => c.model === "attempt")).toBe(true);
  });
  it("a general chat: by userId only — no exam, brief or mock read; no topic codes", async () => {
    calls.sessions = [{ id: "a", updatedAt: at(3), exam: { shortName: "SSC CGL" } }];
    calls.messages = [
      msg("a", "USER", "teach me ratios", 3),
      msg("a", "ASSISTANT", "Sure…", 2.9, { toolCalls: [{ args: { topic_code: "quant.ratio" } }] }),
    ];
    const j = await getStudentJourney("u1", null);
    expect(calls.log.some((c) => c.model === "exam" || c.model === "dailyBrief" || c.model === "attempt")).toBe(false);
    expect(calls.log.find((c) => c.model === "chatSession")!.args.where.id).toBeUndefined();
    expect(j.examCode).toBeNull();
    expect(j.threads[0].topicCodes).toEqual([]);
    expect(j.todayBrief).toBeNull();
    expect(j.lastMock).toBeNull();
  });
  it("an unknown exam code returns an empty journey", async () => {
    calls.exam = null;
    const j = await getStudentJourney("u1", "NOPE");
    expect(j.threads).toEqual([]);
    expect(calls.log.some((c) => c.model === "chatSession")).toBe(false);
  });
});

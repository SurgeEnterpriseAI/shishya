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
//     answer is private and never cached;
//   • (1 Oct 2026 review) the late-answer read: the member's own ASSISTANT
//     rows whose metadata path lateAnswer equals true, in the card's scope
//     (general + active real exams, or the hub's one exam), looking back the
//     card's 3 days plus the 7 days a question can wait for its late answer
//     (2 Oct 2026: it was the 72-hour window; since build 7b the 72 hours
//     run from the last send, up to the 7-day hard stop); never a school
//     chat; the question read is that conversation's USER row before the reply.
//   • (7 Oct 2026, B3) the card keeps a late answer 14 days (it was 3); the
//     hub's card reads it from all of the member's chats (the thread and the
//     mock stay the hub's exam); an answer the reopened chat would not show
//     (30+ rows after it) is not offered; GET /api/me/late-answer (the strip
//     under the header): a guest gets 401 and nothing is read, a member the
//     same line as the card, private, never cached, nothing written.
// No DB. Run: npx vitest run tests/unit/pickup-db.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  /** Rows stored after a reply: one number, or per session (B3 review). */
  rowsAfter: 0 as number | Record<string, number>,
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
      count: async (args: any) => {
        calls.log.push({ model: "chatMessage", op: "count", args });
        return typeof calls.rowsAfter === "number" ? calls.rowsAfter : (calls.rowsAfter[args.where?.sessionId] ?? 0);
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
import { loadEmailQuestions, loadPickup, loadPickupLateAnswer, loadPickupMock, loadPickupThread } from "@/lib/db/pickup";
import { GET } from "@/app/api/me/pickup/route";
import { GET as GET_LATE } from "@/app/api/me/late-answer/route";
import { LATE_HARD_STOP_MS } from "@/lib/tutor-late-answer";

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
  calls.rowsAfter = 0;
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

describe("loadPickupLateAnswer (1 Oct 2026)", () => {
  const late = (sessionId: string, h: number, answeredH: number, exam: any, extra: Record<string, unknown> = {}, userId = "u1") => ({
    sessionId,
    createdAt: hoursAgo(h),
    metadata: { lateAnswer: true, lateAnsweredAt: NOW.getTime() - answeredH * 3600_000, ...extra },
    session: { userId, exam },
  });
  const SSC = { code: "SSC_CGL", shortName: "SSC CGL", category: "GOVT_JOBS" };

  it("the member's own ASSISTANT late answers, in the card's scope, back 14 days + the 7-day hard stop; the question before the reply", async () => {
    calls.userRows = [
      late("s-school", 5, 1, { code: "NCERT_C09", shortName: "NCERT 9", category: "SCHOOL_BOARD" }),
      late("s-seen", 5, 1.5, SSC, { lateSeenAt: NOW.getTime() }),
      late("s-late", 6, 2, SSC),
      late("s-general", 7, 3, null),
    ];
    calls.lastRow = { content: "Why is 1 not prime?" };
    const la = await loadPickupLateAnswer("u1", { now: NOW });
    const q = calls.log.find((c) => c.model === "chatMessage" && c.op === "findMany")!;
    expect(q.args.where.role).toBe("ASSISTANT");
    expect(q.args.where.metadata).toEqual({ path: ["lateAnswer"], equals: true });
    expect(q.args.where.session).toEqual({ userId: "u1", OR: [{ examId: null }, { exam: REAL_EXAM_WHERE }] });
    // 2 Oct 2026: the card's days + the 7-day hard stop (it was + 72 hours).
    // 7 Oct 2026 (B3): the card's days are 14 (they were 3).
    expect(q.args.where.createdAt.gte.getTime()).toBe(NOW.getTime() - 14 * DAY - 7 * DAY);
    expect(q.args.where.createdAt.gte.getTime()).toBe(NOW.getTime() - 14 * DAY - LATE_HARD_STOP_MS);
    expect(q.args.orderBy).toEqual({ createdAt: "desc" });
    // The school row and the opened one never lead; the most recently answered of the rest does.
    expect(la).toMatchObject({ sessionId: "s-late", examCode: "SSC_CGL", examShort: "SSC CGL", question: "Why is 1 not prime?" });
    expect(la!.answeredAt.getTime()).toBe(NOW.getTime() - 2 * 3600_000);
    const qr = calls.log.find((c) => c.model === "chatMessage" && c.op === "findFirst" && c.args.where?.sessionId === "s-late")!;
    expect(qr.args.where).toEqual({ sessionId: "s-late", role: "USER", createdAt: { lt: hoursAgo(6) } });
    expect(qr.args.orderBy).toEqual({ createdAt: "desc" });
    // B3: the rows after the reply are counted (is it inside the chat's 30-row window?).
    const cnt = calls.log.find((c) => c.op === "count")!;
    expect(cnt.args.where).toEqual({ sessionId: "s-late", createdAt: { gt: hoursAgo(6) } });
  });

  it("a question answered on its 7th day (stored 6 days 23 hours ago, answered an hour ago) is inside the read and leads the card", async () => {
    // The repaired 26 Sep row is this case: re-sent on day 5, answered before the hard stop.
    const reply = late("s-day7", 6 * 24 + 23, 1, SSC);
    calls.userRows = [reply];
    calls.lastRow = { content: "Why is 1 not prime?" };
    const la = await loadPickupLateAnswer("u1", { now: NOW });
    const q = calls.log.find((c) => c.model === "chatMessage" && c.op === "findMany")!;
    expect(reply.createdAt.getTime()).toBeGreaterThanOrEqual(q.args.where.createdAt.gte.getTime());
    // The old floor (3 days + 72 hours) would have left it out.
    expect(reply.createdAt.getTime()).toBeLessThan(NOW.getTime() - 3 * DAY - 72 * 3600_000);
    expect(la).toMatchObject({ sessionId: "s-day7", question: "Why is 1 not prime?" });
    // An answer stored at the very end of the hard stop stays inside the read for the card's whole 14 days.
    const edge = new Date(NOW.getTime() - 14 * DAY - LATE_HARD_STOP_MS);
    expect(edge.getTime()).toBe(q.args.where.createdAt.gte.getTime());
  });

  it("the hub strip reads one exam; another account's rows and old answers never lead; nothing → null, no question read", async () => {
    calls.userRows = [late("s-theirs", 5, 1, SSC, {}, "u2"), late("s-old", 5, 15 * 24, SSC)];
    expect(await loadPickupLateAnswer("u1", { examId: "e-ssc", now: NOW })).toBeNull();
    const q = calls.log.find((c) => c.op === "findMany")!;
    expect(q.args.where.session).toEqual({ userId: "u1", examId: "e-ssc" });
    expect(calls.log.filter((c) => c.op === "findFirst")).toHaveLength(0);
    calls.userRows = [];
    expect(await loadPickupLateAnswer("u1", { now: NOW })).toBeNull();
  });

  it("B3: kept on the card 14 days — day 4 (two students reached the right hub on day 3.3 and 4.5) leads; day 15 does not", async () => {
    calls.lastRow = { content: "Why is 1 not prime?" };
    calls.userRows = [late("s-day4", 4 * 24 + 12, 4 * 24 + 11, SSC)];
    expect((await loadPickupLateAnswer("u1", { now: NOW }))?.sessionId).toBe("s-day4");
    calls.userRows = [late("s-day15", 15 * 24 + 1, 15 * 24, SSC)];
    expect(await loadPickupLateAnswer("u1", { now: NOW })).toBeNull();
  });

  it("B3: an answer the reopened chat would not show is not offered — 29 rows after it put its question outside the 30-row window; 28 still show both", async () => {
    calls.lastRow = { content: "Why is 1 not prime?" };
    calls.userRows = [late("s-busy", 6, 2, SSC)];
    for (const n of [30, 29]) {
      calls.rowsAfter = n;
      expect(await loadPickupLateAnswer("u1", { now: NOW }), String(n)).toBeNull();
    }
    calls.rowsAfter = 28;
    expect((await loadPickupLateAnswer("u1", { now: NOW }))?.sessionId).toBe("s-busy");
  });

  it("B3 review: one the chat cannot show is passed over for the next, never hiding it (up to 3 tries)", async () => {
    calls.lastRow = { content: "Why is 1 not prime?" };
    calls.userRows = [late("s-busy", 6, 1, SSC), late("s-next", 8, 2, SSC), late("s-third", 9, 3, SSC), late("s-fourth", 10, 4, SSC)];
    calls.rowsAfter = { "s-busy": 40 };
    expect((await loadPickupLateAnswer("u1", { now: NOW }))?.sessionId).toBe("s-next");
    calls.log = [];
    calls.rowsAfter = { "s-busy": 40, "s-next": 35, "s-third": 31 };
    expect(await loadPickupLateAnswer("u1", { now: NOW })).toBeNull();
    expect(calls.log.filter((c) => c.op === "count").map((c) => c.args.where.sessionId)).toEqual(["s-busy", "s-next", "s-third"]);
  });

  it("B3: the hub's card reads the late answer from all of the member's chats; the thread and the mock stay the hub's exam", async () => {
    await loadPickup("u1", { examId: "e-ssc", now: NOW });
    const lateRead = calls.log.find((c) => c.op === "findMany" && c.args.where?.metadata)!;
    expect(lateRead.args.where.session).toEqual({ userId: "u1", OR: [{ examId: null }, { exam: REAL_EXAM_WHERE }] });
    const threadRead = calls.log.find((c) => c.op === "findFirst" && c.args.where?.session)!;
    expect(threadRead.args.where.session).toEqual({ userId: "u1", examId: "e-ssc" });
    expect(calls.log.find((c) => c.model === "attempt")!.args.where.mock).toEqual({ examId: "e-ssc" });
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

describe("GET /api/me/late-answer (7 Oct 2026, B3 — the strip under the header)", () => {
  const get = (qs = "") => GET_LATE(new Request(`https://shishya.in/api/me/late-answer${qs}`));
  const SSC = { code: "SSC_CGL", shortName: "SSC CGL", category: "GOVT_JOBS" };
  afterEach(() => vi.useRealTimers());

  it("a guest gets 401 and nothing is read", async () => {
    const r = await get("?lang=en");
    expect(r.status).toBe(401);
    expect(calls.log).toHaveLength(0);
    expect(r.headers.get("cache-control")).toBe("private, no-store");
    expect(await r.json()).toEqual({ answered: null });
  });

  it("a member: the card's own line in their language — the card's read, every chat of theirs, nothing written", async () => {
    // The route reads the clock itself.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    calls.session = { user: { id: "u1" } };
    calls.userRows = [
      { sessionId: "s-late", createdAt: hoursAgo(30), metadata: { lateAnswer: true, lateAnsweredAt: NOW.getTime() - 2 * 3600_000 }, session: { userId: "u1", exam: SSC } },
    ];
    calls.lastRow = { content: "Why is 1 not prime?" };
    const r = await get("?lang=hi");
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("private, no-store");
    const j = (await r.json()) as { answered: any };
    expect(j.answered).toMatchObject({ label: "आपके सवाल का जवाब आ गया है", text: "Why is 1 not prime?", href: "/chat?examCode=SSC_CGL&session=s-late", cta: "जवाब देखें →" });
    const read = calls.log.find((c) => c.op === "findMany")!;
    expect(read.args.where.session).toEqual({ userId: "u1", OR: [{ examId: null }, { exam: REAL_EXAM_WHERE }] });
    expect(calls.rawCalls).toHaveLength(0);
  });

  it("nothing to show (or a failed read) is { answered: null }", async () => {
    calls.session = { user: { id: "u1" } };
    calls.userRows = [];
    expect(await (await get()).json()).toEqual({ answered: null });
  });
});

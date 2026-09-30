// POST /api/chat — what "the tutor remembers" (30 Sep 2026) changed in the
// route, run against the real handler with the DB, auth, cookies, rate limit
// and the model stubbed. What it pins:
//   • a signed-in GENERAL chat now loads the journey by userId only (examCode
//     null) and hands it to the tutor; a guest general chat loads none;
//   • the conversation being continued is left out of the journey;
//   • (review fix) a turn that is one of Shishya's own prompts reaches the
//     tutor with the memory's offer dropped (offer: null);
//   • a saved chat continued now has its updatedAt moved (at most every 30
//     minutes), so the Recent chats lists and the 30-day memory see it;
//   • a results-page review seed tags its NEW conversation with the attempt —
//     only the student's own attempt on this exam; a continued conversation
//     is never re-tagged and costs no attempt read;
//   • a memory read that fails never fails the turn.
// The school path (no journey, cap, scope) stays pinned in
// tests/unit/chat-school-route.test.ts. No network, no model call.
// Run: npx vitest run tests/unit/chat-resume-route.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  tutorCalls: [] as Array<Record<string, unknown>>,
  journeyCalls: [] as unknown[][],
  journeyFails: false,
  created: [] as Array<{ model: string; data: Record<string, unknown> }>,
  updates: [] as Array<{ model: string; args: Record<string, unknown> }>,
  attemptReads: [] as Array<Record<string, unknown>>,
  sessions: {} as Record<string, { id: string; userId: string; examId: string | null; updatedAt?: Date }>,
}));

const JOURNEY = {
  examCode: null,
  threads: [
    { sessionId: "old", startedAt: "2026-09-29T06:00:00Z", examShort: "", openingMessage: "Which stream after Class 10?", topicCodes: [], answered: true },
    { sessionId: "older", startedAt: "2026-09-29T05:00:00Z", examShort: "", openingMessage: "Explain compound interest", topicCodes: [], answered: false },
  ],
  offer: { text: "Explain compound interest" },
  topAskedTopics: [],
  todayBrief: null,
  lastMock: null,
  openActions: [],
};

vi.mock("@/lib/auth", () => ({ auth: async () => state.session }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }) }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: async () => ({ ok: true, limit: 30, remaining: 29, reset: 0 }),
  rateLimited: () => new Response("rate limited", { status: 429 }),
}));
vi.mock("@/lib/db/enrollment", () => ({ ensureEnrollment: async () => ({}) }));
vi.mock("@/lib/db/student-state", () => ({
  getStudentState: async (userId: string, examCode: string) => ({
    userId, examCode, examName: "SSC CGL Tier 1", preferredLang: "EN", enrolledAt: "2026-09-01T00:00:00.000Z", weaknesses: [], strengths: [], totalMocksTaken: 0,
  }),
}));
vi.mock("@/lib/db/student-journey", () => ({
  getStudentJourney: async (...args: unknown[]) => {
    state.journeyCalls.push(args);
    if (state.journeyFails) throw new Error("db timeout");
    return { ...JOURNEY, examCode: args[1] ?? null };
  },
}));
vi.mock("@/lib/db/syllabus", () => ({
  getSyllabusContext: async (code: string) => ({ examCode: code, examName: "SSC CGL Tier 1", examShortName: "SSC CGL", subjects: [] }),
}));
vi.mock("@/lib/ai", () => ({
  tutorStream: async function* (input: Record<string, unknown>) {
    state.tutorCalls.push(input);
    yield { delta: "Here is the answer." };
    yield { done: { reply: "Here is the answer.", suggestedActions: [] } };
  },
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    exam: {
      findUnique: async ({ where }: { where: { code?: string; category?: { not?: string } } }) =>
        where.code === "SSC_CGL" && where.category?.not === "SCHOOL_BOARD"
          ? { id: "e-ssc", code: "SSC_CGL", name: "SSC CGL Tier 1", shortName: "SSC CGL", category: "GOVT_JOBS", active: true }
          : null,
    },
    chatSession: {
      findUnique: async ({ where }: { where: { id: string } }) => state.sessions[where.id] ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        state.created.push({ model: "chatSession", data });
        return { id: "s-new", ...data };
      },
      update: async (args: Record<string, unknown>) => {
        state.updates.push({ model: "chatSession", args });
        return {};
      },
    },
    chatMessage: {
      count: async () => 0,
      findMany: async () => [],
      findFirst: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        state.created.push({ model: "chatMessage", data });
        return { id: `m${state.created.length}`, createdAt: new Date(), ...data };
      },
      update: async () => ({}),
    },
    attempt: {
      findFirst: async (args: { where: { id?: string; userId?: string; mock?: { examId?: string } } }) => {
        if (args.where.id) state.attemptReads.push(args.where);
        const w = args.where;
        return w.id === "a1" && w.userId === "u1" && w.mock?.examId === "e-ssc" ? { id: "a1", mock: { title: "SSC CGL Full Mock 3" } } : null;
      },
    },
    user: { findUnique: async () => ({ preferredLang: "EN", onbStage: "WORKING", onbPrepCodes: ["SSC_CGL"] }) },
    anonTutorLog: { create: async () => ({}) },
  },
}));

import { POST } from "@/app/api/chat/route";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36";
function post(body: Record<string, unknown>) {
  return POST(new Request("http://localhost/api/chat", { method: "POST", headers: { "content-type": "application/json", "user-agent": UA }, body: JSON.stringify(body) }));
}

beforeEach(() => {
  state.session = null;
  state.tutorCalls = [];
  state.journeyCalls = [];
  state.journeyFails = false;
  state.created = [];
  state.updates = [];
  state.attemptReads = [];
  state.sessions = {
    "s-old-general": { id: "s-old-general", userId: "u1", examId: null, updatedAt: new Date(Date.now() - 2 * 3600_000) },
    "s-fresh-ssc": { id: "s-fresh-ssc", userId: "u1", examId: "e-ssc", updatedAt: new Date(Date.now() - 5 * 60_000) },
    "s-old-ssc": { id: "s-old-ssc", userId: "u1", examId: "e-ssc", updatedAt: new Date(Date.now() - 26 * 3600_000) },
  };
});

describe("the journey in general chats", () => {
  it("a signed-in general chat loads it by userId only and hands it to the tutor", async () => {
    state.session = { user: { id: "u1" } };
    const res = await post({ general: true, message: "What should I study next?" });
    expect(await res.text()).not.toContain("event: error");
    expect(state.journeyCalls).toEqual([["u1", null, { excludeSessionId: "s-new" }]]);
    const call = state.tutorCalls[0] as { generalMode: boolean; journey: { threads: unknown[]; offer: unknown } };
    expect(call.generalMode).toBe(true);
    expect(call.journey.threads).toHaveLength(2);
    // A question the student typed keeps the offer the memory made.
    expect(call.journey.offer).toEqual({ text: "Explain compound interest" });
  });
  it("one of Shishya's own prompts (results seed, quick reply, weak-topic button) reaches the tutor with offer: null", async () => {
    state.session = { user: { id: "u1" } };
    const SEED = "I just took a SSC CGL mock and got 2 questions wrong. Go through my mistakes one by one: why the right answer is right, and how to get it next time.";
    for (const message of [SEED, "Next mistake", "I'm weak in Syllogism for SSC CGL. Tutor me on this topic."]) {
      state.tutorCalls = [];
      await (await post({ examCode: "SSC_CGL", message })).text();
      const call = state.tutorCalls[0] as { journey: { threads: unknown[]; offer: unknown } };
      expect(call.journey.offer).toBeNull();
      // The rest of the memory still rides along.
      expect(call.journey.threads).toHaveLength(2);
    }
  });
  it("a guest general chat loads none", async () => {
    const res = await post({ general: true, message: "What should I study next?" });
    expect(await res.text()).not.toContain("event: error");
    expect(state.journeyCalls).toEqual([]);
    expect((state.tutorCalls[0] as { journey: unknown }).journey).toBeUndefined();
  });
  it("an exam chat still loads it for its exam; the conversation being continued is left out", async () => {
    state.session = { user: { id: "u1" } };
    await (await post({ examCode: "SSC_CGL", message: "And the next one?", sessionId: "s-old-ssc" })).text();
    expect(state.journeyCalls).toEqual([["u1", "SSC_CGL", { excludeSessionId: "s-old-ssc" }]]);
  });
  it("a memory read that fails never fails the turn", async () => {
    state.session = { user: { id: "u1" } };
    state.journeyFails = true;
    const text = await (await post({ general: true, message: "What should I study next?" })).text();
    expect(text).not.toContain("event: error");
    expect(text).toContain("event: done");
    expect((state.tutorCalls[0] as { journey: unknown }).journey).toBeUndefined();
  });
});

describe("a saved chat continued now moves up the lists", () => {
  it("updatedAt moves when the conversation was last touched 30+ minutes ago", async () => {
    state.session = { user: { id: "u1" } };
    await (await post({ general: true, message: "Continuing from yesterday", sessionId: "s-old-general" })).text();
    expect(state.created.find((c) => c.model === "chatSession")).toBeUndefined();
    expect(state.updates).toHaveLength(1);
    const args = state.updates[0].args as { where: { id: string }; data: { updatedAt: Date } };
    expect(args.where).toEqual({ id: "s-old-general" });
    expect(Date.now() - args.data.updatedAt.getTime()).toBeLessThan(5_000);
  });
  it("not within 30 minutes, and never for a conversation created by this turn", async () => {
    state.session = { user: { id: "u1" } };
    await (await post({ examCode: "SSC_CGL", message: "next", sessionId: "s-fresh-ssc" })).text();
    await (await post({ examCode: "SSC_CGL", message: "a new question" })).text();
    expect(state.updates).toEqual([]);
  });
});

describe("a results-page review seed tags its new conversation", () => {
  const SEED = "I just took a SSC CGL mock and got 2 questions wrong. Go through my mistakes one by one: why the right answer is right, and how to get it next time.";
  it("the student's own attempt on this exam: tagged with it and its mock's title", async () => {
    state.session = { user: { id: "u1" } };
    await (await post({ examCode: "SSC_CGL", message: SEED, reviewAttemptId: "a1" })).text();
    expect(state.attemptReads).toEqual([{ id: "a1", userId: "u1", mock: { examId: "e-ssc" } }]);
    expect(state.created.find((c) => c.model === "chatSession")?.data).toEqual({
      userId: "u1",
      examId: "e-ssc",
      contextSnapshot: { reviewAttemptId: "a1", reviewMockTitle: "SSC CGL Full Mock 3" },
    });
  });
  it("someone else's attempt (or another exam's): no tag", async () => {
    state.session = { user: { id: "u2" } };
    await (await post({ examCode: "SSC_CGL", message: SEED, reviewAttemptId: "a1" })).text();
    expect(state.created.find((c) => c.model === "chatSession")?.data).toEqual({ userId: "u2", examId: "e-ssc" });
  });
  it("a continued conversation is never re-tagged and reads no attempt; a general chat never tags", async () => {
    state.session = { user: { id: "u1" } };
    await (await post({ examCode: "SSC_CGL", message: SEED, reviewAttemptId: "a1", sessionId: "s-fresh-ssc" })).text();
    await (await post({ general: true, message: SEED, reviewAttemptId: "a1" })).text();
    expect(state.attemptReads).toEqual([]);
    expect(state.created.filter((c) => c.model === "chatSession").map((c) => c.data)).toEqual([{ userId: "u1", examId: null }]);
  });
  it("rejects an over-long id before anything runs", async () => {
    state.session = { user: { id: "u1" } };
    const res = await post({ examCode: "SSC_CGL", message: SEED, reviewAttemptId: "x".repeat(65) });
    expect(res.status).toBe(400);
    expect(state.created).toEqual([]);
  });
});

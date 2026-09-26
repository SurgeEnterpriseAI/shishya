// POST /api/chat — the school tutor path (26 Sep 2026), run against the
// real route handler with the DB, auth, cookies, rate limit and the model
// stubbed. What it pins:
//   • a guest with a school code is 404 (the guest tutor never sees a class);
//   • a signed-in student on a Class 1-7 container is 404;
//   • a signed-in student on NCERT_C09 is served: the class is the syllabus,
//     the chapter focus carries the official link and OUR notes, the band
//     rides along, tools are off, and ensureEnrollment is NOT called;
//   • at 20 USER messages today the friendly line streams instead of a
//     model call, and nothing is written;
//   • a real exam is unchanged: enrolled, tools on, no school turn.
// Integrator, same day:
//   • a school turn from an account that never declared the age band is
//     refused with the band-required event (the class page asks it) — no
//     model, no write, no enrolment; the persona is never told a
//     declaration that was not made.
// Fixer review, same day:
//   • a declared 13-17 account (the school band) is refused the general and
//     every real-exam tutor with the localised line and its class chat —
//     no enrolment, no write, no model call; adult bands and undeclared
//     wizard accounts keep the exam tutor;
//   • the conversation the client names must be of the turn's scope: a
//     school turn sent with a general or exam session id lands on a fresh
//     school session (which the cap counts), and the reverse.
// No network, no model call. Run: npx vitest run tests/unit/chat-school-route.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  usedToday: 0,
  tutorCalls: [] as Array<Record<string, unknown>>,
  enrollCalls: [] as unknown[][],
  created: [] as Array<{ model: string; data: Record<string, unknown> }>,
  user: { preferredLang: "EN", onbStage: "CLASS_9_10", onbPrepCodes: ["NCERT_C09"] } as Record<string, unknown>,
}));

const EXAM_C09 = { id: "e-c09", code: "NCERT_C09", name: "NCERT Class 9", shortName: "NCERT 9", category: "SCHOOL_BOARD" };
const CHAPTERS = [
  { code: "iesc1.ch01", name: "Matter in Our Surroundings" },
  { code: "iesc1.ch02", name: "Is Matter Around Us Pure?" },
];
const SUBJECTS = [
  { code: "SCIENCE", name: "Science", weight: 1, exam: EXAM_C09, topics: CHAPTERS },
  { code: "MATHEMATICS", name: "Mathematics", weight: 1, exam: EXAM_C09, topics: [{ code: "iemh1.ch01", name: "Number Systems" }] },
];
/** Conversations the client may name: the account's general, school and exam sessions. */
const SESSIONS: Record<string, { id: string; userId: string; examId: string | null }> = {
  "s-general": { id: "s-general", userId: "u1", examId: null },
  "s-school": { id: "s-school", userId: "u1", examId: "e-c09" },
  "s-ssc": { id: "s-ssc", userId: "u1", examId: "e-ssc" },
};
/** A grown-up exam aspirant: the wizard's stage, a real exam's code, no school band. */
const ASPIRANT = { preferredLang: "EN", onbStage: "WORKING", onbPrepCodes: ["SSC_CGL"] };
const NOTE =
  "# Matter in Our Surroundings\n\n## Big idea\nEverything around us is made of matter.\n\n## Read the official chapter\nRead the chapter in the official NCERT book: https://ncert.nic.in/textbook/pdf/iesc101.pdf\n";

vi.mock("@/lib/auth", () => ({ auth: async () => state.session }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }) }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: async () => ({ ok: true, limit: 30, remaining: 29, reset: 0 }),
  rateLimited: () => new Response("rate limited", { status: 429 }),
}));
vi.mock("@/lib/db/enrollment", () => ({
  ensureEnrollment: async (...args: unknown[]) => {
    state.enrollCalls.push(args);
    return {};
  },
}));
vi.mock("@/lib/db/student-state", () => ({
  getStudentState: async (userId: string, examCode: string) => ({
    userId,
    examCode,
    examName: "SSC CGL Tier 1",
    preferredLang: "EN",
    enrolledAt: "2026-09-01T00:00:00.000Z",
    weaknesses: [],
    strengths: [],
    totalMocksTaken: 0,
  }),
}));
vi.mock("@/lib/db/student-journey", () => ({
  getStudentJourney: async (_u: string, examCode: string) => ({ examCode, threads: [], topAskedTopics: [], todayBrief: null, lastMock: null, openActions: [] }),
}));
vi.mock("@/lib/db/syllabus", () => ({
  getSyllabusContext: async (code: string) => ({ examCode: code, examName: "SSC CGL Tier 1", examShortName: "SSC CGL", subjects: [] }),
}));
vi.mock("@/lib/ai", () => ({
  tutorStream: async function* (input: Record<string, unknown>) {
    state.tutorCalls.push(input);
    yield { delta: "Hint: what is the first step you would try?" };
    yield { done: { reply: "Hint: what is the first step you would try?", suggestedActions: [] } };
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
    subject: {
      findMany: async ({ where }: { where: { exam?: { category?: string; code?: string } } }) =>
        where.exam?.category === "SCHOOL_BOARD" && where.exam?.code === "NCERT_C09" ? SUBJECTS : [],
    },
    topic: {
      findFirst: async ({ where }: { where: { code?: string; parentId?: null; subject?: { exam?: { category?: string; code?: string }; examId?: string } } }) => {
        if (where.subject?.exam?.category === "SCHOOL_BOARD" && where.subject.exam.code === "NCERT_C09" && where.code === "iesc1.ch01" && where.parentId === null) {
          return {
            code: "iesc1.ch01",
            name: "Matter in Our Surroundings",
            teachingNote: { content: NOTE },
            children: [],
            subject: { code: "SCIENCE", name: "Science", topics: CHAPTERS },
          };
        }
        return null;
      },
    },
    knowledgeSource: {
      findFirst: async ({ where }: { where: { examCode?: string; topicCode?: string } }) =>
        where.examCode === "NCERT_C09" && where.topicCode === "iesc1.ch01" ? { url: "https://ncert.nic.in/textbook/pdf/iesc101.pdf" } : null,
    },
    chatSession: {
      findUnique: async ({ where }: { where: { id: string } }) => SESSIONS[where.id] ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        state.created.push({ model: "chatSession", data });
        return { id: "s1", ...data };
      },
    },
    chatMessage: {
      count: async () => state.usedToday,
      findMany: async () => [],
      findFirst: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        state.created.push({ model: "chatMessage", data });
        return { id: `m${state.created.length}`, createdAt: new Date(), ...data };
      },
      update: async () => ({}),
    },
    attempt: { findFirst: async () => null },
    user: { findUnique: async () => state.user },
    anonTutorLog: { create: async () => ({}) },
  },
}));

import { POST } from "@/app/api/chat/route";
import { SCHOOL_TUTOR_CAP_COPY } from "@/lib/school/tutor-cap";
import { SCHOOL_BAND_REQUIRED_CODE, SCHOOL_BAND_REQUIRED_COPY, SCHOOL_ONLY_TUTOR_CODE, SCHOOL_ONLY_TUTOR_COPY } from "@/lib/school/tutor-scope";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36";

function post(body: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": UA },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  state.session = null;
  state.usedToday = 0;
  state.tutorCalls = [];
  state.enrollCalls = [];
  state.created = [];
  state.user = { preferredLang: "EN", onbStage: "CLASS_9_10", onbPrepCodes: ["NCERT_C09"] };
});

describe("POST /api/chat — school containers", () => {
  it("a guest with NCERT_C09 is 404 (unknown exam), and no model is called", async () => {
    const res = await post({ examCode: "NCERT_C09", message: "Explain matter" });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "exam not found" });
    expect(state.tutorCalls).toHaveLength(0);
    expect(state.created).toHaveLength(0);
  });

  it("a signed-in student on NCERT_C05 is 404 — Classes 1-7 have no tutor", async () => {
    state.session = { user: { id: "u1" } };
    const res = await post({ examCode: "NCERT_C05", message: "Explain matter" });
    expect(res.status).toBe(404);
    expect(state.tutorCalls).toHaveLength(0);
    expect(state.enrollCalls).toHaveLength(0);
  });

  it("a signed-in student on NCERT_C09 is served the school tutor: class syllabus, chapter focus, band, tools off, no enrolment", async () => {
    state.session = { user: { id: "u1" } };
    const res = await post({ examCode: "NCERT_C09", topicCode: "iesc1.ch01", message: "What is matter?" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const text = await res.text();
    expect(text).toContain(`event: meta\ndata: {"sessionId":"s1"}`);
    expect(text).toContain("event: delta");
    expect(text).toContain("event: done");
    expect(text).not.toContain("event: error");

    expect(state.tutorCalls).toHaveLength(1);
    const call = state.tutorCalls[0] as {
      school: { scope: { cls: number; examCode: string; classPath: string; subjects: { code: string; chapters: unknown[] }[] }; focus: Record<string, unknown>; band: string };
      syllabus: { examCode: string; subjects: { code: string }[] };
      ctx: unknown;
      generalMode: boolean;
      journey: unknown;
    };
    expect(call.school.scope.cls).toBe(9);
    expect(call.school.scope.examCode).toBe("NCERT_C09");
    expect(call.school.scope.classPath).toBe("/schooling/cbse/class-9");
    expect(call.school.scope.subjects.map((s) => s.code)).toEqual(["SCIENCE", "MATHEMATICS"]);
    expect(call.school.scope.subjects[0].chapters).toHaveLength(2);
    expect(call.school.focus).toMatchObject({
      code: "iesc1.ch01",
      name: "Matter in Our Surroundings",
      subjectName: "Science",
      path: "/schooling/cbse/class-9/science/matter-in-our-surroundings",
      officialUrl: "https://ncert.nic.in/textbook/pdf/iesc101.pdf",
    });
    // Our notes, prepared: no H1, no official-link section, no textbook text.
    expect(call.school.focus.notes).toContain("Everything around us is made of matter.");
    expect(call.school.focus.notes).not.toContain("# Matter in Our Surroundings");
    expect(call.school.focus.notes).not.toContain("Read the official chapter");
    expect(call.school.band).toBe("STUDENT_13_17");
    expect(call.syllabus.examCode).toBe("NCERT_C09");
    expect(call.syllabus.subjects.map((s) => s.code)).toEqual(["SCIENCE", "MATHEMATICS"]);
    expect(call.ctx).toBeUndefined();
    expect(call.generalMode).toBe(false);
    expect(call.journey).toBeUndefined();

    // No enrolment from the chat; the conversation is stored on the container.
    expect(state.enrollCalls).toHaveLength(0);
    const session = state.created.find((c) => c.model === "chatSession");
    expect(session?.data).toMatchObject({ userId: "u1", examId: "e-c09" });
    const roles = state.created.filter((c) => c.model === "chatMessage").map((c) => c.data.role);
    expect(roles).toEqual(["USER", "ASSISTANT"]);
  });

  it("without a declared band the school turn is refused with the band-required event — no model, no write, no enrolment (integrator)", async () => {
    state.session = { user: { id: "u1" } };
    for (const user of [
      { preferredLang: "EN", onbStage: null, onbPrepCodes: [] },
      // The exam wizard's stage alone is no declaration (no school code).
      { preferredLang: "EN", onbStage: "CLASS_9_10", onbPrepCodes: ["SSC_CGL"] },
    ]) {
      state.user = user;
      state.tutorCalls = [];
      const res = await post({ examCode: "NCERT_C09", topicCode: "iesc1.ch01", message: "hi", sessionId: "s-school" });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");
      expect(await res.text()).toBe(
        `event: error\ndata: ${JSON.stringify({ error: SCHOOL_BAND_REQUIRED_COPY.en, code: SCHOOL_BAND_REQUIRED_CODE, next: "/schooling/cbse/class-9?from=school" })}\n\n`,
      );
      expect(state.tutorCalls).toHaveLength(0);
      expect(state.created).toHaveLength(0);
      expect(state.enrollCalls).toHaveLength(0);
    }
  });

  it("at 20 USER messages today the friendly line streams — no model call, nothing written", async () => {
    state.session = { user: { id: "u1" } };
    state.usedToday = 20;
    const res = await post({ examCode: "NCERT_C09", topicCode: "iesc1.ch01", message: "One more?", sessionId: "s-old" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const text = await res.text();
    expect(text).toContain(`event: meta\ndata: {"sessionId":"s-old"}`);
    expect(text).toContain(JSON.stringify(SCHOOL_TUTOR_CAP_COPY.en));
    expect(text).toContain('"code":"school-daily-cap"');
    expect(text).not.toContain("event: error");
    expect(state.tutorCalls).toHaveLength(0);
    expect(state.created).toHaveLength(0);
    expect(state.enrollCalls).toHaveLength(0);
  });

  it("at 19 the turn goes through", async () => {
    state.session = { user: { id: "u1" } };
    state.usedToday = 19;
    const res = await post({ examCode: "NCERT_C09", message: "Last one" });
    expect(res.status).toBe(200);
    await res.text();
    expect(state.tutorCalls).toHaveLength(1);
  });
});

describe("POST /api/chat — a real exam is unchanged", () => {
  it("a signed-in SSC CGL chat enrols, runs with tools, and carries no school turn", async () => {
    state.session = { user: { id: "u1" } };
    state.user = { ...ASPIRANT };
    const res = await post({ examCode: "SSC_CGL", message: "Teach me percentages" });
    expect(res.status).toBe(200);
    await res.text();
    expect(state.enrollCalls).toHaveLength(1);
    expect(state.enrollCalls[0][0]).toBe("u1");
    expect(state.enrollCalls[0][1]).toMatchObject({ id: "e-ssc", code: "SSC_CGL", category: "GOVT_JOBS" });
    const call = state.tutorCalls[0] as { school: unknown; ctx: unknown };
    expect(call.school).toBeUndefined();
    expect(call.ctx).toEqual({ userId: "u1", examCode: "SSC_CGL" });
  });

  it("a guest SSC CGL chat still runs tools-off with no enrolment; a guest general chat too", async () => {
    const res = await post({ examCode: "SSC_CGL", message: "Teach me percentages", history: [] });
    expect(res.status).toBe(200);
    await res.text();
    expect(state.enrollCalls).toHaveLength(0);
    expect((state.tutorCalls[0] as { ctx: unknown; school: unknown }).ctx).toBeUndefined();
    expect((state.tutorCalls[0] as { ctx: unknown; school: unknown }).school).toBeUndefined();
    const general = await post({ general: true, message: "Which exam should I pick?" });
    expect(general.status).toBe(200);
    await general.text();
    expect((state.tutorCalls[1] as { generalMode: boolean; school: unknown }).generalMode).toBe(true);
    expect((state.tutorCalls[1] as { generalMode: boolean; school: unknown }).school).toBeUndefined();
  });
});

describe("POST /api/chat — a declared 13-17 student gets the school tutor only (26 Sep 2026 fixer review)", () => {
  const refused = (text: string) => {
    expect(text).toBe(
      `event: error\ndata: ${JSON.stringify({ error: SCHOOL_ONLY_TUTOR_COPY.en, code: SCHOOL_ONLY_TUTOR_CODE, next: "/chat?examCode=NCERT_C09" })}\n\n`,
    );
    expect(state.tutorCalls).toHaveLength(0);
    expect(state.enrollCalls).toHaveLength(0);
    expect(state.created).toHaveLength(0);
  };

  it("the general tutor is refused with the line and the class chat — no model, no write", async () => {
    state.session = { user: { id: "u1" } };
    const res = await post({ general: true, message: "Which exam should I pick?" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    refused(await res.text());
  });

  it("a real exam's tutor is refused BEFORE enrolment — the child is never enrolled on SSC CGL", async () => {
    state.session = { user: { id: "u1" } };
    const res = await post({ examCode: "SSC_CGL", message: "Teach me percentages", sessionId: "s-ssc" });
    expect(res.status).toBe(200);
    refused(await res.text());
  });

  it("the class chat itself is served as before", async () => {
    state.session = { user: { id: "u1" } };
    const res = await post({ examCode: "NCERT_C09", message: "What is matter?" });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain("event: error");
    expect(state.tutorCalls).toHaveLength(1);
  });

  it("a parent (adult school band) and an undeclared wizard Class 9-10 account keep the exam tutor", async () => {
    state.session = { user: { id: "u1" } };
    state.user = { preferredLang: "EN", onbStage: "SCHOOL_PARENT", onbPrepCodes: ["NCERT_C09"] };
    let res = await post({ examCode: "SSC_CGL", message: "Teach me percentages" });
    expect(res.status).toBe(200);
    expect(await res.text()).not.toContain("event: error");
    expect(state.enrollCalls).toHaveLength(1);
    expect(state.tutorCalls).toHaveLength(1);

    // The wizard's CLASS_9_10 with no school container code never declared an age.
    state.user = { preferredLang: "EN", onbStage: "CLASS_9_10", onbPrepCodes: ["SSC_CGL"] };
    res = await post({ general: true, message: "hi" });
    expect(await res.text()).not.toContain("event: error");
    expect(state.tutorCalls).toHaveLength(2);
  });
});

describe("POST /api/chat — the conversation the client names must be of the turn's scope (26 Sep 2026 fixer review)", () => {
  it("a school turn sent with a GENERAL session id lands on a fresh school session — the cap counts it", async () => {
    state.session = { user: { id: "u1" } };
    const res = await post({ examCode: "NCERT_C09", message: "What is matter?", sessionId: "s-general" });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain(`event: meta\ndata: {"sessionId":"s1"}`);
    const session = state.created.find((c) => c.model === "chatSession");
    expect(session?.data).toMatchObject({ userId: "u1", examId: "e-c09" });
    const user = state.created.find((c) => c.model === "chatMessage" && c.data.role === "USER");
    expect(user?.data.sessionId).toBe("s1");
  });

  it("a school turn in the account's own school session continues there", async () => {
    state.session = { user: { id: "u1" } };
    const res = await post({ examCode: "NCERT_C09", message: "And then?", sessionId: "s-school" });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(`event: meta\ndata: {"sessionId":"s-school"}`);
    expect(state.created.find((c) => c.model === "chatSession")).toBeUndefined();
    const user = state.created.find((c) => c.model === "chatMessage" && c.data.role === "USER");
    expect(user?.data.sessionId).toBe("s-school");
  });

  it("an exam turn sent with a SCHOOL session id never lands on it", async () => {
    state.session = { user: { id: "u1" } };
    state.user = { ...ASPIRANT };
    const res = await post({ examCode: "SSC_CGL", message: "Teach me percentages", sessionId: "s-school" });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(`event: meta\ndata: {"sessionId":"s1"}`);
    expect(state.created.find((c) => c.model === "chatSession")?.data).toMatchObject({ userId: "u1", examId: "e-ssc" });
  });

  it("a general turn sent with an EXAM session id starts a general one", async () => {
    state.session = { user: { id: "u1" } };
    state.user = { ...ASPIRANT };
    const res = await post({ general: true, message: "hi", sessionId: "s-ssc" });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(`event: meta\ndata: {"sessionId":"s1"}`);
    expect(state.created.find((c) => c.model === "chatSession")?.data).toMatchObject({ userId: "u1", examId: null });
  });
});

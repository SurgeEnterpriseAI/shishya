// POST /api/chat — the "saved, we'll answer it here" promise and the Retry
// that meets the late-answer run (1 Oct 2026 review), run against the real
// route handler with the DB, auth, cookies, rate limit and the model stubbed.
// What it pins:
//   • the failed mark MERGES into the row (late fields survive) and the
//     promise ("tutor-unavailable…" code) is sent ONLY when that mark landed;
//     when it did not, the student gets the plain "Something went wrong"
//     line and nothing is promised;
//   • an AI outage records latePromised (and emailPromised); our own failure
//     ("other") records no promise; a guest is never marked;
//   • a Retry of a failed turn reuses its row with ONE conditional write
//     (never while a late answer is stored or a live late claim holds it);
//     when that write does not land, the turn waits for the late run's reply
//     and replays it — note flag included — instead of calling the model.
// No network, no model call. Run: npx vitest run tests/unit/chat-late-promise-route.test.ts

import Anthropic from "@anthropic-ai/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  tutorCalls: [] as Array<Record<string, unknown>>,
  tutorError: null as unknown,
  emailable: true,
  raw: [] as Array<{ sql: string; values: unknown[] }>,
  rawResults: [] as number[],
  rows: [] as any[],
  waitRow: null as any,
  waitAfter: null as any,
  created: [] as Array<{ model: string; data: Record<string, unknown> }>,
}));

vi.mock("@/lib/auth", () => ({ auth: async () => state.session }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }) }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: async () => ({ ok: true, limit: 30, remaining: 29, reset: 0 }),
  rateLimited: () => new Response("rate limited", { status: 429 }),
}));
vi.mock("@/lib/db/enrollment", () => ({ ensureEnrollment: async () => ({}) }));
vi.mock("@/lib/db/student-journey", () => ({ getStudentJourney: async () => null }));
vi.mock("@/lib/db/tutor-answer-email", () => ({ tutorAnswerEmailable: async () => state.emailable }));
vi.mock("@/lib/ai", () => ({
  tutorStream: async function* (input: Record<string, unknown>) {
    state.tutorCalls.push(input);
    if (state.tutorError) throw state.tutorError;
    yield { delta: "Here is the answer." };
    yield { done: { reply: "Here is the answer.", suggestedActions: [] } };
  },
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    exam: { findUnique: async () => null },
    chatSession: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === "s1" ? { id: "s1", userId: "u1", examId: null, updatedAt: new Date(Date.now() - 60_000) } : null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        state.created.push({ model: "chatSession", data });
        return { id: "s-new", ...data };
      },
      update: async () => ({}),
    },
    chatMessage: {
      findMany: async () => state.rows,
      findFirst: async () => state.waitAfter,
      findUnique: async () => state.waitRow,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        state.created.push({ model: "chatMessage", data });
        return { id: `m${state.created.length}`, createdAt: new Date(), ...data };
      },
    },
    attempt: { findFirst: async () => null },
    user: { findUnique: async () => ({ preferredLang: "EN", onbStage: "WORKING", onbPrepCodes: ["SSC_CGL"] }) },
    anonTutorLog: { create: async () => ({}) },
    $executeRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      state.raw.push({ sql: strings.join("?").replace(/\s+/g, " "), values });
      return state.rawResults.length ? state.rawResults.shift()! : 1;
    },
  },
}));

import { POST } from "@/app/api/chat/route";
import { TUTOR_UNAVAILABLE_CODE } from "@/lib/tutor-unavailable";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36";
function post(body: Record<string, unknown>) {
  return POST(new Request("http://localhost/api/chat", { method: "POST", headers: { "content-type": "application/json", "user-agent": UA }, body: JSON.stringify(body) }));
}
const creditError = () =>
  Anthropic.APIError.generate(
    400,
    { type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits." } },
    "credit",
    {} as any,
  );
function errorFrame(text: string): Record<string, unknown> {
  const m = text.match(/event: error\ndata: (.*)\n\n/);
  expect(m, text).not.toBeNull();
  return JSON.parse(m![1]);
}

beforeEach(() => {
  state.session = { user: { id: "u1" } };
  state.tutorCalls = [];
  state.tutorError = creditError();
  state.emailable = true;
  state.raw = [];
  state.rawResults = [];
  state.rows = [];
  state.waitRow = null;
  state.waitAfter = null;
  state.created = [];
});

describe("the promise is made only when the failed mark landed", () => {
  it("an outage, mark landed, mailable: the email promise; the mark merges and records the promise", async () => {
    const f = errorFrame(await (await post({ general: true, message: "What is GDP?", turnId: "t1" })).text());
    expect(f.code).toBe(TUTOR_UNAVAILABLE_CODE.memberEmail);
    expect(String(f.error)).toContain("Your question is saved — we'll answer it here as soon as it's back, and email you.");
    expect(state.raw).toHaveLength(1);
    expect(state.raw[0].sql).toContain(`UPDATE "ChatMessage" SET metadata = COALESCE(metadata, '{}'::jsonb) || ?::jsonb WHERE id = ?`);
    const patch = JSON.parse(state.raw[0].values[0] as string);
    expect(patch).toMatchObject({ turnId: "t1", failedReason: "credit", latePromised: true, emailPromised: true, replyLang: "EN" });
    expect(typeof patch.failedAt).toBe("number");
  });

  it("an outage whose mark did NOT land: the plain line, no code, nothing promised", async () => {
    state.rawResults = [0];
    const f = errorFrame(await (await post({ general: true, message: "What is GDP?", turnId: "t1" })).text());
    expect(f.code).toBeUndefined();
    expect(f.error).toBe("Something went wrong on our side — please try sending that again.");
  });

  it("not mailable: saved and answered here, no email promised", async () => {
    state.emailable = false;
    const f = errorFrame(await (await post({ general: true, message: "What is GDP?" })).text());
    expect(f.code).toBe(TUTOR_UNAVAILABLE_CODE.member);
    expect(String(f.error)).not.toMatch(/email/i);
    expect(JSON.parse(state.raw[0].values[0] as string)).toMatchObject({ latePromised: true, emailPromised: false });
  });

  it("our own failure promises nothing and records no promise", async () => {
    state.tutorError = new TypeError("x is undefined");
    const f = errorFrame(await (await post({ general: true, message: "What is GDP?" })).text());
    expect(f.code).toBeUndefined();
    const patch = JSON.parse(state.raw[0].values[0] as string);
    expect(patch.failedReason).toBe("other");
    expect(patch.latePromised).toBeUndefined();
    expect(patch.emailPromised).toBeUndefined();
  });

  it("a guest is never marked; the guest code lets the browser keep the question", async () => {
    state.session = null;
    const f = errorFrame(await (await post({ general: true, message: "What is GDP?" })).text());
    expect(f.code).toBe(TUTOR_UNAVAILABLE_CODE.guest);
    expect(state.raw).toEqual([]);
  });
});

describe("a Retry meets the late-answer run", () => {
  const failed = (extra: Record<string, unknown> = {}) => ({
    id: "q1",
    sessionId: "s1",
    role: "USER",
    content: "What is GDP?",
    createdAt: new Date(Date.now() - 3 * 3600_000),
    metadata: { turnId: "t1", failedAt: Date.now() - 3 * 3600_000, failedReason: "credit", latePromised: true, lateTries: 1, ...extra },
  });

  it("the reuse is ONE conditional, merging write; when it lands the tutor answers as before", async () => {
    state.tutorError = null;
    state.rows = [failed()];
    const text = await (await post({ general: true, sessionId: "s1", message: "What is GDP?", retry: true, turnId: "t1" })).text();
    expect(text).toContain("event: done");
    expect(state.tutorCalls).toHaveLength(1);
    const reuse = state.raw[0];
    expect(reuse.sql).toContain(
      `SET metadata = (COALESCE(metadata, '{}'::jsonb) - 'failedAt' - 'lateClaimAt') || ?::jsonb WHERE id = ? AND metadata->>'lateAnsweredAt' IS NULL AND (metadata->>'lateClaimAt' IS NULL OR (metadata->>'lateClaimAt')::bigint < ?::bigint)`,
    );
    expect(JSON.parse(reuse.values[0] as string)).toMatchObject({ turnId: "t1" });
    expect(reuse.values[1]).toBe("q1");
    // No second USER row.
    expect(state.created.filter((c) => c.model === "chatMessage" && c.data.role === "USER")).toEqual([]);
  });

  it("when the late run holds the row, the Retry waits and replays its reply — with the note — and never calls the model", async () => {
    state.tutorError = null;
    state.rows = [failed()];
    state.rawResults = [0];
    const q = failed({ failedAt: undefined, lateAnsweredAt: Date.now() - 1000 });
    state.waitRow = { ...q, metadata: { turnId: "t1", lateAnsweredAt: Date.now() - 1000 } };
    state.waitAfter = {
      id: "a1",
      sessionId: "s1",
      role: "ASSISTANT",
      content: "GDP is the value of all final goods and services…",
      createdAt: new Date(q.createdAt.getTime() + 1),
      metadata: { lateAnswer: true, actions: [], toolCalls: [] },
    };
    const text = await (await post({ general: true, sessionId: "s1", message: "What is GDP?", retry: true, turnId: "t1" })).text();
    expect(state.tutorCalls).toEqual([]);
    expect(text).toContain("GDP is the value of all final goods and services");
    const done = JSON.parse(text.match(/event: done\ndata: (.*)\n\n/)![1]);
    expect(done).toMatchObject({ messageId: "a1", replayed: true, lateAnswer: true });
    // Only the one conditional write was tried; nothing marked failed.
    expect(state.raw).toHaveLength(1);
  }, 15_000);
});

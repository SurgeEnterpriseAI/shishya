// Honest words, no provider text (2 Oct 2026) — resilience plan, build 1.
//
// The Anthropic credit is topped up by hand, so the balance is sometimes
// zero; every model call then fails at once with HTTP 400 "Your credit
// balance is too low … Plans & Billing". That 400 looked like one of our own
// validation errors, so Explain and the mock player's translation printed the
// provider's billing text to students, and other surfaces said "a few
// minutes" / "in a moment" / "Network hiccup".
//
// Pinned here, with the SDK's own credit error fed to each route:
//   1. the helper: what counts as "the AI is unavailable", what is one of our
//      own validation errors, and the 503 { code: "ai-unavailable", error } body;
//   2. every route build 1 names — explain, mock translation, results
//      translation, fresh questions, the free-text mock, the essay evaluator,
//      /ask (JSON and stream) — answers the fixed line and never the provider
//      text; a validation 400 is unchanged; a non-outage failure never says
//      "unavailable";
//   3. one analytics row per failure, never for Class 1-7, no anon id on a
//      school row, and the admin click count leaves the rows out;
//   4. the copy: no "busy", "updating", "hiccup", "few minutes", "moment";
//   5. the pages read the CODE (Ask keeps "Get answer", not "Try again").
// No DB, no network, no model: auth, rate limit, Prisma, analytics and the
// SDK client are mocked. Run: npx vitest run tests/unit/ai-unavailable-reply.test.ts

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

const CREDIT_TEXT = "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.";
/** What must never reach a student. */
const PROVIDER = /credit balance|plans & billing|anthropic|billing|purchase credits|invalid_request_error|\b400\b/i;

/** The SDK's own error for a status and type — the shape the API returns. */
function apiError(status: number, type: string, message: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Anthropic.APIError.generate(status, { type: "error", error: { type, message } }, message, {} as any);
}
const creditError = () => apiError(400, "invalid_request_error", CREDIT_TEXT);

const state = vi.hoisted(() => ({
  session: { user: { id: "u1" } } as { user: { id: string } } | null,
  /** The exam code of the question / mock / attempt in play. */
  examCode: "SSC_CGL" as string | null,
  solution: "Because 2 + 2 = 4." as string,
  /** What the model client does: throw this, or return this message. */
  modelError: null as unknown,
  modelReply: null as unknown,
  cached: new Map<string, { questionId: string; locale: string; body: string; options: unknown[]; solution: string }>(),
  rawSql: [] as string[],
}));

vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => state.session) }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({ ok: true, limit: 20, remaining: 19, reset: Date.now() + 60_000 })),
  rateLimited: vi.fn(() => new Response(JSON.stringify({ error: "RATE_LIMITED" }), { status: 429 })),
}));
vi.mock("@/lib/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/analytics")>()),
  recordEvent: vi.fn(async () => undefined),
}));
vi.mock("@/lib/i18n-server", () => ({ getLocale: vi.fn(async () => "en") }));
vi.mock("@/lib/ai/usage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/usage")>()),
  recordAiUsage: vi.fn(() => 0),
}));
// The SDK is mocked at the one shared client every call site uses.
vi.mock("@/lib/ai/client", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/ai/client")>();
  const call = vi.fn(async () => {
    if (state.modelError) throw state.modelError;
    return state.modelReply;
  });
  return {
    ...real,
    anthropic: { messages: { create: call } },
    callClaude: vi.fn(async () => ({ response: await call(), stats: {} })),
  };
});
// The public AI surface, without the tutor's import graph.
vi.mock("@/lib/ai", async () => ({
  explainSolution: (await import("@/lib/ai/explainer")).explainSolution,
  generateMock: (await import("@/lib/ai/generator")).generateMock,
}));
vi.mock("@/lib/db/questionTranslations", () => ({
  findTranslations: vi.fn(async () => new Map(state.cached)),
  upsertTranslation: vi.fn(async () => undefined),
}));
vi.mock("@/lib/answered-questions", () => ({ getSeenHistory: vi.fn(async () => null) }));
vi.mock("@/lib/db/enrollment", () => ({ ensureEnrollment: vi.fn(async () => ({})) }));
vi.mock("@/lib/db/student-state", () => ({
  getStudentState: vi.fn(async () => ({ userId: "u1", examCode: "SSC_CGL", examName: "SSC CGL", preferredLang: "EN", weaknesses: [], strengths: [], totalMocksTaken: 1 })),
}));
vi.mock("@/lib/db/syllabus", () => ({
  getSyllabusContext: vi.fn(async () => ({
    examCode: "SSC_CGL",
    examName: "SSC Combined Graduate Level",
    examShortName: "SSC CGL",
    subjects: [{ code: "QA", name: "Quantitative Aptitude", weight: 1, topics: [{ code: "T0", name: "Percentage" }] }],
  })),
}));
vi.mock("@/lib/psychometrics", () => ({ tryCatAdaptiveMock: vi.fn(async () => null) }));
vi.mock("@/lib/school/student-db", () => ({ buildSchoolChapterMock: vi.fn() }));
vi.mock("@/lib/ask-engine", () => ({ runAsk: vi.fn() }));
vi.mock("@/lib/search/index-build", async () => {
  const { fixtureIndex } = await import("../fixtures/search-index-fixture");
  return { loadSearchIndex: vi.fn(async () => fixtureIndex("deep")) };
});
vi.mock("@/lib/db/prisma", () => {
  const QUESTION = { id: "q1", examId: "e1", topicId: "t1", difficulty: "MEDIUM", body: "2 + 2 = ?", options: [{ key: "A", text: "4" }], answerKey: "A", language: "EN" };
  const exam = () => (state.examCode ? { code: state.examCode } : null);
  return {
    prisma: {
      question: {
        findUnique: vi.fn(async () => ({ ...QUESTION, solution: state.solution, exam: exam() })),
        findMany: vi.fn(async () => [
          { ...QUESTION, id: "q1", solution: "s1", topic: { code: "T0" } },
          { ...QUESTION, id: "q2", solution: "s2", topic: { code: "T0" } },
        ]),
        count: vi.fn(async () => 2),
      },
      user: { findUnique: vi.fn(async () => ({ id: "u1", preferredLang: "EN" })) },
      mock: {
        findUnique: vi.fn(async () => ({ id: "m1", questionIds: ["q1", "q2"], exam: exam() })),
        count: vi.fn(async () => 0),
        create: vi.fn(async () => ({ id: "m-new", title: "t" })),
      },
      attempt: {
        findUnique: vi.fn(async () => ({ id: "a1", mock: { questionIds: ["q1", "q2"], exam: exam() } })),
        findMany: vi.fn(async () => []),
      },
      exam: { findUnique: vi.fn(async () => ({ id: "e1", code: "SSC_CGL", name: "SSC Combined Graduate Level", shortName: "SSC CGL", category: "SSC" })) },
      topic: { findFirst: vi.fn(async () => ({ id: "t1", name: "Percentage", children: [] })) },
      subject: { findFirst: vi.fn(async () => null) },
      $queryRaw: vi.fn(async (strings: TemplateStringsArray) => {
        state.rawSql.push(Array.from(strings).join("?"));
        return [{ n: 0n }];
      }),
      $executeRaw: vi.fn(async () => 1),
      $transaction: vi.fn(async () => []),
    },
  };
});

import { POST as explainPOST } from "@/app/api/explain/route";
import { POST as mockTranslatePOST } from "@/app/api/mocks/[id]/translate/route";
import { POST as attemptTranslatePOST } from "@/app/api/attempts/[id]/translate/route";
import { POST as freshPOST } from "@/app/api/mocks/fresh/route";
import { POST as mocksPOST } from "@/app/api/mocks/route";
import { POST as essayPOST } from "@/app/api/descriptive/route";
import { POST as askPOST } from "@/app/api/ask/route";
import { recordEvent, eventCountsByKind } from "@/lib/analytics";
import { runAsk } from "@/lib/ask-engine";
import { ASK_VIEW_IDLE, askReducer, createSseParser, frameToAction, type SseFrame } from "@/lib/ask-stream";
import { searchCopy } from "@/lib/search-copy";
import {
  AI_UNAVAILABLE_CODE,
  AI_UNAVAILABLE_COPY,
  allAiUnavailableLines,
  explainUnavailableLine,
  isAiUnavailableCode,
  resultsTranslationUnavailableLine,
  sentenceOr,
} from "@/lib/ai-unavailable-copy";
import {
  aiUnavailableBody,
  aiUnavailableEventRow,
  aiUnavailableReason,
  aiUnavailableReply,
  isOwnBadRequest,
  refererPathOf,
  schoolBandOfExamCode,
} from "@/lib/ai/unavailable-reply";

const BROWSER = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";

function post(url: string, body: unknown, extra: Record<string, string> = {}) {
  return new Request(`https://shishya.in${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9", cookie: "shishya_anon=anon-123", "user-agent": BROWSER, ...extra },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });

/** Status, parsed body and the raw text (the provider check reads the raw text). */
async function read(res: Response) {
  const text = await res.text();
  return { status: res.status, text, body: JSON.parse(text) as Record<string, unknown> };
}
const events = () => vi.mocked(recordEvent).mock.calls.map((c) => c[0]);
const unavailableRows = () => events().filter((e) => (e.props as { surface?: string } | null)?.surface === AI_UNAVAILABLE_CODE);

beforeEach(() => {
  vi.clearAllMocks();
  state.session = { user: { id: "u1" } };
  state.examCode = "SSC_CGL";
  state.solution = "Because 2 + 2 = 4.";
  state.modelError = creditError();
  state.modelReply = null;
  state.cached = new Map();
  state.rawSql = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

// ── 1. The helper ──────────────────────────────────────────────────────

describe("the shared helper", () => {
  it("the SDK's empty-balance 400 is 'the AI is unavailable' (credit); so are a spend limit, overload, 429, 5xx", () => {
    expect(aiUnavailableReason(creditError())).toBe("credit");
    expect(aiUnavailableReason(apiError(400, "invalid_request_error", "You have reached your specified API usage limits. You will regain access on 2026-11-01."))).toBe("credit");
    expect(aiUnavailableReason(apiError(529, "overloaded_error", "Overloaded"))).toBe("overloaded");
    expect(aiUnavailableReason(apiError(429, "rate_limit_error", "slow down"))).toBe("rate-limit");
    expect(aiUnavailableReason(apiError(500, "api_error", "boom"))).toBe("server");
  });

  it("a 400 about this request, a bug of ours and a parse error are NOT an outage", () => {
    expect(aiUnavailableReason(apiError(400, "invalid_request_error", "prompt is too long: 250000 tokens"))).toBeNull();
    expect(aiUnavailableReason(new TypeError("x is not a function"))).toBeNull();
    expect(aiUnavailableReason(new SyntaxError("Unexpected token < in JSON"))).toBeNull();
    expect(aiUnavailableReason(null)).toBeNull();
  });

  it("our own validation 400 is recognised as ours — even when its text would trip the billing pattern", () => {
    const ours = Object.assign(new Error("Invalid body: received 'billing'"), { status: 400 });
    expect(isOwnBadRequest(ours)).toBe(true);
    expect(aiUnavailableReason(ours)).toBeNull();
    // The provider's 400 is never "ours": the SDK error, and a double of it with headers / error.
    expect(isOwnBadRequest(creditError())).toBe(false);
    expect(isOwnBadRequest(Object.assign(new Error(CREDIT_TEXT), { status: 400, headers: {}, error: { type: "invalid_request_error" } }))).toBe(false);
    expect(isOwnBadRequest(Object.assign(new Error("x"), { status: 500 }))).toBe(false);
    expect(isOwnBadRequest("Invalid body")).toBe(false);
  });

  it("the reply is 503 { code: 'ai-unavailable', error: <the fixed line> } and nothing else", async () => {
    const res = aiUnavailableReply("fresh");
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ code: "ai-unavailable", error: AI_UNAVAILABLE_COPY.fresh });
    expect(aiUnavailableBody("explain", explainUnavailableLine(false))).toEqual({ code: "ai-unavailable", error: AI_UNAVAILABLE_COPY.explainNoSolution });
    // An empty line falls back to the feature's own line, never to an empty error.
    expect(aiUnavailableBody("essay", "  ").error).toBe(AI_UNAVAILABLE_COPY.essay);
    expect(isAiUnavailableCode("ai-unavailable")).toBe(true);
    expect(isAiUnavailableCode("failed")).toBe(false);
  });
});

// ── 2. The routes ──────────────────────────────────────────────────────

describe("explain", () => {
  it("a credit error → 503, the fixed line, the code — never the provider's text", async () => {
    const r = await read(await explainPOST(post("/api/explain", { questionId: "q1" })));
    expect(r.status).toBe(503);
    expect(r.body).toEqual({ code: "ai-unavailable", error: AI_UNAVAILABLE_COPY.explain });
    expect(r.text).not.toMatch(PROVIDER);
  });

  it("a question with no stored solution gets the line without 'the solution is above'", async () => {
    state.solution = "  ";
    const r = await read(await explainPOST(post("/api/explain", { questionId: "q1" })));
    expect(r.body.error).toBe(AI_UNAVAILABLE_COPY.explainNoSolution);
    expect(String(r.body.error)).not.toContain("solution is above");
  });

  it("a validation 400 is unchanged: our own message still reaches the student", async () => {
    const r = await read(await explainPOST(post("/api/explain", { studentChosen: "A" })));
    expect(r.status).toBe(400);
    expect(String(r.body.error)).toMatch(/^Invalid body: /);
    expect(r.body.code).toBeUndefined();
    const bad = await read(await explainPOST(post("/api/explain", "{not json")));
    expect(bad).toMatchObject({ status: 400, body: { error: "Invalid JSON body" } });
    // A validation message that happens to contain a billing word is still ours.
    const tricky = await read(await explainPOST(post("/api/explain", { questionId: "q1", detailLevel: "billing" })));
    expect(tricky.status).toBe(400);
    expect(String(tricky.body.error)).toMatch(/^Invalid body: /);
    expect(unavailableRows()).toHaveLength(0);
  });

  it("a provider 400 that is not an outage is a 500 without its text (it used to be returned verbatim)", async () => {
    state.modelError = apiError(400, "invalid_request_error", "prompt is too long: 250000 tokens > 200000 maximum");
    const r = await read(await explainPOST(post("/api/explain", { questionId: "q1" })));
    expect(r).toMatchObject({ status: 500, body: { error: "INTERNAL_ERROR" } });
    expect(r.text).not.toContain("prompt is too long");
    expect(unavailableRows()).toHaveLength(0);
  });

  it("writes one analytics row: who, the feature, the reason, the alternative", async () => {
    await explainPOST(post("/api/explain", { questionId: "q1" }, { referer: "https://shishya.in/attempts/a1/results?x=1" }));
    expect(unavailableRows()).toHaveLength(1);
    expect(unavailableRows()[0]).toMatchObject({
      kind: "CTA_CLICKED",
      userId: "u1",
      anonId: null,
      client: "browser",
      path: "/attempts/a1/results",
      props: { surface: "ai-unavailable", feature: "explain", reason: "credit", sent: true, alt: "solution" },
    });
  });

  it("no row for a Class 1-7 question, or when the question's exam cannot be read — the line is the same", async () => {
    for (const code of ["NCERT_C05", "CISCE_C07", null]) {
      vi.mocked(recordEvent).mockClear();
      state.examCode = code;
      const r = await read(await explainPOST(post("/api/explain", { questionId: "q1" })));
      expect(r.body).toEqual({ code: "ai-unavailable", error: AI_UNAVAILABLE_COPY.explain });
      expect(recordEvent).not.toHaveBeenCalled();
    }
  });
});

describe("mock translation (the player)", () => {
  it("every batch failed on a credit error → 503, the fixed line, the code; the error's message is not appended", async () => {
    const r = await read(await mockTranslatePOST(post("/api/mocks/m1/translate", { locale: "hi", questionIds: ["q1", "q2"] }), params("m1")));
    expect(r.status).toBe(503);
    expect(r.body).toEqual({ code: "ai-unavailable", error: AI_UNAVAILABLE_COPY.translation });
    expect(r.text).not.toMatch(PROVIDER);
    expect(r.text).not.toContain("Translation failed:");
  });

  it("a failure that is not an outage gets the plain line — never 'unavailable', never the error's own text", async () => {
    state.modelError = new Error("Translation engine returned a malformed response. Retry in a moment.");
    const r = await read(await mockTranslatePOST(post("/api/mocks/m1/translate", { locale: "hi" }), params("m1")));
    expect(r.status).toBe(503);
    expect(r.body).toEqual({ error: AI_UNAVAILABLE_COPY.translationFailed });
    expect(r.text).not.toMatch(/unavailable|malformed|moment/i);
    expect(unavailableRows()).toHaveLength(0);
  });

  it("a validation 400 is unchanged", async () => {
    const r = await read(await mockTranslatePOST(post("/api/mocks/m1/translate", { locale: "klingon" }), params("m1")));
    expect(r.status).toBe(400);
    expect(String(r.body.error)).toMatch(/^Invalid body: /);
  });

  it("stored translations are still served when the AI is unavailable (200, as before), and the failure is still counted", async () => {
    state.cached.set("q1", { questionId: "q1", locale: "hi", body: "२ + २ = ?", options: [{ key: "A", text: "४" }], solution: "s" });
    const r = await read(await mockTranslatePOST(post("/api/mocks/m1/translate", { locale: "hi" }), params("m1")));
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ locale: "hi", questions: [{ id: "q1", body: "२ + २ = ?", options: [{ key: "A", text: "४" }] }] });
    expect(unavailableRows()).toHaveLength(1);
  });

  it("a guest's row carries the anon id; a Class 8-12 school mock's row carries none; a Class 1-7 mock writes none", async () => {
    state.session = null;
    await mockTranslatePOST(post("/api/mocks/m1/translate", { locale: "te" }), params("m1"));
    expect(unavailableRows()[0]).toMatchObject({ userId: null, anonId: "anon-123", props: { feature: "translate", reason: "credit" } });

    vi.mocked(recordEvent).mockClear();
    state.examCode = "NCERT_C09";
    await mockTranslatePOST(post("/api/mocks/m1/translate", { locale: "te" }), params("m1"));
    expect(unavailableRows()).toHaveLength(1);
    expect(unavailableRows()[0]).toMatchObject({ userId: null, anonId: null });

    vi.mocked(recordEvent).mockClear();
    state.examCode = "NCERT_C06";
    const r = await read(await mockTranslatePOST(post("/api/mocks/m1/translate", { locale: "te" }), params("m1")));
    expect(r.body.code).toBe("ai-unavailable");
    expect(recordEvent).not.toHaveBeenCalled();
  });
});

describe("results-page translation", () => {
  // Review, 2 Oct 2026: the 503 is answered only when NO question has a
  // translation, so every question on the page is in English — the line is
  // the plain one the mock player has. The "stored ones are shown in
  // <language>" line (RT) describes a partly translated page, which answers
  // 200; it waits for build 6.
  it("a credit error → 503 with the plain 'shown in English' line; no 'try again in a moment'", async () => {
    const r = await read(await attemptTranslatePOST(post("/api/attempts/a1/translate", { locale: "hi" }), params("a1")));
    expect(r.status).toBe(503);
    expect(r.body).toEqual({ code: "ai-unavailable", error: AI_UNAVAILABLE_COPY.translation });
    expect(String(r.body.error)).toBe("Translation is unavailable right now, so the questions are shown in English.");
    expect(String(r.body.error)).not.toBe(resultsTranslationUnavailableLine("हिन्दी"));
    expect(String(r.body.error)).not.toMatch(/stored translation/);
    expect(r.text).not.toMatch(PROVIDER);
    expect(unavailableRows()[0]).toMatchObject({ userId: "u1", props: { feature: "translate", reason: "credit" } });
  });

  it("some questions stored → 200 with those and no line (this route never sends the 'stored ones' line)", async () => {
    state.cached.set("q1", { questionId: "q1", locale: "hi", body: "२ + २ = ?", options: [{ key: "A", text: "४" }], solution: "s" });
    const r = await read(await attemptTranslatePOST(post("/api/attempts/a1/translate", { locale: "hi" }), params("a1")));
    expect(r.status).toBe(200);
    expect(r.body.error).toBeUndefined();
    expect((r.body.questions as unknown[]).length).toBeGreaterThan(0);
    const route = fs.readFileSync(path.join(process.cwd(), "src/app/api/attempts/[id]/translate/route.ts"), "utf8");
    expect(route).not.toContain("resultsTranslationUnavailableLine");
  });

  it("another failure → the plain line; a validation 400 is unchanged", async () => {
    state.modelError = new Error("Translation output was cut off (hit 8192-token limit).");
    const r = await read(await attemptTranslatePOST(post("/api/attempts/a1/translate", { locale: "hi" }), params("a1")));
    expect(r).toMatchObject({ status: 503, body: { error: AI_UNAVAILABLE_COPY.translationFailed } });
    expect(r.text).not.toMatch(/unavailable|moment|cut off/i);
    const bad = await read(await attemptTranslatePOST(post("/api/attempts/a1/translate", {}), params("a1")));
    expect(bad.status).toBe(400);
    expect(String(bad.body.error)).toMatch(/^Invalid body: /);
  });
});

describe("fresh questions", () => {
  const body = { examCode: "SSC_CGL", topicCode: "T0", count: 10 };

  it("a credit error reaches the route's clean branch: 503, the fixed line, the code, one row", async () => {
    const r = await read(await freshPOST(post("/api/mocks/fresh", body)));
    expect(r.status).toBe(503);
    expect(r.body).toEqual({ code: "ai-unavailable", error: AI_UNAVAILABLE_COPY.fresh });
    expect(r.text).not.toMatch(PROVIDER);
    expect(r.text).not.toMatch(/few minutes|moment/i);
    expect(unavailableRows()).toHaveLength(1);
    expect(unavailableRows()[0]).toMatchObject({ userId: "u1", props: { feature: "fresh", reason: "credit", alt: "bank-test" } });
  });

  it("a reply with nothing usable is not an outage: the plain line, no 'unavailable', no row", async () => {
    state.modelError = null;
    state.modelReply = { content: [{ type: "text", text: "sorry" }], usage: { input_tokens: 1, output_tokens: 1 } };
    const r = await read(await freshPOST(post("/api/mocks/fresh", body)));
    expect(r).toMatchObject({ status: 400, body: { error: AI_UNAVAILABLE_COPY.freshFailed } });
    expect(r.text).not.toMatch(/unavailable right now|moment/i);
    expect(unavailableRows()).toHaveLength(0);
  });

  it("a validation 400 is unchanged", async () => {
    const r = await read(await freshPOST(post("/api/mocks/fresh", { examCode: "SSC_CGL" })));
    expect(r.status).toBe(400);
    expect(String(r.body.error)).toMatch(/^Invalid body: /);
  });
});

describe("the free-text mock", () => {
  const body = { examCode: "SSC_CGL", request: { type: "USER_REQUEST", instruction: "tough percentage questions", questionCount: 10 } };

  it("a credit error → 503, M1, the code, one row — no 'a few minutes'", async () => {
    const r = await read(await mocksPOST(post("/api/mocks", body)));
    expect(r.status).toBe(503);
    expect(r.body).toEqual({ code: "ai-unavailable", error: AI_UNAVAILABLE_COPY.customMock });
    expect(r.text).not.toMatch(PROVIDER);
    expect(r.text).not.toMatch(/few minutes/i);
    expect(unavailableRows()).toHaveLength(1);
    expect(unavailableRows()[0]).toMatchObject({ userId: "u1", props: { feature: "custom-mock", reason: "credit", alt: "build-mock" } });
  });

  it("a reply that could not be read → M1b, not M1: no 'unavailable', no code, no row", async () => {
    state.modelError = new SyntaxError("Unexpected token < in JSON at position 0");
    const r = await read(await mocksPOST(post("/api/mocks", body)));
    expect(r.status).toBe(500);
    expect(r.body).toEqual({ error: AI_UNAVAILABLE_COPY.customMockFailed });
    expect(r.text).not.toMatch(/unavailable|Unexpected token/i);
    expect(unavailableRows()).toHaveLength(0);
  });

  it("a validation 400 is unchanged", async () => {
    const r = await read(await mocksPOST(post("/api/mocks", { examCode: "SSC_CGL", request: { type: "USER_REQUEST", instruction: "x", questionCount: 10 } })));
    expect(r.status).toBe(400);
    expect(String(r.body.error)).toMatch(/^Invalid body: /);
  });
});

describe("essay evaluation", () => {
  const body = { taskType: "essay", prompt: "Water conservation in Indian cities", answer: "word ".repeat(60) };

  it("a credit error → a JSON 503 with DS and the code (it was a 500 that was not JSON), one row", async () => {
    const res = await essayPOST(post("/api/descriptive", body));
    expect(res.headers.get("content-type")).toMatch(/json/);
    const r = await read(res);
    expect(r.status).toBe(503);
    expect(r.body).toEqual({ code: "ai-unavailable", error: AI_UNAVAILABLE_COPY.essay });
    expect(r.text).not.toMatch(PROVIDER);
    expect(unavailableRows()).toHaveLength(1);
    expect(unavailableRows()[0]).toMatchObject({ userId: "u1", props: { feature: "essay", reason: "credit" } });
  });

  it("any other failure of the call → a JSON 500 with the plain line", async () => {
    state.modelError = new TypeError("fetch is not a function");
    const r = await read(await essayPOST(post("/api/descriptive", body)));
    expect(r).toMatchObject({ status: 500, body: { error: AI_UNAVAILABLE_COPY.essayFailed } });
    expect(r.text).not.toMatch(/unavailable|fetch is not/i);
    expect(unavailableRows()).toHaveLength(0);
  });

  it("a validation 400 is unchanged", async () => {
    const r = await read(await essayPOST(post("/api/descriptive", { taskType: "essay", prompt: "x", answer: "y" })));
    expect(r).toMatchObject({ status: 400, body: { error: "bad request" } });
  });
});

describe("/ask", () => {
  const Q = "ssc cgl cutoff kitna gaya?";
  const SSE = { accept: "text/event-stream" };
  async function frames(res: Response): Promise<SseFrame[]> {
    const p = createSseParser();
    return [...p.push(await res.text()), ...p.flush()];
  }
  const data = (f: SseFrame) => JSON.parse(f.data);

  beforeEach(() => {
    state.session = null;
    vi.mocked(runAsk).mockRejectedValue(creditError());
  });

  it("JSON: a credit error → 503 { code, error } in the asker's language, never the provider's text", async () => {
    for (const locale of ["en", "hi", "te"] as const) {
      const r = await read(await askPOST(post("/api/ask", { question: Q, locale })));
      expect(r.status).toBe(503);
      expect(r.body).toEqual({ code: "ai-unavailable", error: searchCopy(locale).aiUnavailable });
      expect(r.text).not.toMatch(PROVIDER);
    }
  });

  it("stream: one error frame with the code and the line; no done", async () => {
    const f = await frames(await askPOST(post("/api/ask", { question: Q, locale: "hi", stream: true }, SSE)));
    expect(f.map((x) => x.event)).toEqual(["meta", "error"]);
    expect(data(f[1])).toEqual({ code: "ai-unavailable", error: searchCopy("hi").aiUnavailable });
    expect(f[1].data).not.toMatch(PROVIDER);
  });

  it("the line follows the pages the search matched: 'listed above' only when there are some", async () => {
    for (const question of [Q, "zxqv plorb wumpfen dask"]) {
      const f = await frames(await askPOST(post("/api/ask", { question, stream: true }, SSE)));
      expect(f.map((x) => x.event)).toEqual(["meta", "error"]);
      const copy = searchCopy("en");
      expect(data(f[1]).error).toBe(data(f[0]).pages.length > 0 ? copy.aiUnavailable : copy.aiUnavailableNoPage);
    }
    // The first question matches pages in the committed fixture index.
    const matched = await frames(await askPOST(post("/api/ask", { question: Q, stream: true }, SSE)));
    expect(data(matched[0]).pages.length).toBeGreaterThan(0);
    expect(data(matched[1]).error).toBe(searchCopy("en").aiUnavailable);
    expect(searchCopy("en").aiUnavailable).toBe("The AI answer is unavailable right now. The closest Shishya pages are listed above.");
    expect(searchCopy("en").aiUnavailableNoPage).toBe("The AI answer is unavailable right now, and no Shishya page matches this question.");
  });

  it("one analytics row per failure, with the guest's anon id; a school search carries none", async () => {
    await askPOST(post("/api/ask", { question: Q, via: "button" }));
    expect(unavailableRows()).toHaveLength(1);
    expect(unavailableRows()[0]).toMatchObject({
      kind: "CTA_CLICKED",
      userId: null,
      anonId: "anon-123",
      client: "browser",
      path: "/ask",
      props: { surface: "ai-unavailable", feature: "ask", reason: "credit", sent: true, alt: "pages" },
    });
    vi.mocked(recordEvent).mockClear();
    await frames(await askPOST(post("/api/ask", { question: "class 9 science chapter 3 explain", stream: true }, SSE)));
    expect(unavailableRows()).toHaveLength(1);
    expect(unavailableRows()[0]).toMatchObject({ userId: null, anonId: null, props: { feature: "ask" } });
  });

  it("a Class 1-7 question never reaches the model: pages only, no AI wording, no row", async () => {
    const r = await read(await askPOST(post("/api/ask", { question: "class 5 maths" })));
    expect(r.body).toMatchObject({ answer: null, notice: "no-ai-young-class" });
    expect(runAsk).not.toHaveBeenCalled();
    expect(unavailableRows()).toHaveLength(0);
  });

  it("a failure that is not an outage gets the plain 'could not be answered' line and code 'failed', and writes no row", async () => {
    vi.mocked(runAsk).mockRejectedValue(new Error("ask stream ended before message_stop"));
    const f = await frames(await askPOST(post("/api/ask", { question: Q, locale: "te", stream: true }, SSE)));
    expect(data(f.at(-1)!)).toEqual({ error: searchCopy("te").failed, code: "failed" });
    const r = await read(await askPOST(post("/api/ask", { question: Q })));
    expect(r.status).toBe(502);
    expect(r.body.code).toBeUndefined();
    // Review, 2 Oct 2026: the JSON path said "The answer engine hiccuped" in
    // English whatever the language; now it is the stream's own line.
    expect(r.body.error).toBe(searchCopy("en").failed);
    expect(r.body.error).toBe("This question could not be answered this time. Open a page above, or try again.");
    const hi = await read(await askPOST(post("/api/ask", { question: Q, locale: "hi" })));
    expect(hi.body.error).toBe(searchCopy("hi").failed);
    for (const l of ["en", "hi", "te"] as const) expect(searchCopy(l).failed).not.toMatch(/hiccup|unavailable/i);
    expect(unavailableRows()).toHaveLength(0);
  });

  it("a bad body is still a 400 with our own message", async () => {
    const r = await read(await askPOST(post("/api/ask", { question: "a" })));
    expect(r).toMatchObject({ status: 400, body: { error: "Ask a real question (3+ characters)." } });
  });
});

// ── 3. The analytics row ───────────────────────────────────────────────

describe("the analytics row", () => {
  it("schoolBandOfExamCode: real exam, Class 8-12, Class 1-7, unreadable", () => {
    expect(schoolBandOfExamCode("SSC_CGL")).toBe("none");
    expect(schoolBandOfExamCode("NCERT_C08")).toBe("student");
    expect(schoolBandOfExamCode("CISCE_C12")).toBe("student");
    expect(schoolBandOfExamCode("NCERT_C07")).toBe("young");
    expect(schoolBandOfExamCode("CISCE_C01")).toBe("young");
    expect(schoolBandOfExamCode(null)).toBe("unknown");
    expect(schoolBandOfExamCode("")).toBe("unknown");
  });

  it("never for Class 1-7: a young container, an unreadable scope, or a Class 1-7 school page", () => {
    const base = { feature: "explain" as const, reason: "credit" as const, userId: "u1" };
    expect(aiUnavailableEventRow({ ...base, school: "young" })).toBeNull();
    expect(aiUnavailableEventRow({ ...base, school: "unknown" })).toBeNull();
    expect(aiUnavailableEventRow({ ...base, path: "/schooling/cbse/class-5/maths" })).toBeNull();
    expect(aiUnavailableEventRow({ ...base, path: "/schooling/cbse/class-10/maths" })).not.toBeNull();
  });

  it("one id per row; a school row carries no anon id; sent defaults to true", () => {
    const guest = aiUnavailableEventRow({ feature: "translate", reason: "overloaded", anonId: "a1", client: "browser" });
    expect(guest).toEqual({
      kind: "CTA_CLICKED",
      userId: null,
      anonId: "a1",
      client: "browser",
      path: null,
      props: { surface: "ai-unavailable", feature: "translate", reason: "overloaded", sent: true, alt: null },
    });
    expect(aiUnavailableEventRow({ feature: "translate", reason: "credit", anonId: "a1", school: "student" })?.anonId).toBeNull();
    expect(aiUnavailableEventRow({ feature: "ask", reason: "credit", userId: "u1", anonId: "a1" })).toMatchObject({ userId: "u1", anonId: null });
    expect(aiUnavailableEventRow({ feature: "ask", reason: "credit", sent: false })?.props).toMatchObject({ sent: false });
  });

  it("the page path comes from a same-site Referer only", () => {
    expect(refererPathOf(post("/api/explain", {}, { referer: "https://shishya.in/attempts/a1/results?tab=review" }))).toBe("/attempts/a1/results");
    expect(refererPathOf(post("/api/explain", {}, { referer: "https://evil.example/attempts/a1" }))).toBeNull();
    expect(refererPathOf(post("/api/explain", {}))).toBeNull();
  });

  it("the admin click count leaves the rows out, like the web-vitals beacon", async () => {
    await eventCountsByKind(7);
    const sql = state.rawSql.at(-1) ?? "";
    expect(sql).toContain(`COALESCE("props"->>'cta', '') = 'web-vitals'`);
    expect(sql).toContain(`COALESCE("props"->>'surface', '') = 'ai-unavailable'`);
  });
});

// ── 4. The copy ────────────────────────────────────────────────────────

describe("the copy", () => {
  const banned = /busy|updating|hiccup|few minutes|moment|anthropic|credit|billing/i;

  it("no line says busy, updating, hiccup, a few minutes or a moment — or names the provider", () => {
    const lines = [
      ...allAiUnavailableLines(),
      ...(["en", "hi", "te"] as const).flatMap((l) => [searchCopy(l).aiUnavailable, searchCopy(l).aiUnavailableNoPage]),
    ];
    expect(lines.length).toBeGreaterThan(15);
    for (const line of lines) {
      expect(line.trim().length).toBeGreaterThan(20);
      expect(line).not.toMatch(banned);
    }
  });

  it("'unavailable' only in the lines used when the AI was the cause", () => {
    for (const [key, line] of Object.entries(AI_UNAVAILABLE_COPY)) {
      if (key.endsWith("Failed")) expect(line).not.toMatch(/unavailable/i);
      else expect(line).toMatch(/unavailable right now/);
    }
  });

  it("no line promises a later answer; the explain line leaves that to the chat", () => {
    for (const line of allAiUnavailableLines()) expect(line).not.toMatch(/we('| wi)ll (answer|email|notify)|as soon as/i);
    expect(AI_UNAVAILABLE_COPY.explain).toContain("The chat tells you if your question is saved");
    expect(AI_UNAVAILABLE_COPY.explain).toContain("The checked solution is above.");
    expect(AI_UNAVAILABLE_COPY.explainNoSolution).not.toContain("solution is above");
  });

  it("the /ask lines are real Hindi and Telugu, not English fallbacks", () => {
    expect(/[ऀ-ॿ]/.test(searchCopy("hi").aiUnavailable)).toBe(true);
    expect(/[ऀ-ॿ]/.test(searchCopy("hi").aiUnavailableNoPage)).toBe(true);
    expect(/[ఀ-౿]/.test(searchCopy("te").aiUnavailable)).toBe(true);
    expect(/[ఀ-౿]/.test(searchCopy("te").aiUnavailableNoPage)).toBe(true);
  });

  it("a reply's bare code word never reaches a student: sentenceOr keeps our sentences only", () => {
    expect(sentenceOr("INTERNAL_ERROR", AI_UNAVAILABLE_COPY.explainFailed)).toBe(AI_UNAVAILABLE_COPY.explainFailed);
    expect(sentenceOr("", "F")).toBe("F");
    expect(sentenceOr("   ", "F")).toBe("F");
    expect(sentenceOr(undefined, "F")).toBe("F");
    expect(sentenceOr("RATE_LIMITED", "F")).toBe("F");
    // Our own sentences pass: a validation message, a not-found line, a fixed line.
    expect(sentenceOr("question not found", "F")).toBe("question not found");
    expect(sentenceOr("Invalid body: questionId is required", "F")).toBe("Invalid body: questionId is required");
    expect(sentenceOr(AI_UNAVAILABLE_COPY.translationFailed, "F")).toBe(AI_UNAVAILABLE_COPY.translationFailed);
    expect(AI_UNAVAILABLE_COPY.explainFailed).toBe("The explanation could not be made this time.");
  });

  it("the swept lines are gone from the routes and the generator", () => {
    const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
    const code = (p: string) =>
      read(p)
        .split(/\r?\n/)
        .filter((l) => !l.trim().startsWith("//"))
        .join("\n");
    for (const p of ["src/lib/ai/generator.ts", "src/app/api/mocks/route.ts", "src/app/api/mocks/fresh/route.ts"]) expect(code(p)).not.toMatch(/a few minutes/);
    for (const p of ["src/app/api/mocks/fresh/route.ts", "src/app/api/attempts/[id]/translate/route.ts"]) expect(code(p)).not.toMatch(/in a moment/i);
    // The provider's message is never appended to a reply.
    expect(code("src/app/api/mocks/[id]/translate/route.ts")).not.toMatch(/Translation failed: \$\{/);
    // Review, 2 Oct 2026: /ask's non-outage line no longer says "hiccuped".
    expect(code("src/app/api/ask/route.ts")).not.toMatch(/hiccup/i);
    for (const p of ["src/app/api/explain/route.ts", "src/app/api/mocks/[id]/translate/route.ts", "src/app/api/attempts/[id]/translate/route.ts", "src/app/api/mocks/fresh/route.ts", "src/app/api/mocks/route.ts"]) {
      expect(code(p)).not.toMatch(/err\?\.status === 400\) return bad\(err\.message\)/);
    }
  });
});

// ── 5. The pages read the code ─────────────────────────────────────────

describe("the pages", () => {
  const src = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

  it("the stream's error frame carries the code into the panel's state; any other code does not", () => {
    const frame = (o: unknown): SseFrame => ({ event: "error", data: JSON.stringify(o) });
    expect(frameToAction(frame({ error: "L", code: "ai-unavailable" }), "F")).toEqual({ type: "error", message: "L", canRetry: true, code: "ai-unavailable" });
    expect(frameToAction(frame({ error: "L", code: "failed" }), "F")).toEqual({ type: "error", message: "L", canRetry: true });
    const busy = askReducer(ASK_VIEW_IDLE, { type: "start" });
    const down = askReducer(busy, { type: "error", message: "L", canRetry: true, code: AI_UNAVAILABLE_CODE });
    expect(down).toMatchObject({ phase: "error", error: "L", canRetry: true, errorCode: "ai-unavailable" });
    expect(askReducer(busy, { type: "error", message: "L", canRetry: true }).errorCode).toBeNull();
    // Asking again clears it.
    expect(askReducer(down, { type: "start" }).errorCode).toBeNull();
  });

  it("the /ask panel keeps 'Get answer' (not 'Try again') for the code, and never hides the button", () => {
    const s = src("src/app/ask/AskAnswer.tsx");
    expect(s).toMatch(/view\.errorCode === AI_UNAVAILABLE_CODE \? copy\.getAnswer : copy\.stream\.retry/);
    expect(s).toMatch(/isAiUnavailableCode\(body\?\.code\)/);
    expect(s).toMatch(/copy\.aiUnavailableNoPage/);
  });

  it("the client helper passes the reply's code and status on its error", () => {
    const s = src("src/lib/api.ts");
    expect(s).toMatch(/status: res\.status/);
    expect(s).toMatch(/code: typeof data\?\.code === "string"/);
  });

  it("the results page and the mock player pick their own fixed line by the code", () => {
    const review = src("src/app/attempts/[id]/results/ResultsReview.tsx");
    expect(review).toMatch(/isAiUnavailableCode\(e\?\.code\)\s*\?\s*explainUnavailableLine\(/);
    expect(review).toMatch(/isAiUnavailableCode\(e\?\.code\)\s*\?\s*AI_UNAVAILABLE_COPY\.translation\b/);
    // Review, 2 Oct 2026: the "stored ones are shown in <language>" line is not used on a page where every question is in English.
    expect(review).not.toContain("resultsTranslationUnavailableLine");
    // …and a reply's bare code word (INTERNAL_ERROR) is never printed: both failure lines go through sentenceOr.
    expect(review).toMatch(/sentenceOr\(e\?\.message, AI_UNAVAILABLE_COPY\.translationFailed\)/);
    expect(review).toMatch(/sentenceOr\(e\?\.message, AI_UNAVAILABLE_COPY\.explainFailed\)/);
    expect(review).not.toMatch(/e\?\.message \?\?/);
    const player = src("src/app/mocks/[id]/MockPlayer.tsx");
    expect(player).toMatch(/isAiUnavailableCode\(e\?\.code\)\s*\?\s*AI_UNAVAILABLE_COPY\.translation\b/);
  });

  it("the essay page checks the status before trusting the body", () => {
    const s = src("src/app/descriptive/DescriptiveStudio.tsx");
    expect(s).toMatch(/await res\.json\(\)\.catch\(\(\) => null\)/);
    expect(s).toMatch(/isAiUnavailableCode\(data\?\.code\)/);
    expect(s.indexOf("if (!res.ok)")).toBeLessThan(s.indexOf("setResult(data as Evaluation)"));
  });

  it("explain rows in the spend ledger name the question", () => {
    expect(src("src/lib/ai/explainer.ts")).toMatch(/feature: "explain",[\s\S]{0,260}ref: question\.id,/);
  });
});

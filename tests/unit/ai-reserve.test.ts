// Reserve credit pool (7 Oct 2026, build B4) — src/lib/ai/reserve.ts and the
// call sites that use it: callClaude (Explain, mocks, the essay check), the
// tutor turn, translation. Ask: tests/unit/ai-reserve-ask.test.ts.
//
// Pinned:
//   1. an empty main balance (or a spend limit) on a student-facing call →
//      the same request once on the reserve key; the student gets the
//      reserve's answer; the ledger row's feature ends in ":reserve";
//   2. a cron / bulk / late-answer feature with the same error → no reserve,
//      the main key's error;
//   3. ANTHROPIC_RESERVE_API_KEY unset (today) → the main error, as before;
//   4. not an empty balance (overload, rate limit, 5xx, auth, a bad request,
//      a timeout) → no reserve;
//   5. outside the deployed app (a tsx script: no NEXT_RUNTIME) and inside
//      withoutReserve() → no reserve;
//   6. both keys fail → the MAIN error, so every route's honest copy stays;
//   7. the allowlist names no background label, every label on it is really
//      written, and only reserve.ts reads the key.
// No network: both clients' messages.create are spied; the ledger is mocked.
// Run: npx vitest run tests/unit/ai-reserve.test.ts

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/ai/usage", () => ({
  recordAiUsage: vi.fn(() => 0.01),
  PRICING: {
    haiku: { in: 1, out: 5, cacheW: 1.25, cacheR: 0.1 },
    sonnet: { in: 3, out: 15, cacheW: 3.75, cacheR: 0.3 },
    opus: { in: 5, out: 25, cacheW: 6.25, cacheR: 0.5 },
  },
}));

import { anthropic, callClaude, cachedSystem } from "@/lib/ai/client";
import { recordAiUsage } from "@/lib/ai/usage";
import { RESERVE_FEATURES, RESERVE_SUFFIX, ledgerFeature, reserveClient, reserveFor, withReserve, withoutReserve } from "@/lib/ai/reserve";
import { classifyTutorFailure } from "@/lib/ai/tutor-failure";
import { tutorStream } from "@/lib/ai/tutor";
import { translateBatch } from "@/lib/ai/translator";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const CREDIT = "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.";
const SPEND_LIMIT = "You have reached your specified API usage limits. You will regain access on 2026-11-01 at 00:00 UTC.";

/** The SDK's own error for a status and type — the shape the API returns. */
function apiError(status: number, type: string, message: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Anthropic.APIError.generate(status, { type: "error", error: { type, message } }, message, {} as any);
}
const creditError = () => apiError(400, "invalid_request_error", CREDIT);

function message(text: string) {
  return {
    id: "m",
    type: "message",
    role: "assistant",
    model: "claude-test",
    content: [{ type: "text", text }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 100, output_tokens: 20 },
  } as unknown as Anthropic.Messages.Message;
}

/** Every ledger label a scheduled job, a bulk script or the late-answer run writes. */
const BACKGROUND = [
  "exam-info",
  "exam-info-other",
  "phase-article",
  "phase-article-web",
  "phase-article-today",
  "phase-article-today-web",
  "current-affairs",
  "coach-day",
  "akr-check",
  "akr-plan",
  "akr-crawl",
  "results-extract",
  "question-adjudicate",
  "vacancies",
  "rank-bands",
  "daily-brief",
  "demand-mine",
  "demand-consolidate",
  "seed-discussions",
  "discussion-reply",
  "bank-solve",
  "bank-verify",
  "school-gen",
  "school-notes",
  "state-depth-gen",
  "pyq-verify",
  "factory-solve",
  "factory-verify",
  "tutor-late",
  "tutor-late-wrap",
  "tutor-late-probe",
  "student-360",
  "other",
];

const ENV = ["ANTHROPIC_RESERVE_API_KEY", "ANTHROPIC_API_KEY", "NEXT_RUNTIME"] as const;
const saved = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));

beforeEach(() => {
  process.env.ANTHROPIC_RESERVE_API_KEY = "sk-ant-test-reserve";
  process.env.ANTHROPIC_API_KEY = "sk-ant-test-main";
  process.env.NEXT_RUNTIME = "nodejs"; // what next build writes into the app's server bundle
  vi.mocked(recordAiUsage).mockClear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

/** Spies on both clients' messages.create: the main key out of credit, the reserve answering. */
function outOfCredit(reserveText = "Answer from the reserve.") {
  const main = vi.spyOn(anthropic.messages, "create").mockImplementation((async () => {
    throw creditError();
  }) as never);
  const reserve = vi.spyOn(reserveClient()!.messages, "create").mockImplementation((async () => message(reserveText)) as never);
  return { main, reserve };
}

const ledgerLabels = () => vi.mocked(recordAiUsage).mock.calls.map((c) => c[0]);

// ── 1-6. The rule ──────────────────────────────────────────────────────

describe("withReserve", () => {
  const main = { name: "main" } as unknown as Anthropic;
  /** A request that fails on the main client with `err` and succeeds anywhere else. */
  const failing = (err: unknown) => vi.fn(async (c: Anthropic) => (c === main ? Promise.reject(err) : "reserve answer"));

  it("sends a student call once more on the reserve when the main balance is empty", async () => {
    for (const feature of RESERVE_FEATURES) {
      const run = failing(creditError());
      await expect(withReserve(feature, main, run)).resolves.toEqual({ value: "reserve answer", reserve: true });
      expect(run).toHaveBeenCalledTimes(2);
      expect(run.mock.calls[0][0]).toBe(main);
      expect(run.mock.calls[1][0]).toBe(reserveClient());
    }
  });

  it("treats a spend limit like an empty balance, and returns the main answer untouched when it works", async () => {
    const run = failing(apiError(400, "invalid_request_error", SPEND_LIMIT));
    await expect(withReserve("tutor", main, run)).resolves.toEqual({ value: "reserve answer", reserve: true });
    const ok = vi.fn(async () => "main answer");
    await expect(withReserve("tutor", main, ok)).resolves.toEqual({ value: "main answer", reserve: false });
    expect(ok).toHaveBeenCalledTimes(1);
  });

  it("never uses the reserve for a cron, bulk or late-answer feature, or a call with no feature", async () => {
    for (const feature of [...BACKGROUND, null, undefined, ""]) {
      const err = creditError();
      const run = failing(err);
      await expect(withReserve(feature, main, run)).rejects.toBe(err);
      expect(run).toHaveBeenCalledTimes(1);
    }
  });

  it("with no reserve key set (today), fails exactly as before", async () => {
    delete process.env.ANTHROPIC_RESERVE_API_KEY;
    expect(reserveClient()).toBeNull();
    const err = creditError();
    const run = failing(err);
    await expect(withReserve("tutor", main, run)).rejects.toBe(err);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("stays off when the reserve key is the main key (same organization, same empty balance)", async () => {
    process.env.ANTHROPIC_RESERVE_API_KEY = " sk-ant-test-main ";
    expect(reserveClient()).toBeNull();
    const run = failing(creditError());
    await expect(withReserve("tutor", main, run)).rejects.toThrow(CREDIT);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("does not retry an overload, a rate limit, a 5xx, an auth error, a bad request or a timeout", async () => {
    const errors = [
      apiError(529, "overloaded_error", "Overloaded"),
      apiError(429, "rate_limit_error", "Number of request tokens has exceeded your per-minute rate limit"),
      apiError(500, "api_error", "Internal server error"),
      apiError(401, "authentication_error", "invalid x-api-key"),
      apiError(400, "invalid_request_error", "messages: text content blocks must be non-empty"),
      new Anthropic.APIConnectionTimeoutError(),
    ];
    for (const err of errors) {
      expect(classifyTutorFailure(err)).not.toBe("credit");
      const run = failing(err);
      await expect(withReserve("tutor", main, run)).rejects.toBe(err);
      expect(run).toHaveBeenCalledTimes(1);
    }
  });

  it("is off outside the deployed app: a tsx script (no NEXT_RUNTIME) never reaches the reserve", async () => {
    delete process.env.NEXT_RUNTIME;
    expect(reserveFor("translate")).toBeNull();
    const run = failing(creditError());
    await expect(withReserve("translate", main, run)).rejects.toThrow(CREDIT);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("is off inside withoutReserve(), across awaits, and on again after it", async () => {
    const run = failing(creditError());
    await withoutReserve(async () => {
      await new Promise((r) => setTimeout(r, 1));
      expect(reserveFor("mock-adaptive")).toBeNull();
      await expect(Promise.resolve().then(() => withReserve("mock-adaptive", main, run))).rejects.toThrow(CREDIT);
    });
    expect(run).toHaveBeenCalledTimes(1);
    expect(reserveFor("mock-adaptive")).toBe(reserveClient());
  });

  it("when the reserve fails too, throws the MAIN error — the honest unavailable copy is unchanged", async () => {
    for (const reserveErr of [creditError(), apiError(401, "authentication_error", "invalid x-api-key"), apiError(529, "overloaded_error", "Overloaded")]) {
      const err = creditError();
      const run = vi.fn(async (c: Anthropic) => Promise.reject(c === main ? err : reserveErr));
      await expect(withReserve("explain", main, run)).rejects.toBe(err);
      expect(run).toHaveBeenCalledTimes(2);
      expect(classifyTutorFailure(err)).toBe("credit");
    }
  });

  it("passes a person leaving (Stop, a closed tab) through as it is", async () => {
    const gone = new Anthropic.APIUserAbortError();
    const run = vi.fn(async (c: Anthropic) => Promise.reject(c === main ? creditError() : gone));
    await expect(withReserve("ask", main, run)).rejects.toBe(gone);
  });

  it("labels the ledger row of a reserve-paid call", () => {
    expect(RESERVE_SUFFIX).toBe(":reserve");
    expect(ledgerFeature("tutor", true)).toBe("tutor:reserve");
    expect(ledgerFeature("tutor", false)).toBe("tutor");
  });
});

// ── The call sites ─────────────────────────────────────────────────────

describe("callClaude (Explain, mocks, the essay check)", () => {
  const opts = (feature: string) => ({
    feature,
    ref: "q1",
    system: cachedSystem("You explain answers."),
    messages: [{ role: "user" as const, content: "Why is B right?" }],
    maxTokens: 500,
  });

  it("serves a student feature from the reserve: same request, the reserve's answer, a ':reserve' ledger row", async () => {
    for (const feature of ["explain", "mock-adaptive", "mock-user-request", "descriptive-eval"]) {
      vi.mocked(recordAiUsage).mockClear();
      const { main, reserve } = outOfCredit(`reserve ${feature}`);
      const { response } = await callClaude(opts(feature));
      expect((response.content[0] as Anthropic.Messages.TextBlock).text).toBe(`reserve ${feature}`);
      expect(main).toHaveBeenCalledTimes(1);
      expect(reserve).toHaveBeenCalledTimes(1);
      expect(reserve.mock.calls[0][0]).toEqual(main.mock.calls[0][0]);
      expect(ledgerLabels()).toEqual([`${feature}:reserve`]);
      expect(vi.mocked(recordAiUsage).mock.calls[0][2]).toMatchObject({ ref: "q1" });
      main.mockRestore();
      reserve.mockRestore();
    }
  });

  it("a background feature with an empty balance throws the main error and never touches the reserve", async () => {
    for (const feature of ["results-extract", "coach-day", "exam-info", "student-360", "factory-solve"]) {
      const { main, reserve } = outOfCredit();
      await expect(callClaude(opts(feature))).rejects.toThrow(CREDIT);
      expect(main).toHaveBeenCalledTimes(1);
      expect(reserve).not.toHaveBeenCalled();
      expect(ledgerLabels()).toEqual([]);
      main.mockRestore();
      reserve.mockRestore();
    }
  });

  it("reserve unset: Explain fails exactly as before", async () => {
    const { main, reserve } = outOfCredit();
    delete process.env.ANTHROPIC_RESERVE_API_KEY;
    await expect(callClaude(opts("explain"))).rejects.toThrow(CREDIT);
    expect(main).toHaveBeenCalledTimes(1);
    expect(reserve).not.toHaveBeenCalled();
  });

  it("a working main key: one call, the plain label, no reserve", async () => {
    const main = vi.spyOn(anthropic.messages, "create").mockImplementation((async () => message("main")) as never);
    const reserve = vi.spyOn(reserveClient()!.messages, "create");
    await callClaude(opts("explain"));
    expect(main).toHaveBeenCalledTimes(1);
    expect(reserve).not.toHaveBeenCalled();
    expect(ledgerLabels()).toEqual(["explain"]);
  });
});

describe("the tutor turn", () => {
  const input = (extra: Record<string, unknown> = {}) =>
    ({
      studentState: { userId: "", examCode: "", examName: "", preferredLang: "EN", enrolledAt: "2026-09-01", weaknesses: [], strengths: [], totalMocksTaken: 0 },
      syllabus: null,
      history: [],
      userMessage: "What is a percentage?",
      language: "English",
      generalMode: true,
      ...extra,
    }) as unknown as Parameters<typeof tutorStream>[0];

  async function reply(gen: ReturnType<typeof tutorStream>): Promise<string> {
    let text = "";
    for await (const c of gen) if ("delta" in c) text += c.delta;
    return text;
  }

  it("a student's turn on an empty main balance is answered by the reserve — the same reply on screen", async () => {
    const { main, reserve } = outOfCredit("A percentage is a part of 100.");
    expect(await reply(tutorStream(input()))).toBe("A percentage is a part of 100.");
    expect(main).toHaveBeenCalledTimes(1);
    expect(reserve).toHaveBeenCalledTimes(1);
    expect(reserve.mock.calls[0][0]).toEqual(main.mock.calls[0][0]);
    expect(ledgerLabels()).toEqual(["tutor-anon:reserve"]);
  });

  it("the late-answer run (feature tutor-late) never uses the reserve", async () => {
    const { main, reserve } = outOfCredit();
    await expect(reply(tutorStream(input({ usage: { feature: "tutor-late" } })))).rejects.toThrow(CREDIT);
    expect(main).toHaveBeenCalledTimes(1);
    expect(reserve).not.toHaveBeenCalled();
  });

  it("a student label inside withoutReserve() stays on the main key", async () => {
    const { reserve } = outOfCredit();
    await expect(withoutReserve(() => reply(tutorStream(input())))).rejects.toThrow(CREDIT);
    expect(reserve).not.toHaveBeenCalled();
  });

  it("reserve unset: the turn fails as before (the chat route's honest copy takes it from here)", async () => {
    const { reserve } = outOfCredit();
    delete process.env.ANTHROPIC_RESERVE_API_KEY;
    await expect(reply(tutorStream(input()))).rejects.toThrow(CREDIT);
    expect(reserve).not.toHaveBeenCalled();
  });
});

describe("translation", () => {
  const batch = { locale: "hi" as const, questions: [{ id: "q1", body: "2 + 2 = ?", options: [{ key: "A", text: "4" }], solution: "4" }] };
  const json = JSON.stringify({ translations: [{ id: "q1", body: "2 + 2 = ?", options: [{ key: "A", text: "चार" }], solution: "चार" }] });

  it("a student's translation on an empty main balance comes from the reserve", async () => {
    const { reserve } = outOfCredit(json);
    const out = await translateBatch(batch);
    expect(out.translated[0].options[0].text).toBe("चार");
    expect(reserve).toHaveBeenCalledTimes(1);
    expect(ledgerLabels()).toEqual(["translate:reserve"]);
  });

  it("the same call from a tsx script (prewarm / backfill translations) never reaches the reserve", async () => {
    const { reserve } = outOfCredit(json);
    delete process.env.NEXT_RUNTIME;
    await expect(translateBatch(batch)).rejects.toThrow(CREDIT);
    expect(reserve).not.toHaveBeenCalled();
  });
});

// ── 7. The allowlist and the key ───────────────────────────────────────

function filesUnder(rel: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })) {
    const p = `${rel}/${e.name}`;
    if (e.isDirectory()) filesUnder(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

describe("what may reach the reserve", () => {
  it("names no background label", () => {
    for (const f of BACKGROUND) expect(RESERVE_FEATURES.has(f)).toBe(false);
  });

  it("names no label a cron route writes itself", () => {
    for (const file of filesUnder("src/app/api/cron")) {
      const src = read(file);
      for (const m of src.matchAll(/(?:recordAiUsage\(|feature:\s*|usageFeature:\s*)"([a-z0-9-]+)"/g)) {
        expect(RESERVE_FEATURES.has(m[1]), `${file} writes "${m[1]}"`).toBe(false);
      }
    }
  });

  it("names only labels the student-facing code really writes", () => {
    const writers: Record<string, string> = {
      tutor: "src/lib/ai/tutor.ts",
      "tutor-school": "src/lib/ai/tutor.ts",
      "tutor-anon": "src/lib/ai/tutor.ts",
      "tutor-wrap": "src/lib/ai/tutor.ts",
      explain: "src/lib/ai/explainer.ts",
      translate: "src/lib/ai/translator.ts",
      "mock-adaptive": "src/lib/ai/generator.ts",
      "mock-user-request": "src/lib/ai/generator.ts",
      ask: "src/lib/ask-engine.ts",
      "descriptive-eval": "src/app/api/descriptive/route.ts",
    };
    expect([...RESERVE_FEATURES].sort()).toEqual(Object.keys(writers).sort());
    for (const [label, file] of Object.entries(writers)) expect(read(file)).toContain(`"${label}"`);
  });

  it("only src/lib/ai/reserve.ts reads ANTHROPIC_RESERVE_API_KEY", () => {
    const readers = [...filesUnder("src"), ...filesUnder("scripts")].filter((f) =>
      /env(?:\.|\[\s*["'`])ANTHROPIC_RESERVE_API_KEY/.test(read(f)),
    );
    expect(readers).toEqual(["src/lib/ai/reserve.ts"]);
  });

  it("the late-answer run answers inside withoutReserve(), and its probe asks the main key only", () => {
    const src = read("src/lib/db/tutor-late-answer.ts");
    expect(src).toContain("answer: (row, remainingUsd) => withoutReserve(() => answer(row, remainingUsd)),");
    expect(src).toMatch(/async function probe\(\)[\s\S]*?await anthropic\.messages\.create\(/);
  });

  it("Ask opts in from its route only: POST /api/ask passes reserve: true, the teacher-request-sla cron does not", () => {
    const route = read("src/app/api/ask/route.ts");
    expect(route.match(/reserve: true/g)?.length).toBe(2);
    expect(read("src/app/api/cron/teacher-request-sla/route.ts")).not.toMatch(/reserve:\s*true/);
    expect(read("src/lib/ask-engine.ts")).toContain('const reserveFeature = opts.reserve ? "ask" : null;');
  });
});

// The bulk-script guard (2 Oct 2026, resilience plan build 2b).
//
// Why: the credit balance is topped up by hand and is not reloaded
// automatically, so it is sometimes zero, and bulk scripts took $40.1 of the
// last $81.3 ledgered. src/lib/ai/batch.ts now has one pre-flight every bulk
// script passes before its first model call. These tests hold it to three
// things:
//   1. no --max-usd, no run;
//   2. the printed line says what the cap means in days of student use
//      (about $5.3 a day) and that the balance is not reloaded automatically;
//   3. a run stops at its first credit error: the call (or probe) that
//      discovered it is the last thing sent.
// And two source checks: the four runners call the pre-flight before their
// first call, and a new script that builds its own SDK client cannot skip it.
// Nothing here touches the network or the database.

import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

vi.mock("@/lib/db/prisma", () => ({ prisma: { aiUsage: { create: () => Promise.resolve({}) } } }));
vi.mock("next/server", () => ({
  after: () => {
    throw new Error("after() called outside a request scope");
  },
}));

import {
  CONFIRM_AUTO_RELOAD_FLAG,
  STUDENT_USE_USD_PER_DAY,
  bulkPreflight,
  bulkPreflightLine,
  capInStudentDays,
  classifyProbeError,
  creditStopNote,
  guardFlags,
  isCreditError,
  makeCustomId,
  maxUsdFromArgv,
  newJournal,
  runJournalPhase,
  studentDaysText,
  type BatchesApi,
  type JournalRequest,
  type MessageBatch,
} from "@/lib/ai/batch";
import { DEFAULT_DIFFICULTY, GEN_MAX_TOKENS, newGenJournal, runGeneration, type GenDriverDeps, type GenRunMode, type GenTopicInput } from "@/lib/ai/question-gen-run";

const ROOT = path.resolve(__dirname, "..", "..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");

/** What the SDK throws for an HTTP error reply (generate() needs a headers record, or it builds a connection error). */
const apiError = (status: number, type: string, message: string) => Anthropic.APIError.generate(status, { type: "error", error: { type, message } }, message, {});
/** The empty-balance reply, word for word. */
const CREDIT_400 = () => apiError(400, "invalid_request_error", "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.");
/** The account's own usage limit: also a 400 invalid_request_error. */
const LIMIT_400 = () => apiError(400, "invalid_request_error", "You have reached your specified API usage limits. You will regain access on 2026-11-01 at 00:00 UTC.");

// ---------------------------------------------------------------------------
// 1. No cap, no run
// ---------------------------------------------------------------------------

describe("bulkPreflight refuses to start without --max-usd", () => {
  it("no cap in any form is refused, and nothing is printed", () => {
    const printed: string[] = [];
    const log = (l: string) => printed.push(l);
    expect(() => bulkPreflight({ script: "new-bulk-script.ts", maxUsd: null, log })).toThrow(/new-bulk-script\.ts: refusing to start without --max-usd <usd>/);
    expect(() => bulkPreflight({ script: "x.ts", log })).toThrow(/refusing to start without --max-usd/);
    expect(() => bulkPreflight({ script: "x.ts", argv: ["--exams", "NDA", "--apply"], log })).toThrow(/refusing to start without --max-usd/);
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => bulkPreflight({ script: "x.ts", maxUsd: bad, log }), String(bad)).toThrow(/refusing to start without --max-usd/);
    }
    expect(printed).toEqual([]);
  });

  it("the refusal says why: a shared balance that is not reloaded automatically, and no default", () => {
    let message = "";
    try {
      bulkPreflight({ script: "x.ts", maxUsd: null, log: () => {} });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/shared with the live tutor/);
    expect(message).toMatch(/not reloaded automatically/);
    expect(message).toMatch(/There is no default/);
  });

  it("a malformed --max-usd on the command line is refused, not read as absent", () => {
    for (const bad of [["--max-usd"], ["--max-usd", "0"], ["--max-usd", "-3"], ["--max-usd", "abc"], ["--max-usd", "--apply"]]) {
      expect(() => bulkPreflight({ script: "x.ts", argv: bad, log: () => {} }), bad.join(" ")).toThrow(/--max-usd must be a positive number/);
      expect(() => maxUsdFromArgv(bad), bad.join(" ")).toThrow(/--max-usd must be a positive number/);
    }
    expect(maxUsdFromArgv(["--exams", "NDA"])).toBeNull();
    expect(maxUsdFromArgv(["--max-usd", "2.5", "--chunk", "100"])).toBe(2.5);
  });

  it("the batch runners' own flag reader parses the cap the same way", () => {
    expect(guardFlags(["--max-usd", "25", CONFIRM_AUTO_RELOAD_FLAG], true).maxUsd).toBe(25);
    expect(guardFlags([], false).maxUsd).toBeNull();
    expect(() => guardFlags(["--apply"], true)).toThrow(/--apply needs --max-usd/);
    expect(() => guardFlags(["--max-usd", "0"], false)).toThrow(/--max-usd must be a positive number/);
  });
});

// ---------------------------------------------------------------------------
// 2. What the cap means
// ---------------------------------------------------------------------------

describe("the printed line: the cap as days of student use", () => {
  it("students use about $5.3 a day", () => {
    expect(STUDENT_USE_USD_PER_DAY).toBe(5.3);
  });

  it("states the right number of days for $5, $25 and $100", () => {
    const cases: Array<[number, string]> = [
      [5, "about 0.9 days"],
      [25, "about 4.7 days"],
      [100, "about 18.9 days"],
    ];
    for (const [usd, days] of cases) {
      const printed: string[] = [];
      const r = bulkPreflight({ script: "x.ts", maxUsd: usd, log: (l) => printed.push(l) });
      expect(printed).toHaveLength(1);
      expect(printed[0]).toContain(r.line);
      expect(r.line).toContain(`students use about $5.3 a day; this cap of $${usd.toFixed(2)} is ${days} of student use.`);
      expect(r.line).toMatch(/shared with the live tutor and is not reloaded automatically/);
      expect(r.maxUsd).toBe(usd);
      expect(r.studentDays).toBeCloseTo(usd / 5.3, 10);
      expect(bulkPreflightLine(usd)).toBe(r.line);
    }
  });

  it("reads the cap from argv when the script did not parse it itself", () => {
    const printed: string[] = [];
    const r = bulkPreflight({ script: "x.ts", argv: ["--only", "NDA", "--max-usd", "25"], log: (l) => printed.push(l) });
    expect(r.maxUsd).toBe(25);
    expect(printed[0]).toMatch(/this cap of \$25\.00 is about 4\.7 days of student use/);
  });

  it("small caps and a whole day read sensibly", () => {
    expect(capInStudentDays(5.3)).toBeCloseTo(1, 10);
    expect(studentDaysText(5.3)).toBe("about 1 day");
    expect(studentDaysText(2)).toBe("about 0.4 days");
    expect(studentDaysText(0.5)).toBe("about 0.1 days");
    expect(studentDaysText(0.1)).toBe("under 0.1 days");
  });

  it("never says anything reloads the balance", () => {
    const line = bulkPreflightLine(25);
    expect(line).not.toMatch(/auto-reload is ON/i);
    expect(line).not.toMatch(/refills/i);
  });
});

// ---------------------------------------------------------------------------
// 3. Stop at the first credit error
// ---------------------------------------------------------------------------

describe("isCreditError and the stop note (the SDK's own error objects)", () => {
  it("an empty balance and the account's usage limit are credit errors", () => {
    expect(isCreditError(CREDIT_400())).toBe(true);
    expect(isCreditError(apiError(402, "billing_error", "x"))).toBe(true);
    expect(isCreditError(LIMIT_400())).toBe(true);
  });

  it("a bad key, a rate limit, an overload, a server error, a timeout and a bug are not", () => {
    expect(isCreditError(apiError(401, "authentication_error", "invalid x-api-key"))).toBe(false);
    expect(isCreditError(apiError(403, "permission_error", "forbidden"))).toBe(false);
    expect(isCreditError(apiError(429, "rate_limit_error", "slow down"))).toBe(false);
    expect(isCreditError(apiError(529, "overloaded_error", "Overloaded"))).toBe(false);
    expect(isCreditError(apiError(500, "api_error", "internal"))).toBe(false);
    expect(isCreditError(apiError(400, "invalid_request_error", "messages: at least one message is required"))).toBe(false);
    expect(isCreditError(new Anthropic.APIConnectionTimeoutError())).toBe(false);
    expect(isCreditError(new Error("boom"))).toBe(false);
  });

  it("the note is our own words: the balance is not reloaded automatically; never the provider's text", () => {
    const empty = creditStopNote(CREDIT_400());
    expect(empty).toBe("The balance the live tutor shares is empty: add credit first. It is not reloaded automatically.");
    expect(creditStopNote(apiError(402, "billing_error", "x"))).toBe(empty);
    const limit = creditStopNote(LIMIT_400());
    expect(limit).toMatch(/usage limit is reached/);
    expect(limit).not.toMatch(/balance .* is empty/);
    for (const note of [empty, limit]) expect(note).not.toMatch(/Plans & Billing|purchase credits|regain access|2026-11-01/);
    expect(creditStopNote(apiError(529, "overloaded_error", "Overloaded"))).toBe("");
    expect(creditStopNote(new Error("boom"))).toBe("");
  });
});

// --- the generation run (scripts/generate-questions.ts) -----------------------

const SONNET = "claude-sonnet-4-5-20250929";
const PARAMS: Anthropic.Messages.MessageCreateParamsNonStreaming = {
  model: SONNET,
  max_tokens: GEN_MAX_TOKENS,
  system: [{ type: "text", text: "persona" }],
  messages: [{ role: "user", content: "x".repeat(400) }],
};
const topic = (id: string, code: string): GenTopicInput => ({ id, code, name: `Topic ${code}` });
const TOPICS = [topic("q1", "quant.a"), topic("q2", "quant.b"), topic("q3", "quant.c")];
const WRITE: GenRunMode = { callsApi: true, maxUsd: 5, writes: true };

let stem = 0;
const tenQuestions = () =>
  JSON.stringify(
    Array.from({ length: 10 }, () => ({
      body: `Bulk pre-flight test stem number ${++stem}: what is two plus two?`,
      options: [
        { key: "A", text: "3" },
        { key: "B", text: "4" },
        { key: "C", text: "5" },
        { key: "D", text: "22" },
      ],
      answerKey: "B",
      solution: "Addition of the two numbers gives four; this is a basic fact.",
      difficulty: "EASY",
      tags: ["arithmetic"],
    })),
  );
const modelReply = (text: string) =>
  ({
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: SONNET,
    content: [{ type: "text", text, citations: null }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 1000, output_tokens: 2000, cache_creation_input_tokens: null, cache_read_input_tokens: null },
  }) as unknown as Anthropic.Messages.Message;

function genRun(replies: Array<string | Error>) {
  const journal = newGenJournal(
    "r1",
    "TS_ICET",
    { all: true, skipSubjects: [], count: 10, batchSize: 10, difficulty: DEFAULT_DIFFICULTY, avoidRecent: 50, retry: 1, language: "EN", model: SONNET },
    TOPICS,
  );
  const calls: string[] = [];
  const warned: string[] = [];
  const deps: GenDriverDeps = {
    examCode: "TS_ICET",
    mode: WRITE,
    buildParams: () => PARAMS,
    context: async () => ({ fewShotBlock: "", avoidBlock: "", recentBodies: [] }),
    call: async () => {
      calls.push("call");
      const next = replies.shift();
      if (next === undefined) throw new Error("test: the run made a call after it should have stopped");
      if (next instanceof Error) throw next;
      return modelReply(next);
    },
    ledger: async () => {},
    save: async (_t, qs) => qs.map((_, i) => `id${i}`),
    persist: () => {},
    log: () => {},
    warn: (l) => warned.push(l),
    now: () => new Date("2026-10-02T06:30:00Z"),
    sleep: async () => {},
  };
  return { journal, deps, calls, warned, topics: new Map(TOPICS.map((t) => [t.id, t])) };
}

describe("the generation run stops at its first credit error", () => {
  it("an empty balance on the first call: one call, every topic still pending, and the stop line says nothing reloads the balance", async () => {
    const h = genRun([CREDIT_400()]);
    const r = await runGeneration(h.journal, h.topics, h.deps);
    expect(h.calls).toHaveLength(1);
    expect(r.stop).toMatchObject({ reason: "api-error", topicCode: "quant.a", remainingQuestions: 30 });
    expect(r.stop!.message).toMatch(/nothing more is sent/);
    expect(r.stop!.message).toMatch(/add credit first\. It is not reloaded automatically\./);
    expect(h.journal.topics.map((t) => t.status)).toEqual(["pending", "pending", "pending"]);
    expect(h.journal.status).toBe("stopped");
    expect(h.journal.spentUsd).toBe(0);
  });

  it("an empty balance in the middle of a run: the call that discovered it is the last one", async () => {
    const h = genRun([tenQuestions(), CREDIT_400()]);
    const r = await runGeneration(h.journal, h.topics, h.deps);
    expect(h.calls).toHaveLength(2);
    expect(r.saved).toBe(10);
    expect(r.stop).toMatchObject({ reason: "api-error", topicCode: "quant.b", remainingQuestions: 20 });
    expect(h.journal.topics.map((t) => t.status)).toEqual(["done", "pending", "pending"]);
  });

  it("the account's usage limit stops the run the same way, with its own line", async () => {
    const h = genRun([LIMIT_400()]);
    const r = await runGeneration(h.journal, h.topics, h.deps);
    expect(h.calls).toHaveLength(1);
    expect(r.stop).toMatchObject({ reason: "api-error", topicCode: "quant.a" });
    expect(r.stop!.message).toMatch(/usage limit is reached/);
    expect(h.journal.topics.map((t) => t.status)).toEqual(["pending", "pending", "pending"]);
  });
});

// --- the batch phase driver (verify-question-bank.ts, school-content-batch.ts) --

type Result = Anthropic.Messages.MessageBatchIndividualResponse;

function fakeBatch(over: Partial<MessageBatch>): MessageBatch {
  return {
    id: "msgbatch_test",
    type: "message_batch",
    processing_status: "ended",
    request_counts: { processing: 0, succeeded: 1, errored: 0, expired: 0, canceled: 0 },
    created_at: "2026-10-02T10:00:00Z",
    ended_at: "2026-10-02T10:30:00Z",
    expires_at: "2026-10-03T10:00:00Z",
    archived_at: null,
    cancel_initiated_at: null,
    results_url: null,
    ...over,
  };
}

/** A fake Batches API: every request of a batch succeeds; create() counts the batches. */
function fakeApi(): BatchesApi & { creates: string[][] } {
  const creates: string[][] = [];
  const byBatch = new Map<string, Result[]>();
  return {
    creates,
    create: async (body) => {
      const ids = body.requests.map((r) => r.custom_id);
      creates.push(ids);
      const id = `msgbatch_${creates.length}`;
      byBatch.set(
        id,
        ids.map((custom_id) => ({ custom_id, result: { type: "succeeded", message: modelReply("ok") } })),
      );
      return fakeBatch({ id, processing_status: "in_progress" });
    },
    retrieve: async (id) => fakeBatch({ id }),
    results: async (id) =>
      (async function* () {
        for (const r of byBatch.get(id) ?? []) yield r;
      })(),
    list: async () => ({ data: [] as MessageBatch[] }),
  };
}

describe("the batch phase driver stops at its first credit error", () => {
  it("the probe after the first chunk finds an empty balance: no second chunk goes out, what is left stays built", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bulk-preflight-journal-"));
    try {
      const file = path.join(dir, "run.json");
      const journal = newJournal<Record<string, never>>("run", {}, {});
      const ids = ["cmgq00000000000000000001", "cmgq00000000000000000002", "cmgq00000000000000000003", "cmgq00000000000000000004"];
      for (const q of ids) {
        const customId = makeCustomId("solve", q);
        journal.questions[q] = { code: "NDA" };
        journal.requests[customId] = { customId, phase: "solve", questionId: q, code: "NDA", attempt: 1, status: "built" } satisfies JournalRequest;
      }
      const api = fakeApi();
      const warned: string[] = [];
      let probes = 0;
      const out = await runJournalPhase(
        journal,
        file,
        "solve",
        "bank-solve",
        () => ({ model: "claude-haiku-4-5-20251001", max_tokens: 16, messages: [{ role: "user", content: "x" }] }),
        () => true,
        false,
        {
          api,
          pollIntervalMs: 1,
          log: () => {},
          warn: (l) => warned.push(l),
          ledger: async () => 0.01,
          guard: {
            maxUsd: 100,
            chunkSize: 2,
            // What probeProductionKey() returns when the key answers the empty-balance 400.
            probe: async () => {
              probes += 1;
              return classifyProbeError(CREDIT_400());
            },
          },
        },
      );
      expect(api.creates.map((c) => c.length)).toEqual([2]);
      expect(probes).toBe(1);
      expect(out.stop).toMatchObject({ reason: "probe", remaining: 2 });
      expect(out.stop!.message).toMatch(/no further chunk is submitted/);
      expect(out.stop!.message).toMatch(/balance is empty; add credit first: it is not reloaded automatically/);
      expect(ids.map((q) => journal.requests[makeCustomId("solve", q)].status)).toEqual(["succeeded", "succeeded", "built", "built"]);
      expect(out.failed).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// The runners call it, before their first call
// ---------------------------------------------------------------------------

describe("the four bulk runners pass the shared pre-flight", () => {
  it("generate-questions.ts: before the client is built", () => {
    const src = read("scripts/generate-questions.ts");
    const at = src.indexOf('bulkPreflight({ script: "generate-questions.ts", maxUsd: mode.maxUsd });');
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeLessThan(src.indexOf("client = new Anthropic({ apiKey: key.key, maxRetries: 0 });"));
    // only a run that calls the API (a free --no-ai --dry-run names no cap)
    expect(src.lastIndexOf("if (mode.callsApi) {", at)).toBeGreaterThan(-1);
  });

  it("verify-question-bank.ts and school-content-batch.ts: on --apply, before the production key is probed or anything is submitted", () => {
    for (const name of ["verify-question-bank.ts", "school-content-batch.ts"]) {
      const src = read(`scripts/${name}`);
      const at = src.indexOf(`bulkPreflight({ script: "${name}", maxUsd });`);
      expect(at, name).toBeGreaterThan(-1);
      expect(at, name).toBeLessThan(src.indexOf("const preflight = await probeProductionKey();"));
      expect(src.indexOf("const flags = guardFlags(process.argv, !DRY"), name).toBeLessThan(at);
    }
  });

  it("crawl-official-answer-keys.ts: whenever research will run, before the budget is opened; a run with no AI is not held to a cap above zero", () => {
    const src = read("scripts/crawl-official-answer-keys.ts");
    const line = 'if (!aiOff && needAi.length > 0) bulkPreflight({ script: "crawl-official-answer-keys.ts", maxUsd });';
    expect(src).toContain(line);
    expect(src.indexOf(line)).toBeLessThan(src.indexOf("const budget = new AiBudget(maxUsd ?? 0, RESEARCH_COST_USD);"));
    // the crawl still stops on any 4xx from the API, and a credit error adds our own line
    expect(src).toContain("if (isStopError(err)) {");
    expect(src).toContain("${msg}${creditNote(err)}");
  });
});

// ---------------------------------------------------------------------------
// A new script cannot skip it
// ---------------------------------------------------------------------------

/**
 * Scripts written before 2 Oct 2026 that build their own SDK client and have
 * no pre-flight. All but scanned-cutoff-read.ts (which has a --max-usd of its
 * own) have no cap at all. They are outside build 2b's file list; each needs
 * bulkPreflight() before it is run again. The list may only shrink: a script
 * that gains the pre-flight must be dropped from it.
 */
const BEFORE_THE_GUARD = [
  "build-content.ts",
  "check-env.ts",
  "fix-reported-questions.ts",
  "generate-category-cutoffs.ts",
  "generate-exam-eligibility.ts",
  "generate-exam-guides.ts",
  "generate-exam-tricks.ts",
  "generate-hindi-notes.ts",
  "generate-inspiration-videos.ts",
  "generate-official-sources.ts",
  "generate-topic-notes.ts",
  "scanned-cutoff-read.ts",
  "seed-ap-amvi-mocks.ts",
  "seed-minimal-mocks.ts",
  "seed-popularity-sweep.ts",
  "seed-questions-fast.ts",
  "translate-i18n.ts",
];

describe("a script that builds its own SDK client goes through the pre-flight", () => {
  // scripts/tmp-* are local scratch files and are not part of the repository.
  const scripts = fs.readdirSync(path.join(ROOT, "scripts")).filter((n) => n.endsWith(".ts") && !n.startsWith("tmp-"));
  const buildsClient = (name: string) => /new Anthropic\(/.test(read(`scripts/${name}`));
  const hasPreflight = (name: string) => /\bbulkPreflight\(/.test(read(`scripts/${name}`));

  it("every such script calls bulkPreflight(), except the ones written before the guard", () => {
    const missing = scripts.filter((n) => buildsClient(n) && !hasPreflight(n) && !BEFORE_THE_GUARD.includes(n));
    expect(missing, `call bulkPreflight({ script, argv: process.argv }) from src/lib/ai/batch.ts before the first model call in: ${missing.join(", ")}`).toEqual([]);
  });

  it("the older list only shrinks: every entry exists, still builds a client and still has no pre-flight", () => {
    for (const name of BEFORE_THE_GUARD) {
      expect(scripts, name).toContain(name);
      expect(buildsClient(name), `${name} no longer builds a client: drop it from BEFORE_THE_GUARD`).toBe(true);
      expect(hasPreflight(name), `${name} now has the pre-flight: drop it from BEFORE_THE_GUARD`).toBe(false);
    }
  });
});

// Tests for the batch form of the question-bank firewall (22 Sep 2026):
// the pure request builders and reply parsers in factory/solver.ts and
// factory/verifier.ts, the custom_id codec, the ledger's batch price, and
// the Message Batches helpers + journal in src/lib/ai/batch.ts. Nothing
// here touches the network or the database: the SDK slice is a fake and
// prisma is mocked.

import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

const { created } = vi.hoisted(() => ({ created: [] as Array<{ data: Record<string, unknown> }> }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    aiUsage: {
      create: (args: { data: Record<string, unknown> }) => {
        created.push(args);
        return Promise.resolve({});
      },
    },
  },
}));
// Outside a request scope next/server's after() throws; the ledger falls back to fire-and-forget.
vi.mock("next/server", () => ({
  after: () => {
    throw new Error("after() called outside a request scope");
  },
}));

import { messageParamsFor } from "@/lib/ai/client";
import { modelFor } from "@/lib/ai/router";
import { BATCH_PRICE_FACTOR, recordAiUsage, recordAiUsageAwaited, usageCostUsd } from "@/lib/ai/usage";
import { aggregate, buildSolveRequest, parseSolveRun, SOLVE_FEATURE } from "@/lib/ai/factory/solver";
import { buildVerifyRequest, parseVerifyVerdict, VERIFY_FEATURE } from "@/lib/ai/factory/verifier";
import type { CandidateQuestion, SolveResult, SolveRun, VerifyVerdict } from "@/lib/ai/factory/types";
import {
  BATCH_CHUNK_MAX,
  BULK_KEY_ENV,
  CONFIRM_AUTO_RELOAD_FLAG,
  CUSTOM_ID_PATTERN,
  DEFAULT_CHUNK,
  POLL_MAX_FAILURES,
  PROBE_MODEL,
  assertBatchRequests,
  assertBulkKey,
  assertProductionKeyProbe,
  awaitsSubmit,
  batchTotal,
  chunk,
  classifyProbeError,
  collectResults,
  describeProbe,
  estimateRequestTokens,
  estimateTokens,
  findUnjournaledBatch,
  guardFlags,
  isRetryable,
  journalPath,
  loadJournal,
  makeCustomId,
  mapLimit,
  newJournal,
  parseCustomId,
  pollBatch,
  runJournalPhase,
  saveJournal,
  submitBatch,
  toOutcome,
  tokensUsd,
  worstCaseUsd,
  type BatchesApi,
  type JournalRequest,
  type MessageBatch,
  type ProbeResult,
  type SpendGuard,
} from "@/lib/ai/batch";

// ---------------------------------------------------------------------------
// fixtures
// ---------------------------------------------------------------------------

const CUID = "cmfk3x9ab0001abcd12345678"; // cuid-shaped, 25 chars

const candidate: CandidateQuestion = {
  body: "What is 12 × 12?",
  options: [
    { key: "A", text: "124" },
    { key: "B", text: "144" },
    { key: "C", text: "142" },
    { key: "D", text: "148" },
  ],
  answerKey: "B",
  solution: "12 × 12 = 144.",
  difficulty: "EASY",
  tags: ["arithmetic"],
};

function message(text: string, usage: Partial<Anthropic.Messages.Usage> = {}): Anthropic.Messages.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-opus-4-8",
    content: [{ type: "text", text, citations: null }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 500, output_tokens: 120, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, ...usage },
  } as unknown as Anthropic.Messages.Message;
}

function batch(over: Partial<MessageBatch>): MessageBatch {
  return {
    id: "msgbatch_test",
    type: "message_batch",
    processing_status: "in_progress",
    request_counts: { processing: 3, succeeded: 0, errored: 0, expired: 0, canceled: 0 },
    created_at: "2026-09-22T00:00:00Z",
    ended_at: null,
    expires_at: "2026-09-23T00:00:00Z",
    archived_at: null,
    cancel_initiated_at: null,
    results_url: null,
    ...over,
  };
}

function fakeApi(over: Partial<BatchesApi> = {}): BatchesApi & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    create: async (body) => {
      calls.push(`create:${body.requests.length}`);
      return batch({ id: "msgbatch_created" });
    },
    retrieve: async (id) => {
      calls.push(`retrieve:${id}`);
      return batch({ id, processing_status: "ended" });
    },
    results: async (id) => {
      calls.push(`results:${id}`);
      return (async function* () {})();
    },
    list: async () => {
      calls.push("list");
      return { data: [] };
    },
    ...over,
  };
}

// ---------------------------------------------------------------------------
// custom_id codec
// ---------------------------------------------------------------------------

describe("custom_id codec", () => {
  it("round-trips a solve id with its run index", () => {
    const id = makeCustomId("solve", CUID, 2);
    expect(id).toBe(`solve_${CUID}_2`);
    expect(CUSTOM_ID_PATTERN.test(id)).toBe(true);
    expect(id.length).toBeLessThanOrEqual(64);
    expect(parseCustomId(id)).toEqual({ phase: "solve", questionId: CUID, runIndex: 2 });
  });

  it("round-trips a verify id without a run index", () => {
    const id = makeCustomId("verify", CUID);
    expect(id).toBe(`verify_${CUID}`);
    expect(parseCustomId(id)).toEqual({ phase: "verify", questionId: CUID });
  });

  it("keeps ids distinct across runs and phases of one question", () => {
    const ids = new Set([0, 1, 2].map((i) => makeCustomId("solve", CUID, i)).concat(makeCustomId("verify", CUID)));
    expect(ids.size).toBe(4);
  });

  it("refuses characters the API rejects (the pipe from the design note included)", () => {
    expect(() => makeCustomId("solve", `bad|id`, 0)).toThrow(/characters/);
    expect(() => makeCustomId("Solve", CUID, 0)).toThrow(/lower-case/);
    expect(parseCustomId("solve|x|1")).toBeNull();
    expect(parseCustomId("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// solver: builder + parser + aggregate
// ---------------------------------------------------------------------------

describe("buildSolveRequest", () => {
  it("is the exact body callClaude would send (model, max_tokens, system, messages, nothing else)", () => {
    const p = buildSolveRequest(candidate, 0);
    expect(Object.keys(p).sort()).toEqual(["max_tokens", "messages", "model", "system"]);
    expect(p.model).toBe(modelFor("solve"));
    expect(p.max_tokens).toBe(2000);
    expect(p.system).toHaveLength(1);
    expect(p.system[0].text).toMatch(/^You are an expert solver/);
    expect(p.messages).toHaveLength(1);
    expect(p.messages[0].role).toBe("user");
    const live = messageParamsFor({ model: p.model, maxTokens: p.max_tokens, system: p.system, messages: p.messages });
    expect(JSON.stringify(live)).toBe(JSON.stringify(p));
  });

  it("never shows the key or solution to the solver", () => {
    const text = JSON.stringify(buildSolveRequest(candidate, 1));
    expect(text).toContain("What is 12 × 12?");
    expect(text).toContain("B. 144");
    expect(text).not.toContain("12 × 12 = 144.");
    expect(text).not.toContain('"answerKey"');
  });

  it("varies the directive per run and wraps after four", () => {
    const c = (i: number) => String(buildSolveRequest(candidate, i).messages[0].content);
    expect(c(0)).toMatch(/Approach for this attempt: Solve it directly and carefully\.$/);
    expect(c(1)).not.toBe(c(0));
    expect(c(2)).not.toBe(c(1));
    expect(c(4)).toBe(c(0));
  });

  it("is pure", () => {
    expect(buildSolveRequest(candidate, 2)).toEqual(buildSolveRequest(candidate, 2));
  });
});

describe("parseSolveRun", () => {
  it("reads a clean reply", () => {
    expect(parseSolveRun(message('{"chosen":"B","reasoning":"12 squared is 144.","confidence":0.97}'))).toEqual({
      chosen: "B",
      reasoning: "12 squared is 144.",
      confidence: 0.97,
    });
  });

  it("tolerates fences, prose, lower case and out-of-range confidence", () => {
    const run = parseSolveRun(message('Sure.\n```json\n{"chosen":"c","reasoning":" x ","confidence":"1.7"}\n```'));
    expect(run).toEqual({ chosen: "C", reasoning: "x", confidence: 1 });
  });

  it("defaults a missing confidence to 0.5", () => {
    expect(parseSolveRun(message('{"chosen":"A"}'))?.confidence).toBe(0.5);
  });

  it("returns null for an option outside A-D, JSON cut off at max_tokens, or no JSON at all", () => {
    expect(parseSolveRun(message('{"chosen":"E","reasoning":"","confidence":0.9}'))).toBeNull();
    expect(parseSolveRun(message('{"chosen":"B","reasoning":"long working that was cut'))).toBeNull();
    expect(parseSolveRun(message("I cannot solve this."))).toBeNull();
    expect(parseSolveRun(message(""))).toBeNull();
  });
});

describe("aggregate", () => {
  it("computes majority, agreement and distribution", () => {
    const r = aggregate([
      { chosen: "B", reasoning: "", confidence: 0.9 },
      { chosen: "B", reasoning: "", confidence: 0.8 },
      { chosen: "C", reasoning: "", confidence: 0.4 },
    ]);
    expect(r.majority).toBe("B");
    expect(r.agreement).toBeCloseTo(2 / 3, 6);
    expect(r.distribution).toEqual({ A: 0, B: 2, C: 1, D: 0 });
    expect(r.runs).toHaveLength(3);
  });

  it("has zero agreement with no valid runs, and breaks ties towards the earliest option", () => {
    expect(aggregate([])).toEqual({ runs: [], majority: "A", agreement: 0, distribution: { A: 0, B: 0, C: 0, D: 0 } });
    const tie = aggregate([
      { chosen: "D", reasoning: "", confidence: 0.5 },
      { chosen: "B", reasoning: "", confidence: 0.5 },
    ]);
    expect(tie.majority).toBe("B");
    expect(tie.agreement).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// verifier: builder + parser
// ---------------------------------------------------------------------------

const solve: SolveResult = aggregate([
  { chosen: "B", reasoning: "first working", confidence: 0.9 },
  { chosen: "B", reasoning: "second working", confidence: 0.85 },
  { chosen: "B", reasoning: "third working", confidence: 0.8 },
]);

describe("buildVerifyRequest", () => {
  it("is the exact body callClaude would send", () => {
    const p = buildVerifyRequest(candidate, solve);
    expect(Object.keys(p).sort()).toEqual(["max_tokens", "messages", "model", "system"]);
    expect(p.model).toBe(modelFor("verify"));
    expect(p.max_tokens).toBe(1600);
    expect(p.system[0].text).toMatch(/^You are a senior subject-matter examiner/);
    const live = messageParamsFor({ model: p.model, maxTokens: p.max_tokens, system: p.system, messages: p.messages });
    expect(JSON.stringify(live)).toBe(JSON.stringify(p));
  });

  it("shows the key, the solution, the distribution and only the first two runs, in order", () => {
    const text = String(buildVerifyRequest(candidate, solve).messages[0].content);
    expect(text).toContain("key: B");
    expect(text).toContain("solution: 12 × 12 = 144.");
    expect(text).toContain("distribution: A:0 B:3 C:0 D:0");
    expect(text).toContain("majority: B (agreement 100%)");
    expect(text).toContain("solve 1 (chose B): first working");
    expect(text).toContain("solve 2 (chose B): second working");
    expect(text).not.toContain("third working");
  });
});

describe("parseVerifyVerdict", () => {
  it("reads a clean verdict", () => {
    const v = parseVerifyVerdict(
      message('{"verdict":"MISMATCH","correctKey":"c","confidence":0.92,"difficulty":"HARD","rationale":"C is right.","issues":["key wrong"]}'),
      candidate,
    );
    expect(v).toEqual({ verdict: "MISMATCH", correctKey: "C", confidence: 0.92, difficulty: "HARD", rationale: "C is right.", issues: ["key wrong"] });
  });

  it("falls back field by field on off-list values", () => {
    const v = parseVerifyVerdict(message('{"verdict":"WRONG","correctKey":"Z","confidence":"nope","difficulty":"INSANE","rationale":"","issues":"none"}'), candidate);
    expect(v).toEqual({ verdict: "FLAWED", correctKey: null, confidence: 0, difficulty: "EASY", rationale: "No rationale provided.", issues: [] });
  });

  it("throws when the reply is not JSON, so the caller can retry or give up", () => {
    expect(() => parseVerifyVerdict(message("The question looks fine to me."), candidate)).toThrow(/Failed to parse JSON/);
    expect(() => parseVerifyVerdict(message('{"verdict":"CORRECT","rationale":"cut off'), candidate)).toThrow(/Failed to parse JSON/);
  });
});

// ---------------------------------------------------------------------------
// ledger
// ---------------------------------------------------------------------------

describe("ledger batch pricing", () => {
  const response = { model: "claude-opus-4-8", usage: { input_tokens: 1_000_000, output_tokens: 100_000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } };
  const list = usageCostUsd(response.model, response.usage).cost;

  it("the factory's default labels are workload-neutral, so generator verification is not booked to the bank script", () => {
    expect(SOLVE_FEATURE).toBe("factory-solve");
    expect(VERIFY_FEATURE).toBe("factory-verify");
    expect([SOLVE_FEATURE, VERIFY_FEATURE]).not.toContain("other");
  });

  it("charges a batch result at half the list price and a live one at full", () => {
    expect(list).toBeCloseTo(5 + 2.5, 6);
    expect(BATCH_PRICE_FACTOR).toBe(0.5);
    created.length = 0;
    expect(recordAiUsage("bank-solve", response, { ref: "UK_UKSSSC", batch: true })).toBeCloseTo(list * 0.5, 6);
    expect(recordAiUsage("bank-solve", response, { ref: "UK_UKSSSC" })).toBeCloseTo(list, 6);
    expect(created).toHaveLength(2);
    expect(created[0].data.costUsd).toBeCloseTo(list * 0.5, 6);
    expect(created[0].data.feature).toBe("bank-solve");
    expect(created[0].data.ref).toBe("UK_UKSSSC");
    expect(created[0].data.inputTokens).toBe(1_000_000);
    expect(created[1].data.costUsd).toBeCloseTo(list, 6);
  });

  it("recordAiUsageAwaited resolves after the row is written", async () => {
    created.length = 0;
    const cost = await recordAiUsageAwaited("bank-verify", response, { ref: "AP_APPSC_GROUP2", batch: true });
    expect(cost).toBeCloseTo(list * 0.5, 6);
    expect(created).toHaveLength(1);
    expect(created[0].data.feature).toBe("bank-verify");
    expect(created[0].data.latencyMs).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// batch helpers
// ---------------------------------------------------------------------------

describe("batch helpers", () => {
  it("chunk splits without losing or reordering items", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
    expect(() => chunk([1], 0)).toThrow();
  });

  it("assertBatchRequests catches what the API would reject before anything is sent", () => {
    const p = buildSolveRequest(candidate, 0);
    expect(() => assertBatchRequests([])).toThrow(/no requests/);
    expect(() => assertBatchRequests([{ custom_id: "a", params: p }, { custom_id: "a", params: p }])).toThrow(/duplicate/);
    expect(() => assertBatchRequests([{ custom_id: "solve|x|1", params: p }])).toThrow(/does not match/);
    const tooMany = Array.from({ length: BATCH_CHUNK_MAX + 1 }, (_, i) => ({ custom_id: `r${i}`, params: p }));
    expect(() => assertBatchRequests(tooMany)).toThrow(/chunk cap/);
    expect(() => assertBatchRequests(tooMany.slice(0, BATCH_CHUNK_MAX))).not.toThrow();
  });

  it("submitBatch hands the requests to the API and returns the batch", async () => {
    const api = fakeApi();
    const b = await submitBatch([{ custom_id: makeCustomId("solve", CUID, 0), params: buildSolveRequest(candidate, 0) }], api);
    expect(b.id).toBe("msgbatch_created");
    expect(api.calls).toEqual(["create:1"]);
  });

  it("pollBatch keeps polling until processing_status is ended", async () => {
    const statuses: MessageBatch["processing_status"][] = ["in_progress", "in_progress", "ended"];
    let n = 0;
    const api = fakeApi({ retrieve: async (id) => batch({ id, processing_status: statuses[n++] }) });
    const ticks: string[] = [];
    const b = await pollBatch("msgbatch_x", { intervalMs: 1, api, onTick: (m) => ticks.push(m.processing_status) });
    expect(b.processing_status).toBe("ended");
    expect(ticks).toEqual(["in_progress", "in_progress", "ended"]);
  });

  it("pollBatch waits out a retrieve outage instead of ending the run, and gives up after the limit", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      let n = 0;
      const flaky = fakeApi({
        retrieve: async (id) => {
          n += 1;
          if (n <= 2) throw new Error("fetch failed");
          return batch({ id, processing_status: "ended" });
        },
      });
      const b = await pollBatch("msgbatch_x", { intervalMs: 1, api: flaky });
      expect(b.processing_status).toBe("ended");
      expect(n).toBe(3);
      expect(warn).toHaveBeenCalledTimes(2);

      let m = 0;
      const dead = fakeApi({
        retrieve: async () => {
          m += 1;
          throw new Error("ECONNRESET");
        },
      });
      await expect(pollBatch("msgbatch_y", { intervalMs: 1, api: dead })).rejects.toThrow(/ECONNRESET/);
      expect(m).toBe(POLL_MAX_FAILURES);
    } finally {
      warn.mockRestore();
    }
  });

  it("pollBatch stops after maxMs rather than polling forever", async () => {
    const api = fakeApi({ retrieve: async (id) => batch({ id, processing_status: "in_progress" }) });
    await expect(pollBatch("msgbatch_z", { intervalMs: 2, maxMs: 10, api })).rejects.toThrow(/not ended after/);
  });

  it("findUnjournaledBatch adopts the batch a cut-off submit left behind, by count and time, ignoring known ones", async () => {
    const counts = (total: number) => ({ processing: total - 1, succeeded: 1, errored: 0, expired: 0, canceled: 0 });
    expect(batchTotal(counts(2886))).toBe(2886);
    const api = fakeApi({
      list: async () => ({
        data: [
          batch({ id: "msgbatch_new", created_at: "2026-09-22T10:00:30Z", request_counts: counts(2886) }),
          batch({ id: "msgbatch_known", created_at: "2026-09-22T10:00:20Z", request_counts: counts(2886) }),
          batch({ id: "msgbatch_other_size", created_at: "2026-09-22T10:00:25Z", request_counts: counts(962) }),
          batch({ id: "msgbatch_old", created_at: "2026-09-22T08:00:00Z", request_counts: counts(2886) }),
        ],
      }),
    });
    const known = new Set(["msgbatch_known"]);
    const found = await findUnjournaledBatch(known, "2026-09-22T10:00:00Z", 2886, api);
    expect(found?.id).toBe("msgbatch_new");
    expect(await findUnjournaledBatch(known, "2026-09-22T10:00:00Z", 5, api)).toBeNull();
    expect(await findUnjournaledBatch(new Set(["msgbatch_known", "msgbatch_new"]), "2026-09-22T10:00:00Z", 2886, api)).toBeNull();
    // Ten minutes of clock skew is allowed; two hours is not.
    expect((await findUnjournaledBatch(known, "2026-09-22T10:05:00Z", 2886, api))?.id).toBe("msgbatch_new");
    expect(await findUnjournaledBatch(known, "2026-09-22T12:05:00Z", 2886, api)).toBeNull();
  });

  it("assertBulkKey refuses to run bulk work without the separate key", () => {
    const saved = process.env[BULK_KEY_ENV];
    try {
      delete process.env[BULK_KEY_ENV];
      expect(() => assertBulkKey()).toThrow(/ANTHROPIC_BULK_API_KEY is not set/);
      process.env[BULK_KEY_ENV] = "test-only-not-a-real-key";
      expect(assertBulkKey()).toBe("test-only-not-a-real-key");
    } finally {
      if (saved === undefined) delete process.env[BULK_KEY_ENV];
      else process.env[BULK_KEY_ENV] = saved;
    }
  });

  it("toOutcome classifies results and marks only invalid requests non-retryable", () => {
    const ok = toOutcome({ custom_id: "a", result: { type: "succeeded", message: message("{}") } });
    expect(ok.type).toBe("succeeded");
    const invalid = toOutcome({ custom_id: "b", result: { type: "errored", error: { type: "error", error: { type: "invalid_request_error", message: "bad" } } } });
    expect(invalid).toMatchObject({ type: "errored", errorType: "invalid_request_error", retryable: false });
    expect(isRetryable(invalid)).toBe(false);
    const overloaded = toOutcome({ custom_id: "c", result: { type: "errored", error: { type: "error", error: { type: "overloaded_error", message: "busy" } } } });
    expect(isRetryable(overloaded)).toBe(true);
    expect(isRetryable(toOutcome({ custom_id: "d", result: { type: "expired" } }))).toBe(true);
    expect(isRetryable(toOutcome({ custom_id: "e", result: { type: "canceled" } }))).toBe(true);
    expect(isRetryable(ok)).toBe(false);
  });

  it("collectResults keys results by custom_id whatever order they stream in", async () => {
    const ids = [2, 0, 1].map((i) => makeCustomId("solve", CUID, i));
    const api = fakeApi({
      results: async () =>
        (async function* () {
          yield { custom_id: ids[0], result: { type: "succeeded" as const, message: message('{"chosen":"B"}') } };
          yield { custom_id: ids[1], result: { type: "expired" as const } };
          yield { custom_id: ids[2], result: { type: "succeeded" as const, message: message('{"chosen":"C"}') } };
        })(),
    });
    const out = await collectResults("msgbatch_x", api);
    expect([...out.keys()].sort()).toEqual([...ids].sort());
    expect(out.get(makeCustomId("solve", CUID, 0))?.type).toBe("expired");
    const two = out.get(makeCustomId("solve", CUID, 2));
    expect(two?.type === "succeeded" && parseSolveRun(two.message)?.chosen).toBe("B");
  });

  it("mapLimit keeps input order and never exceeds the limit", async () => {
    let inFlight = 0;
    let peak = 0;
    const out = await mapLimit([5, 1, 4, 2, 3], 2, async (x) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, x));
      inFlight -= 1;
      return x * 10;
    });
    expect(out).toEqual([50, 10, 40, 20, 30]);
    expect(peak).toBe(2);
    expect(await mapLimit([], 3, async (x: number) => x)).toEqual([]);
  });

  it("estimates tokens and prices them at batch rates", () => {
    expect(estimateTokens("a".repeat(400))).toBe(100);
    expect(estimateTokens("क".repeat(16))).toBe(10);
    const p = buildSolveRequest(candidate, 0);
    const est = estimateRequestTokens(p);
    expect(est).toBeGreaterThan(100);
    expect(est).toBeLessThan(400);
    expect(tokensUsd("claude-opus-4-8", { input: 1_000_000, output: 1_000_000 }, { batch: true })).toBeCloseTo((5 + 25) * 0.5, 6);
    expect(tokensUsd("claude-opus-4-8", { input: 1_000_000, output: 1_000_000 })).toBeCloseTo(30, 6);
  });
});

// ---------------------------------------------------------------------------
// journal
// ---------------------------------------------------------------------------

describe("journal", () => {
  it("round-trips through disk and survives a resume", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bank-verify-journal-"));
    try {
      const file = journalPath(dir, "20260922-120000-UK_UKSSSC");
      const j = newJournal("20260922-120000-UK_UKSSSC", { exams: ["UK_UKSSSC"] }, { solve: {}, verify: {} } as { solve: Record<string, unknown>; verify: Record<string, unknown> });
      const id = makeCustomId("solve", CUID, 0);
      const stale = makeCustomId("solve", CUID, 1);
      j.questions[CUID] = { code: "UK_UKSSSC" };
      j.requests[id] = { customId: id, phase: "solve", questionId: CUID, code: "UK_UKSSSC", runIndex: 0, attempt: 1, status: "submitted", batchId: "msgbatch_1" };
      j.requests[stale] = { customId: stale, phase: "solve", questionId: CUID, code: "UK_UKSSSC", runIndex: 1, attempt: 1, status: "stale", batchId: "msgbatch_1", ledgered: true };
      j.batches.push({ id: "msgbatch_1", phase: "solve", attempt: 1, count: 1, submittedAt: "2026-09-22T12:00:00Z", status: "in_progress", collected: false });
      j.pendingSubmit = { phase: "solve", attempt: 2, count: 1, at: "2026-09-22T12:30:00Z", customIds: [makeCustomId("solve", CUID, 2)] };
      j.phase = "solve-submitted";
      saveJournal(file, j);
      expect(fs.existsSync(`${file}.tmp`)).toBe(false);
      const back = loadJournal<typeof j.outputs>(file);
      expect(back.runId).toBe(j.runId);
      expect(back.phase).toBe("solve-submitted");
      expect(back.requests[id]).toEqual(j.requests[id]);
      expect(back.requests[stale]).toEqual(j.requests[stale]);
      expect(back.pendingSubmit).toEqual(j.pendingSubmit);
      expect(back.batches[0].id).toBe("msgbatch_1");
      expect(back.questions[CUID].code).toBe("UK_UKSSSC");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects a run id that is not a file-name token and a file that is not a journal", () => {
    expect(() => journalPath("x", "../../etc")).toThrow(/plain file-name token/);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bank-verify-journal-"));
    try {
      const file = path.join(dir, "junk.json");
      fs.writeFileSync(file, JSON.stringify({ hello: 1 }));
      expect(() => loadJournal(file)).toThrow(/not a v1 batch journal/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// spend guard (26 Sep 2026): flags, the production-key probe, the worst case
// ---------------------------------------------------------------------------

const PROBE_OK: ProbeResult = { ok: true, kind: "ok", status: 200, detail: "stub" };

describe("spend guard flags", () => {
  it("--apply needs --max-usd and --i-confirm-auto-reload; --chunk defaults to 2000 and stays within the API chunk", () => {
    expect(() => guardFlags(["--apply"], true)).toThrow(/--apply needs --max-usd/);
    expect(() => guardFlags(["--apply", "--max-usd", "5"], true)).toThrow(/--apply needs --i-confirm-auto-reload/);
    expect(() => guardFlags(["--apply", "--max-usd", "5"], true)).toThrow(/auto-reload is ON/);
    expect(guardFlags(["--apply", "--max-usd", "5", CONFIRM_AUTO_RELOAD_FLAG], true)).toEqual({ maxUsd: 5, chunkSize: DEFAULT_CHUNK, confirmed: true });
    expect(guardFlags(["--max-usd", "0.5", "--chunk", "250", CONFIRM_AUTO_RELOAD_FLAG], true)).toEqual({ maxUsd: 0.5, chunkSize: 250, confirmed: true });
    expect(DEFAULT_CHUNK).toBe(2000);
    for (const bad of [["--max-usd", "0"], ["--max-usd", "-3"], ["--max-usd", "abc"], ["--max-usd", "--chunk"], ["--max-usd"]]) {
      expect(() => guardFlags(bad, false), bad.join(" ")).toThrow(/--max-usd must be a positive number/);
    }
    for (const bad of [["--chunk", "0"], ["--chunk", String(BATCH_CHUNK_MAX + 1)], ["--chunk", "2.5"], ["--chunk", "x"]]) {
      expect(() => guardFlags(bad, false), bad.join(" ")).toThrow(/--chunk must be a whole number/);
    }
    expect(guardFlags(["--chunk", String(BATCH_CHUNK_MAX)], false).chunkSize).toBe(BATCH_CHUNK_MAX);
    // a dry run needs none of them
    expect(guardFlags([], false)).toEqual({ maxUsd: null, chunkSize: DEFAULT_CHUNK, confirmed: false });
    expect(guardFlags(["--exams", "NDA", "--scope", "validated"], false).maxUsd).toBeNull();
  });
});

describe("production key probe (the SDK's own error objects, no network)", () => {
  // What the SDK throws for an HTTP error reply: generate() needs a headers record (SDK 0.40's own Record type), or it builds a connection error instead.
  const apiError = (status: number, type: string, message: string) => Anthropic.APIError.generate(status, { type: "error", error: { type, message } }, message, {});

  it("an empty balance is a billing error whatever the HTTP status says, and the pre-flight gate refuses it in the founder's words", () => {
    const p = classifyProbeError(apiError(400, "invalid_request_error", "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."));
    expect(p).toMatchObject({ ok: false, kind: "billing", status: 400 });
    // the body's own message, not the SDK's "400 {…json…}" wrapper
    expect(p.detail).toBe("invalid_request_error: Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.");
    expect(classifyProbeError(apiError(402, "billing_error", "x")).kind).toBe("billing");
    expect(describeProbe(p)).toMatch(/BILLING ERROR/);
    expect(describeProbe(p)).toMatch(/HTTP 400/);
    expect(() => assertProductionKeyProbe(p)).toThrow(/the tutor's balance is empty; add credit first/);
  });

  it("a bad key, an outage and a missing status are refused too, and a key never reaches the text", () => {
    const auth = classifyProbeError(apiError(401, "authentication_error", "invalid x-api-key sk-ant-api03-SECRETSECRET"));
    expect(auth).toMatchObject({ ok: false, kind: "auth", status: 401 });
    expect(auth.detail).not.toContain("SECRETSECRET");
    expect(describeProbe(auth)).not.toContain("SECRETSECRET");
    expect(() => assertProductionKeyProbe(auth)).toThrow(/could not be verified/);
    const down = classifyProbeError(new Error("fetch failed"));
    expect(down).toMatchObject({ ok: false, kind: "error", status: null });
    expect(describeProbe(down)).toMatch(/FAILED · no HTTP status/);
    expect(() => assertProductionKeyProbe(down)).toThrow(/could not be verified/);
    expect(classifyProbeError(apiError(529, "overloaded_error", "Overloaded")).kind).toBe("error");
    expect(() => assertProductionKeyProbe(PROBE_OK)).not.toThrow();
    expect(describeProbe(PROBE_OK)).toBe("ok · HTTP 200 · stub");
    expect(PROBE_MODEL).toBe("claude-haiku-4-5-20251001");
  });
});

describe("worst case and what awaits a submit", () => {
  it("worstCaseUsd prices a chunk as the estimate does: every reply fills max_tokens, prompts at their character count, batch prices", () => {
    const p = buildSolveRequest(candidate, 0);
    const one = worstCaseUsd([{ params: p }]);
    expect(one).toBeCloseTo(tokensUsd(p.model, { input: estimateRequestTokens(p), output: p.max_tokens }, { batch: true }), 12);
    expect(one).toBeGreaterThan(tokensUsd(p.model, { input: 0, output: p.max_tokens }, { batch: true }));
    expect(worstCaseUsd([{ params: p }, { params: p }, { params: p }])).toBeCloseTo(one * 3, 12);
    expect(worstCaseUsd([])).toBe(0);
    // 2,000 solves at 2,000 max_tokens on the strong tier: the number an operator sees before a full-bank chunk
    expect(worstCaseUsd(Array.from({ length: 2000 }, () => ({ params: p })))).toBeCloseTo(one * 2000, 8);
  });

  it("awaitsSubmit: built, or a first attempt due its one retry (unusable only when the phase retries those)", () => {
    const r = (status: JournalRequest["status"], attempt: number): JournalRequest => ({ customId: "x", phase: "verify", questionId: CUID, code: "NDA", attempt, status });
    expect(awaitsSubmit(r("built", 1), false)).toBe(true);
    expect(awaitsSubmit(r("built", 2), false)).toBe(true);
    for (const s of ["errored", "expired", "canceled"] as const) {
      expect(awaitsSubmit(r(s, 1), false), s).toBe(true);
      expect(awaitsSubmit(r(s, 2), false), s).toBe(false);
    }
    expect(awaitsSubmit(r("unusable", 1), true)).toBe(true);
    expect(awaitsSubmit(r("unusable", 1), false)).toBe(false);
    expect(awaitsSubmit(r("unusable", 2), true)).toBe(false);
    for (const s of ["submitted", "succeeded", "failed", "stale"] as const) expect(awaitsSubmit(r(s, 1), true), s).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// the paused full-bank journal (26 Sep 2026)
// ---------------------------------------------------------------------------
//
// D:/CodexProjects/shishya-data/bank-verify-batches/full-bank-validated-20260925.json
// as it stands: phase verify-collected, every solve and verify batch ended
// and collected, 36,622 verdicts in outputs.verify, 45 verify requests that
// the old driver had already marked attempt 2 / built (their attempt-1 reply
// was not JSON) — still carrying ledgered:true from attempt 1 — and a
// pendingSubmit of exactly those 45 (the retry's create POST was cut off at
// 11:12 IST). The write step has not run. Scaled down: 8 questions, 3 retries.

type BankOutputs = { solve: Record<string, Record<string, SolveRun | null>>; verify: Record<string, VerifyVerdict> };

const QUESTIONS = 8;
const RETRIES = 3;

function pausedFullBankJournal(dir: string) {
  const runId = "full-bank-validated-test";
  const file = journalPath(dir, runId);
  const j = newJournal<BankOutputs>(runId, { exams: ["NDA"], scope: "validated", mode: "batch" }, { solve: {}, verify: {} });
  delete j.spentUsd; // written before the field existed
  const ids = Array.from({ length: QUESTIONS }, (_, i) => `cmp0000000000000000000${String(i).padStart(2, "0")}`);
  for (const id of ids) {
    j.questions[id] = { code: "NDA" };
    for (let i = 0; i < 3; i++) {
      const cid = makeCustomId("solve", id, i);
      j.requests[cid] = { customId: cid, phase: "solve", questionId: id, code: "NDA", runIndex: i, attempt: 1, status: "succeeded", batchId: "msgbatch_solve", ledgered: true };
      (j.outputs.solve[id] ??= {})[String(i)] = { chosen: "B", reasoning: `working ${i}`, confidence: 0.9 };
    }
    const vid = makeCustomId("verify", id);
    j.requests[vid] = { customId: vid, phase: "verify", questionId: id, code: "NDA", attempt: 1, status: "succeeded", batchId: "msgbatch_verify", ledgered: true };
    j.outputs.verify[id] = { verdict: "CORRECT", correctKey: "B", confidence: 0.95, difficulty: "EASY", rationale: "fine", issues: [] };
  }
  const retryIds = ids.slice(0, RETRIES);
  for (const id of retryIds) {
    const r = j.requests[makeCustomId("verify", id)];
    r.attempt = 2;
    r.status = "built";
    delete r.batchId;
    r.error = "Failed to parse JSON from model output: Unexpected non-whitespace character after JSON at position 379 (line 9 column 1)";
    delete j.outputs.verify[id];
  }
  j.batches.push(
    { id: "msgbatch_solve", phase: "solve", attempt: 1, count: QUESTIONS * 3, submittedAt: "2026-09-25T17:16:42.863Z", status: "ended", endedAt: "2026-09-25T18:00:00.000Z", collected: true },
    { id: "msgbatch_verify", phase: "verify", attempt: 1, count: QUESTIONS, submittedAt: "2026-09-26T03:00:00.000Z", status: "ended", endedAt: "2026-09-26T05:00:00.000Z", collected: true },
  );
  j.pendingSubmit = { phase: "verify", attempt: 2, count: RETRIES, at: "2026-09-26T05:42:11.955Z", customIds: retryIds.map((id) => makeCustomId("verify", id)) };
  j.phase = "verify-collected";
  saveJournal(file, j);
  return { file, journal: loadJournal<BankOutputs>(file), ids, retryIds };
}

const VERDICT_JSON = '{"verdict":"CORRECT","correctKey":"B","confidence":0.9,"difficulty":"EASY","rationale":"fine","issues":[]}';

describe("the paused full-bank journal under the spend guard", () => {
  it("--resume --max-usd 5 --chunk 2000: Phase A has nothing to do, Phase B submits the 45 once, ledgers each retry, probes once, and leaves every question with its verdict for the write step", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bank-verify-paused-"));
    try {
      const { file, journal, ids, retryIds } = pausedFullBankJournal(dir);
      const creates: string[][] = [];
      const api = fakeApi({
        create: async (body) => {
          creates.push(body.requests.map((r) => r.custom_id));
          return batch({ id: "msgbatch_retry", processing_status: "in_progress" });
        },
        retrieve: async (id) => batch({ id, processing_status: "ended" }),
        results: async () =>
          (async function* () {
            for (const id of retryIds) yield { custom_id: makeCustomId("verify", id), result: { type: "succeeded" as const, message: message(VERDICT_JSON) } };
          })(),
      });
      const ledgered: string[] = [];
      const probes: string[] = [];
      const log: string[] = [];
      const guard: SpendGuard = { maxUsd: 5, chunkSize: 2000, probe: async () => (probes.push("probe"), PROBE_OK) };
      const deps = {
        api,
        pollIntervalMs: 1,
        log: (l: string) => log.push(l),
        warn: () => {},
        ledger: async (_f: string, r: JournalRequest) => (ledgered.push(`${r.customId}:${r.attempt}`), 0.0225),
        guard,
      };
      // Phase A, as scripts/verify-question-bank.ts runs it on --resume: nothing built, open or uncollected
      const a = await runJournalPhase(journal, file, "solve", "bank-solve", (r) => buildSolveRequest(candidate, r.runIndex ?? 0), () => true, false, deps);
      expect(a).toEqual({ costUsd: 0, failed: [], stuck: [] });
      expect(creates).toEqual([]);
      expect(probes).toEqual([]);
      // Phase B
      const b = await runJournalPhase(
        journal,
        file,
        "verify",
        "bank-verify",
        () => buildVerifyRequest(candidate, solve),
        (r, m) => {
          journal.outputs.verify[r.questionId] = parseVerifyVerdict(m, candidate);
          return true;
        },
        true,
        deps,
      );
      // the cut-off submit was looked up on the API, not found, and submitted again — once, as one chunk
      expect(api.calls.filter((c) => c === "list")).toHaveLength(1);
      expect(creates).toEqual([retryIds.map((id) => makeCustomId("verify", id))]);
      expect(b.stop).toBeUndefined();
      expect(b.failed).toEqual([]);
      expect(b.stuck).toEqual([]);
      // the retry's reply is ledgered although attempt 1 had left ledgered:true on the request
      expect(ledgered.sort()).toEqual(retryIds.map((id) => `${makeCustomId("verify", id)}:2`).sort());
      expect(b.costUsd).toBeCloseTo(RETRIES * 0.0225, 6);
      expect(journal.spentUsd).toBeCloseTo(RETRIES * 0.0225, 6);
      expect(probes).toEqual(["probe"]);
      for (const id of retryIds) expect(journal.requests[makeCustomId("verify", id)]).toMatchObject({ status: "succeeded", attempt: 2, batchId: "msgbatch_retry", ledgered: true });
      expect(journal.pendingSubmit).toBeUndefined();
      expect(journal.phase).toBe("verify-collected");
      expect(journal.batches.map((x) => [x.id, x.phase, x.attempt, x.count, x.collected])).toEqual([
        ["msgbatch_solve", "solve", 1, QUESTIONS * 3, true],
        ["msgbatch_verify", "verify", 1, QUESTIONS, true],
        ["msgbatch_retry", "verify", 2, RETRIES, true],
      ]);
      // the write step's input: every question has its three solves and a verdict
      for (const id of ids) {
        expect(Object.keys(journal.outputs.solve[id])).toEqual(["0", "1", "2"]);
        expect(journal.outputs.verify[id]).toMatchObject({ verdict: "CORRECT", correctKey: "B" });
      }
      const back = loadJournal<BankOutputs>(file);
      expect(back.outputs.verify).toEqual(journal.outputs.verify);
      expect(back.requests).toEqual(journal.requests);
      expect(back.spentUsd).toBeCloseTo(RETRIES * 0.0225, 6);
      expect(log.join("\n")).toMatch(/submitting 3 of 3 requests · worst case \$0\.\d\d · ledgered \$0\.00 so far · ceiling \$5\.00/);
      // and the real 45 sit well under the ceiling the resume names
      expect(worstCaseUsd(Array.from({ length: 45 }, () => ({ params: buildVerifyRequest(candidate, solve) })))).toBeLessThan(5);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses the retry chunk when its worst case would cross --max-usd: nothing submitted, no probe, the 45 stay built, and the message names the ceiling to pass", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bank-verify-paused-"));
    try {
      const { file, journal, retryIds } = pausedFullBankJournal(dir);
      const api = fakeApi({
        create: async () => {
          throw new Error("must not submit");
        },
      });
      const worst = worstCaseUsd(retryIds.map(() => ({ params: buildVerifyRequest(candidate, solve) })));
      const guard: SpendGuard = {
        maxUsd: worst / 2,
        chunkSize: 2000,
        probe: async () => {
          throw new Error("no probe without a collected chunk");
        },
      };
      const warned: string[] = [];
      const b = await runJournalPhase(journal, file, "verify", "bank-verify", () => buildVerifyRequest(candidate, solve), () => true, true, {
        api,
        pollIntervalMs: 1,
        log: () => {},
        warn: (l) => warned.push(l),
        ledger: async () => 0,
        guard,
      });
      expect(b.stop).toMatchObject({ reason: "ceiling", phase: "verify", remaining: RETRIES, spentUsd: 0, maxUsd: worst / 2, chunk: { count: RETRIES } });
      expect(b.stop?.chunk?.worstUsd).toBeCloseTo(worst, 12);
      expect(b.stop?.remainingWorstUsd).toBeCloseTo(worst, 12);
      expect(b.stop?.message).toMatch(/next chunk of 3 requests was NOT submitted/);
      expect(b.stop?.message).toContain(`--max-usd ${Math.max(1, Math.ceil(worst))} or more`);
      expect(warned).toHaveLength(1);
      expect(warned[0]).toContain("--max-usd");
      expect(b.failed).toEqual([]);
      expect(b.costUsd).toBe(0);
      for (const id of retryIds) expect(journal.requests[makeCustomId("verify", id)]).toMatchObject({ status: "built", attempt: 2 });
      // the cut-off submit was resolved (looked up, not found) before the ceiling check, so a resume does not look again
      expect(api.calls).toEqual(["list"]);
      expect(journal.pendingSubmit).toBeUndefined();
      const back = loadJournal<BankOutputs>(file);
      expect(back.args.lastStop).toMatchObject({ phase: "verify", reason: "ceiling" });
      expect(Object.values(back.requests).filter((r) => r.status === "built")).toHaveLength(RETRIES);
      expect(Object.values(back.requests).filter((r) => r.status === "failed")).toHaveLength(0);
      expect(back.spentUsd ?? 0).toBe(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("runJournalPhase refuses to run without a real ceiling", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bank-verify-paused-"));
    try {
      const { file, journal } = pausedFullBankJournal(dir);
      const api = fakeApi();
      for (const maxUsd of [0, -1, Number.POSITIVE_INFINITY, Number.NaN]) {
        await expect(runJournalPhase(journal, file, "verify", "bank-verify", () => buildVerifyRequest(candidate, solve), () => true, true, { api, guard: { maxUsd, chunkSize: 2000, probe: async () => PROBE_OK } })).rejects.toThrow(
          /spend guard with a finite --max-usd above zero is required/,
        );
      }
      expect(api.calls).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

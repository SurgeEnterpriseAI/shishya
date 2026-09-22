// Message Batches API helpers + an on-disk run journal (22 Sep 2026).
//
// Why: the Anthropic console said it on 20 Sep 2026 — "Save 50% on async
// workloads with the Batch API". The one Shishya workload that fits is the
// question-bank firewall (scripts/verify-question-bank.ts): on 15 Sep 2026
// it made 8,614 Opus 4.8 calls in a day ($53.53) with 0% cache, and each
// prompt (~550 tokens) sits below Opus 4.8's 1,024-token cache minimum, so
// caching cannot help and only batching can. Every token of a batch result
// bills at half price (input, output, cache write, cache read).
//
// Facts this file relies on (Anthropic docs, SDK 0.40):
//   - client.messages.batches.create({ requests: [{ custom_id, params }] });
//     params are the same object messages.create takes. Up to 100,000
//     requests / 256 MB per batch. custom_id must match ^[a-zA-Z0-9_-]{1,64}$
//     and be unique within the batch.
//   - poll client.messages.batches.retrieve(id).processing_status until
//     "ended" (most batches finish within an hour, all within 24 h).
//   - for await (const r of await client.messages.batches.results(id)):
//     r.custom_id, r.result.type in succeeded | errored | expired | canceled,
//     r.result.message is a normal Message with usage. Results arrive in
//     ANY order and are kept for 29 days.
//   - errored + error.type invalid_request_error is not retryable; the
//     other error types, expired and canceled are worth one resubmission.
//
// The journal is what makes a run survivable: it records every custom_id,
// which batch carries it, its status and the parsed output, so a killed
// process resumes with --resume <runId> instead of paying twice.

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { BATCH_PRICE_FACTOR, PRICING } from "./usage";

export type BatchRequest = Anthropic.Messages.BatchCreateParams.Request;
export type MessageBatch = Anthropic.Messages.MessageBatch;
export type MessageBatchRequestCounts = Anthropic.Messages.MessageBatchRequestCounts;

/** API limit is 100,000 requests / 256 MB; we submit at most this many per batch so one bad chunk is cheap to redo. */
export const BATCH_CHUNK_MAX = 10_000;
export const CUSTOM_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

/** The slice of the SDK the helpers use; injectable so tests run with a fake and never touch the network. */
export interface BatchesApi {
  create(body: Anthropic.Messages.BatchCreateParams): PromiseLike<MessageBatch>;
  retrieve(id: string): PromiseLike<MessageBatch>;
  results(id: string): PromiseLike<AsyncIterable<Anthropic.Messages.MessageBatchIndividualResponse>>;
  /** Most recent batches first; used to adopt a batch the API accepted while the journal was not yet written. */
  list(query?: { limit?: number }): PromiseLike<{ data: MessageBatch[] }>;
}

/**
 * Batches never run on the shared ANTHROPIC_API_KEY. That key serves /api/ask
 * and the tutor and was emptied three times on 15 Sep 2026 by bulk jobs; the
 * founder put every bulk AI job on hold until a separate key exists. So the
 * batch client is built from this variable alone, and a caller that wants to
 * submit anything asks for it up front (assertBulkKey) before touching the
 * database.
 */
export const BULK_KEY_ENV = "ANTHROPIC_BULK_API_KEY";

export function assertBulkKey(): string {
  const key = process.env[BULK_KEY_ENV];
  if (!key) throw new Error(`${BULK_KEY_ENV} is not set: bulk jobs must not run on the shared ANTHROPIC_API_KEY (hold since 15 Sep 2026)`);
  return key;
}

let bulkClient: Anthropic | null = null;

function liveApi(): BatchesApi {
  bulkClient ??= new Anthropic({ apiKey: assertBulkKey() });
  return bulkClient.messages.batches;
}

// ---------------------------------------------------------------------------
// custom_id codec
// ---------------------------------------------------------------------------
//
// <phase>_<questionId>[_<runIndex>]. The design note said solve|<code>|<i>,
// but "|" is outside the API's custom_id pattern, so "_" separates instead;
// question ids are cuids (lower-case alphanumerics), which never contain it.

export interface ParsedCustomId {
  phase: string;
  questionId: string;
  runIndex?: number;
}

export function makeCustomId(phase: string, questionId: string, runIndex?: number): string {
  if (!/^[a-z]+$/.test(phase)) throw new Error(`custom_id: phase "${phase}" must be lower-case letters`);
  if (!/^[A-Za-z0-9-]+$/.test(questionId)) throw new Error(`custom_id: question id "${questionId}" has characters outside [A-Za-z0-9-]`);
  const id = runIndex == null ? `${phase}_${questionId}` : `${phase}_${questionId}_${runIndex}`;
  if (!CUSTOM_ID_PATTERN.test(id)) throw new Error(`custom_id "${id}" does not match ${CUSTOM_ID_PATTERN}`);
  return id;
}

export function parseCustomId(customId: string): ParsedCustomId | null {
  const m = /^([a-z]+)_([A-Za-z0-9-]+?)(?:_(\d+))?$/.exec(customId);
  if (!m) return null;
  return { phase: m[1], questionId: m[2], ...(m[3] != null ? { runIndex: Number(m[3]) } : {}) };
}

// ---------------------------------------------------------------------------
// Submit / poll / collect
// ---------------------------------------------------------------------------

/** Rejects a request list that the API would reject, before anything is sent. */
export function assertBatchRequests(requests: BatchRequest[]): void {
  if (!requests.length) throw new Error("batch: no requests");
  if (requests.length > BATCH_CHUNK_MAX) throw new Error(`batch: ${requests.length} requests exceeds the ${BATCH_CHUNK_MAX} chunk cap`);
  const seen = new Set<string>();
  for (const r of requests) {
    if (!CUSTOM_ID_PATTERN.test(r.custom_id)) throw new Error(`batch: custom_id "${r.custom_id}" does not match ${CUSTOM_ID_PATTERN}`);
    if (seen.has(r.custom_id)) throw new Error(`batch: duplicate custom_id "${r.custom_id}"`);
    seen.add(r.custom_id);
  }
}

export async function submitBatch(requests: BatchRequest[], api: BatchesApi = liveApi()): Promise<MessageBatch> {
  assertBatchRequests(requests);
  return await api.create({ requests });
}

/** Consecutive retrieve failures pollBatch tolerates: at the 60 s default interval that is ten minutes without the API. */
export const POLL_MAX_FAILURES = 10;
/** The API expires a batch after 24 h; two hours of slack, then the caller gets an error instead of polling forever. */
export const POLL_MAX_MS = 26 * 3_600_000;

export async function pollBatch(
  id: string,
  opts: { intervalMs?: number; maxMs?: number; onTick?: (batch: MessageBatch) => void; api?: BatchesApi } = {},
): Promise<MessageBatch> {
  const api = opts.api ?? liveApi();
  const intervalMs = opts.intervalMs ?? 60_000;
  const maxMs = opts.maxMs ?? POLL_MAX_MS;
  const deadline = Date.now() + maxMs;
  let failures = 0;
  for (;;) {
    if (Date.now() > deadline) throw new Error(`batch ${id}: not ended after ${(maxMs / 3_600_000).toFixed(1)} h of polling`);
    let batch: MessageBatch;
    try {
      batch = await api.retrieve(id);
      failures = 0;
    } catch (e) {
      // A dropped connection overnight must not end an unattended run: the batch
      // keeps processing server-side, so wait out the outage and retry.
      if (++failures >= POLL_MAX_FAILURES) throw e;
      console.warn(`   poll ${id} failed (${failures}/${POLL_MAX_FAILURES}): ${String((e as Error)?.message ?? e).slice(0, 120)}`);
      await sleep(intervalMs);
      continue;
    }
    opts.onTick?.(batch);
    if (batch.processing_status === "ended") return batch;
    await sleep(intervalMs);
  }
}

/** Allowance for the laptop clock running ahead of the API's when matching a batch's created_at. */
const CLOCK_SKEW_MS = 10 * 60_000;

/**
 * Finds a batch the API accepted but the journal never recorded: a kill
 * while the create POST was in flight leaves the batch running server-side
 * while every request still reads "built", and a plain resume would submit
 * the same requests again. The match is a batch whose id the journal does
 * not know, created at or after the submit was attempted, with exactly the
 * number of requests that submit carried. Null when there is none.
 */
export async function findUnjournaledBatch(
  known: Set<string>,
  attemptedAt: string,
  count: number,
  api: BatchesApi = liveApi(),
): Promise<MessageBatch | null> {
  const since = Date.parse(attemptedAt) - CLOCK_SKEW_MS;
  const page = await api.list({ limit: 20 });
  const candidates = page.data
    .filter((b) => !known.has(b.id) && Date.parse(b.created_at) >= since && batchTotal(b.request_counts) === count)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return candidates[0] ?? null;
}

export function batchTotal(c: MessageBatchRequestCounts): number {
  return c.processing + c.succeeded + c.errored + c.expired + c.canceled;
}

export type BatchOutcome =
  | { customId: string; type: "succeeded"; message: Anthropic.Messages.Message }
  | { customId: string; type: "errored"; errorType: string; error: string; retryable: boolean }
  | { customId: string; type: "expired" | "canceled" };

/** Error types where resubmitting the same request cannot help. */
const NON_RETRYABLE = new Set(["invalid_request_error", "authentication_error", "permission_error", "billing_error", "not_found_error"]);

export function toOutcome(r: Anthropic.Messages.MessageBatchIndividualResponse): BatchOutcome {
  const customId = r.custom_id;
  switch (r.result.type) {
    case "succeeded":
      return { customId, type: "succeeded", message: r.result.message };
    case "errored": {
      const errorType = String(r.result.error?.error?.type ?? "unknown");
      const error = String(r.result.error?.error?.message ?? "").slice(0, 300);
      return { customId, type: "errored", errorType, error, retryable: !NON_RETRYABLE.has(errorType) };
    }
    case "expired":
      return { customId, type: "expired" };
    case "canceled":
      return { customId, type: "canceled" };
  }
}

export function isRetryable(o: BatchOutcome): boolean {
  return o.type === "expired" || o.type === "canceled" || (o.type === "errored" && o.retryable);
}

/** Every result of an ended batch, keyed by custom_id (results stream in any order). */
export async function collectResults(id: string, api: BatchesApi = liveApi()): Promise<Map<string, BatchOutcome>> {
  const out = new Map<string, BatchOutcome>();
  for await (const r of await api.results(id)) {
    const o = toOutcome(r);
    out.set(o.customId, o);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

export function chunk<T>(items: T[], size: number): T[][] {
  if (size < 1) throw new Error("chunk: size must be >= 1");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Map with at most `limit` promises in flight; results keep input order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Rough prompt-size estimate for a dry run, with no API call: ~4 characters
 * per token for Latin text, ~1.6 for everything else (Devanagari and Telugu
 * tokenise far denser). The 15 Sep 2026 ledger is the cross-check: 533
 * input tokens per solve, ~1,000 per verify.
 */
export function estimateTokens(text: string): number {
  let ascii = 0;
  let other = 0;
  for (const ch of text) {
    if (ch.charCodeAt(0) < 128) ascii += 1;
    else other += 1;
  }
  return Math.ceil(ascii / 4 + other / 1.6);
}

export function estimateRequestTokens(params: Anthropic.Messages.MessageCreateParamsNonStreaming): number {
  let text = "";
  if (typeof params.system === "string") text += params.system;
  else for (const b of params.system ?? []) text += b.text;
  for (const m of params.messages) {
    if (typeof m.content === "string") text += m.content;
    else for (const b of m.content) if (b.type === "text") text += b.text;
  }
  // ~12 tokens of message framing per request.
  return estimateTokens(text) + 12;
}

/** USD for plain input/output tokens on a model tier, at batch (50%) or list price. */
export function tokensUsd(model: string, tokens: { input: number; output: number }, opts: { batch?: boolean } = {}): number {
  const tier = model.includes("haiku") ? "haiku" : model.includes("opus") ? "opus" : "sonnet";
  const p = PRICING[tier];
  const list = (tokens.input / 1e6) * p.in + (tokens.output / 1e6) * p.out;
  return opts.batch ? list * BATCH_PRICE_FACTOR : list;
}

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------

export type JournalRequestStatus =
  | "built" // params can be rebuilt; not yet in a batch
  | "submitted" // in a batch that has not been collected
  | "succeeded" // result parsed into outputs
  | "unusable" // the model replied but the reply could not be parsed
  | "errored" // API error on this request (retryable type)
  | "expired"
  | "canceled"
  | "failed" // gave up: non-retryable error, or a retry failed too
  | "stale"; // its question left the run (verified elsewhere meanwhile) while it sat in an open batch: ledger the result, never parse or retry it

export interface JournalRequest {
  customId: string;
  phase: string;
  /** Question id the request belongs to. */
  questionId: string;
  /** Exam code, carried to the ledger as ref. */
  code: string;
  runIndex?: number;
  attempt: number;
  batchId?: string;
  status: JournalRequestStatus;
  error?: string;
  /** An AiUsage row exists for this request's result; a resume must not insert another. */
  ledgered?: boolean;
}

/** Set while a create POST is in flight; cleared once the batch is journaled. See findUnjournaledBatch. */
export interface PendingSubmit {
  phase: string;
  attempt: number;
  count: number;
  at: string;
  customIds: string[];
}

export interface JournalBatch {
  id: string;
  phase: string;
  attempt: number;
  count: number;
  submittedAt: string;
  status: "in_progress" | "ended";
  endedAt?: string;
  counts?: MessageBatchRequestCounts;
  /** Results read, ledgered and parsed into outputs. A crash before this is set makes the next run re-read them. */
  collected: boolean;
}

export interface BatchJournal<TOutputs> {
  version: 1;
  runId: string;
  createdAt: string;
  updatedAt: string;
  /** Free-form progress marker for humans reading the file. */
  phase: string;
  args: Record<string, unknown>;
  /** questionId -> exam code, so a resumed run can re-fetch the rows. */
  questions: Record<string, { code: string }>;
  requests: Record<string, JournalRequest>;
  batches: JournalBatch[];
  pendingSubmit?: PendingSubmit;
  outputs: TOutputs;
}

export function newJournal<TOutputs>(runId: string, args: Record<string, unknown>, outputs: TOutputs): BatchJournal<TOutputs> {
  const now = new Date().toISOString();
  return { version: 1, runId, createdAt: now, updatedAt: now, phase: "new", args, questions: {}, requests: {}, batches: [], outputs };
}

export function journalPath(dir: string, runId: string): string {
  if (!/^[A-Za-z0-9_.-]{1,80}$/.test(runId)) throw new Error(`journal: runId "${runId}" must be a plain file-name token`);
  return path.join(dir, `${runId}.json`);
}

/** Write-then-rename so a kill mid-write never leaves a half-written journal. */
export function saveJournal<TOutputs>(file: string, journal: BatchJournal<TOutputs>): void {
  journal.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(journal, null, 1));
  fs.renameSync(tmp, file);
}

export function loadJournal<TOutputs>(file: string): BatchJournal<TOutputs> {
  const j = JSON.parse(fs.readFileSync(file, "utf8")) as BatchJournal<TOutputs>;
  if (j?.version !== 1 || typeof j.runId !== "string" || !j.requests || !j.batches) throw new Error(`journal: ${file} is not a v1 batch journal`);
  return j;
}

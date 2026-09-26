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
//
// Since 26 Sep 2026 every submit also goes through the spend guard below
// (--max-usd ceiling, small sequential chunks, a probe of the production
// key): the bulk key and the tutor's key draw on ONE credit balance, and a
// large run emptied it twice at peak hours.

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { BATCH_PRICE_FACTOR, PRICING, recordAiUsageAwaited } from "./usage";

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
  /** Question id the request belongs to. 26 Sep 2026: the school content
   *  runner (scripts/school-content-batch.ts) journals one request per
   *  chapter (notes) or per chapter set (MCQs) and stores the Topic id here;
   *  the field keeps its name so both runners read one journal shape. */
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
  /**
   * USD ledgered by this journal at batch prices, across every invocation
   * (26 Sep 2026): what the --max-usd ceiling reads. Journals written before
   * the field existed carry none, so their earlier spend counts as 0 and the
   * ceiling applies to what is ledgered from here on.
   */
  spentUsd?: number;
  outputs: TOutputs;
}

export function newJournal<TOutputs>(runId: string, args: Record<string, unknown>, outputs: TOutputs): BatchJournal<TOutputs> {
  const now = new Date().toISOString();
  return { version: 1, runId, createdAt: now, updatedAt: now, phase: "new", args, questions: {}, requests: {}, batches: [], spentUsd: 0, outputs };
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

/**
 * Journals under `dir` that still have submitted batches (or a cut-off
 * submit) and cover any of these row ids. A fresh --apply over them would
 * pay for the same requests again, because outputs are written only when a
 * run finishes. Lifted (26 Sep 2026) from scripts/verify-question-bank.ts,
 * which now calls this over its own folder, as the school content runner
 * does over its. An unreadable journal is reported through `warn` and
 * skipped, a missing folder means "none".
 */
export function openJournalsCovering(
  dir: string,
  rowIds: Set<string>,
  warn: (line: string) => void = (line) => console.warn(line),
): Array<{ runId: string; file: string; phase: string; overlap: number; submitted: boolean }> {
  let names: string[];
  try {
    names = fs.readdirSync(dir).filter((n) => n.endsWith(".json"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
  const out: Array<{ runId: string; file: string; phase: string; overlap: number; submitted: boolean }> = [];
  for (const name of names) {
    let j: BatchJournal<unknown>;
    try {
      j = loadJournal<unknown>(path.join(dir, name));
    } catch (e) {
      warn(`   ! skipping unreadable journal ${name}: ${String((e as Error)?.message ?? e).split("\n")[0].slice(0, 120)}`);
      continue;
    }
    if (j.phase === "done") continue;
    const overlap = Object.keys(j.questions).filter((id) => rowIds.has(id)).length;
    // `file` is what --resume takes: the file's own name. A renamed journal
    // (26 Sep 2026: full-bank-validated-20260925.json, whose runId joins exam
    // codes with "+") resumes by that name, never by its runId.
    if (overlap) out.push({ runId: j.runId, file: name.replace(/\.json$/, ""), phase: j.phase, overlap, submitted: j.batches.length > 0 || !!j.pendingSubmit });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Spend guard (26 Sep 2026)
// ---------------------------------------------------------------------------
//
// Twice — 25 Sep 2026 23:40 IST and 26 Sep 2026 10:37 IST — a bulk run on
// ANTHROPIC_BULK_API_KEY emptied the ONE credit balance the organisation has.
// The production key that serves the tutor draws on that same balance, so
// the student-facing tutor went down at peak hours both times. The API has
// no balance endpoint, so the guard works from what a run can see and hold:
//
//   • --max-usd <n>   a hard ceiling on the journal's ledgered spend (batch
//     prices, journal.spentUsd). Before EVERY submit the chunk's worst case —
//     every reply filling max_tokens, plus its prompt tokens — is priced
//     exactly as the dry-run estimate prices it; ledgered-so-far + that worst
//     case above the ceiling refuses the submit, saves the journal and says
//     what to pass to continue. Required for --apply; there is no default.
//   • --chunk <n>     requests per batch (default 2000, at most
//     BATCH_CHUNK_MAX). Chunks go out ONE AT A TIME: each is polled and
//     collected before the next is priced, so the ledger is current at every
//     check and a run proceeds in small, refusable steps.
//   • a probe of the production key (one claude-haiku-4-5-20251001 call,
//     max_tokens 1, on ANTHROPIC_API_KEY): before the run — a billing error
//     means the tutor's balance is already empty and nothing starts — and
//     after every collected chunk, where any failure stops further submits.
//     Only the outcome is ever logged, never the key.
//   • --i-confirm-auto-reload: a literal flag the operator passes after
//     checking in the Console that auto-reload is ON; the runner prints the
//     statement back before submitting. Friction, not a check.

export const PRODUCTION_KEY_ENV = "ANTHROPIC_API_KEY";
/** The probe's model: the cheapest tier, pinned so the probe never drifts to an id the production key cannot use. */
export const PROBE_MODEL = "claude-haiku-4-5-20251001";
/** --chunk default. */
export const DEFAULT_CHUNK = 2000;
export const CONFIRM_AUTO_RELOAD_FLAG = "--i-confirm-auto-reload";
export const CONFIRM_AUTO_RELOAD_HELP = `${CONFIRM_AUTO_RELOAD_FLAG}  the operator has opened the Anthropic Console (Plans & Billing) and confirmed that auto-reload is ON for this organisation, so the balance the tutor shares refills before a bulk run can drain it. --apply refuses to start without it; it is a friction step, not a check.`;
export const CONFIRM_AUTO_RELOAD_STATEMENT = "Operator statement (--i-confirm-auto-reload): I checked the Anthropic Console (Plans & Billing) before this run and auto-reload is ON for this organisation.";

export type ProbeKind = "ok" | "billing" | "auth" | "error";

export interface ProbeResult {
  ok: boolean;
  kind: ProbeKind;
  /** HTTP status of the reply; null when there was none (network, missing key). */
  status: number | null;
  /** For the log: the API error type and the first line of its message, or what the model replied. Never the key. */
  detail: string;
}

export type KeyProbe = () => Promise<ProbeResult>;

/** Anything shaped like an API key is masked before an error line is logged or thrown. */
function redactKeys(s: string): string {
  return s.replace(/sk-ant-[A-Za-z0-9_-]+/g, "sk-ant-…");
}

/** Classifies a messages.create failure: an empty balance, a bad key, or anything else. Exported so tests can feed it the SDK's own error objects. */
export function classifyProbeError(e: unknown): ProbeResult {
  const err = e as { status?: unknown; error?: { error?: { type?: unknown; message?: unknown } }; message?: unknown };
  const status = typeof err?.status === "number" ? err.status : null;
  const type = typeof err?.error?.error?.type === "string" ? err.error.error.type : "";
  // The API body's own message when there is one (the SDK's Error.message prefixes it with the status and the whole JSON body).
  const raw = typeof err?.error?.error?.message === "string" ? err.error.error.message : String(err?.message ?? e);
  const message = redactKeys(raw).split("\n")[0].slice(0, 160);
  // An empty balance arrives as a 400 invalid_request_error whose message says
  // "credit balance is too low … Plans & Billing" (seen 11-13 and 15 Sep 2026);
  // billing_error is its typed form.
  const billing = type === "billing_error" || /credit balance|billing|purchase credits/i.test(`${type} ${message}`);
  const auth = !billing && (status === 401 || status === 403 || type === "authentication_error" || type === "permission_error");
  return { ok: false, kind: billing ? "billing" : auth ? "auth" : "error", status, detail: `${type || "error"}: ${message}` };
}

export function describeProbe(p: ProbeResult): string {
  const http = p.status == null ? "no HTTP status" : `HTTP ${p.status}`;
  if (p.ok) return `ok · ${http} · ${p.detail}`;
  const kind = p.kind === "billing" ? "BILLING ERROR (the shared balance is empty)" : p.kind === "auth" ? "AUTH ERROR" : "FAILED";
  return `${kind} · ${http} · ${p.detail}`;
}

/**
 * One tiny live call on the PRODUCTION key — the only call a bulk runner
 * ever makes on it — asking the one question the API has no endpoint for:
 * can the tutor still be served right now? About $0.00001 per probe (a
 * dozen Haiku tokens); not ledgered.
 */
export async function probeProductionKey(): Promise<ProbeResult> {
  const key = process.env[PRODUCTION_KEY_ENV];
  if (!key) return { ok: false, kind: "error", status: null, detail: `${PRODUCTION_KEY_ENV} is not set — the tutor's key cannot be probed` };
  // A client of its own on the production key (never the bulk client); the SDK retries 429/5xx/connection errors twice by itself.
  const client = new Anthropic({ apiKey: key, maxRetries: 2, timeout: 30_000 });
  try {
    const m = await client.messages.create({ model: PROBE_MODEL, max_tokens: 1, messages: [{ role: "user", content: "ping" }] });
    return { ok: true, kind: "ok", status: 200, detail: `${m.model} replied (${m.usage.input_tokens} in / ${m.usage.output_tokens} out)` };
  } catch (e) {
    return classifyProbeError(e);
  }
}

/** The pre-flight gate: an --apply run starts only on a probe that succeeded. */
export function assertProductionKeyProbe(p: ProbeResult): void {
  if (p.ok) return;
  if (p.kind === "billing") throw new Error(`the tutor's balance is empty; add credit first (production key probe: ${describeProbe(p)})`);
  throw new Error(`the production key could not be verified (probe: ${describeProbe(p)}); nothing is submitted until a probe succeeds`);
}

/** Worst case of a batch at batch prices: every reply fills max_tokens, every prompt at its character-count estimate — as the dry-run estimate prices it. */
export function worstCaseUsd(requests: ReadonlyArray<{ params: Anthropic.Messages.MessageCreateParamsNonStreaming }>): number {
  let usd = 0;
  for (const { params } of requests) usd += tokensUsd(params.model, { input: estimateRequestTokens(params), output: params.max_tokens }, { batch: true });
  return usd;
}

/** A request the phase driver will (re)submit: still built, or a first attempt that gets its one retry. */
export function awaitsSubmit(r: JournalRequest, retryUnusable: boolean): boolean {
  if (r.status === "built") return true;
  if (r.attempt !== 1) return false;
  return r.status === "errored" || r.status === "expired" || r.status === "canceled" || (retryUnusable && r.status === "unusable");
}

export interface GuardFlags {
  /** null only on a dry run (no --max-usd given). */
  maxUsd: number | null;
  chunkSize: number;
  confirmed: boolean;
}

/** Reads --max-usd, --chunk and --i-confirm-auto-reload; an --apply run is refused without the first and the last. */
export function guardFlags(argv: readonly string[], apply: boolean): GuardFlags {
  // A flag given without a value (last on the line) is malformed, not absent.
  const arg = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    return i >= 0 ? (argv[i + 1] ?? "") : undefined;
  };
  const rawMax = arg("--max-usd");
  const maxUsd = rawMax == null ? null : Number(rawMax);
  if (maxUsd != null && !(rawMax && Number.isFinite(maxUsd) && maxUsd > 0)) throw new Error(`--max-usd must be a positive number of US dollars (got "${rawMax}")`);
  const rawChunk = arg("--chunk");
  const chunkSize = rawChunk == null ? DEFAULT_CHUNK : Number(rawChunk);
  if (!rawChunk && rawChunk != null) throw new Error(`--chunk must be a whole number of requests per batch, 1 to ${BATCH_CHUNK_MAX} (got "")`);
  if (!Number.isInteger(chunkSize) || chunkSize < 1 || chunkSize > BATCH_CHUNK_MAX) throw new Error(`--chunk must be a whole number of requests per batch, 1 to ${BATCH_CHUNK_MAX} (got "${rawChunk}")`);
  const confirmed = argv.includes(CONFIRM_AUTO_RELOAD_FLAG);
  if (apply) {
    if (maxUsd == null) {
      throw new Error(
        `--apply needs --max-usd <usd>: a hard ceiling on this run's ledgered spend at batch prices, checked before every chunk against the chunk's worst case (26 Sep 2026: two bulk runs emptied the balance the tutor shares). There is no default — name the number.`,
      );
    }
    if (!confirmed) throw new Error(`--apply needs ${CONFIRM_AUTO_RELOAD_FLAG}.\n   ${CONFIRM_AUTO_RELOAD_HELP}`);
  }
  return { maxUsd, chunkSize, confirmed };
}

export interface SpendGuard {
  /** Hard ceiling on journal.spentUsd (batch prices), checked before every submit. */
  maxUsd: number;
  /** Requests per batch, 1..BATCH_CHUNK_MAX; one chunk in flight at a time. */
  chunkSize: number;
  /** Probe of the production key, run after every collected chunk: probeProductionKey unless a test stubs it. */
  probe: KeyProbe;
}

export interface PhaseStop {
  reason: "ceiling" | "probe";
  phase: string;
  /** journal.spentUsd when the phase stopped. */
  spentUsd: number;
  maxUsd: number;
  /** Requests of this phase still to submit (built, or due their one retry), and their worst case in all. */
  remaining: number;
  remainingWorstUsd: number;
  /** ceiling: the chunk that was refused. */
  chunk?: { count: number; worstUsd: number };
  /** probe: the failed probe. */
  probe?: ProbeResult;
  /** One paragraph for the operator: what happened and what to pass to continue (the runner adds its command line). */
  message: string;
}

// ---------------------------------------------------------------------------
// Phase driver (26 Sep 2026)
// ---------------------------------------------------------------------------
//
// The re-entrant submit → poll → collect → retry loop, with every side
// effect injectable (the SDK slice, the ledger, the probe, the clock, the
// log) so both runners (scripts/verify-question-bank.ts since 26 Sep 2026,
// scripts/school-content-batch.ts) share it and tests drive it with a fake
// API. Step for step:
//
//   0. a submit that was cut off (kill during the create POST) is adopted
//      from the API rather than submitted twice (findUnjournaledBatch);
//   1. every open batch of the phase is settled first — polled to "ended",
//      then collected once: each succeeded result is ledgered exactly once
//      (r.ledgered, cleared whenever a request is submitted), parsed by
//      onMessage (true = usable), and a stale request (its row left the run)
//      is ledgered but never parsed. It was paid for when it was submitted,
//      and settling it first keeps the ledger current for step 2. If this
//      collected anything (a batch a killed invocation left polling, or the
//      one adopted in step 0), the production key is probed before the next
//      chunk goes out, exactly as after a chunk this call submitted — the
//      26 Sep 2026 review found the resume path skipping that probe, so the
//      next chunk went out on the runner's pre-flight probe alone, an hour
//      or more old by then;
//   2. "built" requests are submitted attempt by attempt, ONE CHUNK AT A
//      TIME (guard.chunkSize, ≤ BATCH_CHUNK_MAX): the chunk is priced at its
//      worst case and refused if journal.spentUsd + that crosses
//      guard.maxUsd; otherwise it is submitted (the journal saved before and
//      after the create), settled, and the production key probed — a failed
//      probe stops the phase before the next chunk;
//   3. errored (retryable), expired, canceled — and unusable when
//      retryUnusable — requests get ONE resubmission (attempt 2);
// then whatever is not succeeded / unusable / stale is marked failed. A
// guard stop returns before that: what is still to submit stays "built",
// and PhaseOutcome.stop tells the runner not to go on.

export interface PhaseDeps {
  /** SDK slice; the live bulk-key client when omitted. */
  api?: BatchesApi;
  /**
   * Ledgers one succeeded result and returns its USD. Default: an AiUsage row
   * via recordAiUsageAwaited(feature, message, { model, ref: request.code,
   * batch: true }); a test passes a stub so nothing reaches the database.
   */
  ledger?: (feature: string, req: JournalRequest, message: Anthropic.Messages.Message) => Promise<number>;
  pollIntervalMs?: number;
  pollMaxMs?: number;
  log?: (line: string) => void;
  warn?: (line: string) => void;
  /** Ledger inserts in flight while collecting (see recordAiUsageAwaited). Default 6. */
  ledgerParallel?: number;
  /** Journal saves while collecting: a kill between two saves re-ledgers at most this many results on resume. Default 50. */
  saveEvery?: number;
  /** Clock, for the submit timestamps (tests pin it). */
  now?: () => Date;
  /** 26 Sep 2026: the ceiling, the chunk size and the production-key probe. Every submit goes through it; there is no default. */
  guard: SpendGuard;
}

export interface PhaseOutcome {
  /** USD ledgered by this call (results collected now, not on an earlier resume). */
  costUsd: number;
  /** Requests that ended failed (API error after the retry, or non-retryable). */
  failed: JournalRequest[];
  /** Replies still unparseable after their retry (only when retryUnusable). */
  stuck: JournalRequest[];
  /** Set when the guard stopped the phase early: the journal is saved, what is still to submit stays "built", and the runner must not go on to the next phase. */
  stop?: PhaseStop;
}

const isTerminalStatus = (s: JournalRequestStatus) => s !== "built" && s !== "submitted";

function defaultLedger(feature: string, req: JournalRequest, message: Anthropic.Messages.Message): Promise<number> {
  return recordAiUsageAwaited(feature, message, { model: message.model, ref: req.code, batch: true });
}

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;

export async function runJournalPhase<TOutputs>(
  journal: BatchJournal<TOutputs>,
  file: string,
  phase: string,
  feature: string,
  build: (req: JournalRequest) => Anthropic.Messages.MessageCreateParamsNonStreaming,
  onMessage: (req: JournalRequest, message: Anthropic.Messages.Message) => boolean,
  retryUnusable: boolean,
  deps: PhaseDeps,
): Promise<PhaseOutcome> {
  const api = deps.api;
  const guard = deps.guard;
  if (!guard || !Number.isFinite(guard.maxUsd) || guard.maxUsd <= 0) throw new Error(`runJournalPhase(${phase}): a spend guard with a finite --max-usd above zero is required (26 Sep 2026); there is no default`);
  const chunkSize = Math.max(1, Math.min(BATCH_CHUNK_MAX, Math.floor(guard.chunkSize || DEFAULT_CHUNK)));
  const ledger = deps.ledger ?? defaultLedger;
  const log = deps.log ?? ((line: string) => console.log(line));
  const warn = deps.warn ?? ((line: string) => console.warn(line));
  const now = deps.now ?? (() => new Date());
  const ledgerParallel = deps.ledgerParallel ?? 6;
  const saveEvery = deps.saveEvery ?? 50;
  const pollIntervalMs = deps.pollIntervalMs ?? 60_000;
  let costUsd = 0;
  const reqs = () => Object.values(journal.requests).filter((r) => r.phase === phase);
  const spent = () => journal.spentUsd ?? 0;
  /** One collected result's USD, into this call's total and the journal's running total (what the ceiling reads). */
  const book = (usd: number) => {
    costUsd += usd;
    journal.spentUsd = spent() + usd;
  };
  const stillToSubmit = () => {
    const rest = reqs().filter((r) => awaitsSubmit(r, retryUnusable));
    return { remaining: rest.length, remainingWorstUsd: worstCaseUsd(rest.map((r) => ({ params: build(r) }))) };
  };
  const stopWith = (stop: PhaseStop): PhaseOutcome => {
    journal.args.lastStop = { at: now().toISOString(), phase, reason: stop.reason, message: stop.message };
    saveJournal(file, journal);
    warn(`   ✋ ${stop.message}`);
    return { costUsd, failed: [], stuck: [], stop };
  };

  // 0. adopt a batch the API accepted while the journal was not yet written
  const pending = journal.pendingSubmit;
  if (pending && pending.phase === phase) {
    const known = new Set(journal.batches.map((b) => b.id));
    const found = await findUnjournaledBatch(known, pending.at, pending.count, api);
    if (found) {
      log(`   ↩ ${phase} attempt ${pending.attempt}: adopting batch ${found.id} (${pending.count} requests) that the API accepted before the journal was written`);
      journal.batches.push({ id: found.id, phase, attempt: pending.attempt, count: pending.count, submittedAt: pending.at, status: "in_progress", collected: false });
      for (const id of pending.customIds) {
        const r = journal.requests[id];
        if (r && r.status === "built") {
          r.status = "submitted";
          r.batchId = found.id;
          delete r.ledgered;
        }
      }
      journal.phase = `${phase}-submitted`;
    } else {
      log(`   ↩ ${phase}: the interrupted submit of ${pending.count} requests never reached the API; submitting again`);
    }
    delete journal.pendingSubmit;
    saveJournal(file, journal);
  }

  /** Polls every open batch of this phase to "ended", then collects, ledgers and parses each ended batch once. Returns the ids this call collected. */
  const settle = async (): Promise<string[]> => {
    const collected: string[] = [];
    for (const b of journal.batches.filter((x) => x.phase === phase && x.status !== "ended")) {
      log(`   … polling ${b.id} every ${pollIntervalMs / 1000}s`);
      const ended = await pollBatch(b.id, {
        intervalMs: pollIntervalMs,
        maxMs: deps.pollMaxMs,
        api,
        onTick: (m) => {
          b.counts = m.request_counts;
          saveJournal(file, journal);
          const c = m.request_counts;
          log(`     ${now().toISOString().slice(11, 19)} ${m.processing_status} · processing ${c.processing} · succeeded ${c.succeeded} · errored ${c.errored} · expired ${c.expired} · canceled ${c.canceled}`);
        },
      });
      b.status = "ended";
      b.endedAt = ended.ended_at ?? now().toISOString();
      b.counts = ended.request_counts;
      saveJournal(file, journal);
    }

    for (const b of journal.batches.filter((x) => x.phase === phase && x.status === "ended" && !x.collected)) {
      log(`   ← collecting ${b.id}…`);
      const outcomes = [...(await collectResults(b.id, api)).values()];
      let done = 0;
      await mapLimit(outcomes, ledgerParallel, async (o) => {
        const r = journal.requests[o.customId];
        if (!r || r.batchId !== b.id) return;
        // `costUsd += await …` would read costUsd before the await and lose
        // updates across the parallel ledger inserts; book after awaiting.
        if (r.status === "stale") {
          if (o.type === "succeeded" && !r.ledgered) {
            book(await ledger(feature, r, o.message));
            r.ledgered = true;
          }
          return;
        }
        if (isTerminalStatus(r.status)) return;
        if (o.type === "succeeded") {
          if (!r.ledgered) {
            book(await ledger(feature, r, o.message));
            r.ledgered = true;
          }
          r.status = onMessage(r, o.message) ? "succeeded" : "unusable";
        } else if (o.type === "errored") {
          r.status = o.retryable ? "errored" : "failed";
          r.error = `${o.errorType}: ${o.error}`;
        } else {
          r.status = o.type;
        }
        done += 1;
        if (done % saveEvery === 0) saveJournal(file, journal);
      });
      for (const r of reqs()) if (r.batchId === b.id && r.status === "submitted") r.status = "expired";
      b.collected = true;
      journal.phase = `${phase}-collected`;
      saveJournal(file, journal);
      const n = { ok: 0, unusable: 0, err: 0, stale: 0 };
      for (const r of reqs()) {
        if (r.batchId !== b.id) continue;
        if (r.status === "succeeded") n.ok += 1;
        else if (r.status === "unusable") n.unusable += 1;
        else if (r.status === "stale") n.stale += 1;
        else n.err += 1;
      }
      log(`     ${b.id}: ${n.ok} usable · ${n.unusable} unusable replies · ${n.err} errored/expired${n.stale ? ` · ${n.stale} stale (ledgered only)` : ""} · ledger +${fmtUsd(costUsd)} this run · ${fmtUsd(spent())} in all (ceiling ${fmtUsd(guard.maxUsd)})`);
      collected.push(b.id);
    }
    return collected;
  };

  /**
   * The production key after every collected chunk: any failure stops
   * further submits. `after` names the batches just collected — the one this
   * loop submitted, or whatever a resume found open (left polling by a killed
   * invocation, or adopted in step 0; 26 Sep 2026 review). Null when the
   * probe passed; otherwise the stop for stopWith().
   */
  const probeAfter = async (after: string[]): Promise<PhaseStop | null> => {
    const probe = await guard.probe();
    const label = after.join(", ");
    log(`   ${probe.ok ? "✓" : "✗"} production key probe after ${label}: ${describeProbe(probe)}`);
    if (probe.ok) return null;
    const rest = stillToSubmit();
    return {
      reason: "probe",
      phase,
      spentUsd: spent(),
      maxUsd: guard.maxUsd,
      ...rest,
      probe,
      message:
        `${phase}: no further chunk is submitted — the production key probe after ${label} failed (${describeProbe(probe)}).` +
        `${probe.kind === "billing" ? " The tutor's balance is empty; add credit first." : ""} ` +
        `Journal saved; ${rest.remaining} requests of this phase still to submit (worst case ${fmtUsd(rest.remainingWorstUsd)}); ledgered ${fmtUsd(spent())} so far in this run. Resume once a probe succeeds.`,
    };
  };

  for (let pass = 0; pass < 3; pass++) {
    // 1. what is already open was paid for when it was submitted: settle it first, so the ledger is current before the next chunk is priced —
    //    and, as after any collected chunk, probe the production key before anything else goes out (a resume's open batch may have polled for an hour)
    const settled = await settle();
    if (settled.length) {
      const halt = await probeAfter(settled);
      if (halt) return stopWith(halt);
    }

    // 2. submit what is built, one chunk at a time, attempt by attempt (so a batch never mixes first tries and retries)
    for (const attempt of [1, 2]) {
      for (;;) {
        const toSubmit = reqs().filter((r) => r.status === "built" && r.attempt === attempt);
        if (!toSubmit.length) break;
        const part = toSubmit.slice(0, chunkSize);
        const requests: BatchRequest[] = part.map((r) => ({ custom_id: r.customId, params: build(r) }));
        const worst = worstCaseUsd(requests);
        if (spent() + worst > guard.maxUsd) {
          const rest = stillToSubmit();
          const chunkNeeds = spent() + worst;
          const allNeeds = spent() + rest.remainingWorstUsd;
          return stopWith({
            reason: "ceiling",
            phase,
            spentUsd: spent(),
            maxUsd: guard.maxUsd,
            ...rest,
            chunk: { count: requests.length, worstUsd: worst },
            message:
              `${phase}: the next chunk of ${requests.length} requests was NOT submitted — ledgered ${fmtUsd(spent())} so far in this run + worst case ${fmtUsd(worst)} for the chunk (every reply filling max_tokens) is over --max-usd ${fmtUsd(guard.maxUsd)}. ` +
              `Journal saved; ${rest.remaining} requests of this phase still to submit, worst case ${fmtUsd(rest.remainingWorstUsd)} in all. ` +
              `To continue, pass --max-usd ${Math.max(1, Math.ceil(chunkNeeds))} or more (${fmtUsd(chunkNeeds)} lets this chunk through; ${fmtUsd(allNeeds)} covers everything left in this phase at worst), or a smaller --chunk so each step costs less.`,
          });
        }
        log(`   → ${phase} attempt ${attempt}: submitting ${requests.length} of ${toSubmit.length} requests · worst case ${fmtUsd(worst)} · ledgered ${fmtUsd(spent())} so far · ceiling ${fmtUsd(guard.maxUsd)}`);
        journal.pendingSubmit = { phase, attempt, count: requests.length, at: now().toISOString(), customIds: part.map((r) => r.customId) };
        saveJournal(file, journal);
        const batch = await submitBatch(requests, api);
        journal.batches.push({ id: batch.id, phase, attempt, count: requests.length, submittedAt: now().toISOString(), status: "in_progress", collected: false });
        for (const r of part) {
          r.status = "submitted";
          r.batchId = batch.id;
          // This submit's reply is a new billable result: `ledgered` from an
          // earlier attempt must not hide it (26 Sep 2026: the 45 retries of
          // the paused full-bank journal carry ledgered:true from attempt 1).
          delete r.ledgered;
        }
        delete journal.pendingSubmit;
        journal.phase = `${phase}-submitted`;
        saveJournal(file, journal);
        log(`     batch ${batch.id} (expires ${batch.expires_at})`);
        await settle();
        // the production key after every collected chunk: any failure stops further submits
        const halt = await probeAfter([batch.id]);
        if (halt) return stopWith(halt);
      }
    }

    // 3. one retry for what is worth retrying
    const retry = reqs().filter(
      (r) => r.attempt === 1 && (r.status === "errored" || r.status === "expired" || r.status === "canceled" || (retryUnusable && r.status === "unusable")),
    );
    if (!retry.length) break;
    log(`   ↻ ${phase}: resubmitting ${retry.length} requests once`);
    for (const r of retry) {
      r.attempt = 2;
      r.status = "built";
      r.batchId = undefined;
      // The retry's reply is a new billable result: `ledgered` guards the
      // current attempt only (a crash between its ledger row and its status
      // update still re-parses without a second row on resume).
      delete r.ledgered;
    }
    saveJournal(file, journal);
  }

  const failed = reqs().filter((r) => r.status !== "succeeded" && r.status !== "unusable" && r.status !== "stale");
  for (const r of failed) if (r.status !== "failed") r.status = "failed";
  if (failed.length) {
    saveJournal(file, journal);
    warn(`   ✗ ${phase}: ${failed.length} requests failed after a retry — first: ${failed
      .slice(0, 5)
      .map((r) => `${r.customId} ${r.error ?? r.status}`)
      .join(" | ")}`);
  }
  const stuck = retryUnusable ? reqs().filter((r) => r.status === "unusable" && r.attempt === 2) : [];
  if (stuck.length) {
    warn(`   ✗ ${phase}: ${stuck.length} replies unusable after a retry — first: ${stuck
      .slice(0, 5)
      .map((r) => `${r.customId} ${r.error ?? "not JSON"}`)
      .join(" | ")}`);
  }
  return { costUsd, failed, stuck };
}

// scripts/verify-question-bank.ts
//
// Runs the verification firewall (src/lib/ai/factory: three blind solves, an
// examiner verdict, the gate) over questions ALREADY in the bank, exam by exam,
// and applies the result (15 Sep 2026):
//
//   • ACCEPT                                  → validated, key kept
//   • REVIEW because the stored key is wrong  → validated with the corrected key
//     (examiner MISMATCH, and the blind-solve    and the solver's working as the
//     majority agrees with the examiner's key)   solution
//   • anything else (REJECT, AMBIGUOUS, low      → not validated: out of every
//     agreement or confidence, broken shape)     practice pool
//
// Why: pickers serve only validated questions, and "validated" had been
// stamped without an answer check — in bulk (system:bulk:overnight) or at
// insert (system:pyq-pattern). Students report wrong keys; heavy practisers
// run out of questions because ~2,700 unchecked questions sit unused.
//
// Every checked row gets metadata.factoryVerify (decision, verdict, agreement,
// previous key / solution / validation). Rows that already carry it are
// skipped, so the run is resumable. Spend is ledgered as "bank-solve" (blind
// solves) and "bank-verify" (examiner verdicts).
//
// ── Batch mode (22 Sep 2026, the default) ───────────────────────────────────
//
// The 15 Sep 2026 run made 8,614 Opus 4.8 calls in a day ($53.53, 0% cache:
// each ~550-token prompt is under Opus 4.8's 1,024-token cache minimum). The
// same calls through the Message Batches API cost half. So the script now
// runs in two phases, each a set of batches (src/lib/ai/batch.ts):
//
//   Phase A  one solve request per (question, run i)  custom_id solve_<id>_<i>
//            submit ≤10,000 per batch → poll → collect → aggregate per question
//   Phase B  one verify request per question          custom_id verify_<id>
//            submit → poll → collect → write verdicts exactly as before
//
// Errored / expired requests are resubmitted once in a follow-up batch, then
// reported. A journal (D:/CodexProjects/shishya-data/bank-verify-batches/
// <runId>.json, or --journal <path>) records batch ids, every custom_id, its
// status and parsed output, so a killed run continues with --resume <runId>
// without resubmitting anything. A fresh --exams … --apply refuses to start
// while an earlier journal with submitted batches still covers any of the
// same rows (verdicts land only at the end, so the DB filter cannot catch
// that overlap); --resume it, or --force to start over regardless.
//
// !! Batches run on ANTHROPIC_BULK_API_KEY only, never on the shared
// !! ANTHROPIC_API_KEY that serves students (emptied three times on 15 Sep
// !! 2026). All bulk AI jobs are ON HOLD until that key exists; --apply
// !! refuses to start without it. Without --apply the script is a dry run:
// !! it builds every request, prints the counts and the cost estimate at
// !! batch prices, writes the journal, and submits nothing.
//
//   npx dotenv-cli -e .env.local -- npx tsx scripts/verify-question-bank.ts \
//     --exams UK_UKSSSC,AP_APPSC_GROUP2 --scope unvalidated|validated|all \
//     [--limit N] [--apply] [--resume <runId>] [--journal <path>] \
//     [--poll-seconds 60] [--force] [--live --apply [--concurrency 3]]
//
//   --apply        submit the batches and write verdicts (default: dry run)
//   --resume ID    continue a journaled run (poll / collect / retry / write)
//   --force        start a fresh run even though an open journal covers rows
//   --live         the pre-22-Sep per-call path (messages.create, full price,
//                  on the shared key). It has no free dry run, so it needs
//                  --apply, and it is refused while the bulk key is unset.
//   --batch        the default; listed for symmetry with --live

import fs from "node:fs";
import { PrismaClient, Prisma } from "@prisma/client";
import type Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_CONFIG, gate, solveBlind, verify, type CandidateQuestion, type SolveResult, type VerifyVerdict } from "../src/lib/ai/factory";
import { aggregate, buildSolveRequest, parseSolveRun } from "../src/lib/ai/factory/solver";
import { buildVerifyRequest, parseVerifyVerdict } from "../src/lib/ai/factory/verifier";
import type { SolveRun } from "../src/lib/ai/factory/types";
import { estimateCostUsd, type CallStats, type MessageParams } from "../src/lib/ai/client";
import { recordAiUsageAwaited } from "../src/lib/ai/usage";
import {
  assertBulkKey,
  BATCH_CHUNK_MAX,
  BULK_KEY_ENV,
  chunk,
  collectResults,
  estimateRequestTokens,
  findUnjournaledBatch,
  isRetryable,
  journalPath,
  loadJournal,
  makeCustomId,
  mapLimit,
  newJournal,
  pollBatch,
  saveJournal,
  submitBatch,
  tokensUsd,
  type BatchJournal,
  type BatchRequest,
  type JournalRequest,
} from "../src/lib/ai/batch";
import type { Difficulty } from "../src/lib/ai/types";

const prisma = new PrismaClient();

/** Ledger labels for this script's rows; the factory's own defaults stay workload-neutral (factory-solve / factory-verify). */
const BANK_SOLVE = "bank-solve";
const BANK_VERIFY = "bank-verify";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const EXAMS = (arg("--exams") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const SCOPE = (arg("--scope") ?? "unvalidated") as "unvalidated" | "validated" | "all";
const CONCURRENCY = Math.max(1, Math.min(8, Number(arg("--concurrency") ?? 3)));
const LIMIT = arg("--limit") ? Math.max(1, Number(arg("--limit"))) : null;
// Dry run unless --apply is given; --dry-run always wins (22 Sep 2026).
const DRY = !process.argv.includes("--apply") || process.argv.includes("--dry-run");
const LIVE = process.argv.includes("--live");
const FORCE = process.argv.includes("--force");
const RESUME = arg("--resume") ?? null;
const JOURNAL_DIR = "D:/CodexProjects/shishya-data/bank-verify-batches";
const JOURNAL_FILE = arg("--journal") ?? null;
const POLL_MS = Math.max(5, Number(arg("--poll-seconds") ?? 60)) * 1000;
const SOLVE_RUNS = DEFAULT_CONFIG.solveRuns;
/** Ledger inserts in flight while collecting a batch (see recordAiUsageAwaited). */
const LEDGER_PARALLEL = 6;
/** Journal saves while collecting: a kill between two saves re-ledgers at most this many results on resume. */
const COLLECT_SAVE_EVERY = 50;
/** Observed on 15 Sep 2026 (AiUsage): output tokens per solve / verify, for the dry-run estimate. */
const OBSERVED_OUT = { solve: 133, verify: 145 };

type Row = {
  id: string;
  body: string;
  options: unknown;
  answerKey: string;
  solution: string | null;
  difficulty: string;
  tags: string[] | null;
  validated: boolean;
  validatedBy: string | null;
  source: string;
  metadata: unknown;
  topicCode: string;
};

type Outcome = "accepted" | "corrected" | "failed" | "shape";

const totals = { checked: 0, accepted: 0, corrected: 0, failed: 0, shape: 0, newlyValidated: 0, removed: 0, errors: 0, costUsd: 0 };
let consecutiveErrors = 0;
let stop = false;

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function shapeOk(options: unknown): options is { key: string; text: string }[] {
  if (!Array.isArray(options) || options.length !== 4) return false;
  const keys = options.map((o) => (isObj(o) ? String(o.key) : ""));
  return ["A", "B", "C", "D"].every((k) => keys.includes(k)) && options.every((o) => isObj(o) && String(o.text ?? "").trim().length > 0);
}

function rowShapeOk(r: Row): boolean {
  return shapeOk(r.options) && ["A", "B", "C", "D"].includes(r.answerKey) && (r.body ?? "").trim().length >= 10;
}

function toCandidate(r: Row): CandidateQuestion {
  return {
    body: r.body,
    options: r.options as { key: string; text: string }[],
    answerKey: r.answerKey,
    solution: r.solution ?? "",
    difficulty: (["EASY", "MEDIUM", "HARD"].includes(r.difficulty) ? r.difficulty : "MEDIUM") as Difficulty,
    tags: r.tags ?? [],
  };
}

// ---------------------------------------------------------------------------
// Verdict writing — one implementation for both paths
// ---------------------------------------------------------------------------

async function writeShape(r: Row, at: string): Promise<Outcome> {
  const prev = { prevKey: r.answerKey, prevValidated: r.validated, prevValidatedBy: r.validatedBy };
  if (!DRY) {
    await prisma.question.update({
      where: { id: r.id },
      data: {
        validated: false,
        validatedBy: r.validated ? "factory:verify-v1:removed" : r.validatedBy,
        metadata: { ...(isObj(r.metadata) ? r.metadata : {}), factoryVerify: { at, pipeline: "factory-v1", decision: "SHAPE", ...prev } } as Prisma.InputJsonValue,
      },
    });
  }
  return "shape";
}

async function applyVerdict(r: Row, solve: SolveResult, v: VerifyVerdict, at: string): Promise<Outcome> {
  const prev = { prevKey: r.answerKey, prevValidated: r.validated, prevValidatedBy: r.validatedBy };
  const g = gate(solve, v, DEFAULT_CONFIG);

  const corrected =
    g.decision === "REVIEW" &&
    v.verdict === "MISMATCH" &&
    !!v.correctKey &&
    solve.majority === v.correctKey &&
    solve.agreement >= DEFAULT_CONFIG.minAgreement;
  const pass = g.decision === "ACCEPT" || corrected;

  // With a corrected key the stored solution argues for the wrong option, so it
  // is replaced by the most confident blind solve that reached the right one.
  const bestRun = corrected
    ? solve.runs.filter((x) => x.chosen === v.correctKey).sort((a, b) => b.confidence - a.confidence)[0]
    : undefined;

  const factoryVerify = {
    at,
    pipeline: "factory-v1",
    decision: g.decision,
    verdict: v.verdict,
    confidence: v.confidence,
    agreement: solve.agreement,
    majority: solve.majority,
    distribution: solve.distribution,
    correctKey: v.correctKey,
    keyCorrected: corrected,
    verifierDifficulty: v.difficulty,
    rationale: v.rationale.slice(0, 400),
    issues: v.issues.slice(0, 6).map((s) => s.slice(0, 200)),
    reasons: g.reasons,
    ...prev,
    ...(corrected ? { prevSolution: (r.solution ?? "").slice(0, 2000) } : {}),
  };

  if (!DRY) {
    await prisma.question.update({
      where: { id: r.id },
      data: {
        validated: pass,
        validatedBy: pass ? "factory:verify-v1" : r.validated ? "factory:verify-v1:removed" : r.validatedBy,
        validatedAt: pass ? new Date() : undefined,
        ...(corrected ? { answerKey: v.correctKey!, ...(bestRun?.reasoning ? { solution: bestRun.reasoning } : {}) } : {}),
        ...(pass && r.source === "AI_GENERATED" ? { source: "AI_VALIDATED" as const } : {}),
        metadata: { ...(isObj(r.metadata) ? r.metadata : {}), factoryVerify } as Prisma.InputJsonValue,
      },
    });
  }
  if (DRY) {
    console.log(`   [dry] ${r.topicCode} ${g.decision}/${v.verdict} key ${r.answerKey}→${corrected ? v.correctKey : r.answerKey} agreement ${solve.agreement.toFixed(2)} conf ${v.confidence.toFixed(2)} · ${r.body.replace(/\s+/g, " ").slice(0, 90)}`);
  }
  if (pass && !r.validated) totals.newlyValidated += 1;
  if (!pass && r.validated) totals.removed += 1;
  return corrected ? "corrected" : pass ? "accepted" : "failed";
}

// ---------------------------------------------------------------------------
// Row loading
// ---------------------------------------------------------------------------

const ROW_SELECT = Prisma.sql`SELECT q.id, q.body, q.options, q."answerKey", q.solution, q.difficulty::text AS difficulty, q.tags,
            q.validated, q."validatedBy", q.source::text AS source, q.metadata, t.code AS "topicCode"
     FROM "Question" q JOIN "Exam" x ON x.id = q."examId" JOIN "Topic" t ON t.id = q."topicId"`;

async function rowsForExam(code: string): Promise<Row[]> {
  const scopeSql = SCOPE === "unvalidated" ? "AND NOT q.validated" : SCOPE === "validated" ? "AND q.validated" : "";
  return prisma.$queryRaw<Row[]>(
    Prisma.sql`${ROW_SELECT}
     WHERE x.code = ${code} AND q.type = 'MCQ' ${Prisma.raw(scopeSql)}
       AND (q.metadata IS NULL OR q.metadata->'factoryVerify' IS NULL)
     ORDER BY q."createdAt" ASC ${Prisma.raw(LIMIT ? `LIMIT ${LIMIT}` : "")}`,
  );
}

/** Resume: re-fetch the journaled questions by id, still skipping any that were verified meanwhile. */
async function rowsByIds(ids: string[]): Promise<Row[]> {
  const out: Row[] = [];
  for (const part of chunk(ids, 500)) {
    const rows = await prisma.$queryRaw<Row[]>(
      Prisma.sql`${ROW_SELECT} WHERE q.id IN (${Prisma.join(part)}) AND (q.metadata IS NULL OR q.metadata->'factoryVerify' IS NULL)`,
    );
    out.push(...rows);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Live path (pre-22-Sep per-call flow, kept behind --live)
// ---------------------------------------------------------------------------

async function checkOne(code: string, r: Row): Promise<Outcome> {
  const at = new Date().toISOString();
  if (!rowShapeOk(r)) return writeShape(r, at);

  const candidate = toCandidate(r);
  const onCost = (s: CallStats) => {
    totals.costUsd += estimateCostUsd(s);
  };
  const solve = await solveBlind(candidate, { runs: SOLVE_RUNS, onCost, feature: BANK_SOLVE, ref: code });
  const v = await verify(candidate, solve, { onCost, feature: BANK_VERIFY, ref: code });
  return applyVerdict(r, solve, v, at);
}

async function runExamLive(code: string) {
  const rows = await rowsForExam(code);
  console.log(`\n=== ${code}: ${rows.length} ${SCOPE} questions to check (live, concurrency ${CONCURRENCY}${DRY ? ", DRY RUN" : ""})`);
  const started = Date.now();
  const before = { ...totals };
  let next = 0;

  async function worker() {
    while (!stop) {
      const i = next++;
      if (i >= rows.length) return;
      const r = rows[i];
      let attempt = 0;
      while (!stop) {
        try {
          const o = await checkOne(code, r);
          totals.checked += 1;
          totals[o] += 1;
          consecutiveErrors = 0;
          break;
        } catch (e) {
          const msg = String((e as Error)?.message ?? e);
          attempt += 1;
          totals.errors += 1;
          consecutiveErrors += 1;
          const transient = /429|529|overloaded|rate.?limit|timeout|ECONNRESET|fetch failed|socket/i.test(msg);
          console.warn(`   ! ${r.id} attempt ${attempt}: ${msg.split("\n")[0].slice(0, 160)}`);
          if (/credit balance/i.test(msg) || consecutiveErrors >= 12) {
            console.error(`   ✗ stopping: ${/credit balance/i.test(msg) ? "API credit balance is too low" : "12 consecutive errors"}`);
            stop = true;
            return;
          }
          if (!transient || attempt >= 4) break; // give up on this row; it stays unchecked for the next run
          await sleep(2000 * 2 ** attempt);
        }
      }
      if (totals.checked % 25 === 0) {
        const mins = (Date.now() - started) / 60_000;
        console.log(
          `   … ${code} ${totals.checked - before.checked}/${rows.length} · accepted ${totals.accepted - before.accepted} · key corrected ${totals.corrected - before.corrected} · failed ${totals.failed - before.failed} · shape ${totals.shape - before.shape} · ${((totals.checked - before.checked) / Math.max(mins, 0.01)).toFixed(1)}/min · ~$${totals.costUsd.toFixed(2)} total`,
        );
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(
    `=== ${code} done: checked ${totals.checked - before.checked} · accepted ${totals.accepted - before.accepted} · key corrected ${totals.corrected - before.corrected} · failed ${totals.failed - before.failed} · broken shape ${totals.shape - before.shape} · newly validated ${totals.newlyValidated - before.newlyValidated} · removed from pools ${totals.removed - before.removed} · errors ${totals.errors - before.errors} · ${((Date.now() - started) / 60_000).toFixed(1)} min`,
  );
}

// ---------------------------------------------------------------------------
// Batch path
// ---------------------------------------------------------------------------

type Outputs = {
  /** questionId -> runIndex -> parsed run (null = the model replied but the reply was unusable). */
  solve: Record<string, Record<string, SolveRun | null>>;
  verify: Record<string, VerifyVerdict>;
};
type Journal = BatchJournal<Outputs>;

const SOLVE = "solve";
const VERIFY = "verify";

function journalFileFor(runId: string): string {
  return JOURNAL_FILE ?? journalPath(JOURNAL_DIR, runId);
}

function newRunId(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const slug = EXAMS.join("+").replace(/[^A-Za-z0-9_+-]/g, "").slice(0, 40);
  return `${stamp}-${slug || "run"}`;
}

const isTerminal = (s: JournalRequest["status"]) => s !== "built" && s !== "submitted";

/**
 * Drives one phase to completion and is safe to re-enter: it submits what
 * is still "built", polls what is still open, collects what is ended and
 * not yet collected, resubmits retryable failures once, and returns. A
 * resumed run therefore continues from whatever the journal says.
 */
async function runPhase(
  journal: Journal,
  file: string,
  phase: string,
  feature: string,
  build: (req: JournalRequest) => MessageParams,
  onMessage: (req: JournalRequest, message: Anthropic.Messages.Message) => boolean,
  retryUnusable: boolean,
) {
  const reqs = () => Object.values(journal.requests).filter((r) => r.phase === phase);

  // 0. a submit that was cut off (kill during the create POST): the API may
  //    hold the batch already, so adopt it instead of submitting the same
  //    requests a second time.
  const pending = journal.pendingSubmit;
  if (pending && pending.phase === phase) {
    const known = new Set(journal.batches.map((b) => b.id));
    const found = await findUnjournaledBatch(known, pending.at, pending.count);
    if (found) {
      console.log(`   ↩ ${phase} attempt ${pending.attempt}: adopting batch ${found.id} (${pending.count} requests) that the API accepted before the journal was written`);
      // Recorded as in_progress even if it has ended: the poll step below then fills in endedAt and the counts.
      journal.batches.push({ id: found.id, phase, attempt: pending.attempt, count: pending.count, submittedAt: pending.at, status: "in_progress", collected: false });
      for (const id of pending.customIds) {
        const r = journal.requests[id];
        if (r && r.status === "built") {
          r.status = "submitted";
          r.batchId = found.id;
        }
      }
      journal.phase = `${phase}-submitted`;
    } else {
      console.log(`   ↩ ${phase}: the interrupted submit of ${pending.count} requests never reached the API; submitting again`);
    }
    delete journal.pendingSubmit;
    saveJournal(file, journal);
  }

  for (let pass = 0; pass < 3; pass++) {
    // 1. submit (attempt by attempt, so a batch never mixes first tries and retries)
    for (const attempt of [1, 2]) {
      const toSubmit = reqs().filter((r) => r.status === "built" && r.attempt === attempt);
      for (const part of chunk(toSubmit, BATCH_CHUNK_MAX)) {
        const requests: BatchRequest[] = part.map((r) => ({ custom_id: r.customId, params: build(r) }));
        console.log(`   → ${phase} attempt ${attempt}: submitting ${requests.length} requests…`);
        journal.pendingSubmit = { phase, attempt, count: requests.length, at: new Date().toISOString(), customIds: part.map((r) => r.customId) };
        saveJournal(file, journal);
        const batch = await submitBatch(requests);
        journal.batches.push({ id: batch.id, phase, attempt, count: requests.length, submittedAt: new Date().toISOString(), status: "in_progress", collected: false });
        for (const r of part) {
          r.status = "submitted";
          r.batchId = batch.id;
        }
        delete journal.pendingSubmit;
        journal.phase = `${phase}-submitted`;
        saveJournal(file, journal);
        console.log(`     batch ${batch.id} (expires ${batch.expires_at})`);
      }
    }

    // 2. poll
    for (const b of journal.batches.filter((x) => x.phase === phase && x.status !== "ended")) {
      console.log(`   … polling ${b.id} every ${POLL_MS / 1000}s`);
      const ended = await pollBatch(b.id, {
        intervalMs: POLL_MS,
        onTick: (m) => {
          b.counts = m.request_counts;
          saveJournal(file, journal);
          const c = m.request_counts;
          console.log(`     ${new Date().toISOString().slice(11, 19)} ${m.processing_status} · processing ${c.processing} · succeeded ${c.succeeded} · errored ${c.errored} · expired ${c.expired} · canceled ${c.canceled}`);
        },
      });
      b.status = "ended";
      b.endedAt = ended.ended_at ?? new Date().toISOString();
      b.counts = ended.request_counts;
      saveJournal(file, journal);
    }

    // 3. collect + ledger + parse
    for (const b of journal.batches.filter((x) => x.phase === phase && x.status === "ended" && !x.collected)) {
      console.log(`   ← collecting ${b.id}…`);
      const outcomes = [...(await collectResults(b.id)).values()];
      let done = 0;
      await mapLimit(outcomes, LEDGER_PARALLEL, async (o) => {
        const r = journal.requests[o.customId];
        if (!r || r.batchId !== b.id) return;
        // A question that left the run while this batch was open still billed
        // its tokens: ledger them, but never parse or retry the reply.
        if (r.status === "stale") {
          if (o.type === "succeeded" && !r.ledgered) {
            totals.costUsd += await recordAiUsageAwaited(feature, o.message, { model: o.message.model, ref: r.code, batch: true });
            r.ledgered = true;
          }
          return;
        }
        // Already handled (a crash after some rows were ledgered): skip, never ledger twice.
        if (isTerminal(r.status)) return;
        if (o.type === "succeeded") {
          if (!r.ledgered) {
            totals.costUsd += await recordAiUsageAwaited(feature, o.message, { model: o.message.model, ref: r.code, batch: true });
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
        if (done % COLLECT_SAVE_EVERY === 0) saveJournal(file, journal);
      });
      // Requests the API never reported on (should not happen) count as expired so they get one retry.
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
      console.log(`     ${b.id}: ${n.ok} usable · ${n.unusable} unusable replies · ${n.err} errored/expired${n.stale ? ` · ${n.stale} stale (ledgered only)` : ""} · ledger +$${totals.costUsd.toFixed(2)} so far`);
    }

    // 4. one retry for what is worth retrying
    const retry = reqs().filter(
      (r) => r.attempt === 1 && (r.status === "errored" || r.status === "expired" || r.status === "canceled" || (retryUnusable && r.status === "unusable")),
    );
    if (!retry.length) break;
    console.log(`   ↻ ${phase}: resubmitting ${retry.length} requests once`);
    for (const r of retry) {
      r.attempt = 2;
      r.status = "built";
      r.batchId = undefined;
    }
    saveJournal(file, journal);
  }

  const failed = reqs().filter((r) => r.status !== "succeeded" && r.status !== "unusable" && r.status !== "stale");
  for (const r of failed) if (r.status !== "failed") r.status = "failed";
  if (failed.length) {
    saveJournal(file, journal);
    console.warn(`   ✗ ${phase}: ${failed.length} requests failed after a retry — first: ${failed
      .slice(0, 5)
      .map((r) => `${r.customId} ${r.error ?? r.status}`)
      .join(" | ")}`);
  }
  // A reply that was still unparseable after its retry is not an API failure,
  // but the question stays unchecked all the same; say so with the parse error.
  const stuck = retryUnusable ? reqs().filter((r) => r.status === "unusable" && r.attempt === 2) : [];
  if (stuck.length) {
    console.warn(`   ✗ ${phase}: ${stuck.length} replies unusable after a retry — first: ${stuck
      .slice(0, 5)
      .map((r) => `${r.customId} ${r.error ?? "not JSON"}`)
      .join(" | ")}`);
  }
}

/**
 * Journals under JOURNAL_DIR that still have submitted batches and cover
 * any of these rows. A fresh --apply over them would pay for the same
 * requests again, because verdicts are written only when a run finishes.
 */
function openJournalsCovering(rowIds: Set<string>): Array<{ runId: string; phase: string; overlap: number; submitted: boolean }> {
  let names: string[];
  try {
    names = fs.readdirSync(JOURNAL_DIR).filter((n) => n.endsWith(".json"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
  const out: Array<{ runId: string; phase: string; overlap: number; submitted: boolean }> = [];
  for (const name of names) {
    let j: Journal;
    try {
      j = loadJournal<Outputs>(`${JOURNAL_DIR}/${name}`);
    } catch (e) {
      console.warn(`   ! skipping unreadable journal ${name}: ${String((e as Error)?.message ?? e).split("\n")[0].slice(0, 120)}`);
      continue;
    }
    if (j.phase === "done") continue;
    const overlap = Object.keys(j.questions).filter((id) => rowIds.has(id)).length;
    if (overlap) out.push({ runId: j.runId, phase: j.phase, overlap, submitted: j.batches.length > 0 || !!j.pendingSubmit });
  }
  return out;
}

function printEstimate(solveReqs: MessageParams[], verifyReqs: MessageParams[]) {
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const sIn = sum(solveReqs.map(estimateRequestTokens));
  const vIn = sum(verifyReqs.map(estimateRequestTokens));
  const sMax = sum(solveReqs.map((p) => p.max_tokens));
  const vMax = sum(verifyReqs.map((p) => p.max_tokens));
  const sOut = solveReqs.length * OBSERVED_OUT.solve;
  const vOut = verifyReqs.length * OBSERVED_OUT.verify;
  const sModel = solveReqs[0]?.model ?? "claude-opus-4-8";
  const vModel = verifyReqs[0]?.model ?? sModel;
  const expected = tokensUsd(sModel, { input: sIn, output: sOut }, { batch: true }) + tokensUsd(vModel, { input: vIn, output: vOut }, { batch: true });
  const worst = tokensUsd(sModel, { input: sIn, output: sMax }, { batch: true }) + tokensUsd(vModel, { input: vIn, output: vMax }, { batch: true });
  console.log(`\nESTIMATE (no request submitted)`);
  console.log(`   Phase A solve  : ${solveReqs.length} requests · ~${sIn.toLocaleString()} prompt tokens · max_tokens ${sMax.toLocaleString()} (expected output ~${sOut.toLocaleString()} at ${OBSERVED_OUT.solve}/req, 15 Sep avg) · ${sModel}`);
  console.log(`   Phase B verify : ${verifyReqs.length} requests · ~${vIn.toLocaleString()} prompt tokens (placeholder blind result; real prompts add the solver's reasoning) · max_tokens ${vMax.toLocaleString()} (expected output ~${vOut.toLocaleString()} at ${OBSERVED_OUT.verify}/req) · ${vModel}`);
  console.log(`   Batch price    : expected ~$${expected.toFixed(2)} · worst case (every reply fills max_tokens) $${worst.toFixed(2)} · the same calls live would be ~$${(expected * 2).toFixed(2)}`);
  console.log(`   Prompt tokens are a character-count estimate (no count_tokens call was made).`);
}

async function runBatchMode() {
  // 1. journal
  let journal: Journal;
  let file: string;
  if (RESUME) {
    file = journalFileFor(RESUME);
    journal = loadJournal<Outputs>(file);
    console.log(`\n=== resuming ${journal.runId} from ${file} (phase ${journal.phase}, ${Object.keys(journal.requests).length} requests, ${journal.batches.length} batches)`);
  } else {
    const runId = newRunId();
    file = journalFileFor(runId);
    journal = newJournal<Outputs>(runId, { exams: EXAMS, scope: SCOPE, limit: LIMIT, solveRuns: SOLVE_RUNS, mode: "batch", startedDry: DRY }, { solve: {}, verify: {} });
    console.log(`\n=== run ${runId} → ${file}`);
  }

  // 2. rows
  const rowsByExam = new Map<string, Row[]>();
  if (RESUME) {
    const ids = Object.keys(journal.questions);
    const rows = await rowsByIds(ids);
    for (const r of rows) {
      const code = journal.questions[r.id]?.code ?? "?";
      rowsByExam.set(code, [...(rowsByExam.get(code) ?? []), r]);
    }
    const gone = ids.length - rows.length;
    if (gone) console.log(`   ${gone} journaled questions were verified by another run meanwhile — dropped`);
  } else {
    for (const code of EXAMS) rowsByExam.set(code, await rowsForExam(code));
  }
  const rows = new Map<string, { code: string; row: Row }>();
  for (const [code, rs] of rowsByExam) {
    console.log(`   ${code}: ${rs.length} ${SCOPE} questions`);
    for (const r of rs) rows.set(r.id, { code, row: r });
  }

  // 2b. a fresh run over rows an unfinished journal already paid for
  if (!RESUME) {
    for (const o of openJournalsCovering(new Set(rows.keys()))) {
      if (o.submitted) {
        const msg = `run ${o.runId} (phase ${o.phase}) has submitted batches covering ${o.overlap} of these rows; continue it with --resume ${o.runId} --apply${DRY ? "" : ", or pass --force to pay for them again"}`;
        if (!DRY && !FORCE) throw new Error(msg);
        console.warn(`   ! ${msg}`);
      } else {
        console.log(`   note: dry-run journal ${o.runId} covers ${o.overlap} of these rows; --resume ${o.runId} --apply submits exactly those`);
      }
    }
  }

  // 3. shape check (no model call needed). Every fetched row goes into the
  //    journal first, broken shape included: a dry run writes nothing, and the
  //    --resume --apply that follows must re-fetch those rows to mark them SHAPE.
  const candidates = new Map<string, CandidateQuestion>();
  for (const [id, { code, row }] of rows) {
    journal.questions[id] = { code };
    if (!rowShapeOk(row)) {
      totals.checked += 1;
      totals.shape += 1;
      await writeShape(row, new Date().toISOString());
      rows.delete(id);
      continue;
    }
    candidates.set(id, toCandidate(row));
  }
  // Journaled questions that were not fetched were verified meanwhile: drop
  // them. A request of theirs that sits in a batch not yet collected still
  // bills tokens when its result arrives, so it stays as "stale" for the
  // ledger; anything else of theirs goes.
  const fetched = new Set([...rowsByExam.values()].flatMap((rs) => rs.map((r) => r.id)));
  for (const [id, r] of Object.entries(journal.requests)) {
    if (rows.has(r.questionId)) continue;
    const b = journal.batches.find((x) => x.id === r.batchId);
    if (b && !b.collected) r.status = "stale";
    else delete journal.requests[id];
  }
  for (const id of Object.keys(journal.questions)) if (!fetched.has(id)) delete journal.questions[id];

  // 4. Phase A requests
  for (const [id, { code }] of rows) {
    for (let i = 0; i < SOLVE_RUNS; i++) {
      const customId = makeCustomId(SOLVE, id, i);
      if (!journal.requests[customId]) journal.requests[customId] = { customId, phase: SOLVE, questionId: id, code, runIndex: i, attempt: 1, status: "built" };
    }
  }
  const buildSolve = (r: JournalRequest) => buildSolveRequest(candidates.get(r.questionId)!, r.runIndex ?? 0);

  if (DRY) {
    const solveReqs = Object.values(journal.requests).filter((r) => r.phase === SOLVE && r.status === "built").map(buildSolve);
    // Verify prompts need the blind result; estimate with three agreeing runs of typical length.
    const placeholder: SolveResult = aggregate(
      Array.from({ length: SOLVE_RUNS }, () => ({ chosen: "A", reasoning: "x".repeat(420), confidence: 0.9 })),
    );
    const verifyReqs = [...candidates.entries()].filter(([id]) => !journal.outputs.verify[id]).map(([, c]) => buildVerifyRequest(c, placeholder));
    printEstimate(solveReqs, verifyReqs);
    console.log(`   Broken shape rows: ${totals.shape} (would be marked SHAPE)`);
    if (RESUME) {
      // A dry look at a journaled run must not move it; the estimate above is what is still to submit.
      console.log(`\nJournal untouched: ${file} (phase ${journal.phase})`);
      console.log(`To continue it (needs the founder's go-ahead + the bulk key):\n   --resume ${journal.runId} --apply`);
    } else {
      journal.phase = "built";
      saveJournal(file, journal);
      console.log(`\nJournal written: ${file}`);
      console.log(`To submit exactly these requests (needs the founder's go-ahead + the bulk key):\n   --resume ${journal.runId} --apply`);
    }
    return;
  }

  if (journal.phase === "new" || journal.phase === "built") {
    journal.phase = "solve";
    saveJournal(file, journal);
  }
  await runPhase(
    journal,
    file,
    SOLVE,
    BANK_SOLVE,
    buildSolve,
    (r, message) => {
      const run = parseSolveRun(message);
      (journal.outputs.solve[r.questionId] ??= {})[String(r.runIndex)] = run;
      return run !== null;
    },
    // A malformed solve is dropped, as on the live path — fewer valid runs lowers agreement.
    false,
  );

  // 5. aggregate — runs in run-index order so the verify prompt reads like the live one
  const solves = new Map<string, SolveResult>();
  const skipped: string[] = [];
  for (const id of rows.keys()) {
    const mine = Object.values(journal.requests).filter((r) => r.phase === SOLVE && r.questionId === id);
    if (mine.some((r) => r.status !== "succeeded" && r.status !== "unusable")) {
      // An API failure on any solve leaves the question unchecked for the next run, as the live path does.
      skipped.push(id);
      continue;
    }
    const runs: SolveRun[] = [];
    for (let i = 0; i < SOLVE_RUNS; i++) {
      const run = journal.outputs.solve[id]?.[String(i)];
      if (run) runs.push(run);
    }
    solves.set(id, aggregate(runs));
  }
  if (skipped.length) console.warn(`   ${skipped.length} questions skipped after solve failures (stay unchecked): ${skipped.slice(0, 5).join(", ")}${skipped.length > 5 ? "…" : ""}`);

  // 6. Phase B
  for (const [id, { code }] of rows) {
    if (!solves.has(id)) continue;
    const customId = makeCustomId(VERIFY, id);
    if (!journal.requests[customId]) journal.requests[customId] = { customId, phase: VERIFY, questionId: id, code, attempt: 1, status: "built" };
  }
  if (journal.phase === "solve" || journal.phase.startsWith("solve-")) {
    journal.phase = "verify";
    saveJournal(file, journal);
  }
  await runPhase(
    journal,
    file,
    VERIFY,
    BANK_VERIFY,
    (r) => buildVerifyRequest(candidates.get(r.questionId)!, solves.get(r.questionId)!),
    (r, message) => {
      try {
        journal.outputs.verify[r.questionId] = parseVerifyVerdict(message, candidates.get(r.questionId)!);
        return true;
      } catch (e) {
        r.error = String((e as Error)?.message ?? e).split("\n")[0].slice(0, 200);
        return false;
      }
    },
    // The live path gives up on a row whose verdict is not JSON; a batch gets one more try, then the row stays unchecked.
    true,
  );

  // 7. write verdicts exactly as the live path does
  journal.phase = "writing";
  saveJournal(file, journal);
  const at = new Date().toISOString();
  const written = new Set<string>();
  for (const [id, { row }] of rows) {
    const solve = solves.get(id);
    const v = journal.outputs.verify[id];
    if (!solve || !v) continue;
    try {
      const o = await applyVerdict(row, solve, v, at);
      totals.checked += 1;
      totals[o] += 1;
      written.add(id);
    } catch (e) {
      totals.errors += 1;
      console.warn(`   ! ${id} write failed: ${String((e as Error)?.message ?? e).split("\n")[0].slice(0, 160)}`);
    }
  }
  journal.phase = "done";
  journal.args.writtenAt = at;
  journal.args.written = written.size;
  saveJournal(file, journal);

  const unchecked = [...rows.keys()].filter((id) => !written.has(id));
  const unusableVerdicts = Object.values(journal.requests).filter((r) => r.phase === VERIFY && r.status === "unusable").length;
  console.log(
    `\n=== batch run ${journal.runId} done: checked ${totals.checked} · accepted ${totals.accepted} · key corrected ${totals.corrected} · failed ${totals.failed} · broken shape ${totals.shape} · newly validated ${totals.newlyValidated} · removed from pools ${totals.removed} · unchecked ${unchecked.length} (verdicts unusable ${unusableVerdicts}) · ledger $${totals.costUsd.toFixed(2)} at batch prices`,
  );
  if (unchecked.length) console.log(`   unchecked questions are picked up by the next run (they carry no factoryVerify): ${unchecked.slice(0, 8).join(", ")}${unchecked.length > 8 ? "…" : ""}`);
}

// ---------------------------------------------------------------------------

async function main() {
  if (!EXAMS.length && !RESUME) throw new Error("--exams CODE[,CODE…] is required (or --resume <runId>)");
  if (LIVE && DRY) {
    throw new Error("--live has no free dry run: every question costs four full-price Opus calls. Add --apply to write verdicts, or use batch mode (no --live) for a zero-cost estimate.");
  }
  // Spend gate (22 Sep 2026): nothing that can bill starts while the bulk key
  // is absent, batch or live, before the first database read.
  if (!DRY) assertBulkKey();
  if (LIVE) {
    if (RESUME) throw new Error("--resume is a batch-mode flag; the live path resumes by itself (verified rows are skipped)");
    console.warn(`live run: per-call, full price, on the shared ANTHROPIC_API_KEY (not ${BULK_KEY_ENV}); batch mode is the half-price path`);
    for (const code of EXAMS) {
      if (stop) break;
      await runExamLive(code);
    }
    console.log(`\nTOTAL: ${JSON.stringify({ ...totals, costUsd: Number(totals.costUsd.toFixed(2)) })}${stop ? " (stopped early)" : ""}`);
    return;
  }
  await runBatchMode();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

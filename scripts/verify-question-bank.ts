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
// ── Batch mode (22 Sep 2026; the only mode since 26 Sep 2026) ───────────────
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
// !!
// !! Spend guard (26 Sep 2026, src/lib/ai/batch.ts): the bulk key and the
// !! tutor's key draw on ONE credit balance, and full-bank runs emptied it
// !! on 25 Sep 23:40 IST and 26 Sep 10:37 IST. So --apply also needs
// !! --max-usd (a hard ceiling on this journal's ledgered spend; a chunk
// !! whose worst case would cross it is not submitted) and
// !! --i-confirm-auto-reload (the operator checked auto-reload in the
// !! Console); batches go out --chunk requests at a time (default 2000),
// !! each collected before the next; the production key is probed with one
// !! Haiku call before the run and after every chunk, and any failure stops
// !! the run with the journal saved and the resume command printed. The
// !! phase driver is the shared runJournalPhase since 26 Sep 2026 (this
// !! script's own copy carried ledgered:true across a retry, so the retry's
// !! reply went unledgered — the 45 pending retries of the paused full-bank
// !! journal are in that state).
// !!
// !! The pre-22-Sep per-call path (--live, --concurrency) was REMOVED on
// !! 26 Sep 2026: it made four full-price Opus calls per question on the
// !! shared ANTHROPIC_API_KEY — the tutor's own key — outside the spend
// !! guard, with no ceiling, and stopped only on the "credit balance" error,
// !! i.e. once the tutor was already down. --live is refused, not ignored,
// !! so an old command line cannot quietly run in batch mode either.
//
//   npx dotenv-cli -e .env.local -- npx tsx scripts/verify-question-bank.ts \
//     --exams UK_UKSSSC,AP_APPSC_GROUP2 --scope unvalidated|validated|all \
//     [--limit N] [--apply --max-usd <usd> --i-confirm-auto-reload [--chunk 2000]] \
//     [--resume <runId>] [--journal <path>] [--poll-seconds 60] [--force]
//
//   --apply        submit the batches and write verdicts (default: dry run)
//   --max-usd N    with --apply (required, no default): hard ceiling on the
//                  journal's ledgered spend at batch prices; checked before
//                  every chunk against the chunk's worst case
//   --chunk N      requests per batch (default 2000, max 10,000), submitted
//                  one at a time, each collected before the next is priced
//   --i-confirm-auto-reload  with --apply (required): the operator confirmed
//                  in the Anthropic Console that auto-reload is ON; the
//                  statement is printed back before anything is submitted
//   --resume ID    continue a journaled run (poll / collect / retry / write)
//   --force        start a fresh run even though an open journal covers rows

import path from "node:path";
import { PrismaClient, Prisma } from "@prisma/client";
import type Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_CONFIG, gate, type CandidateQuestion, type SolveResult, type VerifyVerdict } from "../src/lib/ai/factory";
import { aggregate, buildSolveRequest, parseSolveRun } from "../src/lib/ai/factory/solver";
import { buildVerifyRequest, parseVerifyVerdict } from "../src/lib/ai/factory/verifier";
import type { SolveRun } from "../src/lib/ai/factory/types";
import type { MessageParams } from "../src/lib/ai/client";
import {
  assertBulkKey,
  assertProductionKeyProbe,
  awaitsSubmit,
  CONFIRM_AUTO_RELOAD_FLAG,
  CONFIRM_AUTO_RELOAD_STATEMENT,
  chunk,
  DEFAULT_CHUNK,
  describeProbe,
  estimateRequestTokens,
  guardFlags,
  journalPath,
  loadJournal,
  makeCustomId,
  newJournal,
  openJournalsCovering,
  PROBE_MODEL,
  PRODUCTION_KEY_ENV,
  probeProductionKey,
  runJournalPhase,
  saveJournal,
  tokensUsd,
  type BatchJournal,
  type JournalRequest,
  type PhaseStop,
  type ProbeResult,
  type SpendGuard,
} from "../src/lib/ai/batch";
import type { Difficulty } from "../src/lib/ai/types";
import { WITHDRAWN_TAG } from "../src/lib/question-withdrawn";

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
const LIMIT = arg("--limit") ? Math.max(1, Number(arg("--limit"))) : null;
// Dry run unless --apply is given; --dry-run always wins (22 Sep 2026).
const DRY = !process.argv.includes("--apply") || process.argv.includes("--dry-run");
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

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

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
// Verdict writing — unchanged from the pre-22-Sep per-call path, so a batch
// verdict lands in the row exactly as a live one did
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

// Withdrawn questions (tag "rejected") are never picked up: an ACCEPT here
// would validate them again (25 Sep 2026, src/lib/question-withdrawn.ts).
async function rowsForExam(code: string): Promise<Row[]> {
  const scopeSql = SCOPE === "unvalidated" ? "AND NOT q.validated" : SCOPE === "validated" ? "AND q.validated" : "";
  return prisma.$queryRaw<Row[]>(
    Prisma.sql`${ROW_SELECT}
     WHERE x.code = ${code} AND q.type = 'MCQ' ${Prisma.raw(scopeSql)}
       AND (q.metadata IS NULL OR q.metadata->'factoryVerify' IS NULL)
       AND NOT (${WITHDRAWN_TAG} = ANY(q.tags))
     ORDER BY q."createdAt" ASC ${Prisma.raw(LIMIT ? `LIMIT ${LIMIT}` : "")}`,
  );
}

/** Resume: re-fetch the journaled questions by id, still skipping any that were verified or withdrawn meanwhile. */
async function rowsByIds(ids: string[]): Promise<Row[]> {
  const out: Row[] = [];
  for (const part of chunk(ids, 500)) {
    const rows = await prisma.$queryRaw<Row[]>(
      Prisma.sql`${ROW_SELECT} WHERE q.id IN (${Prisma.join(part)}) AND (q.metadata IS NULL OR q.metadata->'factoryVerify' IS NULL)
        AND NOT (${WITHDRAWN_TAG} = ANY(q.tags))`,
    );
    out.push(...rows);
  }
  return out;
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

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;

/** The command line that continues a journal, with the guard flags (26 Sep 2026): the numbers the operator passed, or placeholders on a dry run. */
const SCRIPT = "npx dotenv-cli -e .env.local -- npx tsx scripts/verify-question-bank.ts";
function applyFlags(g?: { maxUsd: number; chunkSize: number } | null): string {
  return `--apply --max-usd ${g ? g.maxUsd : "<usd>"} --chunk ${g ? g.chunkSize : DEFAULT_CHUNK} ${CONFIRM_AUTO_RELOAD_FLAG}`;
}
/**
 * --resume takes the journal FILE's name, not its runId: the full-bank
 * journal was renamed to full-bank-validated-20260925.json and its runId
 * joins exam codes with "+", which journalPath() refuses (26 Sep 2026). A
 * journal outside JOURNAL_DIR needs --journal as well.
 */
function resumeCommand(file: string, g?: { maxUsd: number; chunkSize: number } | null): string {
  const token = path.basename(file, ".json");
  const inDir = path.resolve(path.dirname(file)) === path.resolve(JOURNAL_DIR);
  return `${SCRIPT} --resume ${token}${inDir ? "" : ` --journal "${file}"`} ${applyFlags(g)}`;
}

/** A guard stop: nothing more was submitted, no verdict is written, and this is the exact command that continues the journal. */
function printStop(journal: Journal, file: string, halt: PhaseStop, guard: SpendGuard) {
  const maxUsd = halt.reason === "ceiling" ? Math.max(1, Math.ceil(halt.spentUsd + (halt.chunk?.worstUsd ?? 0))) : guard.maxUsd;
  console.log(
    `\n=== run ${journal.runId} STOPPED by the spend guard (${halt.reason}) — no verdict written · journal ${file} (phase ${journal.phase}) · ledger ${fmtUsd(totals.costUsd)} this invocation · ${fmtUsd(journal.spentUsd ?? 0)} in all`,
  );
  console.log(`   To continue${halt.reason === "probe" ? " once the production key probe succeeds" : ""}:\n   ${resumeCommand(file, { maxUsd, chunkSize: guard.chunkSize })}`);
}

/**
 * The requests this invocation may still submit, for the estimate: Phase A
 * requests that are built or due their one retry; Phase B for every
 * candidate whose verify request is built / due its retry, or does not exist
 * yet while its solves can all still resolve (a question with a failed solve
 * is skipped in step 5 and never gets a verify request — 148 of them on the
 * paused full-bank journal). Priced with a placeholder blind result of three
 * agreeing runs; the real prompt adds the solver's reasoning.
 */
function requestsToSubmit(journal: Journal, candidates: Map<string, CandidateQuestion>, buildSolve: (r: JournalRequest) => MessageParams) {
  const solveReqs = Object.values(journal.requests).filter((r) => r.phase === SOLVE && awaitsSubmit(r, false)).map(buildSolve);
  const solveWillResolve = (r: JournalRequest) => r.status === "submitted" || r.status === "succeeded" || r.status === "unusable" || awaitsSubmit(r, false);
  const solvesOk = new Map<string, boolean>();
  for (const r of Object.values(journal.requests)) if (r.phase === SOLVE) solvesOk.set(r.questionId, (solvesOk.get(r.questionId) ?? true) && solveWillResolve(r));
  const placeholder: SolveResult = aggregate(Array.from({ length: SOLVE_RUNS }, () => ({ chosen: "A", reasoning: "x".repeat(420), confidence: 0.9 })));
  const verifyReqs = [...candidates.entries()]
    .filter(([id]) => {
      const r = journal.requests[makeCustomId(VERIFY, id)];
      return r ? awaitsSubmit(r, true) : !journal.outputs.verify[id] && (solvesOk.get(id) ?? true);
    })
    .map(([, c]) => buildVerifyRequest(c, placeholder));
  return { solveReqs, verifyReqs };
}

function printEstimate(title: string, solveReqs: MessageParams[], verifyReqs: MessageParams[]) {
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
  console.log(`\n${title}`);
  console.log(`   Phase A solve  : ${solveReqs.length} requests · ~${sIn.toLocaleString()} prompt tokens · max_tokens ${sMax.toLocaleString()} (expected output ~${sOut.toLocaleString()} at ${OBSERVED_OUT.solve}/req, 15 Sep avg) · ${sModel}`);
  console.log(`   Phase B verify : ${verifyReqs.length} requests · ~${vIn.toLocaleString()} prompt tokens (placeholder blind result; real prompts add the solver's reasoning) · max_tokens ${vMax.toLocaleString()} (expected output ~${vOut.toLocaleString()} at ${OBSERVED_OUT.verify}/req) · ${vModel}`);
  console.log(`   Batch price    : expected ~$${expected.toFixed(2)} · worst case (every reply fills max_tokens) $${worst.toFixed(2)} · the same calls live would be ~$${(expected * 2).toFixed(2)}`);
  console.log(`   Prompt tokens are a character-count estimate (no count_tokens call was made).`);
}

/** `apply` is null on a dry run; on --apply it carries the guard main() built and the pre-flight probe it already passed. */
async function runBatchMode(apply: { guard: SpendGuard; preflight: ProbeResult } | null) {
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
    for (const o of openJournalsCovering(JOURNAL_DIR, new Set(rows.keys()))) {
      if (o.submitted) {
        const msg = `run ${o.runId} (phase ${o.phase}) has submitted batches covering ${o.overlap} of these rows; continue it with --resume ${o.file} ${applyFlags(apply?.guard)}${DRY ? "" : ", or pass --force to pay for them again"}`;
        if (!DRY && !FORCE) throw new Error(msg);
        console.warn(`   ! ${msg}`);
      } else {
        console.log(`   note: dry-run journal ${o.runId} covers ${o.overlap} of these rows; --resume ${o.file} ${applyFlags(apply?.guard)} submits exactly those`);
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
    const { solveReqs, verifyReqs } = requestsToSubmit(journal, candidates, buildSolve);
    printEstimate("ESTIMATE (no request submitted)", solveReqs, verifyReqs);
    console.log(`   Broken shape rows: ${totals.shape} (would be marked SHAPE)`);
    if (RESUME) {
      // A dry look at a journaled run must not move it; the estimate above is what is still to submit.
      console.log(`\nJournal untouched: ${file} (phase ${journal.phase})`);
      console.log(`To continue it (needs the founder's go-ahead + the bulk key; name the ceiling):\n   ${resumeCommand(file)}`);
    } else {
      journal.phase = "built";
      saveJournal(file, journal);
      console.log(`\nJournal written: ${file}`);
      console.log(`To submit exactly these requests (needs the founder's go-ahead + the bulk key; name the ceiling):\n   ${resumeCommand(file)}`);
    }
    return;
  }
  if (!apply) throw new Error("internal: --apply without a spend guard");
  const { guard, preflight } = apply;

  // Spend guard header (26 Sep 2026): what this invocation may submit, priced
  // before the first batch goes out, the ceiling it runs under, the chunk
  // size, the probe it passed and the operator's statement.
  const est = requestsToSubmit(journal, candidates, buildSolve);
  printEstimate(
    `TO SUBMIT under the spend guard — --max-usd ${fmtUsd(guard.maxUsd)} · --chunk ${guard.chunkSize} · ledgered by this journal so far ${fmtUsd(journal.spentUsd ?? 0)} · production key probe: ${describeProbe(preflight)}`,
    est.solveReqs,
    est.verifyReqs,
  );
  console.log(`   ${CONFIRM_AUTO_RELOAD_STATEMENT}`);
  journal.args.lastGuard = { at: new Date().toISOString(), maxUsd: guard.maxUsd, chunk: guard.chunkSize };
  const deps = { pollIntervalMs: POLL_MS, ledgerParallel: LEDGER_PARALLEL, saveEvery: COLLECT_SAVE_EVERY, guard };

  if (journal.phase === "new" || journal.phase === "built") {
    journal.phase = "solve";
    saveJournal(file, journal);
  }
  const solveOut = await runJournalPhase(
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
    // A malformed solve is dropped, as the pre-22-Sep live path did — fewer valid runs lowers agreement.
    false,
    deps,
  );
  totals.costUsd += solveOut.costUsd;
  if (solveOut.stop) return printStop(journal, file, solveOut.stop, guard);

  // 5. aggregate — runs in run-index order so the verify prompt reads like the live one
  const solves = new Map<string, SolveResult>();
  const skipped: string[] = [];
  // 26 Sep 2026: index the solve requests by question ONCE. Scanning all
  // journal requests per question was quadratic (36,817 × 147,120 on the
  // full-bank run) and kept the resume at 100% CPU for over 30 minutes
  // before Phase B could even be submitted.
  const solveReqsByQuestion = new Map<string, JournalRequest[]>();
  for (const r of Object.values(journal.requests)) {
    if (r.phase !== SOLVE) continue;
    const list = solveReqsByQuestion.get(r.questionId);
    if (list) list.push(r);
    else solveReqsByQuestion.set(r.questionId, [r]);
  }
  for (const id of rows.keys()) {
    const mine = solveReqsByQuestion.get(id) ?? [];
    if (mine.some((r) => r.status !== "succeeded" && r.status !== "unusable")) {
      // An API failure on any solve leaves the question unchecked for the next run, as the pre-22-Sep live path did.
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
  const verifyOut = await runJournalPhase(
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
    // The pre-22-Sep live path gave up on a row whose verdict is not JSON; a batch gets one more try, then the row stays unchecked.
    true,
    deps,
  );
  totals.costUsd += verifyOut.costUsd;
  if (verifyOut.stop) return printStop(journal, file, verifyOut.stop, guard);

  // 7. write verdicts exactly as the pre-22-Sep live path did
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
    `\n=== batch run ${journal.runId} done: checked ${totals.checked} · accepted ${totals.accepted} · key corrected ${totals.corrected} · failed ${totals.failed} · broken shape ${totals.shape} · newly validated ${totals.newlyValidated} · removed from pools ${totals.removed} · unchecked ${unchecked.length} (verdicts unusable ${unusableVerdicts}) · ledger ${fmtUsd(totals.costUsd)} this invocation · ${fmtUsd(journal.spentUsd ?? 0)} in all at batch prices (ceiling ${fmtUsd(guard.maxUsd)})`,
  );
  if (unchecked.length) console.log(`   unchecked questions are picked up by the next run (they carry no factoryVerify): ${unchecked.slice(0, 8).join(", ")}${unchecked.length > 8 ? "…" : ""}`);
}

// ---------------------------------------------------------------------------

async function main() {
  // 26 Sep 2026: the per-call --live path is gone (see the header). It ran
  // four full-price Opus calls per question on the tutor's own key with no
  // ceiling, outside guardFlags() and the probe — the one --apply that could
  // still empty the shared balance. Refused first, before any key or row is
  // read, and never silently downgraded to a batch run.
  if (process.argv.includes("--live")) {
    throw new Error(
      `--live was removed on 26 Sep 2026: it billed per call at full price on the shared ${PRODUCTION_KEY_ENV} (the tutor's key) outside the spend guard. Run batch mode instead: drop --live (and --concurrency), dry-run first, then --resume <runId> --apply --max-usd <usd> --chunk ${DEFAULT_CHUNK} ${CONFIRM_AUTO_RELOAD_FLAG}.`,
    );
  }
  if (!EXAMS.length && !RESUME) throw new Error("--exams CODE[,CODE…] is required (or --resume <runId>)");
  // Spend gate (22 Sep 2026): nothing that can bill starts while the bulk key
  // is absent, before the first database read.
  if (!DRY) assertBulkKey();
  // Spend guard (26 Sep 2026): the flags, the operator's statement and the
  // pre-flight probe of the production key — all before the first database
  // read, so an empty balance or a missing flag costs nothing.
  const flags = guardFlags(process.argv, !DRY);
  let apply: { guard: SpendGuard; preflight: ProbeResult } | null = null;
  if (!DRY) {
    const maxUsd = flags.maxUsd!;
    console.log(`\n=== spend guard: --max-usd ${fmtUsd(maxUsd)} (hard ceiling on this journal's ledgered spend, batch prices) · --chunk ${flags.chunkSize} requests per batch, one batch at a time`);
    console.log(`   ${CONFIRM_AUTO_RELOAD_STATEMENT}`);
    const preflight = await probeProductionKey();
    console.log(`   ${preflight.ok ? "✓" : "✗"} production key probe before the run (${PRODUCTION_KEY_ENV}, ${PROBE_MODEL}, max_tokens 1): ${describeProbe(preflight)}`);
    assertProductionKeyProbe(preflight);
    apply = { guard: { maxUsd, chunkSize: flags.chunkSize, probe: probeProductionKey }, preflight };
  }
  await runBatchMode(apply);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

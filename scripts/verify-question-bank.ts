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
// skipped, so the run is resumable. Spend is ledgered as feature "bank-verify".
//
//   npx dotenv-cli -e .env.local -- npx tsx scripts/verify-question-bank.ts \
//     --exams UK_UKSSSC,AP_APPSC_GROUP2 --scope unvalidated|validated|all \
//     [--concurrency 3] [--limit N] [--dry-run]

import { PrismaClient, type Prisma } from "@prisma/client";
import { DEFAULT_CONFIG, gate, solveBlind, verify, type CandidateQuestion } from "../src/lib/ai/factory";
import { estimateCostUsd, type CallStats } from "../src/lib/ai/client";
import type { Difficulty } from "../src/lib/ai/types";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const EXAMS = (arg("--exams") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const SCOPE = (arg("--scope") ?? "unvalidated") as "unvalidated" | "validated" | "all";
const CONCURRENCY = Math.max(1, Math.min(8, Number(arg("--concurrency") ?? 3)));
const LIMIT = arg("--limit") ? Math.max(1, Number(arg("--limit"))) : null;
const DRY = process.argv.includes("--dry-run");
const FEATURE = "bank-verify";

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

async function checkOne(code: string, r: Row): Promise<Outcome> {
  const at = new Date().toISOString();
  const prev = { prevKey: r.answerKey, prevValidated: r.validated, prevValidatedBy: r.validatedBy };

  if (!shapeOk(r.options) || !["A", "B", "C", "D"].includes(r.answerKey) || (r.body ?? "").trim().length < 10) {
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

  const candidate: CandidateQuestion = {
    body: r.body,
    options: r.options,
    answerKey: r.answerKey,
    solution: r.solution ?? "",
    difficulty: (["EASY", "MEDIUM", "HARD"].includes(r.difficulty) ? r.difficulty : "MEDIUM") as Difficulty,
    tags: r.tags ?? [],
  };
  const onCost = (s: CallStats) => {
    totals.costUsd += estimateCostUsd(s);
  };
  const solve = await solveBlind(candidate, { runs: DEFAULT_CONFIG.solveRuns, onCost, feature: FEATURE, ref: code });
  const v = await verify(candidate, solve, { onCost, feature: FEATURE, ref: code });
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

async function runExam(code: string) {
  const scopeSql = SCOPE === "unvalidated" ? "AND NOT q.validated" : SCOPE === "validated" ? "AND q.validated" : "";
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT q.id, q.body, q.options, q."answerKey", q.solution, q.difficulty::text AS difficulty, q.tags,
            q.validated, q."validatedBy", q.source::text AS source, q.metadata, t.code AS "topicCode"
     FROM "Question" q JOIN "Exam" x ON x.id = q."examId" JOIN "Topic" t ON t.id = q."topicId"
     WHERE x.code = $1 AND q.type = 'MCQ' ${scopeSql}
       AND (q.metadata IS NULL OR q.metadata->'factoryVerify' IS NULL)
     ORDER BY q."createdAt" ASC ${LIMIT ? `LIMIT ${LIMIT}` : ""}`,
    code,
  );
  console.log(`\n=== ${code}: ${rows.length} ${SCOPE} questions to check (concurrency ${CONCURRENCY}${DRY ? ", DRY RUN" : ""})`);
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

async function main() {
  if (!EXAMS.length) throw new Error("--exams CODE[,CODE…] is required");
  for (const code of EXAMS) {
    if (stop) break;
    await runExam(code);
  }
  console.log(`\nTOTAL: ${JSON.stringify({ ...totals, costUsd: Number(totals.costUsd.toFixed(2)) })}${stop ? " (stopped early)" : ""}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

// scripts/build-full-pyq-papers.ts
//
// The "I am satisfied" PYQ build (founder, 8 Aug 2026): aspirants asked
// for previous-year papers as FULL attemptable tests ("SSC CGL 2025 pyq
// as test all shifts"; one student was solving the MPESB 2022 paper
// outside Shishya). Most year sets are ~20-question samplers. This script:
//
//   1. Tops up an exam-year's PYQ-pattern bank (web-search-grounded
//      generator, fresh wording — never verbatim) towards the exam's REAL
//      paper length (exam.totalQuestions, at most 300).
//   2. Syncs that year's mock (the /exams/{code}/pyq/{year} page's own,
//      keyed by generatedBy) with an honest title: "(PYQ Pattern)" at 80% of
//      the paper or more, else "PYQ-pattern set (N of M questions)".
//
// 15 Sep 2026 — every generated question now passes the verification
// firewall before it is saved (src/lib/ai/factory: three blind solves, an
// examiner verdict, the gate). Only ACCEPT, or a key the solver and the
// examiner both correct, is saved, as validated by "factory:verify-v1";
// rejected questions never reach the bank. Until then questions were stamped
// validated at insert after a JSON-shape check, and the paper was capped at
// 120 questions whatever the real paper's size. Several years per run, exact
// duplicates of the year's existing questions are skipped, and spend is
// ledgered as "pyq-build" / "pyq-verify".
//
// Idempotent per (exam, year): re-running tops up only what's missing
// and never duplicates the mock.
//
// USAGE
//   npx dotenv-cli -e .env.local -- npx tsx scripts/build-full-pyq-papers.ts --exam SSC_CGL --years 2021,2022 [--dry-run]
//   (--year 2025 still works for a single year)

import { PrismaClient, type Prisma } from "@prisma/client";
import { generatePYQPatternBatch, MAX_QUESTIONS_PER_CALL } from "../src/lib/ai/pyq-generator";
import { DEFAULT_CONFIG, gate, solveBlind, verify, type CandidateQuestion } from "../src/lib/ai/factory";

const p = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const DRY = process.argv.includes("--dry-run");
const VERIFY_CONCURRENCY = 4;
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

type Generated = Awaited<ReturnType<typeof generatePYQPatternBatch>>["questions"][number];

async function verifyOne(q: Generated, code: string) {
  const candidate: CandidateQuestion = {
    body: q.body,
    options: q.options,
    answerKey: q.answerKey,
    solution: q.solution ?? "",
    difficulty: q.difficulty,
    tags: [],
  };
  const solve = await solveBlind(candidate, { runs: DEFAULT_CONFIG.solveRuns, feature: "pyq-verify", ref: code });
  const v = await verify(candidate, solve, { feature: "pyq-verify", ref: code });
  const g = gate(solve, v, DEFAULT_CONFIG);
  const corrected =
    g.decision === "REVIEW" && v.verdict === "MISMATCH" && !!v.correctKey && solve.majority === v.correctKey && solve.agreement >= DEFAULT_CONFIG.minAgreement;
  const pass = g.decision === "ACCEPT" || corrected;
  const bestRun = corrected ? solve.runs.filter((r) => r.chosen === v.correctKey).sort((a, b) => b.confidence - a.confidence)[0] : undefined;
  return {
    pass,
    answerKey: corrected ? v.correctKey! : q.answerKey,
    solution: corrected && bestRun?.reasoning ? bestRun.reasoning : q.solution,
    factoryVerify: {
      at: new Date().toISOString(),
      pipeline: "factory-v1",
      decision: g.decision,
      verdict: v.verdict,
      confidence: v.confidence,
      agreement: solve.agreement,
      majority: solve.majority,
      keyCorrected: corrected,
      verifierDifficulty: v.difficulty,
      rationale: v.rationale.slice(0, 400),
      issues: v.issues.slice(0, 6).map((s) => s.slice(0, 200)),
    },
  };
}

async function buildYear(exam: { id: string; code: string; name: string; shortName: string; category: string; totalQuestions: number; durationMin: number }, year: number, topics: { id: string; code: string; name: string; subjectName: string }[]) {
  const target = Math.min(exam.totalQuestions || 100, 300);
  const existing = await p.question.findMany({
    where: { examId: exam.id, pyqYear: year, source: "PYQ", validated: true },
    select: { body: true },
  });
  const seen = new Set(existing.map((q) => norm(q.body)));
  const have = existing.length;
  console.log(`[paper] ${exam.shortName} ${year}: have=${have} target=${target}`);

  let created = 0;
  let generated = 0;
  let rejected = 0;
  let batch = 0;
  // Room for rejections and duplicates: three times the batches the gap needs.
  const maxBatches = Math.ceil(Math.max(0, target - have) / MAX_QUESTIONS_PER_CALL) * 3;
  while (have + created < target && batch < maxBatches) {
    batch++;
    const need = target - have - created;
    try {
      const res = await generatePYQPatternBatch({
        examCode: exam.code,
        examName: exam.name,
        examShortName: exam.shortName,
        category: exam.category,
        topics,
        years: [year],
        targetCount: Math.min(need, MAX_QUESTIONS_PER_CALL),
      });
      const fresh = res.questions.filter((q) => {
        const k = norm(q.body);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      generated += fresh.length;

      // Verify the batch with a small worker pool.
      const results: { q: Generated; r: Awaited<ReturnType<typeof verifyOne>> | null }[] = fresh.map((q) => ({ q, r: null }));
      let next = 0;
      await Promise.all(
        Array.from({ length: VERIFY_CONCURRENCY }, async () => {
          while (next < results.length) {
            const i = next++;
            try {
              results[i].r = await verifyOne(results[i].q, exam.code);
            } catch (err) {
              console.error(`[paper] verify failed: ${String((err as Error)?.message ?? err).slice(0, 160)}`);
            }
          }
        }),
      );

      for (const { q, r } of results) {
        if (!r?.pass) {
          rejected++;
          continue;
        }
        if (have + created >= target) break;
        if (!DRY) {
          await p.question.create({
            data: {
              examId: exam.id, topicId: q.topicId, type: "MCQ",
              difficulty: q.difficulty, body: q.body, options: q.options,
              answerKey: r.answerKey, solution: r.solution,
              source: "PYQ", pyqYear: q.pyqYear,
              validated: true, validatedBy: "factory:verify-v1", validatedAt: new Date(),
              language: "EN",
              metadata: { sources: res.sources.slice(0, 5), fullPaperBuild: true, factoryVerify: r.factoryVerify } as Prisma.InputJsonValue,
            },
          });
        }
        created++;
      }
      console.log(`[paper] ${exam.code} ${year} batch ${batch}: generated ${fresh.length}, verified +${results.filter((x) => x.r?.pass).length} (now ${have + created}/${target}; rejected so far ${rejected})`);
    } catch (err: any) {
      console.error(`[paper] ${exam.code} ${year} batch ${batch} failed: ${String(err?.message ?? err).slice(0, 180)}`);
      if (/credit balance/i.test(String(err?.message))) throw err;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  if (DRY) {
    console.log(`[paper] DRY RUN ${exam.code} ${year}: would add ${created} (generated ${generated}, rejected ${rejected})`);
    return;
  }

  // The /exams/[code]/pyq/[year] page manages its own mock (keyed by
  // generatedBy = system:pyq:CODE:YEAR) and self-syncs questionIds and the
  // title on signed-in visits. We sync it NOW (same key, same id-asc order)
  // so the deeper set is live the moment generation finishes — and we never
  // create a duplicate mock.
  const finalQs = await p.question.findMany({
    where: { examId: exam.id, pyqYear: year, source: "PYQ", validated: true },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  const n = finalQs.length;
  const partial = exam.totalQuestions > 0 && n < 0.8 * exam.totalQuestions;
  const title = partial
    ? `${exam.shortName} — ${year} PYQ-pattern set (${n} of ${exam.totalQuestions} questions)`
    : `${exam.shortName} — ${year} (PYQ Pattern)`;
  const generatedBy = `system:pyq:${exam.code}:${year}`;
  const config = { source: "PYQ", year, durationMin: exam.durationMin, count: n } as Prisma.InputJsonValue;
  const pageMock = await p.mock.findFirst({ where: { examId: exam.id, userId: null, generatedBy } });
  if (pageMock) {
    await p.mock.update({ where: { id: pageMock.id }, data: { questionIds: finalQs.map((q) => q.id), title, config } });
    console.log(`[paper] SYNCED page mock ${pageMock.id}: ${n}q — ${title}`);
  } else if (n > 0) {
    await p.mock.create({
      data: { examId: exam.id, userId: null, type: "FULL", title, questionIds: finalQs.map((q) => q.id), generatedBy, config },
    });
    console.log(`[paper] CREATED page mock: ${n}q — ${title}`);
  }
  console.log(`[paper] DONE ${exam.shortName} ${year}: bank=${n}/${target} (added ${created}, rejected ${rejected})`);
}

async function main() {
  const examCode = arg("exam");
  const years = (arg("years") ?? arg("year") ?? "")
    .split(",")
    .map((y) => Number(y.trim()))
    .filter((y) => Number.isFinite(y) && y > 1990);
  if (!examCode || years.length === 0) {
    console.error("Usage: --exam CODE --years YYYY[,YYYY…] [--dry-run]");
    process.exit(1);
  }

  const exam = await p.exam.findUnique({
    where: { code: examCode },
    select: { id: true, code: true, name: true, shortName: true, category: true, totalQuestions: true, durationMin: true },
  });
  if (!exam) throw new Error(`exam ${examCode} not found`);

  const topicRows = await p.topic.findMany({
    where: { subject: { examId: exam.id } },
    select: { id: true, code: true, name: true, subject: { select: { name: true } } },
  });
  if (topicRows.length === 0) throw new Error(`no topics for ${examCode}`);
  const topics = topicRows.map((t) => ({ id: t.id, code: t.code, name: t.name, subjectName: t.subject.name }));

  for (const year of years) await buildYear(exam, year, topics);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());

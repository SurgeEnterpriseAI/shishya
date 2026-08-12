// scripts/build-full-pyq-papers.ts
//
// The "I am satisfied" PYQ build (founder, 8 Aug 2026): aspirants asked
// for previous-year papers as FULL attemptable tests ("SSC CGL 2025 pyq
// as test all shifts"; one student was solving the MPESB 2022 paper
// outside Shishya). The existing 83 "(Previous Year)" mocks are ~20-q
// samplers. This script:
//
//   1. Tops up an exam-year's PYQ-pattern bank (web-search-grounded
//      generator, fresh wording — never verbatim) to the exam's REAL
//      paper length (exam.totalQuestions).
//   2. Assembles a full-length Mock: real question count, real duration,
//      honestly titled "— Full Paper (PYQ Pattern)".
//
// Idempotent per (exam, year): re-running tops up only what's missing
// and never duplicates the mock.
//
// USAGE
//   npx tsx scripts/build-full-pyq-papers.ts --exam SSC_CGL --year 2025
//   npx tsx scripts/build-full-pyq-papers.ts --exam MP_MPESB --year 2022

import { PrismaClient } from "@prisma/client";
import { generatePYQPatternBatch, MAX_QUESTIONS_PER_CALL } from "../src/lib/ai/pyq-generator";

const p = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const examCode = arg("exam");
  const year = Number(arg("year"));
  if (!examCode || !Number.isFinite(year)) {
    console.error("Usage: --exam CODE --year YYYY");
    process.exit(1);
  }

  const exam = await p.exam.findUnique({
    where: { code: examCode },
    select: {
      id: true, code: true, name: true, shortName: true, category: true,
      totalQuestions: true, durationMin: true,
    },
  });
  if (!exam) throw new Error(`exam ${examCode} not found`);
  const target = Math.min(exam.totalQuestions || 100, 120);

  const topics = await p.topic.findMany({
    where: { subject: { examId: exam.id } },
    select: { id: true, code: true, name: true, subject: { select: { name: true } } },
  });
  if (topics.length === 0) throw new Error(`no topics for ${examCode}`);

  const have = await p.question.count({
    where: { examId: exam.id, pyqYear: year, source: "PYQ" },
  });
  console.log(`[paper] ${exam.shortName} ${year}: have=${have} target=${target}`);

  let created = 0;
  let batch = 0;
  while (have + created < target && batch < 14) {
    batch++;
    const need = target - have - created;
    try {
      const res = await generatePYQPatternBatch({
        examCode: exam.code,
        examName: exam.name,
        examShortName: exam.shortName,
        category: exam.category,
        topics: topics.map((t) => ({
          id: t.id, code: t.code, name: t.name, subjectName: t.subject.name,
        })),
        years: [year],
        targetCount: Math.min(need, MAX_QUESTIONS_PER_CALL),
      });
      for (const q of res.questions) {
        await p.question.create({
          data: {
            examId: exam.id, topicId: q.topicId, type: "MCQ",
            difficulty: q.difficulty, body: q.body, options: q.options,
            answerKey: q.answerKey, solution: q.solution,
            source: "PYQ", pyqYear: q.pyqYear,
            validated: true, validatedBy: "system:pyq-pattern", validatedAt: new Date(),
            language: "EN",
            metadata: { sources: res.sources.slice(0, 5), fullPaperBuild: true },
          },
        });
      }
      created += res.questions.length;
      console.log(`[paper] batch ${batch}: +${res.questions.length} (now ${have + created}/${target})`);
    } catch (err: any) {
      console.error(`[paper] batch ${batch} failed: ${String(err?.message ?? err).slice(0, 180)}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  // The /exams/[code]/pyq/[year] page manages its own mock (keyed by
  // generatedBy = system:pyq:CODE:YEAR) and self-syncs questionIds on
  // signed-in visits. We sync it NOW (same key, same id-asc order) so
  // the full paper is live the moment generation finishes — and we
  // never create a duplicate mock.
  const finalQs = await p.question.findMany({
    where: { examId: exam.id, pyqYear: year, source: "PYQ", validated: true },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  const generatedBy = `system:pyq:${exam.code}:${year}`;
  const pageMock = await p.mock.findFirst({ where: { examId: exam.id, userId: null, generatedBy } });
  if (pageMock) {
    await p.mock.update({
      where: { id: pageMock.id },
      data: {
        questionIds: finalQs.map((q) => q.id),
        config: { source: "PYQ", year, durationMin: exam.durationMin, count: finalQs.length } as any,
      },
    });
    console.log(`[paper] SYNCED page mock ${pageMock.id}: ${finalQs.length}q, ${exam.durationMin}min`);
  } else {
    await p.mock.create({
      data: {
        examId: exam.id, userId: null, type: "FULL",
        title: `${exam.shortName} — ${year} (Previous Year)`,
        questionIds: finalQs.map((q) => q.id),
        generatedBy,
        config: { source: "PYQ", year, durationMin: exam.durationMin, count: finalQs.length } as any,
      },
    });
    console.log(`[paper] CREATED page mock: ${finalQs.length}q, ${exam.durationMin}min`);
  }
  console.log(`[paper] DONE ${exam.shortName} ${year}: bank=${finalQs.length}/${target}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());

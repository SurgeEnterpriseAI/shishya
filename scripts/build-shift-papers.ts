// scripts/build-shift-papers.ts
//
// "PYQ as test — ALL SHIFTS" (feature request, Jun 2026). A real exam
// (e.g. SSC CGL Tier 1) runs across many shifts, each a DIFFERENT paper
// in the same pattern. We already have one full year paper per exam
// (system:pyq:CODE:YEAR); this adds extra shift-labelled full papers so
// an aspirant can solve several distinct 2025-pattern sets.
//
// The shift questions are stored source='AI_GENERATED' (NOT 'PYQ') so the
// /exams/{code}/pyq/{year} page — which self-syncs to every PYQ-source
// question of that year — never absorbs them. Each shift is its own FULL
// mock (system:shift:CODE:YEAR:N), shown in the hub's mocks section.
//
// Idempotent & resumable per (exam, year, shift): re-running tops up a
// short shift and never duplicates the mock.
//
// USAGE
//   npx tsx --env-file=.env.local scripts/build-shift-papers.ts --exam SSC_CGL --year 2025 --shifts 2 --count 100

import { PrismaClient } from "@prisma/client";
import { generatePYQPatternBatch, MAX_QUESTIONS_PER_CALL } from "../src/lib/ai/pyq-generator";

const p = new PrismaClient();
const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 ? process.argv[i + 1] : undefined; };

async function main() {
  const examCode = arg("exam");
  const year = Number(arg("year"));
  const shifts = Number(arg("shifts") ?? 2);
  const count = Number(arg("count") ?? 100);
  if (!examCode || !Number.isFinite(year)) { console.error("Usage: --exam CODE --year YYYY --shifts N --count M"); process.exit(1); }

  const exam = await p.exam.findUnique({
    where: { code: examCode },
    select: { id: true, code: true, name: true, shortName: true, category: true, durationMin: true },
  });
  if (!exam) throw new Error(`exam ${examCode} not found`);
  const topics = await p.topic.findMany({
    where: { subject: { examId: exam.id } },
    select: { id: true, code: true, name: true, subject: { select: { name: true } } },
  });
  if (topics.length === 0) throw new Error(`no topics for ${examCode}`);

  for (let shift = 2; shift <= shifts + 1; shift++) {
    // Shift 1 = the existing year paper; we add shift 2..N+1.
    const tag = `shift-${year}-${shift}`;
    const have = await p.question.count({
      where: { examId: exam.id, source: "AI_GENERATED", metadata: { path: ["shiftTag"], equals: tag } },
    });
    console.log(`[shift ${shift}] have=${have}/${count}`);
    let created = 0, batch = 0;
    while (have + created < count && batch < 14) {
      batch++;
      const need = count - have - created;
      try {
        const res = await generatePYQPatternBatch({
          examCode: exam.code, examName: exam.name, examShortName: exam.shortName, category: exam.category,
          topics: topics.map((t) => ({ id: t.id, code: t.code, name: t.name, subjectName: t.subject.name })),
          years: [year], targetCount: Math.min(need, MAX_QUESTIONS_PER_CALL),
        });
        for (const q of res.questions) {
          await p.question.create({
            data: {
              examId: exam.id, topicId: q.topicId, type: "MCQ", difficulty: q.difficulty,
              body: q.body, options: q.options, answerKey: q.answerKey, solution: q.solution,
              source: "AI_GENERATED", validated: true, validatedBy: "system:shift-paper", validatedAt: new Date(),
              language: "EN",
              metadata: { shiftTag: tag, yearPattern: year, shift, sources: res.sources.slice(0, 5) },
            },
          });
        }
        created += res.questions.length;
        console.log(`[shift ${shift}] batch ${batch}: +${res.questions.length} (${have + created}/${count})`);
      } catch (err: any) {
        console.error(`[shift ${shift}] batch ${batch} failed: ${String(err?.message ?? err).slice(0, 160)}`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    const qs = await p.question.findMany({
      where: { examId: exam.id, source: "AI_GENERATED", metadata: { path: ["shiftTag"], equals: tag } },
      select: { id: true }, orderBy: { id: "asc" },
    });
    const generatedBy = `system:shift:${exam.code}:${year}:${shift}`;
    const title = `${exam.shortName} — ${year} Shift ${shift} (Full Paper)`;
    const existing = await p.mock.findFirst({ where: { examId: exam.id, userId: null, generatedBy } });
    if (existing) {
      await p.mock.update({ where: { id: existing.id }, data: { questionIds: qs.map((q) => q.id), config: { source: "PYQ-shift", year, shift, durationMin: exam.durationMin, count: qs.length } as any } });
      console.log(`[shift ${shift}] SYNCED mock ${existing.id}: ${qs.length}q`);
    } else {
      await p.mock.create({ data: { examId: exam.id, userId: null, type: "FULL", title, questionIds: qs.map((q) => q.id), generatedBy, config: { source: "PYQ-shift", year, shift, durationMin: exam.durationMin, count: qs.length } as any } });
      console.log(`[shift ${shift}] CREATED mock "${title}": ${qs.length}q`);
    }
  }
  console.log(`[shift] DONE ${exam.shortName} ${year}: shifts 2..${shifts + 1}`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());

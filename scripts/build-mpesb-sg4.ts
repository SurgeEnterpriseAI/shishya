// scripts/build-mpesb-sg4.ts
//
// MPESB Group 2 SUB GROUP 4 targeted full mock. The Ask log shows
// "mpesb group 2 subgroup 4" five separate times — aspirants think in
// subgroups; our catalog has one MP_MPESB exam. Rather than fork the
// exam, this builds a dedicated full paper whose generation is
// RESEARCHED against the actual Sub Group 4 paper (Assistant Grade-3 /
// Stenographer family): the generator's exam name carries the subgroup
// so web_search grounds on the right paper's pattern.
//
// Questions land on MP_MPESB tagged metadata.subgroup='2-4'; the
// dedicated mock is assembled from exactly those questions.
//
// Usage: npx tsx scripts/build-mpesb-sg4.ts

import { PrismaClient } from "@prisma/client";
import { generatePYQPatternBatch, MAX_QUESTIONS_PER_CALL } from "../src/lib/ai/pyq-generator";

const p = new PrismaClient();
const TARGET = 100;

async function main() {
  const exam = await p.exam.findUnique({
    where: { code: "MP_MPESB" },
    select: { id: true, code: true, shortName: true, category: true, durationMin: true },
  });
  if (!exam) throw new Error("MP_MPESB not found");

  const topics = await p.topic.findMany({
    where: { subject: { examId: exam.id } },
    select: { id: true, code: true, name: true, subject: { select: { name: true } } },
  });

  const have = await p.question.count({
    where: { examId: exam.id, metadata: { path: ["subgroup"], equals: "2-4" } },
  });
  console.log(`[sg4] have=${have} target=${TARGET}`);

  let created = 0;
  let batch = 0;
  while (have + created < TARGET && batch < 14) {
    batch++;
    try {
      const res = await generatePYQPatternBatch({
        examCode: "MP_MPESB_G2S4",
        examName: "MPESB Group 2 Sub Group 4 (Assistant Grade-3, Stenographer & equivalent posts) — Madhya Pradesh Employees Selection Board",
        examShortName: "MPESB Group 2 Sub Group 4",
        category: exam.category,
        topics: topics.map((t) => ({ id: t.id, code: t.code, name: t.name, subjectName: t.subject.name })),
        years: [2023, 2024],
        targetCount: Math.min(TARGET - have - created, MAX_QUESTIONS_PER_CALL),
      });
      for (const q of res.questions) {
        await p.question.create({
          data: {
            examId: exam.id, topicId: q.topicId, type: "MCQ",
            difficulty: q.difficulty, body: q.body, options: q.options,
            answerKey: q.answerKey, solution: q.solution,
            source: "AI_GENERATED", language: "EN",
            validated: true, validatedBy: "system:sg4-pattern", validatedAt: new Date(),
            metadata: { subgroup: "2-4", sources: res.sources.slice(0, 5) },
          },
        });
      }
      created += res.questions.length;
      console.log(`[sg4] batch ${batch}: +${res.questions.length} (now ${have + created}/${TARGET})`);
    } catch (err: any) {
      console.error(`[sg4] batch ${batch} failed: ${String(err?.message ?? err).slice(0, 140)}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  const qs = await p.question.findMany({
    where: { examId: exam.id, metadata: { path: ["subgroup"], equals: "2-4" }, validated: true },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  const generatedBy = "system:sg4:MP_MPESB";
  const title = "MPESB Group 2 Sub Group 4 — Full Mock (Pattern)";
  const existing = await p.mock.findFirst({ where: { examId: exam.id, userId: null, generatedBy } });
  const config = { subgroup: "2-4", durationMin: 120, count: qs.length } as any;
  if (existing) {
    await p.mock.update({ where: { id: existing.id }, data: { questionIds: qs.map((q) => q.id), config } });
    console.log(`[sg4] SYNCED mock: ${qs.length}q`);
  } else {
    await p.mock.create({
      data: { examId: exam.id, userId: null, type: "FULL", title, questionIds: qs.map((q) => q.id), generatedBy, config },
    });
    console.log(`[sg4] CREATED mock: ${title} (${qs.length}q)`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());

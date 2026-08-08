// scripts/build-vernacular-mocks.ts
//
// Build a full-length vernacular-medium mock for an exam ("Telugu TET
// Paper IIA for ap mock test full" — the demand signal). Questions are
// authored NATIVELY in the medium (not translated), grounded in the
// real paper's register via web_search.
//
// USAGE
//   npx tsx scripts/build-vernacular-mocks.ts --exam AP_TET --lang TE
//   npx tsx scripts/build-vernacular-mocks.ts --exam MP_POLICE_PC --lang HI
//
// Idempotent + resumable per (exam, lang): tops up the native-language
// question bank to the exam's real paper length, then creates/updates
// ONE system mock titled with the native medium label.

import { PrismaClient } from "@prisma/client";
import { generateVernacularBatch, LANG_META, MAX_PER_CALL } from "../src/lib/ai/vernacular-mock-generator";

const p = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const examCode = arg("exam");
  const lang = (arg("lang") ?? "").toUpperCase();
  if (!examCode || !LANG_META[lang]) {
    console.error("Usage: --exam CODE --lang TE|HI|MR|KN|TA|BN");
    process.exit(1);
  }
  const meta = LANG_META[lang];

  const exam = await p.exam.findUnique({
    where: { code: examCode },
    select: { id: true, code: true, name: true, shortName: true, category: true, totalQuestions: true, durationMin: true },
  });
  if (!exam) throw new Error(`exam ${examCode} not found`);
  const target = Math.min(exam.totalQuestions || 100, 120);

  const topics = await p.topic.findMany({
    where: { subject: { examId: exam.id } },
    select: { id: true, code: true, name: true, subject: { select: { name: true } } },
  });
  if (topics.length === 0) throw new Error(`no topics for ${examCode}`);

  const have = await p.question.count({ where: { examId: exam.id, language: lang as any } });
  console.log(`[vern] ${exam.shortName} ${meta.name}: have=${have} target=${target}`);

  let created = 0;
  let batch = 0;
  while (have + created < target && batch < 14) {
    batch++;
    try {
      const res = await generateVernacularBatch({
        examCode: exam.code, examName: exam.name, examShortName: exam.shortName,
        category: exam.category, lang,
        topics: topics.map((t) => ({ id: t.id, code: t.code, name: t.name, subjectName: t.subject.name })),
        targetCount: Math.min(target - have - created, MAX_PER_CALL),
      });
      for (const q of res.questions) {
        await p.question.create({
          data: {
            examId: exam.id, topicId: q.topicId, type: "MCQ",
            difficulty: q.difficulty, body: q.body, options: q.options,
            answerKey: q.answerKey, solution: q.solution,
            source: "AI_GENERATED", language: lang as any,
            validated: true, validatedBy: "system:vernacular", validatedAt: new Date(),
            metadata: { vernacularBuild: true },
          },
        });
      }
      created += res.questions.length;
      console.log(`[vern] batch ${batch}: +${res.questions.length} (now ${have + created}/${target})`);
    } catch (err: any) {
      console.error(`[vern] batch ${batch} failed: ${String(err?.message ?? err).slice(0, 160)}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  const finalQs = await p.question.findMany({
    where: { examId: exam.id, language: lang as any, validated: true },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  const generatedBy = `system:vernacular:${exam.code}:${lang}`;
  const title = `${exam.shortName} — Full Mock (${meta.native} Medium)`;
  const existing = await p.mock.findFirst({ where: { examId: exam.id, userId: null, generatedBy } });
  if (existing) {
    await p.mock.update({
      where: { id: existing.id },
      data: { questionIds: finalQs.map((q) => q.id), config: { language: lang, durationMin: exam.durationMin, count: finalQs.length } as any },
    });
    console.log(`[vern] SYNCED mock: ${title} (${finalQs.length}q)`);
  } else {
    await p.mock.create({
      data: {
        examId: exam.id, userId: null, type: "FULL", title,
        questionIds: finalQs.map((q) => q.id), generatedBy,
        config: { language: lang, durationMin: exam.durationMin, count: finalQs.length } as any,
      },
    });
    console.log(`[vern] CREATED mock: ${title} (${finalQs.length}q, ${exam.durationMin}min)`);
  }
  console.log(`[vern] DONE ${exam.shortName} ${meta.name}: bank=${finalQs.length}/${target}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());

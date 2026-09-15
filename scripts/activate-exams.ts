// scripts/activate-exams.ts — make seeded exams public, but only when they are
// ready (15 Sep 2026).
//
// Exams are seeded inactive ahead of their question bank (MP_RAEO, KA_KSRP),
// and every public exam route returns 404 while inactive. An exam may go
// public only when:
//   • its verified pool covers the real paper (validated >= totalQuestions),
//   • a shared full-length paper exists (generatedBy system:full-pattern-v1,
//     built with: assemble-full-mocks.ts --only CODE), and
//   • every subject has at least 5 validated questions, so no section of the
//     syllabus is empty.
// Anything short of that is printed and the exam stays inactive.
//
// Dry run by default; --apply activates the exams that pass.
//   npx dotenv-cli -e .env.local -- npx tsx scripts/activate-exams.ts --codes MP_RAEO,KA_KSRP [--apply]

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const codesIdx = process.argv.indexOf("--codes");
const CODES = codesIdx >= 0 ? process.argv[codesIdx + 1].split(",").map((c) => c.trim()).filter(Boolean) : [];
const MIN_PER_SUBJECT = 5;

async function main() {
  if (CODES.length === 0) throw new Error("--codes CODE[,CODE] is required");
  for (const code of CODES) {
    const exam = await prisma.exam.findUnique({ where: { code }, select: { id: true, active: true, totalQuestions: true, shortName: true } });
    if (!exam) {
      console.log(`${code}: no such exam`);
      continue;
    }
    const [validated, fullMock, subjects] = await Promise.all([
      prisma.question.count({ where: { examId: exam.id, validated: true } }),
      prisma.mock.findFirst({
        where: { examId: exam.id, userId: null, generatedBy: "system:full-pattern-v1" },
        select: { id: true, questionIds: true },
      }),
      prisma.$queryRaw<{ code: string; n: number }[]>`
        SELECT s.code, COUNT(q.id) FILTER (WHERE q.validated)::int AS n
        FROM "Subject" s JOIN "Topic" t ON t."subjectId" = s.id LEFT JOIN "Question" q ON q."topicId" = t.id
        WHERE s."examId" = ${exam.id}
        GROUP BY s.code`,
    ]);
    const thin = subjects.filter((s) => s.n < MIN_PER_SUBJECT);
    const problems: string[] = [];
    if (validated < exam.totalQuestions) problems.push(`validated ${validated} < paper ${exam.totalQuestions}`);
    if (!fullMock) problems.push("no full-length paper (run assemble-full-mocks.ts --only " + code + ")");
    else if (fullMock.questionIds.length < exam.totalQuestions) problems.push(`full paper holds ${fullMock.questionIds.length} of ${exam.totalQuestions}`);
    if (thin.length) problems.push(`subjects under ${MIN_PER_SUBJECT} validated: ${thin.map((s) => `${s.code}=${s.n}`).join(", ")}`);

    const state = exam.active ? "already active" : "inactive";
    if (problems.length) {
      console.log(`${code} (${state}): NOT READY — ${problems.join("; ")}`);
      continue;
    }
    console.log(`${code} (${state}): ready — ${validated} validated, full paper ${fullMock!.questionIds.length}Q, ${subjects.length} subjects`);
    if (APPLY && !exam.active) {
      await prisma.exam.update({ where: { id: exam.id }, data: { active: true } });
      console.log(`${code}: ACTIVATED`);
    }
  }
  if (!APPLY) console.log("dry run — re-run with --apply to activate the exams that are ready");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

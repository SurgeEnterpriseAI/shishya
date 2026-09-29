// scripts/assemble-notice-mocks-sep29.ts
//
// Builds the shared full-length paper for GSSSB and NSTSE with the SECTION SIZES their official
// notices print (29 Sep 2026), not the proportional-by-weight split of scripts/assemble-full-mocks.ts:
// the stored subject trees do not match these notices' sections, so a weight split would not be the
// real paper. Each notice section takes validated questions from the stored subjects that hold it.
//
//   GSSSB Advt 378/202526, para 21, Stage 1 (1 mark per question, so marks = questions):
//     English 15 · Gujarati 15 · General Awareness and Current Affairs 30 · Quantitative Aptitude 30 ·
//     Reasoning 60 (our bank keeps Quantitative Aptitude and Reasoning in one subject: 90 from it).
//   NSTSE, Classes 6-10 paper (60 questions, 1 mark each):
//     Physics 15 · Chemistry 15 · Biology 15 · Mathematics 10 · Critical Thinking 5.
//
// Needs the exam rows already corrected (150 Q / 120 min; 60 Q / 60 min) and no current
// 'system:full-pattern-v1' paper for the exam (scripts/fix-real-pattern-mocks-sep29.ts retires the old one).
//
//   npx tsx --env-file=.env.local scripts/assemble-notice-mocks-sep29.ts           # dry run
//   npx tsx --env-file=.env.local scripts/assemble-notice-mocks-sep29.ts --apply

import { prisma } from "../src/lib/db/prisma";

const V1 = "system:full-pattern-v1";

const PLANS: Record<string, { name: string; subjects: string[]; n: number }[]> = {
  GJ_GSSSB: [
    { name: "English", subjects: ["English Language Skills"], n: 15 },
    { name: "Gujarati", subjects: ["Gujarati Language Skills"], n: 15 },
    { name: "General Awareness and Current Affairs", subjects: ["General Knowledge", "Gujarat General Knowledge"], n: 30 },
    { name: "Quantitative Aptitude and Reasoning", subjects: ["Reasoning and Quantitative Aptitude"], n: 90 },
  ],
  NSTSE: [
    { name: "Physics", subjects: ["Physics"], n: 15 },
    { name: "Chemistry", subjects: ["Chemistry"], n: 15 },
    { name: "Biology", subjects: ["Biology"], n: 15 },
    { name: "Mathematics", subjects: ["Mathematics"], n: 10 },
    { name: "Critical Thinking", subjects: ["General Questions and Reasoning"], n: 5 },
  ],
};

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function main() {
  const apply = process.argv.includes("--apply");
  for (const [code, plan] of Object.entries(PLANS)) {
    const exam = await prisma.exam.findFirst({ where: { code }, select: { id: true, shortName: true, totalQuestions: true, durationMin: true } });
    if (!exam) throw new Error(`${code}: no exam row`);
    const want = plan.reduce((a, s) => a + s.n, 0);
    if (want !== exam.totalQuestions) throw new Error(`${code}: sections add to ${want}, exam row says ${exam.totalQuestions} — correct the row first`);
    const current = await prisma.mock.findFirst({ where: { examId: exam.id, userId: null, generatedBy: V1 }, select: { id: true } });
    if (current) { console.log(`${code}: a current full-pattern paper exists (${current.id}) — skipped`); continue; }

    const picked: string[] = [];
    const sections: { name: string; count: number }[] = [];
    for (const s of plan) {
      const pool = await prisma.question.findMany({
        where: { examId: exam.id, validated: true, NOT: { tags: { has: "rejected" } }, topic: { subject: { name: { in: s.subjects } } } },
        select: { id: true },
      });
      if (pool.length < s.n) throw new Error(`${code}: ${s.name} needs ${s.n}, the bank holds ${pool.length}`);
      picked.push(...shuffle(pool.map((q) => q.id)).slice(0, s.n));
      sections.push({ name: s.name, count: s.n });
      console.log(`  ${code} ${s.name}: ${s.n} of ${pool.length}`);
    }
    const title = `${exam.shortName} — Full-Length Mock (Real Pattern: ${exam.totalQuestions}Q · ${exam.durationMin} min)`;
    console.log(`${apply ? "" : "[dry] "}${code}: ${title}`);
    if (!apply) continue;
    const m = await prisma.mock.create({
      data: {
        examId: exam.id,
        userId: null,
        type: "FULL",
        title,
        questionIds: picked,
        generatedBy: V1,
        config: { pattern: "real", count: exam.totalQuestions, durationMin: exam.durationMin, sections, sectionsFrom: "official notice, read 29 Sep 2026" } as object,
      },
      select: { id: true },
    });
    console.log(`  created ${m.id}`);
  }
}

main().finally(() => prisma.$disconnect());

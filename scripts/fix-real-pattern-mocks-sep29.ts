// scripts/fix-real-pattern-mocks-sep29.ts
//
// After the 29 Sep 2026 official-pattern corrections (scripts/apply-official-pattern-corrections.ts),
// three shared "Full-Length Mock (Real Pattern …)" papers no longer match the paper the notice
// describes, and IOQM's paper gives options where the real one asks for an integer:
//   • RJ_RSMSSB  150 Q, 120 min → the notice gives 180 min: the timer and title change in place.
//   • GJ_GSSSB   100 Q / 60 min and NSTSE 100 Q / 90 min → the notices give 150 Q / 120 min and
//     60 Q / 60 min. The old papers are RETIRED (kept, not deleted: generatedBy renamed so the hub's
//     one full-pattern lookup no longer finds them, config.pattern "retired", an honest title), and
//     scripts/assemble-full-mocks.ts --only GJ_GSSSB,NSTSE builds new ones at the right size.
//   • IOQM  title says "Real Pattern", but the paper asks for integer answers with no options:
//     retitled "Full-Length Practice Set".
//
//   npx tsx --env-file=.env.local scripts/fix-real-pattern-mocks-sep29.ts           # dry run
//   npx tsx --env-file=.env.local scripts/fix-real-pattern-mocks-sep29.ts --apply

import { prisma } from "../src/lib/db/prisma";

const V1 = "system:full-pattern-v1";
const RETIRED = "system:full-pattern-v1:retired-2026-09-29";

async function main() {
  const apply = process.argv.includes("--apply");
  const find = async (code: string) =>
    prisma.mock.findFirst({
      where: { exam: { code }, userId: null, generatedBy: V1 },
      select: { id: true, title: true, config: true, questionIds: true, exam: { select: { shortName: true, durationMin: true, totalQuestions: true } } },
    });

  const plan: { id: string; code: string; data: { title?: string; generatedBy?: string; config?: object } }[] = [];

  const rs = await find("RJ_RSMSSB");
  if (rs && (rs.config as any)?.durationMin !== rs.exam.durationMin) {
    plan.push({
      id: rs.id, code: "RJ_RSMSSB",
      data: {
        title: `${rs.exam.shortName} — Full-Length Mock (Real Pattern: ${rs.questionIds.length}Q · ${rs.exam.durationMin} min)`,
        config: { ...(rs.config as object), durationMin: rs.exam.durationMin },
      },
    });
  }

  for (const code of ["GJ_GSSSB", "NSTSE"]) {
    const m = await find(code);
    if (!m) continue;
    if (m.questionIds.length === m.exam.totalQuestions && (m.config as any)?.durationMin === m.exam.durationMin) continue;
    const d = (m.config as any)?.durationMin;
    plan.push({
      id: m.id, code,
      data: {
        title: `${m.exam.shortName} — Full-Length Practice Set (${m.questionIds.length}Q · ${d} min)`,
        generatedBy: RETIRED,
        config: { ...(m.config as object), pattern: "retired", retiredOn: "2026-09-29", retiredWhy: "the official notice gives a different size or time" },
      },
    });
  }

  const io = await find("IOQM");
  if (io && /Real Pattern/.test(io.title)) {
    plan.push({ id: io.id, code: "IOQM", data: { title: `${io.exam.shortName} — Full-Length Practice Set (${io.questionIds.length}Q · ${(io.config as any)?.durationMin} min)` } });
  }

  for (const p of plan) console.log(p.code.padEnd(12), p.id, JSON.stringify({ title: p.data.title, generatedBy: p.data.generatedBy, durationMin: (p.data.config as any)?.durationMin, pattern: (p.data.config as any)?.pattern }));
  if (!apply) { console.log(`dry run: ${plan.length} mocks would change`); return; }
  await prisma.$transaction(plan.map((p) => prisma.mock.update({ where: { id: p.id }, data: p.data })));
  console.log(`applied ${plan.length}`);
}

main().finally(() => prisma.$disconnect());

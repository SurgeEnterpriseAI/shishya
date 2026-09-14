// Shared mock titles that overstate what the mock holds (15 Sep 2026).
//
//   • PYQ-pattern year mocks (system:pyq:CODE:YEAR): 165 still titled
//     "(Previous Year)" — 130 of them hold under 80% of the real paper and
//     none holds the actual paper. They become "{short} — {year} (PYQ Pattern)"
//     when at least 80% of the paper, else "{short} — {year} PYQ-pattern set
//     ({n} of {m} questions)" — the year page now keeps them that way.
//   • Shift papers (system:shift:CODE:YEAR:N) titled "{year} Shift N (Full
//     Paper)": generated practice in that shift pattern, not the shift's paper.
//   • "Full Paper-I/II Simulation" mocks holding 50 of a paper's questions.
//
// Dry run by default (prints old → new); --apply writes.
//   npx dotenv-cli -e .env.local -- npx tsx scripts/fix-overstated-mock-titles.ts [--apply]

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  const rows = await prisma.$queryRaw<{ id: string; gen: string; title: string; qs: number | null; tq: number; short: string }[]>`
    SELECT m.id, m."generatedBy" AS gen, m.title, array_length(m."questionIds", 1) AS qs, x."totalQuestions" AS tq, x."shortName" AS short
    FROM "Mock" m JOIN "Exam" x ON x.id = m."examId"
    WHERE m."userId" IS NULL
      AND (m."generatedBy" LIKE 'system:pyq:%' OR m."generatedBy" LIKE 'system:shift:%' OR m.title ILIKE '%Simulation%')`;

  const changes: { id: string; from: string; to: string }[] = [];
  for (const r of rows) {
    const n = r.qs ?? 0;
    let to: string | null = null;
    if (r.gen.startsWith("system:pyq:")) {
      const year = r.gen.split(":")[3];
      const partial = r.tq > 0 && n < 0.8 * r.tq;
      to = partial ? `${r.short} — ${year} PYQ-pattern set (${n} of ${r.tq} questions)` : `${r.short} — ${year} (PYQ Pattern)`;
    } else if (r.gen.startsWith("system:shift:")) {
      const [, , , year, shift] = r.gen.split(":");
      to = `${r.short} — practice paper ${shift} in the ${year} shift pattern (${n} questions)`;
    } else if (/Simulation/i.test(r.title)) {
      const paper = r.title.match(/Paper-([IVX]+)/i)?.[1];
      to = `${r.short} — ${paper ? `Paper-${paper} ` : ""}practice set (${n} questions)`;
    }
    if (to && to !== r.title) changes.push({ id: r.id, from: r.title, to });
  }

  const listAll = process.argv.includes("--list");
  console.log(`${changes.length} of ${rows.length} titles to change`);
  for (const c of listAll ? changes : changes.slice(0, 15)) console.log(`  ${c.from}\n    → ${c.to}`);
  if (!listAll && changes.length > 15) console.log(`  … and ${changes.length - 15} more (--list prints all)`);
  if (!APPLY) {
    console.log("dry run — re-run with --apply to write");
    return;
  }
  for (const c of changes) await prisma.mock.update({ where: { id: c.id }, data: { title: c.to } });
  console.log(`updated ${changes.length} titles`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

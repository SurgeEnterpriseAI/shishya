// 27 Sep 2026 — UP_UPCET loses "CUET PG-style" from its name.
//
// The row was seeded as "UP Combined Entrance Test (UPCET / CUET PG-style)"
// (seed/exams/state-exams.ts), so the site search matched "cuet pg" on the
// name and opened the Uttar Pradesh entrance test — the organic wave 2
// search-miss read, 27 Sep 2026 (data/national-exams-2026.json CUET_PG
// activeRecommendation). CUET (PG) is NTA's national postgraduate test, now
// its own row (CUET_PG, src/lib/exam-aliases.ts "cuet pg" → CUET_PG). The new
// name keeps every word a student types for UPCET ("UP", "Combined Entrance
// Test", "UPCET") and nothing else; the seed file carries the same name, so a
// re-seed does not bring the old one back.
//
// Writes ONLY Exam.name of UP_UPCET, and only while it is still the old seeded
// name (a hand edit since is left alone and reported). Dry run by default.
//
// Run: npx tsx --env-file=.env.local scripts/rename-upcet.ts [--apply]

import { prisma } from "../src/lib/db/prisma";

export const UPCET_CODE = "UP_UPCET";
export const OLD_NAME = "UP Combined Entrance Test (UPCET / CUET PG-style)";
export const NEW_NAME = "UP Combined Entrance Test (UPCET)";

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "APPLY: renaming." : "DRY RUN: nothing is written (pass --apply to write).");
  const row = await prisma.exam.findUnique({ where: { code: UPCET_CODE }, select: { id: true, name: true, shortName: true, active: true } });
  if (!row) {
    console.log(`${UPCET_CODE}: no row — nothing to do.`);
    return;
  }
  console.log(`${UPCET_CODE} (active=${row.active}, shortName "${row.shortName}")`);
  console.log(`   name before: ${row.name}`);
  // Every other exam whose name or short name says "CUET PG" — only CUET_PG should.
  const others = await prisma.exam.findMany({
    where: {
      code: { notIn: [UPCET_CODE, "CUET_PG"] },
      OR: [{ name: { contains: "CUET PG", mode: "insensitive" } }, { shortName: { contains: "CUET PG", mode: "insensitive" } }],
    },
    select: { code: true, name: true },
  });
  for (const o of others) console.log(`   note: ${o.code} is also named "${o.name}" — not changed here`);

  if (row.name === NEW_NAME) {
    console.log("   already renamed — nothing to write.");
    return;
  }
  if (row.name !== OLD_NAME) {
    console.log(`   the name is no longer the seeded "${OLD_NAME}" — left alone (edit by hand if it still says CUET PG).`);
    return;
  }
  console.log(`   name after:  ${NEW_NAME}`);
  if (!apply) {
    console.log("Dry run — pass --apply to write.");
    return;
  }
  const r = await prisma.exam.updateMany({ where: { id: row.id, name: OLD_NAME }, data: { name: NEW_NAME } });
  console.log(`   ${r.count === 1 ? "renamed" : "not changed (the name moved under us)"}.`);
  console.log("The search index is cached for an hour; the hub and catalogue caches for 10 minutes.");
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}

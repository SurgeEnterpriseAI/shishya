import { prisma } from "../src/lib/db/prisma";

async function main() {
  const r = await prisma.exam.findMany({
    where: {
      OR: [
        { code: { contains: "CLAT" } },
        { code: { contains: "GATE" } },
        { shortName: { contains: "CLAT" } },
        { shortName: { contains: "GATE" } },
      ],
    },
    select: { code: true, shortName: true, category: true, active: true },
  });
  console.log("CLAT/GATE-matching exams in DB:");
  for (const e of r) console.log(`  code=${e.code}  shortName=${e.shortName}  category=${e.category}  active=${e.active}`);
  if (r.length === 0) console.log("  NONE FOUND");

  // Also show all 163 exam codes for reference
  const all = await prisma.exam.count();
  console.log(`\ntotal exams in DB: ${all}`);
}
main().then(() => process.exit(0));

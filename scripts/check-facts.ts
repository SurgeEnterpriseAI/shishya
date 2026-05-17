import { prisma } from "../src/lib/db/prisma";

async function main() {
  const counts = await prisma.$queryRaw<Array<{section: string; n: bigint}>>`
    SELECT "section"::text AS section, COUNT(*)::bigint AS n
    FROM "Fact"
    GROUP BY "section"
    ORDER BY n DESC
  `;
  console.log("facts by section:");
  for (const r of counts) console.log(`  ${r.section}: ${r.n}`);

  const total = await prisma.$queryRaw<Array<{n: bigint}>>`SELECT COUNT(*)::bigint AS n FROM "Fact"`;
  console.log(`\ntotal: ${total[0]?.n}`);

  // How many DISTINCT pageIds have facts?
  const distinctPages = await prisma.$queryRaw<Array<{n: bigint}>>`
    SELECT COUNT(DISTINCT "pageId")::bigint AS n FROM "Fact"
  `;
  console.log(`distinct pageIds: ${distinctPages[0]?.n}`);

  // Sample 5 facts to confirm shape
  const sample = await prisma.$queryRaw<Array<{id: string; pageId: string; claimText: string; claimValue: string; status: string}>>`
    SELECT "id", "pageId", "claimText", "claimValue", "status"::text
    FROM "Fact"
    ORDER BY "createdAt" DESC
    LIMIT 5
  `;
  console.log(`\nsample facts:`);
  for (const f of sample) {
    console.log(`  ${f.pageId} :: ${f.claimText} = ${f.claimValue.slice(0, 50)}... [${f.status}]`);
  }
}

main().then(() => process.exit(0));

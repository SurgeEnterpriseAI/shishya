import { prisma } from "../src/lib/db/prisma";

async function main() {
  const rows = await prisma.$queryRaw<Array<{ id: string; claimText: string; claimValue: string }>>`
    SELECT "id", "claimText", "claimValue"
    FROM "Fact"
    WHERE "pageId" = '/schooling/cbse'
    ORDER BY "id"
  `;
  console.log(`/schooling/cbse facts: ${rows.length}`);
  for (const r of rows) console.log(`  ${r.id}  ::  ${r.claimText}  =  ${r.claimValue.slice(0, 60)}`);
}
main().then(() => process.exit(0));

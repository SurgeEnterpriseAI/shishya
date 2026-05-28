// One-shot backfill: rotate every existing isSeed=true Discussion's
// authorName from "Shishya sample" to a varied synthetic handle.
// Idempotent — re-running is safe (will just re-rotate names).
//
// Usage:
//   npx tsx --env-file=.env.local scripts/rename-seed-authors.ts

import { prisma } from "../src/lib/db/prisma";
import { pickSyntheticHandle } from "../src/data/synthetic-handles";

async function main() {
  const rows = await prisma.discussion.findMany({
    where: { isSeed: true },
    select: { id: true, authorName: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`found ${rows.length} seed threads to rename`);

  const used: string[] = [];
  for (const r of rows) {
    const handle = pickSyntheticHandle(used);
    used.push(handle);
    await prisma.discussion.update({
      where: { id: r.id },
      data: { authorName: handle },
    });
    console.log(`  ${r.id}  "${r.authorName ?? "—"}"  →  "${handle}"`);
  }
  console.log("\ndone.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

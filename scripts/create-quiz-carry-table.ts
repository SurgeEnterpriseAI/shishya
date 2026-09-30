// Creates the QuizCarry table (30 Sep 2026): one row per account and guest
// quiz stash carried into that account's weak topics at sign-in (source
// 'guest-quiz' — src/lib/quiz-carry.ts). Raw SQL, idempotent, additive; the
// same statements the import runs itself if it ever finds no table
// (src/lib/db/quiz-carry.ts ENSURE_QUIZ_CARRY_SQL).
// Mirrors the QuizCarry model in prisma/schema.prisma (Prisma index names).
//   npx dotenv-cli -e .env.local -- npx tsx scripts/create-quiz-carry-table.ts
//   add --dry to print the SQL without connecting.

import { prisma } from "../src/lib/db/prisma";
import { ENSURE_QUIZ_CARRY_SQL, ensureQuizCarryTable } from "../src/lib/db/quiz-carry";

async function main() {
  if (process.argv.includes("--dry")) {
    for (const sql of ENSURE_QUIZ_CARRY_SQL) console.log(`${sql};\n`);
    return;
  }
  await ensureQuizCarryTable(prisma);
  const [row] = await prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*)::int AS n FROM "QuizCarry"`);
  console.log(`QuizCarry: ${row.n} rows`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

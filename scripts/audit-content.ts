// Content coverage audit — what do students actually have access to?
//
//   npx tsx scripts/audit-content.ts
//
// Prints, per exam with any content: total/validated question counts and
// public mock counts, plus platform totals (users, attempts, enrollments).
// Read-only; safe against production.

import { PrismaClient } from "@prisma/client";

async function main() {
  const p = new PrismaClient();
  try {
    const byExam = await p.$queryRawUnsafe<
      Array<{ code: string; shortName: string; total: number; validated: number; public_mocks: number }>
    >(`
      SELECT e.code, e."shortName",
        (SELECT COUNT(*)::int FROM "Question" q WHERE q."examId" = e.id) AS total,
        (SELECT COUNT(*)::int FROM "Question" q WHERE q."examId" = e.id AND q.validated) AS validated,
        (SELECT COUNT(*)::int FROM "Mock" m WHERE m."examId" = e.id AND m."userId" IS NULL) AS public_mocks
      FROM "Exam" e
      WHERE EXISTS (SELECT 1 FROM "Question" q WHERE q."examId" = e.id)
         OR EXISTS (SELECT 1 FROM "Mock" m WHERE m."examId" = e.id)
      ORDER BY 3 DESC
    `);
    console.log("exam | total Q | validated Q | public mocks");
    for (const r of byExam) {
      console.log(`${r.code} | ${r.total} | ${r.validated} | ${r.public_mocks}`);
    }

    const [users, attempts] = await Promise.all([
      p.user.count(),
      p.attempt.count({ where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } } }),
    ]);
    const enr = await p.$queryRawUnsafe<Array<{ code: string; n: number }>>(`
      SELECT e.code, COUNT(*)::int AS n
      FROM "Enrollment" en JOIN "Exam" e ON e.id = en."examId"
      WHERE en.active
      GROUP BY e.code ORDER BY n DESC LIMIT 10
    `);
    console.log(`\nusers=${users} submittedAttempts=${attempts}`);
    console.log("top enrollments: " + enr.map((x) => `${x.code}:${x.n}`).join(" "));
  } finally {
    await p.$disconnect();
  }
}

main().catch((err) => {
  console.error("audit failed:", err.message ?? err);
  process.exit(1);
});

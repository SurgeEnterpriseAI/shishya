import { prisma } from "../src/lib/db/prisma";

async function main() {
  const now = new Date();
  const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const h6 = new Date(now.getTime() - 6 * 60 * 60 * 1000);

  // 1. Most-attempted exams in last 24h
  console.log("=== EXAMS PEOPLE TRIED (last 24h) ===");
  const examActivity = await prisma.$queryRaw<Array<{ name: string; code: string; n: bigint; submitted: bigint }>>`
    SELECT e."name", e."code", COUNT(*)::bigint AS n,
           COUNT(*) FILTER (WHERE a."finishedAt" IS NOT NULL)::bigint AS submitted
    FROM "Attempt" a
    JOIN "Mock" m ON m."id" = a."mockId"
    JOIN "Exam" e ON e."id" = m."examId"
    WHERE a."startedAt" >= ${h24}
    GROUP BY e."name", e."code"
    ORDER BY n DESC
    LIMIT 15
  `;
  for (const r of examActivity) {
    console.log(`  ${String(r.n).padStart(3)} attempts (${r.submitted} submitted)  ${r.name}`);
  }

  // 2. Mock attempt details — score, duration, completion
  console.log("\n=== RECENT ATTEMPTS (last 6h) ===");
  const recent = await prisma.$queryRaw<Array<{
    startedAt: Date;
    finishedAt: Date | null;
    durationSec: number | null;
    scorePct: number | null;
    email: string;
    examName: string;
  }>>`
    SELECT a."startedAt", a."finishedAt", a."durationSec", a."scorePct",
           u."email", e."name" AS "examName"
    FROM "Attempt" a
    JOIN "User" u ON u."id" = a."userId"
    JOIN "Mock" m ON m."id" = a."mockId"
    JOIN "Exam" e ON e."id" = m."examId"
    WHERE a."startedAt" >= ${h6}
    ORDER BY a."startedAt" DESC
    LIMIT 20
  `;
  for (const r of recent) {
    const dur = r.durationSec ? `${Math.round(r.durationSec / 60)}m` : "in progress";
    // scorePct is already stored in 0-100 range (NOT 0-1) — see
    // src/lib/scoring.ts line 143. Display as-is, don't *100 again.
    const score = r.scorePct != null ? `${Math.round(r.scorePct * 10) / 10}%` : "—";
    const status = r.finishedAt ? `done ${score}` : "ACTIVE";
    console.log(`  ${r.startedAt.toISOString()}  ${r.email.slice(0, 28).padEnd(30)}  ${r.examName.slice(0, 22).padEnd(24)}  ${dur.padEnd(12)} ${status}`);
  }

  // 3. AI chat usage — what students are asking
  console.log("\n=== AI CHAT MESSAGES (last 24h, user-side only) ===");
  const chats = await prisma.$queryRaw<Array<{
    createdAt: Date;
    role: string;
    content: string;
    email: string;
  }>>`
    SELECT cm."createdAt", cm."role", cm."content", u."email"
    FROM "ChatMessage" cm
    JOIN "ChatSession" cs ON cs."id" = cm."sessionId"
    JOIN "User" u ON u."id" = cs."userId"
    WHERE cm."createdAt" >= ${h24} AND cm."role" = 'USER'
    ORDER BY cm."createdAt" DESC
    LIMIT 30
  `;
  console.log(`(${chats.length} user messages)`);
  for (const c of chats) {
    const body = c.content.replace(/\s+/g, " ").slice(0, 90);
    console.log(`  ${c.createdAt.toISOString()}  ${c.email.slice(0, 24).padEnd(26)}  ${body}`);
  }

  // 4. Translation activity (which locales students are picking)
  console.log("\n=== TRANSLATION REQUESTS (last 24h) ===");
  const trans = await prisma.$queryRaw<Array<{ locale: string; n: bigint }>>`
    SELECT "locale", COUNT(*)::bigint AS n
    FROM "QuestionTranslation"
    WHERE "createdAt" >= ${h24}
    GROUP BY "locale"
    ORDER BY n DESC
  `;
  for (const t of trans) console.log(`  ${t.locale}: ${t.n}`);

  // 5. Sign-in retention — how many of yesterday's signups came back?
  const yesterday1Start = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const yesterday1End = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdaySignups = await prisma.$queryRaw<Array<{ n: bigint; returned: bigint }>>`
    WITH y AS (
      SELECT "id" FROM "User"
      WHERE "createdAt" >= ${yesterday1Start} AND "createdAt" < ${yesterday1End}
    )
    SELECT
      (SELECT COUNT(*) FROM y)::bigint AS n,
      (SELECT COUNT(DISTINCT a."userId") FROM "Attempt" a JOIN y ON y."id" = a."userId" WHERE a."startedAt" >= ${yesterday1End})::bigint AS returned
  `;
  const ys = yesterdaySignups[0];
  if (ys && ys.n > 0n) {
    console.log(`\n=== DAY-1 RETENTION ===`);
    console.log(`  yesterday's signups: ${ys.n}`);
    console.log(`  came back today:     ${ys.returned} (${ys.n > 0n ? Math.round(Number(ys.returned) * 100 / Number(ys.n)) : 0}%)`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

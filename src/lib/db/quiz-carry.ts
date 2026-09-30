// The guest quiz carry — the DB layer (30 Sep 2026). Rules and why:
// src/lib/quiz-carry.ts.
//
//   • ENSURE_QUIZ_CARRY_SQL — CREATE TABLE IF NOT EXISTS "QuizCarry" (the
//     repo's raw-SQL ensure pattern — never prisma migrate / db push on the
//     live DB). Run once by scripts/create-quiz-carry-table.ts; the import
//     also runs it itself the first time an insert finds no table, so a
//     deploy before the script cannot lose a carry.
//   • applyQuizCarry — ONE transaction: the QuizCarry row first (unique per
//     account and stash — a repeat inserts nothing and writes nothing), then
//     one multi-row WeaknessMap upsert for all its topics. Never an Attempt,
//     a Mock or a ProgressEvent: no public counter and no streak reads what
//     this writes.
//   • The table mirrors the QuizCarry model in prisma/schema.prisma (so a
//     schema diff never proposes dropping it); it is still created by the
//     ensure SQL below, never by prisma migrate / db push.

import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { QUIZ_CARRY_SOURCE, quizMastery, stashFingerprint, type CarryTopic, type QuizCarryBody } from "@/lib/quiz-carry";

export const ENSURE_QUIZ_CARRY_SQL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS "QuizCarry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "stashKey" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'guest-quiz',
    "questionCount" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "topics" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "quizAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "QuizCarry_userId_stashKey_key" ON "QuizCarry"("userId", "stashKey")`,
  `CREATE INDEX IF NOT EXISTS "QuizCarry_userId_idx" ON "QuizCarry"("userId")`,
];

export async function ensureQuizCarryTable(db: Pick<typeof prisma, "$executeRawUnsafe"> = prisma): Promise<void> {
  for (const sql of ENSURE_QUIZ_CARRY_SQL) await db.$executeRawUnsafe(sql);
}

/** sha256 of the stash's identity for this account (src/lib/quiz-carry.ts stashFingerprint). */
export function stashKeyOf(userId: string, body: QuizCarryBody): string {
  return createHash("sha256").update(stashFingerprint(userId, body)).digest("hex");
}

/** Postgres "relation does not exist" (42P01), however Prisma wraps it. */
export function isMissingTableError(err: unknown): boolean {
  const e = err as { code?: unknown; meta?: { code?: unknown }; message?: unknown } | null;
  if (!e) return false;
  if (e.code === "42P01" || e.meta?.code === "42P01") return true;
  return typeof e.message === "string" && /relation "QuizCarry" does not exist/i.test(e.message);
}

/** The WeaknessMap upsert for every carried topic, as ONE statement
 *  (src/lib/quiz-carry.ts mergeMastery is the same rule): counts add up;
 *  masteryScore — the last set's accuracy, as the submit route keeps it —
 *  becomes the quiz's own only when the quiz is the newer set (`seenAt`, the
 *  quiz's own time, not before the row's lastSeenAt); lastSeenAt becomes the
 *  later of the two. 30 Sep 2026 (review): one multi-row statement instead of
 *  one per topic, so the transaction is always two round trips (the submit
 *  route measured ~800 ms each to the Asia DB — 1 + N sequential statements
 *  could outrun the transaction timeout). The topics are distinct
 *  (gradeCarry keys them by topicId), so no row is hit twice. Null for none. */
export function weaknessUpsertSql(
  userId: string,
  examId: string,
  topics: readonly CarryTopic[],
  seenAt: Date,
  now: Date,
): Prisma.Sql | null {
  if (topics.length === 0) return null;
  const rows = topics.map(
    (t) =>
      Prisma.sql`(${randomUUID()}, ${userId}, ${examId}, ${t.topicId}, ${quizMastery(t)}::double precision, ${t.total}::integer, ${t.correct}::integer, ${seenAt}, ${now})`,
  );
  return Prisma.sql`
    INSERT INTO "WeaknessMap" ("id", "userId", "examId", "topicId", "masteryScore", "attemptsCount", "correctCount", "lastSeenAt", "updatedAt")
    VALUES ${Prisma.join(rows)}
    ON CONFLICT ("userId", "examId", "topicId") DO UPDATE SET
      "masteryScore" = CASE WHEN EXCLUDED."lastSeenAt" >= "WeaknessMap"."lastSeenAt"
        THEN EXCLUDED."masteryScore" ELSE "WeaknessMap"."masteryScore" END,
      "attemptsCount" = "WeaknessMap"."attemptsCount" + EXCLUDED."attemptsCount",
      "correctCount" = "WeaknessMap"."correctCount" + EXCLUDED."correctCount",
      "lastSeenAt" = GREATEST("WeaknessMap"."lastSeenAt", EXCLUDED."lastSeenAt"),
      "updatedAt" = EXCLUDED."updatedAt"`;
}

/** The quiz's own time for lastSeenAt — never after `now` (the stash may run
 *  up to an hour ahead on a skewed clock: isFreshStashTime). */
export function carrySeenAt(body: Pick<QuizCarryBody, "at">, now: Date): Date {
  return new Date(Math.min(body.at, now.getTime()));
}

/** The interactive transaction's limits: two statements, but each can take
 *  ~800 ms to the Asia DB, so not Prisma's 5 s default (review, 30 Sep 2026). */
export const QUIZ_CARRY_TX_OPTIONS = { maxWait: 5_000, timeout: 15_000 } as const;

export type CarryResult = { status: "saved" } | { status: "already" };

async function applyOnce(
  userId: string,
  examId: string,
  body: QuizCarryBody,
  graded: { graded: number; correct: number; topics: CarryTopic[] },
  now: Date,
): Promise<CarryResult> {
  const key = stashKeyOf(userId, body);
  const upsert = weaknessUpsertSql(userId, examId, graded.topics, carrySeenAt(body, now), now);
  return prisma.$transaction(async (tx) => {
    const inserted = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO "QuizCarry" ("id", "userId", "examId", "stashKey", "source", "questionCount", "correctCount", "topics", "quizAt", "createdAt")
      VALUES (${randomUUID()}, ${userId}, ${examId}, ${key}, ${QUIZ_CARRY_SOURCE}, ${graded.graded}, ${graded.correct},
              ${JSON.stringify(graded.topics)}::jsonb, ${new Date(body.at)}, ${now})
      ON CONFLICT ("userId", "stashKey") DO NOTHING
      RETURNING "id"`;
    if (inserted.length === 0) return { status: "already" } as const;
    if (upsert) await tx.$executeRaw(upsert);
    return { status: "saved" } as const;
  }, QUIZ_CARRY_TX_OPTIONS);
}

/** Record the carry and write the topics — once per account and stash. */
export async function applyQuizCarry(
  userId: string,
  examId: string,
  body: QuizCarryBody,
  graded: { graded: number; correct: number; topics: CarryTopic[] },
  now: Date = new Date(),
): Promise<CarryResult> {
  try {
    return await applyOnce(userId, examId, body, graded, now);
  } catch (err) {
    if (!isMissingTableError(err)) throw err;
    await ensureQuizCarryTable();
    return applyOnce(userId, examId, body, graded, now);
  }
}

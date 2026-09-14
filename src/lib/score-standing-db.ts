// Score estimates candidates chose to add — storage and the standing read
// (14 Sep 2026). SERVER ONLY. Rules: src/lib/score-standing.ts; table:
// scripts/create-score-entry-table.ts (raw SQL).

import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { getExamWeekInputs } from "@/lib/exam-week-inputs";
import { scoredCount } from "@/lib/marking-scheme";
import { sittingVerdict, standingSitting } from "@/lib/score-sitting";
import { estimateScore, sittingKey, standingView, validCounts, type EstimateCounts, type StandingView } from "@/lib/score-standing";

export function hashScoreKey(key: string): string {
  return createHash("sha256").update(`shishya-score:${key}`).digest("hex");
}

/** How many candidates have added a score for a sitting (0 on any failure, e.g. before the table exists). */
export async function standingCount(examId: string, sitting: string): Promise<number> {
  const rows = await prisma
    .$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM "ScoreEntry" WHERE "examId" = ${examId} AND sitting = ${sitting}`
    .catch(() => [] as { n: number }[]);
  return Number(rows[0]?.n ?? 0);
}

export type AddScoreResult =
  | { ok: true; score: number; maxMarks: number; view: StandingView }
  | { ok: false; status: number; error: string };

/**
 * Add (or replace) one browser's estimate for the sitting candidates can
 * compare right now. Refuses when the calculator itself would refuse, when
 * no sitting is open for comparison, or when the counts cannot describe a
 * real answer sheet; the score is recomputed here from the counts.
 */
export async function addScoreEntry(p: { examCode: string; counts: EstimateCounts; key: string }): Promise<AddScoreResult> {
  const exam = await prisma.exam.findUnique({
    where: { code: p.examCode },
    select: {
      id: true,
      code: true,
      shortName: true,
      name: true,
      active: true,
      description: true,
      totalQuestions: true,
      scoredQuestions: true,
      totalMarks: true,
      marksPerQ: true,
      negativeMark: true,
    },
  });
  if (!exam?.active) return { ok: false, status: 404, error: "exam not found" };
  const inputs = await getExamWeekInputs(exam.id);
  const { verdict } = sittingVerdict(exam, inputs);
  const open = standingSitting(exam, inputs);
  const sitting = open ? sittingKey(open.row) : null;
  if (!verdict.ok || !open || !sitting) {
    return { ok: false, status: 409, error: "Scores for this exam can't be compared right now." };
  }
  const scored = scoredCount(exam);
  const counts = validCounts(p.counts, scored);
  if (!counts) return { ok: false, status: 400, error: "Those counts don't fit this paper." };
  const score = estimateScore(counts, { marksPerQ: exam.marksPerQ, negativeMark: exam.negativeMark, scored });
  const keyHash = hashScoreKey(p.key);

  await prisma.$executeRaw`
    INSERT INTO "ScoreEntry" (id, "examId", sitting, "keyHash", attempted, correct, wrong, score, "maxMarks", "createdAt", "updatedAt")
    VALUES (${crypto.randomUUID()}, ${exam.id}, ${sitting}, ${keyHash}, ${counts.attempted}, ${counts.correct}, ${counts.wrong},
      ${score}, ${exam.totalMarks}, NOW(), NOW())
    ON CONFLICT ("examId", sitting, "keyHash") DO UPDATE SET
      attempted = EXCLUDED.attempted,
      correct = EXCLUDED.correct,
      wrong = EXCLUDED.wrong,
      score = EXCLUDED.score,
      "maxMarks" = EXCLUDED."maxMarks",
      "updatedAt" = NOW()`;
  const [s] = await prisma.$queryRaw<{ n: number; higher: number; tied: number }[]>`
    SELECT COUNT(*)::int AS n,
           COUNT(*) FILTER (WHERE score > ${score})::int AS higher,
           COUNT(*) FILTER (WHERE score = ${score})::int AS tied
    FROM "ScoreEntry" WHERE "examId" = ${exam.id} AND sitting = ${sitting}`;
  return {
    ok: true,
    score,
    maxMarks: exam.totalMarks,
    view: standingView({ n: Number(s?.n ?? 0), higher: Number(s?.higher ?? 0), tied: Number(s?.tied ?? 0) }),
  };
}

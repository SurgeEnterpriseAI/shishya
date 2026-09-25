// Result card data (14 Sep 2026). SERVER ONLY. Rules and words:
// src/lib/result-card.ts.

import { prisma } from "@/lib/db/prisma";
import { liveTestRank } from "@/lib/live-test";
import { attemptPaperIds } from "@/lib/attempt-paper";
import { cardFirstName, printableRank, type CardPaper, type PaperRank, type ResultCardInput } from "@/lib/result-card";

/**
 * Rank of a student's FIRST scored attempt on a shared (system) mock, among
 * every student's first — the same rule as the live-test rank, without the
 * window. Later practice runs never re-rank.
 */
export async function sharedMockRank(mockId: string, userId: string): Promise<PaperRank | null> {
  const rows = await prisma.$queryRaw<{ id: string; userId: string; pct: number }[]>`
    SELECT DISTINCT ON ("userId") id, "userId", "scorePct" AS pct
    FROM "Attempt"
    WHERE "mockId" = ${mockId} AND status IN ('SUBMITTED', 'AUTO_SUBMITTED') AND "scorePct" IS NOT NULL
    ORDER BY "userId", "startedAt" ASC`;
  const mine = rows.find((r) => r.userId === userId);
  if (!mine) return null;
  const better = rows.filter((r) => r.pct > mine.pct).length;
  return { rank: better + 1, of: rows.length, rankedAttemptId: mine.id };
}

/** Everything the card prints for one submitted attempt, or null (missing, not the owner's, not submitted). */
export async function loadResultCard(attemptId: string, userId: string): Promise<ResultCardInput | null> {
  const a = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      status: true,
      scoreRaw: true,
      scoreMax: true,
      scorePct: true,
      answers: true,
      startedAt: true,
      finishedAt: true,
      user: { select: { name: true } },
      mock: {
        select: {
          id: true,
          userId: true,
          examId: true,
          generatedBy: true,
          config: true,
          questionIds: true,
          exam: { select: { shortName: true } },
        },
      },
    },
  });
  if (!a || a.userId !== userId) return null;
  if (a.status !== "SUBMITTED" && a.status !== "AUTO_SUBMITTED") return null;

  // 25 Sep 2026: the paper this attempt had (a shared mock's slot can be
  // swapped after it was taken) — src/lib/attempt-paper.ts.
  const paperIds = attemptPaperIds({ questionIds: a.mock.questionIds, answers: a.answers, startedAt: a.startedAt, config: a.mock.config });
  const inPaper = new Set(paperIds);
  const answers = Array.isArray(a.answers) ? (a.answers as { questionId?: string; correct?: boolean }[]) : [];
  const correct = answers.filter((x) => x && x.correct === true && typeof x.questionId === "string" && inPaper.has(x.questionId)).length;

  // Personal best — the results page's rule: beats every earlier scored attempt on this exam.
  const prevBest = await prisma.attempt
    .findFirst({
      where: {
        userId,
        mock: { examId: a.mock.examId },
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
        scorePct: { not: null },
        id: { not: a.id },
        finishedAt: { lt: a.finishedAt ?? new Date() },
      },
      orderBy: { scorePct: "desc" },
      select: { scorePct: true },
    })
    .catch(() => null);
  const personalBest = prevBest?.scorePct != null && a.scorePct != null && a.scorePct > prevBest.scorePct;

  const rehearsal = (a.mock.config as { rehearsal?: unknown } | null)?.rehearsal === true;
  const paper: CardPaper =
    a.mock.generatedBy === "live-test" ? (rehearsal ? "rehearsal" : "live") : a.mock.userId == null ? "shared" : "personal";
  let raw: PaperRank | null = null;
  if (paper === "live" || paper === "rehearsal") {
    const r = await liveTestRank(a.mock.id, userId).catch(() => null);
    raw = r ? { rank: r.rank, of: r.of, rankedAttemptId: r.attemptId } : null;
  } else if (paper === "shared") {
    raw = await sharedMockRank(a.mock.id, userId).catch(() => null);
  }

  return {
    firstName: cardFirstName(a.user?.name),
    examShort: a.mock.exam.shortName,
    paper,
    scoreRaw: a.scoreRaw,
    scoreMax: a.scoreMax,
    scorePct: a.scorePct,
    correct,
    total: paperIds.length,
    personalBest,
    rank: printableRank(paper, raw, a.id),
  };
}

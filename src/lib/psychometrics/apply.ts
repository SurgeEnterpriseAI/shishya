// Persistence orchestrator — applies one scored attempt to the student model.
//
// Called from the attempt-submit path as a BEST-EFFORT side-effect (a failure
// here must never block the student's submission). Design for the submit
// path's latency budget: read everything up front, compute in memory, write
// back with parallel upserts — never one round-trip per answer.
//
// Updates three stores:
//   QuestionStat  — online IRT calibration of each answered item
//   AbilityState  — per-subject θ for the student
//   ReviewState   — FSRS schedule per topic touched by this attempt
//
// WeaknessMap stays the UI-facing projection and keeps its existing writer;
// dashboards can migrate to AbilityState/ReviewState incrementally.

import type { PrismaClient } from "@prisma/client";
import {
  updateOnResponse,
  seedItemFromDifficulty,
  type AbilityParams,
  type ItemParams,
} from "./irt";
import { initialState, review, ratingFromAccuracy } from "./fsrs";

export interface ScoredAnswer {
  questionId: string;
  chosen: string | null;
  correct: boolean;
}

export interface QuestionMeta {
  topicId: string;
  subjectId: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
}

export interface ApplyArgs {
  userId: string;
  examId: string;
  answers: ScoredAnswer[];
  questionMeta: Map<string, QuestionMeta>;
  now?: Date;
}

export interface ApplySummary {
  itemsUpdated: number;
  subjects: Array<{ subjectId: string; theta: number; se: number }>;
  topicsScheduled: number;
}

export async function applyAttemptPsychometrics(
  prisma: PrismaClient,
  args: ApplyArgs,
): Promise<ApplySummary> {
  const now = args.now ?? new Date();
  const answered = args.answers.filter(
    (a) => a.chosen != null && args.questionMeta.has(a.questionId),
  );
  if (answered.length === 0) {
    return { itemsUpdated: 0, subjects: [], topicsScheduled: 0 };
  }

  const questionIds = answered.map((a) => a.questionId);
  const subjectIds = [...new Set(answered.map((a) => args.questionMeta.get(a.questionId)!.subjectId))];
  const topicIds = [...new Set(answered.map((a) => args.questionMeta.get(a.questionId)!.topicId))];

  // ── Read current state in 3 parallel queries ──────────────────────────
  const [statRows, abilityRows, reviewRows] = await Promise.all([
    prisma.questionStat.findMany({ where: { questionId: { in: questionIds } } }),
    prisma.abilityState.findMany({ where: { userId: args.userId, subjectId: { in: subjectIds } } }),
    prisma.reviewState.findMany({ where: { userId: args.userId, topicId: { in: topicIds } } }),
  ]);

  const items = new Map<string, ItemParams>();
  for (const r of statRows) {
    items.set(r.questionId, { b: r.irtB, a: r.irtA, attempts: r.attemptsCount });
  }
  const abilities = new Map<string, AbilityParams>();
  for (const r of abilityRows) {
    abilities.set(r.subjectId, { theta: r.theta, se: r.se, attempts: r.attemptsCount });
  }

  // ── Compute in memory, answer by answer ───────────────────────────────
  const correctDelta = new Map<string, number>(); // questionId → +correct
  for (const ans of answered) {
    const meta = args.questionMeta.get(ans.questionId)!;
    const item = items.get(ans.questionId) ?? seedItemFromDifficulty(meta.difficulty);
    const ability = abilities.get(meta.subjectId) ?? { theta: 0, se: 1, attempts: 0 };

    const updated = updateOnResponse(ability, item, ans.correct);
    items.set(ans.questionId, updated.item);
    abilities.set(meta.subjectId, updated.ability);
    if (ans.correct) correctDelta.set(ans.questionId, (correctDelta.get(ans.questionId) ?? 0) + 1);
  }

  // ── Topic accuracy → FSRS review ──────────────────────────────────────
  const topicAcc = new Map<string, { correct: number; total: number }>();
  for (const ans of answered) {
    const t = args.questionMeta.get(ans.questionId)!.topicId;
    const acc = topicAcc.get(t) ?? { correct: 0, total: 0 };
    acc.total += 1;
    if (ans.correct) acc.correct += 1;
    topicAcc.set(t, acc);
  }
  const reviewByTopic = new Map(reviewRows.map((r) => [r.topicId, r]));
  const reviewWrites = [...topicAcc.entries()].map(([topicId, acc]) => {
    const prev = reviewByTopic.get(topicId);
    const state = prev
      ? {
          stability: prev.stability,
          difficulty: prev.difficulty,
          reps: prev.reps,
          lapses: prev.lapses,
          lastReview: prev.lastReview,
          due: prev.due,
        }
      : initialState(now);
    const next = review(state, ratingFromAccuracy(acc.correct / acc.total), now);
    return prisma.reviewState.upsert({
      where: { userId_topicId: { userId: args.userId, topicId } },
      update: {
        stability: next.stability,
        difficulty: next.difficulty,
        reps: next.reps,
        lapses: next.lapses,
        lastReview: next.lastReview,
        due: next.due,
      },
      create: {
        userId: args.userId,
        examId: args.examId,
        topicId,
        stability: next.stability,
        difficulty: next.difficulty,
        reps: next.reps,
        lapses: next.lapses,
        lastReview: next.lastReview,
        due: next.due,
      },
    });
  });

  // ── Persist item + ability state in parallel ──────────────────────────
  const itemWrites = [...items.entries()].map(([questionId, p]) => {
    const meta = args.questionMeta.get(questionId);
    const answeredCount = answered.filter((a) => a.questionId === questionId).length;
    const correctCount = correctDelta.get(questionId) ?? 0;
    void meta;
    return prisma.questionStat.upsert({
      where: { questionId },
      update: {
        irtB: p.b,
        irtA: p.a,
        attemptsCount: { increment: answeredCount },
        correctCount: { increment: correctCount },
      },
      create: {
        questionId,
        irtB: p.b,
        irtA: p.a,
        attemptsCount: answeredCount,
        correctCount,
      },
    });
  });

  const abilityWrites = [...abilities.entries()].map(([subjectId, a]) =>
    prisma.abilityState.upsert({
      where: { userId_subjectId: { userId: args.userId, subjectId } },
      update: { theta: a.theta, se: a.se, attemptsCount: a.attempts },
      create: {
        userId: args.userId,
        examId: args.examId,
        subjectId,
        theta: a.theta,
        se: a.se,
        attemptsCount: a.attempts,
      },
    }),
  );

  await Promise.all([...itemWrites, ...abilityWrites, ...reviewWrites]);

  return {
    itemsUpdated: items.size,
    subjects: [...abilities.entries()].map(([subjectId, a]) => ({
      subjectId,
      theta: a.theta,
      se: a.se,
    })),
    topicsScheduled: topicAcc.size,
  };
}

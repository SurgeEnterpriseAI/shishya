// Pure scoring + mastery math extracted from the submit route handler.
// No DB access here — everything takes inputs and returns outputs, so we can
// unit-test it. The route handler stays focused on persistence.

import type { Difficulty } from "@prisma/client";

/**
 * Display-format a stored scorePct.
 *
 * Stored scorePct can go negative when negative-marking exceeds correct
 * marks (e.g. 0/6 right with -1 penalty per wrong = -16.7%). That's
 * mathematically true but reads harshly to a student. We clamp the
 * display to 0% — the raw `scoreRaw / scoreMax` fraction below the % is
 * the truth-teller for anyone who wants the breakdown.
 */
export function formatDisplayScorePct(scorePct: number | null | undefined): string {
  if (scorePct == null) return "—";
  const clamped = Math.max(0, scorePct);
  return `${clamped.toFixed(1)}%`;
}

export interface ScoringInput {
  questionIds: string[];
  questionsById: Map<
    string,
    {
      id: string;
      answerKey: string;
      topicId: string;
      topicCode: string;
      topicName: string;
      difficulty: Difficulty;
    }
  >;
  /** Raw answers as saved during the attempt (no `correct` flag yet). */
  submittedAnswers: Array<{
    questionId: string;
    chosen: string | null;
    timeSec: number;
    marked: boolean;
  }>;
  marksPerQ: number;
  negativeMark: number; // positive number, subtracted on wrong
}

export interface ScoredAnswer {
  questionId: string;
  topicId: string;
  topicCode: string;
  topicName: string;
  difficulty: Difficulty;
  chosen: string | null;
  correct: boolean;
  marks: number;
  timeSec: number;
  marked: boolean;
}

export interface TopicAggregate {
  topicId: string;
  topicCode: string;
  topicName: string;
  correct: number;
  total: number;
  timeSum: number;
  /** Mastery defined as correct/total, in [0, 1]. 0 if total is 0. */
  score: number;
}

export interface ScoringResult {
  scored: ScoredAnswer[];
  scoreRaw: number;
  scoreMax: number;
  scorePct: number; // 0..100
  topicAgg: Map<string, TopicAggregate>;
  topicScores: Record<
    string,
    {
      topicCode: string;
      topicName: string;
      correct: number;
      total: number;
      score: number;
    }
  >;
}

/**
 * Compute the score of a submitted attempt. Pure: same inputs → same outputs.
 *
 * Edge cases handled:
 *  - Question with no submitted answer counts as skipped (chosen=null, marks=0).
 *  - Question whose ID isn't found in `questionsById` is dropped (logged by caller).
 *  - All tied with marksPerQ × count cap; negative marks subtracted as positives.
 */
export function scoreAttempt(input: ScoringInput): ScoringResult {
  const submittedById = new Map(input.submittedAnswers.map((a) => [a.questionId, a]));

  const scored: ScoredAnswer[] = [];
  const topicAgg = new Map<string, TopicAggregate>();
  let scoreRaw = 0;

  for (const qid of input.questionIds) {
    const q = input.questionsById.get(qid);
    if (!q) continue;
    const sub = submittedById.get(qid) ?? null;
    const chosen = sub?.chosen ?? null;
    const correct = chosen != null && chosen === q.answerKey;
    const marks =
      chosen == null ? 0 : correct ? input.marksPerQ : -input.negativeMark;
    scoreRaw += marks;

    scored.push({
      questionId: qid,
      topicId: q.topicId,
      topicCode: q.topicCode,
      topicName: q.topicName,
      difficulty: q.difficulty,
      chosen,
      correct,
      marks,
      timeSec: sub?.timeSec ?? 0,
      marked: sub?.marked ?? false,
    });

    const agg = topicAgg.get(q.topicId) ?? {
      topicId: q.topicId,
      topicCode: q.topicCode,
      topicName: q.topicName,
      correct: 0,
      total: 0,
      timeSum: 0,
      score: 0,
    };
    agg.total += 1;
    if (correct) agg.correct += 1;
    agg.timeSum += sub?.timeSec ?? 0;
    agg.score = agg.total === 0 ? 0 : agg.correct / agg.total;
    topicAgg.set(q.topicId, agg);
  }

  const scoreMax = input.questionIds.length * input.marksPerQ;
  const scorePct = scoreMax === 0 ? 0 : (scoreRaw / scoreMax) * 100;

  const topicScores: ScoringResult["topicScores"] = {};
  for (const [topicId, t] of topicAgg) {
    topicScores[topicId] = {
      topicCode: t.topicCode,
      topicName: t.topicName,
      correct: t.correct,
      total: t.total,
      score: t.score,
    };
  }

  return { scored, scoreRaw, scoreMax, scorePct, topicAgg, topicScores };
}

/**
 * Determine recent-trend label from a chronologically-sorted list of % scores.
 * Newest first. Pure.
 */
export function recentTrend(
  pcts: number[]
): "IMPROVING" | "FLAT" | "DECLINING" | undefined {
  if (pcts.length < 3) return undefined;
  const last = pcts[0];
  const first = pcts[pcts.length - 1];
  const delta = last - first;
  if (delta > 5) return "IMPROVING";
  if (delta < -5) return "DECLINING";
  return "FLAT";
}

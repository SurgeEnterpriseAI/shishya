// CAT-based adaptive mock assembly.
//
// When the student has enough response history for a stable θ estimate,
// this replaces the LLM-heuristic adaptive picker with measurement-driven
// selection: more questions to weaker subjects, each question chosen by
// Fisher information around the student's ability (with confidence-builder
// and stretch items blended in — see select.ts).
//
// Returns null when there isn't enough data yet — the caller falls back to
// the existing LLM path. Deterministic and DB-cheap (2 reads), so it also
// removes a Claude call from the adaptive hot path once students mature.

import type { PrismaClient } from "@prisma/client";
import type { GenerateMockOutput, QuestionRef, Difficulty } from "../ai/types";
import { selectAdaptiveSet, type CandidateItem } from "./select";
import { seedItemFromDifficulty, thetaToMastery } from "./irt";

/** Minimum recorded responses across subjects before CAT takes over. */
const MIN_RESPONSES = 20;

export interface CatMockArgs {
  userId: string;
  examId: string;
  examShortName: string;
  questionCount: number;
  durationMin?: number;
  /** Candidate pool, already filtered (validated, unseen, etc.) by the caller. */
  pool: QuestionRef[];
}

export async function tryCatAdaptiveMock(
  prisma: PrismaClient,
  args: CatMockArgs,
): Promise<GenerateMockOutput | null> {
  // ── 1. Ability — is there enough signal? ──────────────────────────────
  const abilities = await prisma.abilityState.findMany({
    where: { userId: args.userId, examId: args.examId },
  });
  const totalResponses = abilities.reduce((s, a) => s + a.attemptsCount, 0);
  if (abilities.length === 0 || totalResponses < MIN_RESPONSES) return null;

  // ── 2. Item parameters + subject mapping for the pool ─────────────────
  const topicIds = [...new Set(args.pool.map((q) => q.topicId))];
  const [topics, stats] = await Promise.all([
    prisma.topic.findMany({
      where: { id: { in: topicIds } },
      select: { id: true, subjectId: true },
    }),
    prisma.questionStat.findMany({
      where: { questionId: { in: args.pool.map((q) => q.id) } },
      select: { questionId: true, irtA: true, irtB: true },
    }),
  ]);
  const subjectByTopic = new Map(topics.map((t) => [t.id, t.subjectId]));
  const statByQuestion = new Map(stats.map((s) => [s.questionId, s]));
  const thetaBySubject = new Map(abilities.map((a) => [a.subjectId, a.theta]));

  // Candidates grouped by subject; calibrated params when we have them,
  // seeded from the difficulty label otherwise.
  const bySubject = new Map<string, CandidateItem[]>();
  const refById = new Map<string, QuestionRef>();
  for (const q of args.pool) {
    const subjectId = subjectByTopic.get(q.topicId);
    if (!subjectId) continue;
    const stat = statByQuestion.get(q.id);
    const seeded = seedItemFromDifficulty(q.difficulty);
    const item: CandidateItem = {
      questionId: q.id,
      a: stat?.irtA ?? seeded.a,
      b: stat?.irtB ?? seeded.b,
    };
    refById.set(q.id, q);
    const list = bySubject.get(subjectId) ?? [];
    list.push(item);
    bySubject.set(subjectId, list);
  }
  if (bySubject.size === 0) return null;

  // ── 3. Allocate count per subject — weaker subject gets more ──────────
  // Weight ∝ (1 − mastery): a subject at θ=−1 gets ~2.4× the questions of
  // one at θ=+1. Subjects with no θ yet get average weight.
  const subjects = [...bySubject.keys()];
  const weights = subjects.map((s) => {
    const theta = thetaBySubject.get(s);
    return theta == null ? 0.5 : 1 - thetaToMastery(theta);
  });
  const wSum = weights.reduce((a, b) => a + b, 0) || 1;

  const picked: QuestionRef[] = [];
  const allocated = new Map<string, number>();
  for (let i = 0; i < subjects.length; i++) {
    allocated.set(subjects[i], Math.round((weights[i] / wSum) * args.questionCount));
  }
  // Fix rounding drift on the weakest subject (first by weight).
  const drift = args.questionCount - [...allocated.values()].reduce((a, b) => a + b, 0);
  if (drift !== 0) {
    const weakest = subjects[weights.indexOf(Math.max(...weights))];
    allocated.set(weakest, Math.max(0, (allocated.get(weakest) ?? 0) + drift));
  }

  // ── 4. Select per subject at that subject's θ ─────────────────────────
  for (const subjectId of subjects) {
    const n = allocated.get(subjectId) ?? 0;
    if (n === 0) continue;
    const theta = thetaBySubject.get(subjectId) ?? 0;
    const chosen = selectAdaptiveSet(theta, bySubject.get(subjectId)!, n);
    for (const c of chosen) {
      const ref = refById.get(c.questionId);
      if (ref) picked.push(ref);
    }
  }

  // Top up across subjects if some bucket ran short of content.
  if (picked.length < args.questionCount) {
    const have = new Set(picked.map((p) => p.id));
    for (const q of args.pool) {
      if (picked.length >= args.questionCount) break;
      if (!have.has(q.id)) {
        picked.push(q);
        have.add(q.id);
      }
    }
  }
  if (picked.length < Math.min(5, args.questionCount)) return null;

  // ── 5. Shape the output ────────────────────────────────────────────────
  const final = picked.slice(0, args.questionCount);
  const topicMix: Record<string, number> = {};
  const difficultyMix: Record<Difficulty, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
  for (const r of final) {
    topicMix[r.topicCode] = (topicMix[r.topicCode] ?? 0) + 1;
    difficultyMix[r.difficulty] += 1;
  }
  const weakestSubjects = subjects
    .map((s, i) => ({ s, w: weights[i] }))
    .sort((a, b) => b.w - a.w)
    .slice(0, 2);
  void weakestSubjects;

  return {
    title: `Adaptive Mock — ${args.examShortName}`,
    rationale:
      "Built from your measured ability: most questions sit right at your current level (where you learn fastest), weighted toward your weaker subjects, with a few confidence-builders and stretch questions mixed in.",
    questionIds: final.map((r) => r.id),
    durationMin: args.durationMin ?? Math.max(10, Math.round(final.length * 1.2)),
    topicMix,
    difficultyMix,
  };
}

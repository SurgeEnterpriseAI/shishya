// Compute a "score boost" recommendation per (user, exam):
//   1. Identify the weak topics where the student has the most untapped
//      headroom relative to how much that topic counts in the exam.
//   2. Translate headroom into estimated extra marks if the student lifts
//      mastery to a target bar (0.85 by default).
//   3. Position the projected total on the exam's leaderboard so the UI can
//      surface a rank uplift ("+18 marks → rank #5 from #12").
//
// Used by the dashboard right-rail panel + the "Focus topics" section.

import { prisma } from "@/lib/db/prisma";

const TARGET_MASTERY = 0.85;     // the bar we tell students to clear per topic
const MIN_ATTEMPTS = 1;          // include topics with at least 1 attempt
const MAX_TOPICS = 3;            // how many topics to surface
const MIN_COHORT_FOR_RANK = 5;   // suppress rank if leaderboard is too small

export interface FocusTopic {
  topicId: string;
  topicCode: string;
  topicName: string;
  subjectName: string;
  currentMastery: number;          // 0..1
  attemptsCount: number;
  estimatedExtraMarks: number;     // raw marks gained at target mastery
  estimatedExtraPct: number;       // 0..100 — share of the exam's total marks
}

export interface ScoreBoost {
  exam: { id: string; code: string; shortName: string; totalMarks: number };
  latestScorePct: number | null;
  currentRank: number | null;
  totalCohort: number;
  focusTopics: FocusTopic[];
  combinedExtraMarks: number;
  combinedExtraPct: number;
  projectedScorePct: number | null;
  projectedRank: number | null;
}

/**
 * Returns null when there isn't enough data to make a useful suggestion
 * (no weak topics, no syllabus weights, etc.). The dashboard then simply
 * skips the panel rather than rendering an empty card.
 */
export async function computeScoreBoost(
  userId: string,
  examId: string,
): Promise<ScoreBoost | null> {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, code: true, shortName: true, totalMarks: true },
  });
  if (!exam) return null;

  // Pull every topic + its subject weight so we can compute each topic's
  // share of the exam total. Subject.weight × Topic.weight is the natural
  // dual axis — subjects carry overall exam weight, topics within a subject
  // get further sub-weighted.
  const subjects = await prisma.subject.findMany({
    where: { examId },
    select: {
      weight: true,
      topics: {
        select: {
          id: true,
          code: true,
          name: true,
          weight: true,
        },
      },
      name: true,
    },
  });

  let weightSum = 0;
  const topicMeta = new Map<
    string,
    { code: string; name: string; subjectName: string; rawWeight: number }
  >();
  for (const s of subjects) {
    for (const t of s.topics) {
      const w = (s.weight ?? 1) * (t.weight ?? 1);
      weightSum += w;
      topicMeta.set(t.id, {
        code: t.code,
        name: t.name,
        subjectName: s.name,
        rawWeight: w,
      });
    }
  }
  if (weightSum === 0 || topicMeta.size === 0) return null;

  // Pull the student's mastery for this exam and pick topics with the most
  // estimated extra marks. Negative or zero headroom topics are skipped.
  const weak = await prisma.weaknessMap.findMany({
    where: { userId, examId },
    select: {
      topicId: true,
      masteryScore: true,
      attemptsCount: true,
    },
  });

  const focus: FocusTopic[] = [];
  for (const w of weak) {
    if (w.attemptsCount < MIN_ATTEMPTS) continue;
    const meta = topicMeta.get(w.topicId);
    if (!meta) continue;
    const headroom = Math.max(0, TARGET_MASTERY - w.masteryScore);
    if (headroom === 0) continue;
    const share = meta.rawWeight / weightSum;
    const extraMarks = headroom * share * exam.totalMarks;
    const extraPct = (extraMarks / exam.totalMarks) * 100;
    focus.push({
      topicId: w.topicId,
      topicCode: meta.code,
      topicName: meta.name,
      subjectName: meta.subjectName,
      currentMastery: w.masteryScore,
      attemptsCount: w.attemptsCount,
      estimatedExtraMarks: extraMarks,
      estimatedExtraPct: extraPct,
    });
  }
  focus.sort((a, b) => b.estimatedExtraMarks - a.estimatedExtraMarks);
  const top = focus.slice(0, MAX_TOPICS);
  if (top.length === 0) return null;

  // Look up the student's best score on this exam and the cohort
  // distribution, so we can estimate rank uplift.
  const myBest = await prisma.attempt.findFirst({
    where: {
      userId,
      mock: { examId },
      status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
      scorePct: { not: null },
    },
    orderBy: { scorePct: "desc" },
    select: { scorePct: true, rank: true },
  });

  // Best-per-user scores for the cohort. We do this in SQL via
  // groupBy so it scales with usage; for now this exam may have small
  // counts, so we explicitly suppress rank-based copy when the cohort
  // is too thin to be meaningful.
  const bestPerUser = await prisma.attempt.groupBy({
    by: ["userId"],
    where: {
      mock: { examId },
      status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
      scorePct: { not: null },
    },
    _max: { scorePct: true },
  });
  const cohort: number[] = bestPerUser
    .map((b) => b._max.scorePct)
    .filter((v): v is number => typeof v === "number")
    .sort((a, b) => b - a);

  const totalCohort = cohort.length;
  const latestScorePct = myBest?.scorePct ?? null;

  const combinedExtraMarks = top.reduce((s, t) => s + t.estimatedExtraMarks, 0);
  const combinedExtraPct = (combinedExtraMarks / exam.totalMarks) * 100;

  const projectedScorePct =
    latestScorePct != null
      ? Math.min(100, latestScorePct + combinedExtraPct)
      : null;

  const rankFor = (pct: number): number => {
    // Rank = 1 + count of users strictly above pct. Caller decides if it's
    // worth showing based on totalCohort.
    let above = 0;
    for (const c of cohort) {
      if (c > pct) above += 1;
      else break;
    }
    return above + 1;
  };

  const showRank = totalCohort >= MIN_COHORT_FOR_RANK;
  const currentRank =
    showRank && latestScorePct != null ? rankFor(latestScorePct) : null;
  const projectedRank =
    showRank && projectedScorePct != null ? rankFor(projectedScorePct) : null;

  return {
    exam,
    latestScorePct,
    currentRank,
    totalCohort,
    focusTopics: top,
    combinedExtraMarks,
    combinedExtraPct,
    projectedScorePct,
    projectedRank,
  };
}

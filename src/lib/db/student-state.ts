// Builds the StudentState snapshot the AI services consume.
// Computed deterministically from DB rows — no LLM here.

import { prisma } from "./prisma";
import { recentTrend } from "../scoring";
import type { StudentState, TopicMastery } from "../ai/types";

const RECENT_LIMIT = 10;

export async function getStudentState(
  userId: string,
  examCode: string
): Promise<StudentState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      enrollments: {
        where: { exam: { code: examCode } },
        include: { exam: true },
      },
    },
  });
  if (!user) throw new Error(`User not found: ${userId}`);
  const enrollment = user.enrollments[0];
  if (!enrollment) throw new Error(`User not enrolled in ${examCode}`);

  // Pull weakness map for this exam
  const weaknessRows = await prisma.weaknessMap.findMany({
    where: { userId, examId: enrollment.examId },
    include: { topic: true },
    orderBy: { masteryScore: "asc" },
  });

  const masteries: TopicMastery[] = weaknessRows.map((w) => ({
    topicId: w.topicId,
    topicCode: w.topic.code,
    topicName: w.topic.name,
    masteryScore: w.masteryScore,
    attemptsCount: w.attemptsCount,
    correctCount: w.correctCount,
    avgTimeSec: w.avgTimeSec ?? undefined,
  }));

  const weaknesses = masteries.filter((m) => m.attemptsCount > 0).slice(0, 8);
  const strengths = [...masteries]
    .filter((m) => m.attemptsCount > 0)
    .sort((a, b) => b.masteryScore - a.masteryScore)
    .slice(0, 4);

  // Recent attempts on any mock for this exam
  const recent = await prisma.attempt.findMany({
    where: {
      userId,
      mock: { examId: enrollment.examId },
      status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
    },
    orderBy: { startedAt: "desc" },
    take: RECENT_LIMIT,
    select: { scorePct: true, startedAt: true },
  });

  const totalMocksTaken = recent.length;
  const lastMockScorePct = recent[0]?.scorePct ?? undefined;
  const bestMockScorePct =
    recent.length === 0
      ? undefined
      : Math.max(...recent.map((r) => r.scorePct ?? 0));

  const trend = recentTrend(recent.map((r) => r.scorePct ?? 0));

  return {
    userId,
    examCode: enrollment.exam.code,
    examName: enrollment.exam.name,
    preferredLang: user.preferredLang as StudentState["preferredLang"],
    enrolledAt: enrollment.createdAt.toISOString(),
    targetDate: enrollment.targetDate?.toISOString(),
    weaknesses,
    strengths,
    totalMocksTaken,
    lastMockScorePct: lastMockScorePct ?? undefined,
    bestMockScorePct,
    recentTrend: trend,
  };
}

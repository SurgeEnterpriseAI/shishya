// Adaptive Quiz Generator — invoked from the tutor when a student says
// "quiz me", "take a mock now", or similar.
//
// Produces TWO mocks back-to-back:
//   1. WARMUP — 10 questions on the student's weakest topic (or
//      heaviest syllabus topic if cold-start). Rule-based and instant.
//   2. FULL  — exam-pattern adaptive mock sized to the exam's real
//      totalQuestions. LLM-assisted selection (5-8s) so questions are
//      biased toward weak areas.
//
// Both are saved as real Mock rows so they show up in the student's
// dashboard / results history. generatedBy is set to
// "adaptive-tutor:warmup" or "adaptive-tutor:full" so we can later
// distinguish them from SME / cron mocks.

import { prisma } from "@/lib/db/prisma";
import { generateMock } from "./generator";
import { getStudentState } from "@/lib/db/student-state";
import { getSyllabusContext } from "@/lib/db/syllabus";
import type { QuestionRef } from "./types";

export interface AdaptiveQuizResult {
  warmupMockId: string;
  warmupTitle: string;
  warmupUrl: string;
  warmupQuestionCount: number;
  warmupDurationMin: number;
  fullMockId: string | null;
  fullMockTitle: string | null;
  fullMockUrl: string | null;
  fullMockQuestionCount: number | null;
  fullMockDurationMin: number | null;
  topicTargeted: string;
  topicTargetedCode: string;
  isColdStart: boolean;
  /** Hint for the AI on how to phrase the response. Not user-facing. */
  next_action: string;
}

/**
 * Build a warmup + full adaptive mock for the student. Idempotent at the
 * call site — the caller decides when to invoke. Always creates new Mock
 * rows so the student can replay any time.
 */
export async function createAdaptiveQuiz(
  userId: string,
  examCode: string,
  topicHint?: string,
): Promise<AdaptiveQuizResult> {
  // 1. Resolve exam + auto-enroll the student. Adaptive mock requests are
  //    a great moment to silently enrol someone who landed on the chat
  //    via a deep link without clicking "Enroll".
  const exam = await prisma.exam.findUnique({
    where: { code: examCode },
    select: { id: true, shortName: true, totalQuestions: true, durationMin: true },
  });
  if (!exam) throw new Error(`Exam ${examCode} not found`);

  await prisma.enrollment.upsert({
    where: { userId_examId: { userId, examId: exam.id } },
    update: {},
    create: { userId, examId: exam.id },
  });

  // 2. Resolve target topic.
  //    Priority: explicit hint > weakest topic with history > heaviest
  //    subject's first topic (cold-start fallback).
  const studentState = await getStudentState(userId, examCode);
  const syllabus = await getSyllabusContext(examCode);

  let targetTopicCode: string | null = null;
  let targetTopicName: string | null = null;
  let isColdStart = false;

  if (topicHint) {
    // Validate the hint exists in this exam's syllabus
    for (const s of syllabus.subjects) {
      for (const t of s.topics) {
        if (t.code === topicHint) {
          targetTopicCode = t.code;
          targetTopicName = t.name;
          break;
        }
      }
      if (targetTopicCode) break;
    }
  }

  if (!targetTopicCode) {
    // Weakness-based: pick the topic with lowest mastery + ≥1 attempt
    const weakest = studentState.weaknesses?.find((w) => w.attemptsCount > 0);
    if (weakest) {
      targetTopicCode = weakest.topicCode;
      targetTopicName = weakest.topicName;
    }
  }

  if (!targetTopicCode) {
    // Cold-start: pick heaviest subject's first topic
    isColdStart = true;
    const heaviest = [...syllabus.subjects].sort((a, b) => b.weight - a.weight)[0];
    const t = heaviest?.topics?.[0];
    if (!t) throw new Error("Exam has no topics seeded — cannot quiz.");
    targetTopicCode = t.code;
    targetTopicName = t.name;
  }

  // 3. WARMUP (10 Q on the target topic). Reuse the existing TOPIC
  //    generator — it's rule-based + instant.
  const warmupPool = await fetchTopicPool(exam.id, targetTopicCode!);
  if (warmupPool.length === 0) {
    // Topic has no validated Qs. Fall back to any topic in the same
    // subject. Better an off-target warmup than failing the request.
    const subject = syllabus.subjects.find((s) =>
      s.topics.some((t) => t.code === targetTopicCode),
    );
    if (subject) {
      for (const t of subject.topics) {
        if (t.code === targetTopicCode) continue;
        const alt = await fetchTopicPool(exam.id, t.code);
        if (alt.length > 0) {
          targetTopicCode = t.code;
          targetTopicName = t.name;
          warmupPool.push(...alt);
          break;
        }
      }
    }
  }
  if (warmupPool.length === 0) {
    throw new Error(
      `No validated questions seeded for ${exam.shortName} yet. The AI tutor can teach you the topic concept-by-concept instead — just ask.`,
    );
  }

  const warmupResult = await generateMock({
    studentState,
    request: {
      type: "TOPIC",
      topicCode: targetTopicCode!,
      questionCount: Math.min(10, warmupPool.length),
    },
    availableQuestions: warmupPool,
    syllabus,
  });

  const warmupMock = await prisma.mock.create({
    data: {
      userId,
      examId: exam.id,
      type: "TOPIC",
      title: `Warmup · ${targetTopicName ?? targetTopicCode} · ${exam.shortName}`,
      config: {
        rationale: warmupResult.rationale,
        topicMix: warmupResult.topicMix,
        difficultyMix: warmupResult.difficultyMix,
        durationMin: warmupResult.durationMin,
        requestType: "TOPIC",
        adaptiveTutor: { phase: "warmup", topicCode: targetTopicCode, isColdStart },
      },
      questionIds: warmupResult.questionIds,
      generatedBy: "adaptive-tutor:warmup",
      generationContext: { studentSnapshot: studentState as any, hintedTopic: topicHint ?? null },
    },
  });

  // 4. FULL adaptive mock sized to the real exam.
  //    Sized = exam.totalQuestions (cap 100 to keep gen time sane).
  //    For the pool we pull the broad weakness-friendly set.
  const fullPool = await fetchAdaptivePool(exam.id, studentState.weaknesses?.map((w) => w.topicId) ?? []);
  let fullMock: { id: string; title: string; questionCount: number; durationMin: number } | null = null;

  if (fullPool.length >= 20) {
    // We have enough seeded content to assemble a meaningful full mock.
    const desiredFull = Math.min(
      exam.totalQuestions || 100,
      100, // hard cap so the LLM has a reasonable token budget
      fullPool.length,
    );
    try {
      const fullResult = await generateMock({
        studentState,
        request: { type: "ADAPTIVE", questionCount: desiredFull, durationMin: exam.durationMin || undefined },
        availableQuestions: fullPool,
        syllabus,
      });
      const m = await prisma.mock.create({
        data: {
          userId,
          examId: exam.id,
          type: "ADAPTIVE",
          title: `Adaptive Mock · ${exam.shortName} (${fullResult.questionIds.length}Q)`,
          config: {
            rationale: fullResult.rationale,
            topicMix: fullResult.topicMix,
            difficultyMix: fullResult.difficultyMix,
            durationMin: fullResult.durationMin,
            requestType: "ADAPTIVE",
            adaptiveTutor: { phase: "full", isColdStart, pairWith: warmupMock.id },
          },
          questionIds: fullResult.questionIds,
          generatedBy: "adaptive-tutor:full",
          generationContext: { studentSnapshot: studentState as any },
        },
      });
      fullMock = {
        id: m.id,
        title: m.title,
        questionCount: fullResult.questionIds.length,
        durationMin: fullResult.durationMin,
      };
    } catch (err) {
      // Don't fail the warmup if the full mock generation errors —
      // the student still gets their warmup, and we surface "full mock
      // not ready yet" in the response.
      console.error("[adaptive-quiz] full mock generation failed", err);
    }
  }

  return {
    warmupMockId: warmupMock.id,
    warmupTitle: warmupMock.title,
    warmupUrl: `/mocks/${warmupMock.id}`,
    warmupQuestionCount: warmupResult.questionIds.length,
    warmupDurationMin: warmupResult.durationMin,
    fullMockId: fullMock?.id ?? null,
    fullMockTitle: fullMock?.title ?? null,
    fullMockUrl: fullMock ? `/mocks/${fullMock.id}` : null,
    fullMockQuestionCount: fullMock?.questionCount ?? null,
    fullMockDurationMin: fullMock?.durationMin ?? null,
    topicTargeted: targetTopicName ?? targetTopicCode!,
    topicTargetedCode: targetTopicCode!,
    isColdStart,
    next_action: fullMock
      ? `Tell the student: warmup of ${warmupResult.questionIds.length}Q on ${targetTopicName ?? targetTopicCode} is ready right now (link 1). The full ${fullMock.questionCount}Q adaptive mock is also ready — take it after the warmup (link 2). Both are tracked in their results history.`
      : `Tell the student: warmup of ${warmupResult.questionIds.length}Q on ${targetTopicName ?? targetTopicCode} is ready (link 1). The full adaptive mock couldn't be assembled (not enough seeded content for this exam yet) — they should start with the warmup and the system will generate the full one once they have a result to anchor on.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Pool fetchers — kept narrow so we don't blow the LLM context with
// thousands of question stubs.
// ─────────────────────────────────────────────────────────────────────────

async function fetchTopicPool(examId: string, topicCode: string): Promise<QuestionRef[]> {
  const topic = await prisma.topic.findFirst({
    where: { code: topicCode, subject: { examId } },
    include: { children: { select: { id: true } } },
  });
  if (!topic) return [];
  const topicIds = [topic.id, ...topic.children.map((c) => c.id)];
  const qs = await prisma.question.findMany({
    where: { examId, validated: true, topicId: { in: topicIds } },
    include: { topic: true },
    take: 50,
  });
  return qs.map(toRef);
}

async function fetchAdaptivePool(
  examId: string,
  weakTopicIds: string[],
): Promise<QuestionRef[]> {
  // Prefer questions tied to weak topics, then top up with the broader
  // validated pool. Keeps the LLM context small (target ~200 items).
  const weakFirst = weakTopicIds.length
    ? await prisma.question.findMany({
        where: { examId, validated: true, topicId: { in: weakTopicIds } },
        include: { topic: true },
        take: 120,
      })
    : [];
  const rest = await prisma.question.findMany({
    where: {
      examId,
      validated: true,
      ...(weakTopicIds.length ? { topicId: { notIn: weakTopicIds } } : {}),
    },
    include: { topic: true },
    take: 200 - weakFirst.length,
  });
  return [...weakFirst, ...rest].map(toRef);
}

function toRef(q: any): QuestionRef {
  return {
    id: q.id,
    topicId: q.topicId,
    topicCode: q.topic.code,
    difficulty: q.difficulty,
  };
}

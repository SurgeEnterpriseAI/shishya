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

  // 4. FULL adaptive mock — DEFERRED.
  //
  // Originally this also generated a 100-Q ADAPTIVE mock synchronously
  // via llmAdaptive (one Claude call to pick from a pool of 200). That
  // added 5-8s to every tool call, taking the visible "Thinking..." in
  // the chat past 15s when combined with the tutor's own response
  // generation. That's too slow for the moment a brand-new student
  // first asks "quiz me" — measured drop-offs at 20-30s.
  //
  // Behaviour now: return the warmup mock immediately. The full
  // adaptive mock can be generated lazily later (e.g. when the
  // student finishes the warmup) via a separate call. Cost: a
  // student wanting both has to ask twice; benefit: tool runs in
  // well under a second.
  const fullMock: { id: string; title: string; questionCount: number; durationMin: number } | null = null;

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
    next_action: `Tell the student: their ${warmupResult.questionIds.length}-question warmup on ${targetTopicName ?? targetTopicCode} is ready right now — give them a markdown link to ${`/mocks/${warmupMock.id}`} and tell them it'll take ~${warmupResult.durationMin} minutes. After they submit it they can come back and ask 'build me a full mock' — that's a separate request which we'll handle then. Keep your message SHORT: one line of context + the link + one line of encouragement. Do not list multiple options.`,
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

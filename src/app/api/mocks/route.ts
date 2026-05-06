// POST /api/mocks — create a new mock test for the current user.
// Body: { examCode, request: GenerateMockRequest } (matches src/lib/ai/types.ts)

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { generateMock } from "@/lib/ai";
import { getStudentState } from "@/lib/db/student-state";
import { getSyllabusContext } from "@/lib/db/syllabus";
import { bad, notFound, ok, serverError, unauth, parseBody } from "@/lib/http";
import type { GenerateMockRequest, QuestionRef } from "@/lib/ai/types";

const Body = z.object({
  examCode: z.string(),
  request: z.discriminatedUnion("type", [
    z.object({ type: z.literal("DIAGNOSTIC"), questionCount: z.number().int().min(5).max(50) }),
    z.object({ type: z.literal("ADAPTIVE"), questionCount: z.number().int().min(5).max(100), durationMin: z.number().int().optional() }),
    z.object({ type: z.literal("TOPIC"), topicCode: z.string(), questionCount: z.number().int().min(5).max(50), difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional() }),
    z.object({ type: z.literal("SUBJECT"), subjectCode: z.string(), questionCount: z.number().int().min(10).max(100) }),
    z.object({ type: z.literal("FULL") }),
    z.object({ type: z.literal("REVISION"), questionCount: z.number().int().min(5).max(50) }),
    z.object({ type: z.literal("USER_REQUEST"), instruction: z.string().min(3), questionCount: z.number().int().min(5).max(50) }),
  ]),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();
    const body = await parseBody(req, Body);

    const exam = await prisma.exam.findUnique({ where: { code: body.examCode } });
    if (!exam) return notFound("exam");

    // Build candidate question pool — only validated questions go to live mocks.
    const pool = await fetchCandidatePool(exam.id, session.user.id, body.request);
    if (pool.length === 0) {
      return bad("No questions available yet for this configuration. Try a different topic or wait for content to be seeded.");
    }

    const studentState = await getStudentStateOrInit(session.user.id, body.examCode);
    const syllabus = await getSyllabusContext(body.examCode);

    const result = await generateMock({
      studentState,
      request: body.request as GenerateMockRequest,
      availableQuestions: pool,
      syllabus,
    });

    if (result.questionIds.length === 0) {
      return bad("Could not assemble a mock from available questions.");
    }

    const mock = await prisma.mock.create({
      data: {
        userId: session.user.id,
        examId: exam.id,
        type: mockTypeFromRequest(body.request),
        title: result.title,
        config: {
          rationale: result.rationale,
          topicMix: result.topicMix,
          difficultyMix: result.difficultyMix,
          durationMin: result.durationMin,
          requestType: body.request.type,
        },
        questionIds: result.questionIds,
        generatedBy: body.request.type === "DIAGNOSTIC" ? "ai:diagnostic" : "ai",
        generationContext: { studentSnapshot: studentState as any },
      },
    });

    return ok({
      mock: {
        id: mock.id,
        title: mock.title,
        rationale: result.rationale,
        durationMin: result.durationMin,
        questionCount: result.questionIds.length,
        topicMix: result.topicMix,
        difficultyMix: result.difficultyMix,
      },
    });
  } catch (err: any) {
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

async function fetchCandidatePool(
  examId: string,
  userId: string,
  request: GenerateMockRequest
): Promise<QuestionRef[]> {
  const baseWhere = { examId, validated: true };

  if (request.type === "TOPIC") {
    // Scope topic lookup to this exam — different exams can share topic codes.
    const topic = await prisma.topic.findFirst({
      where: { code: request.topicCode, subject: { examId } },
      include: { children: true },
    });
    if (!topic) return [];
    const topicIds = [topic.id, ...topic.children.map((c) => c.id)];
    const qs = await prisma.question.findMany({
      where: {
        ...baseWhere,
        topicId: { in: topicIds },
        ...(request.difficulty && { difficulty: request.difficulty }),
      },
      include: { topic: true },
      take: 200,
    });
    return qs.map(toRef);
  }

  if (request.type === "REVISION") {
    // Past wrong questions for this user / exam
    const wrongAttempts = await prisma.attempt.findMany({
      where: { userId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, mock: { examId } },
      orderBy: { startedAt: "desc" },
      take: 20,
      select: { answers: true },
    });
    const wrongIds = new Set<string>();
    for (const a of wrongAttempts) {
      const ans = (a.answers as any[]) ?? [];
      for (const x of ans) if (x?.correct === false && x?.questionId) wrongIds.add(x.questionId);
    }
    if (wrongIds.size === 0) return [];
    const qs = await prisma.question.findMany({
      where: { ...baseWhere, id: { in: [...wrongIds] } },
      include: { topic: true },
    });
    return qs.map(toRef);
  }

  // DIAGNOSTIC / ADAPTIVE / SUBJECT / FULL / USER_REQUEST → broad pool
  const where: any = { ...baseWhere };
  if (request.type === "SUBJECT") {
    const subject = await prisma.subject.findFirst({
      where: { examId, code: request.subjectCode },
      include: { topics: true },
    });
    if (!subject) return [];
    where.topicId = { in: subject.topics.map((t) => t.id) };
  }
  const qs = await prisma.question.findMany({
    where,
    include: { topic: true },
    take: 500,
  });
  return qs.map(toRef);
}

function toRef(q: any): QuestionRef {
  return {
    id: q.id,
    topicId: q.topicId,
    topicCode: q.topic.code,
    difficulty: q.difficulty,
  };
}

function mockTypeFromRequest(r: GenerateMockRequest) {
  switch (r.type) {
    case "DIAGNOSTIC": return "DIAGNOSTIC" as const;
    case "ADAPTIVE": return "ADAPTIVE" as const;
    case "TOPIC": return "TOPIC" as const;
    case "SUBJECT": return "SUBJECT" as const;
    case "FULL": return "FULL" as const;
    case "REVISION": return "REVISION" as const;
    case "USER_REQUEST": return "USER_REQUEST" as const;
  }
}

async function getStudentStateOrInit(userId: string, examCode: string) {
  // Auto-enroll if not yet enrolled — frictionless first mock.
  const exam = await prisma.exam.findUnique({ where: { code: examCode } });
  if (!exam) throw new Error("Exam not found");
  await prisma.enrollment.upsert({
    where: { userId_examId: { userId, examId: exam.id } },
    update: {},
    create: { userId, examId: exam.id },
  });
  return await getStudentState(userId, examCode);
}

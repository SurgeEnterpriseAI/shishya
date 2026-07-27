// POST /api/attempts/[id]/reveal { questionId, chosen } →
//   { correct, answerKey, solution, topicName }
//
// Powers instant per-MCQ feedback in PRACTICE mocks (student-requested:
// "let me find my weak areas after every mcq"). Deliberately refused for
// exam-simulation modes:
//   • FULL / DIAGNOSTIC / CHALLENGE — exam realism & honest baselines
//   • live-test mocks — All-India rank integrity
// The answer key never ships with the question payload; it is revealed
// one question at a time, only after the student commits an answer, and
// the player locks the choice after reveal.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

const PRACTICE_TYPES = new Set(["TOPIC", "SUBJECT", "REVISION", "ADAPTIVE"]);

const Body = z.object({
  questionId: z.string().min(1),
  chosen: z.string().min(1).max(20),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "sign in" }, { status: 401 });
  const { id } = await params;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 });
  const { questionId, chosen } = parsed.data;

  const attempt = await prisma.attempt.findUnique({
    where: { id },
    select: {
      userId: true,
      status: true,
      mock: { select: { type: true, generatedBy: true, questionIds: true } },
    },
  });
  if (!attempt || attempt.userId !== session.user.id) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  if (attempt.status !== "IN_PROGRESS") {
    return Response.json({ error: "attempt finished" }, { status: 409 });
  }
  if (!PRACTICE_TYPES.has(attempt.mock.type) || attempt.mock.generatedBy === "live-test") {
    return Response.json({ error: "not a practice mock" }, { status: 403 });
  }
  if (!attempt.mock.questionIds.includes(questionId)) {
    return Response.json({ error: "question not in this mock" }, { status: 400 });
  }

  const q = await prisma.question.findUnique({
    where: { id: questionId },
    select: { answerKey: true, solution: true, topic: { select: { name: true } } },
  });
  if (!q) return Response.json({ error: "question not found" }, { status: 404 });

  const keys = q.answerKey.split(",").map((k) => k.trim().toUpperCase());
  const correct = keys.includes(chosen.trim().toUpperCase());

  return Response.json({
    correct,
    answerKey: q.answerKey,
    solution: q.solution.slice(0, 600),
    topicName: q.topic?.name ?? null,
  });
}

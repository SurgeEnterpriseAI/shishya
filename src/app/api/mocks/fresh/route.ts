// POST /api/mocks/fresh — Depth Lever 3: on-demand question generation.
//
// Body: { examCode: string, topicCode: string, count?: number }
//
// Generates a fresh batch of questions LIVE via Claude (no web search,
// ~5-8s), tuned to the user's level (HARD if they're a strong performer
// on this exam, else MEDIUM), persists them to the question pool, builds
// a playable mock, and returns its id. The client redirects to
// /mocks/[id].
//
// This makes depth effectively infinite + personalised — a serious
// aspirant who burns through the fixed pool can always summon more at
// the right difficulty. Generated questions are cached back into the
// pool (validated:false) so they help future users and the "Report
// question" + AI-key-dispute safety nets catch any errors.
//
// RATE LIMIT: max FRESH_LIMIT_PER_DAY on-demand generations per user per
// rolling 24h — bounds Claude cost. Returns 429 over the cap.

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { bad, notFound, ok, parseBody, serverError, unauth } from "@/lib/http";
import { generateFreshQuestions } from "@/lib/ai/on-demand-questions";

const Body = z.object({
  examCode: z.string(),
  topicCode: z.string(),
  count: z.number().int().min(5).max(15).optional(),
});

const FRESH_LIMIT_PER_DAY = 10;
const GENERATED_BY = "ai:on-demand";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();
    const userId = session.user.id;
    const body = await parseBody(req, Body);
    const count = body.count ?? 10;

    const exam = await prisma.exam.findUnique({
      where: { code: body.examCode },
      select: { id: true, name: true, shortName: true },
    });
    if (!exam) return notFound("exam");

    const topic = await prisma.topic.findFirst({
      where: { code: body.topicCode, subject: { examId: exam.id } },
      select: { id: true, name: true },
    });
    if (!topic) return notFound("topic");

    // ── Rate limit ────────────────────────────────────────────────
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const usedToday = await prisma.mock.count({
      where: { userId, generatedBy: GENERATED_BY, createdAt: { gte: since } },
    });
    if (usedToday >= FRESH_LIMIT_PER_DAY) {
      return Response.json(
        {
          error: `You've generated ${FRESH_LIMIT_PER_DAY} fresh sets today — come back tomorrow, or practise from the existing pool.`,
        },
        { status: 429 },
      );
    }

    // ── Difficulty from skill ─────────────────────────────────────
    const recent = await prisma.attempt.findMany({
      where: {
        userId,
        mock: { examId: exam.id },
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
        scorePct: { not: null },
      },
      orderBy: { finishedAt: "desc" },
      take: 2,
      select: { scorePct: true },
    });
    const strong =
      recent.length >= 2 &&
      recent.reduce((s, a) => s + (a.scorePct ?? 0), 0) / recent.length > 70;
    const difficulty: "MEDIUM" | "HARD" = strong ? "HARD" : "MEDIUM";

    // ── Generate ──────────────────────────────────────────────────
    const fresh = await generateFreshQuestions({
      examShortName: exam.shortName,
      examName: exam.name,
      topicName: topic.name,
      difficulty,
      count,
    });
    if (fresh.length === 0) {
      return bad("Couldn't generate fresh questions right now. Try again in a moment.");
    }

    // ── Persist questions, then build the mock ────────────────────
    const created = await prisma.$transaction(
      fresh.map((q) =>
        prisma.question.create({
          data: {
            examId: exam.id,
            topicId: topic.id,
            type: "MCQ",
            source: "AI_GENERATED",
            validated: false,
            body: q.body,
            options: [
              { key: "A", text: q.options.A },
              { key: "B", text: q.options.B },
              { key: "C", text: q.options.C },
              { key: "D", text: q.options.D },
            ],
            answerKey: q.answerKey,
            solution: q.solution,
            difficulty: q.difficulty,
            language: "EN",
          },
          select: { id: true },
        }),
      ),
    );

    const mock = await prisma.mock.create({
      data: {
        userId,
        examId: exam.id,
        type: "CHALLENGE",
        title: `Fresh ${difficulty === "HARD" ? "challenge" : "practice"} — ${topic.name}`,
        config: {
          rationale: `On-demand ${difficulty.toLowerCase()} set on ${topic.name}, generated for your level.`,
          questionCount: created.length,
          durationMin: Math.max(10, Math.round(created.length * 1.5)),
          requestType: "ON_DEMAND",
          topicCode: body.topicCode,
          difficulty,
        },
        questionIds: created.map((c) => c.id),
        generatedBy: GENERATED_BY,
      },
    });

    return ok({
      mock: {
        id: mock.id,
        title: mock.title,
        questionCount: created.length,
        difficulty,
        remainingToday: FRESH_LIMIT_PER_DAY - usedToday - 1,
      },
    });
  } catch (err: any) {
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

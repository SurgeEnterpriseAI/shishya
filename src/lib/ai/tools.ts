// Tools that the Shishya tutor can call mid-conversation.
//
// Why tools at all?
//   The tutor has a CACHED system prompt with the full syllabus + a
//   DYNAMIC block with the student's weakness map. That works for one-shot
//   questions but breaks down when the student says "what about my last
//   attempt?" or "give me 3 practice questions on time-and-work" — we'd
//   need to know in advance to fetch that data. Tools let Claude reach
//   into the database on demand for exactly the data it needs.
//
// All executors are scoped to the calling user — they never accept a
// userId from the model. The user's identity is bound at executor-build
// time, so the model can't access another user's data even if confused.

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db/prisma";
import { createAdaptiveQuiz } from "./adaptive-quiz";

export interface ToolContext {
  userId: string;
  examCode: string;
}

export const tutorTools: Anthropic.Messages.Tool[] = [
  {
    name: "get_my_mastery",
    description:
      "Get the current student's mastery scores for each topic in the current exam. Returns the topics with the lowest mastery first (the student's weakest topics). Use this when the student asks about their weaknesses, what to study next, or what they should focus on.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max number of topics to return. Defaults to 8.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_recent_attempts",
    description:
      "Get the student's most recent submitted mock attempts for the current exam, including score percentage, topic-wise breakdown, and date. Use this when the student asks about their last attempt, recent scores, progress trend, or which test they took most recently.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max number of attempts to return. Defaults to 3.",
        },
      },
      required: [],
    },
  },
  {
    name: "find_questions_on_topic",
    description:
      "Find 1-3 validated practice questions to walk through IN THE CHAT for teaching purposes — e.g. 'show me an example of a percentage word problem' or 'illustrate this concept with a question'. Returned questions include body, options, and correct answer, which you discuss conversationally. Do NOT call this when the student wants to actually take a timed mock — for that, use start_adaptive_quiz instead. Never recite the answer to the student before they attempt.",
    input_schema: {
      type: "object",
      properties: {
        topic_code: {
          type: "string",
          description: "Topic code as it appears in the syllabus (e.g. 'quant.percentage', 'reason.blood_relations'). Must be one of the topic codes in the exam syllabus block.",
        },
        difficulty: {
          type: "string",
          enum: ["EASY", "MEDIUM", "HARD"],
          description: "Optional difficulty filter.",
        },
        limit: {
          type: "number",
          description: "Max questions to return. Defaults to 3, max 5.",
        },
      },
      required: ["topic_code"],
    },
  },
  {
    name: "get_attempt_mistakes",
    description:
      "Get the questions the student got wrong on a specific attempt. Use this when the student wants to review what they got wrong on a particular mock — for example after the system suggests 'review your last attempt'.",
    input_schema: {
      type: "object",
      properties: {
        attempt_id: {
          type: "string",
          description: "Attempt id, usually obtained from get_recent_attempts.",
        },
      },
      required: ["attempt_id"],
    },
  },
  {
    name: "start_adaptive_quiz",
    description:
      "Generate an instant adaptive quiz the student can take RIGHT NOW. Call this whenever the student says any of: 'quiz me', 'test me', 'take a mock now', 'practice me', 'give me questions to solve', 'I want to take a mock', 'let me try some questions'. Creates two mocks back-to-back: (1) a 10-question warmup on their weakest topic that they start immediately, (2) a full-length exam-pattern adaptive mock targeted at their weak areas that's ready by the time they finish the warmup. Both are saved to their results history. Do not call this if the student is mid-conversation about a specific concept and just wants explanation — only call when they actively want to be tested.",
    input_schema: {
      type: "object",
      properties: {
        topic_hint: {
          type: "string",
          description: "Optional: the topic code the student wants focused on (e.g. 'quant.percentage'). Omit to let the system pick their weakest topic automatically.",
        },
      },
      required: [],
    },
  },
  {
    name: "predict_rank",
    description:
      "Predict what real-exam rank + likely outcome (colleges / posts) a student would get if they scored a given percentage. Call this when the student asks 'what rank can I get with X%', 'will this score get me into [college]', 'is my current score enough', or any question about outcomes / colleges / cut-offs. Returns the band that matches the score and the full ladder of bands so you can also tell the student how many more marks they need to climb to the next tier.",
    input_schema: {
      type: "object",
      properties: {
        score_pct: {
          type: "number",
          description: "The percentage score (0-100) to predict for. Use the student's most recent mock score if not specified.",
        },
      },
      required: ["score_pct"],
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Executors
// ─────────────────────────────────────────────────────────────────────────

export async function executeTool(
  ctx: ToolContext,
  name: string,
  input: any
): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  try {
    switch (name) {
      case "get_my_mastery":
        return { ok: true, data: await getMyMastery(ctx, input?.limit ?? 8) };
      case "get_recent_attempts":
        return { ok: true, data: await getRecentAttempts(ctx, input?.limit ?? 3) };
      case "find_questions_on_topic":
        return {
          ok: true,
          data: await findQuestionsOnTopic(
            ctx,
            String(input?.topic_code ?? ""),
            input?.difficulty,
            Math.min(5, Math.max(1, Number(input?.limit ?? 3)))
          ),
        };
      case "get_attempt_mistakes":
        return { ok: true, data: await getAttemptMistakes(ctx, String(input?.attempt_id ?? "")) };
      case "predict_rank":
        return { ok: true, data: await predictRank(ctx, Number(input?.score_pct ?? 0)) };
      case "start_adaptive_quiz":
        return {
          ok: true,
          data: await createAdaptiveQuiz(
            ctx.userId,
            ctx.examCode,
            typeof input?.topic_hint === "string" ? input.topic_hint : undefined,
          ),
        };
      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err).slice(0, 300) };
  }
}

async function getMyMastery(ctx: ToolContext, limit: number) {
  const exam = await prisma.exam.findUnique({ where: { code: ctx.examCode }, select: { id: true } });
  if (!exam) return { topics: [] as any[], message: "Exam not found." };
  const rows = await prisma.weaknessMap.findMany({
    where: { userId: ctx.userId, examId: exam.id },
    include: { topic: { select: { code: true, name: true } } },
    orderBy: { masteryScore: "asc" },
    take: Math.min(20, Math.max(1, limit)),
  });
  if (rows.length === 0) {
    return {
      topics: [],
      message:
        "No mastery data yet — student hasn't completed any attempts on this exam. Suggest taking a diagnostic mock first.",
    };
  }
  return {
    topics: rows.map((r) => ({
      topic_code: r.topic.code,
      topic_name: r.topic.name,
      mastery_pct: Math.round(r.masteryScore * 100),
      attempts: r.attemptsCount,
      correct: r.correctCount,
    })),
  };
}

async function getRecentAttempts(ctx: ToolContext, limit: number) {
  const exam = await prisma.exam.findUnique({ where: { code: ctx.examCode }, select: { id: true } });
  if (!exam) return { attempts: [] as any[] };
  const rows = await prisma.attempt.findMany({
    where: {
      userId: ctx.userId,
      mock: { examId: exam.id },
      status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
    },
    include: { mock: { select: { title: true, type: true } } },
    orderBy: { startedAt: "desc" },
    take: Math.min(10, Math.max(1, limit)),
  });
  return {
    attempts: rows.map((a) => ({
      attempt_id: a.id,
      mock_title: a.mock.title,
      mock_type: a.mock.type,
      started_at: a.startedAt.toISOString(),
      duration_sec: a.durationSec,
      score_pct: a.scorePct,
      score_raw: a.scoreRaw,
      score_max: a.scoreMax,
      topic_scores: a.topicScores,
      rank: a.rank,
      percentile: a.percentile,
    })),
  };
}

async function findQuestionsOnTopic(
  ctx: ToolContext,
  topicCode: string,
  difficulty: string | undefined,
  limit: number
) {
  const exam = await prisma.exam.findUnique({ where: { code: ctx.examCode }, select: { id: true } });
  if (!exam) return { questions: [] as any[], message: "Exam not found." };

  const topic = await prisma.topic.findFirst({
    where: { code: topicCode, subject: { examId: exam.id } },
    include: { children: { select: { id: true } } },
  });
  if (!topic) {
    return {
      questions: [],
      message: `No topic with code '${topicCode}' in this exam. Check the syllabus block for valid codes.`,
    };
  }
  const topicIds = [topic.id, ...topic.children.map((c) => c.id)];

  const where: any = { examId: exam.id, validated: true, topicId: { in: topicIds } };
  if (difficulty && ["EASY", "MEDIUM", "HARD"].includes(difficulty)) {
    where.difficulty = difficulty;
  }

  const qs = await prisma.question.findMany({
    where,
    take: limit,
    orderBy: { id: "asc" },
    select: {
      id: true,
      body: true,
      options: true,
      answerKey: true,
      solution: true,
      difficulty: true,
      topic: { select: { code: true, name: true } },
    },
  });
  if (qs.length === 0) {
    return {
      questions: [],
      message: `No validated questions on '${topicCode}' yet. Suggest a different topic, or offer to walk through the concept conceptually.`,
    };
  }
  return {
    questions: qs.map((q) => ({
      id: q.id,
      topic_code: q.topic.code,
      topic_name: q.topic.name,
      difficulty: q.difficulty,
      body: q.body,
      options: q.options,
      answer_key: q.answerKey,
      solution: q.solution,
    })),
  };
}

async function getAttemptMistakes(ctx: ToolContext, attemptId: string) {
  if (!attemptId) return { mistakes: [] as any[], message: "attempt_id required." };
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId: ctx.userId },
    select: { id: true, answers: true, mockId: true },
  });
  if (!attempt) return { mistakes: [], message: "Attempt not found or not owned by user." };

  const ans = (attempt.answers as any[]) ?? [];
  const wrong = ans.filter((a) => a?.correct === false && a?.questionId);
  if (wrong.length === 0) return { mistakes: [], message: "No wrong answers on this attempt." };

  const qs = await prisma.question.findMany({
    where: { id: { in: wrong.map((a) => a.questionId) } },
    select: {
      id: true,
      body: true,
      options: true,
      answerKey: true,
      solution: true,
      topic: { select: { code: true, name: true } },
    },
  });
  const byId = new Map(qs.map((q) => [q.id, q]));
  return {
    mistakes: wrong
      .map((a) => {
        const q = byId.get(a.questionId);
        if (!q) return null;
        return {
          question_id: q.id,
          topic_code: q.topic.code,
          topic_name: q.topic.name,
          body: q.body,
          options: q.options,
          chosen: a.chosen ?? null,
          correct_answer: q.answerKey,
          solution: q.solution,
        };
      })
      .filter((x) => x !== null),
  };
}

async function predictRank(ctx: ToolContext, scorePct: number) {
  const exam = await prisma.exam.findUnique({
    where: { code: ctx.examCode },
    select: { id: true, shortName: true },
  });
  if (!exam) return { message: "Exam not found." };

  const bands = await prisma.examRankBand.findMany({
    where: { examId: exam.id },
    orderBy: { orderIdx: "asc" },
    select: {
      scorePctMin: true,
      scorePctMax: true,
      rankMin: true,
      rankMax: true,
      label: true,
      outcomes: true,
    },
  });
  if (bands.length === 0) {
    return {
      message:
        "Rank prediction data hasn't been seeded for this exam yet. The daily refresh cron will populate it within a few days.",
    };
  }

  const clamped = Math.max(0, Math.min(100, scorePct));
  let match = bands.find((b) => clamped >= b.scorePctMin - 1e-9 && clamped <= b.scorePctMax + 1e-9);
  if (!match) {
    match = bands
      .slice()
      .sort((a, b) => {
        const da = Math.min(Math.abs(clamped - a.scorePctMin), Math.abs(clamped - a.scorePctMax));
        const db = Math.min(Math.abs(clamped - b.scorePctMin), Math.abs(clamped - b.scorePctMax));
        return da - db;
      })[0];
  }

  return {
    exam: exam.shortName,
    queried_score_pct: clamped,
    matched_band: {
      label: match!.label,
      score_pct_min: match!.scorePctMin,
      score_pct_max: match!.scorePctMax,
      rank_min: match!.rankMin,
      rank_max: match!.rankMax,
      outcomes: match!.outcomes,
    },
    all_bands: bands.map((b) => ({
      label: b.label,
      score_pct_min: b.scorePctMin,
      score_pct_max: b.scorePctMax,
      rank_min: b.rankMin,
      rank_max: b.rankMax,
    })),
    note:
      "Use this data to tell the student where their score lands AND what they'd need to climb. AI-curated; mention that as a caveat.",
  };
}

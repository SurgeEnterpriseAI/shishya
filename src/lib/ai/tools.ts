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
import { SCHOLARSHIPS, scholarshipsForExam, type Scholarship } from "@/data/scholarships";

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
      "Generate an instant 10-question warmup quiz on the student's weakest topic. Call this whenever the student says any of: 'quiz me', 'test me', 'take a mock now', 'practice me', 'give me questions to solve', 'I want to take a mock', 'let me try some questions'. Creates ONE mock (a 10-question warmup) and saves it to their results history. (A full-length adaptive mock is NOT created here — if the student asks for one after the warmup, call the tool again or guide them to /exams/[code].) Do not call this if the student is mid-conversation about a specific concept and just wants explanation. CRITICAL: When this tool returns, output ONLY the `message_to_user` field verbatim as your entire response — do not add a preface, do not list extra options, do not invent claims about additional mocks. The message_to_user already contains the correct link and framing.",
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
    name: "find_scholarships",
    description:
      "Find Indian scholarships the student can apply for. Call this when the student asks about scholarships, financial aid, fee waivers, or 'how can I afford college'. Returns matching central/state/private scholarships with eligibility, amount, and apply link. Filter by category (SC/ST/OBC/EWS/MIN/GEN), gender, state, or level if mentioned. Always tell the student that the application is FREE on the official portal — never imply they need to pay anyone.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["GEN", "OBC", "SC", "ST", "EWS", "MIN"],
          description: "Student's social category if mentioned. Omit if not specified.",
        },
        gender: {
          type: "string",
          enum: ["F", "M"],
          description: "F to surface girls-only scholarships. Omit otherwise.",
        },
        state: {
          type: "string",
          description: "Two-letter Indian state code (e.g. 'MH', 'TN', 'KA') if the student mentioned their home state.",
        },
        level: {
          type: "string",
          enum: ["CLASS_9_10", "CLASS_11_12", "DIPLOMA", "UG", "PG", "PHD"],
          description: "Student's current education level.",
        },
        max_results: {
          type: "number",
          description: "Max scholarships to return. Defaults to 6.",
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
      case "find_scholarships":
        return { ok: true, data: findScholarships(ctx, input) };
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

/**
 * Filter the static scholarships catalogue for the tutor. Combines:
 *   - exam-specific matches (using scholarshipsForExam helper)
 *   - explicit filter args from the AI (category, gender, state, level)
 * The tutor uses the result to nudge the student toward schemes they
 * actually qualify for. Never falls through to "no results" — we always
 * return at least the broadest umbrella schemes (NSP / Reliance / etc).
 */
function findScholarships(ctx: ToolContext, input: any) {
  const wantCategory = input?.category as string | undefined;
  const wantGender = input?.gender as string | undefined;
  const wantState = input?.state as string | undefined;
  const wantLevel = input?.level as string | undefined;
  const maxResults = Math.min(12, Math.max(3, Number(input?.max_results ?? 6)));

  // Exam-aware base list. Falls back to all scholarships if examCode
  // doesn't map to one (e.g. tutor running in general mode).
  let pool: Scholarship[] = ctx.examCode
    ? scholarshipsForExam(ctx.examCode, "")
    : [];
  if (pool.length === 0) pool = [...SCHOLARSHIPS];

  // Apply filters. A scholarship with no restriction in a dimension
  // is considered "open to anyone" in that dimension — passes the filter.
  let filtered = pool.filter((s) => {
    if (wantState && s.state !== null && s.state !== wantState) return false;
    if (wantLevel && !s.levels.includes(wantLevel as any)) return false;
    if (wantCategory && s.eligibility.categories && !s.eligibility.categories.includes(wantCategory as any)) {
      return false;
    }
    if (wantGender && s.eligibility.gender && s.eligibility.gender !== wantGender) return false;
    return true;
  });

  // If filters were too aggressive, broaden to the full set + tag that
  // we relaxed so the tutor can explain it.
  let relaxed = false;
  if (filtered.length === 0) {
    relaxed = true;
    filtered = [...SCHOLARSHIPS].filter((s) => {
      if (wantGender && s.eligibility.gender && s.eligibility.gender !== wantGender) return false;
      if (wantCategory && s.eligibility.categories && !s.eligibility.categories.includes(wantCategory as any)) {
        return false;
      }
      return true;
    });
  }

  const top = filtered.slice(0, maxResults);
  return {
    scholarships: top.map((s) => ({
      id: s.id,
      name: s.name,
      awarding_body: s.awardingBody,
      type: s.type,
      amount: s.amount,
      eligibility: s.eligibility,
      apply_url: s.applyUrl,
      deadline: s.deadline,
      levels: s.levels,
      description: s.description,
    })),
    note: relaxed
      ? "Filters were too narrow — relaxed to show the broadest set of options the student qualifies for. Tell the student to also check /scholarships for the full catalogue and filter by state."
      : "These are pre-filtered to the student's exam + filters. Tell the student application is FREE on the official portal. For more options, point them to /scholarships.",
    catalogue_url: "/scholarships",
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

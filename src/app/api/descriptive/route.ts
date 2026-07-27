// POST /api/descriptive — AI evaluation of a descriptive answer.
// Body: { taskType: essay|letter|precis|upsc-answer, prompt, answer }
// Returns { score, maxScore, verdict, strengths, improvements,
//           grammarIssues, modelOutline, remainingToday }.
//
// Signed-in only, 3 evaluations per IST day per user (token cost
// control). What Oliveboard sells as human evaluation, we do free with
// Claude — instantly.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { callClaude, cachedSystem, parseJson, MODEL } from "@/lib/ai/client";

const Body = z.object({
  taskType: z.enum(["essay", "letter", "precis", "upsc-answer"]),
  prompt: z.string().min(5).max(2000),
  answer: z.string().min(40).max(12000),
});

const DAILY_LIMIT = 3;

const RUBRICS: Record<string, string> = {
  essay:
    "Rubric (total 25): Content & relevance to the topic /10, Structure & coherence (intro-body-conclusion, paragraphing) /5, Language & grammar /7, Word discipline & presentation /3. Standard: SSC CHSL/CGL descriptive paper & bank PO essay.",
  letter:
    "Rubric (total 25): Format (address, date, salutation, subject, closing as per formal/official letter convention) /5, Content & coverage of purpose /10, Language, tone & grammar /10. Standard: SSC CHSL descriptive & bank PO letter writing.",
  precis:
    "Rubric (total 25): Compression & fidelity (covers all essential points, roughly one-third length, no new ideas) /10, Clarity & flow /10, Own words & grammar /5. Standard: descriptive paper précis writing.",
  "upsc-answer":
    "Rubric (total 25): Structure (clear intro, directive-compliant body, conclusion) /5, Content depth, facts & examples /10, Analysis & multi-dimensionality /5, Presentation & word discipline /5. Standard: UPSC Mains GS answer (150-250 words).",
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "sign in" }, { status: 401 });
  const userId = session.user.id;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 });
  const { taskType, prompt, answer } = parsed.data;

  // IST-day rate limit.
  const istDayStart = new Date(
    Math.floor((Date.now() + 5.5 * 3600_000) / 86_400_000) * 86_400_000 - 5.5 * 3600_000,
  );
  const used = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*) n FROM "DescriptiveAttempt"
    WHERE "userId" = ${userId} AND "createdAt" >= ${istDayStart}`;
  const usedN = Number(used[0]?.n ?? 0);
  if (usedN >= DAILY_LIMIT) {
    return Response.json(
      { error: `Daily limit reached — ${DAILY_LIMIT} free evaluations per day. Come back tomorrow; your writing muscle needs the rest anyway.` },
      { status: 429 },
    );
  }

  const wordCount = answer.trim().split(/\s+/).length;

  const res = await callClaude({
    system: cachedSystem(
      `You are Shishya's descriptive-writing evaluator for Indian government exams (SSC descriptive paper, bank PO essay/letter, UPSC Mains). You evaluate exactly like a fair, experienced examiner: strict but constructive, marks justified by the rubric, feedback specific to THIS answer (quote the student's own phrases when pointing at issues). Students may write in English or Hindi — evaluate in the language they wrote in, but keep JSON keys in English.
Respond with ONLY a JSON object:
{
  "score": number (0-25, one decimal allowed),
  "verdict": "one honest sentence an examiner would write at the top",
  "strengths": ["2-4 specific strengths"],
  "improvements": ["3-5 specific, actionable improvements, most important first"],
  "grammarIssues": ["up to 5 actual errors quoted from the answer with the correction, or [] if clean"],
  "modelOutline": "a 4-6 line outline of how a top-scoring answer to this prompt would be structured"
}`,
    ),
    messages: [
      {
        role: "user",
        content: `${RUBRICS[taskType]}\n\nTask prompt given to the student:\n${prompt}\n\nStudent's answer (${wordCount} words):\n${answer}`,
      },
    ],
    maxTokens: 1600,
    model: MODEL,
  });

  const text = res.response.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");
  let evaluation: {
    score: number;
    verdict: string;
    strengths: string[];
    improvements: string[];
    grammarIssues: string[];
    modelOutline: string;
  };
  try {
    evaluation = parseJson(text);
  } catch {
    return Response.json(
      { error: "Evaluation glitched — please submit again." },
      { status: 502 },
    );
  }
  const score = Math.max(0, Math.min(25, Number(evaluation.score) || 0));

  await prisma.$executeRaw`
    INSERT INTO "DescriptiveAttempt"
      (id, "userId", "taskType", prompt, answer, "wordCount", score, evaluation, "createdAt")
    VALUES
      (gen_random_uuid()::text, ${userId}, ${taskType}, ${prompt}, ${answer}, ${wordCount},
       ${score}, ${JSON.stringify(evaluation)}::jsonb, NOW())`;

  return Response.json({
    ...evaluation,
    score,
    maxScore: 25,
    remainingToday: DAILY_LIMIT - usedN - 1,
  });
}

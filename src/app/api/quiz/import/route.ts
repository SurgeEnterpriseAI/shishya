// POST /api/quiz/import — carry the guest quiz result into the signed-in
// account's weak topics (30 Sep 2026; rules and why in src/lib/quiz-carry.ts).
//
// Body: { examCode, questionIds[], choices[], at } — the stash the guest quiz
// left in this browser (src/components/AnonQuizPlayer.tsx), sent once by
// src/components/AnonQuizRecall.tsx on the first signed-in page.
//   401 — no sign-in: nothing is read or stored.
//   400 — malformed; 410 — older than 7 days; 404 — not a real, active exam
//         (a school container never is: realExamKey).
//   200 { ok: true, graded, topics } — re-graded against the exam's own
//         checked, not withdrawn MCQs (the client's score is never used) and
//         written to WeaknessMap, once per account and stash ({ already: true }
//         on a repeat). Never an Attempt: no counter, streak or rank moves.
//   200 { ok: true, graded: 0, saved: false, topics: [] } — none of the
//         stash's questions is still gradable: nothing written.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { realExamKey } from "@/lib/db/exam-scope";
import { applyQuizCarry } from "@/lib/db/quiz-carry";
import { WITHDRAWN_TAG } from "@/lib/question-withdrawn";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { QUIZ_CARRY_MAX_QUESTIONS, checkCarryBody, gradeCarry, missedTopicNames } from "@/lib/quiz-carry";

const Body = z.object({
  examCode: z.string().min(2).max(64),
  questionIds: z.array(z.string().max(64)).min(1).max(QUIZ_CARRY_MAX_QUESTIONS),
  choices: z.array(z.string().max(4)).min(1).max(QUIZ_CARRY_MAX_QUESTIONS),
  at: z.number().finite(),
});

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "private, no-store" } });

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  if (!userId) return json({ error: "sign-in" }, 401);

  const rl = await checkRateLimit("quizCarry", userId);
  if (!rl.ok) return rateLimited(rl);

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return json({ error: "bad body" }, 400);
  }
  const now = new Date();
  const check = checkCarryBody(body, now.getTime());
  if (check === "shape") return json({ error: "bad body" }, 400);
  if (check === "stale") return json({ error: "stale" }, 410);

  const exam = await prisma.exam.findUnique({
    where: realExamKey({ code: body.examCode }),
    select: { id: true, active: true },
  });
  if (!exam || !exam.active) return json({ error: "exam not found" }, 404);

  // The exam's own checked questions only; the stored key is the grade.
  // 30 Sep 2026 (review): the same pool the guest quiz serves
  // (src/lib/anon-quiz.ts) — checked MCQs, never a withdrawn one (tag
  // "rejected", usually a wrong or disputed key), so a question pulled after
  // the quiz is never graded against its stored key nor named as a weak topic.
  const rows = await prisma.question.findMany({
    where: {
      id: { in: [...new Set(body.questionIds)] },
      examId: exam.id,
      validated: true,
      type: "MCQ",
      NOT: { tags: { has: WITHDRAWN_TAG } },
    },
    select: { id: true, answerKey: true, topicId: true, topic: { select: { name: true } } },
  });
  const graded = gradeCarry(
    body,
    rows.map((q) => ({ id: q.id, answerKey: q.answerKey, topicId: q.topicId, topicName: q.topic?.name ?? "" })),
  );
  // Nothing left to grade (every question withdrawn or gone): nothing is
  // written, and `saved: false` tells the recall so — it must never say
  // "Saved to your Shishya" for a carry that stored nothing (review, 30 Sep).
  if (graded.graded === 0) return json({ ok: true, graded: 0, saved: false, topics: [] });

  const result = await applyQuizCarry(userId, exam.id, body, graded, now);
  return json({
    ok: true,
    graded: graded.graded,
    topics: missedTopicNames(graded.topics),
    ...(result.status === "already" ? { already: true } : {}),
  });
}

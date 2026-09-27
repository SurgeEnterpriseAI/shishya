// POST /api/guest-paper/grade — grade a whole paper for a guest (27 Sep 2026).
//
// Content first (src/lib/guest-paper.ts): a guest takes a whole shared mock
// with no sign-in; this route grades it. It re-reads the served paper
// (loadGuestPaper — the page's own read), grades it with the same pure grader
// a signed-in submit uses (gradeSubmission → scoreAttempt), and only now
// returns the answer keys and solutions. It WRITES NOTHING: no Attempt, no
// Mock, no weakness row, no log. Bots get 403; a guest gets 60 grades an
// hour per IP. Live tests and a user's own mocks are refused (not_available).
//
// Body: { mockId, answers: [{ questionId, chosen, timeSec, marked }] (≤500) }
// 200 → GuestGradeResult (src/lib/guest-paper.ts)

import { z } from "zod";
import { NextResponse } from "next/server";
import { SubmitAnswerSchema, gradeSubmission } from "@/lib/attempts-submit";
import { classifyClient } from "@/lib/client-class";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { loadGuestPaper } from "@/lib/guest-paper-db";
import { weakestFirst, type GuestGradeResult } from "@/lib/guest-paper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  mockId: z.string().min(8).max(64),
  answers: z.array(SubmitAnswerSchema).max(500),
});

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "cache-control": "no-store" } });

export async function POST(req: Request) {
  if (classifyClient(req.headers.get("user-agent")) === "bot") return json({ error: "bot" }, 403);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const rl = await checkRateLimit("guestPaper", ip);
  if (!rl.ok) return rateLimited(rl);

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  try {
    const load = await loadGuestPaper(body.mockId);
    if (!load.ok) return json({ error: load.reason }, load.reason === "not_found" ? 404 : load.reason === "too_short" ? 409 : 403);
    const { paper } = load;
    const questionIds = paper.questions.map((q) => q.id);
    const questionsById = new Map(
      paper.questions.map((q) => [
        q.id,
        {
          id: q.id,
          answerKey: q.answerKey,
          topicId: q.topicId,
          topicCode: q.topic.code,
          topicName: q.topic.name,
          difficulty: q.difficulty as never,
        },
      ]),
    );
    const graded = gradeSubmission({
      questionIds,
      questionsById,
      stored: [],
      payload: body.answers.map((a) => ({ questionId: a.questionId, chosen: a.chosen, timeSec: a.timeSec, marked: a.marked })),
      marksPerQ: paper.marksPerQ,
      negativeMark: paper.negativeMark,
    });
    const chosenById = new Map(graded.scored.map((s) => [s.questionId, s.chosen]));
    const correctById = new Map(graded.scored.map((s) => [s.questionId, s.correct]));
    const correct = graded.scored.filter((s) => s.correct).length;
    const skipped = graded.scored.filter((s) => s.chosen == null).length;
    const result: GuestGradeResult = {
      scoreRaw: graded.scoreRaw,
      scoreMax: graded.scoreMax,
      scorePct: graded.scorePct,
      total: questionIds.length,
      correct,
      wrong: questionIds.length - correct - skipped,
      skipped,
      negativeMark: paper.negativeMark,
      topics: weakestFirst(
        Object.values(graded.topicScores).map((t) => ({ code: t.topicCode, name: t.topicName, correct: t.correct, total: t.total })),
      ),
      questions: paper.questions.map((q) => ({
        id: q.id,
        body: q.body,
        options: q.options,
        answerKey: q.answerKey,
        solution: q.solution,
        topic: q.topic,
        chosen: chosenById.get(q.id) ?? null,
        correct: correctById.get(q.id) === true,
      })),
    };
    return json(result);
  } catch (err) {
    console.error("[guest-paper/grade] failed:", err);
    return json({ error: "server_error" }, 500);
  }
}

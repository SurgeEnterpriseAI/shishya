// POST /api/attempts/:id/submit — finalise the attempt:
//   1. Score every answer (correct/marks)
//   2. Update WeaknessMap rows
//   3. Emit a MOCK_COMPLETED progress event
//
// Used to also call runDiagnostic() inline, but the result was thrown
// away (the /results page does its own queries) and the Claude round-
// trip added 10–30s of staring at "Submitting…". The diagnostic
// narrative is now generated on-demand from the results page.
//
// Batched submit (audit 11 Sep 2026). The body may carry every answer +
// timing: `{ auto?, answers?: [{ questionId, chosen, timeSec, marked,
// updatedAt }] }`. That payload is AUTHORITATIVE for what was chosen (the
// device the student finished on wins over whatever partial autosaves
// reached the DB), but it is never trusted for the grade — every answer is
// re-graded here from the question's answerKey via scoreAttempt, and any
// client-supplied `correct`/`marks`/score is discarded. Bare `{}` /
// `{ auto: true }` bodies (ExpiredAttemptGate, older clients) still work
// and grade whatever the DB holds.
//
// Idempotency without a schema change: the critical write is gated on
// status = IN_PROGRESS (updateMany), so two concurrent submits — double
// tap, second tab, a retry overtaking its original — grade exactly once.
// A resubmit whose `chosen` per question matches the graded answers
// returns the persisted result; a later submit that DIFFERS from what was
// graded is rejected with 409 ATTEMPT_ALREADY_GRADED. Timings and review
// marks never change a grade, so a payload that differs only there is the
// same submission (see src/lib/attempts-submit.ts).

// A 100-Q mock spans 10-20 topics; each WeaknessMap upsert is a
// round-trip from the US Lambda to the Asia Neon DB. Even at 30s the
// sequential loop was breaching Vercel's default 10s timeout for some
// users. We now parallelise the upserts, but keep a generous ceiling
// here so a cold Neon connection doesn't kill the submit.
export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ok, bad, notFound, serverError, unauth, forbidden } from "@/lib/http";
import { applyAttemptPsychometrics } from "@/lib/psychometrics";
import {
  SubmitBodySchema,
  gradeSubmission,
  samePayloadAsGraded,
  type SubmitBody,
} from "@/lib/attempts-submit";
import type { AnswerRecord } from "@/lib/attempts-sync";
import { attemptPaperIds } from "@/lib/attempt-paper";
import { persistedPaperIds, servedPaperIds } from "@/lib/served-paper";

import { ATTEMPT_ALREADY_GRADED } from "@/lib/attempts-sync";

/** The persisted result of an attempt that is no longer IN_PROGRESS — or a
 *  409 when the caller's payload contradicts what was graded. Shared by the
 *  early already-submitted branch and the lost-a-race branch below. */
function persistedResult(
  attempt: {
    id: string;
    status: string;
    answers: unknown;
    scoreRaw: number | null;
    scoreMax: number | null;
    scorePct: number | null;
    topicScores: unknown;
    durationSec: number | null;
    mock: { questionIds: string[] };
  },
  payload: SubmitBody["answers"],
) {
  const graded = attempt.status === "SUBMITTED" || attempt.status === "AUTO_SUBMITTED";
  // 26 Sep 2026: compared over the paper this attempt was graded on (its
  // graded list), not the mock's current ids — a paper may be shorter.
  const paper = attemptPaperIds({ questionIds: attempt.mock.questionIds, answers: attempt.answers });
  if (
    graded &&
    payload &&
    !samePayloadAsGraded((attempt.answers as AnswerRecord[]) ?? [], payload, paper)
  ) {
    return bad(ATTEMPT_ALREADY_GRADED, 409);
  }
  return ok({
    attemptId: attempt.id,
    scoreRaw: attempt.scoreRaw,
    scoreMax: attempt.scoreMax,
    scorePct: attempt.scorePct,
    topicScores: attempt.topicScores,
    durationSec: attempt.durationSec,
    alreadySubmitted: true,
  });
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();
    const { id } = await ctx.params;

    // A timed-out submit (client timer expired, or the expired-resume
    // interstitial) is recorded as AUTO_SUBMITTED so the results page can
    // tell the student "time ran out — auto-submitted with N answered"
    // rather than presenting it as a chosen finish (audit 18 Aug 2026).
    //
    // Body may also carry the batched answers (see header). A missing or
    // non-JSON body is the legacy bare submit.
    const raw: unknown = await _req.json().catch(() => null);
    const parsed = SubmitBodySchema.safeParse(raw && typeof raw === "object" ? raw : {});
    if (!parsed.success) return bad(`Invalid body: ${parsed.error.message}`);
    const auto = parsed.data.auto === true;
    const payload = parsed.data.answers;

    const attempt = await prisma.attempt.findUnique({
      where: { id },
      include: { mock: { include: { exam: true } } },
    });
    if (!attempt) return notFound("attempt");
    if (attempt.userId !== session.user.id) return forbidden();

    // ── Idempotent resubmit ───────────────────────────────────────────────
    // If the attempt is already SUBMITTED, return the persisted score
    // instead of an error. This unblocks students who hit a transient
    // error on first submit: the attempt was actually scored + status was
    // flipped, but a side-effect (weakness upsert / progress event)
    // returned a 500. They retry and previously got "Attempt already
    // submitted" — now they get success and the client navigates to
    // results. A payload that contradicts the graded answers gets a 409
    // instead (persistedResult) — nothing is ever re-scored.
    if (attempt.status !== "IN_PROGRESS") {
      return persistedResult(attempt, payload);
    }

    // ── Score ────────────────────────────────────────────────────────────
    // 26 Sep 2026: graded over the attempt's OWN paper, never the mock's
    // current list (src/lib/served-paper.ts). An attempt that started with
    // its paper persisted (skeleton rows with slots) is graded on exactly
    // that list — a question withdrawn after the start stays, with the key
    // the bank holds now. An attempt started before that shipped has no
    // persisted paper: it is graded on the mock's ids that are validated and
    // not withdrawn today, so a question the site knows is broken is never
    // scored against a key it knows is wrong. scoreMax follows the list
    // graded (scoreAttempt: questionIds.length × marksPerQ).
    const persisted = persistedPaperIds(attempt.answers) != null;
    const paperIds = attemptPaperIds({
      questionIds: attempt.mock.questionIds,
      answers: attempt.answers,
      startedAt: attempt.startedAt,
      config: attempt.mock.config,
    });
    const questions = await prisma.question.findMany({
      where: { id: { in: paperIds } },
      include: { topic: { select: { id: true, code: true, name: true, subjectId: true } } },
    });
    const exam = attempt.mock.exam;
    const gradedIds = persisted
      ? paperIds
      : servedPaperIds({ questionIds: paperIds }, new Map(questions.map((q) => [q.id, q])));

    // Pure scoring computation. The client payload (if any) replaces the
    // autosaved rows question-by-question, then everything is graded from
    // the answer key by scoreAttempt. See src/lib/attempts-submit.ts,
    // src/lib/scoring.ts and tests/unit/mock-answers-submit.test.ts.
    const { scored, scoreRaw, scoreMax, scorePct, topicAgg, topicScores, dropped } = gradeSubmission({
      stored: (attempt.answers as unknown as AnswerRecord[]) ?? [],
      payload,
      questionIds: gradedIds,
      questionsById: new Map(
        questions.map((q) => [
          q.id,
          {
            id: q.id,
            answerKey: q.answerKey,
            topicId: q.topic.id,
            topicCode: q.topic.code,
            topicName: q.topic.name,
            difficulty: q.difficulty,
          },
        ])
      ),
      marksPerQ: exam.marksPerQ,
      negativeMark: exam.negativeMark,
    });
    if (dropped.length > 0) {
      // 26 Sep 2026: also an answer to a question withdrawn after an attempt
      // that started without a persisted paper began (not graded, by design).
      console.warn("[submit] dropped payload answers for questions not in this attempt's paper", {
        attemptId: id,
        dropped,
      });
    }

    const finishedAt = new Date();
    const durationSec = Math.max(
      1,
      Math.round((finishedAt.getTime() - attempt.startedAt.getTime()) / 1000)
    );

    // Fan out: the attempt update, every weakness upsert, and the progress
    // event are all independent writes. Issuing them in parallel collapses
    // ~20 round-trips into one wall-clock window (Asia DB latency stays
    // ~700ms either way, but we wait once instead of 20 times). On a 100-Q
    // mock spanning ~15 topics this drops submit from ~14s to ~1s.
    const userId = session.user.id;
    const examId = exam.id;
    const weaknessUpserts = [...topicAgg.entries()].map(([topicId, t]) =>
      prisma.weaknessMap.upsert({
        where: {
          userId_examId_topicId: { userId, examId, topicId },
        },
        update: {
          attemptsCount: { increment: t.total },
          correctCount: { increment: t.correct },
          masteryScore: t.score,
          avgTimeSec: t.total === 0 ? null : t.timeSum / t.total,
          lastSeenAt: finishedAt,
        },
        create: {
          userId,
          examId,
          topicId,
          attemptsCount: t.total,
          correctCount: t.correct,
          masteryScore: t.score,
          avgTimeSec: t.total === 0 ? null : t.timeSum / t.total,
        },
      })
    );

    // ── CRITICAL write — must succeed or student is told to retry ────────
    // Note: we deliberately do NOT use prisma.$transaction([...]) here.
    // Prisma's array transaction executes queries SEQUENTIALLY within
    // one connection, so 15+ weakness upserts on a long mock would
    // take ~15 × Asia-DB-RTT (≈ 12s) instead of parallelising. With
    // connection_limit=5 on the pool, splitting the critical write
    // from a Promise.all of best-effort writes lets the upserts run
    // 5-at-a-time → ~3 waves × 800ms ≈ 2.4s.
    //
    // Gated on status = IN_PROGRESS so an attempt is graded exactly once:
    // a concurrent submit (double tap, second tab, a retry overtaking its
    // original) both pass the status check above, but only one UPDATE
    // matches. The loser re-reads and returns the winner's persisted
    // result — or a 409 if its payload differs from what was graded.
    const written = await prisma.attempt.updateMany({
      where: { id, status: "IN_PROGRESS" },
      data: {
        status: auto ? "AUTO_SUBMITTED" : "SUBMITTED",
        finishedAt,
        durationSec,
        answers: scored as unknown as Prisma.InputJsonValue,
        scoreRaw,
        scoreMax,
        scorePct,
        topicScores: topicScores as unknown as Prisma.InputJsonValue,
      },
    });
    if (written.count === 0) {
      const again = await prisma.attempt.findUnique({
        where: { id },
        include: { mock: { select: { questionIds: true } } },
      });
      if (!again) return notFound("attempt");
      return persistedResult(again, payload);
    }

    // ── BEST-EFFORT side-effects, parallelised through the pool ─────────
    try {
      await Promise.all([
        ...weaknessUpserts,
        prisma.progressEvent.create({
          data: {
            userId,
            examId,
            type: "MOCK_COMPLETED",
            delta: scorePct,
            metadata: { mockId: attempt.mockId, attemptId: id },
          },
        }),
        // Student model: online IRT calibration + FSRS review scheduling.
        // Reads up-front, computes in memory, writes in parallel — adds one
        // wave of round-trips, and a failure here never blocks the submit.
        applyAttemptPsychometrics(prisma, {
          userId,
          examId,
          answers: (scored as any[]).map((a) => ({
            questionId: a.questionId,
            chosen: a.chosen ?? null,
            correct: !!a.correct,
          })),
          questionMeta: new Map(
            questions.map((q) => [
              q.id,
              { topicId: q.topic.id, subjectId: q.topic.subjectId, difficulty: q.difficulty },
            ]),
          ),
        }),
      ]);
    } catch (err) {
      console.error("[submit] best-effort side-effects failed", {
        attemptId: id,
        userId,
        examId,
        message: (err as Error)?.message,
      });
      // intentionally fall through to ok() — student is already SUBMITTED
    }

    // Percentile against this exam's other submitted attempts — cheap
    // COUNT, best-effort. Before this the exam-hub "Rank & Leaderboard"
    // percentile column was never computed and every student saw "—"
    // forever (audit 18 Aug 2026).
    try {
      const pctRows = await prisma.$queryRaw<{ below: bigint; total: bigint }[]>`
        SELECT
          COUNT(*) FILTER (WHERE a."scorePct" < ${scorePct})::bigint AS below,
          COUNT(*)::bigint AS total
        FROM "Attempt" a JOIN "Mock" m ON m.id = a."mockId"
        WHERE m."examId" = ${examId}
          AND a.status IN ('SUBMITTED','AUTO_SUBMITTED') AND a."scorePct" IS NOT NULL`;
      const total = Number(pctRows[0]?.total ?? 0);
      if (total > 1) {
        const percentile = Math.round((Number(pctRows[0].below) / total) * 100);
        await prisma.$executeRaw`
          UPDATE "Attempt" SET percentile = ${percentile} WHERE id = ${id}`;
      }
    } catch {
      /* percentile is decorative — never block the submit on it */
    }

    return ok({
      attemptId: id,
      scoreRaw,
      scoreMax,
      scorePct,
      topicScores,
      durationSec,
    });
  } catch (err) {
    // Log the actual cause so we can debug from Vercel runtime logs next
    // time. Without this the response was just "INTERNAL_ERROR" with no
    // way to track down which write threw.
    console.error("[submit] critical write failed", {
      message: (err as Error)?.message,
      stack: (err as Error)?.stack,
    });
    return serverError(err);
  }
}

// /mocks/:id — mock test player wrapper.
// Server component: gates auth, loads mock, then hands off to client player.

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";
import { MockPlayer } from "./MockPlayer";

export default async function MockPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/dashboard`);
  const userId = session.user.id;
  const { id } = await params;

  // Lookup mock + attempt state IN PARALLEL. Critically, we DO NOT
  // fetch the 100 questions yet — for a re-visit where the user already
  // submitted, we redirect to /results and the 100-question fetch is
  // pure waste (was costing ~6s before this change). Questions only
  // load if we actually need to render the player.
  const [mock, existingInProgress, existingSubmitted] = await Promise.all([
    prisma.mock.findUnique({
      where: { id },
      include: { exam: { select: { code: true, shortName: true, marksPerQ: true, negativeMark: true } } },
    }),
    prisma.attempt.findFirst({
      where: { mockId: id, userId, status: "IN_PROGRESS" },
    }),
    prisma.attempt.findFirst({
      where: {
        mockId: id,
        userId,
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
      },
      orderBy: { finishedAt: "desc" },
      select: { id: true, startedAt: true },
    }),
  ]);
  if (!mock) notFound();
  if (mock.userId && mock.userId !== userId) redirect("/dashboard");

  // Live-test gate ON THE REAL START PATH (22 Aug 2026). The earlier gate
  // lived only in POST /api/attempts, which nothing calls — so the Sunday
  // paper was openable a week early from the hub, and an early attempt
  // then locked the student out of a ranked run. Here: before opensAt we
  // render a notice instead of creating an attempt; and any attempt that
  // was started BEFORE the window is void (abandoned if still open,
  // ignored if submitted) so the student gets a clean ranked run.
  let liveWindow: { opensAt: Date; closesAt: Date } | null = null;
  let inProgress = existingInProgress;
  if (mock.generatedBy === "live-test") {
    const lt = await prisma.$queryRaw<{ opensAt: Date; closesAt: Date }[]>`
      SELECT "opensAt", "closesAt" FROM "LiveTest" WHERE "mockId" = ${mock.id} LIMIT 1`;
    liveWindow = lt[0] ?? null;
    if (liveWindow && Date.now() < liveWindow.opensAt.getTime()) {
      const { LiveTestNotOpen } = await import("./LiveTestNotOpen");
      return (
        <LiveTestNotOpen
          examCode={mock.exam.code}
          examShort={mock.exam.shortName}
          opensAtIso={liveWindow.opensAt.toISOString()}
        />
      );
    }
    if (liveWindow && inProgress && inProgress.startedAt < liveWindow.opensAt) {
      await prisma.attempt
        .update({ where: { id: inProgress.id }, data: { status: "ABANDONED", finishedAt: new Date() } })
        .catch(() => {});
      inProgress = null;
    }
  }

  // If they already submitted (and have no in-progress reattempt),
  // bounce to results IMMEDIATELY — no question fetch, no JIT prep.
  // For a live test only an IN-WINDOW submission counts; a pre-window one
  // is void and they may start fresh.
  const submittedCounts =
    !!existingSubmitted && (!liveWindow || existingSubmitted.startedAt >= liveWindow.opensAt);
  if (!inProgress && existingSubmitted && submittedCounts) {
    redirect(`/attempts/${existingSubmitted.id}/results`);
  }

  // Expired-resume guard (audit 18 Aug 2026). If a student "resumes" an
  // IN_PROGRESS attempt whose timer already ran out, the live player used
  // to mount and SILENTLY auto-submit on load — a jarring instant 0/fail
  // on a path the dashboard sells as "safe to resume". Instead we show an
  // interstitial: submit what they had, or discard and start fresh. Only
  // for RESUMED attempts — a fresh attempt's clock starts now.
  const durationMinEarly = ((mock.config as any)?.durationMin as number | undefined) ?? 30;
  if (inProgress) {
    const elapsedMin = (Date.now() - inProgress.startedAt.getTime()) / 60_000;
    if (elapsedMin > durationMinEarly + 1) {
      const answers = (inProgress.answers as any[]) ?? [];
      const answered = answers.filter((a) => a && a.chosen != null && a.chosen !== "").length;
      const { ExpiredAttemptGate } = await import("./ExpiredAttemptGate");
      return (
        <ExpiredAttemptGate
          attemptId={inProgress.id}
          answered={answered}
          total={mock.questionIds.length}
          examShort={mock.exam.shortName}
          examCode={mock.exam.code}
        />
      );
    }
  }

  let attempt = inProgress;
  if (!attempt) {
    // Auto-enrol the student on the exam before creating the attempt.
    // Mirrors POST /api/attempts (Sachin-pattern fix). This page is the
    // OTHER entry point that creates an Attempt server-side — without
    // this upsert, users who land here directly (e.g. via a PYQ link)
    // get an attempt but no enrollment, breaking their WeaknessMap +
    // dashboard recommendations. Caught when Abhishek (signup 17:10,
    // SSC_GD attempt 17:11) had no enrollment.
    await prisma.enrollment.upsert({
      where: { userId_examId: { userId, examId: mock.examId } },
      update: {},
      create: { userId, examId: mock.examId },
    });
    attempt = await prisma.attempt.create({
      data: { mockId: mock.id, userId, status: "IN_PROGRESS", answers: [] },
    });
  }

  // Now we KNOW we're rendering the player, so we need the questions.
  // Run the questions fetch in parallel with getT() — both are
  // independent and getT may do a User.preferredLang lookup.
  const [questions, tt] = await Promise.all([
    prisma.question.findMany({
      where: { id: { in: mock.questionIds } },
      include: { topic: { select: { code: true, name: true } } },
    }),
    getT(),
  ]);
  const byId = new Map(questions.map((q) => [q.id, q]));
  const orderedQs = mock.questionIds
    .map((qid) => byId.get(qid))
    .filter((q): q is NonNullable<typeof q> => Boolean(q))
    .map((q) => ({
      id: q.id,
      type: q.type,
      difficulty: q.difficulty,
      body: q.body,
      options: q.options as { key: string; text: string }[],
      topic: q.topic,
      language: q.language,
    }));

  const durationMin = ((mock.config as any)?.durationMin as number | undefined) ?? 30;
  const config = mock.config as any;
  const { t, locale } = tt;

  return (
    <MockPlayer
      mock={{
        id: mock.id,
        title: mock.title,
        rationale: config?.rationale ?? null,
        examCode: mock.exam.code,
        examShort: mock.exam.shortName,
        durationMin,
        marksPerQ: mock.exam.marksPerQ,
        negativeMark: mock.exam.negativeMark,
      }}
      attemptId={attempt.id}
      startedAt={attempt.startedAt.toISOString()}
      questions={orderedQs}
      existingAnswers={(attempt.answers as any[]) ?? []}
      initialLocale={locale}
      practice={
        // USER_REQUEST = the custom topic builder (1 Sep 2026) — a
        // self-built drill earns instant-feedback mode like other
        // topic practice, never exam-mode strictness.
        ["TOPIC", "SUBJECT", "REVISION", "ADAPTIVE", "USER_REQUEST"].includes(mock.type) &&
        mock.generatedBy !== "live-test"
      }
      labels={{
        qOf: t("player.q.of"),
        mark: t("player.mark"),
        marked: t("player.marked"),
        prev: t("player.prev"),
        saveNext: t("player.saveNext"),
        reviewSubmit: t("player.reviewSubmit"),
        submitMock: t("player.submitMock"),
        sumAnswered: t("player.summary.answered"),
        sumMarked: t("player.summary.marked"),
        sumLeft: t("player.summary.left"),
        confirmTitle: t("player.confirm.title"),
        confirmBodyPrefix: t("player.confirm.body.prefix"),
        confirmBodyOf: t("player.confirm.body.of"),
        confirmBodyNote: t("player.confirm.body.note"),
        confirmKeep: t("player.confirm.keep"),
        confirmSubmit: t("player.confirm.submit"),
        confirmSubmitting: t("player.confirm.submitting"),
        submittingHint: t("player.submitting.hint"),
        marksPerQ: t("exam.marks"),
        negativeNone: t("exam.no.negative"),
      }}
    />
  );
}

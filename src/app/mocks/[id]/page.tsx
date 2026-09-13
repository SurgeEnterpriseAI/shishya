// /mocks/:id — mock test player wrapper.
// Server component: gates auth, loads mock, then hands off to client player.

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";
import { resolvePreferredLocale } from "@/lib/preferred-lang";
import { MockPlayer } from "./MockPlayer";

export default async function MockPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  // The gate keeps the mock intent (11 Sep 2026 signup-leak audit). Every
  // mock card on an exam hub and the exam-week "Full-length paper" link land
  // here, and the gate used to bounce guests to /login?callbackUrl=/dashboard
  // — the paper they tapped was gone after sign-in. /login already reads a
  // /mocks/ callback ("Your mock is one tap away"), and on return this page
  // auto-enrols and creates the attempt (see below), so the callback is the
  // mock itself.
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/mocks/${id}`)}`);
  const userId = session.user.id;

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
          userId={userId}
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
  const [questions, tt, pref] = await Promise.all([
    prisma.question.findMany({
      where: { id: { in: mock.questionIds } },
      include: { topic: { select: { code: true, name: true } } },
    }),
    getT(),
    // Student's language (12 Sep 2026): one PK read so a stored non-EN
    // preferredLang beats the UI cookie for the in-mock language hint.
    prisma.user.findUnique({ where: { id: userId }, select: { preferredLang: true } }).catch(() => null),
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

  // Player labels. The save / submit-state strings (13 Sep 2026: autosave
  // line, offline + retry notes, "answers kept on this device") travel in
  // the same object so the student's language reaches them; MockPlayer
  // reads them once its PlayerLabels interface gains these optional fields
  // (MockPlayer.tsx was frozen this wave — see the build report). A
  // variable rather than an inline literal, so the extra fields type-check
  // against today's PlayerLabels. Templates keep {kept} {code} {n}.
  const labels = {
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
    // → <SaveStatus labels={mirrorOk ? labels.save : labels.saveNoMirror}>
    save: {
      saving: t("player.save.saving"),
      saved: t("player.save.saved"),
      offline: t("player.save.offline"),
      retrying: t("player.save.retrying"),
      error: t("player.save.error"),
    },
    saveNoMirror: {
      offline: t("player.save.noMirror.offline"),
      retrying: t("player.save.noMirror.retrying"),
      error: t("player.save.noMirror.error"),
    },
    saveUnconfirmed: t("player.save.unconfirmed"),
    saveNotWritable: t("player.save.notWritable"),
    saveSigninExpired: t("player.save.signinExpired"),
    saveFailed: t("player.save.failed"),
    kept: t("player.kept"),
    keptNoMirror: t("player.kept.noMirror"),
    keptSentence: t("player.kept.sentence"),
    keptSentenceNoMirror: t("player.kept.sentence.noMirror"),
    submitOffline: t("player.submit.offline"),
    submitOfflineNoMirror: t("player.submit.offline.noMirror"),
    submitSigninExpired: t("player.submit.signinExpired"),
    submitFailed: t("player.submit.failed"),
    submitRetrying: t("player.submit.retrying"),
    submitRetryingSlow: t("player.submit.retryingSlow"),
    submitWaiting: t("player.submit.waiting"),
    submitRetryNow: t("player.submit.retryNow"),
  };

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
      userId={userId}
      startedAt={attempt.startedAt.toISOString()}
      questions={orderedQs}
      existingAnswers={(attempt.answers as any[]) ?? []}
      initialLocale={resolvePreferredLocale({ preferredLang: pref?.preferredLang, cookie: locale })}
      practice={
        // USER_REQUEST = the custom topic builder (1 Sep 2026) — a
        // self-built drill earns instant-feedback mode like other
        // topic practice, never exam-mode strictness.
        ["TOPIC", "SUBJECT", "REVISION", "ADAPTIVE", "USER_REQUEST"].includes(mock.type) &&
        mock.generatedBy !== "live-test"
      }
      labels={labels}
    />
  );
}

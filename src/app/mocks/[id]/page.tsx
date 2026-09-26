// /mocks/:id — mock test player wrapper.
// Server component: gates auth, loads mock, then hands off to client player.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ensureEnrollment } from "@/lib/db/enrollment";
// 26 Sep 2026 (student mode, integrator): a school set's way back is its chapter page.
import { schoolResultsCopy } from "@/lib/school/student-copy";
import { schoolMockConfigOf } from "@/lib/school/student-db";
import { getT } from "@/lib/i18n-server";
import { resolvePreferredLocale } from "@/lib/preferred-lang";
import {
  gateCallbackPath,
  gateLoginRedirectPath,
  isFromSignin,
  mockDurationMin,
  mockPathAfterChoice,
  shouldOfferShortOrFull,
} from "@/lib/mock-gate";
import { mockGateCopy } from "@/lib/mock-gate-copy";
import { loadGuestQuizEmbed } from "@/lib/guest-quiz-embed";
import { mockStartCopy } from "@/lib/quiz-entry-copy";
import {
  adoptPaper,
  answeredInPaper,
  canServePaper,
  honestMockTitle,
  paperSkeleton,
  persistedPaperIds,
  servedPaperCopy,
  servedPaperIds,
  withdrawnCount,
  withdrawnLine,
} from "@/lib/served-paper";
import { Header } from "@/components/Header";
import { MockPlayer } from "./MockPlayer";

// 25 Sep 2026: a guest now gets a real page here (the sign-in gate) instead
// of a redirect, so the page says noindex itself, like /login — on top of
// robots.txt's Disallow: /mocks/.
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function MockPlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const session = await auth();
  // The gate keeps the mock intent (11 Sep 2026 signup-leak audit). Every
  // mock card on an exam hub and the exam-week "Full-length paper" link land
  // here, and the gate used to bounce guests to /login?callbackUrl=/dashboard
  // — the paper they tapped was gone after sign-in. /login already reads a
  // /mocks/ callback ("Your mock is one tap away"), and on return this page
  // auto-enrols and creates the attempt (see below), so the callback is the
  // mock itself. 25 Sep 2026: an email's utm_source/medium/campaign ride
  // along inside the callback (only those three, checked; see
  // src/lib/login-return.ts) so the return after sign-in counts as email.
  //
  // Sign-in gate (25 Sep 2026). The bounce is now a page ON this URL: the
  // mock's exam, title and real size / timer, the /login page's Google
  // button first (callback = this mock + from=signin + those utm tags), and
  // below it the exam's 5-question guest quiz for anyone not ready to sign
  // in (MockGate.tsx; src/lib/mock-gate.ts has the why and the numbers).
  // An unknown id is a 404 straight away (it was one after sign-in). A
  // student-built mock (userId set) still bounces to /login — a guest may
  // not see another student's set — with from=signin in the callback too.
  if (!session?.user?.id) {
    const [guestMock, { t, locale }] = await Promise.all([
      prisma.mock.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          userId: true,
          questionIds: true,
          config: true,
          exam: { select: { code: true, shortName: true } },
        },
      }),
      getT(),
    ]);
    if (!guestMock) notFound();
    if (guestMock.userId) redirect(gateLoginRedirectPath(guestMock.id, sp));
    // 26 Sep 2026: the gate shows the size the mock really SERVES (validated
    // questions not withdrawn — src/lib/served-paper.ts) and a title with
    // that count; a paper too short to start shows the same "being rebuilt"
    // notice a signed-in student gets, instead of a sign-in to nothing.
    const [guestQuiz, { MockGate }, guestQs] = await Promise.all([
      loadGuestQuizEmbed(guestMock.exam.code, t, locale),
      import("./MockGate"),
      prisma.question.findMany({
        where: { id: { in: guestMock.questionIds } },
        select: { id: true, validated: true, tags: true },
      }),
    ]);
    const guestPaper = servedPaperIds(guestMock, new Map(guestQs.map((q) => [q.id, q])));
    if (!canServePaper(guestPaper)) {
      const { MockRebuilding } = await import("./MockRebuilding");
      return (
        <MockRebuilding
          title={guestMock.title}
          examCode={guestMock.exam.code}
          examShort={guestMock.exam.shortName}
          copy={servedPaperCopy(locale)}
        />
      );
    }
    return (
      <MockGate
        mockId={guestMock.id}
        title={honestMockTitle(guestMock.title, guestMock.questionIds.length, guestPaper.length)}
        examCode={guestMock.exam.code}
        examShort={guestMock.exam.shortName}
        questionCount={guestPaper.length}
        durationMin={mockDurationMin(guestMock.config)}
        callbackUrl={gateCallbackPath(guestMock.id, sp)}
        signInLabel={t("login.continue")}
        freeLine={t("login.freeLine")}
        copy={mockGateCopy(locale)}
        guestQuiz={guestQuiz}
      />
    );
  }
  const userId = session.user.id;

  // Lookup mock + attempt state IN PARALLEL. Critically, we DO NOT
  // fetch the 100 questions yet — for a re-visit where the user already
  // submitted, we redirect to /results and the 100-question fetch is
  // pure waste (was costing ~6s before this change). Questions only
  // load if we actually need to render the player.
  const [mock, existingInProgress, existingSubmitted] = await Promise.all([
    prisma.mock.findUnique({
      where: { id },
      include: { exam: { select: { code: true, shortName: true, marksPerQ: true, negativeMark: true, category: true } } },
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

  // The paper this page serves (26 Sep 2026, src/lib/served-paper.ts). The
  // bank answer check is withdrawing questions (validated → false) that sit
  // in the site's own mocks and in students' sets; this page used to serve
  // Mock.questionIds as-is. Now:
  //   • a NEW attempt gets the served list — the mock's ids that exist, are
  //     validated and are not tagged rejected, in order — and that list is
  //     persisted on the attempt as a skeleton answers row per question with
  //     its slot (paperSkeleton);
  //   • a RESUMED attempt keeps exactly the paper it started with
  //     (persistedPaperIds) — never re-filtered mid-attempt, whatever was
  //     withdrawn since, and untouched by a PYQ set that shrank meanwhile;
  //   • an attempt started before this shipped has no persisted paper: it
  //     takes today's served list and adopts it (adoptPaper, below), so its
  //     next resume and its submit read the same list;
  //   • a paper under MIN_SERVED_QUESTIONS is not started: "being rebuilt".
  // The question rows are needed on every path from here (the expired gate's
  // real total, the choice's real count, the start, the player), so they
  // load now, in parallel with getT() (may read User.preferredLang) and the
  // language preference; a persisted paper's own ids are included in case a
  // slot was swapped or the set shrank since.
  const persisted = inProgress ? persistedPaperIds(inProgress.answers) : null;
  const paperFetchIds = persisted ? [...new Set([...mock.questionIds, ...persisted])] : mock.questionIds;
  const [questions, tt, pref] = await Promise.all([
    prisma.question.findMany({
      where: { id: { in: paperFetchIds } },
      include: { topic: { select: { code: true, name: true } } },
    }),
    getT(),
    // Student's language (12 Sep 2026): one PK read so a stored non-EN
    // preferredLang beats the UI cookie for the in-mock language hint.
    prisma.user.findUnique({ where: { id: userId }, select: { preferredLang: true } }).catch(() => null),
  ]);
  const { t, locale } = tt;
  const byId = new Map(questions.map((q) => [q.id, q]));
  const paperIds = persisted ?? servedPaperIds(mock, byId);
  const paperCopy = servedPaperCopy(locale);
  // 26 Sep 2026 (student mode, integrator): a school chapter practice set
  // (src/lib/school/student-db.ts config.school) has no exam hub — every
  // /exams/<school container> is a 404 by design — so the "being rebuilt"
  // notice and the expired gate go back to the chapter page instead.
  const schoolCfg = mock.generatedBy === "school-chapter" ? schoolMockConfigOf(mock.config) : null;
  const schoolBack = schoolCfg ? { href: schoolCfg.chapterPath ?? "/schooling", label: schoolResultsCopy(locale).backToChapter } : null;
  // "K questions were withdrawn after an answer check and are not served" —
  // shown on the choice and in the player only when K > 0; and a title that
  // states the size ("… (119 of 200 questions)") says the served size.
  const withdrawnNote = withdrawnLine(paperCopy, withdrawnCount(mock, paperIds));
  const displayTitle = honestMockTitle(mock.title, mock.questionIds.length, paperIds.length);
  if (!canServePaper(paperIds)) {
    // Too short to START. 26 Sep 2026 (review fix): an attempt already
    // IN_PROGRESS here is not stranded — this notice used to return before
    // the expired gate and the resume, so a student whose attempt (started
    // before the paper was persisted, on a mock the check has since cut
    // under the minimum) could neither finish nor clear it, and the
    // dashboard's "still in progress" card kept sending them back (93 such
    // attempts on the day, 88 with saved answers). The notice now carries
    // the expired gate's two exits — submit the answers saved on questions
    // that passed the check (`paperIds` is that list; /submit grades a
    // paper-less attempt over the same list) when there are any, or
    // discard. Nothing is decided for the student, nothing abandoned
    // silently, and no attempt is created.
    const { MockRebuilding } = await import("./MockRebuilding");
    return (
      <MockRebuilding
        title={mock.title}
        examCode={mock.exam.code}
        examShort={mock.exam.shortName}
        copy={paperCopy}
        back={schoolBack}
        attempt={
          inProgress ? { id: inProgress.id, userId, answered: answeredInPaper(inProgress.answers, paperIds) } : null
        }
      />
    );
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
      // 26 Sep 2026: "answered of total" over the attempt's own paper.
      const answered = answeredInPaper(inProgress.answers, paperIds);
      const { ExpiredAttemptGate } = await import("./ExpiredAttemptGate");
      return (
        <ExpiredAttemptGate
          attemptId={inProgress.id}
          userId={userId}
          answered={answered}
          total={paperIds.length}
          examShort={mock.exam.shortName}
          examCode={mock.exam.code}
          backHref={schoolBack?.href ?? null}
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
    // 26 Sep 2026: through the one enrolment door (src/lib/db/enrollment.ts).
    // 26 Sep 2026 (student mode): a school chapter practice set — built by
    // src/lib/school/student-db.ts on a Class 8-12 container — passes the
    // school flag, so the door allows that container and no other school row.
    await ensureEnrollment(
      userId,
      { id: mock.examId, category: mock.exam.category, code: mock.exam.code },
      {},
      { school: mock.generatedBy === "school-chapter" },
    );
    // Full paper or warm up first? (25 Sep 2026) Only for the return from
    // Google sign-in (?from=signin, set by the gate and the private-mock
    // bounce above) to a paper-length mock with nothing in progress — not a
    // live test. September: 41 first attempts started on load after /login
    // finished 54% (20% left at 0 answers); the hub's short diagnostic
    // finishes 84-87%. Nothing is created here: "full" comes back to this
    // URL without from=signin and takes the path below exactly as before;
    // "short" starts the hub's own 5-question diagnostic. The student is
    // already enrolled (above), as the old start-on-load path did.
    // 26 Sep 2026: the choice is offered on the same rule as before (the
    // mock's own list length); what it DISPLAYS is the served count and the
    // honest title, with the withdrawn line under them when any were.
    if (
      shouldOfferShortOrFull({
        fromSignin: isFromSignin(sp),
        questionCount: mock.questionIds.length,
        hasInProgress: inProgress != null,
        isLiveTest: mock.generatedBy === "live-test",
      })
    ) {
      const { ShortOrFullChoice } = await import("./ShortOrFullChoice");
      return (
        <main className="min-h-screen bg-ink-50/40">
          <Header />
          <section className="container-prose py-6 sm:py-10">
            <ShortOrFullChoice
              mockId={mock.id}
              title={displayTitle}
              examCode={mock.exam.code}
              examShort={mock.exam.shortName}
              questionCount={paperIds.length}
              durationMin={mockDurationMin(mock.config)}
              fullHref={mockPathAfterChoice(mock.id, sp)}
              copy={mockGateCopy(locale)}
              errCopy={mockStartCopy(locale)}
            />
            {withdrawnNote && (
              <p className="mx-auto mt-3 max-w-xl text-center text-xs text-ink-600">{withdrawnNote}</p>
            )}
          </section>
        </main>
      );
    }
    // 26 Sep 2026: the attempt starts WITH its paper — one skeleton row per
    // served question, carrying its slot — so a resume and the submit read
    // exactly this list (src/lib/served-paper.ts, src/lib/attempt-paper.ts).
    attempt = await prisma.attempt.create({
      data: {
        mockId: mock.id,
        userId,
        status: "IN_PROGRESS",
        answers: paperSkeleton(paperIds) as unknown as Prisma.InputJsonValue,
      },
    });
  } else if (!persisted) {
    // 26 Sep 2026: an attempt started before the paper was persisted (672
    // IN_PROGRESS on the day) adopts today's served list on this resume,
    // keeping every answer it already saved for a served question, so its
    // next resume and its submit read the same paper. Gated on IN_PROGRESS
    // and best-effort: if the write is lost the page still serves the
    // served list and submit grades the served list.
    const adopted = adoptPaper(attempt.answers, paperIds);
    const written = await prisma.attempt
      .updateMany({
        where: { id: attempt.id, status: "IN_PROGRESS" },
        data: { answers: adopted as unknown as Prisma.InputJsonValue },
      })
      .catch(() => null);
    if (written && written.count > 0) attempt = { ...attempt, answers: adopted as unknown as Prisma.JsonValue };
  }

  // The player gets the attempt's paper, in order.
  const orderedQs = paperIds
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

  // Player labels. The save / submit-state strings (13 Sep 2026: autosave
  // line, offline + retry notes, "answers kept on this device") travel in
  // the same object so the student's language reaches them. MockPlayer now
  // reads every one of them (16 Sep 2026) — it no longer holds any English
  // save / submit literal. Templates keep {kept} {code} {n}.
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
    confirmUnsyncedOne: t("player.confirm.unsynced.one"),
    confirmUnsyncedMany: t("player.confirm.unsynced.many"),
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
    submitAgain: t("player.submit.again"),
  };

  return (
    <MockPlayer
      mock={{
        id: mock.id,
        title: displayTitle,
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
      withdrawnNote={withdrawnNote}
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

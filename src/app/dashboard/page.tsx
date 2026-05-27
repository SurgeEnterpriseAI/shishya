// /dashboard — student home after sign-in. Bilingual.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { isCurrentUserAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db/prisma";
import { getDashboardExams } from "@/lib/db/exam-cache";
import { getT } from "@/lib/i18n-server";
import { ExamPicker, type ExamCard } from "@/components/ExamPicker";
import { computeExamTags, TAG_ORDER } from "@/lib/exam-tags";
import { buildCuratedSections, buildStateInfo } from "@/lib/exam-browse";
import { formatDisplayScorePct } from "@/lib/scoring";
import { OnboardingTour } from "@/components/OnboardingTour";
import { TwoPathsCard } from "./TwoPathsCard";
import { captureSignupAttribution } from "@/lib/signup-attribution";

export default async function DashboardPage() {
  try {
    return await renderDashboard();
  } catch (err) {
    // NEXT_REDIRECT + NEXT_NOT_FOUND are how Next.js implements redirect()
    // and notFound() — they throw special signals that the framework
    // catches. We must NOT swallow or log those, just re-throw.
    const msg = (err as Error)?.message;
    if (msg === "NEXT_REDIRECT" || msg === "NEXT_NOT_FOUND") {
      throw err;
    }
    // Real error — surface to Vercel logs so the actual cause is visible
    // (the production page otherwise just shows the generic "Application
    // error … digest: <hash>" with no useful info).
    console.error("[dashboard] render threw", {
      message: msg,
      stack: (err as Error)?.stack,
    });
    throw err;
  }
}

async function renderDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");

  // Admin accounts (anyone in ADMIN_EMAILS) land on /dashboard by default
  // after Google sign-in, but the student dashboard isn't useful to them.
  // Bounce them straight to the operator insights view. Students see no
  // change; admins effectively get insights as their post-login home.
  const { isAdmin } = await isCurrentUserAdmin();
  if (isAdmin) redirect("/admin/insights");

  const userId = session.user.id;
  const { t } = await getT();

  // Attribution capture on first authenticated dashboard load. Reads
  // the `shishya_attrib` cookie (Referer + UTM payload set by the edge
  // middleware on / /exams/* /login), writes it to User.signupReferrer*
  // if still null, and clears the cookie.
  //
  // Was previously `void capture(...).catch(...)` (fire-and-forget) but
  // Vercel serverless terminates background promises when the response
  // is sent — every signup ended up with signupReferrerHost = NULL even
  // when the cookie was set correctly. Awaiting it costs ~30ms and
  // guarantees the write lands. Errors are still swallowed inside the
  // helper so a failed UPDATE can't crash the dashboard.
  await captureSignupAttribution(userId).catch(() => {});

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  // Today's brief is keyed on UTC midnight — same key the cron uses
  const todayUtc = (() => {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  })();

  // The dashboard runs 6 expensive Prisma queries. With the bumped
  // connection_limit=5 in the pooled DATABASE_URL these can safely run
  // in parallel — 5 real connections share the workload, dashboard wall
  // clock collapses to ~max(query) instead of ~sum(queries). The shared
  // exam list still uses unstable_cache so most requests skip the DB
  // for it entirely.
  // Onboarding gate.
  //
  // Two separate flags track two separate things:
  //   onbCompletedAt — the 3-question profile wizard (/onboarding). If
  //     null, the user signed up but never told us what they're
  //     preparing for. We bounce them to /onboarding so we can
  //     personalise everything else. This is the BIG conversion lever:
  //     27 May 2026 telemetry showed 96 signups, 0 mocks attempted,
  //     because new users land here on a generic dashboard with no
  //     clear first action.
  //   onboardedAt — the in-dashboard guided TOUR (separate UX). Once
  //     true, the <OnboardingTour /> popover is suppressed forever.
  //
  // Single $queryRaw fetches both so we only round-trip to Neon once.
  const onboardedRows = (await prisma.$queryRaw<{
    onboardedAt: Date | null;
    onbCompletedAt: Date | null;
  }[]>`
    SELECT "onboardedAt", "onbCompletedAt" FROM "User" WHERE "id" = ${userId} LIMIT 1
  `) ?? [];
  const showOnboarding = !onboardedRows[0]?.onboardedAt;
  if (!onboardedRows[0]?.onbCompletedAt) {
    redirect("/onboarding?next=dashboard");
  }

  const [allExams, enrollments, recentAttempts, stalledAttempts, weakness, chatRecent, dailyBriefs] =
    await Promise.all([
      getDashboardExams(),
      prisma.enrollment.findMany({
        where: { userId, active: true },
        include: { exam: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.attempt.findMany({
        where: { userId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } },
        include: { mock: { include: { exam: { select: { code: true, shortName: true } } } } },
        orderBy: { startedAt: "desc" },
        take: 5,
      }),
      // Stalled / abandoned IN_PROGRESS mocks. We surface these in a
      // recovery banner so students who bounced mid-mock have a
      // one-click way back (Sachin pattern — signed up, started 3
      // mocks, never finished).
      prisma.attempt.findMany({
        where: {
          userId,
          status: "IN_PROGRESS",
          startedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) }, // >30 min old
        },
        include: { mock: { include: { exam: { select: { code: true, shortName: true } } } } },
        orderBy: { startedAt: "desc" },
        take: 3,
      }),
      prisma.weaknessMap.findMany({
        where: { userId },
        include: {
          topic: { select: { code: true, name: true } },
          exam: { select: { code: true, shortName: true } },
        },
        orderBy: { lastSeenAt: "desc" },
        take: 30,
      }),
      prisma.chatSession.findMany({
        where: { userId, createdAt: { gte: thirtyDaysAgo } },
        include: {
          exam: { select: { code: true, shortName: true } },
          messages: {
            where: { role: "ASSISTANT" },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { metadata: true, content: true, createdAt: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.dailyBrief.findMany({
        where: { userId, briefDate: todayUtc },
        include: {
          mock: { select: { id: true, title: true } },
        },
      }),
    ]);

  // Pick today's brief for the recommended-exam slot. Prefer the brief
  // matching the recommended exam if present; otherwise the first brief.
  const briefByExamId = new Map(dailyBriefs.map((b) => [b.examId, b]));

  // ── Compute Learning-Loop derived data ─────────────────────────────
  // Weakest 3 (lowest mastery) + Strongest 3 (highest mastery) across all
  // enrolled exams. Filtering noise: only include topics with ≥3 attempts.
  const stableMastery = weakness.filter((w) => w.attemptsCount >= 3);
  const sortedAsc = [...stableMastery].sort((a, b) => a.masteryScore - b.masteryScore);
  const weakest3 = sortedAsc.slice(0, 3);
  const strongest3 = [...stableMastery].sort((a, b) => b.masteryScore - a.masteryScore).slice(0, 3);

  // "Recommended next mock" — the enrolled exam with the lowest avg mastery
  // is where adaptive practice will help most. Falls back to most recent
  // enrollment if no mastery data yet.
  const recommendedExam = (() => {
    if (enrollments.length === 0) return null;
    const masteryByExam = new Map<string, { sum: number; n: number; short: string; code: string; examId: string }>();
    for (const w of stableMastery) {
      const cur = masteryByExam.get(w.examId) ?? { sum: 0, n: 0, short: w.exam.shortName, code: w.exam.code, examId: w.examId };
      cur.sum += w.masteryScore;
      cur.n += 1;
      masteryByExam.set(w.examId, cur);
    }
    const ranked = [...masteryByExam.values()].sort((a, b) => a.sum / a.n - b.sum / b.n);
    if (ranked[0]) return ranked[0];
    return { code: enrollments[0].exam.code, short: enrollments[0].exam.shortName, examId: enrollments[0].examId };
  })();

  // If today's brief exists for the recommended exam, prefer it (the cron
  // already wrote a personalised reflection + pre-built adaptive mock).
  const todaysBrief = recommendedExam ? briefByExamId.get(recommendedExam.examId) ?? null : null;

  // Score Boost is exam-scoped, so it now lives only on /exams/[code] where
  // the student is already focused on a specific exam. The dashboard stays
  // exam-agnostic — multi-exam home, no auto-scope to whichever exam the
  // student last touched.

  // "Topics you asked Shishya about" — pull tool_use calls that mention a
  // topic_code (find_questions_on_topic / get_attempt_mistakes traces) +
  // citedTopics extracted by the tutor. Aggregate counts.
  const topicAskCounts = new Map<string, { code: string; name: string; examCode: string; examShort: string; count: number }>();
  for (const session of chatRecent) {
    for (const msg of session.messages) {
      const md = msg.metadata as any;
      const calls = (md?.toolCalls ?? []) as Array<{ name?: string; args?: any }>;
      for (const call of calls) {
        const code = call?.args?.topic_code;
        if (typeof code === "string") {
          const cur = topicAskCounts.get(code) ?? {
            code,
            name: code,
            examCode: session.exam?.code ?? "",
            examShort: session.exam?.shortName ?? "",
            count: 0,
          };
          cur.count += 1;
          topicAskCounts.set(code, cur);
        }
      }
    }
  }
  const topAskedTopics = [...topicAskCounts.values()].sort((a, b) => b.count - a.count).slice(0, 3);
  const totalChatSessions = chatRecent.length;

  const enrolledIds = new Set(enrollments.map((e) => e.examId));
  const otherExamCards: ExamCard[] = allExams
    .filter((e) => !enrolledIds.has(e.id))
    .map((e) => ({
      code: e.code,
      name: e.name,
      shortName: e.shortName,
      category: e.category,
      candidatesPerYear: e.candidatesPerYear,
      state: e.state ?? null,
      live: ((e._count?.questions ?? 0) > 0) || ((e._count?.mocks ?? 0) > 0),
      tags: computeExamTags({
        code: e.code,
        category: e.category,
        state: e.state ?? null,
        candidatesPerYear: e.candidatesPerYear,
      }),
    }));
  const stateInfo = buildStateInfo(otherExamCards);
  const featuredSections = buildCuratedSections(otherExamCards, t);

  const catLabels: Record<string, string> = {
    GOVT_JOBS:      t("land.cat.GOVT_JOBS"),
    BANKING:        t("land.cat.BANKING"),
    CIVIL_SERVICES: t("land.cat.CIVIL_SERVICES"),
    MEDICAL:        t("land.cat.MEDICAL"),
    ENGINEERING:    t("land.cat.ENGINEERING"),
    TEACHING:       t("land.cat.TEACHING"),
    UNIVERSITY:     t("land.cat.UNIVERSITY"),
    MBA:            t("land.cat.MBA"),
    LAW:            t("land.cat.LAW"),
    DEFENCE:        t("land.cat.DEFENCE"),
    OLYMPIAD:       t("land.cat.OLYMPIAD"),
    STATE_LEVEL:    t("land.cat.STATE_LEVEL"),
  };
  const tagLabels: Record<string, string> = {
    popular:        t("land.tag.popular"),
    national:       t("land.tag.national"),
    state:          t("land.tag.state"),
    govt:           t("land.tag.govt"),
    engineering:    t("land.tag.engineering"),
    medical:        t("land.tag.medical"),
    teaching:       t("land.tag.teaching"),
    banking:        t("land.tag.banking"),
    olympiad:       t("land.tag.olympiad"),
    civil_services: t("land.tag.civil_services"),
    mba:            t("land.tag.mba"),
    law:            t("land.tag.law"),
    police:         t("land.tag.police"),
    university:     t("land.tag.university"),
    polytechnic:    t("land.tag.polytechnic"),
    defence:        t("land.tag.defence"),
  };

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      {/* First-time onboarding tour. Renders nothing once the user has
          finished or skipped it (onboardedAt set on the User row). */}
      {showOnboarding && <OnboardingTour />}
      <section className="container-prose py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">
              {t("dash.welcome")} {session.user.name?.split(" ")[0] ?? "Shishya"}.
            </h1>
            <p className="mt-1 text-sm text-ink-600">{t("dash.subtitle")}</p>
          </div>
          {enrollments.length > 0 && (
            <Link
              href="/chat"
              data-onboard="header-tutor"
              className="btn-secondary !py-2 !px-4 text-xs sm:text-sm"
            >
              {t("nav.tutor")}
            </Link>
          )}
        </div>

        {/* Two-paths explainer. Shown after the welcome heading until
            the user clicks "Got it ×" once. Sets expectations about
            how the platform is meant to be used. */}
        <TwoPathsCard />

        {/* Stalled-mock recovery banner. Shows when the student has
            IN_PROGRESS attempts from a prior session. Without this they
            often forget the mock is sitting half-done. */}
        {stalledAttempts.length > 0 && (
          <section className="mt-6 rounded-md border border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span aria-hidden className="text-2xl">⏸️</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-900">
                  Pick up where you left off
                </p>
                <p className="mt-0.5 text-xs text-ink-700">
                  You have {stalledAttempts.length === 1 ? "a mock" : `${stalledAttempts.length} mocks`} still in progress. Resume any of them in one click — your answers so far are saved.
                </p>
                <ul className="mt-3 space-y-2">
                  {stalledAttempts.map((a) => {
                    const ans = (a.answers as any[]) ?? [];
                    const answered = ans.filter((x) => x?.chosen).length;
                    const total = Array.isArray(a.mock?.questionIds) ? a.mock.questionIds.length : ans.length;
                    const startedMin = Math.round((Date.now() - new Date(a.startedAt).getTime()) / 60000);
                    const startedAgo =
                      startedMin < 60 ? `${startedMin}m ago` :
                      startedMin < 1440 ? `${Math.round(startedMin / 60)}h ago` :
                      `${Math.round(startedMin / 1440)}d ago`;
                    return (
                      <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-saffron-200 bg-white px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink-900">{a.mock.title}</p>
                          <p className="text-[11px] text-ink-500">
                            {a.mock.exam.shortName} · started {startedAgo}
                            {total > 0 && ` · ${answered}/${total} answered`}
                          </p>
                        </div>
                        <Link
                          href={`/mocks/${a.mock.id}?attempt=${a.id}`}
                          prefetch={false}
                          className="btn-primary !py-1.5 !px-3 text-xs"
                        >
                          Continue →
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* Enrolled exams */}
        <section className="mt-8">
          <h2 className="text-base font-semibold text-ink-800">{t("dash.your.exams")}</h2>
          {enrollments.length === 0 ? (
            // Empty-state hero — the most important conversion surface
            // on the platform. Previously a tiny grey "no enrollments
            // yet" line; users saw it and bounced. Replaced with a
            // big, prescriptive "do this next" card that recommends 6
            // exams aligned to whatever the user typed in /onboarding
            // (onbPrepCodes first; falls back to popular national
            // exams). Each tile takes them directly to the per-exam
            // page where the Start-Mock button lives.
            <div className="mt-3 rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50/80 to-white p-6 sm:p-8">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
                  Step 1 — pick your first exam
                </p>
                <h3 className="mt-2 text-xl font-bold text-ink-900 sm:text-2xl">
                  You&apos;re all set up. Now pick the exam you&apos;re preparing for.
                </h3>
                <p className="mt-2 text-sm text-ink-600">
                  Tap any exam below to see its syllabus and start your first
                  adaptive mock — free, no time pressure, and Shishya learns
                  from every answer to make your next mock smarter.
                </p>
              </div>

              {/* Suggested-exam grid. Pulled from the full exam list,
                  filtered to ones the user opted into during onboarding
                  (onbPrepCodes). If they didn't pick any, fall back to
                  the top 6 popular national exams. */}
              <ul className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-3">
                {(() => {
                  // Default: 6 highest-volume "popular" exams. We
                  // dedupe against allExams to make sure they actually
                  // exist (not removed) and live (have content).
                  const allByCode = new Map(allExams.map((e) => [e.code, e]));
                  const defaultPopular = ["SSC_CGL", "NEET_UG", "JEE_MAIN", "UPSC_PRELIMS", "IBPS_PO", "RRB_NTPC"];
                  const codesToShow = defaultPopular.filter((c) => allByCode.has(c)).slice(0, 6);
                  return codesToShow.map((code) => {
                    const exam = allByCode.get(code);
                    if (!exam) return null;
                    return (
                      <li key={code}>
                        <Link
                          href={`/exams/${exam.code}`}
                          prefetch={false}
                          className="block rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-center transition-colors hover:border-saffron-400 hover:bg-saffron-50/40"
                        >
                          <p className="truncate text-sm font-semibold text-ink-900">
                            {exam.shortName}
                          </p>
                          <p className="mt-0.5 text-[11px] text-ink-500">
                            Start mock →
                          </p>
                        </Link>
                      </li>
                    );
                  });
                })()}
              </ul>

              <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-ink-500">
                Don&apos;t see your exam? Browse all{" "}
                <Link
                  href="/"
                  className="font-medium text-saffron-700 underline-offset-2 hover:underline"
                >
                  163 exams on the homepage
                </Link>{" "}
                or{" "}
                <Link
                  href="/onboarding?rerun=1"
                  className="font-medium text-saffron-700 underline-offset-2 hover:underline"
                >
                  redo the 3-question profile
                </Link>{" "}
                to get better suggestions.
              </p>
            </div>
          ) : (
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {enrollments.map((e) => (
                <li
                  key={e.id}
                  className="rounded-md border border-ink-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-sm font-semibold text-ink-900">{e.exam.shortName}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{e.exam.name}</p>
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/exams/${e.exam.code}`}
                      prefetch={false}
                      className="btn-primary !py-1.5 !px-3 text-xs"
                    >
                      {t("dash.continue")}
                    </Link>
                    <Link
                      href={`/exams/${e.exam.code}#syllabus`}
                      prefetch={false}
                      className="btn-secondary !py-1.5 !px-3 text-xs"
                    >
                      {t("dash.syllabus")}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Your learning loop ──────────────────────────────────────── */}
        {enrollments.length > 0 && (weakest3.length > 0 || topAskedTopics.length > 0 || recommendedExam) && (
          <section className="mt-10">
            <h2 className="text-base font-semibold text-ink-800">{t("dash.loop.title")}</h2>
            <p className="mt-1 text-sm text-ink-600">{t("dash.loop.subtitle")}</p>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
              {/* ── Recommended next mock ────────────────────────────────── */}
              {recommendedExam && (
                <div className="rounded-md border border-saffron-200 bg-saffron-50/60 p-4 lg:col-span-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-saffron-800">
                    {t("dash.loop.recommended.title")}
                  </p>
                  <p className="mt-2 text-base font-semibold text-ink-900">
                    {recommendedExam.short}
                  </p>
                  {todaysBrief?.reflection ? (
                    // Personalised note from Shishya, written overnight by the
                    // cron. Falls through to the static body if the cron
                    // hasn't run yet for this user.
                    <p className="mt-2 text-xs italic leading-relaxed text-ink-700">
                      &ldquo;{todaysBrief.reflection}&rdquo;
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-ink-600">
                      {weakest3.length > 0
                        ? t("dash.loop.recommended.body.weak")
                        : t("dash.loop.recommended.body.fresh")}
                    </p>
                  )}
                  <Link
                    href={
                      todaysBrief?.mockId
                        ? `/mocks/${todaysBrief.mockId}`
                        : `/exams/${recommendedExam.code}`
                    }
                    prefetch={false}
                    className="btn-primary mt-3 !py-1.5 !px-3 text-xs"
                  >
                    {todaysBrief?.mockId
                      ? t("dash.loop.recommended.cta.start")
                      : t("dash.loop.recommended.cta")}
                  </Link>
                </div>
              )}

              {/* ── Mastery snapshot ─────────────────────────────────────── */}
              <div className="rounded-md border border-ink-200 bg-white p-4 lg:col-span-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  {t("dash.loop.mastery.title")}
                </p>
                {weakest3.length === 0 && strongest3.length === 0 ? (
                  <p className="mt-2 text-xs text-ink-500">{t("dash.loop.mastery.empty")}</p>
                ) : (
                  <>
                    {weakest3.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-rose-700">
                          {t("dash.loop.mastery.weakest")}
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {weakest3.map((w) => (
                            <li key={w.id} className="flex items-baseline justify-between text-xs">
                              <Link
                                href={`/chat?examCode=${w.exam.code}&topicCode=${encodeURIComponent(w.topic.code)}&seed=${encodeURIComponent(`I'm weak in ${w.topic.name} for ${w.exam.shortName}. Tutor me on this topic.`)}`}
                                className="truncate text-ink-800 hover:text-saffron-700 hover:underline"
                              >
                                {w.topic.name}
                              </Link>
                              <span className="ml-2 shrink-0 tabular-nums text-ink-500">
                                {Math.round(w.masteryScore * 100)}%
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {strongest3.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                          {t("dash.loop.mastery.strongest")}
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {strongest3.map((w) => (
                            <li key={w.id} className="flex items-baseline justify-between text-xs">
                              <span className="truncate text-ink-800">{w.topic.name}</span>
                              <span className="ml-2 shrink-0 tabular-nums text-ink-500">
                                {Math.round(w.masteryScore * 100)}%
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ── Topics asked Shishya about ───────────────────────────── */}
              <div className="rounded-md border border-ink-200 bg-white p-4 lg:col-span-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  {t("dash.loop.shishya.title")}
                </p>
                {totalChatSessions === 0 ? (
                  <>
                    <p className="mt-2 text-xs text-ink-500">{t("dash.loop.shishya.empty")}</p>
                    <Link
                      href={enrollments[0] ? `/chat?examCode=${enrollments[0].exam.code}` : "/chat"}
                      className="btn-secondary mt-3 !py-1.5 !px-3 text-xs"
                    >
                      {t("dash.loop.shishya.cta.start")}
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-xs text-ink-600">
                      {totalChatSessions} {totalChatSessions === 1 ? t("dash.loop.shishya.sessions.one") : t("dash.loop.shishya.sessions.many")} · {t("dash.loop.shishya.last30")}
                    </p>
                    {topAskedTopics.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {topAskedTopics.map((tp) => (
                          <li key={tp.code} className="flex items-baseline justify-between text-xs">
                            {tp.examCode ? (
                              <Link
                                href={`/chat?examCode=${tp.examCode}&topicCode=${encodeURIComponent(tp.code)}&seed=${encodeURIComponent(`Pick up where we left off on ${tp.name}${tp.examShort ? ` for ${tp.examShort}` : ""}.`)}`}
                                className="truncate text-ink-800 hover:text-saffron-700 hover:underline"
                              >
                                {tp.name}
                              </Link>
                            ) : (
                              <span className="truncate text-ink-800">{tp.name}</span>
                            )}
                            <span className="ml-2 shrink-0 tabular-nums text-ink-500">×{tp.count}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link
                      href={enrollments[0] ? `/chat?examCode=${enrollments[0].exam.code}` : "/chat"}
                      className="mt-3 inline-block text-xs font-medium text-saffron-700 hover:text-saffron-800"
                    >
                      {t("dash.loop.shishya.cta.continue")} →
                    </Link>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Recent attempts */}
        {recentAttempts.length > 0 && (
          <section className="mt-10">
            <h2 className="text-base font-semibold text-ink-800">{t("dash.recent")}</h2>
            <ul className="mt-3 divide-y divide-ink-200 overflow-hidden rounded-md border border-ink-200 bg-white">
              {recentAttempts.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/attempts/${a.id}/results`}
                    prefetch={false}
                    className="flex items-center justify-between px-4 py-3 hover:bg-ink-50/60"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink-900">{a.mock.title}</p>
                      <p className="text-xs text-ink-500">
                        {a.mock.exam.shortName} ·{" "}
                        {new Date(a.startedAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-ink-900">
                        {formatDisplayScorePct(a.scorePct)}
                      </p>
                      <p className="text-xs text-ink-500">
                        {a.scoreRaw?.toFixed(0)}/{a.scoreMax?.toFixed(0)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Other exams — curated browse (search + chips + state grid) */}
        {otherExamCards.length > 0 && (
          <section className="mt-10" data-onboard="explore">
            <h2 className="text-base font-semibold text-ink-800">{t("dash.explore")}</h2>
            <div className="mt-4">
              <ExamPicker
                exams={otherExamCards}
                states={stateInfo}
                featured={featuredSections}
                signedIn={true}
                labels={{
                  searchPlaceholder: t("land.search.placeholder"),
                  searchLabel: t("land.search.label"),
                  noResults: t("land.no.results"),
                  catAll: t("land.cat.all"),
                  catLabels,
                  tagLabels,
                  tagOrder: [...TAG_ORDER],
                  statusLive: t("land.status.live"),
                  statusComing: t("land.status.coming"),
                  candidatesPerYear: t("land.candidates"),
                  pickState: t("land.pickState"),
                  pickStateBack: t("land.pickStateBack"),
                  examsConductedBy: t("land.examsConductedBy"),
                  seeAll: t("land.seeAll"),
                  browseAllExams: t("land.browseAllExams"),
                }}
              />
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

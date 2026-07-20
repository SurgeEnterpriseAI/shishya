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
import { QuickStartDiagnostic } from "./QuickStartDiagnostic";
import { captureSignupAttribution } from "@/lib/signup-attribution";
import { getDueRevisions } from "@/lib/db/revision-due";
import { getStudyStreak } from "@/lib/db/streak";
import { DailyFiveCard } from "./DailyFiveCard";
import { TalkToTeacher } from "@/components/TalkToTeacher";

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
  // Wrapped in try/catch so a transient Neon outage doesn't crash the
  // dashboard render — we default both flags to "completed" on failure,
  // since blocking everyone behind onboarding when the DB hiccups is
  // worse than the rare repeat-onboarding nag.
  let onboardedAt: Date | null = null;
  let onbCompletedAt: Date | null = null;
  // Also pull onbPrepCodes so the empty-state Diagnostic-5 hero can
  // pre-stage the user's onboarding-chosen exam without a second
  // picker step. See src/app/dashboard/DiagnosticHero.tsx.
  let onbPrepCodes: string[] = [];
  try {
    const onboardedRows = await prisma.$queryRaw<{
      onboardedAt: Date | null;
      onbCompletedAt: Date | null;
      onbPrepCodes: string[] | null;
    }[]>`
      SELECT "onboardedAt", "onbCompletedAt", "onbPrepCodes"
      FROM "User" WHERE "id" = ${userId} LIMIT 1
    `;
    onboardedAt = onboardedRows[0]?.onboardedAt ?? null;
    onbCompletedAt = onboardedRows[0]?.onbCompletedAt ?? null;
    onbPrepCodes = onboardedRows[0]?.onbPrepCodes ?? [];
  } catch (err) {
    console.error("[dashboard] onboarding-state query failed, treating as completed:", err);
    onbCompletedAt = new Date();
  }
  // Onboarding is NO LONGER a hard gate. Prod funnel (13 Jun 2026) showed
  // the forced 3-step wizard was the wall — 74% of signups bounced before
  // reaching the product. New signups now land straight here; the empty
  // state (<QuickStartDiagnostic />) lets them pick an exam and start a
  // diagnostic in one screen, which also auto-enrols them (so we still
  // capture the prep signal without the form). Onboarding stays available
  // as an opt-in for personalised suggestions.
  //
  // showOnboarding still drives the dashboard guided tour (separate UX);
  // onbCompletedAt is kept only to suppress the soft "personalise" nudge
  // for users who already did the wizard.
  const showOnboarding = !onboardedAt;
  void onbCompletedAt;

  const [allExams, enrollments, recentAttempts, stalledAttempts, weakness, chatRecent, dailyBriefs, dueRevisions, streak] =
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
      // FSRS revision schedule — topics whose memory is due for review.
      // Empty array for students with no review history yet (the card
      // hides itself), and a failure must never break the dashboard.
      getDueRevisions(userId, { horizonDays: 1, limit: 5 }).catch(() => []),
      // Study streak — habit anchor next to the greeting. Best-effort: a
      // failure renders no chip, never a broken dashboard.
      getStudyStreak(userId).catch(() => ({ current: 0, best: 0, activeToday: false })),
    ]);

  // Pick today's brief for the recommended-exam slot. Prefer the brief
  // matching the recommended exam if present; otherwise the first brief.
  const briefByExamId = new Map(dailyBriefs.map((b) => [b.examId, b]));

  // ── Quick-start activation data ────────────────────────────────────
  // Exams with enough validated content to build a diagnostic, slimmed
  // for the client picker. Filter >=5 validated Qs so a tapped exam can
  // never dead-end on "no questions available". Popular set = the
  // highest-volume national exams that survive that filter.
  const quickStartExams = allExams
    .filter((e) => (e._count?.questions ?? 0) >= 5)
    .map((e) => ({ code: e.code, shortName: e.shortName, name: e.name }));
  const quickStartPopular = ["SSC_CGL", "NEET_UG", "JEE_MAIN", "UPSC_PRELIMS", "IBPS_PO", "RRB_NTPC"].filter(
    (c) => quickStartExams.some((e) => e.code === c),
  );

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
            {/* Study streak chip — the habit anchor. Hidden until the
                first active day so new users aren't greeted with a zero. */}
            {streak.current > 0 && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
                <span aria-hidden>🔥</span>
                {streak.current} {streak.current === 1 ? t("dash.streak.day") : t("dash.streak.days")}
                {!streak.activeToday && (
                  <span className="font-normal text-amber-700">· {t("dash.streak.keep")}</span>
                )}
                {streak.best > streak.current && (
                  <span className="font-normal text-amber-700">· {t("dash.streak.best")} {streak.best}</span>
                )}
              </p>
            )}
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

        {/* Enrollment hardening (retention data: 0% of never-enrolled users
            EVER return; ~20% of signups slip through without picking an
            exam). Loud blocking-style banner until they enroll. */}
        {enrollments.length === 0 && (
          <section className="mt-6 rounded-xl border-2 border-saffron-400 bg-gradient-to-r from-saffron-50 to-amber-50 p-5 shadow-sm">
            <p className="text-base font-bold text-ink-900">
              👋 One step left — pick your exam
            </p>
            <p className="mt-1 text-sm text-ink-700">
              Everything on Shishya (mocks, weak-topic tracking, your daily plan) starts from your
              target exam. Takes 10 seconds.
            </p>
            <Link href="/" className="btn-primary mt-3 inline-block !py-2 !px-5 text-sm">
              Choose my exam →
            </Link>
          </section>
        )}

        {/* THE DAILY 5 — retention anchor (Jul 20 checkpoint: D1-7 return
            stuck at 14%; this is the daily reason-to-return). Weakest
            topic first; adaptive fallback until mastery data exists. */}
        {enrollments.length > 0 && (
          <DailyFiveCard
            examCode={weakest3[0]?.exam.code ?? recommendedExam?.code ?? enrollments[0].exam.code}
            examShort={weakest3[0]?.exam.shortName ?? recommendedExam?.short ?? enrollments[0].exam.shortName}
            topicCode={weakest3[0]?.topic.code ?? null}
            topicName={weakest3[0]?.topic.name ?? null}
            streakCurrent={streak.current}
            activeToday={streak.activeToday}
          />
        )}

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
            // Empty-state activation surface — the platform's most
            // important conversion lever. The forced 3-step onboarding
            // wizard that used to gate this screen was removed (13 Jun
            // 2026 funnel: 74% of signups bounced at it). This single
            // screen lets the student pick their exam and start a
            // 5-question diagnostic in one tap — which auto-enrols them,
            // so the prep signal is still captured without a form.
            <div className="mt-3">
              <QuickStartDiagnostic
                exams={quickStartExams}
                popularCodes={quickStartPopular}
                presetCode={onbPrepCodes.find((c) => quickStartExams.some((e) => e.code === c)) ?? null}
                labels={{
                  eyebrow: t("dash.qs.eyebrow"),
                  headline: t("dash.qs.headline"),
                  sub: t("dash.qs.sub"),
                  whichExam: t("dash.qs.whichExam"),
                  searchPlaceholder: t("dash.qs.search"),
                  startPrefix: t("dash.qs.startPrefix"),
                  startSuffix: t("dash.qs.startSuffix"),
                  building: t("dash.qs.building"),
                  change: t("dash.qs.change"),
                  noMatch: t("dash.qs.noMatch"),
                  personalize: t("dash.qs.personalize"),
                }}
              />
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

        {/* ── Revise today (FSRS spaced repetition) ───────────────────── */}
        {dueRevisions.length > 0 && (
          <section className="mt-10">
            <div className="rounded-md border border-violet-200 bg-violet-50/60 p-4">
              <h2 className="text-base font-semibold text-ink-800">⏰ {t("dash.revise.title")}</h2>
              <p className="mt-1 text-sm text-ink-600">{t("dash.revise.subtitle")}</p>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {dueRevisions.map((d) => (
                  <li
                    key={d.topicId}
                    className="flex items-center justify-between gap-2 rounded-md border border-violet-200 bg-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">{d.topicName}</p>
                      <p className="text-[11px] text-ink-500">
                        {d.subjectName} · ~{Math.round(d.retention * 100)}% {t("dash.revise.retained")}
                        {d.overdueDays > 0
                          ? ` · ${d.overdueDays} ${t("dash.revise.overdue.days")}`
                          : ` · ${t("dash.revise.due.today")}`}
                      </p>
                    </div>
                    <Link
                      href={`/exams/${d.examCode}/topics/${encodeURIComponent(d.topicCode)}`}
                      prefetch={false}
                      className="btn-secondary shrink-0 !px-2.5 !py-1 text-xs"
                    >
                      {t("dash.revise.cta")}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

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
                        {/* Human escalation at the weak-areas moment — the
                            Surge expert desk gives specific guidance (and
                            routes to nearby coaching where useful). */}
                        <div className="mt-2">
                          <TalkToTeacher
                            surface="weak-areas"
                            examCode={weakest3[0]?.exam.code ?? null}
                            topicCode={weakest3[0]?.topic.code ?? null}
                            contextLabel={weakest3[0]?.topic.name}
                            defaultName={session.user.name ?? null}
                            defaultEmail={session.user.email ?? null}
                            variant="link"
                            linkLabel="📞 Talk to a subject expert about these →"
                          />
                        </div>
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

// /dashboard — student home after sign-in. Bilingual.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";
import { ExamPicker, type ExamCard } from "@/components/ExamPicker";
import { computeExamTags, TAG_ORDER } from "@/lib/exam-tags";
import { buildCuratedSections, buildStateInfo } from "@/lib/exam-browse";
import { formatDisplayScorePct } from "@/lib/scoring";
import { computeScoreBoost } from "@/lib/focus-topics";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");
  const userId = session.user.id;
  const { t } = await getT();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  // Today's brief is keyed on UTC midnight — same key the cron uses
  const todayUtc = (() => {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  })();

  const [enrollments, recentAttempts, allExams, weakness, chatRecent, dailyBriefs] = await Promise.all([
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
    prisma.exam.findMany({
      where: { active: true },
      orderBy: [{ candidatesPerYear: "desc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        shortName: true,
        name: true,
        category: true,
        candidatesPerYear: true,
        state: true,
        _count: {
          select: {
            questions: { where: { validated: true } },
            mocks: { where: { userId: null } },
          },
        },
      },
    }),
    // Mastery snapshot — bottom 3 (weakest) + top 3 (strongest), per exam.
    prisma.weaknessMap.findMany({
      where: { userId },
      include: {
        topic: { select: { code: true, name: true } },
        exam: { select: { code: true, shortName: true } },
      },
      orderBy: { lastSeenAt: "desc" },
      take: 30,
    }),
    // Chat sessions in the last 30 days (with message-count + last-message
    // metadata so we can extract "topics asked about").
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
    // Today's daily briefs (one per enrolled exam) — populated overnight by
    // /api/cron/daily-brief. Falls back gracefully if the cron hasn't run yet.
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

  // Right-rail "Score Boost" panel scope: the exam the student just took a
  // mock for. Falls back to the recommended exam, then to their first
  // enrollment. The panel is hidden when there's nothing useful to show.
  const boostExamId = (() => {
    const recent = recentAttempts[0];
    if (recent) {
      const enrolled = enrollments.find((e) => e.exam.code === recent.mock.exam.code);
      if (enrolled) return enrolled.examId;
    }
    if (recommendedExam) return recommendedExam.examId;
    if (enrollments[0]) return enrollments[0].examId;
    return null;
  })();
  const scoreBoost = boostExamId ? await computeScoreBoost(userId, boostExamId) : null;

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
              href={`/chat?examCode=${enrollments[0].exam.code}`}
              className="btn-secondary !py-2 !px-4 text-xs sm:text-sm"
            >
              {t("nav.tutor")}
            </Link>
          )}
        </div>

        <div className="mt-8 lg:grid lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-2 min-w-0">

        {/* Enrolled exams */}
        <section className="">
          <h2 className="text-base font-semibold text-ink-800">{t("dash.your.exams")}</h2>
          {enrollments.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-6 text-sm text-ink-500">
              {t("dash.no.enrollments")}
            </p>
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
                      className="btn-primary !py-1.5 !px-3 text-xs"
                    >
                      {t("dash.continue")}
                    </Link>
                    <Link
                      href={`/exams/${e.exam.code}#syllabus`}
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
                      href={`/chat?examCode=${enrollments[0].exam.code}`}
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
                      href={`/chat?examCode=${enrollments[0].exam.code}`}
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

        {/* ── Focus topics for the active boost exam ──────────────────── */}
        {scoreBoost && scoreBoost.focusTopics.length > 0 && (
          <section id="focus-topics" className="mt-10 scroll-mt-20">
            <h2 className="text-base font-semibold text-ink-800">
              {t("dash.focus.title")} {scoreBoost.exam.shortName}
            </h2>
            <p className="mt-1 text-sm text-ink-600">
              {t("dash.focus.subtitle.before")}{" "}
              <strong className="text-ink-900">+{scoreBoost.combinedExtraPct.toFixed(1)}%</strong>{" "}
              {t("dash.focus.subtitle.middle")}{" "}
              <strong className="text-ink-900">+{scoreBoost.combinedExtraMarks.toFixed(1)} {t("dash.focus.marks")}</strong>
              {scoreBoost.projectedRank && scoreBoost.currentRank && scoreBoost.projectedRank < scoreBoost.currentRank ? (
                <>
                  {" · "}
                  {t("dash.focus.rank.from")} <strong>#{scoreBoost.currentRank}</strong>{" "}
                  {t("dash.focus.rank.to")} <strong className="text-emerald-700">#{scoreBoost.projectedRank}</strong>
                </>
              ) : null}
              .
            </p>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {scoreBoost.focusTopics.map((ft) => (
                <li key={ft.topicId} className="rounded-md border border-ink-200 bg-white p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-semibold text-ink-900">{ft.topicName}</p>
                    <p className="shrink-0 text-xs text-ink-500">{Math.round(ft.currentMastery * 100)}%</p>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500">{ft.subjectName}</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full bg-saffron-500"
                      style={{ width: `${Math.round(ft.currentMastery * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-emerald-700">
                    {t("dash.focus.uplift.lead")} <strong>+{ft.estimatedExtraMarks.toFixed(1)} {t("dash.focus.marks")}</strong>{" "}
                    <span className="text-ink-500">{t("dash.focus.uplift.atTarget")}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/exams/${scoreBoost.exam.code}/topics/${encodeURIComponent(ft.topicCode)}`}
                      className="btn-primary !py-1.5 !px-3 text-xs"
                    >
                      {t("dash.focus.cta.study")}
                    </Link>
                    <Link
                      href={`/chat?examCode=${scoreBoost.exam.code}&topicCode=${encodeURIComponent(ft.topicCode)}&seed=${encodeURIComponent(`I'm weak in ${ft.topicName} for ${scoreBoost.exam.shortName}. Tutor me on this topic.`)}`}
                      className="btn-secondary !py-1.5 !px-3 text-xs"
                    >
                      {t("dash.focus.cta.ask")}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
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

        </div>{/* /lg:col-span-2 */}

        {/* ── Right rail: Score Boost summary ────────────────────────── */}
        {scoreBoost && scoreBoost.focusTopics.length > 0 && (
          <aside className="mt-10 lg:col-span-1 lg:mt-0 lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-md border border-saffron-200 bg-gradient-to-b from-saffron-50 to-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-saffron-800">
                {t("dash.boost.eyebrow")}
              </p>
              <h3 className="mt-1 text-base font-semibold text-ink-900">
                {t("dash.boost.title.before")} {scoreBoost.exam.shortName} {t("dash.boost.title.after")}
              </h3>

              {scoreBoost.latestScorePct != null && (
                <div className="mt-3 rounded-md border border-ink-200 bg-white px-3 py-2 text-xs">
                  <p className="text-ink-500">{t("dash.boost.latest")}</p>
                  <p className="mt-0.5">
                    <span className="text-lg font-bold text-ink-900 tabular-nums">
                      {formatDisplayScorePct(scoreBoost.latestScorePct)}
                    </span>
                    {scoreBoost.currentRank && (
                      <span className="ml-2 text-ink-500">
                        · {t("dash.boost.rank")} #{scoreBoost.currentRank}
                        {scoreBoost.totalCohort > 1 && (
                          <span className="text-ink-400"> / {scoreBoost.totalCohort}</span>
                        )}
                      </span>
                    )}
                  </p>
                </div>
              )}

              <p className="mt-3 text-xs font-medium uppercase tracking-wider text-ink-500">
                {t("dash.boost.focusOn")}
              </p>
              <ul className="mt-2 space-y-1.5">
                {scoreBoost.focusTopics.map((ft) => (
                  <li key={ft.topicId}>
                    <a
                      href="#focus-topics"
                      className="block rounded-md border border-ink-200 bg-white px-3 py-2 hover:border-saffron-400 hover:bg-saffron-50/40"
                    >
                      <p className="truncate text-xs font-medium text-ink-900">{ft.topicName}</p>
                      <p className="mt-0.5 text-[11px] text-ink-500">
                        {Math.round(ft.currentMastery * 100)}% →{" "}
                        <span className="font-medium text-emerald-700">
                          +{ft.estimatedExtraMarks.toFixed(1)} {t("dash.focus.marks")}
                        </span>
                      </p>
                    </a>
                  </li>
                ))}
              </ul>

              <div className="mt-3 rounded-md bg-saffron-100 px-3 py-2 text-xs text-ink-800">
                <p>
                  <strong>{t("dash.boost.combined")}:</strong>{" "}
                  +{scoreBoost.combinedExtraMarks.toFixed(1)} {t("dash.focus.marks")}{" "}
                  <span className="text-ink-500">(+{scoreBoost.combinedExtraPct.toFixed(1)}%)</span>
                </p>
                {scoreBoost.projectedRank &&
                  scoreBoost.currentRank &&
                  scoreBoost.projectedRank < scoreBoost.currentRank && (
                    <p className="mt-1 text-emerald-800">
                      {t("dash.boost.rankUplift")} #{scoreBoost.currentRank} →{" "}
                      <strong>#{scoreBoost.projectedRank}</strong>
                    </p>
                  )}
                {scoreBoost.projectedScorePct != null && (
                  <p className="mt-1 text-ink-600">
                    {t("dash.boost.projected")}{" "}
                    <strong className="text-ink-900">
                      {formatDisplayScorePct(scoreBoost.projectedScorePct)}
                    </strong>
                  </p>
                )}
              </div>

              <a
                href="#focus-topics"
                className="mt-4 inline-block text-xs font-medium text-saffron-700 hover:text-saffron-800"
              >
                {t("dash.boost.cta")} ↓
              </a>
            </div>
          </aside>
        )}

        </div>{/* /lg:grid */}

        {/* Other exams — curated browse (search + chips + state grid) */}
        {otherExamCards.length > 0 && (
          <section className="mt-10">
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

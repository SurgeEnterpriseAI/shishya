// /exams/:code — exam landing page (bilingual).

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";
import { StartMockButton } from "./StartMockButton";
import { formatDisplayScorePct } from "@/lib/scoring";

export default async function ExamPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/exams`);
  const userId = session.user.id;
  const { code } = await params;
  const { locale, t } = await getT();

  const exam = await prisma.exam.findUnique({
    where: { code },
    include: {
      subjects: {
        orderBy: { orderIdx: "asc" },
        include: {
          topics: {
            where: { parentId: null },
            orderBy: { orderIdx: "asc" },
            include: { children: true },
          },
        },
      },
    },
  });
  if (!exam) notFound();

  const [
    enrollment,
    weakness,
    recent,
    validatedQuestionCount,
    newsItems,
    importantDates,
    pyqYears,
    systemMocks,
    leaderboard,
    myBest,
  ] = await Promise.all([
    prisma.enrollment.findUnique({
      where: { userId_examId: { userId, examId: exam.id } },
    }),
    prisma.weaknessMap.findMany({
      where: { userId, examId: exam.id },
      include: { topic: true },
      orderBy: { masteryScore: "asc" },
      take: 5,
    }),
    prisma.attempt.findMany({
      where: { userId, mock: { examId: exam.id }, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } },
      include: { mock: true },
      orderBy: { startedAt: "desc" },
      take: 5,
    }),
    prisma.question.count({ where: { examId: exam.id, validated: true } }),
    prisma.examNewsItem.findMany({
      where: { examId: exam.id },
      orderBy: { publishedAt: "desc" },
      take: 5,
    }),
    prisma.examImportantDate.findMany({
      where: { examId: exam.id },
      orderBy: { date: "asc" },
      take: 10,
    }),
    prisma.question.groupBy({
      by: ["pyqYear"],
      where: { examId: exam.id, source: "PYQ", pyqYear: { not: null } },
      _count: true,
      orderBy: { pyqYear: "desc" },
    }),
    prisma.mock.findMany({
      where: { examId: exam.id, userId: null },
      // Newest auto-mocks first if any exist, else fall back to creation order
      orderBy: [{ createdAt: "asc" }],
      take: 24,
      select: { id: true, title: true, type: true, questionIds: true, config: true },
    }),
    prisma.attempt.findMany({
      where: { mock: { examId: exam.id }, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, scorePct: { not: null } },
      orderBy: { scorePct: "desc" },
      take: 10,
      select: {
        id: true,
        scorePct: true,
        userId: true,
        finishedAt: true,
        user: { select: { name: true } },
      },
    }),
    prisma.attempt.findFirst({
      where: { userId, mock: { examId: exam.id }, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, scorePct: { not: null } },
      orderBy: { scorePct: "desc" },
      select: { id: true, scorePct: true, percentile: true, rank: true, finishedAt: true },
    }),
  ]);

  const isEnrolled = !!enrollment;
  const hasContent = validatedQuestionCount > 0;

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/dashboard" className="hover:text-ink-800">{t("nav.dashboard")}</Link> · {t("nav.exams")} · {exam.shortName}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">{exam.shortName}</h1>
        <p className="mt-1 text-sm text-ink-600">{exam.name}</p>
        <p className="mt-4 max-w-3xl text-sm text-ink-700">{exam.description}</p>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink-600">
          <span className="rounded-full bg-white border border-ink-200 px-3 py-1">{exam.totalQuestions} {t("exam.totalQs")}</span>
          <span className="rounded-full bg-white border border-ink-200 px-3 py-1">{exam.totalMarks} {t("exam.marks")}</span>
          <span className="rounded-full bg-white border border-ink-200 px-3 py-1">{exam.durationMin} {t("exam.minutes")}</span>
          <span className="rounded-full bg-white border border-ink-200 px-3 py-1">
            {t("exam.negative")}: {exam.negativeMark === 0 ? t("exam.no.negative") : `−${exam.negativeMark}`}
          </span>
        </div>

        {/* Action panel */}
        <div className="mt-8 rounded-md border border-ink-200 bg-white p-6">
          {!hasContent ? (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-600">{t("exam.no.content")}</p>
              <Link href={`/chat?examCode=${exam.code}`} className="btn-secondary !py-2 !px-4 text-xs sm:text-sm">
                {t("nav.tutor")}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink-900">
                  {isEnrolled ? t("exam.action.continue") : t("exam.action.start")}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {isEnrolled ? t("exam.action.continue.body") : t("exam.action.start.body")}
                </p>
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <Link
                  href={`/chat?examCode=${exam.code}`}
                  className="btn-secondary !py-2 !px-4 text-xs sm:text-sm"
                >
                  {t("nav.tutor")}
                </Link>
                <StartMockButton
                  examCode={exam.code}
                  hasHistory={isEnrolled && recent.length > 0}
                  labels={{
                    adaptive: t("exam.cta.adaptive"),
                    diagnostic: t("exam.cta.diagnostic"),
                    firstDiagnostic: t("exam.cta.firstDiagnostic"),
                    building: t("exam.cta.building"),
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Previous Papers ─────────────────────────────────────────── */}
        <section id="pyqs" className="mt-10 scroll-mt-20">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-ink-800">{t("exam.pyq.title")}</h2>
            <span className="text-xs text-ink-500">
              {pyqYears.reduce((a, r) => a + r._count, 0)} {t("exam.pyq.totalQs")}
            </span>
          </div>
          {pyqYears.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">
              {t("exam.pyq.empty")}
            </p>
          ) : (
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {pyqYears.map((y) => (
                <li key={y.pyqYear ?? 0} className="rounded-md border border-ink-200 bg-white p-3">
                  <p className="text-lg font-semibold text-ink-900">{y.pyqYear}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {y._count} {t("exam.pyq.questions")}
                  </p>
                  <Link
                    href={`/exams/${exam.code}/pyq/${y.pyqYear}`}
                    className="mt-2 inline-block text-xs font-medium text-saffron-700 hover:text-saffron-800"
                  >
                    {t("exam.pyq.take")} →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Mock Tests ──────────────────────────────────────────────── */}
        <section id="mocks" className="mt-10 scroll-mt-20">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-ink-800">{t("exam.mocks.title")}</h2>
            <Link
              href={`/exams/${exam.code}/attempts`}
              className="text-xs font-medium text-saffron-700 hover:text-saffron-800"
            >
              {t("exam.mocks.allAttempts")} →
            </Link>
          </div>
          {systemMocks.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">
              {t("exam.mocks.empty")}
            </p>
          ) : (
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {systemMocks.map((m) => (
                <li key={m.id} className="rounded-md border border-ink-200 bg-white p-4">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium text-ink-900">{m.title}</p>
                    <span className="rounded-full border border-ink-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-600">
                      {m.type}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-500">
                    {m.questionIds.length} {t("exam.pyq.questions")}
                    {(m.config as any)?.durationMin ? ` · ${(m.config as any).durationMin} ${t("exam.minutes")}` : ""}
                  </p>
                  <Link
                    href={`/mocks/${m.id}`}
                    className="mt-2 inline-block text-xs font-medium text-saffron-700 hover:text-saffron-800"
                  >
                    {t("exam.mocks.take")} →
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {recent.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-medium uppercase tracking-wide text-ink-500">
                {t("exam.mocks.recent")}
              </h3>
              <ul className="mt-2 space-y-1.5">
                {recent.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded-md border border-ink-200 bg-white px-3 py-2 text-sm">
                    <span className="text-ink-800">{a.mock.title}</span>
                    <span className="flex items-center gap-3 text-xs text-ink-500">
                      <span>{formatDisplayScorePct(a.scorePct)}</span>
                      <Link href={`/attempts/${a.id}/results`} className="font-medium text-saffron-700 hover:text-saffron-800">
                        {t("exam.mocks.review")} →
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ── Shishya Interaction ─────────────────────────────────────── */}
        <section id="shishya" className="mt-10 scroll-mt-20">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-ink-800">{t("exam.shishya.title")}</h2>
            <Link href={`/chat?examCode=${exam.code}`} className="text-xs font-medium text-saffron-700 hover:text-saffron-800">
              {t("exam.shishya.openChat")} →
            </Link>
          </div>
          <p className="mt-1 text-sm text-ink-600">{t("exam.shishya.body")}</p>
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {([
              ["exam.shishya.prompt.weakest", `Quiz me on my weakest ${exam.shortName} topic`],
              ["exam.shishya.prompt.explain", `Explain the concept I got wrong most in my last ${exam.shortName} mock`],
              ["exam.shishya.prompt.plan", `Make me a 30-minute study plan for ${exam.shortName} today`],
              ["exam.shishya.prompt.syllabus", `Walk me through the ${exam.shortName} syllabus and which topics carry highest weight`],
            ] as const).map(([labelKey, q]) => (
              <li key={labelKey}>
                <Link
                  href={`/chat?examCode=${exam.code}&seed=${encodeURIComponent(q)}`}
                  className="block rounded-md border border-ink-200 bg-white p-4 text-sm text-ink-800 hover:border-saffron-300 hover:bg-saffron-50/40"
                >
                  <span className="block font-medium">{t(labelKey)}</span>
                  <span className="mt-1 block text-xs text-ink-500">{q}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Rank & Leaderboard ──────────────────────────────────────── */}
        <section id="rank" className="mt-10 scroll-mt-20">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-ink-800">{t("exam.rank.title")}</h2>
            <span className="text-xs text-ink-500">{t("exam.rank.subtitle")}</span>
          </div>
          {!myBest ? (
            <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">
              {t("exam.rank.empty")}
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-saffron-300 bg-saffron-50 p-4">
                <p className="text-xs uppercase tracking-wide text-saffron-800">{t("exam.rank.bestScore")}</p>
                <p className="mt-1 text-3xl font-bold text-ink-900 tabular-nums">{formatDisplayScorePct(myBest.scorePct)}</p>
              </div>
              <div className="rounded-md border border-ink-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-ink-500">{t("exam.rank.percentile")}</p>
                <p className="mt-1 text-3xl font-bold text-ink-900 tabular-nums">
                  {myBest.percentile?.toFixed(1) ?? "—"}
                </p>
              </div>
              <div className="rounded-md border border-ink-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-ink-500">{t("exam.rank.rank")}</p>
                <p className="mt-1 text-3xl font-bold text-ink-900 tabular-nums">
                  {myBest.rank ? `#${myBest.rank}` : "—"}
                </p>
              </div>
            </div>
          )}

          {leaderboard.length > 0 && (
            <div className="mt-5 overflow-hidden rounded-md border border-ink-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-ink-200 bg-ink-50/60 text-left text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="w-14 px-4 py-2 font-medium">#</th>
                    <th className="px-4 py-2 font-medium">{t("exam.rank.student")}</th>
                    <th className="px-4 py-2 text-right font-medium">{t("exam.rank.score")}</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, idx) => {
                    const display = displayName(row.user?.name, row.userId);
                    const isMe = row.userId === userId;
                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-ink-100 last:border-b-0 ${isMe ? "bg-saffron-50/40" : ""}`}
                      >
                        <td className="px-4 py-2 tabular-nums text-ink-600">{idx + 1}</td>
                        <td className="px-4 py-2 text-ink-800">
                          {display}
                          {isMe && <span className="ml-2 rounded-full bg-saffron-200 px-2 py-0.5 text-[10px] font-medium text-saffron-900">{t("exam.rank.you")}</span>}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatDisplayScorePct(row.scorePct)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Performance Analysis ────────────────────────────────────── */}
        {recent.length > 0 && (
          <section id="analysis" className="mt-10 scroll-mt-20">
            <h2 className="text-base font-semibold text-ink-800">{t("exam.analysis.title")}</h2>
            <p className="mt-1 text-sm text-ink-600">{t("exam.analysis.body")}</p>

            {/* Score-over-time mini-chart (text + bars) */}
            <div className="mt-4 rounded-md border border-ink-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                {t("exam.analysis.lastFive")}
              </p>
              <ul className="mt-3 space-y-2">
                {[...recent].reverse().map((a) => {
                  const pct = Math.max(0, a.scorePct ?? 0);
                  return (
                    <li key={a.id} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-xs text-ink-500">
                        {a.startedAt.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className="h-full bg-saffron-500"
                          style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
                        />
                      </div>
                      <span className="w-14 shrink-0 text-right text-sm font-medium tabular-nums text-ink-800">
                        {formatDisplayScorePct(a.scorePct)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-ink-500">
                {t("exam.analysis.trend")}:{" "}
                <span className="font-medium text-ink-700">{describeTrend(recent.map((a) => a.scorePct ?? 0))}</span>
              </p>
            </div>
          </section>
        )}

        {/* News + Important Dates */}
        {(newsItems.length > 0 || importantDates.length > 0) && (
          <section className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* News */}
            <div>
              <h2 className="text-base font-semibold text-ink-800">{t("timeline.news.title")}</h2>
              {newsItems.length === 0 ? (
                <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">
                  {t("timeline.news.empty")}
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {newsItems.map((n) => {
                    const ageDays = Math.floor((Date.now() - n.publishedAt.getTime()) / (24 * 60 * 60 * 1000));
                    return (
                      <li key={n.id} className="rounded-md border border-ink-200 bg-white p-4">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-sm font-semibold text-ink-900">{n.title}</h3>
                          <span className="shrink-0 text-xs text-ink-500">
                            {ageDays === 0 ? t("timeline.dates.today")
                              : ageDays === 1 ? `1 ${t("disc.daysAgo")}`
                              : `${ageDays} ${t("disc.daysAgo")}`}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-ink-700">{n.body}</p>
                        {n.source && (
                          <a
                            href={n.source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-xs font-medium text-saffron-700 hover:text-saffron-800"
                          >
                            Source →
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Important Dates */}
            <div>
              <h2 className="text-base font-semibold text-ink-800">{t("timeline.dates.title")}</h2>
              {importantDates.length === 0 ? (
                <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">
                  {t("timeline.dates.empty")}
                </p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {importantDates.map((d) => {
                    const days = Math.ceil((d.date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                    const passed = days < 0;
                    let when: string;
                    if (passed) when = t("timeline.dates.passed");
                    else if (days === 0) when = t("timeline.dates.today");
                    else if (days === 1) when = t("timeline.dates.tomorrow");
                    else when = `${days} ${t("timeline.dates.daysAway")}`;
                    return (
                      <li
                        key={d.id}
                        className={
                          d.isExamDay
                            ? "rounded-md border-2 border-saffron-400 bg-saffron-50 p-4"
                            : passed
                            ? "rounded-md border border-ink-200 bg-ink-50/40 p-4 opacity-60"
                            : "rounded-md border border-ink-200 bg-white p-4"
                        }
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-medium text-ink-900">
                            {d.isExamDay && <span className="mr-1">📌</span>}
                            {d.label}
                          </p>
                          <span className={d.isExamDay ? "shrink-0 text-xs font-semibold text-saffron-800" : "shrink-0 text-xs text-ink-500"}>
                            {when}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-ink-500">
                          {d.date.toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                        </p>
                        {d.notes && <p className="mt-1.5 text-xs text-ink-600">{d.notes}</p>}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </section>
        )}

        {/* Weakness map */}
        {weakness.length > 0 && (
          <section className="mt-10">
            <h2 className="text-base font-semibold text-ink-800">{t("exam.weakest")}</h2>
            <ul className="mt-3 space-y-2">
              {weakness.map((w) => (
                <li key={w.id} className="rounded-md border border-ink-200 bg-white p-3">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium text-ink-900">{w.topic.name}</p>
                    <p className="text-xs text-ink-500">
                      {w.correctCount}/{w.attemptsCount}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full bg-saffron-500"
                      style={{ width: `${Math.round(w.masteryScore * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Syllabus */}
        <section id="syllabus" className="mt-10 scroll-mt-20">
          <h2 className="text-base font-semibold text-ink-800">{t("exam.syllabus")}</h2>
          <p className="mt-1 text-xs text-ink-500">{t("exam.syllabus.clickHint")}</p>
          <div className="mt-4 space-y-6">
            {exam.subjects.map((s) => (
              <div key={s.id}>
                <h3 className="text-sm font-semibold text-ink-900">{s.name}</h3>
                <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {s.topics.map((tp) => (
                    <li key={tp.id}>
                      <Link
                        href={`/exams/${exam.code}/topics/${tp.code}`}
                        className="group block rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700 transition-colors hover:border-saffron-400 hover:bg-saffron-50/40"
                      >
                        <p className="font-medium text-ink-800 group-hover:text-saffron-800">{tp.name}</p>
                        {tp.description && (
                          <p className="mt-0.5 text-xs text-ink-500 line-clamp-2">{tp.description}</p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function displayName(name: string | null | undefined, userId: string): string {
  if (!name) return `Student #${userId.slice(-4).toUpperCase()}`;
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function describeTrend(scores: number[]): string {
  if (scores.length < 2) return "—";
  const first = scores[scores.length - 1];
  const last = scores[0];
  const delta = last - first;
  if (Math.abs(delta) < 1.5) return "stable";
  return delta > 0 ? `up ${delta.toFixed(1)}%` : `down ${Math.abs(delta).toFixed(1)}%`;
}

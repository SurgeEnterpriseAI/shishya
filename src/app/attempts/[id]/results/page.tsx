// /attempts/:id/results — score, diagnostic, weakness map, per-Q review.
// Server Component fetches data; Review section is a client component for
// on-demand explanations.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";
import { ResultsReview } from "./ResultsReview";
import { RankCard } from "@/components/RankCard";
import { formatDisplayScorePct } from "@/lib/scoring";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;

  // Fetch attempt first (cheap, 1 row). Once we know it's submitted +
  // belongs to this user, fan out the heavy reads (100 questions, rank
  // bands, locale) in parallel.
  const attempt = await prisma.attempt.findUnique({
    where: { id },
    include: {
      mock: {
        include: {
          exam: { select: { code: true, shortName: true } },
        },
      },
    },
  });
  if (!attempt) notFound();
  if (attempt.userId !== session.user.id) redirect("/dashboard");

  const submitted = attempt.status === "SUBMITTED" || attempt.status === "AUTO_SUBMITTED";
  if (!submitted) redirect(`/mocks/${attempt.mockId}`);

  const [questions, rankBands, tt] = await Promise.all([
    prisma.question.findMany({
      where: { id: { in: attempt.mock.questionIds } },
      include: { topic: { select: { code: true, name: true } } },
    }),
    prisma.examRankBand.findMany({
      where: { examId: attempt.mock.examId },
      orderBy: { orderIdx: "asc" },
      select: {
        scorePctMin: true,
        scorePctMax: true,
        rankMin: true,
        rankMax: true,
        label: true,
        outcomes: true,
        source: true,
      },
    }),
    getT(),
  ]);
  const { t, locale } = tt;
  const qById = new Map(questions.map((q) => [q.id, q]));

  const answers = (attempt.answers as any[]) ?? [];
  const answersByQid = new Map(answers.map((a) => [a.questionId, a]));

  const orderedQs = attempt.mock.questionIds.map((qid) => {
    const q = qById.get(qid);
    if (!q) return null;
    const a = answersByQid.get(qid) ?? null;
    return {
      id: q.id,
      body: q.body,
      options: q.options as { key: string; text: string }[],
      answerKey: q.answerKey,
      solution: q.solution,
      topic: q.topic,
      difficulty: q.difficulty,
      chosen: a?.chosen ?? null,
      correct: a?.correct ?? false,
      timeSec: a?.timeSec ?? 0,
      marked: a?.marked ?? false,
    };
  }).filter((x): x is NonNullable<typeof x> => Boolean(x));

  const correctCount = orderedQs.filter((q) => q.correct).length;
  const wrongCount = orderedQs.filter((q) => q.chosen != null && !q.correct).length;
  const skipped = orderedQs.length - correctCount - wrongCount;
  // rankBands fetched above in the parallel Promise.all.

  const topicScores = (attempt.topicScores as Record<string, any>) ?? {};
  const topicArr = Object.values(topicScores)
    .map((t: any) => ({
      code: t.topicCode,
      name: t.topicName,
      correct: t.correct,
      total: t.total,
      score: t.score,
    }))
    .sort((a: any, b: any) => a.score - b.score);

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/dashboard" className="hover:text-ink-800">{t("nav.dashboard")}</Link> ·{" "}
          <Link href={`/exams/${attempt.mock.exam.code}`} className="hover:text-ink-800">
            {attempt.mock.exam.shortName}
          </Link>{" "}
          · {t("results.title.results")}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">{attempt.mock.title}</h1>

        {/* Score summary
            ──────────────
            Two distinct percentages so the negative-marking math is
            obvious. "Marks" is the official-exam-equivalent (3×+4 − 7×−1
            = 5/48 = 10.4%), "Accuracy" is the demoralisation-free hit
            rate (3 right out of 12). Showing both side-by-side avoids
            the "but I got 3 right, why does it say 10%?" confusion. */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ScoreCard
            label={`${t("results.score")} (marks)`}
            primary={`${(attempt.scoreRaw ?? 0).toFixed(0)} / ${(attempt.scoreMax ?? 0).toFixed(0)}`}
            secondary={`${formatDisplayScorePct(attempt.scorePct)} · with negative marking`}
            accent="primary"
          />
          <ScoreCard
            label="Accuracy"
            primary={
              orderedQs.length > 0
                ? `${Math.round((correctCount / orderedQs.length) * 100)}%`
                : "—"
            }
            secondary={`${correctCount} / ${orderedQs.length} ${t("results.correct").toLowerCase()}`}
            accent="ok"
          />
          <ScoreCard
            label={t("results.wrong")}
            primary={String(wrongCount)}
            secondary={skipped > 0 ? `${skipped} ${t("results.skipped")}` : ""}
            accent={wrongCount > 0 ? "warn" : "muted"}
          />
          <ScoreCard
            label={t("results.time")}
            primary={formatTime(attempt.durationSec ?? 0)}
            secondary=""
          />
        </div>

        {/* ── Rank prediction ───────────────────────────────────────────
            Right under the score cards so the student sees "what does
            this score get me in the real exam" before they dive into
            per-topic mastery + per-Q review. attempt.scorePct is
            already stored as a percentage (0-100), not a fraction. */}
        {rankBands.length > 0 && (
          <div className="mt-6">
            <RankCard
              scorePct={attempt.scorePct ?? 0}
              examShortName={attempt.mock.exam.shortName}
              bands={rankBands}
              source={rankBands[0]?.source ?? null}
            />
          </div>
        )}

        <div className="mt-2 lg:grid lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-2 min-w-0">

        {/* Topic mastery */}
        {topicArr.length > 0 && (
          <section className="mt-10">
            <h2 className="text-base font-semibold text-ink-800">{t("results.topicHeader")}</h2>
            <ul className="mt-3 space-y-2">
              {topicArr.map((tp: any) => (
                <li key={tp.code}>
                  <Link
                    href={`/chat?examCode=${attempt.mock.exam.code}&topicCode=${encodeURIComponent(tp.code)}&seed=${encodeURIComponent(`On my last ${attempt.mock.exam.shortName} mock I got ${tp.correct}/${tp.total} on ${tp.name}. Help me improve on this topic.`)}`}
                    className="block rounded-md border border-ink-200 bg-white p-3 hover:border-saffron-400 hover:bg-saffron-50/30"
                  >
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm font-medium text-ink-900">{tp.name}</p>
                      <p className="text-xs text-ink-500">
                        {tp.correct}/{tp.total} · {Math.round(tp.score * 100)}%
                      </p>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100">
                      <div
                        className={
                          tp.score >= 0.7
                            ? "h-full bg-emerald-500"
                            : tp.score >= 0.4
                            ? "h-full bg-amber-500"
                            : "h-full bg-rose-500"
                        }
                        style={{ width: `${Math.round(tp.score * 100)}%` }}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Per-question review */}
        <section className="mt-10">
          <h2 className="text-base font-semibold text-ink-800">{t("results.review.title")}</h2>
          <p className="mt-1 text-xs text-ink-500">{t("results.review.subtitle")}</p>
          <ResultsReview
            questions={orderedQs}
            attemptId={attempt.id}
            examCode={attempt.mock.exam.code}
            examShortName={attempt.mock.exam.shortName}
            initialLocale={locale}
          />
        </section>

        </div>{/* /lg:col-span-2 */}

        {/* ── Right rail: review actions, sticky on lg+ ───────────────────
            150-question reviews can be a long scroll. Sticking the three
            CTAs on the right means students don't have to scroll all the
            way down to take another mock / open Shishya / go home. On
            mobile the rail stacks under the question list (the CTAs are
            still reachable, just inline rather than floating). */}
        <aside className="mt-10 lg:col-span-1 lg:mt-0 lg:sticky lg:top-20 lg:self-start space-y-3">

          {/* Compact score recap — useful context while reviewing because
              the big score cards at the top of the page have scrolled
              out of view by the time you're in question 100+. */}
          <div className="rounded-md border border-saffron-200 bg-saffron-50 p-3 text-xs">
            <p className="text-ink-500 uppercase tracking-wider">{t("results.score")}</p>
            <p className="mt-0.5 text-lg font-bold text-ink-900 tabular-nums">
              {formatDisplayScorePct(attempt.scorePct)}
            </p>
            <p className="text-ink-600">
              {correctCount} {t("results.correct").toLowerCase()} · {wrongCount} {t("results.wrong").toLowerCase()}
              {skipped > 0 ? ` · ${skipped} ${t("results.skipped")}` : ""}
            </p>
          </div>

          <Link
            href={`/exams/${attempt.mock.exam.code}`}
            className="btn-primary block w-full !py-2 !px-4 text-center text-sm"
          >
            {t("results.cta.another")}
          </Link>

          <Link
            href={`/chat?examCode=${attempt.mock.exam.code}${
              topicArr.length > 0
                ? `&topicCode=${encodeURIComponent(topicArr[0].code)}`
                : ""
            }&seed=${encodeURIComponent(
              `I just finished a ${attempt.mock.exam.shortName} mock and scored ${formatDisplayScorePct(attempt.scorePct)} (${correctCount} correct, ${wrongCount} wrong, ${skipped} skipped). ${
                topicArr.length > 0
                  ? `My weakest topic was ${topicArr[0].name} (${topicArr[0].correct}/${topicArr[0].total}). `
                  : ""
              }Walk me through what I should focus on next.`
            )}`}
            className="btn-secondary block w-full !py-2 !px-4 text-center text-sm"
          >
            {t("results.cta.askShishya")}
          </Link>

          <Link
            href="/dashboard"
            className="btn-secondary block w-full !py-2 !px-4 text-center text-sm"
          >
            {t("results.cta.back")}
          </Link>

        </aside>

        </div>{/* /lg:grid */}
      </section>
    </main>
  );
}

function ScoreCard({
  label,
  primary,
  secondary,
  accent,
}: {
  label: string;
  primary: string;
  secondary: string;
  accent?: "primary" | "ok" | "warn" | "muted";
}) {
  const tone =
    accent === "primary"
      ? "border-saffron-200 bg-saffron-50"
      : accent === "ok"
      ? "border-emerald-200 bg-emerald-50"
      : accent === "warn"
      ? "border-amber-200 bg-amber-50"
      : "border-ink-200 bg-white";
  return (
    <div className={`rounded-md border p-4 ${tone}`}>
      <p className="text-xs uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink-900">{primary}</p>
      <p className="mt-0.5 text-xs text-ink-500">{secondary}</p>
    </div>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

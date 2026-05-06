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

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const { t } = await getT();

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

  const questions = await prisma.question.findMany({
    where: { id: { in: attempt.mock.questionIds } },
    include: { topic: { select: { code: true, name: true } } },
  });
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

        {/* Score summary */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <ScoreCard
            label={t("results.score")}
            primary={`${(attempt.scorePct ?? 0).toFixed(1)}%`}
            secondary={`${(attempt.scoreRaw ?? 0).toFixed(1)} / ${(attempt.scoreMax ?? 0).toFixed(0)}`}
            accent="primary"
          />
          <ScoreCard
            label={t("results.correct")}
            primary={String(correctCount)}
            secondary={`/ ${orderedQs.length}`}
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

        {/* Topic mastery */}
        {topicArr.length > 0 && (
          <section className="mt-10">
            <h2 className="text-base font-semibold text-ink-800">{t("results.topicHeader")}</h2>
            <ul className="mt-3 space-y-2">
              {topicArr.map((t: any) => (
                <li key={t.code} className="rounded-md border border-ink-200 bg-white p-3">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium text-ink-900">{t.name}</p>
                    <p className="text-xs text-ink-500">
                      {t.correct}/{t.total} · {Math.round(t.score * 100)}%
                    </p>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className={
                        t.score >= 0.7
                          ? "h-full bg-emerald-500"
                          : t.score >= 0.4
                          ? "h-full bg-amber-500"
                          : "h-full bg-rose-500"
                      }
                      style={{ width: `${Math.round(t.score * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Per-question review */}
        <section className="mt-10">
          <h2 className="text-base font-semibold text-ink-800">{t("results.review.title")}</h2>
          <p className="mt-1 text-xs text-ink-500">{t("results.review.subtitle")}</p>
          <ResultsReview questions={orderedQs} />
        </section>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href={`/exams/${attempt.mock.exam.code}`} className="btn-primary !py-2 !px-4 text-sm">
            {t("results.cta.another")}
          </Link>
          <Link href="/dashboard" className="btn-secondary !py-2 !px-4 text-sm">
            {t("results.cta.back")}
          </Link>
        </div>
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

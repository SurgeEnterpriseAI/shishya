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
import { ShareScoreButton } from "./ShareScoreButton";
import { FreshQuestionsButton } from "./FreshQuestionsButton";
import { NextMockButton } from "./NextMockButton";
import { TalkToTeacher } from "@/components/TalkToTeacher";
import { formatDisplayScorePct } from "@/lib/scoring";
import { liveTestRank } from "@/lib/live-test";
import { CoachEntry } from "@/components/CoachEntry";
import { PeerProofLine } from "@/components/PeerProofLine";
import { PulseAsk } from "@/components/PulseAsk";
import { CoachNextTask } from "@/components/CoachNextTask";
import { examPeerProof } from "@/lib/peer-proof";

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
      where: { examId: attempt.mock.examId, archivedAt: null },
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

  // Personal-best detection — the celebration moment (variable reward:
  // beating your own record is the most motivating comparison there is,
  // and it's always about the student's own progress, never others').
  const prevBest = await prisma.attempt
    .findFirst({
      where: {
        userId: session.user.id,
        mock: { examId: attempt.mock.examId },
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
        scorePct: { not: null },
        id: { not: attempt.id },
        finishedAt: { lt: attempt.finishedAt ?? new Date() },
      },
      orderBy: { scorePct: "desc" },
      select: { scorePct: true },
    })
    .catch(() => null);
  const isPersonalBest =
    prevBest?.scorePct != null &&
    attempt.scorePct != null &&
    attempt.scorePct > prevBest.scorePct;
  const isFirstMock = prevBest == null;

  // One-time setup nudge (23 Aug 2026): the onboarding wizard had 8
  // completions EVER because nothing routed new users to it. The moment
  // after a first mock is when "which exams/state are you aiming for?"
  // makes sense — it personalises the hub, state exams and emails. Shown
  // only while onbCompletedAt is null and within their first 3 mocks.
  const onbRow = await prisma.$queryRaw<{ done: boolean; n: bigint }[]>`
    SELECT (u."onbCompletedAt" IS NOT NULL) AS done,
      (SELECT COUNT(*) FROM "Attempt" a WHERE a."userId" = u.id AND a.status IN ('SUBMITTED','AUTO_SUBMITTED')) AS n
    FROM "User" u WHERE u.id = ${session.user.id}`.catch(() => [] as { done: boolean; n: bigint }[]);
  const showSetup = !!onbRow[0] && !onbRow[0].done && Number(onbRow[0].n) <= 3;

  // All-India Live Test rank — only for live-test mocks; rank among
  // each user's FIRST submitted attempt (re-attempts don't re-rank).
  const airRank =
    attempt.mock.generatedBy === "live-test"
      ? await liveTestRank(attempt.mock.id, session.user.id).catch(() => null)
      : null;

  const peerProof = await examPeerProof(attempt.mock.examId, session.user.id).catch(() => null);

  // Coach entry is suppressed for students who already have a plan.
  const hasCoachPlan =
    (
      await prisma
        .$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) n FROM "CoachPlan" WHERE "userId" = ${session.user.id}`
        .catch(() => [{ n: BigInt(0) }])
    )[0].n > BigInt(0);
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

  // Lever #3 — the "explain my mistakes" tutor seed. Results is the peak
  // tutor moment (they just got questions wrong), but the AI tutor is badly
  // under-discovered (journey data: ~50s avg, 43 min in 14 days). This seeds
  // a real conversation about the specific wrong topics.
  const weakTopicNames = topicArr
    .filter((t: any) => t.score < 1)
    .slice(0, 3)
    .map((t: any) => t.name);
  const mistakeSeed =
    `I just took a ${attempt.mock.exam.shortName} mock and got ${wrongCount} ` +
    `question${wrongCount === 1 ? "" : "s"} wrong` +
    (weakTopicNames.length ? ` — weakest: ${weakTopicNames.join(", ")}` : "") +
    `. Go through my mistakes one by one: why the right answer is right, and how to get it next time.`;

  // Score-spiral detection (founder call, 16 Aug): an aspirant re-testing
  // 3+ times in a day with scores stuck under 35% is doing the WRONG kind
  // of effort — testing as if repetition were study. The intervention
  // redirects (never shames): it's strategy, not mugging, that moves a
  // score — and Shishya builds them a personal one.
  const istMidnight = new Date(
    Math.floor((Date.now() + 5.5 * 3600_000) / 86_400_000) * 86_400_000 - 5.5 * 3600_000,
  );
  const spiralRows = await prisma.$queryRaw<{ n: number; low: number }[]>`
    SELECT COUNT(*)::int AS n,
      COUNT(*) FILTER (WHERE "scorePct" < 35)::int AS low
    FROM "Attempt"
    WHERE "userId" = ${session.user.id} AND status IN ('SUBMITTED','AUTO_SUBMITTED')
      AND "finishedAt" >= ${istMidnight}`;
  const isSpiral =
    (attempt.scorePct ?? 100) < 35 &&
    (spiralRows[0]?.n ?? 0) >= 3 &&
    (spiralRows[0]?.low ?? 0) >= 3;
  const negativeGuesses = wrongCount;
  // Non-intrusion rule: at most ONE nudge above the score. When a
  // low-score intervention (spiral / soft-landing) owns the page, the
  // setup card waits for a later mock; the spiral block already links
  // the report, so the report card hides under it too.
  const softLanding = !isSpiral && (attempt.scorePct ?? 0) < 30 && topicArr.length > 0;
  const intervention = isSpiral || softLanding;

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

        {attempt.status === "AUTO_SUBMITTED" && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            ⏱️ Time ran out — this attempt was auto-submitted with whatever you&apos;d
            answered. In the real exam the clock is final too; use this to pace your next run.
          </div>
        )}

        {/* Post-mock doorway to the personal system (23 Aug 2026): the
            one-line link got ~11 report visitors a WEEK. Post-mock is the
            moment "where am I overall / what should I study now?" — so the
            report and today's study pack are offered as two visible
            actions, still no popup. */}
        {!isSpiral && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-saffron-200 bg-saffron-50/60 px-3 py-2">
          <span className="text-xs font-semibold text-ink-800">📊 This test just updated your personal system:</span>
          <Link href="/me/report" className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-saffron-800 ring-1 ring-saffron-300 hover:bg-saffron-100">
            My report — strong & weak areas →
          </Link>
          <Link href="/me/report/pack" className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-saffron-800 ring-1 ring-saffron-300 hover:bg-saffron-100">
            Today&apos;s study pack (built from this) →
          </Link>
        </div>
        )}

        {showSetup && !intervention && (
          <div className="mt-3 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-xs text-ink-700">
            <span className="font-semibold text-ink-900">20-second setup:</span> tell Shishya your
            target exams, state and stage — your hub, state exams and emails get personalised.{" "}
            <Link href="/onboarding?from=results" className="font-semibold text-saffron-700 underline-offset-2 hover:underline">
              Set it up →
            </Link>
          </div>
        )}

        {/* Score-spiral intervention — 3+ tests today all under 35%.
            Confidence first (their effort is REAL), then the awareness
            shift: scores grow by STRATEGY, not by re-testing — and
            Shishya builds their personal one. Supersedes the soft-landing
            block below (one intervention, never two stacked). */}
        {isSpiral && topicArr.length > 0 && (
          <div className="mt-6 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
              {spiralRows[0].n} tests today — your effort is real. Let&apos;s aim it.
            </p>
            <p className="mt-1 text-base font-bold text-ink-900">
              Here&apos;s what toppers know: scores don&apos;t grow by re-testing — they grow by strategy.
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-700">
              <li>
                📖 <span className="font-semibold">Mugging more tests repeats the same mistakes.</span>{" "}
                Fixing ONE topic, then re-testing — that&apos;s what moves a score. Your highest-impact
                topic right now: <span className="font-semibold text-ink-900">{topicArr[0].name}</span>{" "}
                ({topicArr[0].correct}/{topicArr[0].total} this time). Ten focused minutes there beats
                three more full tests.
              </li>
              {negativeGuesses >= 3 && (
                <li>
                  ✋ <span className="font-semibold">{negativeGuesses} wrong answers cost you negative marks.</span>{" "}
                  Unsure? Skip it — a blank is 0, a wrong guess is minus. Toppers skip strategically.
                </li>
              )}
              <li>
                🎯 <span className="font-semibold">You don&apos;t have to figure the strategy out alone</span> —
                Shishya builds your personal one from your own results: which topics first, how much
                daily, what to skip.
              </li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/exams/${attempt.mock.exam.code}/topics/${encodeURIComponent(topicArr[0].code)}?start=1`}
                className="rounded-lg bg-saffron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-600"
              >
                Fix {topicArr[0].name} now — 10-question test starts instantly →
              </Link>
              <Link
                href="/me/report"
                className="rounded-lg border border-saffron-300 bg-white px-4 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50"
              >
                See my personal strategy →
              </Link>
            </div>
          </div>
        )}

        {/* Soft landing for rough scores. 42% of submitted mocks land under
            30% — the silent-churn moment where a student decides the platform
            "makes them feel dumb". We never hide the honest score (core
            value), but we LEAD with the path forward: the 1-2 topics that
            would lift the score most. Framing: every topper's first mock
            looked like this. */}
        {softLanding && (
          <div className="mt-6 rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-indigo-50/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">
              Rough one — that&apos;s normal for a first attempt
            </p>
            <p className="mt-1 text-base font-bold text-ink-900">
              Most toppers&apos; early mocks looked exactly like this. Here&apos;s the fastest way up:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-ink-700">
              {topicArr.slice(0, 2).map((tp: any) => (
                <li key={tp.code}>
                  <span className="font-semibold text-ink-900">{tp.name}</span>{" "}
                  ({tp.correct}/{tp.total} this time) — a focused 15-minute revision here moves your
                  score more than anything else.
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-500">
              Your next mock below is a short confidence-builder on your weakest topic — small wins
              first, full mocks after.
            </p>
            {/* ONE TAP to the fix (23 Aug 2026): this block used to name
                the weak topic but offer no button — only 47% of low
                scorers ever reached a topic test. ?start=1 builds the
                10-question test the moment the page opens. */}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/exams/${attempt.mock.exam.code}/topics/${encodeURIComponent(topicArr[0].code)}?start=1`}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
              >
                Fix {topicArr[0].name} now — 10-question test starts instantly →
              </Link>
            </div>
            {/* Low score is the highest-value expert moment: a human can
                diagnose what a percentage can't. */}
            <div className="mt-3">
              <TalkToTeacher
                surface="results"
                examCode={attempt.mock.exam.code}
                topicCode={topicArr[0]?.code ?? null}
                attemptId={attempt.id}
                defaultName={session.user.name ?? null}
                defaultEmail={session.user.email ?? null}
                contextLabel={topicArr[0]?.name}
                variant="link"
                linkLabel="📞 Talk to a subject expert about your plan →"
              />
            </div>
          </div>
        )}

        {/* Score summary
            ──────────────
            Two distinct percentages so the negative-marking math is
            obvious. "Marks" is the official-exam-equivalent (3×+4 − 7×−1
            = 5/48 = 10.4%), "Accuracy" is the demoralisation-free hit
            rate (3 right out of 12). Showing both side-by-side avoids
            the "but I got 3 right, why does it say 10%?" confusion. */}
        {/* All-India Live Test rank — the one place a cross-student
            comparison IS the product. Rank + cohort size only; no names. */}
        {airRank && (
          <div className="mt-6 rounded-xl border-2 border-saffron-400 bg-gradient-to-r from-saffron-50 via-amber-50 to-saffron-50 p-4 text-center">
            <p className="text-lg font-bold text-saffron-800">
              🇮🇳 All-India Rank #{airRank.rank}{" "}
              <span className="text-sm font-semibold text-ink-600">of {airRank.of} across India</span>
            </p>
            <p className="mt-0.5 text-sm text-ink-700">
              Same paper, same day, whole country.{" "}
              <Link href="/live-test" className="font-semibold text-saffron-700 hover:underline">
                Next live test →
              </Link>
            </p>
          </div>
        )}
        {/* Celebration moments — personal best beats any leaderboard;
            first mock gets a baseline framing instead of a raw judgment. */}
        {isPersonalBest && (
          <div className="mt-6 rounded-xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4 text-center">
            <p className="text-lg font-bold text-emerald-800">
              🎉 New personal best in {attempt.mock.exam.shortName}!
            </p>
            <p className="mt-0.5 text-sm text-ink-700">
              {formatDisplayScorePct(attempt.scorePct)} — up from your previous best of{" "}
              {formatDisplayScorePct(prevBest!.scorePct)}. This is what daily reps do. Keep going.
            </p>
          </div>
        )}
        {isFirstMock && (
          <div className="mt-6 rounded-xl border border-sky-300 bg-sky-50 p-4 text-center">
            <p className="text-sm font-bold text-sky-900">
              🏁 First {attempt.mock.exam.shortName} mock done — your baseline is set.
            </p>
            <p className="mt-0.5 text-xs text-ink-600">
              Nobody&apos;s first score is their final score. Every mock from here is measured
              against this one — and beating your own record is the whole game.
            </p>
          </div>
        )}

        {/* Belonging, right after the score: they didn't just take a
            test, they joined today's cohort of people doing the work. */}
        <PeerProofLine
          proof={peerProof}
          examShort={attempt.mock.exam.shortName}
          variant="results"
        />

        {/* Coach entry — "I have a score, now what?" is the moment a
            plan means most. Suppressed once they have one; plan-holders
            get the next-task breadcrumb instead (a mock often IS a plan
            task — this closes the loop right after they finish it). */}
        {!hasCoachPlan ? (
          <CoachEntry
            examCode={attempt.mock.exam.code}
            examShort={attempt.mock.exam.shortName}
            variant="results"
          />
        ) : (
          <CoachNextTask />
        )}

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

        {/* Lever #3 — "Review your mistakes with Shishya". The highest-intent
            tutor moment on the whole site: they just saw what they got wrong.
            Placed right under the score so it's the first thing they can act
            on. Only when there's something to review. prefetch=false to keep
            CHAT_OPENED honest. */}
        {wrongCount > 0 && (
          <div className="mt-6 rounded-xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50/60 p-5 shadow-sm">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Turn mistakes into marks
                </p>
                <p className="mt-1 text-base font-bold text-ink-900">
                  Review your {wrongCount} wrong {wrongCount === 1 ? "answer" : "answers"} with Shishya
                </p>
                <p className="mt-1 text-xs text-ink-600">
                  Your free AI tutor walks through each mistake — why the right answer is right,
                  and how to nail it next time.
                </p>
              </div>
              <Link
                href={`/chat?examCode=${attempt.mock.exam.code}&seed=${encodeURIComponent(mistakeSeed)}`}
                prefetch={false}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                Explain my mistakes →
              </Link>
            </div>
          </div>
        )}

        {/* Human-connection pilot — the escalation from AI to a real teacher,
            placed right after the AI mistake CTA. Results is the peak moment
            to want a person: they just saw what they got wrong. */}
        {wrongCount > 0 && (
          <div className="mt-4">
            <TalkToTeacher
              surface="results"
              examCode={attempt.mock.exam.code}
              topicCode={topicArr[0]?.code ?? null}
              attemptId={attempt.id}
              defaultName={session.user.name ?? null}
              defaultEmail={session.user.email ?? null}
              contextLabel={topicArr[0]?.name}
              variant="card"
            />
          </div>
        )}

        {/* Share-to-WhatsApp viral loop. Surfaced HIGH on the page
            (right after score, before rank ladder) so the moment
            students see their score, the share action is in their
            face — peak motivation = peak share intent. See
            ShareScoreButton component for the wa.me + Web Share +
            Copy fallback chain. */}
        {attempt.finishedAt && (
          <ShareScoreButton
            attemptId={attempt.id}
            examShortName={attempt.mock.exam.shortName}
            scoreDisplay={formatDisplayScorePct(attempt.scorePct)}
          />
        )}

        {/* DEPTH LEVER 3 — on-demand generation. Targets the student's
            weakest topic (topicArr is sorted ascending by score, so
            topicArr[0] is weakest). One tap → fresh, level-tuned
            questions on exactly the topic they struggled with. The
            infinite-depth escape hatch for users who exhaust the pool. */}
        {attempt.finishedAt && topicArr.length > 0 && (
          <FreshQuestionsButton
            examCode={attempt.mock.exam.code}
            topicCode={topicArr[0].code}
            topicName={topicArr[0].name}
          />
        )}

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

        {/* PulseAsk (1 Sep 2026): one quiet mock-realism question after
            the review — the moment they can actually judge it. Keyed per
            exam so each exam is asked at most once per 14 days. */}
        <PulseAsk
          surface="results"
          promptKey={`results-${attempt.mock.exam.code}`}
          prompt={`Did this ${attempt.mock.exam.shortName} mock feel like the real exam?`}
          chips={["Felt real", "Too easy", "Too hard"]}
          signedIn
          examCode={attempt.mock.exam.code}
          attemptId={attempt.id}
        />

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

          {/* Lever #4 — one-tap next mock (adaptive, weak-topic targeted)
              instead of routing back to the hub to choose again. Under 30%
              it becomes a 5-question EASY confidence-builder on the weakest
              topic (soft landing — see banner at top of page). */}
          <NextMockButton
            examCode={attempt.mock.exam.code}
            label={t("results.cta.another")}
            confidenceTopic={
              (attempt.scorePct ?? 0) < 30 && topicArr.length > 0
                ? { code: topicArr[0].code, name: topicArr[0].name }
                : null
            }
          />
          <Link
            href={`/exams/${attempt.mock.exam.code}`}
            className="block w-full text-center text-xs font-medium text-ink-500 hover:text-ink-700"
          >
            or browse all mocks &amp; PYQs →
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

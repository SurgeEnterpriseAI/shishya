// Growth lever #2 — anonymous topic-level quiz (no login).
// Reachable from the topic-notes page for signed-out readers (who dwell
// ~20s and bounce). Client-graded taste that ends on a sign-in CTA. noindex
// — utility page carrying answers, not an SEO surface (the notes page is).
//
// Exam Week Mode (6 Sep 2026, wave 2): same alert wiring as the exam-level
// quiz — phase from the cached tracker rows, translated labels, and the
// one-email alert on the result screen in the run-up / eve / post-exam
// phases (an expected-tier exam day never opens the post-exam copy).
//
// 11 Sep 2026: ?n= (5..10) and ?set=id1,id2,… (deterministic replay of a
// shared set, validated against the exam, capped at 10) — the same
// contract as the exam-level quiz, so the "try the same 5" WhatsApp share
// from a topic quiz lands back here.
//
// 14 Sep 2026: the player's own words (and the challenge card on its result)
// come from src/lib/challenge-copy.ts in the page's language.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { clampAnonQuizCount, getAnonQuiz, parseAnonQuizSet } from "@/lib/anon-quiz";
import { challengeLabels, quizLabels } from "@/lib/challenge-copy";
import { fillTemplate } from "@/lib/i18n";
import { topicQuizCopy } from "@/lib/quiz-entry-copy";
import { AnonQuizPlayer, type AnonQuizExamWeek } from "@/components/AnonQuizPlayer";
import { alertPhase, examAlertLabels, getExamWeekStateByCode } from "@/lib/exam-week-inputs";

export const metadata: Metadata = { robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

export default async function TopicQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string; topicCode: string }>;
  searchParams: Promise<{ n?: string | string[]; set?: string | string[] }>;
}) {
  const [{ code, topicCode }, sp] = await Promise.all([params, searchParams]);
  const [quiz, examWeekState, { t, locale }, session] = await Promise.all([
    getAnonQuiz({ examCode: code, topicCode, count: clampAnonQuizCount(sp.n), ids: parseAnonQuizSet(sp.set) }),
    getExamWeekStateByCode(code),
    getT(),
    auth().catch(() => null),
  ]);
  const examWeek: AnonQuizExamWeek | undefined = quiz
    ? { phase: alertPhase(examWeekState), signedIn: !!session?.user?.id, ...examAlertLabels(t, quiz.examShort) }
    : undefined;
  // The page's own words in the same locale as the player's (16 Sep 2026).
  // This route is noindex, so nothing here is a search surface.
  const C = topicQuizCopy(locale);

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose py-8 sm:py-10">
        <p className="text-xs text-ink-500">
          <Link href={`/exams/${code}`} className="hover:text-ink-800">
            {quiz?.examShort ?? code}
          </Link>{" "}
          ·{" "}
          <Link href={`/exams/${code}/topics/${topicCode}`} className="hover:text-ink-800">
            {quiz?.scopeLabel ?? C.topicFallback}
          </Link>{" "}
          · {C.crumb}
        </p>

        {!quiz ? (
          <div className="mt-6 rounded-md border border-dashed border-ink-300 bg-white px-5 py-6">
            <p className="text-sm font-medium text-ink-800">{C.none}</p>
            <Link
              href={`/exams/${code}/topics/${topicCode}`}
              className="mt-3 inline-block text-sm font-medium text-saffron-700 hover:text-saffron-800"
            >
              {C.back}
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">
              {fillTemplate(C.h1, { scope: quiz.scopeLabel })}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-600">
              {quiz.replay
                ? fillTemplate(C.replay, { n: quiz.questions.length })
                : fillTemplate(C.fresh, { n: quiz.questions.length, exam: quiz.examShort, scope: quiz.scopeLabel })}
            </p>
            <div className="mt-6">
              <AnonQuizPlayer
                quiz={quiz}
                examWeek={examWeek}
                labels={quizLabels(t)}
                challengeLabels={challengeLabels(t)}
                locale={locale}
              />
            </div>
          </>
        )}
      </section>
    </main>
  );
}

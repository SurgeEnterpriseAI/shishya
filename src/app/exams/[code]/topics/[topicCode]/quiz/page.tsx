// Growth lever #2 — anonymous topic-level quiz (no login).
// Reachable from the topic-notes page for signed-out readers (who dwell
// ~20s and bounce). Client-graded taste that ends on a sign-in CTA. noindex
// — utility page carrying answers, not an SEO surface (the notes page is).
//
// Exam Week Mode (6 Sep 2026, wave 2): same alert wiring as the exam-level
// quiz — phase from the cached tracker rows, translated labels, and the
// one-email alert on the result screen in the run-up / eve / post-exam
// phases (an expected-tier exam day never opens the post-exam copy).

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { getAnonQuiz } from "@/lib/anon-quiz";
import { AnonQuizPlayer, type AnonQuizExamWeek } from "@/components/AnonQuizPlayer";
import { alertPhase, examAlertLabels, getExamWeekStateByCode } from "@/lib/exam-week-inputs";

export const metadata: Metadata = { robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

export default async function TopicQuizPage({
  params,
}: {
  params: Promise<{ code: string; topicCode: string }>;
}) {
  const { code, topicCode } = await params;
  const [quiz, examWeekState, { t }, session] = await Promise.all([
    getAnonQuiz({ examCode: code, topicCode, count: 5 }),
    getExamWeekStateByCode(code),
    getT(),
    auth().catch(() => null),
  ]);
  const examWeek: AnonQuizExamWeek | undefined = quiz
    ? { phase: alertPhase(examWeekState), signedIn: !!session?.user?.id, ...examAlertLabels(t, quiz.examShort) }
    : undefined;

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
            {quiz?.scopeLabel ?? "Topic"}
          </Link>{" "}
          · Quiz
        </p>

        {!quiz ? (
          <div className="mt-6 rounded-md border border-dashed border-ink-300 bg-white px-5 py-6">
            <p className="text-sm font-medium text-ink-800">No questions for this topic yet.</p>
            <Link
              href={`/exams/${code}/topics/${topicCode}`}
              className="mt-3 inline-block text-sm font-medium text-saffron-700 hover:text-saffron-800"
            >
              ← Back to the notes
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">
              {quiz.scopeLabel} — quick quiz
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-600">
              5 real {quiz.examShort} questions on {quiz.scopeLabel}. Instant scoring and solutions,
              no signup — see where you stand in ~3 minutes.
            </p>
            <div className="mt-6">
              <AnonQuizPlayer quiz={quiz} examWeek={examWeek} />
            </div>
          </>
        )}
      </section>
    </main>
  );
}

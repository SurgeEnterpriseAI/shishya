// Growth lever #2 — anonymous exam-level diagnostic (no login).
// Reachable from the exam hub for signed-out visitors, defusing the biggest
// login leak (exam hub → /login, 84× in 14 days). Client-graded taste that
// ends on a sign-in CTA. noindex — utility page, not SEO surface, and it
// carries answers.
//
// Exam Week Mode (6 Sep 2026, wave 2): the page computes the exam's phase
// from the cached tracker rows and hands AnonQuizPlayer the translated
// alert labels, so a guest who just tried 5 questions in the run-up week
// / on exam eve / in the post-exam week gets the one-email alert on the
// result screen. An expected-tier exam day never opens the post-exam
// copy (alertPhase).

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { getAnonQuiz } from "@/lib/anon-quiz";
import { AnonQuizPlayer, type AnonQuizExamWeek } from "@/components/AnonQuizPlayer";
import { alertPhase, examAlertLabels, getExamWeekStateByCode } from "@/lib/exam-week-inputs";

export const metadata: Metadata = { robots: { index: false, follow: true } };
// Fresh random question set on every load.
export const dynamic = "force-dynamic";

export default async function ExamQuizPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const [quiz, examWeekState, { t }, session] = await Promise.all([
    getAnonQuiz({ examCode: code, count: 5 }),
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
          · Free quiz
        </p>

        {!quiz ? (
          <div className="mt-6 rounded-md border border-dashed border-ink-300 bg-white px-5 py-6">
            <p className="text-sm font-medium text-ink-800">No quiz questions here yet.</p>
            <Link
              href={`/exams/${code}`}
              className="mt-3 inline-block text-sm font-medium text-saffron-700 hover:text-saffron-800"
            >
              Explore {code} on Shishya →
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">
              {quiz.examShort} — free 5-question quiz
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-600">
              No signup needed. Answer 5 real {quiz.examShort} questions, get instant scoring and
              solutions, then unlock full mocks and your weak-topic map for free.
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

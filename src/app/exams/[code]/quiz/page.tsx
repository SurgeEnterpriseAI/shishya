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
//
// 11 Sep 2026 signup-leak audit — three query params, all optional:
//   ?n=10          5..10 questions (the cutoff-page nudge sends 10).
//   ?from=cutoff   the result screen shows the category cutoff rows the
//                  visitor just read on /cutoff, with their source tier
//                  and an honest "sample, not a prediction" line.
//   ?set=id1,id2   deterministic replay of a shared set ("try the same
//                  5" WhatsApp share); ids are validated server-side
//                  against this exam and capped at 10.
// Still client-graded, still noindex.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { localeNames } from "@/lib/i18n";
import { clampAnonQuizCount, getAnonCutoffRows, getAnonQuiz, parseAnonQuizSet } from "@/lib/anon-quiz";
import { cachedQuizTranslations } from "@/lib/anon-quiz-locale";
import { categoryHeaderKey } from "@/lib/category-cutoff";
import {
  AnonQuizPlayer,
  type AnonQuizCutoff,
  type AnonQuizExamWeek,
  type AnonQuizTranslationPack,
} from "@/components/AnonQuizPlayer";
import { alertPhase, examAlertLabels, getExamWeekStateByCode } from "@/lib/exam-week-inputs";

export const metadata: Metadata = { robots: { index: false, follow: true } };
// Fresh random question set on every load.
export const dynamic = "force-dynamic";

export default async function ExamQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ n?: string | string[]; from?: string | string[]; set?: string | string[] }>;
}) {
  const [{ code }, sp] = await Promise.all([params, searchParams]);
  const count = clampAnonQuizCount(sp.n);
  const ids = parseAnonQuizSet(sp.set);
  const fromCutoff = (Array.isArray(sp.from) ? sp.from[0] : sp.from) === "cutoff";
  const [quiz, examWeekState, { t, locale }, session, cutoffRows] = await Promise.all([
    getAnonQuiz({ examCode: code, count, ids }),
    getExamWeekStateByCode(code),
    getT(),
    auth().catch(() => null),
    fromCutoff ? getAnonCutoffRows(code) : Promise.resolve(null),
  ]);
  // Student's language (12 Sep 2026): on a /hi or /te twin (or with a
  // non-English cookie) overlay only the questions that ALREADY have a
  // cached translation — one indexed SELECT, never the translator. The
  // player labels each overlaid question "Shishya-translated — cross-check
  // the English" and keeps English one tap away. Empty on "en".
  const translatedById = quiz ? await cachedQuizTranslations(quiz, locale) : {};
  const translation: AnonQuizTranslationPack | undefined =
    quiz && Object.keys(translatedById).length > 0
      ? {
          locale,
          localeName: localeNames[locale],
          byId: translatedById,
          note: t("quiz.translated.note"),
          seeIn: t("quiz.seeIn"),
        }
      : undefined;
  const examWeek: AnonQuizExamWeek | undefined = quiz
    ? { phase: alertPhase(examWeekState), signedIn: !!session?.user?.id, ...examAlertLabels(t, quiz.examShort) }
    : undefined;
  // The cutoff page's own table, with the two generator headers translated
  // the same way it does, framed with its tier word ("expected" — the
  // ExamCategoryCutoff block is AI-curated and indicative) and the page's
  // own disclaimer. The player adds the "sample, not a prediction" line.
  const cutoff: AnonQuizCutoff | undefined =
    quiz && cutoffRows
      ? {
          heading: t("ew.cutoff.lastCycle"),
          tier: t("ew.tier.expected"),
          table: cutoffRows.table.map((row, i) =>
            i === 0
              ? row.map((h) => {
                  const k = categoryHeaderKey(h);
                  return k ? t(k) : h;
                })
              : row,
          ),
          notes: cutoffRows.notes,
          disclaimer: t("cutoff.disclaimer"),
        }
      : undefined;
  const n = quiz?.questions.length ?? count;

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
              {quiz.examShort} — free {n}-question quiz
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-600">
              {quiz.replay
                ? `Same ${n} questions as the link you opened, in the same order — no signup, instant scoring and solutions.`
                : `No signup needed. Answer ${n} real ${quiz.examShort} questions, get instant scoring and solutions, then unlock full mocks and your weak-topic map for free.`}
            </p>
            <div className="mt-6">
              <AnonQuizPlayer quiz={quiz} examWeek={examWeek} cutoff={cutoff} translation={translation} />
            </div>
          </>
        )}
      </section>
    </main>
  );
}

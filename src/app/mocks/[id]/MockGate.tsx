// Signed-out /mocks/[id] (25 Sep 2026): a light page instead of the bare
// bounce to /login.
// 28 Sep 2026 (founder: the sign-up must be there as it was): the sign-in
// card is first again; for one day (27 Sep) the quiz came first.
// Order on the page, phone-first:
//   1. The mock itself — exam, title, and its REAL size and timer (the
//      question list and the duration the player would run) — with the
//      /login page's Google button (same component, same label key), whose
//      callback is this mock + from=signin + the email's utm tags
//      (src/lib/mock-gate.ts), and /login's "Free · No credit card" line.
//      It sits in the first screen on a phone; the title is clamped to
//      three lines.
//   2. Below: the exam's 5-question guest quiz, collapsed until asked for,
//      ending on "sign in — back to this mock". Absent when the exam has
//      none.
// 30 Sep 2026: both sign-in buttons send the site-wide sign-in beacon
// (surface "mock-gate" / "mock-gate-quiz-end", src/lib/signin-cta.ts). The
// in-app escape line shows once, above the top button (inAppHint={false} on
// the quiz's end button).
// The page view is the root layout's AnalyticsTracker PAGE_VIEW of
// /mocks/{id} (no userId = a guest on the gate). Server component; only the
// button and the quiz are client islands.

import Link from "next/link";
import { Header } from "@/components/Header";
import { GateSignInButton, GuestQuizGate } from "@/components/GuestQuizGate";
import { fillTemplate } from "@/lib/i18n";
import { INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import type { MockGateCopy } from "@/lib/mock-gate-copy";
import type { GuestQuizEmbed } from "@/lib/guest-quiz-embed";

export function MockGate({
  mockId,
  title,
  examCode,
  examShort,
  questionCount,
  durationMin,
  callbackUrl,
  signInLabel,
  freeLine,
  copy,
  guestQuiz,
}: {
  mockId: string;
  title: string;
  examCode: string;
  examShort: string;
  questionCount: number;
  durationMin: number;
  /** gateCallbackPath(): /mocks/{id}?from=signin(&utm_…) */
  callbackUrl: string;
  /** t("login.continue") */
  signInLabel: string;
  /** t("login.freeLine") — "{n}" is the language count */
  freeLine: string;
  copy: MockGateCopy;
  guestQuiz: GuestQuizEmbed | null;
}) {
  const beaconProps = { examCode, mockId };
  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose py-5 sm:py-10">
        <div className="mx-auto max-w-xl">
          <div className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
              <Link href={`/exams/${examCode}`} className="hover:text-saffron-800">
                {fillTemplate(copy.kicker, { exam: examShort })}
              </Link>
            </p>
            <h1 className="mt-1 line-clamp-3 text-lg font-bold leading-snug text-ink-900 sm:text-xl">{title}</h1>
            <p className="mt-1 text-sm font-medium text-ink-700">
              {fillTemplate(copy.size, { n: questionCount, min: durationMin })}
            </p>
            <p className="mt-3 text-sm text-ink-600">{copy.body}</p>
            <GateSignInButton
              callbackUrl={callbackUrl}
              label={signInLabel}
              surface="mock-gate"
              beaconProps={beaconProps}
              className="[&>button]:mt-4"
            />
            <p className="mt-2 text-center text-xs text-ink-500">
              {fillTemplate(freeLine, { n: INDIAN_LANGUAGE_COUNT })}
            </p>
          </div>

          {guestQuiz && (
            <GuestQuizGate
              quiz={guestQuiz.quiz}
              translation={guestQuiz.translation}
              labels={guestQuiz.labels}
              challengeLabels={guestQuiz.challengeLabels}
              locale={guestQuiz.locale}
              copy={{
                heading: copy.quizHeading,
                line: copy.quizLine,
                start: copy.quizStart,
                endSignIn: copy.quizEndSignIn,
              }}
              signInCallbackUrl={callbackUrl}
              beacons={{ start: "mock-gate-quiz-start", done: "mock-gate-quiz-done" }}
              signinSurface="mock-gate-quiz-end"
              beaconProps={beaconProps}
              inAppHint={false}
            />
          )}
        </div>
      </section>
    </main>
  );
}

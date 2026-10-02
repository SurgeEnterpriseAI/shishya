"use client";

// Sign-in gate pieces shared by the signed-out /mocks/[id] page and the
// signed-out /build-mock page (25 Sep 2026).
//
// GateSignInButton — the /login page's own GoogleSignInButton (same
// component, same next-auth signIn("google") call), wrapped so a click also
// sends one CTA_CLICKED beacon. The wrapper listens in the capture phase and
// never touches the button, so /login's button is unchanged.
//
// GuestQuizGate — the clearly SECONDARY section under the sign-in: "Not ready
// to sign in? Try 5 {exam} questions now". It stays a small card until the
// guest asks for it (that tap is the quiz-start beacon), then plays the
// exam's existing guest quiz (AnonQuizPlayer, unchanged apart from two
// optional props) whose result screen leads back to signing in for the page
// the guest came from — the mock itself, or the builder.
//
// Why: in 11-24 Sep a /login in front of a mock converted 44% (41/94) — the
// sign-in step works and stays first — while 200-257 guests reached /login and
// left, and 131 of 183 signed-out builder visitors never signed in. This gives
// them a way on without moving sign-in down.
//
// 30 Sep 2026 (sign-up build 1): the click beacon is the site-wide sign-in
// one — { cta: "signin-click", surface } (src/lib/signin-cta.ts; it was
// "mock-gate-signin-click" / "build-gate-signin-click" with surface
// "gate" / "quiz-end") — and an in-app browser (Instagram, Facebook… where
// Google blocks sign-in) gets the escape line above the button
// (src/components/InAppBrowserHint.tsx, nothing anywhere else). The gate's
// button stays straight-to-Google; it is not part of the skip-/login test.
// 30 Sep 2026 (review): one escape line per page — the mock gate's quiz-end
// button passes inAppHint={false} (its top button already shows the line,
// and a second copy would count "shown" twice); the build-mock gate's
// quiz-end button, the only straight-to-Google button there, keeps it.

import { useRef, useState } from "react";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { InAppBrowserHint } from "@/components/InAppBrowserHint";
import { AnonQuizPlayer, type AnonQuizTranslationPack } from "@/components/AnonQuizPlayer";
import type { AnonQuiz } from "@/lib/anon-quiz";
import type { ChallengeLabels, QuizLabels } from "@/lib/challenge-copy";
import { fillTemplate } from "@/lib/i18n";
import { ctaBeacon } from "@/lib/cta-beacon";
import { signinBeacon, type SigninSurface } from "@/lib/signin-cta";

type BeaconProps = { examCode: string; mockId?: string };

export function GateSignInButton({
  callbackUrl,
  locale,
  continueLabel,
  exam,
  surface,
  beaconProps,
  className,
  inAppHint = true,
}: {
  /** Same-origin relative path (src/lib/mock-gate.ts builds it). */
  callbackUrl: string;
  /** The page's language (the shared label and explanation follow it). */
  locale?: string | null;
  /** t("login.continue"), where the page speaks all 22 languages: the words
   *  for a language other than en / hi / te. */
  continueLabel?: string;
  /** The exam's short name: the explanation names it (the sign-in returns
   *  to this exam's mock or builder, so the account is enrolled in it). */
  exam?: string | null;
  /** Sign-in door id, e.g. "mock-gate" (src/lib/signin-cta.ts). */
  surface: SigninSurface;
  beaconProps: BeaconProps;
  /** The button frame's layout classes — its top margin ("mt-4", "mt-0"). */
  className?: string;
  /** The in-app escape line above the button (default on); off where the
   *  page already shows it above another button. */
  inAppHint?: boolean;
}) {
  return (
    <>
      {inAppHint && <InAppBrowserHint />}
      {/* 2 Oct 2026: the one shared "Sign up with Google" button and its
          explanation. practice: a gate only exists where the exam has a mock
          or a builder. Review, same day: the tooltip opens ABOVE it (the
          quiz card, or the result screen's tutor button, sits under it).
          One look everywhere: Google's LIGHT button. The gate's sign-in
          stays its main action — it is first, and the "try 5 questions"
          button in the card below is a quiet 1 px ink outline.
          Counting (review, same day): the beacon goes out only for a click
          ON THE BUTTON. The wrapper also holds the caption under the button
          (on every device now) and the frame's top margin; a tap or a text
          selection there used to be counted as a sign-in click. A disabled
          button (the hand-off is under way) is not counted again. */}
      <div
        onClickCapture={(e) => {
          const button = (e.target as Element | null)?.closest?.("button");
          if (button && !(button as HTMLButtonElement).disabled) signinBeacon(surface, { ...beaconProps, via: "google" });
        }}
      >
        <GoogleSignInButton
          callbackUrl={callbackUrl}
          locale={locale}
          continueLabel={continueLabel}
          exam={exam}
          examCode={beaconProps.examCode}
          practice
          surface={surface}
          side="top"
          className={className}
        />
      </div>
    </>
  );
}

export interface GuestQuizGateCopy {
  heading: string;
  /** "{n}", "{exam}" */
  line: string;
  /** "{n}" */
  start: string;
  /** The result screen's Google button. */
}

export function GuestQuizGate({
  quiz,
  translation,
  labels,
  challengeLabels,
  locale,
  copy,
  signInCallbackUrl,
  beacons,
  signinSurface,
  continueLabel,
  beaconProps,
  inAppHint = true,
}: {
  quiz: AnonQuiz;
  translation?: AnonQuizTranslationPack;
  labels: QuizLabels;
  challengeLabels: ChallengeLabels;
  locale: string;
  copy: GuestQuizGateCopy;
  signInCallbackUrl: string;
  /** CTA_CLICKED names for this surface's quiz. */
  beacons: { start: string; done: string };
  /** The result screen's sign-in door, e.g. "mock-gate-quiz-end". */
  signinSurface: SigninSurface;
  /** t("login.continue") — the result screen's button in a language other
   *  than en / hi / te reads that language's "Continue with Google", like
   *  the gate's top button, instead of an English "Sign up with Google".
   *  (Such a language gets no caption: its words exist in three languages.) */
  continueLabel?: string;
  beaconProps: BeaconProps;
  /** Passed to the result screen's GateSignInButton (default on). */
  inAppHint?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const doneSent = useRef(false);
  const n = quiz.questions.length;
  const vars = { n, exam: quiz.examShort };

  return (
    <section
      aria-labelledby="guest-quiz-gate-heading"
      className="mt-6 rounded-xl border border-dashed border-ink-300 bg-white/70 p-4 sm:p-5"
    >
      <h2 id="guest-quiz-gate-heading" className="text-sm font-semibold text-ink-900">
        {copy.heading}
      </h2>
      <p className="mt-1 text-sm text-ink-600">{fillTemplate(copy.line, vars)}</p>
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            ctaBeacon(beacons.start, { ...beaconProps, n });
          }}
          className="mt-3 w-full rounded-lg border border-ink-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-50 sm:w-auto"
        >
          {fillTemplate(copy.start, vars)}
        </button>
      ) : (
        <div className="mt-4">
          <AnonQuizPlayer
            quiz={quiz}
            translation={translation}
            labels={labels}
            challengeLabels={challengeLabels}
            locale={locale}
            onFinish={(score, total) => {
              if (doneSent.current) return;
              doneSent.current = true;
              ctaBeacon(beacons.done, { ...beaconProps, score, total });
            }}
            signInSlot={
              <GateSignInButton
                callbackUrl={signInCallbackUrl}
                locale={locale}
                continueLabel={continueLabel}
                exam={quiz.examShort}
                surface={signinSurface}
                beaconProps={beaconProps}
                className="mt-0"
                inAppHint={inAppHint}
              />
            }
          />
        </div>
      )}
    </section>
  );
}

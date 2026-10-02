"use client";

// The straight-to-Google button — /login's button, also inside the mock gate
// (src/components/GuestQuizGate.tsx GateSignInButton).
//
// 30 Sep 2026 (sign-up build 1):
//   • faster hand-off: the CSRF token is fetched once when the button mounts
//     (when the browser is idle), and the tap submits NextAuth's own sign-in
//     form — one request to Google's screen instead of next-auth signIn()'s
//     three in a row; signIn("google") stays the fallback
//     (src/lib/google-handoff.ts);
//   • /login's copy (and only /login's: it passes `beacon`) sends one
//     CTA_CLICKED { cta: "login-google-click", surface: <callback family>,
//     from, inApp } so leaving on /login can be told apart from leaving on
//     Google's screen. The gate's wrapper sends its own "signin-click".
//   • back from Google's screen with the back button (bfcache), the button
//     is usable again instead of stuck on "…".
//
// 2 Oct 2026 (founder, standing: "Sign up with Google" — students may think
// sign-up needs a lot of details; visible, clear, with a description of how
// signing up is useful): this is the same shared button as every in-page
// sign-up (src/components/SignUpButton.tsx) —
//   • Google's button with the standard colour "G", to Google's branding
//     guidelines (it was our saffron button with no mark). 2 Oct 2026
//     review: `theme` — /login and the gates pass "dark" (Google's #131314
//     button): this is the page's main action and must stay the filled one
//     beside the outlined "try 5 questions first" (founder, 28 Sep 2026);
//   • the one label (src/lib/signup-cta-copy.ts): "Sign up with Google" in
//     en / hi / te. /login and the mock gate speak 22 languages, so any other
//     language keeps its own translation of "Continue with Google"
//     (`continueLabel`, login.continue — also an approved Google wording), as
//     does a returning member's "Welcome back" card (`returning`);
//   • the explanation: a tooltip on hover and keyboard focus with a mouse, a
//     short caption under the button on touch. It names the exam only when
//     the sign-in returns to that exam's page or mock (signUpContextFor), and
//     a school return gets the school words. 2 Oct 2026 review: `side` —
//     /login and the gates open the tooltip ABOVE the button (another action
//     sits under it); and in a language other than en / hi / te there is no
//     touch caption — the words exist in three languages only, and English
//     small print under a Tamil button helps no one (the tooltip stays).
// The click, the hand-off and both beacons are unchanged.

import { useEffect, useState } from "react";
import { ctaBeacon } from "@/lib/cta-beacon";
import { goToGoogle, warmGoogleHandoff } from "@/lib/google-handoff";
import { inAppBrowser } from "@/lib/in-app-browser";
import { cleanFrom, LOGIN_GOOGLE_CTA, loginCallbackFamily } from "@/lib/signin-cta";
import { googleButtonLabel, isSignUpLocale, signUpContextFor, signUpExplain, signUpExplainShort, signUpLabel } from "@/lib/signup-cta-copy";
import { SignUpFace, SignUpShell, googleButtonClass, type SignUpExplainMode } from "@/components/SignUpButton";

export function GoogleSignInButton({
  callbackUrl,
  locale,
  continueLabel,
  returning,
  exam,
  examCode,
  practice,
  surface = "login",
  explain = "both",
  side,
  theme = "light",
  className = "mt-6",
  beacon,
}: {
  callbackUrl: string;
  /** The page's language. */
  locale?: string | null;
  /** t("login.continue") — the words for a language other than en / hi / te,
   *  and for a returning member. Without it the label is always "Sign up
   *  with Google". */
  continueLabel?: string;
  /** A member coming back (the "Welcome back" card): not a sign-up. */
  returning?: boolean;
  /** The exam the callback page is about (the explanation names it only
   *  when the callback really is that exam's page or mock). */
  exam?: string | null;
  examCode?: string | null;
  practice?: boolean | null;
  /** The door, for the "signup-explain" beacon ("login", "mock-gate" …). */
  surface?: string;
  explain?: SignUpExplainMode;
  /** Tooltip above the button (another action sits under it). */
  side?: "top";
  /** Google's light (white) or dark (#131314) button. */
  theme?: "light" | "dark";
  /** The frame's layout classes (its top margin). */
  className?: string;
  /** /login only: send the login-google-click beacon, with /login's ?from=
   *  and the callback family its page view recorded ("none" for a bare /login). */
  beacon?: { from?: string | null; family?: string };
}) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => void warmGoogleHandoff(), { timeout: 2000 });
    else window.setTimeout(() => void warmGoogleHandoff(), 300);
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLoading(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const label = continueLabel ? googleButtonLabel(locale, continueLabel, returning) : signUpLabel(locale);
  const ctx = signUpContextFor({ callback: callbackUrl, exam, examCode, practice });
  const text = signUpExplain(locale, ctx);
  const short = signUpExplainShort(locale, ctx);
  // The words exist in en / hi / te: another language gets no touch caption.
  const mode: SignUpExplainMode = isSignUpLocale(locale ?? "en") ? explain : "tooltip";

  return (
    <SignUpShell text={text} short={short} surface={surface} explain={mode} side={side} block className={className}>
      {(describedBy) => (
        <button
          type="button"
          disabled={loading}
          aria-describedby={describedBy}
          onClick={() => {
            setLoading(true);
            if (beacon) {
              const from = cleanFrom(beacon.from);
              const inApp = inAppBrowser(typeof navigator !== "undefined" ? navigator.userAgent : "");
              ctaBeacon(LOGIN_GOOGLE_CTA, {
                surface: beacon.family ?? loginCallbackFamily(callbackUrl),
                ...(from ? { from } : {}),
                ...(inApp ? { inApp } : {}),
              });
            }
            void goToGoogle(callbackUrl).catch(() => setLoading(false));
          }}
          className={`${googleButtonClass(theme)} w-full`}
        >
          <SignUpFace label={loading ? "…" : label} />
        </button>
      )}
    </SignUpShell>
  );
}

"use client";

// The second, quieter way in on /login (13 Oct 2026, founder: "make sure sign
// up and sign in are separated"). Under the main Google button:
//   • a new browser (main button "Sign up with Google"):
//       "Already have an account? Sign in with Google"
//   • a returning member's browser (main button "Sign in with Google",
//     src/lib/member-cookie.ts): "New here? Sign up with Google"
// so someone signed up on another phone is never told to "sign up" again,
// and someone new on a member's shared phone still has their own door. Both
// take the same Google step (Google signs a known account in and makes a new
// one) — the words, not the flow, are what differ. The main button stays the
// first and bigger action; this is a text button (signup-everywhere rule).
// Words for en / hi / te; any other language keeps the page's own line.

import { useState } from "react";
import { ctaBeacon } from "@/lib/cta-beacon";
import { goToGoogle } from "@/lib/google-handoff";
import { LOGIN_GOOGLE_CTA, loginCallbackFamily } from "@/lib/signin-cta";
import { isSignUpLocale, signInLabel, signUpLabel, type SignUpLocale } from "@/lib/signup-cta-copy";
import { useReturningMember } from "@/lib/use-returning-member";

const ASK: Readonly<Record<SignUpLocale, { member: string; guest: string }>> = {
  en: { guest: "Already have an account?", member: "New here?" },
  hi: { guest: "पहले से अकाउंट है?", member: "पहली बार आए हैं?" },
  te: { guest: "ఇప్పటికే అకౌంట్ ఉందా?", member: "మొదటిసారి వచ్చారా?" },
};

export function LoginAltLine({
  callbackUrl,
  locale,
  fallback,
  returning,
}: {
  callbackUrl: string;
  locale: string;
  /** The page's own line for a language without these words. */
  fallback: string | null;
  /** The page already treats this sign-in as a member's (the "Welcome back" card). */
  returning: boolean;
}) {
  const member = useReturningMember() || returning;
  const [busy, setBusy] = useState(false);
  if (!isSignUpLocale(locale)) return fallback ? <p className="mt-1.5 text-xs text-ink-600">{fallback}</p> : null;
  const ask = ASK[locale][member ? "member" : "guest"];
  const action = member ? signUpLabel(locale) : signInLabel(locale);
  return (
    <p className="mt-2 text-sm text-ink-600" data-login-alt={member ? "signup" : "signin"}>
      {ask}{" "}
      <button
        type="button"
        disabled={busy}
        className="font-semibold text-ink-900 underline underline-offset-2 hover:text-ink-700 disabled:opacity-60"
        onClick={() => {
          setBusy(true);
          ctaBeacon(LOGIN_GOOGLE_CTA, { surface: loginCallbackFamily(callbackUrl), alt: member ? "signup" : "signin" });
          void goToGoogle(callbackUrl).catch(() => setBusy(false));
        }}
      >
        {action}
      </button>
    </p>
  );
}

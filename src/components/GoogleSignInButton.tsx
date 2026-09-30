"use client";

// "Continue with Google" — /login's button, also inside the mock gate
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

import { useEffect, useState } from "react";
import { ctaBeacon } from "@/lib/cta-beacon";
import { goToGoogle, warmGoogleHandoff } from "@/lib/google-handoff";
import { inAppBrowser } from "@/lib/in-app-browser";
import { cleanFrom, LOGIN_GOOGLE_CTA, loginCallbackFamily } from "@/lib/signin-cta";

export function GoogleSignInButton({
  callbackUrl,
  label,
  beacon,
}: {
  callbackUrl: string;
  label: string;
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

  return (
    <button
      type="button"
      disabled={loading}
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
      className="btn-primary mt-6 w-full disabled:opacity-60"
    >
      {loading ? "…" : label}
    </button>
  );
}

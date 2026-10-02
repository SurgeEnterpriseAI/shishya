"use client";

// An in-page sign-in button (30 Sep 2026, sign-up build 1): the /login link
// every guest box already rendered — same href, class and words, so the
// server HTML and a no-JavaScript tap are unchanged — plus, on click:
//   • ONE CTA_CLICKED beacon { cta: "signin-click", surface, via,
//     callbackFamily, bucket?, inApp? } (src/lib/signin-cta.ts);
//   • the skip-/login test (src/lib/direct-signin-ab.ts): in the "direct"
//     arm the tap goes straight to Google's account chooser with the link's
//     own callbackUrl (one request, src/lib/google-handoff.ts), with a
//     pending state; the "login" arm, a surface outside the test, a
//     modified click (new tab), an in-app browser and a browser that
//     already carries the signed-in hint all keep /login.
// The anchor carries data-signin-beacon="self" so the root layout's plain
// /login-link listener (src/components/AnalyticsTracker.tsx) does not count
// the same click twice.
// Callers render it only for guests; a Class 1-7 school page never has one
// (pitchAllowedPath / isChildSchoolPath stay with the callers).

import Link from "next/link";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { cookieHasSessionHint } from "@/lib/session-hint";
import { inAppBrowser } from "@/lib/in-app-browser";
import { inDirectSigninTest, readOrAssignDirectBucket, signinRoute, type DirectSigninBucket } from "@/lib/direct-signin-ab";
import { callbackOfLoginHref, loginCallbackFamily, signinBeacon, type SigninSurface } from "@/lib/signin-cta";

// 30 Sep 2026 (review): the hand-off is loaded only when it is about to be
// used — never a static import. SignupPitch and SignupNudge (both SignInLink
// users) sit in the root layout, and google-handoff pulls in next-auth/react
// (CommonJS, not tree-shaken: ~11 KB gzipped). A static import put that on
// every page — search landings, hubs, PYQ, Class 1-7 school pages — where
// page weight is the first suspect for a sign-up dip. Now the chunk comes
// with the CSRF token on intent (hover / touch / focus) in the direct arm,
// and a failed chunk load falls back to the /login link.
const loadHandoff = () => import("@/lib/google-handoff");

interface Plan {
  bucket: DirectSigninBucket | null;
  inApp: string | null;
  via: "google" | "login";
}

function planFor(surface: SigninSurface): Plan {
  try {
    const inApp = inAppBrowser(navigator.userAgent);
    // Probably signed in already: /login sends them straight back; no arm.
    const hinted = cookieHasSessionHint(document.cookie);
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      storage = null;
    }
    const bucket = !hinted && inDirectSigninTest(surface) ? readOrAssignDirectBucket(storage) : null;
    return { bucket, inApp, via: signinRoute({ bucket, inApp }) };
  } catch {
    return { bucket: null, inApp: null, via: "login" };
  }
}

export function SignInLink({
  href,
  surface,
  className,
  children,
  beaconProps,
  onSignInClick,
  rel,
  describedBy,
}: {
  /** The /login?callbackUrl=… link (the no-JavaScript and "login" arm route). */
  href: string;
  surface: SigninSurface;
  className?: string;
  children: ReactNode;
  /** Small ids only (examCode, placement): /api/analytics drops props over 1 KB. */
  beaconProps?: Record<string, string | number | boolean | null | undefined>;
  /** The caller's own bookkeeping on a sign-in tap (e.g. the timed sheet's "done"). */
  onSignInClick?: () => void;
  rel?: string;
  /** 2 Oct 2026: the id of the button's explanation (the tooltip / caption
   *  src/components/SignUpButton.tsx renders beside it) → aria-describedby. */
  describedBy?: string;
}) {
  const [pending, setPending] = useState(false);

  // Back from Google's screen via the back button (bfcache): the button works again.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setPending(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  // Intent (hover, touch, focus): fetch the hand-off chunk and the CSRF token
  // for the direct arm now, so the tap itself is one request.
  const warm = () => {
    if (planFor(surface).via === "google") void loadHandoff().then((m) => m.warmGoogleHandoff()).catch(() => {});
  };

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    try {
      onSignInClick?.();
    } catch {
      /* the caller's bookkeeping never blocks sign-in */
    }
    const plan = planFor(surface);
    const modified = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
    const via = modified ? "login" : plan.via;
    const callbackUrl = callbackOfLoginHref(href);
    signinBeacon(surface, {
      ...beaconProps,
      callbackFamily: loginCallbackFamily(callbackUrl),
      via,
      ...(plan.bucket ? { bucket: plan.bucket } : {}),
      ...(plan.inApp ? { inApp: plan.inApp } : {}),
    });
    if (via !== "google") return;
    e.preventDefault();
    if (pending) return;
    setPending(true);
    void loadHandoff()
      .then((m) => m.goToGoogle(callbackUrl))
      .catch(() => {
        // The chunk did not load or next-auth could not start: the /login
        // route still works.
        window.location.href = href;
      });
  };

  return (
    <Link
      href={href}
      prefetch={false}
      rel={rel}
      data-signin-beacon="self"
      data-signin-surface={surface}
      aria-busy={pending || undefined}
      aria-describedby={describedBy}
      className={pending ? `${className ?? ""} pointer-events-none opacity-60` : className}
      onClick={onClick}
      onPointerEnter={warm}
      onTouchStart={warm}
      onFocus={warm}
    >
      {children}
    </Link>
  );
}

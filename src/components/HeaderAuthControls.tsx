"use client";

// Client-side right-rail for Header: language switcher + auth-aware
// controls (Dashboard/Profile/Logout vs Sign in).
//
// We render this client-side specifically so pages that include
// <Header> don't have to call auth() / cookies() server-side. That
// keeps marketing pages (/, etc.) statically renderable and CDN-
// cacheable at the Vercel edge — TTFB drops from ~400ms (function
// execution) to ~50ms (edge cache hit).
//
// Session comes from the shared, hint-gated probe in
// src/lib/session-hint.ts (13 Sep 2026 phone-first audit: guests used to
// fire 3-4 identical /api/auth/session calls per page). A visitor without
// the PII-free `shishya_in` hint cookie resolves as signed-out with NO
// request; a signed-in student's islands share ONE session call per page.
//
// The "Today" link in the Primary nav row (TodayNavLink, 11 Sep 2026) uses
// the same probe. Header is on ~127 pages.
//
// 27 Sep 2026 (founder, content first):
//   • rule 4 — sign-in returns to the page it was clicked on: the guest
//     "Sign in" link carries callbackUrl = this path + query (never /login,
//     /logout or an /api route), computed after mount so the cached HTML
//     stays the same for everyone (plain /login until then), plus
//     from=header so /login never reads a header click as a gated action
//     (no "your mock is one tap away" or "Welcome back" card);
//   • rule 5 — no sign-in on Class 1-7 school pages (below 13, content
//     only): on /schooling/{board}/class-1 … class-7 the guest branch
//     renders nothing (isUnder13SchoolPath; usePathname also works during
//     SSR, so crawlers and first paint get no button either). The
//     signed-in rail is unchanged.
//
// 30 Sep 2026 (sign-up build 1, founder: invitations clear and visible, not
// small links):
//   • the guest button reads "Sign in free" — English in the cached HTML,
//     the reader's language (hi / te, URL prefix then cookie) after mount;
//   • a phone tap target of 44 px (min-h-[44px], the btn-primary height)
//     while the text stays text-xs below sm, so the row still fits 360 px;
//   • its click is counted as the one sign-in beacon (surface "header") by
//     the root layout's /login-link listener (src/components/AnalyticsTracker.tsx)
//     — data-signin-surface names it. It always goes to /login: the header
//     is not part of the skip-/login test.
//
// 2 Oct 2026 (founder, standing: "Sign up with Google" — students may think
// sign-up needs a lot of details; visible, clear, and a description on hover):
//   • the guest button reads "Sign up with Google" (src/lib/signup-cta-copy.ts
//     — the one place for the words; English in the cached HTML, hi / te
//     after mount). It stays our saffron button with TEXT ONLY: Google's
//     branding guidelines forbid the colour "G" on a coloured fill and a
//     one-colour "G", so the header carries no mark (the in-page buttons are
//     Google's white button with the "G");
//   • phone fit: the new label is ~50% wider than "Sign in free" and the
//     360 px row had about 87 px to spare, so below sm the two halves stack
//     ("Sign up" over "with Google") inside the same 44 px button with 12 px
//     side padding — narrower than the old one-line button. One line from sm;
//   • with a mouse, hover or keyboard focus opens the explanation as a
//     tooltip hanging from the button's right edge, under the top row
//     (SignUpShell: role="tooltip" + aria-describedby, Escape closes, no
//     layout shift). Its words are added after mount, so the cached HTML of
//     every page — and the /hi and /te twins' English count — gain nothing
//     but the label. On a touch screen there is NO tooltip and no caption:
//     nothing may sit over, or take, the tap on this button;
//   • a Class 8-12 school page gets the school words (no exam, no "tutor
//     remembers"); Class 1-7 pages still render no button at all;
//   • unchanged: always /login (not in the skip-/login test), surface
//     "header" counted by the root layout's listener.
//
// 2 Oct 2026 (review — under 13):
//   • /schooling and a board's hub list every class, so a child may be
//     reading them (isChildSchoolPath: no card, no bar, "no sign-up offer,
//     ever"). The header button there is the plain link it was before today
//     — NO tooltip and NO "explanation opened" beacon. (Its label is the
//     shared one; whether the button should be there at all is the existing
//     27 Sep rule, unchanged here.)
//   • `childSafe` — the page says a child may be reading although the path
//     does not (/ask?q= with a Class 1-7 question: the path is just /ask).
//     The guest button is not rendered at all, like on a Class 1-7 page.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LangSwitcher } from "./LangSwitcher";
import { NotificationBell } from "./NotificationBell";
import { locales, type Locale } from "@/lib/i18n";
import { NAV_TODAY, NAV_TODAY_TITLE } from "@/lib/study-day-copy";
import { fetchSignedIn } from "@/lib/session-hint";
import { isUnder13SchoolPath } from "@/lib/school/student-classes";
import { clientUiLocale, type CopyLocale } from "@/lib/ui-locale-copy";
import { callbackOfLoginHref } from "@/lib/signin-cta";
import { isChildSchoolPath } from "@/lib/signup-pitch";
import { signUpContextFor, signUpExplain } from "@/lib/signup-cta-copy";
import { SignUpBrandLabel, SignUpShell } from "./SignUpButton";

// Re-exported so any import of fetchSignedIn from this file keeps working.
// Resolves true (signed in) / false (guest) / null (probe failed).
export { fetchSignedIn };

interface SessionLite {
  signedIn: boolean;
}

// The guest button: our saffron button, 44 px tall, text only (no "G").
const GUEST_BUTTON_CLASS = "btn-primary min-h-[44px] !px-3 !py-1 text-center text-xs sm:!px-4 sm:text-sm";

interface Labels {
  dashboard: string;
  signout: string;
}

export function HeaderAuthControls({
  locale,
  labels,
  childSafe = false,
}: {
  locale: string;
  labels: Labels;
  /** The page may be read by a child under 13 although its path does not say
   *  so (Header passes its own childSafe): no guest sign-up button. */
  childSafe?: boolean;
}) {
  // null = still resolving (first paint); object = resolved. We render
  // the "Sign in" CTA as the optimistic default so the anonymous case
  // (the common one for a marketing page) has no visible flicker.
  const [session, setSession] = useState<SessionLite | null>(null);
  const pathname = usePathname();
  const [loginHref, setLoginHref] = useState("/login");
  // English on the server and first paint; the reader's language after mount.
  const [lang, setLang] = useState<CopyLocale>("en");
  useEffect(() => {
    setLang(clientUiLocale());
  }, [pathname]);
  // The explanation for the page this sign-in returns to (general words; the
  // school words on a Class 8-12 page).
  const signUpTip = signUpExplain(lang, signUpContextFor({ callback: callbackOfLoginHref(loginHref) }));

  useEffect(() => {
    let alive = true;
    fetchSignedIn().then((v) => {
      if (alive) setSession({ signedIn: v === true });
    });
    return () => {
      alive = false;
    };
  }, []);

  // Rule 4: back to this page after sign-in (re-read on every navigation).
  useEffect(() => {
    try {
      const p = location.pathname;
      if (p !== "/login" && p !== "/logout" && !p.startsWith("/api/")) setLoginHref(`/login?callbackUrl=${encodeURIComponent(p + location.search)}&from=header`);
      else setLoginHref("/login");
    } catch {
      setLoginHref("/login");
    }
  }, [pathname]);

  const signedIn = session?.signedIn ?? false;
  const safeLocale: Locale = (locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : "en";

  return (
    <>
      <LangSwitcher current={safeLocale} />
      {signedIn ? (
        <>
          <Link href="/dashboard" className="hidden hover:text-ink-900 sm:inline">
            {labels.dashboard}
          </Link>
          <Link
            href="/me"
            className="hidden hover:text-ink-900 sm:inline"
            title="Your contributions"
          >
            Profile
          </Link>
          <NotificationBell />
          <Link
            href="/logout"
            className="rounded-md border border-ink-300 px-3 py-1.5 text-xs font-medium hover:bg-ink-50"
          >
            {labels.signout}
          </Link>
        </>
      ) : childSafe || isUnder13SchoolPath(pathname) ? null : isChildSchoolPath(pathname) ? (
        // /schooling and a board hub: the plain link — no tooltip, no beacon.
        <Link rel="nofollow" href={loginHref} className={GUEST_BUTTON_CLASS} data-signin-surface="header">
          <SignUpBrandLabel locale={lang} stack />
        </Link>
      ) : (
        <SignUpShell text={signUpTip} surface="header" explain="tooltip" align="end" deferText>
          {(describedBy) => (
            <Link rel="nofollow" href={loginHref} aria-describedby={describedBy} className={GUEST_BUTTON_CLASS} data-signin-surface="header">
              <SignUpBrandLabel locale={lang} stack />
            </Link>
          )}
        </SignUpShell>
      )}
    </>
  );
}

/**
 * "Today" — the one daily loop, as a primary nav item for signed-in
 * students (11 Sep 2026 audit: on phones a signed-in student had NO link
 * to the streak / Daily 5; Dashboard and Profile are hidden below sm).
 * Rendered as the FIRST child of the Primary nav row, with no hidden /
 * sm: classes, so it is on-screen at every width. Anonymous visitors get
 * nothing — the row stays exactly as it was for them and for crawlers.
 */
export function TodayNavLink() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchSignedIn().then((v) => {
      if (alive) setSignedIn(v === true);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!signedIn) return null;
  return (
    <Link
      href="/today"
      className="rounded-md bg-amber-100 px-2 py-0.5 font-semibold text-amber-800 hover:bg-amber-200"
      title={NAV_TODAY_TITLE}
    >
      ☀️ {NAV_TODAY}
    </Link>
  );
}

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
//     after mount). Until the evening of 2 Oct it was our saffron button
//     with TEXT ONLY (Google's "G" may not sit on a coloured fill);
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
//
// 2 Oct 2026, evening (founder, with a screenshot of the white Google button:
// "sign up should show like this instead of the orange color one at the top
// and also the hover is hiding behind"):
//   • the guest button is Google's LIGHT button — white pill, thin grey
//     stroke, the colour "G", then the label — the same button as the site
//     card and every other tinted card (.su-google in src/app/globals.css).
//     Both guest branches wear it (the one with the tooltip, and the plain
//     link on /schooling and board hubs); Class 1-7 pages and childSafe
//     still render no button;
//   • phone fit (font arithmetic, not yet seen on a phone): the row is one
//     line that cannot wrap and has 159 px for this button at 360 px, 174 at
//     375 and 125 at 400 (the wordmark appears there). One line needs 190 px
//     at the standard size and 161 px even at 12 px, so below sm the label's
//     two halves sit on two lines beside the "G" ("Sign up" over "with
//     Google" — the full approved words) in the compact size
//     (.su-google-compact: 12 px text, 10 / 6 / 10 px paddings, 18 px "G",
//     still 44 px tall): about 115 px in English, 112 in Hindi, 146-156 in
//     Telugu. Telugu does not fit beside the wordmark between 400 and
//     439 px, so the wordmark hides there while the TELUGU GUEST BUTTON is
//     on screen — and only then (review, same evening: the first rule keyed
//     on <html lang="te"> alone, so a signed-in Telugu reader and a Telugu
//     reader of a Class 1-7 page, who have no button, lost the wordmark for
//     nothing). This component writes <html data-hdr-guest="{the label's
//     language}"> while it renders the guest button; the rule is
//     html[data-hdr-guest="te"] .hdr-wordmark in globals.css. From sm: the
//     standard size, one line. Not solved: Telugu on a 320 px phone (about
//     30 px too wide; the saffron button was 5-12 px too wide there);
//   • the label follows the language control at once (LangSwitcher's
//     onLocale): a change of language refreshes the route without changing
//     the path, so the label used to stay in the old language until the next
//     page — Telugu to English at 400-439 px brought the wordmark back
//     beside a button that was still the wide Telugu one. The label and the
//     wordmark rule now read the same value (`lang`), so they move together;
//   • the explanation is shown in a top layer (SignUpShell renders a copy
//     into <body>, position: fixed, above every other layer), so the live
//     strip under the header on the home page — one layer above the header —
//     no longer paints over its lower lines;
//   • unchanged: always /login (not in the skip-/login test), surface
//     "header" counted by the root layout's listener, the words after mount.

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LangSwitcher } from "./LangSwitcher";
import { NotificationBell } from "./NotificationBell";
import { locales, type Locale } from "@/lib/i18n";
import { NAV_TODAY, NAV_TODAY_TITLE } from "@/lib/study-day-copy";
import { fetchSignedIn, hasSessionHint } from "@/lib/session-hint";
import { isUnder13SchoolPath } from "@/lib/school/student-classes";
import { asCopyLocale, clientUiLocale, type CopyLocale } from "@/lib/ui-locale-copy";
import { callbackOfLoginHref } from "@/lib/signin-cta";
import { isChildSchoolPath } from "@/lib/signup-pitch";
import { signUpContextFor, signUpExplain } from "@/lib/signup-cta-copy";
import { SignUpShell, SignUpStackedFace } from "./SignUpButton";

// Re-exported so any import of fetchSignedIn from this file keeps working.
// Resolves true (signed in) / false (guest) / null (probe failed).
export { fetchSignedIn };

interface SessionLite {
  signedIn: boolean;
}

// The guest button: Google's light button with the colour "G", 44 px tall;
// below sm the compact size with the label on two lines (see the note above).
const GUEST_BUTTON_CLASS = "su-google su-google-compact";

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
  // … and the language control's choice the moment it is made: a change
  // there refreshes the route without changing the path, so the effect above
  // does not run and the label kept the old language until the next page.
  const onLocale = useCallback((lc: string) => setLang(asCopyLocale(lc)), []);
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

  // The guest button is on screen (the same test as the branches below), in
  // the language `lang`: <html data-hdr-guest="…"> says so, and the header's
  // wordmark gives way to the TELUGU button only (src/app/globals.css). Never
  // set for a signed-in reader or on a page with no button, so they keep the
  // wordmark; and not while a reader who is probably signed in (the hint
  // cookie) is still being asked about — the button is about to go. A layout
  // effect: the mark changes in the same paint as the label, so the row is
  // never seen with the Telugu button AND the wordmark.
  const guestButton = !signedIn && !childSafe && !isUnder13SchoolPath(pathname);
  useLayoutEffect(() => {
    if (!guestButton || (session === null && hasSessionHint())) return;
    const root = document.documentElement;
    root.setAttribute("data-hdr-guest", lang);
    return () => root.removeAttribute("data-hdr-guest");
  }, [guestButton, session, lang]);

  return (
    <>
      <LangSwitcher current={safeLocale} onLocale={onLocale} />
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
          <SignUpStackedFace locale={lang} joinFromSm />
        </Link>
      ) : (
        <SignUpShell text={signUpTip} surface="header" explain="tooltip" align="end" deferText>
          {(describedBy) => (
            <Link rel="nofollow" href={loginHref} aria-describedby={describedBy} className={GUEST_BUTTON_CLASS} data-signin-surface="header">
              <SignUpStackedFace locale={lang} joinFromSm />
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

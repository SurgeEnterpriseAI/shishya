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

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LangSwitcher } from "./LangSwitcher";
import { NotificationBell } from "./NotificationBell";
import { locales, type Locale } from "@/lib/i18n";
import { NAV_TODAY, NAV_TODAY_TITLE } from "@/lib/study-day-copy";
import { fetchSignedIn } from "@/lib/session-hint";
import { isUnder13SchoolPath } from "@/lib/school/student-classes";

// Re-exported so any import of fetchSignedIn from this file keeps working.
// Resolves true (signed in) / false (guest) / null (probe failed).
export { fetchSignedIn };

interface SessionLite {
  signedIn: boolean;
}

interface Labels {
  dashboard: string;
  signout: string;
  signinShort: string;
}

export function HeaderAuthControls({
  locale,
  labels,
}: {
  locale: string;
  labels: Labels;
}) {
  // null = still resolving (first paint); object = resolved. We render
  // the "Sign in" CTA as the optimistic default so the anonymous case
  // (the common one for a marketing page) has no visible flicker.
  const [session, setSession] = useState<SessionLite | null>(null);
  const pathname = usePathname();
  const [loginHref, setLoginHref] = useState("/login");

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
      ) : isUnder13SchoolPath(pathname) ? null : (
        <Link rel="nofollow" href={loginHref} className="btn-primary !py-2 !px-4 text-xs sm:text-sm">
          {labels.signinShort}
        </Link>
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

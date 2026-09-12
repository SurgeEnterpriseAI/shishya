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
// Session is fetched from NextAuth's built-in /api/auth/session route
// (no extra API surface required). Anonymous = no session cookie =
// no extra fetch round-trip for those visitors.
//
// The fetch is shared (fetchSignedIn) between this rail and the "Today"
// link in the Primary nav row (TodayNavLink, 11 Sep 2026) so a page with
// both still makes ONE session request. Header is on ~127 pages.

import { useEffect, useState } from "react";
import Link from "next/link";
import { LangSwitcher } from "./LangSwitcher";
import { NotificationBell } from "./NotificationBell";
import { locales, type Locale } from "@/lib/i18n";
import { NAV_TODAY, NAV_TODAY_TITLE } from "@/lib/study-day-copy";

interface SessionLite {
  signedIn: boolean;
}

// One in-flight /api/auth/session request per page, shared by every
// header island mounted on it. Short TTL (not a forever cache) so a
// client-side navigation a little later still re-checks, exactly like
// the per-mount fetch did; sign-in / sign-out are full navigations and
// reset module state anyway. Errors resolve to false and are not cached.
const SESSION_TTL_MS = 10_000;
let sessionCache: { at: number; p: Promise<boolean> } | null = null;

export function fetchSignedIn(): Promise<boolean> {
  const now = Date.now();
  if (sessionCache && now - sessionCache.at < SESSION_TTL_MS) return sessionCache.p;
  const p = fetch("/api/auth/session", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => Boolean(data?.user?.id))
    .catch(() => {
      sessionCache = null;
      return false;
    });
  sessionCache = { at: now, p };
  return p;
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

  useEffect(() => {
    let alive = true;
    fetchSignedIn().then((signedIn) => {
      if (alive) setSession({ signedIn });
    });
    return () => {
      alive = false;
    };
  }, []);

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
      ) : (
        <Link rel="nofollow" href="/login" className="btn-primary !py-2 !px-4 text-xs sm:text-sm">
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
      if (alive) setSignedIn(v);
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

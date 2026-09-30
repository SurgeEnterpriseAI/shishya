// Sign-in measurement (30 Sep 2026, founder brief: at least 100 sign-ups a
// day; build 1 of the sign-up wave — measure every door first).
//
// Why: 165 of 307 sign-ups (16–29 Sep) had no sign-in click on record in the
// hour before, so the header, the PYQ card, the quiz end screen and the
// builder could not be told apart, and nothing split "left /login" from
// "left at Google". From 30 Sep 2026:
//   • every sign-in button or link sends ONE CTA_CLICKED beacon,
//     props { cta: "signin-click", surface: <stable id below>, … } — the
//     components through signinBeacon(), plain links to /login through the
//     root layout's click listener (src/components/AnalyticsTracker.tsx, the
//     `data-signin-surface` attribute names them; untagged links read "link");
//   • /login's own Google button sends { cta: "login-google-click",
//     surface: <callback family>, from, inApp } (the second funnel step);
//   • the SIGNUP event (src/lib/auth.ts) carries the callback family and
//     path it signed up from and the browser's first landing path
//     (signupEventProps below; no new table).
//
// Old click names this replaces, for reads that cross 30 Sep 2026:
//   hub-signin-practice            → surface "hub-box"
//   diagnostic-401                 → surface "hub-start-401"
//   signup-pitch-click             → surface "signup-pitch" (+ placement)
//   signup-inline-click            → surface "signup-inline" (+ placement)
//   signup-nudge action "clicked"  → surface "signup-nudge" ("shown" and
//                                    "dismissed" keep cta "signup-nudge")
//   mock-gate-signin-click         → surface "mock-gate" / "mock-gate-quiz-end"
//   build-gate-signin-click        → surface "build-gate-quiz-end"
//
// Pure: no React, no Next, no DB — client islands, src/lib/auth.ts and
// tests import it. No raw user agent and no personal data is ever put in a
// beacon: an in-app browser is a short family label.

import { ctaBeacon } from "@/lib/cta-beacon";

export const SIGNIN_CTA = "signin-click";
export const LOGIN_GOOGLE_CTA = "login-google-click";

/** Stable ids for every sign-in door. Never rename one: the 7-day reads key on them. */
export const SIGNIN_SURFACES = [
  // Header "Sign in free" (every page but Class 1-7) — always /login.
  "header",
  // Exam hub guest box "Sign in free — start practising".
  "hub-box",
  // Exam hub "Try one question" card, after the answer.
  "hub-try-one",
  // A guest pressed a practice button and the API said 401 → /login.
  "hub-start-401",
  "subject-test-401",
  "topic-quiz-401",
  "custom-mock-401",
  // PYQ year page, the guest's main button.
  "pyq-year",
  // The guest quiz's result screen (/exams/{code}/quiz, topic quiz, challenge).
  "quiz-end",
  // /exams/{code}/build-mock, the signed-out builder's button.
  "build-mock-form",
  // The site-wide offer: card, inline block, timed sheet.
  "signup-pitch",
  "signup-inline",
  "signup-nudge",
  // The signed-out mock page and the builder's guest quiz (always straight to Google).
  "mock-gate",
  "mock-gate-quiz-end",
  "build-gate-quiz-end",
  // Home page's secondary "Sign in" line.
  "home-signin",
  // Any other link to /login (the click listener's fallback).
  "link",
] as const;

export type SigninSurface = (typeof SIGNIN_SURFACES)[number];

export function isSigninSurface(v: unknown): v is SigninSurface {
  return typeof v === "string" && (SIGNIN_SURFACES as readonly string[]).includes(v);
}

/** One sign-in click. Best-effort (sendBeacon survives the navigation). */
export function signinBeacon(surface: SigninSurface, extra?: Record<string, unknown>): void {
  ctaBeacon(SIGNIN_CTA, { ...extra, surface });
}

// /login is the most-viewed page on the site and its views were one
// undifferentiated number. The callbackUrl says WHAT the visitor was
// trying to do when the wall appeared; this folds it into a small family
// so login views can be split by intent (11 Sep 2026 signup-leak audit).
// Order matters: /exams/X/pyq/... is "pyq", not "exam". "none" = a bare
// /login visit (cold arrival / header link) — /login itself defaults
// that to /dashboard, but it is not a dashboard intent.
// 30 Sep 2026: moved here from src/components/AnalyticsTracker.tsx (which
// re-exports it) so the server's SIGNUP event can use the same families —
// a "use client" module cannot be called from src/lib/auth.ts.
export function loginCallbackFamily(cb: string | null | undefined): string {
  if (!cb) return "none";
  if (/\/pyq(\/|$|\?|#)/.test(cb)) return "pyq";
  if (/\/mocks\//.test(cb)) return "mock";
  if (/\/coach(\/|$|\?|#)/.test(cb)) return "coach";
  if (/\/dashboard(\/|$|\?|#)/.test(cb)) return "dashboard";
  if (/\/exams\//.test(cb)) return "exam";
  return "other";
}

const MAX_PATH = 120;

/** A same-site page path (no query, no hash), at most 120 characters, or
 *  null. Accepts a path or an absolute shishya.in / localhost URL — the
 *  NextAuth callback cookie holds an absolute URL. */
export function sitePathOnly(url: string | null | undefined): string | null {
  if (typeof url !== "string" || !url) return null;
  try {
    const u = new URL(url, "https://shishya.in");
    const host = u.hostname.replace(/^www\./, "");
    if (host !== "shishya.in" && host !== "localhost" && !host.endsWith(".shishya.in")) return null;
    const p = u.pathname;
    if (!p.startsWith("/") || /\s/.test(p)) return null;
    return p.slice(0, MAX_PATH);
  } catch {
    return null;
  }
}

/** The callbackUrl a /login?callbackUrl=… link carries ("/" when it has none). */
export function callbackOfLoginHref(href: string): string {
  try {
    const u = new URL(href, "https://shishya.in");
    const cb = u.searchParams.get("callbackUrl");
    return cb && cb.startsWith("/") && !cb.startsWith("//") ? cb : "/";
  } catch {
    return "/";
  }
}

/** A /login link that returns to `callbackPath` and names its door. */
export function loginHrefFor(callbackPath: string, from: SigninSurface): string {
  const back = callbackPath && callbackPath.startsWith("/") && !callbackPath.startsWith("//") ? callbackPath : "/";
  return `/login?callbackUrl=${encodeURIComponent(back)}&from=${from}`;
}

/** /login's ?from=, kept only when it is a short id (it rides on analytics rows). */
export function cleanFrom(v: string | null | undefined): string | null {
  return typeof v === "string" && /^[a-z0-9-]{1,32}$/.test(v) ? v : null;
}

/** The sign-in beacon's props for a click on a plain link to /login (the
 *  root layout's listener), or null when the element is not one — or its own
 *  component beacons (data-signin-beacon="self"), so one click is counted
 *  once. `origin` is the page's own: a link elsewhere is not a sign-in. */
export function signinLinkBeaconProps(
  a: { getAttribute(name: string): string | null } | null,
  origin: string,
): { surface: SigninSurface; callbackFamily: string; from?: string } | null {
  if (!a) return null;
  const href = a.getAttribute("href");
  if (!href || a.getAttribute("data-signin-beacon") === "self") return null;
  let u: URL;
  try {
    u = new URL(href, origin);
  } catch {
    return null;
  }
  if (u.origin !== origin || u.pathname !== "/login") return null;
  const tagged = a.getAttribute("data-signin-surface");
  const from = cleanFrom(u.searchParams.get("from"));
  return {
    surface: isSigninSurface(tagged) ? tagged : "link",
    callbackFamily: loginCallbackFamily(u.searchParams.get("callbackUrl")),
    ...(from ? { from } : {}),
  };
}

/** What a signed-in arrival on /exams/CODE?start=… does (30 Sep 2026, HUB
 *  START — src/app/exams/[code]/StartMockButton.tsx runs it once, guarded).
 *  "diagnostic" — the 401 path: the student pressed the diagnostic, so it
 *  starts. "practice" — the hub box's "Sign in free — start practising":
 *  the 5-question diagnostic starts only for a member with no mock history
 *  on this exam (what a first-timer's start button is); a returning member
 *  gets no surprise mock — "panel": the page shows their own start panel.
 *  Anything else: nothing. */
export function hubAutoStart(start: string | null | undefined, hasHistory: boolean): "diagnostic" | "panel" | null {
  if (start === "diagnostic") return "diagnostic";
  if (start === "practice") return hasHistory ? "panel" : "diagnostic";
  return null;
}

// ── First landing page (30 Sep 2026) ────────────────────────────────────
// A first-party cookie the root layout's tracker writes on the browser's
// first page view (never on a Class 1-7 school page: no data taken there),
// read once by the SIGNUP event. Path only — no query, so no tokens or
// utm values ride in it. 30 days: 90% sign up in their first session, the
// rest within days.
export const LANDING_COOKIE = "shishya_land";
export const LANDING_COOKIE_MAX_AGE_S = 30 * 24 * 3600;

/** The Set-Cookie body (document.cookie form) for a first landing on `path`. */
export function landingCookieString(path: string, secure: boolean): string | null {
  const p = sitePathOnly(path);
  if (!p) return null;
  return `${LANDING_COOKIE}=${encodeURIComponent(p)}; Path=/; Max-Age=${LANDING_COOKIE_MAX_AGE_S}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

/** True when a document.cookie string already carries a landing. */
export function cookieHasLanding(cookie: string | null | undefined): boolean {
  return typeof cookie === "string" && new RegExp(`(?:^|;\\s*)${LANDING_COOKIE}=`).test(cookie);
}

/** The stored landing path, or null when absent or malformed. */
export function parseLandingCookie(raw: string | null | undefined): string | null {
  if (typeof raw !== "string" || !raw) return null;
  let v = raw;
  try {
    v = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return v.startsWith("/") && !v.startsWith("//") ? sitePathOnly(v) : null;
}

/** The SIGNUP event's props: the provider (and school flag, as before),
 *  plus where the account was made from — the callback's family and path —
 *  and the browser's first landing path when the cookie holds one. */
export function signupEventProps(p: {
  school: boolean;
  callback: string | null | undefined;
  landing: string | null | undefined;
}): Record<string, unknown> {
  const props: Record<string, unknown> = p.school ? { provider: "google", school: true } : { provider: "google" };
  props.callbackFamily = loginCallbackFamily(p.callback);
  const cbPath = sitePathOnly(p.callback);
  if (cbPath) props.callbackPath = cbPath;
  const landing = parseLandingCookie(p.landing);
  if (landing) props.landingPath = landing;
  return props;
}

// ── Header button label (30 Sep 2026, founder: "sign-up invitations clear
// and visible") ── The header renders English on the server (it stays
// statically cacheable) and switches to the reader's language after mount.
export const HEADER_SIGNIN_LABEL: Readonly<Record<"en" | "hi" | "te", string>> = {
  en: "Sign in free",
  hi: "मुफ़्त साइन इन",
  te: "ఉచితంగా Sign in",
};

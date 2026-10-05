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
// 3 Oct 2026 (sign-ups-to-100 plan, lever 5 — THE 401 DOORS): the three hub
// practice buttons no longer bounce a guest to /login. See "The 401 doors"
// below; it changes what "signin-click" counts for those three surfaces from
// that deploy on (SERIES BREAK, written out there).
//
// Pure: no React, no Next, no DB — client islands, src/lib/auth.ts and
// tests import it. No raw user agent and no personal data is ever put in a
// beacon: an in-app browser is a short family label.

import { ctaBeacon } from "@/lib/cta-beacon";
import { schoolContainerClassOf } from "@/lib/school/student-classes";
import { cleanUtmContent } from "@/lib/utm-content";

export const SIGNIN_CTA = "signin-click";
export const LOGIN_GOOGLE_CTA = "login-google-click";

/** Stable ids for every sign-in door. Never rename one: the 7-day reads key on them. */
export const SIGNIN_SURFACES = [
  // Header "Sign up with Google" (every page but Class 1-7) — always /login.
  "header",
  // Exam hub guest box (it read "Sign in free — start practising" until 2 Oct 2026).
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
  // 2 Oct 2026 — doors that were plain links (counted as "link") and are now
  // the shared "Sign up with Google" button, each under its own id. None is
  // in the skip-/login test: all go to /login, as they did.
  // Class 8-12 chapter page, the save line after the practice.
  "school-save",
  // The guest tutor's save card (/chat, after the first reply).
  "chat-save",
  // A challenge link's result screen (/c/{token}).
  "challenge-end",
  // /for/{persona}, the bottom card.
  "persona-card",
  // 2 Oct 2026 (review) — four more filled guest buttons that carried their
  // own words ("Start free — build my plan" …) and are now the shared button
  // under a line that says what it is for. All /login, none in the test.
  // /coach, the guest pitch.
  "coach-start",
  // /revision (the Mistake Notebook), the guest pitch.
  "revision-start",
  // /join/{inviteCode}, a batch invite opened by a guest.
  "batch-join",
  // /find-your-exam, "save these matches" under a guest's results.
  "finder-save",
  // 2 Oct 2026 (founder: "wherever the sign in or sign up … has to be
  // replaced with Google sign up") — every remaining guest call that had its
  // own look (a saffron or green button, a bar, a text link inside a
  // sentence) is the shared button now, each under its own id. They were
  // counted as "link" (or, for the home page, "home-signin"). All go to
  // /login as they did; none is in the skip-/login test.
  // /live-test, an open paper's card ("Sign in free to write it →").
  "live-test",
  // /g/{token}, a study group's invite ("Sign in to join").
  "group-join",
  // The fact-verification side panel on a college page ("Sign in →").
  "verify-fact",
  // Home page, the vacancies rail's footer ("Prepping for one of these?").
  "home-vacancies",
  // /discussions/{id}, where a member sees the reply box.
  "discussion-reply",
  // The guest tutor's line under the page title (/chat), before any reply.
  "chat-banner",
  // /exams/{CODE}/cutoff, the green nudge box (first there; the quiz link follows it).
  "cutoff-nudge",
  // The "rate the paper" poll, after a guest's vote.
  "verdict-poll",
  // /community-vouching/{domain}, the guest notice.
  "vouch",
  // /ideas, under "sign in to upvote".
  "ideas-upvote",
  // "Save my path" on /after-10th, /after-12th and the stream pages
  // (src/components/paths/SavePathButton.tsx; its link already carries
  // from=save-path).
  "save-path",
  // The whole paper's result screen for a guest (switched off since 28 Sep).
  "guest-paper",
  // The blur wall's card (stopped on 29 Sep).
  "soft-wall",
  // /descriptive: a guest pressed "evaluate" and the API said 401 → /login.
  "descriptive-401",
  // /find-your-exam, the bottom card under a guest's results ("Pick your #1
  // and start today"): it told a guest to sign in and had no sign-in button.
  "finder-start",
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

// ── The 401 doors (3 Oct 2026) ──────────────────────────────────────────
// A guest who presses a practice button on an exam hub — the 5-question
// diagnostic (StartMockButton), a subject test (SubjectTestButton) or
// "Generate my mock" (CustomMockBuilder), all in src/app/exams/[code]/ — gets
// 401 from POST /api/mocks. Until this build the 401 sent them to /login at
// once. Clickers who hit it made an account within 2 hours 2 times in 10
// (30 Sep – 3 Oct), against 63-89% on the in-page sign-up buttons.
// Now the 401 opens the shared "Sign up with Google" button right where they
// pressed (src/app/exams/[code]/PracticeSignUpDoor.tsx): its reason line is the
// entry src/lib/signup-place.ts chooses for the door, and under it the age
// line ("For students 13 and above", the timed bar's own words). The button's
// link is the same /login link the redirect used — same callback (it brings
// them back to start that test: ?start=diagnostic starts the diagnostic by
// itself, #subject-tests and #custom-mock return to the section they pressed
// in), same from=. These doors stay OUT of the skip-/login test
// (src/lib/direct-signin-ab.ts), so a tap still passes /login and its own
// age small print.
//
// BEACONS, and the SERIES BREAK for reads that cross the deploy:
//   • before it, "signin-click" with surface hub-start-401 / subject-test-401
//     / custom-mock-401 was sent by the 401 itself (via "login"): it counted
//     PRESSES that hit the 401;
//   • from it, the 401 sends ONE { cta: "signin-door", action: "shown",
//     surface, examCode } (SIGNIN_DOOR_CTA) when the button opens — the
//     presses — and "signin-click" with the same surface is sent by the
//     button itself (SignInLink), only when it is pressed. Same door ids.
// The plan's read: share of "signin-door" shown browsers with an account
// within 2 hours, by door (stop if under 40% after 30 browsers).
// The GENERAL press and completion reads (the daily readout's hub press and
// completion lines) must count a "signin-door" shown row as a PRESS, under
// its surface: before the deploy the same guest made a press (a 401 beacon
// and a /login view); after it, without that, they would count as pressed
// only if they also tap the button — hub press would fall and completion
// rise for the same behaviour. scripts/tmp-s100-funnel-1.ts and
// scripts/tmp-s100-check-2.ts do so (3 Oct 2026 review).
//
// NOT on a kids' exam hub — the SOF (SOF_*), Silverzone (SZF_*) and NSTSE
// olympiads, which Class 1-12 students sit, and JNVST (Navodaya's Class 6
// entry test, sat in Class 5; inactive on 3 Oct 2026, so no hub today: listed
// so that switching it on can never open a door there) — nor on a school
// class container (a Class 1-7 page never has a hub; this fails closed
// anyway). There the 401 keeps the old /login redirect and its
// "signin-click" beacon exactly as before: whether the olympiad hubs offer
// sign-up at all is the founder's open decision of 7 Oct 2026 (sign-ups
// plan, founder asks), and this build adds nothing there.

/** The beacon a 401 door sends when its button opens (props.action "shown"). */
export const SIGNIN_DOOR_CTA = "signin-door";

/** The hub practice buttons whose 401 opens the inline button (door ids above). */
export const PRACTICE_401_DOORS = ["hub-start-401", "subject-test-401", "custom-mock-401"] as const satisfies readonly SigninSurface[];
export type Practice401Door = (typeof PRACTICE_401_DOORS)[number];

/** SOF, Silverzone and NSTSE olympiads (the catalogue's codes: SOF_IMO,
 *  SOF_NSO … SZF_IOM … NSTSE — read 3 Oct 2026). Sat by Class 1-12 students,
 *  so no new sign-up lever goes on their pages (sign-ups plan, "Not to do"). */
export function isKidsOlympiadCode(code: string | null | undefined): boolean {
  return typeof code === "string" && /^(?:SOF_|SZF_|NSTSE(?:_|$))/.test(code);
}

/** Entry tests sat by children under 13 that are not olympiads (3 Oct 2026
 *  review): JNVST, Navodaya Vidyalaya's Class 6 entry test (src/lib/
 *  exam-aliases.ts "navodaya"). Inactive in the catalogue on 3 Oct 2026 (no
 *  hub). A new one is added here on purpose: tests/unit/practice-401-doors
 *  .test.ts lists every exam code the repo knows for under-13s. */
export const UNDER13_ENTRY_EXAM_CODES: readonly string[] = ["JNVST"];

/** A kids' exam: a kids' olympiad (isKidsOlympiadCode) or an under-13 entry
 *  test (UNDER13_ENTRY_EXAM_CODES). */
export function isKidsExamCode(code: string | null | undefined): boolean {
  return isKidsOlympiadCode(code) || (typeof code === "string" && UNDER13_ENTRY_EXAM_CODES.includes(code));
}

/** True when a hub practice button's 401 may open the inline sign-up button
 *  for this exam; false → the old /login redirect. Fails closed: no code, a
 *  school class container (any class) or a kids' exam → false. */
export function practiceDoorInline(examCode: string | null | undefined): boolean {
  if (typeof examCode !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(examCode)) return false;
  if (schoolContainerClassOf(examCode) !== null) return false;
  return !isKidsExamCode(examCode);
}

/** The page each 401 door's sign-in returns to — the callbacks the /login
 *  redirect always used (unchanged ids, unchanged reads). */
export function practiceDoorCallback(door: Practice401Door, examCode: string): string {
  if (door === "hub-start-401") return `/exams/${examCode}?start=diagnostic`;
  if (door === "subject-test-401") return `/exams/${examCode}#subject-tests`;
  return `/exams/${examCode}#custom-mock`;
}

/** One "the 401 door's button opened" beacon. Best-effort. */
export function signinDoorShownBeacon(surface: Practice401Door, extra?: Record<string, unknown>): void {
  ctaBeacon(SIGNIN_DOOR_CTA, { ...extra, action: "shown", surface });
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
 *  and the browser's first landing path when the cookie holds one.
 *  3 Oct 2026: + utmContent — the first attributable landing's utm_content
 *  (the attribution cookie, src/lib/signup-attribution.ts), cleaned exactly
 *  as the analytics route cleans a page view's props.utmContent
 *  (src/lib/utm-content.ts: a slug of at most 64 characters; an email- or
 *  phone-like value is dropped). It rides in props like the page view's: the
 *  SIGNUP row has columns for utm_source / utm_medium / utm_campaign only.
 *  Absent → no key, so every older read sees the same props. */
export function signupEventProps(p: {
  school: boolean;
  callback: string | null | undefined;
  landing: string | null | undefined;
  utmContent?: string | null;
}): Record<string, unknown> {
  const props: Record<string, unknown> = p.school ? { provider: "google", school: true } : { provider: "google" };
  props.callbackFamily = loginCallbackFamily(p.callback);
  const cbPath = sitePathOnly(p.callback);
  if (cbPath) props.callbackPath = cbPath;
  const landing = parseLandingCookie(p.landing);
  if (landing) props.landingPath = landing;
  const utmContent = cleanUtmContent(p.utmContent);
  if (utmContent) props.utmContent = utmContent;
  return props;
}

// ── Header button label ──
// 30 Sep 2026: "Sign in free" (HEADER_SIGNIN_LABEL, here).
// 2 Oct 2026 (founder, standing: "Sign up with Google"): the label moved to
// src/lib/signup-cta-copy.ts — the ONE place for every sign-up button's
// words — and this constant is gone.

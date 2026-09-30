// The one-time "Your Shishya is ready" strip (30 Sep 2026, sign-up build 2).
//
// Founder brief: people must understand that signing up puts the entire
// Shishya in their hand because it is personalised for them. Before this, a
// new member landed back on the same page, which looked almost the same — a
// search of src for a post-sign-up confirmation found nothing, and the
// first-hour action rate after a sign-in card / timed-sheet sign-up was
// 44-50%.
//
// How it is shown once, with no new column:
//   • the NextAuth createUser event (src/lib/signup-profile.ts) sets
//     WELCOME_COOKIE — non-httpOnly, PII-free ("1"), 2 hours — for an
//     exam-side sign-up only (a school sign-in never gets it, and no Class
//     1-7 page ever shows the strip);
//   • the Header's island (src/components/WelcomeStrip.tsx) reads it after
//     mount — no cookie, no request — and on the first page where the strip
//     may show asks GET /api/me/welcome, which answers show:false unless the
//     account is under WELCOME_WINDOW_MS old, is not school-only and has no
//     "welcome-strip" beacon yet (the server-side "already shown");
//   • the island clears the cookie as soon as the server has answered.
// It is inline under the header, never a popup, dismissible, and never
// where a paper is in progress or about to open (welcomeStripAllowedHere).
// 2 hours, not 30 minutes: a student who signs up from a mock gate sits the
// paper first, and the strip then shows on the result page.
//
// Pure: no React, no Next, no DB (the island, the route and tests import it).

import { isChildSchoolPath } from "@/lib/signup-pitch";
import { isUnder13SchoolPath } from "@/lib/school/student-classes";

export const WELCOME_COOKIE = "shishya_welcome";
export const WELCOME_COOKIE_VALUE = "1";
export const WELCOME_WINDOW_MS = 2 * 3600_000;
export const WELCOME_COOKIE_MAX_AGE_S = WELCOME_WINDOW_MS / 1000;
/** The beacon cta for shown / change / changed / dismiss / chat-continue. */
export const WELCOME_CTA = "welcome-strip";
/** A sign-up goal is the enrolment createUser wrote: made within this long
 *  of the account itself. Only such an enrolment, never practised, is
 *  removed when the student changes the exam from the strip. */
export const SIGNUP_GOAL_GRACE_MS = 2 * 60_000;

/** True when a `document.cookie` string carries the welcome cookie. */
export function cookieHasWelcome(cookie: string | null | undefined): boolean {
  return typeof cookie === "string" && new RegExp(`(?:^|;\\s*)${WELCOME_COOKIE}=${WELCOME_COOKIE_VALUE}(?:;|$)`).test(cookie);
}

/** The `document.cookie` assignment that clears it (same name and path as the server's). */
export function welcomeCookieClearString(secure: boolean): string {
  return `${WELCOME_COOKIE}=; path=/; max-age=0; samesite=lax${secure ? "; secure" : ""}`;
}

/** Is the account still new enough for the strip? */
export function withinWelcomeWindow(createdAt: Date | string | number, nowMs: number): boolean {
  const t = new Date(createdAt).getTime();
  return Number.isFinite(t) && nowMs >= t - 60_000 && nowMs - t <= WELCOME_WINDOW_MS;
}

/** Where the strip may show now. Anything else waits for a later page (the
 *  cookie is kept): a Class 1-7 or class-agnostic school page (never), the
 *  sign-in / admin / onboarding pages, a paper in progress (/mocks/{id},
 *  /live-test/{id}, the aptitude test, a friend's challenge /c/{token}),
 *  and a page about to open one (?start=diagnostic / ?start=practice — the
 *  hub's auto-start). */
export function welcomeStripAllowedHere(path: string | null | undefined, search?: string | null): boolean {
  if (typeof path !== "string" || !path.startsWith("/")) return false;
  if (isChildSchoolPath(path) || isUnder13SchoolPath(path)) return false;
  const p = path.replace(/^\/(?:hi|te)(?=\/|$)/, "") || "/";
  if (
    p.startsWith("/login") ||
    p.startsWith("/logout") ||
    p.startsWith("/admin") ||
    p.startsWith("/onboarding") ||
    p.startsWith("/mocks/") ||
    p.startsWith("/live-test/") ||
    // 30 Sep 2026 (review): the challenge player renders the Header — a
    // member who signed up from a challenge must not get the strip (and
    // its exam search) above the questions they are playing.
    p.startsWith("/c/") ||
    p.startsWith("/aptitude") ||
    p.startsWith("/typing")
  ) {
    return false;
  }
  return !/[?&]start=(?:diagnostic|practice)\b/.test(search ?? "");
}

/** The strip's "Change exam" search: exams whose code, short name or name
 *  contain every typed word (case, spaces, "_" and "-" ignored), short-name
 *  starts first. Light on purpose — the island ships on every page, so the
 *  27 KB alias table (src/lib/exam-aliases.ts) stays out of it. */
export function matchExams<T extends { code: string; shortName: string; name: string }>(exams: readonly T[], query: string, limit = 6): T[] {
  const norm = (s: string) => s.toLowerCase().replace(/[\s_\-.]+/g, "");
  const words = query.toLowerCase().split(/\s+/).map(norm).filter(Boolean);
  if (words.length === 0) return [];
  const hits = exams.filter((e) => {
    const hay = `${norm(e.code)}|${norm(e.shortName)}|${norm(e.name)}`;
    return words.every((w) => hay.includes(w));
  });
  const q = norm(query);
  hits.sort((a, b) => Number(!norm(a.shortName).startsWith(q)) - Number(!norm(b.shortName).startsWith(q)));
  return hits.slice(0, limit);
}

/** The shape GET /api/me/welcome answers with. */
export interface WelcomeData {
  show: boolean;
  /** The account's exam goal (newest active real-exam enrolment), if any. */
  exam: { code: string; shortName: string } | null;
  /** 30 Sep 2026 (review): the goal exam HAS practice, so /today serves it a
   *  Daily 5 set (pickDailyFive and the daily-five cron skip an exam with
   *  none — src/lib/db/exam-practice.ts practiceExamCodes). Gates the
   *  headline's "Daily 5"; false with no goal or on a failed read. */
  practice: boolean;
  /** The Daily 5 mail line is true: practice (above), an email, not opted
   *  out (the morning mail). */
  dailyFiveEmail: boolean;
  /** Live challenge links the account holds (a guest's are linked at sign-up). */
  challenges: number;
  /** Exam alerts linked to the account. */
  alerts: number;
}

/** A "Change exam" pick, as POST /api/me/welcome answered it (the same
 *  practice / mail rule as GET, for the NEW exam). */
export interface WelcomePick {
  code: string;
  shortName: string;
  practice: boolean;
  dailyFiveEmail: boolean;
}

/** What the strip describes now: the student's pick once made, else the
 *  server's answer. 30 Sep 2026 (review): derived on every render, never
 *  copied into state when the panel mounts — the island mounts the panel as
 *  soon as a guest chat is imported, which can be BEFORE GET answers, and a
 *  copy taken then stayed null (no goal named, no Daily 5 line, and a pick
 *  sent from:null so a wrong sign-up guess was never removed). */
export function welcomeStripNow(
  data: WelcomeData | null,
  picked: WelcomePick | null,
): { exam: { code: string; shortName: string } | null; practice: boolean; dailyFiveEmail: boolean } {
  if (picked) {
    return { exam: { code: picked.code, shortName: picked.shortName }, practice: picked.practice, dailyFiveEmail: picked.practice && picked.dailyFiveEmail };
  }
  const exam = data?.exam ?? null;
  const practice = !!exam && data?.practice === true;
  return { exam, practice, dailyFiveEmail: practice && data?.dailyFiveEmail === true };
}

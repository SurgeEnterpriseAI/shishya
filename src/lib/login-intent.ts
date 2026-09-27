// Which card /login shows for a callback (27 Sep 2026, review of the
// content-first wave). Pure: no React, no DB — src/app/login/page.tsx reads
// it, tests/unit/login-intent.test.ts pins it.
//
// Why a module: the header's "Sign in" (src/components/HeaderAuthControls.tsx)
// and the SignupNudge now send the page they were clicked on as the
// callback, so /login sees every page of the site as a callback, not only
// the gated actions it was written for. The old guesses then misfired:
//   • /\/exams\/([A-Z0-9_]+)/i matched /exams/browse, /exams/entrance and
//     /exams/state/… — "Your browse mock is one tap away" and a "Try 5
//     browse questions" link to /exams/browse/quiz (broken);
//   • any exam sub-page (/syllabus, /cutoff) promised a mock that "opens
//     straight away" while the user went back to the syllabus page;
//   • /(me\/report|live-test|mentor)/ matched /mentors (the public list), so
//     strangers were greeted "Welcome back" — the 11 Sep audit had removed
//     exactly that from the header path (53% bounce).
// Rules now:
//   • from=header (the header and the nudge) is never a gated action: no
//     mock, coach or "Welcome back" card. The school and chat cards still
//     apply (they only say what signing in keeps);
//   • an exam code is a real UPPER-CASE code segment ending the segment;
//   • the mock card needs a gated path: /mocks/, /pyq/, the exam's quiz or
//     topics, ?start=diagnostic, or the exam hub itself (where its mock
//     buttons live) — never /syllabus, /cutoff or another sub-page;
//   • coach and "Welcome back" are anchored path prefixes (/mentor is the
//     desk, /mentors is not).

import { isSchoolSignInCallback } from "@/lib/school/student-classes";

export type LoginIntentKind = "school" | "mock" | "chat" | "coach" | "return";

export interface LoginIntent {
  kind: LoginIntentKind | null;
  /** The real exam code in the callback, or null. */
  examCode: string | null;
  /** Show "Not ready to sign in? Try 5 {exam} questions first" (a mock card with an exam). */
  tryFirst: boolean;
}

/** The callback as a same-site path + query + hash (an absolute shishya.in URL
 *  is reduced to its path; anything unparsable is read as it is). */
function callbackPath(cb: string): string {
  try {
    const u = new URL(cb, "https://shishya.in");
    return u.pathname + u.search + u.hash;
  } catch {
    return cb;
  }
}

const LOCALE = String.raw`(?:hi\/|te\/)?`;
const EXAM_CODE_RE = /\/exams\/([A-Z][A-Z0-9_]+)(?=[/?#]|$)/;
const HUB_RE = new RegExp(String.raw`^\/${LOCALE}exams\/[A-Z][A-Z0-9_]+(?:[?#]|$)`);
const COACH_RE = new RegExp(String.raw`^\/${LOCALE}coach(?:[/?#]|$)`);
const RETURN_RE = new RegExp(String.raw`^\/${LOCALE}(?:me\/report|live-test|mentor)(?:[/?#]|$)`);
const CHAT_RE = new RegExp(String.raw`^\/${LOCALE}chat(?:[/?#]|$)`);

export function loginIntent(callbackUrl: string, from?: string | null): LoginIntent {
  const cb = callbackPath(callbackUrl);
  const fromHeader = from === "header";
  const m = cb.match(EXAM_CODE_RE);
  const examCode = m ? m[1] : null;
  if (isSchoolSignInCallback(callbackUrl)) return { kind: "school", examCode, tryFirst: false };
  const gated =
    /\/mocks\//.test(cb) ||
    /\/pyq\//.test(cb) ||
    (!!examCode && /\/(quiz|topics)\b/.test(cb)) ||
    /[?&]start=diagnostic\b/.test(cb) ||
    HUB_RE.test(cb);
  if (!fromHeader && gated) return { kind: "mock", examCode, tryFirst: !!examCode };
  if (CHAT_RE.test(cb)) return { kind: "chat", examCode: null, tryFirst: false };
  if (!fromHeader && COACH_RE.test(cb)) return { kind: "coach", examCode, tryFirst: false };
  if (!fromHeader && RETURN_RE.test(cb)) return { kind: "return", examCode, tryFirst: false };
  return { kind: null, examCode, tryFirst: false };
}

// What a new account starts with (30 Sep 2026, sign-up build 2 — founder
// brief: signing up puts "the entire Shishya in their hand" because it is
// personalised from the profile at sign-up and the questions they ask).
//
// Why: the page a student signs up from names the exam they came for — the
// /login card already reads it ("Your SSC CGL mock is one tap away",
// src/lib/login-intent.ts) — but createUser threw it away. Everything
// personal keys on Enrollment (Daily 5, the dashboard, HomeForYou, the
// tutor's exam, the exam-date mails), so ~1 in 5 new accounts (56 of 282,
// 16-30 Sep) still had no exam a day later, 49 of them after signing up
// from an exam page. The context is almost never ambiguous: 263 of 269
// linked browsers viewed exactly one exam before signing up.
//
// Rules (pinned in tests/unit/signup-goal.test.ts):
//   • the goal is the exam of the callback page — /exams/{CODE}/… (with the
//     /hi and /te twins), /chat?examCode=, /coach?exam= — or the exam of the
//     mock /mocks/{id} (looked up by src/lib/signup-profile.ts);
//   • an exam code is UPPER-CASE (so /exams/browse, /exams/state/… are not
//     exams) and never a school container (NCERT_C09, CISCE_C05 …): school
//     sign-ins have their own branch in createUser, and Class 1-7 never
//     holds an enrolment;
//   • only when the callback is a generic return (none, /, /dashboard,
//     /today, plain /coach or /chat) does the browser's own last page before
//     /login decide instead (goalFromTrail) — a student who signed up from
//     /colleges/… is not given an exam from an older page;
//   • the page language (/hi or /te callback, else the shishya-lang cookie)
//     becomes User.preferredLang when it is not English;
//   • 17 Oct 2026 (under-13 safety, founder: "go ahead with the safety
//     fixes"): a KIDS' exam is never set by itself — autoGoalAllowed below,
//     the under-13 guard every kids' rule uses (src/lib/signin-cta.ts
//     under13ExamGuard: SOF, Silverzone, NSTSE, PRIL, ZIO, JNVST). The
//     signup reads a page as before (signupGoalOf stays the exact twin of
//     src/lib/signup-cta-copy.ts callbackGoal); src/lib/signup-profile.ts
//     drops the exam it resolves — from the callback, the trail or a mock —
//     when this says no. 12 of the 51 kids' enrolments held on 17 Oct were
//     made by this sign-up goal itself, 9 of them in the 15 days before
//     (SELECT-only read); none since 14 Oct, when kids' pages lost sign-up.
// Pure: no React, no Next, no DB.

import { schoolContainerClassOf } from "@/lib/school/student-classes";
import { under13ExamGuard } from "@/lib/signin-cta";
import { localeToLanguage, type LanguageCode } from "@/lib/preferred-lang";

export type SignupGoal = { kind: "exam"; code: string } | { kind: "mock"; id: string };

const EXAM_CODE = /^[A-Z][A-Z0-9_]{1,39}$/;
const MOCK_ID = /^[A-Za-z0-9_-]{8,64}$/;

function parse(url: string | null | undefined): URL | null {
  if (typeof url !== "string" || url.length === 0) return null;
  try {
    // NextAuth's redirect callback has already refused a foreign origin
    // before it wrote the callback cookie; a path is read against the site.
    return new URL(url, "https://shishya.in");
  } catch {
    return null;
  }
}

/** /hi/exams/X → /exams/X (the URL-locale twins, src/middleware.ts). */
function withoutTwin(path: string): string {
  const m = /^\/(?:hi|te)(\/.*)?$/.exec(path);
  return m ? m[1] || "/" : path;
}

function examGoal(code: string | null | undefined): SignupGoal | null {
  if (typeof code !== "string" || !EXAM_CODE.test(code)) return null;
  // A school container is never an exam goal (school sign-ins enrol through
  // their own branch; Class 1-7 never holds an enrolment).
  if (schoolContainerClassOf(code) !== null) return null;
  return { kind: "exam", code };
}

/** The exam goal a page names, or null. Accepts a path or an absolute URL. */
export function signupGoalOf(url: string | null | undefined): SignupGoal | null {
  const u = parse(url);
  if (!u) return null;
  const path = withoutTwin(u.pathname);
  const exam = /^\/exams\/([^/]+)(?:\/|$)/.exec(path);
  if (exam) return examGoal(exam[1]);
  if (path === "/chat" || path === "/chat/") return examGoal(u.searchParams.get("examCode"));
  if (path === "/coach" || path === "/coach/") return examGoal(u.searchParams.get("exam"));
  const mock = /^\/mocks\/([^/]+)(?:\/|$)/.exec(path);
  if (mock && MOCK_ID.test(mock[1])) return { kind: "mock", id: mock[1] };
  return null;
}

/** True when sign-up may make this exam the new account's goal by itself
 *  (17 Oct 2026). Never a kids' exam — children from Class 1 sit them and a
 *  child under 13 gives us no data (under13ExamGuard, the one under-13
 *  rule) — and never a school container. A member may still pick a kids'
 *  exam themselves (the hub, the tutor, the wizard's chips); that is not
 *  this rule. Fails closed on no code; a kids' code is matched as stored and
 *  upper-cased. */
export function autoGoalAllowed(code: string | null | undefined): boolean {
  if (typeof code !== "string" || code.trim() === "") return false;
  if (schoolContainerClassOf(code) !== null) return false;
  return !under13ExamGuard(code) && !under13ExamGuard(code.trim().toUpperCase());
}

/** True when the callback is a generic return — no page of its own to name
 *  an exam — so the browser's last page before /login may (goalFromTrail).
 *  A specific page (a college, a school class, current affairs) is not. */
export function callbackAllowsTrailGoal(url: string | null | undefined): boolean {
  if (typeof url !== "string" || url.length === 0) return true;
  const u = parse(url);
  if (!u) return false;
  const path = withoutTwin(u.pathname).replace(/\/+$/, "") || "/";
  if (path === "/" || path === "/dashboard" || path === "/today") return true;
  if (path === "/coach") return !u.searchParams.get("exam");
  if (path === "/chat") return !u.searchParams.get("examCode");
  return false;
}

/** The goal from the browser's own page views, NEWEST FIRST: the last page
 *  it read before /login decides (a /login or /logout view is skipped). A
 *  last page that names no exam gives no goal — an older exam page is not
 *  taken over the page the student was actually on. */
export function goalFromTrail(paths: readonly (string | null | undefined)[]): SignupGoal | null {
  for (const p of paths) {
    if (typeof p !== "string" || !p.startsWith("/")) continue;
    const bare = withoutTwin(p.split(/[?#]/)[0]);
    if (bare === "/login" || bare.startsWith("/login/") || bare === "/logout" || bare.startsWith("/api/")) continue;
    return signupGoalOf(p);
  }
  return null;
}

/** The language to store at sign-up, or null (English, unknown, or a
 *  locale the Language enum has no value for). A /hi or /te callback is the
 *  explicit signal; otherwise the shishya-lang cookie the reader set. */
export function signupLanguage(i: { callback: string | null | undefined; cookie: string | null | undefined }): LanguageCode | null {
  const u = parse(i.callback);
  const twin = u ? /^\/(hi|te)(?:\/|$)/.exec(u.pathname)?.[1] ?? null : null;
  const code = localeToLanguage(twin ?? (typeof i.cookie === "string" ? i.cookie : null));
  return code && code !== "EN" ? code : null;
}

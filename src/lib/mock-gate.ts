// Signed-out mock gate + the short-or-full choice after sign-in (25 Sep 2026).
//
// Whole-September read (11-24 Sep): 200-257 guest ids reached /login and
// never signed up, and 183 signed-out people opened /build-mock (131 never
// signed in). A /login in front of a mock still converts 44% (41/94), so
// sign-in stays the first and biggest thing on the gate. What the gate adds
// is a way on for the rest: the exam's 5-question guest quiz, whose end
// screen signs in for THIS mock.
//
// After sign-in the mock page used to create the attempt on load. Of 41 such
// first attempts (29 paper-length, 28 from ChatGPT) 54% finished, 20% left
// at 0 answers; the hub's short diagnostic finishes 84-87%. So a student who
// just came back from Google (from=signin) to a paper-length mock
// (>= CHOICE_MIN_QUESTIONS) with nothing in progress gets a choice: the
// full paper, or the hub's 5-question diagnostic as a warm-up. Everyone else
// keeps the old behaviour exactly.
//
// Pure: no DB, no React — the page, the gate and tests/unit/mock-gate.test.ts
// share it. Callback paths reuse src/lib/login-return.ts, so only the three
// utm tags ride along and the result is always a same-origin relative path.

import { returnUtmQuery, withReturnUtm, loginRedirectPath, type SearchParamsInput } from "@/lib/login-return";

/** The marker the gate puts on its sign-in callback: /mocks/{id}?from=signin. */
export const FROM_PARAM = "from";
export const FROM_SIGNIN = "signin";

/** A mock this long is a paper, not a drill: offer the warm-up first. */
export const CHOICE_MIN_QUESTIONS = 50;

/** The warm-up is the hub's own diagnostic: StartMockButton's
 *  ?start=diagnostic auto-start POSTs /api/mocks with exactly this. */
export const WARMUP_REQUEST = { type: "DIAGNOSTIC", questionCount: 5 } as const;
export const WARMUP_QUESTION_COUNT = WARMUP_REQUEST.questionCount;
/** Its timer: src/lib/ai/generator.ts ruleBasedDiagnostic sets
 *  estimateDuration(5) = max(10, round(5 x 1.2)) = 10 minutes. The copy
 *  shows this number, so it must stay the real one. */
export const WARMUP_TIMER_MIN = Math.max(10, Math.round(WARMUP_QUESTION_COUNT * 1.2));

/** 25 Sep 2026 (review): the warm-up must not strand the student. The choice
 *  opens the warm-up with router.push (as the hub's StartMockButton does), and
 *  the player replaces itself with the results page on submit, so Back from
 *  the warm-up's result lands on this choice again. The choice writes this
 *  per-tab sessionStorage key (the paper's mock id) when the warm-up starts,
 *  so on that return it can say "this mock is still here" and count
 *  the return (mock-choice-view, returned: true). Nothing records it
 *  server-side yet: the results page links to no other mock (follow-up). */
export const WARMUP_RETURN_KEY = "shishya.warmupFor";

/** True when the tab's stored warm-up marker names THIS paper. */
export function isWarmupReturn(stored: string | null | undefined, mockId: string): boolean {
  return typeof stored === "string" && stored !== "" && stored === mockId;
}

/** The player's own fallback when a mock's config carries no duration. */
export const DEFAULT_MOCK_DURATION_MIN = 30;

/** The time the player will actually run for this mock (same rule as
 *  src/app/mocks/[id]/page.tsx: config.durationMin, else 30). */
export function mockDurationMin(config: unknown): number {
  const d = (config as { durationMin?: unknown } | null | undefined)?.durationMin;
  // The page passes any stored value through (?? 30); a numeric string would
  // still run as that number, so it is shown as that number.
  const n = typeof d === "number" ? d : typeof d === "string" && d.trim() !== "" ? Number(d) : Number.NaN;
  return Number.isFinite(n) ? n : DEFAULT_MOCK_DURATION_MIN;
}

function firstParam(sp: SearchParamsInput, key: string): string | undefined {
  if (!sp) return undefined;
  if (sp instanceof URLSearchParams) return sp.get(key) ?? undefined;
  const raw = sp[key];
  return Array.isArray(raw) ? raw[0] : raw;
}

/** True when this page load is the return from Google sign-in via the gate
 *  (or the private-mock /login bounce), i.e. the URL carries from=signin. */
export function isFromSignin(sp: SearchParamsInput): boolean {
  return firstParam(sp, FROM_PARAM) === FROM_SIGNIN;
}

export interface ChoiceInput {
  /** The URL carries from=signin. */
  fromSignin: boolean;
  /** Questions the mock really holds (questionIds.length). */
  questionCount: number;
  /** An IN_PROGRESS attempt exists (after the live-test void rule). */
  hasInProgress: boolean;
  /** All-India Live Test papers keep their start-on-load flow: the ranked
   *  window is short, and a warm-up would send the student away from it. */
  isLiveTest: boolean;
}

/** Show "full paper or warm up first?" instead of starting the attempt. */
export function shouldOfferShortOrFull(i: ChoiceInput): boolean {
  return i.fromSignin && !i.hasInProgress && !i.isLiveTest && i.questionCount >= CHOICE_MIN_QUESTIONS;
}

function mockPath(mockId: string): string {
  return `/mocks/${encodeURIComponent(mockId)}`;
}

/** The gate's sign-in callback: this mock + from=signin + the valid utm
 *  tags of the gate URL. Same-origin relative path (withReturnUtm). */
export function gateCallbackPath(mockId: string, sp: SearchParamsInput): string {
  return withReturnUtm(`${mockPath(mockId)}?${FROM_PARAM}=${FROM_SIGNIN}`, sp);
}

/** "/login?callbackUrl=<gateCallbackPath>" — the bounce a private (student-
 *  built) mock keeps for a signed-out visitor. */
export function gateLoginRedirectPath(mockId: string, sp: SearchParamsInput): string {
  return loginRedirectPath(`${mockPath(mockId)}?${FROM_PARAM}=${FROM_SIGNIN}`, sp);
}

/** Where "Start this mock" goes: the same mock WITHOUT from=signin (a
 *  reload then resumes instead of asking again), keeping the utm tags. */
export function mockPathAfterChoice(mockId: string, sp: SearchParamsInput): string {
  return `${mockPath(mockId)}${returnUtmQuery(sp)}`;
}

/** The build-mock gate's sign-in callback: the builder (in PYQ mode when the
 *  visitor was in it) + the valid utm tags. No from=signin: nothing on the
 *  builder reads it. */
export function buildGateCallbackPath(examCode: string, pyq: boolean, sp: SearchParamsInput): string {
  return withReturnUtm(`/exams/${encodeURIComponent(examCode)}/build-mock${pyq ? "?pyq=1" : ""}`, sp);
}

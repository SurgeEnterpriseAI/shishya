// "Sign up with Google" — the ONE place for the button's words and for the
// short explanation shown with it (2 Oct 2026, founder, standing: "Always
// make sure as many sign-ups as possible come … 'Sign up with Google' is easy
// — students may think sign-up needs a lot of details … make the buttons
// visible and clear, and on hover show a description of how signing up is
// useful: the moment they sign up the platform changes to the context they
// are looking for … with AI helping them with whatever goal they have").
//
// Why one module: on 2 Oct 2026 the primary sign-in buttons carried ten
// different English wordings, none said "Sign up", three named Google, and
// none had an explanation on hover. Every primary guest button now renders
// through src/components/SignUpButton.tsx and takes its label and its
// explanation from here. No surface writes its own.
//
// THE LABEL follows Google's "Sign in with Google" branding guidelines
// (https://developers.google.com/identity/branding-guidelines, read 2 Oct
// 2026, page last updated 7 Jul 2026): the allowed call-to-action texts are
// "Sign in with Google", "Sign up with Google" and "Continue with Google",
// and translating them "is permitted and encouraged". We use "Sign up with
// Google" (en, hi, te) and, for a returning member's card and for the 19
// other languages /login speaks, the existing "Continue with Google"
// translation (login.continue in src/lib/i18n.ts).
//
// THE EXPLANATION (2 Oct 2026, later — founder: "Each sign in with Google
// should be contextualized from the location where it is. It should not be
// the same tooltip information for all the Google sign up buttons … each
// tooltip will show a better use case of how Shishya can be helpful").
// Until then every button showed one of FIVE sentences, and 48 of 69
// placements the general one. The words are a table now — 76 entries, one
// tooltip and one caption each, in English, Hindi and Telugu, written from
// what a signed-in student really gets in each place and reviewed for
// honesty and clarity:
//   • THE WORDS live in ONE data source, src/data/signup-places/{en,hi,te}.json
//     — never in this module: the header loads this module on every page, and
//     the table is about 150 KB. A server page reads them through
//     src/lib/signup-place-words.ts; a client island loads only the reader's
//     language, lazily, with the rules below (src/lib/signup-place-load.ts);
//   • WHICH ENTRY a button shows is decided by src/lib/signup-place.ts
//     (signUpPlaceFor for a door inside a page, signUpPagePlace for the
//     header, the site card, the timed bar and the early line), which builds
//     on signUpContextFor() below and keeps its fail-closed rules: a school
//     return wins first, and an exam is named ONLY where the sign-in returns
//     to a page of that exam and the page passed its name;
//   • the five old variants are aliases there (signUpPlaceOfContext):
//     general → family.fallback, exam → family.exam.practice, examNoPractice
//     → family.exam.unknown, school → family.schoolCbse, tutor →
//     door.chat-save.general;
//   • every sentence is pinned to the code that makes it true
//     (src/lib/signup-cta-claims.ts — a module only the tests import;
//     tests/unit/signup-places.test.ts).
// Never: "one tap" (the route is the button, Google's account chooser and, on
// a first sign-in, Google's share screen), "superintelligence", "everything
// changes", "fully personalised", a count, a rank or a result promise.
//
// TWO LENGTHS (2 Oct 2026 review): the full sentence is the tooltip (hover
// and keyboard focus with a mouse, and what a screen reader hears as the
// button's description); the SHORT caption sits under the button — one line
// at 360 px ("No forms. SSC CGL is set up as your exam.") — on every device.
// Both come from the same entry of the table.
//
// REASON LINES (signUpReason, at the end of this file): where a sign-in
// call was a button or link whose own label carried the reason ("Sign in
// free to write it →", "or sign in free for full mocks with your scores
// saved →"), the label is the shared one now and the reason is a plain line
// beside the button. Each line makes only claims from the same list
// (src/lib/signup-cta-claims.ts SIGNUP_REASON_CLAIMS).
//
// Pure: no React, no DOM, no DB — client islands, server pages and tests
// import it.

// Imports: only src/lib/school/student-classes.ts, which the header already
// loads. NOT src/lib/signup-goal.ts — it imports the language tables
// (preferred-lang → state-info, i18n), and this module is in the header's
// bundle on every page (page weight is the first suspect for a sign-up dip).
// callbackGoal() below is the same reading of a callback as signupGoalOf;
// tests/unit/signup-cta.test.ts keeps the two in step.
import { isUnder13SchoolPath, schoolContainerClassOf } from "@/lib/school/student-classes";

export type SignUpLocale = "en" | "hi" | "te";

export const SIGNUP_LOCALES: readonly SignUpLocale[] = ["en", "hi", "te"];

/** True for the three languages this module has words for. */
export function isSignUpLocale(l: string | null | undefined): l is SignUpLocale {
  return l === "en" || l === "hi" || l === "te";
}

const loc = (l: string | null | undefined): SignUpLocale => (l === "hi" || l === "te" ? l : "en");

// ── The label ──────────────────────────────────────────────────────────
// Two parts, so a narrow place — the header on a phone (it must stay inside
// the 360 px row) and the timed bar — can put them on two lines beside the
// "G" ("Sign up" over "with Google"); everywhere else they are one line.

const LABEL_PARTS: Readonly<Record<SignUpLocale, readonly [string, string]>> = {
  en: ["Sign up", "with Google"],
  hi: ["Google से", "साइन अप करें"],
  te: ["Google తో", "సైన్ అప్ చేయండి"],
};

/** The label's two halves (a phone header stacks them). */
export function signUpLabelParts(locale: string | null | undefined): readonly [string, string] {
  return LABEL_PARTS[loc(locale)];
}

/** "Sign up with Google" in the reader's language (en / hi / te; anything else is English). */
export function signUpLabel(locale: string | null | undefined): string {
  return LABEL_PARTS[loc(locale)].join(" ");
}

/** English, for the cached server HTML of the header (it switches after mount). */
export const SIGNUP_LABEL_EN = "Sign up with Google";

/** The button's words on a surface that speaks all 22 languages (/login and
 *  the mock gate): "Sign up with Google" in en / hi / te; any other language
 *  keeps its own translation of "Continue with Google" (`continueLabel`,
 *  login.continue) — also an approved Google wording — instead of falling
 *  back to English. `returning`: a member coming back ("Welcome back" card)
 *  is not signing up, so that card keeps "Continue with Google" too. */
export function googleButtonLabel(locale: string | null | undefined, continueLabel: string, returning = false): string {
  if (returning || !isSignUpLocale(locale)) return continueLabel;
  return signUpLabel(locale);
}

// ── The explanation's context ──────────────────────────────────────────
// (The words themselves: src/data/signup-places/, through
// src/lib/signup-place.ts.)

/** What the page the button sits on is about — the first, coarse reading of
 *  a sign-in link (signUpContextFor). src/lib/signup-place.ts turns it into
 *  one entry of the table. */
export type SignUpContext =
  /** An exam page whose sign-in returns to that exam (auto-enrolled). */
  | { kind: "exam"; exam: string; practice: boolean }
  /** Anything else on the exam, college, career and life-stage side. */
  | { kind: "general" }
  /** A Class 8-12 school page (never Class 1-7: no button is rendered there). */
  | { kind: "school" }
  /** The guest tutor's save card. */
  | { kind: "tutor" };

// ── What a callback sets up (a copy of signupGoalOf's rules) ────────────

const GOAL_EXAM_CODE = /^[A-Z][A-Z0-9_]{1,39}$/;
const GOAL_MOCK_ID = /^[A-Za-z0-9_-]{8,64}$/;

export type CallbackGoal = { kind: "exam"; code: string } | { kind: "mock"; id: string };

function goalExam(code: string | null | undefined): CallbackGoal | null {
  if (typeof code !== "string" || !GOAL_EXAM_CODE.test(code)) return null;
  if (schoolContainerClassOf(code) !== null) return null;
  return { kind: "exam", code };
}

/** The exam (or mock) a sign-in callback names — exactly what
 *  src/lib/signup-goal.ts signupGoalOf returns for the same URL: an
 *  /exams/{CODE}/… page (and its /hi, /te twins), /chat?examCode=,
 *  /coach?exam=, or /mocks/{id}. Anything else is null. */
export function callbackGoal(url: string | null | undefined): CallbackGoal | null {
  if (typeof url !== "string" || url.length === 0) return null;
  let u: URL;
  try {
    u = new URL(url, "https://shishya.in");
  } catch {
    return null;
  }
  const twin = /^\/(?:hi|te)(\/.*)?$/.exec(u.pathname);
  const path = twin ? twin[1] || "/" : u.pathname;
  const exam = /^\/exams\/([^/]+)(?:\/|$)/.exec(path);
  if (exam) return goalExam(exam[1]);
  if (path === "/chat" || path === "/chat/") return goalExam(u.searchParams.get("examCode"));
  if (path === "/coach" || path === "/coach/") return goalExam(u.searchParams.get("exam"));
  const mock = /^\/mocks\/([^/]+)(?:\/|$)/.exec(path);
  if (mock && GOAL_MOCK_ID.test(mock[1])) return { kind: "mock", id: mock[1] };
  return null;
}

/** A sign-in that returns to a school class page (/schooling/{board}/class-N…)
 *  or to the school tutor (/chat?examCode=<class container>): the account
 *  starts on the school side — chapter practice with the score saved, and a
 *  school tutor that keeps no memory (src/lib/tutor-memory.ts). */
export function isSchoolClassCallback(callback: string | null | undefined): boolean {
  if (typeof callback !== "string" || !callback) return false;
  try {
    const u = new URL(callback, "https://shishya.in");
    if (/^\/schooling\/[^/]+\/class-\d+(?:\/|$)/.test(u.pathname)) return true;
    if (u.pathname === "/chat" || u.pathname === "/chat/") return schoolContainerClassOf(u.searchParams.get("examCode") ?? "") !== null;
    return false;
  } catch {
    return false;
  }
}

/** The context a button may claim, from the sign-in link it carries.
 *   • a school class callback, or a school class container's code → the
 *     school sentence, whatever else the caller says (no exam, no "tutor
 *     remembers");
 *   • the exam words ONLY when the link's callback is a page of that exam
 *     (/exams/{CODE}/…, /chat?examCode=, /coach?exam=) or one of its mocks
 *     (/mocks/{id} — the caller must then pass that mock's own exam code) —
 *     the cases where the new account is enrolled in it at sign-up
 *     (callbackGoal = signupGoalOf, + src/lib/signup-profile.ts);
 *   • anything else — a missing name, a callback on another page, a school
 *     container's code — gets the general sentence: fail closed. */
export function signUpContextFor(p: {
  /** The page the sign-in returns to (the link's callbackUrl). */
  callback: string | null | undefined;
  /** The exam's short name, when the page is about one exam. */
  exam?: string | null;
  /** That exam's code. Required for a /mocks/{id} callback; when given for
   *  an exam-page callback it must be the callback's own code. */
  examCode?: string | null;
  /** That exam has practice (ExamPracticeState.hasPractice). Unknown = no. */
  practice?: boolean | null;
  /** The guest tutor's save card (the chat on screen is carried over). */
  tutor?: boolean;
}): SignUpContext {
  if (isSchoolClassCallback(p.callback)) return { kind: "school" };
  if (p.tutor) return { kind: "tutor" };
  const code = typeof p.examCode === "string" ? p.examCode : "";
  // A school class's own practice set (/mocks/{id} of NCERT_C09 …).
  if (code && schoolContainerClassOf(code) !== null) return { kind: "school" };
  const name = typeof p.exam === "string" ? p.exam.trim() : "";
  if (!name) return { kind: "general" };
  const goal = callbackGoal(p.callback);
  if (!goal) return { kind: "general" };
  if (goal.kind === "mock") return code ? { kind: "exam", exam: name, practice: p.practice === true } : { kind: "general" };
  if (code && code !== goal.code) return { kind: "general" };
  return { kind: "exam", exam: name, practice: p.practice === true };
}

// ── Reason lines for doors whose old label carried the reason ───────────
// Plain text beside the button (the caller marks the element with
// data-su-reason and passes explain="own"). Five today:
//   • "writePaper" — /live-test: the old button read "Sign in free to write
//     it →". A paper is written at /mocks/{id}, which a guest cannot open
//     (src/app/mocks/[id]/page.tsx shows the sign-in gate), and a member's
//     attempt is an Attempt row;
//   • "fullMocks" — the cutoff page's nudge: the old link read "or sign in
//     free for full mocks with your scores saved →". Shown only where the
//     exam has practice;
//   • "vacancies" — the home page's vacancies rail (and its /hi and /te
//     twins): the old green bar asked "Prepping for one of these? Sign in
//     free →". The question stays, followed by what an account keeps (the
//     general caption's two claims — the link returns to /dashboard, not to
//     one exam). One line instead of a line plus a caption: the rail is a
//     fixed height and every line in its footer takes a row from the list;
//   • "tryOne" — the exam hub's "try one question" card, after the answer.
//     The card shows only where the exam has a checked question, so mocks
//     with saved scores and the weak-topic map hold. "No credit card":
//     nothing on the site asks for one;
//   • "startExam" — /find-your-exam's bottom card, above its button
//     ("Pick your #1 and start today"). Until the tooltips became a table
//     (2 Oct 2026, later) this line WAS the button's tooltip sentence for an
//     exam whose practice is not known; the line is kept word for word and
//     lives here now. "{exam}" is the top match's short name — the page
//     prints it only where the link returns to that exam's hub
//     (signUpContextFor).
export type SignUpReason = "writePaper" | "fullMocks" | "vacancies" | "tryOne" | "startExam";

const REASON: Readonly<Record<SignUpLocale, Readonly<Record<SignUpReason, string>>>> = {
  en: {
    writePaper: "Sign up to write this paper — your score is saved to your account.",
    fullMocks: "Sign up for full mocks with your scores saved.",
    vacancies: "Prepping for one of these? Your tests and tutor chats are saved.",
    tryOne: "Sign up free: adaptive mocks with your scores saved, and Shishya tracks your weak topics. No credit card.",
    startExam: "Sign up with your Google account, no forms. {exam} is set up as your exam the moment you sign up, and the AI tutor remembers where you left off.",
  },
  hi: {
    writePaper: "यह पेपर लिखने के लिए साइन अप करें — आपका स्कोर आपके अकाउंट में सेव रहता है।",
    fullMocks: "पूरे मॉक के लिए साइन अप करें — आपके स्कोर सेव रहते हैं।",
    vacancies: "इनमें से किसी की तैयारी कर रहे हैं? आपके टेस्ट और ट्यूटर से हुई बातचीत सेव रहती है।",
    tryOne: "मुफ़्त साइन अप: अडैप्टिव मॉक, आपके स्कोर सेव रहते हैं, और Shishya आपके कमज़ोर टॉपिक पर नज़र रखता है। क्रेडिट कार्ड नहीं चाहिए।",
    startExam: "अपने Google अकाउंट से साइन अप, कोई फ़ॉर्म नहीं। साइन अप करते ही {exam} आपकी परीक्षा के रूप में सेट हो जाता है, और AI ट्यूटर याद रखता है कि आपने कहाँ छोड़ा था।",
  },
  te: {
    writePaper: "ఈ పేపర్ రాయడానికి సైన్ అప్ చేయండి — మీ స్కోర్ మీ అకౌంట్‌లో సేవ్ అవుతుంది.",
    fullMocks: "పూర్తి మాక్‌ల కోసం సైన్ అప్ చేయండి — మీ స్కోర్లు సేవ్ అవుతాయి.",
    vacancies: "వీటిలో ఒకదానికి సిద్ధమవుతున్నారా? మీ టెస్టులు, ట్యూటర్ చాట్‌లు సేవ్ అవుతాయి.",
    tryOne: "ఉచితంగా సైన్ అప్ చేయండి: అడాప్టివ్ మాక్‌లు, మీ స్కోర్లు సేవ్ అవుతాయి, Shishya మీ బలహీన టాపిక్‌లను గుర్తిస్తుంది. క్రెడిట్ కార్డ్ అవసరం లేదు.",
    startExam: "మీ Google అకౌంట్‌తో సైన్ అప్, ఫారాలు లేవు. సైన్ అప్ చేసిన వెంటనే {exam} మీ పరీక్షగా సెట్ అవుతుంది, మీరు ఎక్కడ ఆపారో AI ట్యూటర్ గుర్తుంచుకుంటుంది.",
  },
};

/** A placement's reason line in the reader's language (en / hi / te;
 *  anything else is English). */
export function signUpReason(locale: string | null | undefined, key: SignUpReason): string {
  return REASON[loc(locale)][key];
}

// ── Measuring ──────────────────────────────────────────────────────────
// One light beacon when the explanation is OPENED on a hover device (the
// pointer rests on a button, or the keyboard focuses one): CTA_CLICKED
// { cta: "signup-explain", surface, via: "hover" | "focus" }, at most once
// per page view. Never on a school page a child under 13 may be reading —
// Class 1-7 pages, /schooling and a board's hub (2 Oct 2026 review: the last
// two were missing; the header button has no tooltip there either). The
// click itself stays the existing "signin-click" beacon — nothing about it
// changed.
export const SIGNUP_EXPLAIN_CTA = "signup-explain";
/** The pointer must rest this long on the button before it counts as opened. */
export const SIGNUP_EXPLAIN_HOVER_MS = 600;

/** A school page a child under 13 may be reading: a Class 1-7 page, /schooling
 *  itself and a board's hub (they list every class). The same rule as
 *  src/lib/signup-pitch.ts isChildSchoolPath — written out here because this
 *  module may import the school class rules only (the test keeps the two in
 *  step). */
export function childSchoolPathForExplain(p: string | null | undefined): boolean {
  if (typeof p !== "string") return false;
  const path = p.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (path === "/schooling" || /^\/schooling\/[^/]+$/.test(path)) return true;
  return isUnder13SchoolPath(path);
}

/** Whether the "explanation opened" beacon may go out now: never on a school
 *  page a child may be reading, and once per page view (`lastSentPath` is the
 *  path the last one was sent on, kept in memory only). */
export function explainBeaconDue(path: string | null | undefined, lastSentPath: string | null): boolean {
  if (typeof path !== "string" || !path.startsWith("/")) return false;
  if (childSchoolPathForExplain(path)) return false;
  return path !== lastSentPath;
}

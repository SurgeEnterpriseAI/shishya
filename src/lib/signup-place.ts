// WHICH sentence a "Sign up with Google" button shows (2 Oct 2026, founder:
// "Each sign in with Google should be contextualized from the location where
// it is. It should not be the same tooltip information for all the Google
// sign up buttons. Based on the context where they are, prepare a tooltip
// information, and each tooltip will show a better use case of how Shishya
// can be helpful").
//
// The words are a table of 76 entries — one tooltip and one caption each, in
// English, Hindi and Telugu — in src/data/signup-places/{en,hi,te}.json.
// This module holds no sentence. It decides the ENTRY (the "place"), and
// fills an entry's variables once somebody hands it a language's table:
//   • signUpPlaceFor()   — a door: a button inside a page (the hub box, the
//                          quiz result, the tutor's card, /login …). Each has
//                          its own entry, "door.*";
//   • signUpPagePlace()  — the four placements that sit on many pages: the
//                          header, the site card, the timed bar and the early
//                          line. They take the entry of the PAGE FAMILY they
//                          are on, "family.*", chosen from the path alone —
//                          so the four say the same sentence on one page;
//   • signUpWordsFrom()  — the tooltip and the caption of a place, from one
//                          language's table: variables filled, the age
//                          sentence and the closing sentence appended (each is
//                          stored once per language).
//
// EVERY RULE FAILS CLOSED. When a condition of an entry cannot be shown to
// hold, the placement takes the next entry of its chain — never the stronger
// sentence:
//   1. A school return (a /schooling/{board}/class-N… callback, a class chat,
//      a class's own practice set) gets a school entry whatever the caller
//      passes. Class 1-7 pages render no button at all — that rule stays with
//      the callers (isUnder13SchoolPath / pitchAllowedPath / childSafe).
//   2. An olympiad (the catalogue's category, passed by the page — the path
//      cannot tell) takes family.examOlympiad on every placement of that
//      exam: it names no exam, addresses nobody as a candidate and carries
//      the age sentence. Olympiads are sat by school students.
//   3. An exam is NAMED only when the caller passed its short name AND the
//      sign-in returns to a page of that exam (signUpContextFor →
//      callbackGoal) AND any code passed is that exam's. Never from the path
//      alone: /exams/FOO can be the "not found" page of a retired exam. An
//      exam page whose name was not supplied gets family.examPath.
//   4. Practice has THREE values (SignUpPractice): "canServe" — 5 or more
//      checked questions, the least a paper is served with
//      (src/lib/served-paper.ts MIN_SERVED_QUESTIONS); "none" — a read that
//      SUCCEEDED found no checked question and no shared mock; and not known
//      (undefined: nothing passed, a failed read, 1 to 4 questions, shared
//      mocks only). Tests, mocks, five questions a day and the Mistake
//      Notebook are promised for "canServe" only; "Shishya has no practice
//      questions for {exam} yet" is said for "none" only — and only by the
//      four page-wide placements. A DOOR never says it: a door that names an
//      exam stands beside a question the visitor can see (the quiz result,
//      the "try one" card …), while the practice value comes from a map
//      cached for ten minutes, which can still say "none" for an exam whose
//      first questions were checked a moment ago. A named door whose own
//      entry does not apply takes family.exam.practice or family.exam.unknown.
//   5. A variable is never printed raw: an entry with a hole left gets
//      family.fallback, as does a key the table does not hold.
//   6. An entry's CAPTION is shown only where it is true by itself (2 Oct
//      2026 review). The caption is what a phone reads — the timed bar's one
//      line, the line under /login's button — and it has no room for the
//      tooltip's "where …". So:
//        • a CBSE class page, class chat or class practice set takes
//          family.schoolCbse's tooltip ("on chapters that have practice …")
//          with family.schoolOtherBoard's caption ("Saved practice is on CBSE
//          chapters for now."): no page-wide placement knows whether THIS
//          chapter has practice, and Class 11-12 have none yet, so "Your
//          chapter practice scores are saved." may not stand alone
//          (SignUpPlace.cap). The chapter's own save line, shown only on a
//          chapter with practice, keeps its own entry (door.school-save);
//        • a topic page takes family.examTopic.practice ("your test score
//          kept") only where the TOPIC has five or more checked questions —
//          the least a topic test is built from; otherwise the entry that
//          speaks of read marks only;
//        • the builder's two doors ("build this mock … take it with your
//          score kept") need a set that can be built: five or more checked
//          questions in the topics the builder lists, in the mode it is in.
//          The builder lists a topic from three questions, and refuses a set
//          under five.
//
// Decisions of 2 Oct 2026 written into the rules below:
//   • school sentences never use the words "tutor", "chat" or "exam" (the
//     school tutor keeps no memory): the class chat's header takes the class
//     page's entry (family.schoolCbse / family.schoolOtherBoard), not
//     family.schoolChat, which needs the word "chat";
//   • the "vouch" button and the fact panel's button return to the page they
//     were pressed on; their entries then drop the one sentence that said the
//     visitor lands on the dashboard (`back`). /login shows the "vouch"
//     sentence only for a callback that IS the vouching page;
//   • the tutor's save card says "chats you have from then on are saved" —
//     never "this chat is saved": no carried guest chat has been seen in
//     production.
//
// WHO LOADS IT. Server pages import it directly (through
// src/lib/signup-place-words.ts, or for signUpPracticeOf). In a browser it is
// NOT part of any page's first script: about 10 KB, it arrives with the
// reader's language when a button's words are first needed
// (src/lib/signup-place-load.ts — a dynamic import; client files may import
// its TYPES only). Pure: it imports the copy module's callback rules and the
// school class rules, and nothing else — no words, no catalogue, no React.
// tests/unit/signup-places.test.ts pins all of it.

import { callbackGoal, isSchoolClassCallback, signUpContextFor, type SignUpContext } from "@/lib/signup-cta-copy";
import { schoolContainerClassOf } from "@/lib/school/student-classes";

// ── The keys of the table ───────────────────────────────────────────────

export type SignUpPlaceKey =
  // Page families: the header, the site card, the timed bar, the early line.
  | "family.home"
  | "family.exam.practice"
  | "family.exam.noPractice"
  | "family.exam.unknown"
  | "family.examPath"
  | "family.examOlympiad"
  | "family.examSyllabus.practice"
  | "family.examSyllabus.noPractice"
  | "family.examTopic.practice"
  | "family.examTopic.noPractice"
  | "family.examTopic.testOnly"
  | "family.examUpdates.practice"
  | "family.examUpdates.noPractice"
  | "family.examCutoff.practice"
  | "family.examGuide.practice"
  | "family.examTricks.practice"
  | "family.examNews.practice"
  | "family.examChecklist.practice"
  | "family.examList"
  | "family.college"
  | "family.colleges"
  | "family.scholarship"
  | "family.scholarships"
  | "family.career"
  | "family.careers"
  | "family.currentAffairs"
  | "family.jobs"
  | "family.examCalendar"
  | "family.stageHub"
  | "family.streamOption"
  | "family.schoolCbse"
  | "family.schoolOtherBoard"
  | "family.schoolChat"
  | "family.fallback"
  | "family.challengeLink"
  | "family.groupInvite"
  | "family.discussions"
  // Doors: one button inside a page.
  | "door.hub-box"
  | "door.hub-try-one"
  | "door.pyq-year"
  | "door.quiz-end"
  | "door.build-mock-form"
  | "door.mock-gate"
  | "door.mock-gate.unnamed"
  | "door.mock-gate-quiz-end"
  | "door.build-gate-quiz-end"
  | "door.cutoff-nudge"
  | "door.verdict-poll"
  | "door.challenge-end"
  | "door.live-test"
  | "door.live-test.unnamed"
  | "door.guest-paper"
  | "door.chat-banner.exam.practice"
  | "door.chat-banner.exam"
  | "door.chat-banner.general"
  | "door.chat-save.exam.practice"
  | "door.chat-save.exam"
  | "door.chat-save.general"
  | "door.school-save"
  | "door.home-signin"
  | "door.home-vacancies"
  | "door.coach-start"
  | "door.coach-start.exam"
  | "door.revision-start"
  | "door.finder-save"
  | "door.finder-start"
  | "door.persona-card"
  | "door.batch-join"
  | "door.group-join"
  | "door.discussion-reply"
  | "door.ideas-upvote"
  | "door.vouch"
  | "door.verify-fact"
  | "door.login.default"
  | "door.login.returning"
  | "door.soft-wall";

/** What an entry's sentence may be filled with. */
export interface SignUpVars {
  /** The exam's short name ("SSC CGL"). */
  exam?: string | null;
  /** The year of a previous-year-pattern set (it is in the page's path). */
  year?: string | number | null;
  /** The size of a Class 8-12 chapter's account set ("up to {n}"). */
  n?: number | null;
  /** The institution of a batch invite; missing → "the institute". */
  institute?: string | null;
}

/** One entry of the table, with what fills it. */
export interface SignUpPlace {
  key: SignUpPlaceKey;
  vars?: SignUpVars;
  /** The sign-in returns to the page the button is on, so the entry's "you
   *  land on your dashboard" sentence (door.vouch, door.verify-fact) is left
   *  out. */
  back?: boolean;
  /** The CAPTION is this entry's instead of `key`'s own (rule 6): the key's
   *  caption says more than this placement can show to hold. The tooltip is
   *  still `key`'s. Both are the table's words, unchanged. */
  cap?: SignUpPlaceKey;
}

/** "canServe": 5 or more checked questions. "none": a read that succeeded
 *  found no checked question and no shared mock. Not known: leave it out. */
export type SignUpPractice = "canServe" | "none";

/** = MIN_SERVED_QUESTIONS (src/lib/served-paper.ts): no shorter paper is
 *  served, so no mock is promised below it. The test keeps the two equal. */
export const SIGNUP_CAN_SERVE_MIN = 5;

/** The practice value of an exam from its counts — the counts of a read that
 *  SUCCEEDED (the caller must not pass the "no practice" a failed read falls
 *  back to: src/lib/db/exam-practice.ts examSignUpFacts keeps them apart).
 *  Shared mocks alone are "not known": a count cannot say one can be served. */
export function signUpPracticeOf(c: { questions: number; systemMocks: number } | null | undefined): SignUpPractice | undefined {
  if (!c || !Number.isFinite(c.questions) || !Number.isFinite(c.systemMocks)) return undefined;
  if (c.questions >= SIGNUP_CAN_SERVE_MIN) return "canServe";
  if (c.questions === 0 && c.systemMocks === 0) return "none";
  return undefined;
}

/** What a page tells the placements on it (src/components/SignUpPageContext.tsx
 *  writes it after mount; nothing here is read from the path). */
export interface SignUpPageData {
  /** The exam's short name and code — both, or the exam is not named. */
  exam?: string | null;
  code?: string | null;
  practice?: SignUpPractice | null;
  /** The exam's catalogue category is OLYMPIAD. */
  olympiad?: boolean | null;
  /** A topic page: it has notes (true) or none (false). A syllabus page: at
   *  least one topic on it has notes to open. */
  notes?: boolean | null;
  /** A topic page: the topic's checked questions (the page reads at most
   *  five — five is "enough for a topic test"). */
  topicQuestions?: number | null;
  /** The signed-out mock page rendered its sign-in gate. */
  mockGate?: boolean | null;
}

// ── The old five variants, as aliases ───────────────────────────────────

/** The entry an old context stood for. "examNoPractice" was used for "not
 *  known" too, so it is family.exam.unknown — never the entry that says "no
 *  practice questions yet". */
export function signUpPlaceOfContext(ctx: SignUpContext | null | undefined): SignUpPlace {
  if (!ctx) return { key: "family.fallback" };
  if (ctx.kind === "exam") {
    const exam = cleanName(ctx.exam);
    return exam ? { key: ctx.practice ? "family.exam.practice" : "family.exam.unknown", vars: { exam } } : { key: "family.fallback" };
  }
  if (ctx.kind === "school") return SCHOOL_CBSE;
  if (ctx.kind === "tutor") return { key: "door.chat-save.general" };
  return { key: "family.fallback" };
}

// ── Small readers ───────────────────────────────────────────────────────

const FALLBACK: SignUpPlace = { key: "family.fallback" };
const OLYMPIAD: SignUpPlace = { key: "family.examOlympiad" };
/** A CBSE class page, class chat or class practice set (rule 6): the CBSE
 *  entry's tooltip — it says "on chapters that have practice" — with the
 *  caption that is true on every school page. */
const SCHOOL_CBSE: SignUpPlace = { key: "family.schoolCbse", cap: "family.schoolOtherBoard" };

function cleanName(v: unknown, max = 60): string {
  if (typeof v !== "string") return "";
  const s = v.trim();
  return s && s.length <= max && !/[{}]/.test(s) ? s : "";
}

function cleanYear(v: unknown): string {
  const s = typeof v === "number" ? String(v) : typeof v === "string" ? v.trim() : "";
  return /^(?:19|20)\d{2}$/.test(s) ? s : "";
}

function cleanCount(v: unknown): number {
  const n = typeof v === "number" ? Math.floor(v) : Number.NaN;
  return Number.isFinite(n) && n > 0 && n < 1000 ? n : 0;
}

/** A number of questions, with no upper bound (a set, a topic, the topics a
 *  builder lists); 0 when it is not a count. */
function cleanSize(v: unknown): number {
  const n = typeof v === "number" ? Math.floor(v) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** A same-site URL as its path (trailing slash and the /hi, /te prefix
 *  removed) and its query; null when it is not one. */
function parsePage(url: string | null | undefined): { path: string; query: URLSearchParams } | null {
  if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//")) return null;
  let u: URL;
  try {
    u = new URL(url, "https://shishya.in");
  } catch {
    return null;
  }
  const clean = u.pathname.replace(/\/+$/, "") || "/";
  return { path: clean.replace(/^\/(?:hi|te)(?=\/|$)/, "") || "/", query: u.searchParams };
}

/** The exam entry with no page of its own, for a PAGE-WIDE placement: by the
 *  practice value. (A door never takes the "none" entry: rule 4.) */
function examKey(practice: SignUpPractice | null | undefined): SignUpPlaceKey {
  return practice === "canServe" ? "family.exam.practice" : practice === "none" ? "family.exam.noPractice" : "family.exam.unknown";
}

/** A school return's entry — by the board of the class page, or by the
 *  curriculum of the class container (NCERT is CBSE's). Never
 *  family.schoolChat: it needs the word "chat" (decision of 2 Oct 2026).
 *  Class 8-12 only: a Class 1-7 page or container has no button at all (the
 *  callers' rule); if asked, it gets the general words and no school promise. */
function schoolPlace(path: string, code: string): SignUpPlace {
  const m = /^\/schooling\/([^/]+)\/class-(\d+)(?:\/|$)/.exec(path);
  const cls = m ? Number(m[2]) : code ? schoolContainerClassOf(code) : null;
  if (cls === null || cls < 8 || cls > 12) return FALLBACK;
  const cbse = m ? m[1] === "cbse" : /^NCERT_/.test(code);
  return cbse ? SCHOOL_CBSE : { key: "family.schoolOtherBoard" };
}

// ── The page family (the header, the site card, the timed bar, the early line) ──

/** College list and guide pages under /colleges (anything else there is one
 *  college or one of its branches). /colleges/iti-diploma is not here: many
 *  ITI and diploma admissions have no entrance exam, so it takes the
 *  fallback. */
const COLLEGE_LISTS = new Set(["state", "stream", "cutoffs", "placements"]);

function examPagePlace(code: string, sub: string, page: SignUpPageData | null | undefined): SignUpPlace {
  const exam = cleanName(page?.exam);
  // Rule 3: no name from the page (or another exam's) — nothing is named.
  if (!page || !exam || page.code !== code) return { key: "family.examPath" };
  if (page.olympiad) return OLYMPIAD;
  const vars: SignUpVars = { exam };
  const can = page.practice === "canServe";
  const seg = sub ? sub.split("/") : [];
  const one = seg.length === 1;
  switch (seg[0]) {
    case "syllabus":
      // Only where at least one topic on the page has notes to open.
      if (one && page.notes === true) return { key: can ? "family.examSyllabus.practice" : "family.examSyllabus.noPractice", vars };
      break;
    case "topics":
      // The English notes page of one topic — never its /hi notes or /quiz.
      if (seg.length === 2 && seg[1]) {
        // "Your test score kept" (the caption, which stands alone): only where this TOPIC can build a test.
        const topicTest = cleanSize(page.topicQuestions) >= SIGNUP_CAN_SERVE_MIN;
        if (page.notes === true) return { key: can && topicTest ? "family.examTopic.practice" : "family.examTopic.noPractice", vars };
        if (page.notes === false && topicTest) return { key: "family.examTopic.testOnly", vars };
      }
      break;
    case "updates":
      if (one) return { key: can ? "family.examUpdates.practice" : "family.examUpdates.noPractice", vars };
      break;
    case "checklist":
      if (one) return { key: can ? "family.examChecklist.practice" : "family.examUpdates.noPractice", vars };
      break;
    case "cutoff":
      if (one && can) return { key: "family.examCutoff.practice", vars };
      break;
    case "guide":
      if (one && can) return { key: "family.examGuide.practice", vars };
      break;
    case "tricks":
      if (one && can) return { key: "family.examTricks.practice", vars };
      break;
    case "news":
      if (seg.length === 2 && can) return { key: "family.examNews.practice", vars };
      break;
  }
  return { key: examKey(page.practice), vars };
}

/** The entry of the page at `url` (a path, with its query) — for the header,
 *  the site card, the timed bar and the early line, and for /login when it
 *  shows the sentence of the page the sign-in returns to. Path only; what the
 *  path cannot tell (an exam's name, its practice, whether the gate rendered)
 *  comes in `page` or is not said. */
export function signUpPagePlace(url: string | null | undefined, page?: SignUpPageData | null): SignUpPlace {
  const at = parsePage(url);
  if (!at) return FALLBACK;
  const { path, query } = at;
  if (path === "/") return { key: "family.home" };

  // School class pages (Class 8-12; see schoolPlace).
  if (/^\/schooling\/[^/]+\/class-\d+(?:\/|$)/.test(path)) return schoolPlace(path, "");
  let m: RegExpExecArray | null;
  if (/^\/schooling\/streams\/[^/]+$/.test(path)) return { key: "family.streamOption" };

  if (/^\/exams\/(?:browse|entrance)$/.test(path) || /^\/exams\/(?:state|category|after)\/[^/]+$/.test(path)) return { key: "family.examList" };
  m = /^\/exams\/[^/]+(?:\/(.*))?$/.exec(path);
  if (m) {
    const goal = callbackGoal(path);
    return goal && goal.kind === "exam" ? examPagePlace(goal.code, m[1] ?? "", page) : FALLBACK;
  }

  // The signed-out mock page: only where its sign-in gate is what rendered.
  // A school class's own practice set sets no exam: the school words.
  if (/^\/mocks\/[^/]+$/.test(path)) {
    if (page?.code && schoolContainerClassOf(page.code) !== null) return schoolPlace("", page.code);
    if (page?.olympiad) return page.mockGate ? OLYMPIAD : FALLBACK;
    return page?.mockGate ? { key: "door.mock-gate.unnamed" } : FALLBACK;
  }
  if (path === "/live-test") return { key: "door.live-test.unnamed" };

  if (path === "/chat") {
    const code = query.get("examCode") ?? "";
    if (code && schoolContainerClassOf(code) !== null) return schoolPlace(path, code);
    const goal = callbackGoal(`/chat?examCode=${encodeURIComponent(code)}`);
    const exam = cleanName(page?.exam);
    if (goal && goal.kind === "exam" && exam && page?.code === goal.code) {
      if (page.olympiad) return OLYMPIAD;
      return { key: page.practice === "canServe" ? "door.chat-banner.exam.practice" : "door.chat-banner.exam", vars: { exam } };
    }
    return { key: "door.chat-banner.general" };
  }
  if (path === "/coach") {
    const goal = callbackGoal(`/coach?exam=${encodeURIComponent(query.get("exam") ?? "")}`);
    const exam = cleanName(page?.exam);
    if (goal && goal.kind === "exam" && exam && page?.code === goal.code && page.practice === "canServe" && !page.olympiad) {
      return { key: "door.coach-start.exam", vars: { exam } };
    }
    return { key: "door.coach-start" };
  }
  if (path === "/revision") return { key: "door.revision-start" };
  // The finder's results are in the address: the page's own "has answers" test.
  if (path === "/find-your-exam") return query.get("age") && query.get("edu") ? { key: "door.finder-save" } : FALLBACK;
  if (/^\/for\/[^/]+$/.test(path)) return { key: "door.persona-card" };

  if (path === "/colleges") return { key: "family.colleges" };
  m = /^\/colleges\/([^/]+)(?:\/([^/]+))?$/.exec(path);
  if (m) {
    if (m[1] === "iti-diploma") return FALLBACK;
    return { key: COLLEGE_LISTS.has(m[1]) ? "family.colleges" : "family.college" };
  }
  if (path === "/scholarships" || path === "/scholarships/closing-soon" || path === "/scholarships/match" || /^\/scholarships\/for\/[^/]+$/.test(path)) {
    return { key: "family.scholarships" };
  }
  if (/^\/scholarships\/[^/]+$/.test(path)) return { key: "family.scholarship" };
  if (path === "/careers" || path === "/career-map") return { key: "family.careers" };
  if (/^\/careers\/[^/]+$/.test(path)) return { key: "family.career" };
  if (path === "/current-affairs" || path.startsWith("/current-affairs/")) return { key: "family.currentAffairs" };
  if (path === "/jobs" || path === "/jobs/govt-jobs" || path === "/jobs-map") return { key: "family.jobs" };
  if (path === "/exam-calendar") return { key: "family.examCalendar" };
  if (path === "/after-10th" || path === "/after-12th") return { key: "family.stageHub" };

  if (path === "/discussions" || /^\/discussions\/[^/]+$/.test(path)) return { key: "family.discussions" };
  if (/^\/g\/[^/]+$/.test(path)) return { key: "family.groupInvite" };
  if (/^\/join\/[^/]+$/.test(path)) return { key: "door.batch-join" };
  if (path === "/ideas") return { key: "door.ideas-upvote" };
  if (/^\/c\/[^/]+$/.test(path)) return { key: "family.challengeLink" };
  return FALLBACK;
}

// ── The doors ───────────────────────────────────────────────────────────

/** The four placements that take the page family's entry. */
const PAGE_WIDE: ReadonlySet<string> = new Set(["header", "signup-pitch", "signup-inline", "signup-nudge"]);

/** Where each door's sign-in returns. A door whose link returns somewhere
 *  else does not get the door's sentence (it says "you return here", "you
 *  land on your dashboard" …) — and /login shows a door's sentence only for
 *  a callback of this shape. An exam door is checked by signUpContextFor. */
const DOOR_RETURNS: Readonly<Record<string, RegExp>> = {
  "home-signin": /^\/dashboard$/,
  "home-vacancies": /^\/dashboard$/,
  "coach-start": /^\/coach$/,
  "revision-start": /^\/revision$/,
  "finder-save": /^\/find-your-exam$/,
  "persona-card": /^\/for\/[^/]+$/,
  "batch-join": /^\/join\/[^/]+$/,
  "group-join": /^\/g\/[^/]+$/,
  "discussion-reply": /^\/discussions\/[^/]+$/,
  "ideas-upvote": /^\/ideas$/,
  "live-test": /^\/live-test$/,
  "chat-banner": /^\/chat$/,
  "chat-save": /^\/chat$/,
  vouch: /^\/community-vouching\/[^/]+$/,
};

/** Doors with a sentence about one exam: named or not, they sit on a page of it. */
const EXAM_DOORS: ReadonlySet<string> = new Set([
  "hub-box",
  "hub-try-one",
  "pyq-year",
  "quiz-end",
  "build-mock-form",
  "mock-gate",
  "mock-gate-quiz-end",
  "build-gate-quiz-end",
  "cutoff-nudge",
  "verdict-poll",
  "challenge-end",
  "finder-start",
  "guest-paper",
]);

/** "door." + a door id whose entry carries the same name (the callers below
 *  pass only those). */
const doorKey = (surface: string) => `door.${surface}` as SignUpPlaceKey;

export interface SignUpPlaceInput {
  /** The door (src/lib/signin-cta.ts SIGNIN_SURFACES), or "login". */
  surface: string;
  /** The page the sign-in returns to (the link's callbackUrl). */
  callback: string | null | undefined;
  /** The exam's short name, when the door is about one exam. It is used only
   *  where the callback really is that exam's page, chat, coach or mock. */
  exam?: string | null;
  /** That exam's code. Required for a /mocks/{id} callback. */
  examCode?: string | null;
  practice?: SignUpPractice | null;
  olympiad?: boolean | null;
  /** What the page said about itself (src/lib/signup-page-data.ts): the
   *  page-wide placements read all of it; a door takes the practice value and
   *  the olympiad flag from it when the page's exam is the door's own and the
   *  caller passed neither. */
  page?: SignUpPageData | null;
  /** Variables that claim nothing about the account: {year} of a PYQ set,
   *  {n} of a chapter's set, {institute} of a batch, and — for the live-test
   *  card only — the paper's {exam}. */
  vars?: SignUpVars | null;
  /** "pyq-year": the questions in this year's set. "build-mock-form" and
   *  "build-gate-quiz-end": the checked questions in the topics the builder
   *  lists, in the mode it is in (a set is built from five or more). */
  setQuestions?: number | null;
  /** /login: its ?from= (the door the visitor pressed) and whether the card
   *  is "Welcome back". */
  from?: string | null;
  returning?: boolean | null;
}

/** The entry a door shows. See the rules at the top of this file. */
export function signUpPlaceFor(p: SignUpPlaceInput): SignUpPlace {
  if (p.surface === "login") return loginPlace(p);
  const callback = typeof p.callback === "string" ? p.callback : "";
  if (PAGE_WIDE.has(p.surface)) return signUpPagePlace(callback, p.page);

  const at = parsePage(callback);
  const path = at?.path ?? "";
  const code = typeof p.examCode === "string" ? p.examCode : "";

  // Rule 1: a school return gets a school entry, whatever the caller passes.
  if (isSchoolClassCallback(callback) || (code !== "" && schoolContainerClassOf(code) !== null)) {
    const n = cleanCount(p.vars?.n);
    // The chapter's own save line: shown only on a chapter with practice, with the size of the account set.
    if (p.surface === "school-save" && n > 0 && /^\/schooling\/[^/]+\/class-(?:8|9|10|11|12)\/[^/]+\/[^/]+$/.test(path)) return { key: "door.school-save", vars: { n } };
    // A class chat names its class container in the link itself; the caller's code may be another exam's.
    const inLink = at?.query.get("examCode") ?? "";
    return schoolPlace(path, inLink !== "" && schoolContainerClassOf(inLink) !== null ? inLink : code);
  }

  // Rule 3: is the exam named? (signUpContextFor refuses a name the link does not back.)
  const ctx = signUpContextFor({ callback, exam: p.exam, examCode: p.examCode });
  const exam = ctx.kind === "exam" ? cleanName(ctx.exam) : "";
  const goal = callbackGoal(callback);
  const goalCode = goal && goal.kind === "exam" ? goal.code : "";
  // What the page said about THIS exam (never another's).
  const facts = p.page && p.page.code && (p.page.code === code || p.page.code === goalCode) ? p.page : null;
  const practice = p.practice ?? facts?.practice ?? undefined;
  const can = practice === "canServe";
  // Rule 2.
  const olympiad = (p.olympiad ?? facts?.olympiad) === true;
  const vars: SignUpVars = { exam };

  /** Named: the exam's own entry — the one that promises mocks only for an
   *  exam that can serve one, else the one that promises none. NEVER the
   *  entry that says "no practice questions for {exam} yet" (rule 4: a door
   *  stands beside a question). Not named: on an exam page, the sentence
   *  that names nothing; anywhere else, the general one. */
  const examGeneric = (): SignUpPlace =>
    exam ? { key: can ? "family.exam.practice" : "family.exam.unknown", vars } : /^\/exams\//.test(path) && goalCode ? { key: "family.examPath" } : FALLBACK;

  if (EXAM_DOORS.has(p.surface) && olympiad) return OLYMPIAD;

  switch (p.surface) {
    case "hub-box":
      // "A five-question starter test opens by itself": only the link that returns to ?start=practice does that.
      return exam && can && at?.query.get("start") === "practice" ? { key: "door.hub-box", vars } : examGeneric();
    // Each promises whole timed mocks: an exam that can serve one.
    case "hub-try-one":
    case "quiz-end":
    case "cutoff-nudge":
    case "challenge-end":
      return exam && can ? { key: doorKey(p.surface), vars } : examGeneric();
    case "pyq-year": {
      // The timed set: only a set of five or more can be taken against the clock.
      const year = cleanYear(p.vars?.year);
      return exam && year && cleanSize(p.setQuestions) >= SIGNUP_CAN_SERVE_MIN ? { key: "door.pyq-year", vars: { exam, year } } : examGeneric();
    }
    // "Build this mock … and take it with your score kept": only where the
    // topics the builder lists hold a set that can be built (rule 6). The
    // exam-wide practice value is not enough for it — five questions spread
    // over topics of three, one and one list a single topic of three.
    case "build-mock-form":
    case "build-gate-quiz-end":
      return exam && cleanSize(p.setQuestions) >= SIGNUP_CAN_SERVE_MIN ? { key: doorKey(p.surface), vars } : examGeneric();
    case "verdict-poll":
      return exam ? { key: "door.verdict-poll", vars } : examGeneric();
    case "mock-gate":
    case "mock-gate-quiz-end":
      if (!goal || goal.kind !== "mock") return FALLBACK;
      return exam ? { key: doorKey(p.surface), vars } : { key: "door.mock-gate.unnamed" };
    case "guest-paper":
      return { key: "door.guest-paper" };
    case "finder-start":
      return exam && /^\/exams\/[^/]+$/.test(path) ? { key: "door.finder-start", vars } : FALLBACK;
    case "soft-wall":
      return { key: "door.soft-wall" };
    case "verify-fact":
      // It can open on any page; with a callback it returns there.
      return { key: "door.verify-fact", back: at !== null && path !== "/" && path !== "/dashboard" };
  }

  const returns = Object.prototype.hasOwnProperty.call(DOOR_RETURNS, p.surface) ? DOOR_RETURNS[p.surface] : null;
  if (!returns) return FALLBACK;
  const here = returns.test(path);
  switch (p.surface) {
    case "vouch":
      return { key: "door.vouch", back: here };
    case "live-test": {
      if (!here) return FALLBACK;
      // The paper's exam is a variable only: this sign-in sets no exam.
      const paper = cleanName(p.vars?.exam);
      return paper ? { key: "door.live-test", vars: { exam: paper } } : { key: "door.live-test.unnamed" };
    }
    case "chat-banner":
    case "chat-save": {
      if (!here) return FALLBACK;
      if (exam && olympiad) return OLYMPIAD;
      if (p.surface === "chat-banner") return exam ? { key: can ? "door.chat-banner.exam.practice" : "door.chat-banner.exam", vars } : { key: "door.chat-banner.general" };
      return exam ? { key: can ? "door.chat-save.exam.practice" : "door.chat-save.exam", vars } : { key: "door.chat-save.general" };
    }
    case "coach-start":
      if (!here) return FALLBACK;
      return exam && can && !olympiad ? { key: "door.coach-start.exam", vars } : { key: "door.coach-start" };
    case "batch-join":
      return here ? { key: "door.batch-join", vars: { institute: p.vars?.institute } } : FALLBACK;
    case "finder-save":
      // "You come back to these same results: they stay in this page's link" — the link must carry the answers.
      return here && at?.query.get("age") && at.query.get("edu") ? { key: "door.finder-save" } : FALLBACK;
    case "home-signin":
    case "home-vacancies":
    case "revision-start":
    case "persona-card":
    case "group-join":
    case "discussion-reply":
    case "ideas-upvote":
      return here ? { key: doorKey(p.surface) } : FALLBACK;
  }
  return FALLBACK;
}

/** /login's button: the "Welcome back" card's own entry; else the sentence of
 *  the door the visitor pressed (its ?from=) when the callback is that
 *  door's; else the entry of the page the sign-in returns to; a bare /login
 *  (the dashboard) gets door.login.default. A /mocks/{id} callback keeps the
 *  general words: /login does not look the mock up. */
function loginPlace(p: SignUpPlaceInput): SignUpPlace {
  if (p.returning) return { key: "door.login.returning" };
  const callback = typeof p.callback === "string" && p.callback ? p.callback : "/dashboard";
  const from = typeof p.from === "string" ? p.from : "";
  // The gates go straight to Google, never through /login. The guest's whole
  // paper is switched off (src/lib/guest-paper.ts GUEST_WHOLE_PAPER_OPEN), so
  // no button sends from=guest-paper: a typed link must not get "This result
  // is shown only here" with no result. (Take that test out the day it opens.)
  const isDoor =
    !/^mock-gate/.test(from) &&
    from !== "guest-paper" &&
    (EXAM_DOORS.has(from) || Object.prototype.hasOwnProperty.call(DOOR_RETURNS, from) || from === "school-save" || from === "verify-fact");
  if (isDoor) {
    const door = signUpPlaceFor({ ...p, surface: from, callback, from: null, returning: null });
    // "vouch" with a callback that is not the vouching page would say "you
    // land on your dashboard": the page the sign-in returns to instead.
    if (door.key !== "family.fallback" && !(from === "vouch" && !door.back)) return door;
  }
  const at = parsePage(callback);
  if (!at) return FALLBACK;
  if (isSchoolClassCallback(callback)) return schoolPlace(at.path, at.query.get("examCode") ?? "");
  if (at.path === "/dashboard") return { key: "door.login.default" };
  if (/^\/mocks\//.test(at.path)) return FALLBACK;
  const exam = cleanName(p.exam);
  return signUpPagePlace(callback, exam && p.examCode ? { exam, code: p.examCode, practice: p.practice, olympiad: p.olympiad } : null);
}

// ── The words of a place, from one language's table ─────────────────────

/** One entry as src/data/signup-places/{lang}.json stores it. */
export interface SignUpEntry {
  /** The tooltip, without the age sentence and the closing sentence. */
  t: string;
  /** The caption: one line at 360 px. */
  c: string;
  /** "After signing up you land on your dashboard …" — left out when the
   *  sign-in returns to the page (SignUpPlace.back). */
  tail?: string;
  /** The age sentence follows (school entries and the olympiad entry). */
  age?: boolean;
  /** No closing sentence (the "Welcome back" card: nobody is signing up). */
  bare?: boolean;
}

/** One language's words. The closing sentence and the age sentence are stored
 *  once and appended here. */
export interface SignUpTable {
  closing: string;
  age: string;
  /** "{institute}" when the page has no name to give. */
  institute: string;
  places: Record<string, SignUpEntry>;
}

export interface SignUpWords {
  /** The tooltip, and the button's description for a screen reader. */
  text: string;
  /** The caption under the button. */
  short: string;
}

const HOLE = /\{(exam|year|n|institute)\}/g;

function wordsOf(table: SignUpTable, place: SignUpPlace): SignUpWords | null {
  const e = table.places?.[place.key];
  if (!e || typeof e.t !== "string" || typeof e.c !== "string") return null;
  const v = place.vars ?? {};
  const n = cleanCount(v.n);
  const values: Record<string, string> = {
    exam: cleanName(v.exam),
    year: cleanYear(v.year),
    n: n > 0 ? String(n) : "",
    institute: cleanName(v.institute, 80) || table.institute,
  };
  const fill = (s: string) => s.replace(HOLE, (hole, name: string) => values[name] || hole);
  const parts = [e.t, place.back ? "" : e.tail ?? "", e.age ? table.age : "", e.bare ? "" : table.closing];
  // The caption: the entry's own, or the entry named by `cap` (rule 6).
  const capOf = place.cap ? table.places?.[place.cap] : e;
  if (!capOf || typeof capOf.c !== "string") return null;
  const out = { text: fill(parts.filter(Boolean).join(" ")), short: fill(capOf.c) };
  // Rule 5: a variable is never printed raw.
  return /[{}]/.test(out.text + out.short) ? null : out;
}

/** The tooltip and the caption of `place` in the language of `table`. A key
 *  the table does not hold, or an entry with a hole left, gets the general
 *  entry: a tooltip is never empty and never shows a raw variable. */
export function signUpWordsFrom(table: SignUpTable, place: SignUpPlace | null | undefined): SignUpWords {
  return (place ? wordsOf(table, place) : null) ?? wordsOf(table, FALLBACK) ?? { text: "", short: "" };
}

/** The language of the words: en, hi or te — anything else reads English. */
export function signUpWordsLocale(locale: string | null | undefined): "en" | "hi" | "te" {
  return locale === "hi" || locale === "te" ? locale : "en";
}

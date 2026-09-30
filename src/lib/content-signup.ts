// Sign-up invitations on CONTENT pages (30 Sep 2026, sign-up build 3 —
// founder brief: at least 100 sign-ups a day; invitations clear and visible,
// not small links, fast and not intrusive; people should understand that
// signing up puts the whole of Shishya in their hand, personalised for them).
//
// Why: the pages search and AI assistants send people to — syllabus,
// updates, cutoff, current affairs, topic notes, scholarships, careers,
// guide, tricks, news — had 657 landings in W14 and 17 sign-ups (2.6 per
// 100) against 19.3 per 100 on the exam hub, and 52-100% of those landings
// view one page only. Their invitation was small or late: the "Next on
// Shishya" block's sign-up line (1 click since 27 Sep), the site card at the
// very end of the page, and a timed sheet that needed 5 active minutes AND
// 3 page views (79% of sign-ups happen within 5 minutes of landing; the
// sheet mostly showed on the hub and the quiz, which have their own buttons).
//
// Two things, both client-side only (no server HTML, so no search-surface
// change), guests only, never on a Class 1-7 school page:
//   (a) the early line (src/components/SignupInline.tsx): ONE per page,
//       right after the page's first answer block — never before the
//       content, never over it — a real button, exam-specific where the page
//       is about one exam;
//   (b) the timed bar (src/components/SignupNudge.tsx): only on the content
//       families below, after 45 s of active time on the page OR a scroll
//       past 60% of it, as a slim one-line bar. Hub, quiz, build-mock, PYQ
//       and mock pages never get it (their own buttons convert).
//
// Every claim below is true today (the same audit as src/lib/signup-pitch.ts):
// signed-in mocks and scores are saved (Attempt), weak topics come from them
// (WeaknessMap), the exam is kept as an enrolment, and the home page and
// dashboard open on the last mock / exam (HomeForYou, dashboard). No count,
// no "rank", no "saved chats".
//
// 30 Sep 2026 (build 3 review): "{exam} mocks, scores and weak topics" only
// for an exam that HAS practice (src/lib/exam-practice-state.ts — the one
// rule for any surface that promises mocks for an exam). Twelve live hubs
// (AILET, NEET PG, NIFT, NATA, UCEED, RBI Grade B …) hold no checked
// question and no shared mock, and their pages were scrubbed of every mock
// promise on 27 Sep; their line keeps the exam only. An account can hold
// such an exam: the sign-up goal (src/lib/signup-profile.ts, build 2) enrols
// the exam of the /exams/{code}/… page the student signed up from with no
// practice check, as do the tracker (/api/exams/[code]/enroll) and the tutor
// (/chat?examCode), and HomeForYou lists it under "Your exams".
//
// Pure: copy + path rules + the trigger, imported by client islands, pages
// and tests. No React, no DOM.

import { isChildSchoolPath, pitchAllowedPath } from "@/lib/signup-pitch";
import { isUnder13SchoolPath } from "@/lib/school/student-classes";

export type ContentLocale = "en" | "hi" | "te";

const loc = (l: string | null | undefined): ContentLocale => (l === "hi" || l === "te" ? l : "en");

// ── (a) The early line ─────────────────────────────────────────────────

export interface SignupLineCopy {
  /** Bold lead-in ("Preparing for SSC CGL?" / "Make Shishya yours — free"). */
  lead: string;
  /** What the account does, in one sentence. */
  line: string;
  /** The button (Google is the only sign-in, src/lib/auth.ts). */
  cta: string;
  /** What Google shares, free, the age line. */
  privacy: string;
}

const LINE = {
  en: {
    leadExam: "Preparing for {exam}?",
    lineExam: "Sign in free — Shishya keeps your {exam} mocks, scores and weak topics, and picks up where you left off next time.",
    lineExamNoPractice: "Sign in free — Shishya keeps {exam} as your exam and picks up where you left off next time.",
    lead: "Make Shishya yours — free.",
    line: "Sign in and Shishya keeps your exam, your mocks, scores and weak topics, and picks up where you left off next time.",
    cta: "Sign in free with Google →",
    privacy: "Free · Google shares only your name, email and profile picture · For students 13 and above",
  },
  hi: {
    leadExam: "{exam} की तैयारी कर रहे हैं?",
    lineExam: "मुफ़्त साइन इन कीजिए — Shishya आपके {exam} मॉक, स्कोर और कमज़ोर टॉपिक सँभालकर रखता है, और अगली बार वहीं से शुरू करता है जहाँ आपने छोड़ा था।",
    lineExamNoPractice: "मुफ़्त साइन इन कीजिए — Shishya {exam} को आपकी परीक्षा के रूप में सँभालकर रखता है, और अगली बार वहीं से शुरू करता है जहाँ आपने छोड़ा था।",
    lead: "Shishya को अपना बनाइए — मुफ़्त।",
    line: "साइन इन कीजिए — Shishya आपकी परीक्षा, आपके मॉक, स्कोर और कमज़ोर टॉपिक सँभालकर रखता है, और अगली बार वहीं से शुरू करता है जहाँ आपने छोड़ा था।",
    cta: "Google से मुफ़्त साइन इन →",
    privacy: "मुफ़्त · Google से केवल आपका नाम, ईमेल और प्रोफ़ाइल फ़ोटो · 13 साल और उससे बड़े विद्यार्थियों के लिए",
  },
  te: {
    leadExam: "{exam} కి సిద్ధమవుతున్నారా?",
    lineExam: "ఉచితంగా సైన్ ఇన్ చేయండి — Shishya మీ {exam} మాక్‌లు, స్కోర్లు, బలహీన టాపిక్‌లను దాచి ఉంచుతుంది, తర్వాతిసారి మీరు ఆపిన చోటు నుంచే మొదలుపెడుతుంది.",
    lineExamNoPractice: "ఉచితంగా సైన్ ఇన్ చేయండి — Shishya {exam} ను మీ పరీక్షగా దాచి ఉంచుతుంది, తర్వాతిసారి మీరు ఆపిన చోటు నుంచే మొదలుపెడుతుంది.",
    lead: "Shishya ను మీదిగా చేసుకోండి — ఉచితం.",
    line: "సైన్ ఇన్ చేయండి — Shishya మీ పరీక్షను, మీ మాక్‌లు, స్కోర్లు, బలహీన టాపిక్‌లను దాచి ఉంచుతుంది, తర్వాతిసారి మీరు ఆపిన చోటు నుంచే మొదలుపెడుతుంది.",
    cta: "Google తో ఉచితంగా సైన్ ఇన్ →",
    privacy: "ఉచితం · Google నుంచి మీ పేరు, ఈమెయిల్, ప్రొఫైల్ ఫోటో మాత్రమే · 13 ఏళ్లు, ఆపై వయసు విద్యార్థుల కోసం",
  },
} as const;

/** The early line's words — exam-specific when the page names one exam.
 *  `practice` is that exam's practice state (ExamPracticeState.hasPractice,
 *  passed by the page): only `true` promises "{exam} mocks, scores and weak
 *  topics"; false or unknown gets the exam line without them — fail closed,
 *  like every other practice promise (src/lib/db/exam-practice.ts). */
export function signupLineCopy(locale: string | null | undefined, exam?: string | null, practice?: boolean | null): SignupLineCopy {
  const c = LINE[loc(locale)];
  const name = typeof exam === "string" ? exam.trim() : "";
  if (name) {
    return {
      lead: c.leadExam.replace("{exam}", name),
      line: (practice === true ? c.lineExam : c.lineExamNoPractice).replace("{exam}", name),
      cta: c.cta,
      privacy: c.privacy,
    };
  }
  return { lead: c.lead, line: c.line, cta: c.cta, privacy: c.privacy };
}

// ── (b) The timed bar ──────────────────────────────────────────────────

export interface NudgeBarCopy {
  /** One line — "can": it is what an account does once they practise. */
  line: string;
  cta: string;
  /** Free + the age line, under the line on every screen (30 Sep 2026
   *  review: "signup-nudge" is in the skip-/login test, so half of the
   *  guests who tap the bar go straight to Google's chooser and never see
   *  /login's age line — and the bar also shows on Class 8-12 pages). */
  privacy: string;
  /** What Google shares — appended on wider screens (sm+), where it fits. */
  privacyMore: string;
  /** The ✕'s accessible name. */
  later: string;
  /** The bar's accessible name. */
  label: string;
}

const BAR: Record<ContentLocale, NudgeBarCopy> = {
  en: {
    line: "Shishya can remember your exam and weak topics.",
    cta: "Sign in free",
    privacy: "Free · For students 13 and above",
    privacyMore: " · Google shares only your name, email and profile picture",
    later: "Maybe later",
    label: "Sign in free",
  },
  hi: {
    line: "Shishya आपकी परीक्षा और कमज़ोर टॉपिक याद रख सकता है।",
    cta: "मुफ़्त साइन इन",
    privacy: "मुफ़्त · 13+ साल के विद्यार्थियों के लिए",
    privacyMore: " · Google से केवल आपका नाम, ईमेल और प्रोफ़ाइल फ़ोटो",
    later: "बाद में",
    label: "मुफ़्त साइन इन",
  },
  // 30 Sep 2026 (review): shorter Telugu — beside the wide Telugu button the
  // text column is ~156 px on a 375 px phone; the old line lost its verb to
  // the two-line clamp ("…టాపిక్‌లను...") and the age line wrapped.
  te: {
    line: "Shishya మీ పరీక్ష, బలహీన టాపిక్‌లు గుర్తుంచుకోగలదు.",
    cta: "ఉచితంగా సైన్ ఇన్",
    privacy: "ఉచితం · 13+ విద్యార్థులకు",
    privacyMore: " · Google నుంచి మీ పేరు, ఈమెయిల్, ప్రొఫైల్ ఫోటో మాత్రమే",
    later: "తర్వాత",
    label: "ఉచితంగా సైన్ ఇన్",
  },
};

export function nudgeBarCopy(locale: string | null | undefined): NudgeBarCopy {
  return BAR[loc(locale)];
}

/** The language a page is written in whatever the reader's setting, or null.
 *  30 Sep 2026 (review): the native Hindi notes (/exams/X/topics/Y/hi) carry
 *  no /hi prefix, so clientUiLocale() reads the cookie there and the bar
 *  spoke English on a Hindi page whose own early line is Hindi. */
export function fixedPageLocale(path: string | null | undefined): ContentLocale | null {
  if (typeof path !== "string") return null;
  const p = path.split(/[?#]/)[0].replace(/\/+$/, "");
  return /^(?:\/(?:hi|te))?\/exams\/[^/]+\/topics\/[^/]+\/hi$/.test(p) ? "hi" : null;
}

// ── Revealing the early line without moving the page ──────────────────
// SignupInline appears after hydration with no space reserved (reserving it
// would change the server HTML). With `revealOffscreen` it first renders an
// empty zero-height marker and appears only where nothing on screen moves:
// the marker is below the screen, or above it where the browser's scroll
// anchoring keeps the reader's place (Chrome, Firefox — a shift it absorbs
// is not counted as layout shift). A browser without scroll anchoring
// (overflow-anchor unsupported) waits until the spot is below the screen.

export function revealWithoutShift(top: number, bottom: number, viewportH: number, scrollAnchoring: boolean): boolean {
  if (!(viewportH > 0) || !Number.isFinite(top) || !Number.isFinite(bottom)) return false;
  if (top >= viewportH) return true;
  // Strictly above: a spot at the very top edge still moves what is on screen.
  return scrollAnchoring && bottom < 0;
}

/** Active (tab visible) seconds on the page before the bar may show. */
export const NUDGE_ACTIVE_SECONDS = 45;
/** …or the bottom of the reader's screen past this share of the page. */
export const NUDGE_SCROLL_FRACTION = 0.6;

/** True once the reader has scrolled (a real scroll, not a short page that
 *  fits the screen at load) far enough that the bottom of the screen is
 *  past 60% of the page. */
export function scrollDepthReached(scrollY: number, viewportH: number, docH: number, fraction = NUDGE_SCROLL_FRACTION): boolean {
  if (!(scrollY > 0) || !(viewportH > 0) || !(docH > 0)) return false;
  return scrollY + viewportH >= fraction * docH;
}

/** Why the bar shows now, or null: whichever comes first. */
export function nudgeTrigger(activeSeconds: number, scrolledPast: boolean): "scroll" | "time" | null {
  if (scrolledPast) return "scroll";
  if (activeSeconds >= NUDGE_ACTIVE_SECONDS) return "time";
  return null;
}

// ── Content families ───────────────────────────────────────────────────
// The page family of a content page (the analytics placement of both the
// early line and the bar), or null for anything else — the exam hub, quiz,
// build-mock, PYQ, mock, live tests, home, the chat, and every page the
// site-wide offer may not show on (src/lib/signup-pitch.ts pitchAllowedPath:
// Class 1-7, /schooling and board hubs, login, dashboard…).

const EXAM_SUB: Record<string, string> = {
  syllabus: "exam-syllabus",
  updates: "exam-updates",
  cutoff: "exam-cutoff",
  guide: "guide",
  tricks: "tricks",
  archive: "exam-archive",
  checklist: "exam-checklist",
};

/** College list pages under /colleges (anything else there is one college). */
const COLLEGE_LISTS = new Set(["state", "stream", "cutoffs", "placements", "iti-diploma"]);

export function contentFamily(path: string | null | undefined): string | null {
  if (typeof path !== "string" || !path.startsWith("/")) return null;
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  // The /hi and /te twins are the same page family.
  const p = clean.replace(/^\/(?:hi|te)(?=\/|$)/, "") || "/";
  if (!pitchAllowedPath(p) || isChildSchoolPath(p) || isUnder13SchoolPath(p)) return null;

  let m = /^\/exams\/([A-Z][A-Z0-9_]*)\/([a-z-]+)(?:\/([^/]+))?(?:\/([^/]+))?$/.exec(p);
  if (m) {
    const [, , sub, a, b] = m;
    if (EXAM_SUB[sub] && !a) return EXAM_SUB[sub];
    // /exams/X/topics/{topic} and its Hindi notes /hi — never /quiz.
    if (sub === "topics" && a && (!b || b === "hi")) return "topic";
    if (sub === "news" && a && !b) return "news";
    return null;
  }
  if (p === "/current-affairs" || p === "/current-affairs/capsule") return "current-affairs";
  if (/^\/current-affairs\/capsule\/[^/]+$/.test(p)) return "ca-capsule";
  if (/^\/current-affairs\/[^/]+$/.test(p)) return "ca-daily";
  if (p === "/scholarships" || p === "/scholarships/closing-soon" || /^\/scholarships\/for\/[^/]+$/.test(p)) return "scholarships";
  if (p === "/scholarships/match") return null; // the eligibility wizard, a tool
  if (/^\/scholarships\/[^/]+$/.test(p)) return "scholarship";
  if (p === "/careers") return "careers";
  if (/^\/careers\/[^/]+$/.test(p)) return "career";
  if (p === "/colleges") return "colleges";
  m = /^\/colleges\/([^/]+)(?:\/[^/]+)?$/.exec(p);
  if (m) return COLLEGE_LISTS.has(m[1]) ? "colleges" : "college";
  if (p === "/exam-calendar") return "exam-calendar";
  if (p === "/jobs-map") return "jobs-map";
  if (p === "/ask") return "ask";
  // School Class 8-12 (13 and above): chapters and class pages.
  if (/^\/schooling\/[^/]+\/class-(?:8|9|10|11|12)(?:\/|$)/.test(p)) return "school";
  return null;
}

// ── Where the early line goes inside one long article ──────────────────
// Guide, tricks and topic notes are one markdown article each — the whole
// answer, often many phone screens. "Right after the first answer block"
// there means after the article's first section: the page renders the
// markdown in two parts with the (server-empty) line between them. The cut
// is only ever made before a "# " / "## " heading line outside a code fence
// with no "|" in it — a line both renderers (src/components/NotesMarkdown.tsx
// and src/lib/notes-markdown.ts) always start a new block on — so the two
// parts render exactly the blocks the whole did. No cut (null) when the
// first section is short or nothing much follows it: the page then puts the
// line after the article.
//
// 30 Sep 2026 (build 3 review): the opening must hold 800 characters, not
// 300. After 300 the cut often fell inside the first phone screen, so the
// line (about 170 px on a phone) pushed the rest of the article down on the
// largest landing family (topic notes) — a layout shift on a site whose
// Google impressions are already suppressed. About 800 characters of body
// is past the first phone screen on these templates; the in-article mounts
// also pass revealOffscreen (above), so a cut that is still on screen waits.

export const SPLIT_MIN_HEAD_CHARS = 800;
export const SPLIT_MIN_TAIL_CHARS = 300;

export function splitAfterFirstSection(
  markdown: string | null | undefined,
  minHead = SPLIT_MIN_HEAD_CHARS,
  minTail = SPLIT_MIN_TAIL_CHARS,
): [string, string] | null {
  if (typeof markdown !== "string" || !markdown) return null;
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  let fence: string | null = null;
  let body = 0;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (fence) {
      if (t.startsWith(fence)) fence = null;
      body += t.length;
      continue;
    }
    if (/^(```|~~~)/.test(t)) {
      fence = t.slice(0, 3);
      continue;
    }
    if (/^#{1,2} \S/.test(t) && !t.includes("|") && body >= minHead) {
      const tail = lines.slice(i);
      const tailBody = tail.filter((l) => !/^\s*#{1,6}\s/.test(l)).join("").replace(/\s+/g, "").length;
      if (tailBody < minTail) return null;
      return [lines.slice(0, i).join("\n"), tail.join("\n")];
    }
    if (!/^#{1,6}\s/.test(t)) body += t.length;
  }
  return null;
}

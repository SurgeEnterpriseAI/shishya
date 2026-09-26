// Site-wide search contract (26 Sep 2026, founder brief: "bring back the
// search strip — for the entire redesigned Shishya platform, in any
// language; every search opens the page we already have, and only when no
// page fits does the AI tutor answer and recommend one of our pages").
//
// One contract for the three builders: the resolver + index (src/lib/search/*),
// the AI answer (src/lib/ask-engine.ts, /api/ask) and the UI (the home strip,
// /ask). Pure types and constants only — this file is imported by client
// code, so it must never import prisma, next or any data module.
//
// Deterministic first: most typed searches are names ("mpsc group c",
// "utet", "ts pc") or "<name> <page>" ("ssc cgl cutoff"), so a page index
// built from the site's own data answers them with no model call. The AI
// runs only for outcome "ai" (no page fits, or a real doubt), never for a bot,
// and never for a Class 1-7 school query.

export type SearchSection = "school" | "entrance" | "government" | "college" | "careers" | "more";
/** Grid order of the five home doors, then "more" (abroad, tools, landings, insights). */
export const SEARCH_SECTIONS: readonly SearchSection[] = ["school", "entrance", "government", "college", "careers", "more"];
/** One glyph per section for result rows. */
export const SECTION_ICON: Readonly<Record<SearchSection, string>> = {
  school: "🏫",
  entrance: "🎯",
  government: "🏛️",
  college: "🎓",
  careers: "🧭",
  more: "🌍",
};

export type DocKind =
  | "exam" | "exam-state" | "exam-category"
  | "school-board" | "school-class" | "school-subject" | "school-chapter"
  | "topic-note" // deep (server) tier only
  | "college" | "college-branch" | "college-state" | "college-stream"
  | "scholarship" | "career" | "persona"
  | "abroad-country" | "abroad-university" | "abroad-test"
  | "insight" | "landing";

/** What a page holds, from data: a chapter with Shishya's own notes or
 *  checked practice is "ready"; one with only the official book link is
 *  "book-only"; "sign-in" pages need an account to use (the mock builder). */
export type PageStatus = "ready" | "book-only" | "coming" | "sign-in";

export type ExamIntent =
  | "hub" | "dates" | "syllabus" | "cutoff" | "pyq" | "mocks" | "subject-tests" | "topics" | "build-mock"
  | "checklist" | "guide" | "tricks" | "score" | "eligibility" | "salary" | "live" | "reactions";

/** Which exam sub-pages render, per exam — from the same loader the sitemap
 *  uses (src/lib/exam-page-gates.ts; structurally its ExamPageGates). */
export interface ExamGatesLike {
  cutoff: boolean;
  syllabus: boolean;
  tricks: boolean;
  guide: boolean;
  buildMock: boolean;
}
export interface ExamFacts {
  gates: ExamGatesLike; // loadExamPageGates(); GATES_CLOSED when the read fails
  pyqYears: number[]; // REAL_EXAM_SQL: years with validated PYQ rows (the /pyq/[year] pages)
  topicNotes: boolean; // at least one topic with usable notes (the /topics index)
  deep: { eligibility: boolean; salary: boolean }; // EXAM_DEEP_CONTENT → the hub's #eligibility / #salary blocks
  live: boolean; // validated questions or a system mock (the hub's practice sections render)
  category?: string; // Exam.category (OLYMPIAD exams stay in play next to a school query)
}

export interface SearchDoc {
  id: string; // `${kind}:${key}`, unique — e.g. "exam:SSC_CGL", "school-chapter:cbse:9:science:tissues-in-action"
  kind: DocKind;
  section: SearchSection;
  title: string;
  sub: string; // one factual line taken from data — never invented
  path: string; // site-relative path of a page.tsx that renders (may end in #anchor); built from data, NEVER from query text
  terms: string[]; // normalised strong keys, any script (names, shortName, code with _→space, inverted alias keys, native names)
  soft?: string[]; // weak keys (career keywords, scholarship tags)
  weight: number; // 0..1 popularity prior
  status?: PageStatus;
  listOnly?: boolean; // /for/* personas: may be a list row, never a DIRECT target
  examCode?: string;
  state?: string | null;
  board?: string; // "cbse" | "icse-cisce" | another /schooling/{slug} board
  cls?: number;
  subjectSlug?: string;
  chapterNo?: number; // Topic.orderIdx % 100 — the number printed in the book
  book?: number; // floor(Topic.orderIdx / 100) — which book of the subject (Part I / II, reader 1 / 2)
  scholarship?: { gender: "F" | "M" | null; state: string | null; levels: string[]; categories: string[]; type?: string };
}

export interface SearchIndex {
  v: 1;
  builtAt: string;
  tier: "lite" | "deep"; // lite = the client index (no topic-note docs); deep = the server index
  docs: SearchDoc[];
  exams: Record<string, ExamFacts>;
}

export type QueryScript = "latin" | "deva" | "telu" | "taml" | "knda" | "beng" | "gujr" | "guru" | "orya" | "mlym" | "arab" | "mixed";

export interface ParsedQuery {
  raw: string;
  norm: string;
  script: QueryScript;
  tokens: string[];
  pastedPath: string | null; // "https://shishya.in/exams/mp_tet" → "/exams/MP_TET"
  langRequest: string | null; // "in hindi" / "hindi me" / "हिंदी में" / "telugu lo" → "hi" | "te" | "mr" …; used up, never a search token
  intent: ExamIntent | null;
  dateKind: string | null; // ADMIT_CARD | RESULT | NOTIFICATION | ANSWER_KEY | APPLICATION | EXAM (the tracker's kinds)
  year: number | null;
  cls: number | null;
  board: string | null;
  subject: string | null; // canonical school subject ("mathematics", "science" …), claimed only with a school cue
  chapterNo: number | null;
  chapterWords: string[]; // what is left inside a class + subject query, matched against chapter names only
  stage: "after-10" | "after-12" | "after-grad" | null; // "12th pass", "after 10th": a qualifier, never a class
  state: string | null; // ISO code; a 2-letter abbreviation counts only next to a role / exam / section word
  stateTokens: string[]; // the words that named the state (they still match exam names)
  section: SearchSection | null;
  sectionWords: string[]; // the words that named the section ("university", "colleges") — part of some pages' own names
  kindHint: DocKind | null; // "scholarship", "college", "career" … from section words
  aspect: "placements" | "fees" | "admission" | null; // college questions
  filters: { gender: "F" | null; categories: string[]; levels: string[] };
  beingBuilt: boolean; // graduation / PG / PhD study help: no section yet
  shape: "keyword" | "question";
  doubtVerb: boolean; // explain / what is / meaning / solve / samjhao …
  firstPerson: boolean; // "i am 26", "mera", "can i"
  compare: boolean; // "x vs y", "which is better"
  doubt: boolean; // parse-time estimate; resolveQuery refines it against the index
  rest: string; // hard + soft, space-joined
  phrase: string; // every word but stop words, question words and the language request (for exact page-name matches such as "typing test")
  hard: string[]; // residual tokens that must be explained for a DIRECT open
  soft: string[]; // residual tokens that help ranking but never block (assistant, junior, exam, bharti …)
}

export type Outcome = "direct" | "list" | "ai";
export type SearchNotice =
  | "book-only"
  | "being-built"
  | "no-ai-young-class"
  | "no-page-for-intent"
  | "not-in-catalogue"
  | "chapter-ambiguous"
  | "school-route-only";
export type HitWhy = "url" | "exact" | "default" | "acronym" | "alias" | "tokens" | "structure" | "state" | "fuzzy" | "landing" | "nearest";

export interface SearchHit {
  docId: string;
  kind: DocKind;
  section: SearchSection;
  title: string;
  sub: string;
  label: string; // e.g. "SSC CGL · Cutoff", "Class 9 Science · Chapter 3"
  url: string; // final relative URL, intent + locale applied; always starts with a single "/"
  intent: ExamIntent | null;
  status?: PageStatus;
  score: number;
  why: HitWhy;
  downgraded?: boolean; // the asked-for sub-page does not exist; url is the parent
}

export interface Resolution {
  q: string;
  parsed: ParsedQuery;
  outcome: Outcome;
  best: SearchHit | null; // non-null iff outcome === "direct"
  hits: SearchHit[]; // ≤ 8, best's section first, ≤ 3 per section
  groups: { section: SearchSection; hits: SearchHit[] }[]; // the same hits, grouped in display order
  quick: SearchHit[]; // gated sibling pages of the top exam (Dates · Syllabus · Cutoff · PYQs · Mocks), ≤ 5
  recommended: SearchHit[]; // outcome "ai": the closest real pages (≤ 3) to hand the AI and show first; may be empty
  understood: { slot: "exam" | "class" | "board" | "subject" | "chapter" | "state" | "intent" | "year" | "language" | "section"; label: string }[];
  notices: SearchNotice[];
  schoolScope: "none" | "class1to7" | "class8to12";
  logMiss: boolean; // not direct and the top candidate leaves a typed word unexplained → SEARCH_MISS
  needsServer: boolean; // lite index and not direct: the server's deep index may still find a topic-note page
  fallback: SearchHit; // the section landing (/schooling, /exams/browse, /colleges, /scholarships/match, /careers), else "/"
}

/** A verified page link for the AI answer and its cards. */
export interface PageLink {
  url: string;
  label: string;
  section: SearchSection;
  status?: PageStatus;
}

export const DIRECT_MIN = 0.85;
export const DIRECT_MARGIN = 0.15;
export const LIST_MIN = 0.5;
/** Floor for the pages handed to the AI as "closest we have" (26 Sep 2026):
 *  an AI outcome often means nothing reached LIST_MIN, so this floor sits
 *  below it — these are real pages shown as "closest", never as a match. */
export const RECOMMEND_MIN = 0.4;
/** School AI (26 Sep 2026, the 25 Sep minors decision): "route-only" — the AI
 *  lists class / subject / chapter pages with their status and never teaches.
 *  The founder flips it to "own-words" only after child consent and the
 *  Anthropic minors sign-off. Class 1-7 never reaches a model in either mode. */
export const SCHOOL_AI_MODE: "route-only" | "own-words" = "route-only";
/** sessionStorage JSON {q, at}: set only by a human submit; the AI auto-runs on
 *  /ask only when it matches q, is under ASK_INTENT_TTL_MS old and the page is
 *  visible. Deleted on use. */
export const ASK_INTENT_KEY = "shishya.search.intent";
export const ASK_INTENT_TTL_MS = 120_000;
/** sessionStorage prefix + q → the cached answer, so back / forward never refires. */
export const ASK_ANSWER_KEY = "shishya.ask.answer:";
/** localStorage string[] ≤ 5 (recent searches); read and write in try/catch. */
export const RECENT_KEY = "shishya.search.recent";

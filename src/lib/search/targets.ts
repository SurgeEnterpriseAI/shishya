// Where a search lands (26 Sep 2026): the exam sub-page for an intent, the
// /hi or /te twin for a locale, and the check that a URL is a page Shishya
// really has. Pure — shared by the resolver (client and server), the /ask page
// and the AI answer's link check.
//
// Honesty rule: an exam sub-page is offered only when it renders — the gates
// (src/lib/exam-page-gates.ts, the sitemap's own rule), the PYQ years with
// validated rows, the topic-note index, the EXAM_DEEP_CONTENT blocks behind
// the hub's #eligibility / #salary. A missing page is never linked: the
// result falls back to the parent and says so ("no-page-for-intent").

import type { ExamFacts, ExamIntent, PageStatus, SearchIndex, SearchNotice } from "./types";

/** English labels for exam pages ("SSC CGL · Cutoff"). */
export const INTENT_LABEL: Readonly<Record<ExamIntent, string>> = {
  hub: "Exam page",
  dates: "Dates & updates",
  syllabus: "Syllabus",
  cutoff: "Cutoff",
  pyq: "Previous papers",
  mocks: "Mock tests",
  "subject-tests": "Subject-wise tests",
  topics: "Topic notes",
  "build-mock": "Build your own mock",
  checklist: "Exam-day checklist",
  guide: "Preparation guide",
  tricks: "Tricks",
  score: "Score estimate",
  eligibility: "Eligibility",
  salary: "Salary",
  live: "Exam day",
  reactions: "After the paper",
};

const CLOSED = { cutoff: false, syllabus: false, tricks: false, guide: false, buildMock: false };

export interface ExamTarget {
  url: string;
  label: string; // the intent part of the label ("Cutoff", "PYQ 2024")
  applied: ExamIntent; // the page actually linked
  downgraded: boolean; // the asked-for page does not exist; url is the parent
  status?: PageStatus;
  notice?: SearchNotice;
}

/**
 * The page for an exam + intent, from the exam's facts only.
 *   hub → /exams/C · dates → /updates · syllabus → /syllabus (gate) · cutoff → /cutoff (gate)
 *   pyq → /pyq/Y if Y has rows, else /pyq if any year does, else hub#pyqs + notice
 *   mocks → #mocks · subject-tests → #subject-tests (live exams) · topics → /topics (usable notes)
 *   build-mock → /build-mock (gate, sign-in) else #custom-mock (live) · checklist → /checklist
 *   guide / tricks → their page (gate) · score → /score-estimate · eligibility / salary → #anchor (deep block)
 *   live → /live · reactions → /reactions
 */
export function examIntentUrl(code: string, intent: ExamIntent | null, facts: ExamFacts | undefined, year?: number | null): ExamTarget {
  const hub = `/exams/${code}`;
  const g = facts?.gates ?? CLOSED;
  const live = facts?.live ?? false;
  const years = facts?.pyqYears ?? [];
  const ok = (url: string, applied: ExamIntent, label = INTENT_LABEL[applied], status?: PageStatus): ExamTarget => ({ url, label, applied, downgraded: false, status });
  const down = (url: string, applied: ExamIntent, asked: ExamIntent): ExamTarget => ({
    url,
    label: INTENT_LABEL[asked],
    applied,
    downgraded: true,
    notice: "no-page-for-intent",
  });
  const coming = (url: string, asked: ExamIntent): ExamTarget => ({ ...down(url, "hub", asked), status: "coming" });
  switch (intent ?? "hub") {
    case "hub":
      return ok(hub, "hub");
    case "dates":
      return ok(`${hub}/updates`, "dates");
    case "syllabus":
      return g.syllabus ? ok(`${hub}/syllabus`, "syllabus") : down(hub, "hub", "syllabus");
    case "cutoff":
      return g.cutoff ? ok(`${hub}/cutoff`, "cutoff") : down(hub, "hub", "cutoff");
    case "pyq":
      if (year != null && years.includes(year)) return ok(`${hub}/pyq/${year}`, "pyq", `PYQ ${year}`);
      if (years.length > 0) return year != null ? down(`${hub}/pyq`, "pyq", "pyq") : ok(`${hub}/pyq`, "pyq");
      return down(`${hub}#pyqs`, "hub", "pyq");
    // 26 Sep 2026 (search fixer): an exam with no mock and no checked question
    // (facts.live false — NEET PG, NATA, RBI Grade B …) has only the hub's
    // "no mocks yet" state: the search says "Coming" and lists the hub, never
    // opens an empty "Mock tests" as the best match.
    case "mocks":
      return live ? ok(`${hub}#mocks`, "mocks") : coming(hub, "mocks");
    case "subject-tests":
      return live ? ok(`${hub}#subject-tests`, "subject-tests") : coming(hub, "subject-tests");
    case "topics":
      if (facts?.topicNotes) return ok(`${hub}/topics`, "topics");
      return g.syllabus ? down(`${hub}/syllabus`, "syllabus", "topics") : down(hub, "hub", "topics");
    case "build-mock":
      if (g.buildMock) return ok(`${hub}/build-mock`, "build-mock", INTENT_LABEL["build-mock"], "sign-in");
      return live ? ok(`${hub}#custom-mock`, "build-mock") : coming(hub, "build-mock");
    case "checklist":
      return ok(`${hub}/checklist`, "checklist");
    case "guide":
      return g.guide ? ok(`${hub}/guide`, "guide") : down(hub, "hub", "guide");
    case "tricks":
      return g.tricks ? ok(`${hub}/tricks`, "tricks") : down(hub, "hub", "tricks");
    case "score":
      return ok(`${hub}/score-estimate`, "score");
    case "eligibility":
      return facts?.deep.eligibility ? ok(`${hub}#eligibility`, "eligibility") : down(hub, "hub", "eligibility");
    case "salary":
      return facts?.deep.salary ? ok(`${hub}#salary`, "salary") : down(hub, "hub", "salary");
    case "live":
      return ok(`${hub}/live`, "live");
    case "reactions":
      return ok(`${hub}/reactions`, "reactions");
  }
}

/** The exam sub-pages that render for an exam — the "quick" links row. */
export function examSiblingIntents(facts: ExamFacts | undefined): ExamIntent[] {
  const out: ExamIntent[] = ["dates"];
  if (facts?.gates.syllabus) out.push("syllabus");
  if (facts?.gates.cutoff) out.push("cutoff");
  if ((facts?.pyqYears.length ?? 0) > 0) out.push("pyq");
  // 26 Sep 2026 (search fixer): no "Mock tests" chip for an exam with no mock yet.
  if (facts?.live) out.push("mocks");
  return out;
}

// A copy of src/middleware.ts TWIN_PUBLIC_RE (tests/unit/search-resolver.test.ts
// fails if the two differ): the paths that have /hi and /te twins. School,
// college, career and scholarship pages have none — a prefixed URL there 307s.
export const TWIN_PUBLIC_RE =
  /^\/(exams(\/|$)|exam-calendar$|current-affairs(\/|$)|live-test$|ask$|jobs-map$|find-your-exam$|results$|mentors$|educators$|pricing$|about$|for\/)/;

/** "/exams/X" → "/hi/exams/X" when the page has a twin and the locale is hi / te; otherwise unchanged. */
export function localeTarget(path: string, locale: "en" | "hi" | "te"): string {
  if (locale === "en" || !isSafePath(path)) return path;
  const bare = path.split(/[?#]/)[0];
  if (bare !== "/" && !TWIN_PUBLIC_RE.test(bare)) return path;
  return bare === "/" ? `/${locale}${path.slice(1)}` : `/${locale}${path}`;
}

/** A redirect target must be a site path: one leading "/", never "//" or "/\" (no open redirect). */
export function isSafePath(p: string): boolean {
  return typeof p === "string" && p.startsWith("/") && !p.startsWith("//") && !p.startsWith("/\\") && !/[\s<>"']/.test(p);
}

const HOST_RE = /^https?:\/\/(www\.)?shishya\.in(?=\/|$)/i;
const EXAM_SUB = /^\/exams\/([A-Za-z0-9_]+)(?:\/(.*))?$/;

/**
 * The canonical path of a URL if it is a page Shishya has, else null.
 * Accepts https://shishya.in/… or /…; strips the /hi or /te prefix, the
 * #anchor and any query string (keeps ?pyq=1 on /build-mock and ?category=
 * on /exams/browse, which are real page states). A path counts when it is an
 * index document's path, or an exam sub-page whose gate / year / notes say it
 * renders.
 */
export function knownUrl(url: string, index: SearchIndex): string | null {
  if (typeof url !== "string") return null;
  let u = url.trim();
  if (HOST_RE.test(u)) u = u.replace(HOST_RE, "") || "/";
  if (!isSafePath(u)) return null;
  const [pathAndQuery] = u.split("#");
  let [path, query = ""] = pathAndQuery.split("?");
  path = path.replace(/\/+$/, "") || "/";
  path = path.replace(/^\/(hi|te)(?=\/|$)/, "") || "/";
  const paths = docPaths(index);
  const m = EXAM_SUB.exec(path);
  // 26 Sep 2026 (search fixer): only a real exam code enters the exam branch —
  // /exams/state/{slug} and /exams/browse are index pages checked below.
  if (m && index.exams[m[1].toUpperCase()]) {
    const code = m[1].toUpperCase();
    const facts = index.exams[code];
    const sub = (m[2] ?? "").replace(/\/+$/, "");
    const base = `/exams/${code}`;
    const g = facts.gates;
    const allowed =
      sub === "" ||
      ["updates", "checklist", "score-estimate", "live", "reactions", "archive"].includes(sub) ||
      (sub === "syllabus" && g.syllabus) ||
      (sub === "cutoff" && g.cutoff) ||
      (sub === "tricks" && g.tricks) ||
      (sub === "guide" && g.guide) ||
      (sub === "build-mock" && g.buildMock) ||
      (sub === "pyq" && facts.pyqYears.length > 0) ||
      (/^pyq\/\d{4}$/.test(sub) && facts.pyqYears.includes(Number(sub.slice(4)))) ||
      (sub === "topics" && facts.topicNotes) ||
      (/^topics\/[^/]+$/.test(sub) && paths.has(`${base}/${sub}`));
    if (!allowed) return null;
    const keepQuery = sub === "build-mock" && /(^|&)pyq=1(&|$)/.test(query) ? "?pyq=1" : "";
    return `${base}${sub ? `/${sub}` : ""}${keepQuery}`;
  }
  if (path === "/exams/browse") {
    const cat = /(^|&)category=([A-Z_]+)(&|$)/.exec(query)?.[2];
    const withCat = cat ? `/exams/browse?category=${cat}` : null;
    if (withCat && paths.has(withCat)) return withCat;
  }
  return paths.has(path) ? path : null;
}

const pathCache = new WeakMap<SearchIndex, Set<string>>();
/** Every document path of an index, without its #anchor. */
export function docPaths(index: SearchIndex): Set<string> {
  let s = pathCache.get(index);
  if (!s) {
    s = new Set(index.docs.map((d) => d.path.split("#")[0]));
    s.add("/");
    pathCache.set(index, s);
  }
  return s;
}

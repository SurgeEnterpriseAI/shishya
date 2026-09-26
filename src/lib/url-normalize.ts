// URL normalisation (26 Sep 2026, discoverability G2): every plausible URL a
// student or an LLM types reaches the canonical page with ONE 308, and every
// "Back" link points at a page that renders.
//
// Why: Search Console listed 404s from /exams/CLAT and from lower-case alias
// codes (/exams/ssc_cgl, /exams/neet); ChatGPT and students write exam URLs
// the way they say them ("/exams/jee-main", "/Exams/SSC_CGL"), school URLs
// the way they type them ("/schooling/cbse/10/maths"), and edit URLs up one
// level to paths that never had a page (/exams/X/news, /colleges/stream).
// Each of those was a 404; each is now one permanent redirect to the page
// that exists — or stays an honest 404 when no equivalent page exists.
//
// Pure and edge-safe: no Prisma, no next, no data modules (src/middleware.ts
// runs it at the edge; BackLink.tsx imports inferParent into the client
// bundle). Lists that mirror data (exam codes, board / college slugs) are
// hand-kept here and pinned to the data by tests/unit/url-normalize.test.ts.

import { TWIN_PUBLIC_RE } from "@/lib/search/targets";

// ── Exams ────────────────────────────────────────────────────────────────

/** Static folders beside src/app/exams/[code] — never exam codes, so never
 *  upper-cased. "category" and "after" are G4's hubs (26 Sep 2026). The test
 *  reads src/app/exams and fails if a folder is missing here. */
export const EXAM_STATIC_SEGMENTS: ReadonlySet<string> = new Set(["browse", "entrance", "state", "category", "after"]);

/** Bare exam names → the ONE exam page they mean. Unambiguous names only, and
 *  every target is a real, active code (the test checks the 26 Sep 2026
 *  snapshot of the 180 real exams). Keys are lower-case with "-" for "_".
 *  Deliberately absent: clat, gate, bitsat, iit-jam, cuet-pg — no equivalent
 *  hub exists, so they stay honest 404s until one does. */
export const EXAM_PATH_ALIASES: Readonly<Record<string, string>> = {
  neet: "NEET_UG",
  "jee-main": "JEE_MAIN",
  jeemain: "JEE_MAIN",
  "jee-mains": "JEE_MAIN",
  jeemains: "JEE_MAIN",
  "jee-advanced": "JEE_ADVANCED",
  upsc: "UPSC_PRELIMS",
  ias: "UPSC_PRELIMS",
  "upsc-cse": "UPSC_PRELIMS",
  cuet: "CUET_UG",
  "cuet-ug": "CUET_UG",
  ctet: "CTET",
  "ssc-cgl": "SSC_CGL",
};

/** Exam sub-paths that never had a page → the page that holds the same
 *  thing (the archive lists the exam's news; /updates carries its results). */
const EXAM_DEAD_SUBPATHS: Readonly<Record<string, string>> = {
  news: "archive",
  results: "updates",
};

/** A code-like path segment (letters, digits, "_" and "-"): anything else —
 *  a percent-encoded space, a dot — is left alone to 404. */
const CODE_LIKE = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * The canonical form of the segment after /exams/: a static folder in lower
 * case, else a curated alias, else the code in upper case with "-" → "_".
 * Null when the segment is not code-like. Real codes are ^[A-Z0-9_]+$, so a
 * canonical code maps to itself.
 */
export function canonicalExamSegment(seg: string): string | null {
  if (!CODE_LIKE.test(seg)) return null;
  const lower = seg.toLowerCase();
  if (EXAM_STATIC_SEGMENTS.has(lower)) return lower;
  const alias = EXAM_PATH_ALIASES[lower.replace(/_/g, "-")];
  if (alias) return alias;
  return seg.toUpperCase().replace(/-/g, "_");
}

/** Split an optional /hi or /te prefix off a path. */
function splitLocale(pathname: string): { prefix: "" | "/hi" | "/te"; bare: string } {
  const m = /^\/(hi|te)(\/.*)?$/.exec(pathname);
  if (!m) return { prefix: "", bare: pathname };
  return { prefix: `/${m[1]}` as "/hi" | "/te", bare: m[2] || "/" };
}

/** Re-attach a locale prefix only where the target has a twin (else the plain page). */
function withLocale(prefix: "" | "/hi" | "/te", bare: string): string {
  if (!prefix) return bare;
  if (bare === "/") return prefix;
  return TWIN_PUBLIC_RE.test(bare) ? `${prefix}${bare}` : bare;
}

/** Drop a trailing slash (never from "/"). */
const trimSlash = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") || "/" : p);

/** The canonical bare /exams path, or the input unchanged. */
function canonicalExamBare(bare: string): string {
  const segs = bare.split("/"); // ["", "exams", seg, ...rest]
  if ((segs[1] ?? "").toLowerCase() !== "exams") return bare;
  segs[1] = "exams";
  const seg = segs[2];
  if (seg) {
    const canon = canonicalExamSegment(seg);
    if (canon) segs[2] = canon;
    // /exams/{CODE}/news and /exams/{CODE}/results (exactly) never had a page.
    const sub = segs[3];
    const isCode = canon != null && !EXAM_STATIC_SEGMENTS.has(canon);
    if (isCode && sub && EXAM_DEAD_SUBPATHS[sub] && segs.slice(4).every((s) => s === "")) {
      return `/exams/${segs[2]}/${EXAM_DEAD_SUBPATHS[sub]}`;
    }
  }
  return segs.join("/");
}

/**
 * /exams/{seg}/… and /hi|/te/exams/{seg}/… → the canonical path, or null when
 * the path is already canonical (or is not an exam path). Also lower-cases the
 * first segment ("/Exams/…"). The rest of the path is kept; the caller keeps
 * the query string.
 */
export function normalizeExamPath(pathname: string): string | null {
  const { prefix, bare } = splitLocale(pathname);
  if (!/^\/exams(\/|$)/i.test(bare)) return null;
  const next = canonicalExamBare(bare);
  if (next === bare) return null;
  return withLocale(prefix, trimSlash(next));
}

// ── School ───────────────────────────────────────────────────────────────

/** Board names students type → the /schooling/{slug} board (slugs pinned to
 *  src/lib/schooling-data.ts BOARDS by the test). CISCE runs both ICSE and ISC. */
export const SCHOOL_BOARD_ALIASES: Readonly<Record<string, string>> = {
  icse: "icse-cisce",
  isc: "icse-cisce",
  cisce: "icse-cisce",
};
/** Subject words → the seeded subject slug (every class has "mathematics"). */
export const SCHOOL_SUBJECT_ALIASES: Readonly<Record<string, string>> = {
  maths: "mathematics",
  math: "mathematics",
};

/** "10", "10th", "class10", "class_10", "Class-10" → "class-10" (classes 1-12); anything else unchanged. */
function canonicalClassSegment(seg: string): string {
  const lower = seg.toLowerCase();
  const m = /^(?:class[-_]?)?(\d{1,2})(?:st|nd|rd|th)?$/.exec(lower);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 12) return `class-${n}`;
  }
  return lower;
}

/** /schooling/{board}/{class}/{subject}/… with the three named segments in canonical form. */
function canonicalSchoolingBare(bare: string): string {
  const segs = bare.split("/"); // ["", "schooling", board, class, subject, ...]
  if ((segs[1] ?? "").toLowerCase() !== "schooling") return bare;
  segs[1] = "schooling";
  if (segs[2]) {
    const b = segs[2].toLowerCase();
    segs[2] = SCHOOL_BOARD_ALIASES[b] ?? b;
  }
  if (segs[3]) segs[3] = canonicalClassSegment(segs[3]);
  if (segs[4]) {
    const s = segs[4].toLowerCase();
    segs[4] = SCHOOL_SUBJECT_ALIASES[s] ?? s;
  }
  return segs.join("/");
}

// ── Colleges, careers, scholarships (slugs are lower-case kebab) ─────────

/** College acronyms → the college's page. Only unambiguous acronyms whose
 *  target slug exists in src/lib/colleges-data.ts (pinned by the test). */
export const COLLEGE_SLUG_ALIASES: Readonly<Record<string, string>> = {
  iitb: "iit-bombay",
  iitd: "iit-delhi",
  iitm: "iit-madras",
  iitk: "iit-kanpur",
  iitkgp: "iit-kharagpur",
  iitr: "iit-roorkee",
  iitg: "iit-guwahati",
  iith: "iit-hyderabad",
  "iit-bhu": "iit-bhu-varanasi",
  "iit-ism": "iit-ism-dhanbad",
  iisc: "iisc-bangalore",
  iima: "iim-ahmedabad",
  iimb: "iim-bangalore",
  iimc: "iim-calcutta",
  iiml: "iim-lucknow",
  nitk: "nit-surathkal",
  nitw: "nit-warangal",
  iiith: "iiit-hyderabad",
};

/** /colleges/{slug}, /careers/{slug}, /scholarships/{id}: the slug segment in lower case (+ college aliases). */
function canonicalSlugBare(bare: string): string {
  const segs = bare.split("/");
  const section = segs[1];
  if (section !== "colleges" && section !== "careers" && section !== "scholarships") return bare;
  const seg = segs[2];
  if (!seg || !CODE_LIKE.test(seg)) return bare;
  const lower = seg.toLowerCase();
  segs[2] = section === "colleges" ? (COLLEGE_SLUG_ALIASES[lower] ?? lower) : lower;
  return segs.join("/");
}

// ── Paths that never had a page ──────────────────────────────────────────

/** Section paths students reach by editing a URL up one level; none has a
 *  page.tsx (checked by the test) → the section page that lists the same. */
export const DEAD_PATHS: Readonly<Record<string, string>> = {
  "/current-affairs/capsule": "/current-affairs",
  "/colleges/stream": "/colleges",
  "/colleges/state": "/colleges",
  "/for": "/",
  "/worldwide/test-prep": "/worldwide",
};

/**
 * The one canonical path for a typed URL, or null when it is already
 * canonical. Exams, school, college / career / scholarship slugs and the dead
 * section paths, with the /hi or /te prefix kept only where the target has a
 * twin. The middleware 308s to it and keeps the query string.
 */
export function canonicalPath(pathname: string): string | null {
  const { prefix, bare } = splitLocale(pathname);
  let next = bare;
  if (/^\/exams(\/|$)/i.test(next)) next = canonicalExamBare(next);
  else if (/^\/schooling\//i.test(next)) next = canonicalSchoolingBare(next);
  else next = canonicalSlugBare(next);
  const dead = DEAD_PATHS[trimSlash(next)];
  if (dead) next = dead;
  if (next === bare) return null;
  const out = withLocale(prefix, trimSlash(next));
  return out === pathname ? null : out;
}

// ── Back links ───────────────────────────────────────────────────────────

/** Pages whose literal parent is wrong, missing or a redirect. */
const PARENT_OVERRIDES: Readonly<Record<string, string>> = {
  "/dashboard": "/",
  "/admin": "/",
  "/exams": "/",
  "/exams/browse": "/",
  "/exams/entrance": "/",
  "/exams/state": "/exams/browse",
  "/chat": "/dashboard",
  "/login": "/",
  "/logout": "/",
  "/exam-alerts/unsubscribe": "/",
  "/i/dashboard": "/",
  "/i/batches": "/i/dashboard",
  "/i/profile": "/i/dashboard",
};

/** Families whose literal parent has no page (or only redirects), first match wins. */
const PARENT_PATTERNS: readonly (readonly [RegExp, string])[] = [
  [/^\/exams\/([^/]+)\/news\/[^/]+$/, "/exams/$1/archive"],
  [/^\/exams\/([^/]+)\/results\/[^/]+$/, "/exams/$1/updates"],
  [/^\/exams\/([^/]+)\/topics\/[^/]+(?:\/hi)?$/, "/exams/$1/syllabus"],
  [/^\/exams\/([^/]+)\/pyq(?:\/[^/]+)?$/, "/exams/$1"],
  [/^\/exams\/(?:category|after)(?:\/[^/]+)?$/, "/exams/browse"],
  [/^\/exams\/[^/]+$/, "/exams/browse"],
  [/^\/current-affairs\/capsule(?:\/[^/]+)?$/, "/current-affairs"],
  [/^\/colleges\/(?:stream|state)(?:\/[^/]+)?$/, "/colleges"],
  [/^\/for(?:\/.*)?$/, "/"],
  [/^\/worldwide\/test-prep(?:\/[^/]+)?$/, "/worldwide"],
  // 27 Sep 2026 (integration): /scholarships/for has no page (the folder
  // holds only [filter]); its lists belong to the scholarships section.
  [/^\/scholarships\/for(?:\/[^/]+)?$/, "/scholarships"],
  [/^\/(?:u|c|g|share|join|community-vouching)\/[^/]+$/, "/"],
  [/^\/(?:attempts\/[^/]+(?:\/results)?|mocks\/[^/]+)$/, "/dashboard"],
];

/**
 * Where "← Back" goes when there is no in-site history: the page one level up
 * that really renders. /hi and /te twins stay in their language where the
 * parent has a twin. Null only for the home page.
 */
export function inferParent(pathname: string): string | null {
  const path = trimSlash((pathname || "/").split("?")[0].split("#")[0] || "/");
  if (path === "/") return null;
  const { prefix, bare } = splitLocale(path);
  if (prefix) {
    if (bare === "/") return null;
    const p = inferParent(bare);
    return p == null ? null : withLocale(prefix, p);
  }
  const over = PARENT_OVERRIDES[path];
  if (over) return over;
  for (const [re, to] of PARENT_PATTERNS) {
    const m = re.exec(path);
    if (m) return to.replace("$1", m[1] ?? "");
  }
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return `/${parts.join("/")}`;
}

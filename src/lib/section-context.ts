// Section context files and the shared platform description (26 Sep 2026,
// B-machine-crawl).
//
// Shishya is now one smart place to study with independent sections —
// school, entrance exams, government exams, colleges & scholarships,
// careers — but the machine files an AI crawler reads first (context.md,
// llms.txt, llms-full.txt) still described a government-exam site. This
// module holds the pure markdown behind:
//   /context.md               — the whole platform, one block per section
//   /schooling/context.md     — the school section
//   /colleges/context.md      — every college, by stream and by state
//   /scholarships/context.md  — every scholarship, one line each
//   /careers/context.md       — every career guide, plus the jobs pages
// and the computed blocks /llms-full.txt adds for the same sections.
//
// Rules (founder, absolute): every number is computed — a .length of the
// data file, a DB count passed in, or a code constant — never typed; no
// "#1" / "best" / "trusted" / "expert" claims (a NIRF rank prints as
// "rank 1", the ranking body's number, never as a badge); school pages link
// the official books and never copy them; Graduation/PG/PhD is only ever
// "being built". Pure: no DB, no clock — the routes pass the data and the
// as-of day. tests/unit/context-md-sections.test.ts runs these as they are.

import { examKind, isStateCetCode } from "@/lib/exam-kind";
import { schoolContextHonestyLines } from "@/lib/school/context";
import { SCHOOL_HUB_PATH, SCHOOL_STREAMS_PATH } from "@/lib/school/landings";
import {
  CHAPTER_INDEXABLE_MIN_QUESTIONS,
  SCHOOL_BOARDS,
  chapterContentLabel,
  classCounts,
  schoolBoardPath,
  schoolChapterPath,
  schoolClassPath,
  schoolSurfaceCounts,
  type SchoolSurface,
} from "@/lib/school/surface";
import { STATES, stateSlug } from "@/lib/state-info";

export const SITE = "https://shishya.in";

// ── The shared description ──────────────────────────────────────────────
// 26 Sep 2026: mirrors src/lib/site-description.ts; integrator may switch to the import.

/** One-line clause for context.md headers and capsule footers. */
export const PLATFORM_ONE_LINE =
  "Shishya (https://shishya.in) — one smart, free place to study for students in India: school, entrance and government exams, colleges, scholarships and careers.";

/** Short form (default meta description, manifest, OG). */
export const PLATFORM_SHORT =
  "Free, AI-supported practice for students in India: school (CBSE, CISCE), entrance and government exams, colleges, scholarships and careers.";

const SECTIONS_SENTENCE =
  "Shishya (https://shishya.in) is one smart place to study for students in India: a free, AI-supported practice platform with independent sections for school (CBSE/NCERT and CISCE, Classes 1-12), entrance exams (JEE, NEET, CUET, NDA, olympiads), government exams (UPSC, SSC, banking, railways, state PSCs, police, teacher-eligibility tests), colleges and scholarships, and careers.";

/** The number-free form: for when a count cannot be read. */
export function platformDescriptionStatic(indianLanguages: number): string {
  return `${SECTIONS_SENTENCE} Practice questions are written with AI (most have passed an automated answer check), exam dates are marked official, reported or expected, school pages link the official books instead of copying them, and the AI tutor works in English and ${indianLanguages} Indian languages — every study feature is free, with no paywall.`;
}

/** Every number the computed description prints, each from its source. */
export interface PlatformCounts {
  /** prisma.exam.count(REAL_EXAM_WHERE). */
  exams: number;
  /** loadCheckedQuestionCount() — printed floored to hundreds with "+". */
  checkedQuestions: number;
  /** NCERT chapters on the school surface (each links the official book). */
  ncertChapters: number;
  /** Chapters with Shishya's own content (schoolSurfaceCounts().indexableChapters). */
  chaptersWithOurContent: number;
  chaptersWithNotes: number;
  chaptersWithPractice: number;
  /** COLLEGES.length and its NIRF source year. */
  colleges: number;
  nirfYear: number;
  /** SCHOLARSHIP_SCHEMES.length (no aggregator), CAREERS.length. */
  scholarships: number;
  careers: number;
  /** INDIAN_LANGUAGE_COUNT. */
  indianLanguages: number;
}

/** 34,543 → "34,500+"; below 100 the exact number (nothing to floor). */
export function flooredCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  if (n < 100) return String(Math.floor(n));
  return `${(Math.floor(n / 100) * 100).toLocaleString("en-IN")}+`;
}

const fmt = (n: number) => n.toLocaleString("en-IN");

/** The computed description. "notes and checked practice" only when every
 *  such chapter has both; otherwise "notes or checked practice". */
export function platformDescriptionComputed(c: PlatformCounts): string {
  const both = c.chaptersWithNotes === c.chaptersWithOurContent && c.chaptersWithPractice === c.chaptersWithOurContent;
  const ours = `${fmt(c.chaptersWithOurContent)} of them with Shishya's own notes ${both ? "and" : "or"} checked practice`;
  return `${SECTIONS_SENTENCE} It covers ${fmt(c.exams)} entrance and government exams with ${flooredCount(c.checkedQuestions)} practice questions answer-checked by AI before they are shown, mocks, previous-year-pattern sets and exam dates marked official, reported or expected; ${fmt(c.ncertChapters)} NCERT chapters linked to the official books, ${ours}; ${fmt(c.colleges)} colleges from NIRF ${c.nirfYear} rankings, ${fmt(c.scholarships)} scholarships and ${fmt(c.careers)} career guides; and an AI tutor in English and ${c.indianLanguages} Indian languages — every study feature is free, with no paywall.`;
}

/** Computed when every count is known, else the static form. */
export function platformDescription(c: PlatformCounts | null, indianLanguages: number): string {
  return c ? platformDescriptionComputed(c) : platformDescriptionStatic(indianLanguages);
}

/** NCERT chapters on the surface (CISCE has no chapter map). */
export function ncertChapterCount(surface: Pick<SchoolSurface, "classes">): number {
  return schoolSurfaceCounts({ classes: surface.classes.filter((c) => c.curriculum === "NCERT") }).chapters;
}

// ── Entrance vs government ──────────────────────────────────────────────
// 26 Sep 2026: the Entrance section is src/lib/exam-kind.ts's entrance and
// olympiad kinds — the entrance categories, NDA, and the 28 state admission
// tests (STATE_CET_CODES: KCET, MHT-CET, EAMCET, KEAM, WBJEE, POLYCETs …).
// 26 Sep 2026 (repair): this file had its own copy that filed every
// STATE_LEVEL row, CETs included, under Government, so /context.md and
// llms-full.txt said "Entrance exams (34)" and listed KCET as a government
// exam while /exams/entrance lists 62, /exams/state says "28 state entrance
// tests" and each CET hub's Course JSON-LD says "Entrance exam". One rule
// now: exam-kind.ts. State CETs still also sit with their state on
// /exams/state.

export const ENTRANCE_CATEGORIES: readonly string[] = ["ENGINEERING", "MEDICAL", "LAW", "MBA", "UNIVERSITY", "OLYMPIAD"];
export const GOVERNMENT_CATEGORIES: readonly string[] = ["CIVIL_SERVICES", "GOVT_JOBS", "BANKING", "DEFENCE", "TEACHING", "STATE_LEVEL"];

export type ExamSection = "entrance" | "government" | "other";

export function examSection(e: { code: string; category: string }): ExamSection {
  const kind = examKind(e);
  if (kind === "entrance" || kind === "olympiad") return "entrance";
  if (kind === "professional") return "other";
  // examKind calls any unknown category "government"; a machine file keeps
  // an unlisted category under Other rather than guess.
  return GOVERNMENT_CATEGORIES.includes(e.category) ? "government" : "other";
}

/** Heading of the state admission tests inside the Entrance section. */
export const STATE_CET_GROUP_LABEL = "State entrance tests (state CETs)";

/** Human labels for the ExamCategory enum on machine files. */
export const EXAM_CATEGORY_LABELS: Readonly<Record<string, string>> = {
  ENGINEERING: "Engineering entrance",
  MEDICAL: "Medical entrance",
  LAW: "Law entrance",
  MBA: "Management (MBA) entrance",
  UNIVERSITY: "University, design and architecture admission tests",
  OLYMPIAD: "Olympiads",
  CIVIL_SERVICES: "Civil services",
  GOVT_JOBS: "Central government jobs",
  BANKING: "Banking",
  DEFENCE: "Defence",
  TEACHING: "Teaching",
  STATE_LEVEL: "State-level exams",
  OTHER: "Other exams",
};

export function examCategoryLabel(category: string): string {
  return EXAM_CATEGORY_LABELS[category] ?? category.toLowerCase().replace(/_/g, " ").replace(/^./, (x) => x.toUpperCase());
}

/** The heading an exam sits under inside its section. An entrance-door
 *  code whose category is not an entrance category (NDA) gets its own. */
export function examGroupLabel(e: { code: string; category: string }): string {
  if (examSection(e) === "entrance" && !ENTRANCE_CATEGORIES.includes(e.category)) {
    return isStateCetCode(e.code) ? STATE_CET_GROUP_LABEL : "Other entrance exams (after Class 12)";
  }
  return examCategoryLabel(e.category);
}

// ── Languages ───────────────────────────────────────────────────────────

/** English names of the site's locales, computed from their ISO codes. */
export function localeEnglishName(code: string): string {
  if (code === "bn") return "Bengali";
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** "Languages: English and N Indian languages (Hindi, …)" from the locale list. */
export function languagesLine(locales: readonly string[]): string {
  const indian = locales.filter((l) => l !== "en");
  return `Languages: English and ${indian.length} Indian languages (${indian.map(localeEnglishName).join(", ")}).`;
}

// ── Machine files ───────────────────────────────────────────────────────

/** The section context files (exact URLs) and the per-page patterns. */
export const SECTION_CONTEXT_FILES: readonly { path: string; what: string }[] = [
  { path: "/context.md", what: "the whole platform, one block per section" },
  { path: `${SCHOOL_HUB_PATH}/context.md`, what: "School — boards, classes, chapters with Shishya's own notes or practice" },
  { path: "/colleges/context.md", what: "Colleges — every college by stream and by state" },
  { path: "/scholarships/context.md", what: "Scholarships — every scholarship with its official link" },
  { path: "/careers/context.md", what: "Careers — every career guide and the jobs pages" },
];

export const CONTEXT_FILE_PATTERNS: readonly { pattern: string; what: string }[] = [
  { pattern: "/exams/{CODE}/context.md", what: "one exam: pattern, eligibility, dates with their tier, results, syllabus, cutoff guidance" },
  { pattern: "/exams/state/{slug}/context.md", what: "one state's exams and announced dates" },
  { pattern: `${SCHOOL_HUB_PATH}/{board}/class-{n}/context.md`, what: "one school class: subjects, official books, every chapter" },
  { pattern: `${SCHOOL_HUB_PATH}/{board}/class-{n}/{subject}/context.md`, what: "one school subject" },
];

/** Lines listing every context file (exact ones first, then patterns). */
export function contextFileLines(site: string = SITE): string[] {
  return [
    ...SECTION_CONTEXT_FILES.map((f) => `- ${site}${f.path} — ${f.what}`),
    ...CONTEXT_FILE_PATTERNS.map((f) => `- ${site}${f.pattern} — ${f.what}`),
  ];
}

/** Response headers of a context file: markdown, the exam context files'
 *  caching, and an HTTP canonical link back to the HTML page (no noindex —
 *  AI search must still fetch the file). */
export function contextMarkdownHeaders(htmlUrl: string): Record<string, string> {
  return {
    "content-type": "text/markdown; charset=utf-8",
    "cache-control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=86400",
    link: `<${htmlUrl}>; rel="canonical"`,
  };
}

// ── Data shapes (structural: only what the builders read) ──────────────

export interface CollegeLite {
  slug: string;
  name: string;
  city: string;
  state: string;
  type: string;
  streams: readonly string[];
  /** NIRF ranks by key (overall + one per stream); src/lib/colleges-data.ts NirfRanks. */
  nirf: { readonly overall?: number };
}
export interface StreamLite {
  value: string;
  label: string;
}
export interface ScholarshipLite {
  id: string;
  name: string;
  awardingBody: string;
  type: string;
  state: string | null;
  levels: readonly string[];
  eligibility: { categories?: readonly string[]; gender?: "F" | "M" | null };
  applyUrl: string;
  officialSite?: string;
}
export interface CareerLite {
  slug: string;
  name: string;
  category: string;
}
export interface CareerCategoryLite {
  slug: string;
  label: string;
}
export interface CountryLite {
  slug: string;
  name: string;
  universities: readonly { slug: string; name: string }[];
}
export interface TestPrepLite {
  slug: string;
  name: string;
  fullName: string;
}
export interface PersonaLite {
  slug: string;
  pageTitle: string;
}
export interface InsightLite {
  slug: string;
  title: string;
}

const stateName = (code: string | null | undefined) => (code ? (STATES[code]?.name ?? code) : "");

// ── Colleges ────────────────────────────────────────────────────────────

/** "Overall rank 1 · Engineering rank 1" — NIRF's own numbers, no badge. */
export function nirfRankText(nirf: { readonly overall?: number }, streams: readonly StreamLite[]): string {
  const ranks = nirf as Readonly<Record<string, number | undefined>>;
  const bits: string[] = [];
  if (typeof ranks.overall === "number") bits.push(`Overall rank ${ranks.overall}`);
  for (const s of streams) {
    const r = ranks[s.value];
    if (typeof r === "number") bits.push(`${s.label} rank ${r}`);
  }
  return bits.join(" · ");
}

/** Colleges grouped by stream (in the stream list's order) and by state. */
export function groupColleges<C extends CollegeLite>(colleges: readonly C[], streams: readonly StreamLite[]) {
  const byStream = streams.map((s) => ({ stream: s, colleges: colleges.filter((c) => c.streams.includes(s.value)) })).filter((g) => g.colleges.length > 0);
  const stateCodes = [...new Set(colleges.map((c) => c.state))].sort((a, b) => stateName(a).localeCompare(stateName(b)));
  const byState = stateCodes.map((code) => ({ code, name: stateName(code), hasPage: code in STATES, colleges: colleges.filter((c) => c.state === code) }));
  return { byStream, byState };
}

export interface CollegeSource {
  year: number;
  url: string;
}

/** The source line exactly as src/lib/colleges-data.ts states it. */
export function collegeSourceLine(src: CollegeSource): string {
  return `Source: National Institutional Ranking Framework (NIRF) ${src.year}, Ministry of Education, Government of India — ${src.url}. Every rank is from the published ${src.year} list; where a rank is not certain it is left out rather than guessed.`;
}

export function collegesContextMarkdown(colleges: readonly CollegeLite[], streams: readonly StreamLite[], src: CollegeSource, asOf: string, site: string = SITE): string {
  const { byStream, byState } = groupColleges(colleges, streams);
  const L: string[] = [];
  L.push("# Colleges on Shishya — section context");
  L.push("");
  L.push(`> Section page: ${site}/colleges · data as of ${asOf} (IST). Free to cite; link back to the section page. ${PLATFORM_ONE_LINE}`);
  L.push(`> ${collegeSourceLine(src)}`);
  L.push("");
  L.push("## Summary");
  L.push(`- ${colleges.length} colleges · ${byStream.length} streams · ${byState.length} states and union territories`);
  L.push(`- Also: cutoffs ${site}/colleges/cutoffs · placements ${site}/colleges/placements · ITI and diploma ${site}/colleges/iti-diploma · distance learning ${site}/distance-learning · scholarships ${site}/scholarships (context: ${site}/scholarships/context.md)`);
  L.push("");
  L.push(`## By stream (${byStream.length})`);
  for (const g of byStream) {
    L.push(`### ${g.stream.label} — ${site}/colleges/stream/${g.stream.value} (${g.colleges.length})`);
    for (const c of g.colleges) {
      const rank = nirfRankText(c.nirf, streams);
      L.push(`- ${c.name} — ${c.city}, ${stateName(c.state)} — ${c.type}${rank ? ` — NIRF ${src.year}: ${rank}` : ""} — ${site}/colleges/${c.slug}`);
    }
    L.push("");
  }
  L.push(`## By state (${byState.length})`);
  for (const g of byState) {
    const head = g.hasPage ? `${g.name} — ${site}/colleges/state/${stateSlug(g.code)}` : g.name;
    L.push(`### ${head} (${g.colleges.length})`);
    for (const c of g.colleges) L.push(`- ${c.name}: ${site}/colleges/${c.slug}`);
    L.push("");
  }
  L.push("## More on Shishya");
  L.push(`- Platform context: ${site}/context.md · full index for LLMs: ${site}/llms-full.txt`);
  L.push("");
  return L.join("\n");
}

// ── Scholarships ────────────────────────────────────────────────────────

const LEVEL_LABELS: Readonly<Record<string, string>> = {
  CLASS_9_10: "Class 9-10",
  CLASS_11_12: "Class 11-12",
  DIPLOMA: "Diploma",
  UG: "Undergraduate",
  PG: "Postgraduate",
  PHD: "PhD",
};
const TYPE_LABELS: Readonly<Record<string, string>> = {
  CENTRAL: "central government",
  STATE: "state government",
  PRIVATE: "private / foundation",
  EXAM_SPECIFIC: "tied to an entrance exam result",
  MERIT: "merit award",
  RESEARCH: "research fellowship",
};

/** One scholarship: name — provider — levels — scope — our URL — official link. */
export function scholarshipLine(s: ScholarshipLite, site: string = SITE): string {
  const levels = s.levels.map((l) => LEVEL_LABELS[l] ?? l).join(", ");
  const scope = [
    TYPE_LABELS[s.type] ?? s.type.toLowerCase(),
    s.state ? stateName(s.state) : "all India",
    s.eligibility.categories?.length ? `categories: ${s.eligibility.categories.join("/")}` : "",
    s.eligibility.gender === "F" ? "girls only" : s.eligibility.gender === "M" ? "boys only" : "",
  ]
    .filter(Boolean)
    .join("; ");
  return `- ${s.name} — ${s.awardingBody} — ${levels} — ${scope} — ${site}/scholarships/${s.id} — official: ${s.officialSite ?? s.applyUrl}`;
}

export function scholarshipsContextMarkdown(list: readonly ScholarshipLite[], asOf: string, site: string = SITE): string {
  const L: string[] = [];
  L.push("# Scholarships on Shishya — section context");
  L.push("");
  L.push(`> Section page: ${site}/scholarships · eligibility matcher: ${site}/scholarships/match · data as of ${asOf} (IST). Free to cite; link back to the scholarship's page. ${PLATFORM_ONE_LINE}`);
  // 26 Sep 2026 (repair): callers pass SCHOLARSHIP_SCHEMES (src/lib/scholarship-schemes.ts);
  // the catalogue's one outside aggregator is not a scholarship and is not listed.
  L.push("> Each line links the awarding body's own site or official portal; outside aggregators are not listed. Amounts and deadlines change every year: the scholarship page states the typical band and when it usually opens — confirm on the official link before applying.");
  L.push("");
  const national = list.filter((s) => !s.state).length;
  L.push("## Summary");
  L.push(`- ${list.length} scholarships · ${national} all-India · ${list.length - national} for one state`);
  L.push("");
  L.push(`## Every scholarship (${list.length}) — name — provider — levels — scope — Shishya page — official link`);
  for (const s of list) L.push(scholarshipLine(s, site));
  L.push("");
  L.push("## More on Shishya");
  L.push(`- Colleges: ${site}/colleges (context: ${site}/colleges/context.md) · platform context: ${site}/context.md · full index: ${site}/llms-full.txt`);
  L.push("");
  return L.join("\n");
}

// ── Careers ─────────────────────────────────────────────────────────────

/** The jobs pages that sit beside the career guides (one page each). */
export const JOBS_PAGES: readonly { path: string; what: string }[] = [
  { path: "/jobs", what: "jobs and careers hub — government jobs, internships, resume and interview preparation" },
  { path: "/jobs/govt-jobs", what: "major recurring government recruitments — cadence, eligibility, pattern and the official portal" },
  { path: "/jobs/internships", what: "where to find internships in India — government portals and schemes, college placement cells, direct outreach" },
  { path: "/jobs/resume", what: "fresher resume templates, interview questions by role and salary negotiation basics" },
  { path: "/jobs/skill-careers", what: "non-degree, skill-based careers" },
  { path: "/jobs-map", what: "India's government jobs map — Central and State hierarchy" },
];

// 26 Sep 2026: name + URL only — the data file's one-line deks are page
// copy with editorial superlatives ("best-paying", "top-tier"), which a
// machine file must not repeat as fact.
export function careersContextMarkdown(list: readonly CareerLite[], categories: readonly CareerCategoryLite[], asOf: string, site: string = SITE): string {
  const L: string[] = [];
  L.push("# Careers on Shishya — section context");
  L.push("");
  L.push(`> Section page: ${site}/careers · career map: ${site}/career-map · data as of ${asOf} (IST). Free to cite; link back to the career's page. ${PLATFORM_ONE_LINE}`);
  L.push("> Each career page covers what the work is, the entry routes from school, qualifications, skills, salary bands by experience (deliberately wide — real pay depends on city, employer and performance) and honest pros and cons.");
  L.push("");
  const groups = categories.map((c) => ({ cat: c, items: list.filter((x) => x.category === c.slug) })).filter((g) => g.items.length > 0);
  const known = new Set(categories.map((c) => c.slug));
  const uncategorised = list.filter((x) => !known.has(x.category));
  L.push("## Summary");
  L.push(`- ${list.length} career guides in ${groups.length + (uncategorised.length ? 1 : 0)} groups`);
  L.push("");
  for (const g of groups) {
    L.push(`## ${g.cat.label} (${g.items.length})`);
    for (const c of g.items) L.push(`- ${c.name}: ${site}/careers/${c.slug}`);
    L.push("");
  }
  if (uncategorised.length) {
    L.push(`## Other careers (${uncategorised.length})`);
    for (const c of uncategorised) L.push(`- ${c.name}: ${site}/careers/${c.slug}`);
    L.push("");
  }
  L.push("## Jobs pages");
  for (const p of JOBS_PAGES) L.push(`- ${site}${p.path} — ${p.what}`);
  L.push(`- After graduation — postgraduate entrance exams on Shishya: ${site}/post-graduation (a Graduation / PG / PhD section is being built)`);
  L.push("");
  L.push("## More on Shishya");
  L.push(`- Platform context: ${site}/context.md · full index: ${site}/llms-full.txt`);
  L.push("");
  return L.join("\n");
}

// ── School ──────────────────────────────────────────────────────────────

export function schoolSectionContextMarkdown(surface: Pick<SchoolSurface, "classes">, asOf: string, site: string = SITE): string {
  const n = schoolSurfaceCounts(surface);
  const L: string[] = [];
  L.push("# School on Shishya — CBSE (NCERT textbooks) and CISCE (ICSE / ISC), Classes 1-12 — section context");
  L.push("");
  L.push(`> Section page: ${site}${SCHOOL_HUB_PATH} · boards: ${SCHOOL_BOARDS.map((b) => `${site}${schoolBoardPath(b.slug)}`).join(" · ")} · data as of ${asOf} (IST). Free to cite; link back to the section page. ${PLATFORM_ONE_LINE}`);
  L.push(
    "> What this file is: every school class Shishya lists, with its class page and class context file, and the chapters that carry Shishya's own study notes or answer-checked practice. For CBSE, the subjects and textbooks NCERT lists, each chapter linked to NCERT's own PDF; for CISCE, the subjects with the council's official documents (CISCE prescribes syllabuses, not one textbook series, so there is no chapter map).",
  );
  L.push(...schoolContextHonestyLines());
  L.push("");
  L.push("## Summary");
  if (n.classes === 0) {
    L.push("- The school pages could not be read just now; the class context files below list each class.");
  } else {
    L.push(
      `- Boards: ${n.boards} · class pages: ${fmt(n.classes)} · subjects: ${fmt(n.subjects)} · chapters listed: ${fmt(n.chapters)} · with Shishya notes: ${n.chaptersWithNotes} · with answer-checked practice (${CHAPTER_INDEXABLE_MIN_QUESTIONS}+ questions): ${n.chaptersWithPractice}`,
    );
  }
  L.push("");
  for (const b of SCHOOL_BOARDS) {
    const classes = surface.classes.filter((c) => c.boardSlug === b.slug);
    if (classes.length === 0) continue;
    L.push(`## ${b.label} — ${site}${schoolBoardPath(b.slug)} (${classes.length} classes)`);
    for (const c of classes) {
      const cc = classCounts(c);
      const url = `${site}${schoolClassPath(c.boardSlug, c.cls)}`;
      const ours = cc.indexableChapters ? ` · ${cc.indexableChapters} with Shishya notes or practice` : "";
      const chapters = c.curriculum === "NCERT" ? ` · ${cc.chapters} chapters${ours}` : "";
      L.push(`- Class ${c.cls} — ${url} (context: ${url}/context.md) — ${cc.subjects} subjects${chapters}`);
    }
    L.push("");
  }
  const withOurs: string[] = [];
  for (const c of surface.classes) {
    for (const s of c.subjects) {
      for (const ch of s.chapters) {
        if (!ch.indexable) continue;
        withOurs.push(`- ${ch.name} — Class ${c.cls} ${s.name} (${SCHOOL_BOARDS.find((b) => b.slug === c.boardSlug)?.shortName ?? c.boardSlug}) — ${chapterContentLabel(ch)}: ${site}${schoolChapterPath(c.boardSlug, c.cls, s.slug, ch.slug)}`);
      }
    }
  }
  L.push(`## Chapters with Shishya's own notes or practice (${withOurs.length})`);
  L.push(...(withOurs.length ? withOurs : ["- None yet."]));
  L.push("");
  L.push("## More on Shishya");
  L.push(`- Choosing a stream after Class 10: ${site}${SCHOOL_STREAMS_PATH}`);
  L.push(`- Platform context: ${site}/context.md · full index for LLMs (the School block lists every class and subject page): ${site}/llms-full.txt`);
  L.push("");
  return L.join("\n");
}

// ── The platform file ───────────────────────────────────────────────────

export interface PlatformContextInput {
  counts: PlatformCounts | null;
  indianLanguages: number;
  /** Live real exams (null on a failed read). */
  exams: readonly { code: string; category: string; state: string | null }[] | null;
  /** The school surface (null / empty on a failed read). */
  school: Pick<SchoolSurface, "classes"> | null;
  colleges: readonly CollegeLite[];
  streams: readonly StreamLite[];
  nirfYear: number;
  scholarships: readonly ScholarshipLite[];
  careers: readonly CareerLite[];
  countries: readonly CountryLite[];
  testPrep: readonly TestPrepLite[];
  personas: readonly PersonaLite[];
  insights: readonly InsightLite[];
  /** e.g. "Languages: English and N Indian languages (…)." */
  languages: string;
}

export function platformContextMarkdown(p: PlatformContextInput, asOf: string, site: string = SITE): string {
  const L: string[] = [];
  L.push("# Shishya — platform context (context.md)");
  L.push("");
  L.push(`> ${platformDescription(p.counts, p.indianLanguages)}`);
  L.push(
    `> This file: a token-cheap map of Shishya's independent sections — each with its hub page, its computed counts and its own context file. Data as of ${asOf} (IST). Free to cite; link back to ${site}.`,
  );
  L.push(
    "> Honesty: every number here is computed from Shishya's database or data files when this file is built — none is typed. Practice questions are Shishya's own, written with AI, and most have passed an automated answer check; exam dates carry their tier (official, reported or expected); school pages link the official books and never copy them.",
  );
  L.push(`> ${p.languages}`);
  L.push("");

  // School
  const sc = p.school && p.school.classes.length ? schoolSurfaceCounts(p.school) : null;
  L.push("## School — CBSE (NCERT) and CISCE (ICSE / ISC), Classes 1-12");
  L.push(`- Hub: ${site}${SCHOOL_HUB_PATH} · boards: ${SCHOOL_BOARDS.map((b) => `${site}${schoolBoardPath(b.slug)}`).join(" · ")}`);
  if (sc) {
    L.push(
      `- ${fmt(sc.classes)} class pages, ${fmt(sc.subjects)} subjects, ${fmt(sc.chapters)} chapters listed with the official NCERT chapter link; ${sc.indexableChapters} chapter${sc.indexableChapters === 1 ? "" : "s"} with Shishya's own notes or answer-checked practice.`,
    );
  }
  L.push(`- Context: ${site}${SCHOOL_HUB_PATH}/context.md · per class: ${site}${SCHOOL_HUB_PATH}/{board}/class-{n}/context.md`);
  L.push("");

  // Entrance / government / other exams
  const exams = p.exams ?? [];
  const entrance = exams.filter((e) => examSection(e) === "entrance");
  const government = exams.filter((e) => examSection(e) === "government");
  const other = exams.filter((e) => examSection(e) === "other");
  const byLabel = (list: readonly { code: string; category: string }[]) => {
    const m = new Map<string, number>();
    for (const e of list) m.set(examGroupLabel(e), (m.get(examGroupLabel(e)) ?? 0) + 1);
    return [...m].map(([label, n]) => `${label} ${n}`).join(" · ");
  };
  L.push("## Entrance exams — JEE, NEET, CUET, NDA, olympiads");
  L.push(`- Hub: ${site}/exams/entrance · all exams: ${site}/exams/browse`);
  if (p.exams) L.push(`- ${entrance.length} exams: ${byLabel(entrance)}. State entrance tests (state CETs) are grouped at ${site}/exams/entrance#entrance-state-cet and also listed with their state at ${site}/exams/state.`);
  L.push(`- Guides: ${site}/for/engineering-aspirant · ${site}/for/medical-aspirant`);
  L.push(`- Per exam: ${site}/exams/{CODE} (hub: practice, dates and news) and ${site}/exams/{CODE}/context.md`);
  L.push("");
  const states = new Set(government.map((e) => e.state).filter((s): s is string => !!s && s in STATES));
  L.push("## Government exams — UPSC, SSC, banking, railways, state PSCs, police, teacher-eligibility tests");
  L.push(`- Hubs: ${site}/exams/browse · by state: ${site}/exams/state (per state: ${site}/exams/state/{slug}/context.md)`);
  if (p.exams) {
    L.push(`- ${government.length} exams: ${byLabel(government)}; state exams in ${states.size} states and union territories.`);
    if (other.length) L.push(`- ${other.length} other exam${other.length === 1 ? "" : "s"}: ${byLabel(other)}.`);
  }
  L.push(`- Per exam: tracker ${site}/exams/{CODE}/updates (dates marked official, reported or expected) · ${site}/exams/{CODE}/context.md · all-exam calendar ${site}/exam-calendar · results ${site}/results · current affairs ${site}/current-affairs`);
  L.push("");

  // Colleges & scholarships
  const { byStream, byState } = groupColleges(p.colleges, p.streams);
  L.push("## Colleges & scholarships");
  L.push(`- ${p.colleges.length} colleges from NIRF ${p.nirfYear} rankings, in ${byStream.length} streams and ${byState.length} states: ${site}/colleges (context: ${site}/colleges/context.md)`);
  L.push(`- ${p.scholarships.length} scholarships, each linking the awarding body: ${site}/scholarships · eligibility matcher: ${site}/scholarships/match (context: ${site}/scholarships/context.md)`);
  L.push(`- Distance learning: ${site}/distance-learning`);
  L.push("");

  // Careers
  L.push("## Careers");
  L.push(`- ${p.careers.length} career guides: ${site}/careers (context: ${site}/careers/context.md) · career map: ${site}/career-map`);
  L.push(`- Jobs: ${JOBS_PAGES.map((j) => `${site}${j.path}`).join(" · ")}`);
  L.push(`- After graduation: ${site}/post-graduation (a Graduation / PG / PhD section is being built)`);
  L.push("");

  // Study abroad
  const universities = p.countries.reduce((n, c) => n + c.universities.length, 0);
  L.push("## Study abroad");
  L.push(`- ${p.countries.length} countries, ${universities} universities, ${p.testPrep.length} test-prep guides: ${site}/worldwide · education loans: ${site}/worldwide/loans · compare: ${site}/worldwide/compare`);
  L.push("");

  // Guides
  L.push("## Guides for students");
  L.push(`- ${p.personas.length} guides by stage: ${p.personas.map((x) => `${site}/for/${x.slug}`).join(" · ")}`);
  L.push(`- ${p.insights.length} articles: ${site}/insights`);
  L.push("");

  L.push("## Free tools");
  L.push(`- Ask Shishya — free answers, no sign-in: ${site}/ask`);
  L.push(`- Personal coach (day-by-day plan): ${site}/coach · all-India live test every Sunday: ${site}/live-test · which exam suits me: ${site}/find-your-exam`);
  L.push("");

  L.push("## Machine-readable files");
  L.push(`- Summary: ${site}/llms.txt · full index: ${site}/llms-full.txt · sitemap: ${site}/sitemap.xml`);
  L.push(...contextFileLines(site));
  L.push("");
  return L.join("\n");
}

// ── llms-full.txt blocks ────────────────────────────────────────────────

export function collegesLlmsFullLines(colleges: readonly CollegeLite[], streams: readonly StreamLite[], src: CollegeSource, site: string = SITE): string[] {
  const { byStream, byState } = groupColleges(colleges, streams);
  return [
    `## Colleges — ${colleges.length} colleges from NIRF ${src.year} rankings`,
    `> ${site}/colleges · context file: ${site}/colleges/context.md (every college with its URL). ${collegeSourceLine(src)}`,
    `- By stream (${byStream.length}): ${byStream.map((g) => `${g.stream.label} (${g.colleges.length}) ${site}/colleges/stream/${g.stream.value}`).join(" · ")}`,
    `- By state (${byState.length}): ${byState.map((g) => `${g.name} (${g.colleges.length})${g.hasPage ? ` ${site}/colleges/state/${stateSlug(g.code)}` : ""}`).join(" · ")}`,
    `- Cutoffs: ${site}/colleges/cutoffs · placements: ${site}/colleges/placements · ITI and diploma: ${site}/colleges/iti-diploma`,
    "",
  ];
}

export function scholarshipsLlmsFullLines(list: readonly ScholarshipLite[], site: string = SITE): string[] {
  return [
    `## Scholarships — ${list.length} scholarships`,
    `> ${site}/scholarships · eligibility matcher: ${site}/scholarships/match · context file: ${site}/scholarships/context.md. Each links the awarding body's own site; confirm amounts and deadlines there.`,
    ...list.map((s) => `- ${s.name} — ${s.awardingBody}: ${site}/scholarships/${s.id}`),
    "",
  ];
}

export function careersLlmsFullLines(list: readonly CareerLite[], categories: readonly CareerCategoryLite[], site: string = SITE): string[] {
  const L = [`## Careers — ${list.length} career guides`, `> ${site}/careers · career map: ${site}/career-map · context file: ${site}/careers/context.md`];
  for (const c of categories) {
    const items = list.filter((x) => x.category === c.slug);
    if (items.length) L.push(`- ${c.label} (${items.length}): ${items.map((x) => `${x.name} ${site}/careers/${x.slug}`).join(" · ")}`);
  }
  const known = new Set(categories.map((c) => c.slug));
  const rest = list.filter((x) => !known.has(x.category));
  if (rest.length) L.push(`- Other (${rest.length}): ${rest.map((x) => `${x.name} ${site}/careers/${x.slug}`).join(" · ")}`);
  L.push(`- Jobs pages: ${JOBS_PAGES.map((j) => `${site}${j.path}`).join(" · ")}`);
  L.push("");
  return L;
}

export function studyAbroadLlmsFullLines(countries: readonly CountryLite[], testPrep: readonly TestPrepLite[], site: string = SITE): string[] {
  const universities = countries.reduce((n, c) => n + c.universities.length, 0);
  return [
    `## Study abroad — ${countries.length} countries, ${universities} universities, ${testPrep.length} test-prep guides`,
    `> ${site}/worldwide · education loans: ${site}/worldwide/loans · compare countries: ${site}/worldwide/compare`,
    ...countries.map((c) => `- ${c.name} (${c.universities.length} universities): ${site}/worldwide/${c.slug}`),
    `- Test prep: ${testPrep.map((t) => `${t.name} ${site}/worldwide/test-prep/${t.slug}`).join(" · ")}`,
    "",
  ];
}

export function guidesLlmsFullLines(personas: readonly PersonaLite[], insights: readonly InsightLite[], site: string = SITE): string[] {
  return [
    `## Guides for students — ${personas.length} guides by stage, ${insights.length} articles`,
    ...personas.map((p) => `- ${p.pageTitle}: ${site}/for/${p.slug}`),
    `- Articles (${insights.length}): ${site}/insights — ${insights.map((a) => `${site}/insights/${a.slug}`).join(" · ")}`,
    `- Distance learning: ${site}/distance-learning · after graduation (postgraduate entrance exams; a Graduation / PG / PhD section is being built): ${site}/post-graduation`,
    "",
  ];
}

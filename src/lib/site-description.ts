// Shishya's one shared self-description (26 Sep 2026).
//
// Why: on 26 Sep 2026 the founder reimagined Shishya from a government-exam
// site into one free, AI-supported practice platform with independent
// sections — school, entrance exams, government exams, colleges and
// scholarships, careers. Every place the site describes itself (root
// <title> and meta description, Organization JSON-LD, manifest, OG card,
// /about, llms.txt, llms-full.txt, context.md, README) said something
// different, and most still said "India's end-to-end free government exam
// preparation platform … 170+ exams". Search engines and answer engines
// (Google, Bing → ChatGPT search, Gemini, Perplexity) build their idea of a
// site from exactly these strings, so they must agree and they must be true.
//
// Three forms, one set of facts:
//   • SITE_SHORT — 139 characters, for the default meta description, the
//     manifest and the default OG card;
//   • siteDescriptionStatic() — no counts except the language constant
//     (derived from `locales` in src/lib/i18n.ts), for surfaces that cannot
//     read the DB (the synchronous root layout, README, llms.txt);
//     26 Sep 2026 (repair): it said "Practice questions are written with AI
//     and checked before they go live" — false for the 157 validated
//     questions on 55 real exams that carry no answer-check record (validated
//     at insert or in bulk). "most have passed an automated answer check" is
//     true site-wide (34,353 of 34,510 real-exam questions; 190 of 190
//     school) and on every exam (the lowest share was 94%, SZF_IOM); each
//     hub's FAQ states that exam's own split (src/lib/exam-answer-check.ts);
//   • siteDescription(counts) — the computed form: every number is passed
//     in by the caller from the DB or a code constant, never typed here.
//     src/lib/site-description-counts.ts is the loader.
//
// Rules this file keeps (tests/unit/site-description.test.ts pins them):
//   • no typed number (only "Classes 1-12", a fact of the curriculum);
//   • no "#1", "best", "trusted", "expert", "verified by", "admin-validated",
//     and never "all" exams of a kind;
//   • CLAT is not named (it has no exam row); Graduation/PG/PhD is not named
//     (it is only ever described as "being built").
//
// Pure: no DB, no Next imports — safe in the root layout, the footer, the
// manifest, the OG image route and tests.

import { locales } from "@/lib/i18n";
import { INDIAN_LANGUAGE_COUNT } from "@/lib/languages";

export const SITE_NAME = "Shishya";

/** The canonical host. The root layout keeps NEXT_PUBLIC_APP_URL for its
 *  own absolute URLs; entity ids always use this host so every page's
 *  JSON-LD points at the same Organization node. */
export const SITE_URL = "https://shishya.in";

/** The one Organization node id — root layout, JsonLd.tsx, /about. */
export const SITE_ORG_ID = `${SITE_URL}/#organization`;

export const SITE_SLOGAN = "One smart place to study";

export const SITE_TITLE_DEFAULT = "Shishya — free study and practice for school, entrance and government exams in India";

export const SITE_SHORT =
  "Free, AI-supported practice for students in India: school (CBSE, CISCE), entrance and government exams, colleges, scholarships and careers.";

/** One-line clause for context.md headers and capsule footers. */
export const SITE_CLAUSE =
  "Shishya (https://shishya.in) — one smart, free place to study for students in India: school, entrance and government exams, colleges, scholarships and careers.";

/** BCP-47 codes of every language the site serves (English first) — the
 *  same `locales` list every language count is derived from. */
export const SITE_LANGUAGE_CODES: readonly string[] = [...locales];

/** The independent sections, in the order the home page shows its doors.
 *  /exams/entrance is the entrance-exam landing (26 Sep 2026, group C). */
export interface SectionLink {
  label: string;
  href: string;
  /** One honest, number-free line about what the section holds today. */
  blurb: string;
}

export const SECTION_LINKS: readonly SectionLink[] = [
  {
    label: "School",
    href: "/schooling",
    blurb:
      "CBSE/NCERT and CISCE, Classes 1-12: each class and subject with the official books and syllabuses linked, and Shishya's own chapter notes and checked practice where they are ready.",
  },
  {
    label: "Entrance exams",
    href: "/exams/entrance",
    blurb: "JEE, NEET, CUET, NDA and olympiads: mock tests, previous-year-pattern practice, syllabus and exam dates.",
  },
  {
    label: "Government exams",
    href: "/exams/browse",
    blurb:
      "UPSC, SSC, banking, railways, state PSCs, police and teacher-eligibility tests: mock tests, date trackers, cutoff estimates, syllabus and current affairs.",
  },
  {
    label: "Colleges",
    href: "/colleges",
    blurb: "Colleges from the NIRF rankings, by stream and by state, with links to their official sites.",
  },
  {
    label: "Scholarships",
    href: "/scholarships",
    blurb: "Central, state and private scholarships with eligibility and the awarding body's official link.",
  },
  {
    label: "Careers",
    href: "/careers",
    blurb: "Career guides with entry routes and indicative salary bands.",
  },
];

/** The sentence both long forms open with. */
const SECTIONS_SENTENCE =
  "Shishya (https://shishya.in) is one smart place to study for students in India: a free, AI-supported practice platform with independent sections for school (CBSE/NCERT and CISCE, Classes 1-12), entrance exams (JEE, NEET, CUET, NDA, olympiads), government exams (UPSC, SSC, banking, railways, state PSCs, police, teacher-eligibility tests), colleges and scholarships, and careers.";

/** The static two-sentence form. No count except the language constant. */
export function siteDescriptionStatic(indianLanguages: number = INDIAN_LANGUAGE_COUNT): string {
  return (
    `${SECTIONS_SENTENCE} Practice questions are written with AI (most have passed an automated answer check), ` +
    `exam dates are marked official, reported or expected, school pages link the official books instead of copying them, ` +
    `and the AI tutor works in English and ${indianLanguages} Indian languages — every study feature is free, with no paywall.`
  );
}

export interface SiteDescriptionCounts {
  /** Active real exams (REAL_EXAM_WHERE). */
  exams: number;
  /** Validated, not withdrawn questions on a real exam or a school chapter
   *  that the answer-check firewall passed (validatedBy 'factory:%' and
   *  metadata.factoryVerify present). Printed floored to hundreds + "+". */
  checkedQuestions: number;
  /** NCERT chapters on the school surface (each links its official PDF). */
  chapters: number;
  /** School chapters with BOTH Shishya's own notes and a checked practice
   *  quiz — the sentence says "notes and checked practice". */
  chaptersWithNotes: number;
  /** COLLEGES.length (src/lib/colleges-data.ts). */
  colleges: number;
  /** SCHOLARSHIP_SCHEMES.length (src/lib/scholarship-schemes.ts — the
   *  catalogue minus its one outside aggregator). */
  scholarships: number;
  /** CAREERS.length (src/data/careers.ts). */
  careers: number;
  /** INDIAN_LANGUAGE_COUNT (src/lib/languages.ts). */
  indianLanguages: number;
  /** NIRF_SOURCE_YEAR (src/lib/colleges-data.ts); omitted → "NIRF rankings". */
  collegeRankYear?: number;
}

const NUM = new Intl.NumberFormat("en-IN");

/** "34,543" → "34,500+"; below 100 the exact number (nothing to floor). */
export function flooredPlus(n: number): string {
  const v = Math.max(0, Math.floor(n));
  if (v < 100) return NUM.format(v);
  return `${NUM.format(Math.floor(v / 100) * 100)}+`;
}

/** The computed form — every number comes from `counts`. */
export function siteDescription(counts: SiteDescriptionCounts): string {
  const c = counts;
  const withNotes =
    c.chaptersWithNotes > 0
      ? `, ${NUM.format(c.chaptersWithNotes)} of them with Shishya's own notes and checked practice`
      : "";
  const nirf = c.collegeRankYear ? `NIRF ${c.collegeRankYear} rankings` : "NIRF rankings";
  return (
    `${SECTIONS_SENTENCE} ` +
    `It covers ${NUM.format(c.exams)} entrance and government exams with ${flooredPlus(c.checkedQuestions)} practice questions answer-checked by AI before they are shown, ` +
    `mocks, previous-year-pattern sets and exam dates marked official, reported or expected; ` +
    `${NUM.format(c.chapters)} NCERT chapters linked to the official books${withNotes}; ` +
    `${NUM.format(c.colleges)} colleges from ${nirf}, ${NUM.format(c.scholarships)} scholarships and ${NUM.format(c.careers)} career guides; ` +
    `and an AI tutor in English and ${NUM.format(c.indianLanguages)} Indian languages — every study feature is free, with no paywall.`
  );
}

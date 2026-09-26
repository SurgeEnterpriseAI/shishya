// Site-wide search index builder (26 Sep 2026) — PURE. One SearchDoc per page
// Shishya really has: exams (hub; sub-pages come from the facts, never from a
// query), state and category pages, school boards / classes / subjects /
// chapters, colleges and their branch / state / stream pages, scholarships,
// careers, persona pages (list rows only), study-abroad pages, insights and
// the site landings — and, 27 Sep 2026 (wave 2 search), the pages organic
// wave 2 built: the exam category hubs, "exams after {level}", CBSE's
// board-exam hubs, the subject hubs and the scholarship lists, each from its
// family's own route list. The DB-shaped inputs (exams, gates, PYQ years, topic
// notes, the school surface) are read by src/lib/search/index-build.ts
// (server-only) and passed in; the static data is imported here. Tests build
// the same index from a committed fixture.
//
// Every path is built from data (slugs, codes), never from query text. Chapter
// NAMES are indexed as match keys only — no chapter text is read or stored.
// Counts are never typed into titles or subs.

import type { DocKind, ExamFacts, ExamGatesLike, SearchDoc, SearchIndex, SearchSection } from "./types";
import { normaliseTerm } from "./normalize";
import { SEARCH_LANDINGS } from "./landings";
import { scholarshipSub } from "./labels";
import { BRANCH_SYNONYMS, CITY_SYNONYMS, MONTH_NAMES, SCHOLARSHIP_ALIASES } from "./lexicon";
import { STATES, stateSlug } from "@/lib/state-info";
import { ALL_STREAMS, COLLEGES, formatNirfRanks } from "@/lib/colleges-data";
import { COLLEGE_DETAILS } from "@/data/college-details";
import { SCHOLARSHIPS } from "@/data/scholarships";
import { CAREERS, CAREER_CATEGORIES } from "@/data/careers";
import { PERSONAS } from "@/data/personas";
import { TEST_PREP, WORLDWIDE_COUNTRIES } from "@/lib/worldwide-data";
import { INSIGHTS_ARTICLES } from "@/data/insights-articles";
import { BOARDS } from "@/lib/schooling-data";
import { EXAM_DEEP_CONTENT } from "@/data/exam-deep-content";
import { aliasTable, stateWordTable } from "@/lib/exam-aliases";
import { computeExamTags } from "@/lib/exam-tags";
import { ENTRANCE_DOOR_CODES } from "@/lib/home-doors";
// 27 Sep 2026 (wave 2 search): the route lists of the wave's page families
// (a685688) — every page below is one entry of its family's own list.
import { PUBLISHED_LEVELS } from "@/lib/exam-qualification";
import { BOARD_EXAM_HUBS } from "@/data/board-exams";
import { boardExamPath } from "@/lib/board-exams";
import { CLOSING_SOON_DAYS, SCHOLARSHIP_FILTERS } from "@/lib/scholarship-lists";
import { SUBJECT_HUBS, SUBJECT_HUB_ROOT, subjectHubPath } from "@/lib/subject-hubs";

// ── Inputs (what the server loader reads from the DB) ────────────────────

export interface SearchExamRow {
  code: string;
  name: string;
  shortName: string;
  category: string;
  state: string | null;
  candidatesPerYear: number | null;
  live: boolean;
}
export interface SearchSchoolChapterRow {
  code: string;
  name: string;
  orderIdx: number;
  slug: string;
  hasNotes: boolean;
  validatedQuestions: number;
  indexable?: boolean;
}
export interface SearchSchoolSubjectRow {
  code: string;
  name: string;
  slug: string;
  chapters: SearchSchoolChapterRow[];
}
export interface SearchSchoolClassRow {
  boardSlug: string;
  cls: number;
  subjects: SearchSchoolSubjectRow[];
}
export interface SearchTopicRow {
  examCode: string;
  code: string;
  name: string;
}
export interface SearchIndexInputs {
  builtAt: string;
  exams: SearchExamRow[];
  /** loadExamPageGates(); null when the read failed (every gate closed). */
  gates: Record<string, ExamGatesLike> | null;
  pyqYears: Record<string, number[]>;
  /** Exams with at least one topic of usable notes. */
  topicNoteExams: string[];
  /** Topic-note pages (deep tier only). */
  topics: SearchTopicRow[];
  school: { classes: SearchSchoolClassRow[] };
  /** 26 Sep 2026 (G2): months ("YYYY-MM") that have CurrentAffair rows — the
   *  /current-affairs/capsule/{month} pages that render. Optional: absent (the
   *  DB-down fallback, older loaders) means no capsule pages in the index. */
  capsuleMonths?: readonly string[];
  /** 27 Sep 2026 (wave 2 search): the /exams/category/{slug} hubs that render —
   *  at least EXAM_CATEGORY_MIN real exams by the page's own rule
   *  (src/lib/exam-categories.ts liveExamCategories) — with the page's noun.
   *  Optional: absent (the DB-down fallback) means no hub in the index. */
  categoryHubs?: readonly { slug: string; noun: string }[];
  /** 27 Sep 2026 (wave 2 search): the /subjects/{slug} hubs that render
   *  (src/lib/subject-hubs.ts subjectHubIndexRows — the list /subjects shows).
   *  Optional: absent means no subject hub in the index. */
  subjectHubs?: readonly string[];
}

export const GATES_ALL_CLOSED: ExamGatesLike = { cutoff: false, syllabus: false, tricks: false, guide: false, buildMock: false };
/** Validated questions a chapter needs to be indexable without notes (src/lib/school/scope.ts SCHOOL_GUEST_QUIZ_MIN). */
const CHAPTER_PRACTICE_MIN = 5;

// ── Helpers ──────────────────────────────────────────────────────────────

function uniqTerms(xs: readonly (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const x of xs) {
    if (!x) continue;
    const n = normaliseTerm(x);
    if (n) out.add(n);
  }
  return [...out];
}
/** "Karnataka Administrative Service (KAS) Prelims" → ["Karnataka Administrative Service Prelims", "KAS"].
 *  A bracketed state name ("(Bihar)") is not a name of its own — it would make
 *  the page an exact match for the bare state word — and neither is a word
 *  `skip` rejects (a conducting body several exams share, "(SSC)"). */
function nameParts(name: string, skip?: (inner: string) => boolean): string[] {
  const inner = [...name.matchAll(/\(([^)]+)\)/g)]
    .map((m) => m[1])
    .filter((p) => !stateNameTerms().has(normaliseTerm(p)) && !skip?.(normaliseTerm(p)));
  const outer = name.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  return [outer, ...inner];
}
let stateNames: Set<string> | null = null;
function stateNameTerms(): ReadonlySet<string> {
  stateNames ??= new Set([
    ...Object.values(STATES).flatMap((s) => [normaliseTerm(s.name), normaliseTerm(s.hindiName), normaliseTerm(s.nativeName)]),
    ...stateWordTable().map(([w]) => normaliseTerm(w)),
  ]);
  return stateNames;
}
const slugWords = (slug: string) => slug.replace(/[-_]+/g, " ");
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const round2 = (x: number) => Math.round(x * 100) / 100;

const ENTRANCE_TAGS = new Set(["engineering", "medical", "law", "mba", "university", "olympiad", "polytechnic"]);
function examSection(e: SearchExamRow): SearchSection {
  if ((ENTRANCE_DOOR_CODES as readonly string[]).includes(e.code)) return "entrance";
  const tags = computeExamTags({ code: e.code, category: e.category, state: e.state, candidatesPerYear: e.candidatesPerYear });
  return tags.some((t) => ENTRANCE_TAGS.has(t)) ? "entrance" : "government";
}

const CATEGORY_DOCS: Readonly<Record<string, { title: string; section: SearchSection; terms: string[] }>> = {
  BANKING: { title: "Banking exams", section: "government", terms: ["banking", "banking exams", "bank exams", "bank jobs", "बैंक परीक्षा", "బ్యాంక్ పరీక్షలు"] },
  TEACHING: { title: "Teaching exams", section: "government", terms: ["teaching", "teaching exams", "teacher exams", "teacher", "teachers", "tet exams", "शिक्षक भर्ती", "టీచర్ పరీక్షలు"] },
  ENGINEERING: { title: "Engineering entrance exams", section: "entrance", terms: ["engineering entrance", "engineering exams", "engineering", "btech entrance", "इंजीनियरिंग प्रवेश परीक्षा"] },
  MEDICAL: { title: "Medical entrance exams", section: "entrance", terms: ["medical entrance", "medical exams", "medical", "mbbs entrance", "मेडिकल प्रवेश परीक्षा"] },
  LAW: { title: "Law entrance exams", section: "entrance", terms: ["law entrance", "law exams", "law", "llb entrance"] },
  MBA: { title: "MBA entrance exams", section: "entrance", terms: ["mba entrance", "mba exams", "management entrance"] },
  CIVIL_SERVICES: { title: "Civil services exams", section: "government", terms: ["civil services exams", "civil service", "ias exam", "प्रशासनिक सेवा"] },
  GOVT_JOBS: { title: "Central government job exams", section: "government", terms: ["central government jobs", "central govt jobs", "government jobs", "govt jobs", "sarkari naukri", "सरकारी नौकरी", "ప్రభుత్వ ఉద్యోగాలు"] },
  OLYMPIAD: { title: "Olympiads", section: "entrance", terms: ["olympiad", "olympiads", "olympiad exams", "ओलंपियाड", "ఒలింపియాడ్"] },
  UNIVERSITY: { title: "University and design entrance exams", section: "entrance", terms: ["university entrance", "design entrance", "university exams"] },
};

// ── Wave 2 page families (27 Sep 2026) ───────────────────────────────────
// The words students use for each family's pages, beside the names built from
// the family's own data (a hub's noun, a level's tags, a subject's keywords).

/** The /exams/browse?category= filter a category hub covers: while that hub
 *  renders it carries the category's words, and the filter (robots-blocked
 *  — "/exams/browse?*") keeps none of its own. */
export const CATEGORY_HUB: Readonly<Record<string, string>> = {
  BANKING: "banking", TEACHING: "teaching", ENGINEERING: "engineering-entrance", LAW: "law-entrance", MEDICAL: "medical-entrance", MBA: "management-entrance",
};
const HUB_WORDS: Readonly<Record<string, readonly string[]>> = {
  banking: ["bank exam", "banking jobs"],
  railway: ["railway exam", "railway jobs", "rrb exams", "रेलवे परीक्षा", "రైల్వే పరీక్షలు"],
  ssc: ["all ssc exams", "ssc exam list"],
  // Not a bare "police": beside a state ("ap police", "bihar police") it would tie the state's own exam.
  police: ["police exam", "police bharti", "police recruitment", "police jobs", "पुलिस भर्ती", "पुलिस परीक्षा", "పోలీస్ ఉద్యోగాలు", "పోలీస్ పరీక్షలు"],
  teaching: ["teacher recruitment exams", "tet exam list", "शिक्षक पात्रता परीक्षा"],
  defence: ["defence exam", "defense exams", "defence jobs"],
  "state-psc": ["state psc", "psc exams", "state public service commission exams", "राज्य लोक सेवा आयोग"],
  "upsc-civil-services": ["upsc exams", "all upsc exams"],
  "engineering-entrance": ["engineering entrance exam", "b tech entrance exams"],
  "medical-entrance": ["medical entrance exam"],
  "law-entrance": ["law entrance exam", "llb entrance exams"],
  "management-entrance": ["mba entrance exam"],
  "design-entrance": ["design entrance", "design exams"],
};
/** A qualification tag as students write it ("exams after 12th", "exams after iti"). */
const LEVEL_TAG_WORD: Readonly<Record<string, string>> = { "10TH": "10th", ITI: "iti", "12TH": "12th", DIPLOMA: "diploma", GRADUATE: "graduation" };
const AFTER_LEVEL_WORDS: Readonly<Record<string, readonly string[]>> = {
  "10th": ["exams after class 10", "10वीं के बाद परीक्षा", "10వ తరగతి తర్వాత పరీక్షలు"],
  "12th": ["exams after class 12", "exam after class 12", "exams after inter", "12वीं के बाद परीक्षा", "ఇంటర్ తర్వాత పరీక్షలు"],
  graduation: ["exams after degree", "exams for graduates", "ग्रेजुएशन के बाद परीक्षा", "డిగ్రీ తర్వాత పరీక్షలు"],
};
const SUBJECT_HUB_WORDS: Readonly<Record<string, readonly string[]>> = {
  reasoning: ["logical reasoning", "रीजनिंग", "तर्कशक्ति", "రీజనింగ్"],
  "quantitative-aptitude": ["quant", "मात्रात्मक योग्यता", "क्वांट"],
  "general-awareness": ["gk", "general knowledge", "general awareness", "सामान्य ज्ञान", "జనరల్ నాలెడ్జ్"],
  "child-development-pedagogy": ["cdp", "child development", "bal vikas", "बाल विकास", "बाल विकास एवं शिक्षाशास्त्र"],
};
/** "phd" is also a being-built degree word (lexicon.ts BEING_BUILT_ALWAYS): only the whole name opens the list. */
const SCHOLARSHIP_LIST_WORDS: Readonly<Record<string, readonly string[]>> = {
  phd: ["phd scholarship", "phd scholarships", "phd fellowship", "phd fellowships", "research fellowship"],
};
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const COUNTRY_ALIASES: Readonly<Record<string, readonly string[]>> = {
  us: ["usa", "america", "united states", "us"], uk: ["united kingdom", "england", "britain", "uk"], ca: ["canada"], au: ["australia"],
  de: ["germany"], ie: ["ireland"], sg: ["singapore"], nz: ["new zealand"], fr: ["france"], nl: ["netherlands", "holland"],
};

const PERSONA_SECTION: Readonly<Record<string, SearchSection>> = {
  "class-10-student": "school", "engineering-aspirant": "entrance", "medical-aspirant": "entrance", "commerce-humanities-after-class-12": "college",
  "government-job-aspirant": "government", "banking-aspirant": "government", "civil-services-aspirant": "government", "after-graduation-pg-options": "college",
};

const BOARD_LABEL: Readonly<Record<string, string>> = { cbse: "CBSE (NCERT)", "icse-cisce": "CISCE (ICSE / ISC)" };

/** Inverted exam aliases: exam code → alias keys that name it (codes are prefixes). */
function aliasKeysByCode(codes: readonly string[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [key, hit] of aliasTable()) {
    for (const prefix of hit.codes ?? []) {
      for (const code of codes) {
        if (!code.startsWith(prefix)) continue;
        const list = out.get(code) ?? [];
        list.push(key);
        out.set(code, list);
      }
    }
  }
  return out;
}
function aliasKeysByCategory(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [key, hit] of aliasTable()) {
    if (!hit.category || (hit.codes && hit.codes.length > 0)) continue;
    out.set(hit.category, [...(out.get(hit.category) ?? []), key]);
  }
  return out;
}

/** College terms with their older city names ("IIT Madras" ↔ "IIT Chennai"). */
function withCitySynonyms(terms: readonly string[]): string[] {
  const out = new Set(terms);
  for (const t of terms) {
    for (const [a, b] of CITY_SYNONYMS) {
      const re = (w: string) => new RegExp(`(^| )${w}( |$)`);
      if (re(a).test(t)) out.add(t.replace(re(a), `$1${b}$2`));
      if (re(b).test(t)) out.add(t.replace(re(b), `$1${a}$2`));
    }
  }
  return [...out];
}

// ── Builder ──────────────────────────────────────────────────────────────

export function buildSearchIndex(inputs: SearchIndexInputs, tier: "lite" | "deep"): SearchIndex {
  const docs: SearchDoc[] = [];
  const exams: Record<string, ExamFacts> = {};
  const push = (d: SearchDoc) => docs.push(d);

  // Exams.
  const codes = inputs.exams.map((e) => e.code);
  const aliasKeys = aliasKeysByCode(codes);
  const maxCand = Math.max(1, ...inputs.exams.map((e) => e.candidatesPerYear ?? 0));
  const deepBy = new Map(EXAM_DEEP_CONTENT.map((c) => [c.examCode, c]));
  const topicNoteSet = new Set(inputs.topicNoteExams);
  const examByCode = new Map(inputs.exams.map((e) => [e.code, e]));
  const examSectionBy = new Map<string, SearchSection>();
  // A bracketed word that is another exam's name and not this one's ("Delhi
  // Police Constable (SSC)", "MP RAEO … (MPESB)") names the conducting body,
  // not this exam — it is not added as an exact name.
  const shortTok = new Map<string, number>();
  for (const e of inputs.exams) for (const t of new Set(normaliseTerm(e.shortName).split(" "))) shortTok.set(t, (shortTok.get(t) ?? 0) + 1);
  for (const e of inputs.exams) {
    const own = new Set(normaliseTerm(e.shortName).split(" "));
    const shared = (inner: string) => inner.split(" ").some((t) => !own.has(t) && (shortTok.get(t) ?? 0) >= 1);
    const deep = deepBy.get(e.code);
    exams[e.code] = {
      gates: inputs.gates?.[e.code] ?? GATES_ALL_CLOSED,
      pyqYears: [...(inputs.pyqYears[e.code] ?? [])].map(Number).filter((y) => Number.isInteger(y)).sort((a, b) => a - b),
      topicNotes: topicNoteSet.has(e.code),
      deep: { eligibility: Boolean(deep?.eligibility), salary: Boolean(deep?.salaryBands && deep.salaryBands.length > 0) },
      live: e.live,
      category: e.category,
    };
    const section = examSection(e);
    examSectionBy.set(e.code, section);
    const stateName = e.state ? STATES[e.state]?.name : null;
    push({
      id: `exam:${e.code}`,
      kind: "exam",
      section,
      title: e.shortName,
      sub: e.name !== e.shortName ? e.name : (stateName ?? e.name),
      path: `/exams/${e.code}`,
      terms: uniqTerms([e.shortName, e.name, ...nameParts(e.name, shared), ...nameParts(e.shortName, shared), e.code.replace(/_/g, " "), ...(aliasKeys.get(e.code) ?? [])]),
      weight: e.candidatesPerYear ? round2(clamp01(Math.log10(1 + e.candidatesPerYear) / Math.log10(1 + maxCand))) : 0.1,
      examCode: e.code,
      state: e.state,
    });
  }

  // Exam state pages (states that have exams).
  const examStates = [...new Set(inputs.exams.map((e) => e.state).filter((s): s is string => Boolean(s && STATES[s])))].sort();
  for (const code of examStates) {
    const s = STATES[code];
    push({
      id: `exam-state:${code}`,
      kind: "exam-state",
      section: "government",
      title: `${s.name} exams`,
      sub: `Exams by state · ${s.name}`,
      path: `/exams/state/${stateSlug(code)}`,
      terms: uniqTerms([
        // Other spellings ("orissa", "bengal", "ఆంధ్ర") are read by the query parser as the state itself.
        s.name, s.hindiName, /[a-z]/i.test(s.nativeName) ? null : s.nativeName,
      ]),
      weight: 0.5,
      state: code,
    });
  }

  // Exam categories (/exams/browse?category=X) present in the catalogue.
  // 27 Sep 2026 (wave 2 search): a category a live hub covers (CATEGORY_HUB)
  // gives its words to the hub below; its robots-blocked filter stays in the
  // index with no words, so a pasted or AI-written filter link is still known
  // but no typed search opens it ("banking" opens /exams/category/banking).
  const catAliases = aliasKeysByCategory();
  const cats = new Set(inputs.exams.map((e) => e.category));
  const liveHubs = new Map((inputs.categoryHubs ?? []).filter((h) => /^[a-z]+(-[a-z]+)*$/.test(h.slug) && h.noun.trim()).map((h) => [h.slug, h.noun.trim()]));
  const categoryWords = (cat: string) => [...CATEGORY_DOCS[cat].terms, ...(catAliases.get(cat) ?? [])];
  for (const [cat, meta] of Object.entries(CATEGORY_DOCS)) {
    if (!cats.has(cat)) continue;
    push({
      id: `exam-category:${cat}`,
      kind: "exam-category",
      section: meta.section,
      title: meta.title,
      sub: "Browse exams in this category",
      path: `/exams/browse?category=${cat}`,
      terms: liveHubs.has(CATEGORY_HUB[cat] ?? "") ? [] : uniqTerms(categoryWords(cat)),
      weight: 0.5,
    });
  }
  // The category hubs (/exams/category/{slug}) the loader says render — the
  // same kind as the filters they replace, so an exam-page word beside a
  // category ("primary teacher ka test") ranks the hub as it ranked the filter.
  // Ids: the hub's lower-case slug, never a DB category's upper-case name.
  for (const [slug, noun] of liveHubs) {
    const covered = Object.keys(CATEGORY_HUB).filter((cat) => CATEGORY_HUB[cat] === slug && cats.has(cat));
    push({
      id: `exam-category:${slug}`,
      kind: "exam-category",
      section: slug.endsWith("-entrance") ? "entrance" : "government",
      title: capitalise(noun),
      sub: "Compared in one table: next exam day, age limit and official site",
      path: `/exams/category/${slug}`,
      terms: uniqTerms([noun, `${noun} in india`, ...(HUB_WORDS[slug] ?? []), ...covered.flatMap(categoryWords)]),
      weight: 0.5,
    });
  }

  // School boards (/schooling/{slug}).
  for (const b of BOARDS) {
    push({
      id: `school-board:${b.slug}`,
      kind: "school-board",
      section: "school",
      title: b.shortName,
      sub: b.name,
      path: `/schooling/${b.slug}`,
      terms: uniqTerms([b.shortName, b.name, slugWords(b.slug), `${b.shortName} board`]),
      weight: b.slug === "cbse" ? 0.9 : b.slug === "icse-cisce" ? 0.7 : 0.3,
      board: b.slug,
      state: b.state,
    });
  }

  // School classes, subjects and chapters (the DB spine through the surface loader).
  for (const c of inputs.school.classes) {
    const boardLabel = BOARD_LABEL[c.boardSlug] ?? c.boardSlug;
    const classPath = `/schooling/${c.boardSlug}/class-${c.cls}`;
    push({
      id: `school-class:${c.boardSlug}:${c.cls}`,
      kind: "school-class",
      section: "school",
      title: `Class ${c.cls}`,
      sub: boardLabel,
      path: classPath,
      terms: uniqTerms([`class ${c.cls}`, `${c.boardSlug === "cbse" ? "ncert" : "icse"} class ${c.cls}`]),
      // CBSE (NCERT) is the default board: on a tie it lists first.
      weight: c.boardSlug === "cbse" ? 0.4 : 0.3,
      board: c.boardSlug,
      cls: c.cls,
    });
    for (const s of c.subjects) {
      const subjectPath = `${classPath}/${s.slug}`;
      push({
        id: `school-subject:${c.boardSlug}:${c.cls}:${s.slug}`,
        kind: "school-subject",
        section: "school",
        title: s.name,
        sub: `Class ${c.cls} · ${boardLabel}`,
        path: subjectPath,
        terms: uniqTerms([s.name, ...nameParts(s.name)]),
        weight: c.boardSlug === "cbse" ? 0.2 : 0.15,
        board: c.boardSlug,
        cls: c.cls,
        subjectSlug: s.slug,
      });
      for (const ch of s.chapters) {
        const chapterNo = ch.orderIdx % 100;
        const book = Math.floor(ch.orderIdx / 100);
        const ready = ch.indexable ?? (ch.hasNotes || ch.validatedQuestions >= CHAPTER_PRACTICE_MIN);
        push({
          id: `school-chapter:${c.boardSlug}:${c.cls}:${s.slug}:${ch.slug}`,
          kind: "school-chapter",
          section: "school",
          title: ch.name,
          sub: `Class ${c.cls} ${s.name} · Chapter ${chapterNo}`,
          path: `${subjectPath}/${ch.slug}`,
          terms: uniqTerms([ch.name]),
          weight: 0.1,
          status: ready ? "ready" : "book-only",
          board: c.boardSlug,
          cls: c.cls,
          subjectSlug: s.slug,
          chapterNo,
          book,
        });
      }
    }
  }

  // Topic-note pages (deep tier only).
  if (tier === "deep") {
    for (const t of inputs.topics) {
      const e = examByCode.get(t.examCode);
      if (!e) continue;
      push({
        id: `topic-note:${t.examCode}:${t.code}`,
        kind: "topic-note",
        section: examSectionBy.get(t.examCode) ?? "government",
        title: t.name,
        sub: `${e.shortName} · topic notes`,
        path: `/exams/${t.examCode}/topics/${t.code}`,
        terms: uniqTerms([t.name]),
        weight: 0.05,
        examCode: t.examCode,
        state: e.state,
        status: "ready",
      });
    }
  }

  // Colleges and their branch pages.
  const collegeBySlug = new Map(COLLEGES.map((c) => [c.slug, c]));
  for (const c of COLLEGES) {
    const best = Math.min(...Object.values(c.nirf).filter((n): n is number => typeof n === "number"), 200);
    push({
      id: `college:${c.slug}`,
      kind: "college",
      section: "college",
      title: c.shortName,
      sub: formatNirfRanks(c.nirf) || `${c.city} · ${c.type}`,
      path: `/colleges/${c.slug}`,
      terms: withCitySynonyms(uniqTerms([c.shortName, c.name, ...nameParts(c.name), slugWords(c.slug)])),
      weight: round2(clamp01(1 - best / 120)),
      state: c.state,
    });
  }
  for (const d of COLLEGE_DETAILS) {
    const c = collegeBySlug.get(d.collegeSlug);
    if (!c) continue;
    for (const b of d.branches) {
      const syn = BRANCH_SYNONYMS[b.slug] ?? [];
      push({
        id: `college-branch:${d.collegeSlug}:${b.slug}`,
        kind: "college-branch",
        section: "college",
        title: `${c.shortName} ${b.shortName}`,
        sub: `${b.degree} ${b.name}`,
        path: `/colleges/${d.collegeSlug}/${b.slug}`,
        terms: withCitySynonyms(uniqTerms([`${c.shortName} ${b.shortName}`, `${c.shortName} ${b.name}`, ...syn.map((w) => `${c.shortName} ${w}`)])),
        weight: 0.3,
        state: c.state,
      });
    }
  }
  const collegeStates = [...new Set(COLLEGES.map((c) => c.state))].filter((s) => STATES[s]).sort();
  for (const code of collegeStates) {
    const s = STATES[code];
    push({
      id: `college-state:${code}`,
      kind: "college-state",
      section: "college",
      title: `Colleges in ${s.name}`,
      sub: `NIRF-ranked colleges · ${s.name}`,
      path: `/colleges/state/${stateSlug(code)}`,
      terms: uniqTerms([`colleges in ${s.name}`]),
      weight: 0.4,
      state: code,
    });
  }
  for (const st of ALL_STREAMS) {
    push({
      id: `college-stream:${st.value}`,
      kind: "college-stream",
      section: "college",
      title: `${st.label} colleges`,
      sub: "NIRF-ranked colleges in this stream",
      path: `/colleges/stream/${st.value}`,
      terms: uniqTerms([`${st.label} colleges`, `${st.value} colleges`, `top ${st.value} colleges`, `best ${st.value} colleges`, `${st.value} college`]),
      weight: 0.4,
    });
  }

  // Scholarships.
  for (const s of SCHOLARSHIPS) {
    const gender = s.eligibility.gender ?? null;
    push({
      id: `scholarship:${s.id}`,
      kind: "scholarship",
      section: "college",
      title: s.name,
      sub: scholarshipSub(s.type, s.state ? (STATES[s.state]?.name ?? null) : null, s.levels, gender),
      path: `/scholarships/${s.id}`,
      // + SCHOLARSHIP_ALIASES (26 Sep 2026, search fixer): "post matric scholarship sc st" names the NSP scheme.
      terms: uniqTerms([s.name, ...nameParts(s.name), slugWords(s.id), ...(SCHOLARSHIP_ALIASES[s.id] ?? [])]),
      soft: uniqTerms(s.tags.map(slugWords)),
      weight: 0.3,
      state: s.state,
      scholarship: { gender, state: s.state, levels: [...s.levels], categories: [...(s.eligibility.categories ?? [])], type: s.type },
    });
  }

  // Careers.
  const catLabel = new Map(CAREER_CATEGORIES.map((c) => [c.slug, c.label]));
  for (const c of CAREERS) {
    push({
      id: `career:${c.slug}`,
      kind: "career",
      section: "careers",
      title: c.name,
      sub: catLabel.get(c.category) ?? "Career",
      path: `/careers/${c.slug}`,
      terms: uniqTerms([c.name, ...nameParts(c.name), ...c.name.split(/\s*\/\s*/), slugWords(c.slug)]),
      soft: uniqTerms(c.keywords),
      weight: 0.4,
    });
  }

  // Persona pages: list rows only, never a direct open (the /for/ journey pages were retired from home).
  for (const p of PERSONAS) {
    push({
      id: `persona:${p.slug}`,
      kind: "persona",
      section: PERSONA_SECTION[p.slug] ?? "more",
      title: p.pageTitle,
      sub: p.label,
      path: `/for/${p.slug}`,
      terms: uniqTerms([p.label, p.pageTitle]),
      weight: 0.1,
      listOnly: true,
    });
  }

  // Study abroad.
  for (const c of WORLDWIDE_COUNTRIES) {
    push({
      id: `abroad-country:${c.slug}`,
      kind: "abroad-country",
      section: "more",
      title: `Study in ${c.name}`,
      sub: "Universities, visa, costs and work rights for Indian students",
      path: `/worldwide/${c.slug}`,
      terms: uniqTerms([c.name, ...(COUNTRY_ALIASES[c.slug] ?? [])]),
      weight: 0.3,
    });
    for (const u of c.universities) {
      push({
        id: `abroad-university:${c.slug}:${u.slug}`,
        kind: "abroad-university",
        section: "more",
        title: u.name,
        sub: `${u.location} · ${c.name}`,
        path: `/worldwide/${c.slug}/${u.slug}`,
        terms: uniqTerms([u.name, ...nameParts(u.name), slugWords(u.slug)]),
        weight: 0.2,
      });
    }
  }
  for (const t of TEST_PREP) {
    push({
      id: `abroad-test:${t.slug}`,
      kind: "abroad-test",
      section: "more",
      title: t.name,
      sub: t.fullName,
      path: `/worldwide/test-prep/${t.slug}`,
      terms: uniqTerms([t.name, t.fullName, t.slug]),
      weight: 0.3,
    });
  }

  // Insights.
  for (const a of INSIGHTS_ARTICLES) {
    push({
      id: `insight:${a.slug}`,
      kind: "insight",
      section: "more",
      title: a.title,
      sub: `Insight · ${a.publishedOn}`,
      path: `/insights/${a.slug}`,
      terms: uniqTerms([a.title]),
      soft: uniqTerms(a.tags),
      weight: 0.1,
    });
  }

  // Site landings.
  for (const l of SEARCH_LANDINGS) {
    push({
      id: `landing:${l.path}`,
      kind: "landing",
      section: l.section,
      title: l.title,
      sub: l.sub,
      path: l.path,
      terms: uniqTerms(l.terms),
      weight: 0.5,
    });
  }

  // Monthly current-affairs capsules (26 Sep 2026, G2): one landing per month the
  // loader says has rows (the capsule page 404s on an empty month). Title and
  // match keys come from the month alone — no count, no claim about the content.
  const months = [...new Set(inputs.capsuleMonths ?? [])].filter((m) => /^[0-9]{4}-(0[1-9]|1[0-2])$/.test(m)).sort();
  for (const m of months) {
    const [y, mo] = m.split("-").map(Number);
    const name = MONTH_NAMES[mo - 1];
    push({
      id: `landing:/current-affairs/capsule/${m}`,
      kind: "landing",
      section: "government",
      title: `Current affairs capsule — ${name} ${y}`,
      sub: "The month's current affairs on one page",
      path: `/current-affairs/capsule/${m}`,
      terms: uniqTerms([`current affairs ${name} ${y}`, `${name} ${y} current affairs`, `current affairs capsule ${name} ${y}`, `${name} current affairs ${y}`]),
      weight: 0.3,
    });
  }

  // ── Wave 2 page families (27 Sep 2026) ──
  // Exams after a qualification: every published level renders
  // (src/lib/exam-qualification.ts; postgraduation is held and never listed).
  for (const l of PUBLISHED_LEVELS) {
    const words = l.tags.map((t) => LEVEL_TAG_WORD[t]).filter(Boolean);
    push({
      id: `landing:/exams/after/${l.slug}`,
      kind: "landing",
      section: "government",
      title: `Exams after ${l.afterTitle}`,
      sub: `Government and entrance exams whose lowest qualification is ${l.qualification}`,
      path: `/exams/after/${l.slug}`,
      // "12th pass exams", "exam after 12th", "entrance exams after 12th" are read as a stage
      // (resolve.ts afterLevelDoc); these are the names a stage rule cannot see.
      terms: uniqTerms([
        ...words.flatMap((w) => [`exams after ${w}`, `government exams after ${w}`, `govt exams after ${w}`, `competitive exams after ${w}`]),
        ...(AFTER_LEVEL_WORDS[l.slug] ?? []),
      ]),
      weight: 0.5,
    });
  }
  // CBSE's board-exam hubs: one per hub the data file holds (src/data/board-exams.ts).
  for (const h of BOARD_EXAM_HUBS) {
    const path = boardExamPath(h);
    const board = h.board.toUpperCase();
    push({
      id: `landing:${path}`,
      kind: "landing",
      section: "school",
      title: `${board} Class ${h.cls} board exam ${h.examYear}`,
      sub: h.samplePapers.papers.length > 0 ? `${board}'s own ${h.session} sample papers and marking schemes, linked` : `${board}'s own links for the ${h.examYear} board exam`,
      path,
      // Sample paper, marking scheme, date sheet and board-exam asks are read by resolve.ts boardExamHubs.
      terms: uniqTerms([`${board} Class ${h.cls} board exam ${h.examYear}`, `class ${h.cls} board exam`]),
      weight: 0.5,
    });
  }
  // Subject hubs: the ones the loader says render, and their index page.
  const subjectSlugs = new Set(inputs.subjectHubs ?? []);
  const subjectDefs = SUBJECT_HUBS.filter((d) => subjectSlugs.has(d.slug));
  for (const d of subjectDefs) {
    push({
      id: `landing:${subjectHubPath(d.slug)}`,
      kind: "landing",
      section: "government",
      title: `${d.name} across exams`,
      sub: "Its topics grouped across the exams that test it, linked to each exam's topic page",
      path: subjectHubPath(d.slug),
      terms: uniqTerms([d.name, ...d.keywords, ...(SUBJECT_HUB_WORDS[d.slug] ?? [])]),
      weight: 0.5,
    });
  }
  if (subjectDefs.length > 0) {
    push({
      id: `landing:${SUBJECT_HUB_ROOT}`,
      kind: "landing",
      section: "government",
      title: "Subjects across exams",
      sub: "Each subject's topics, mapped to the exams that test them",
      path: SUBJECT_HUB_ROOT,
      terms: uniqTerms(["subjects across exams", "competitive exam subjects"]),
      weight: 0.3,
    });
  }
  // Scholarship lists: every filter renders (src/lib/scholarship-lists.ts; noindex until each row is reviewed — real pages for people).
  for (const f of SCHOLARSHIP_FILTERS) {
    push({
      id: `landing:/scholarships/for/${f.slug}`,
      kind: "landing",
      section: "college",
      title: `Scholarships for ${f.audienceTitle}`,
      sub: "One list with amounts and apply links",
      path: `/scholarships/for/${f.slug}`,
      // A one-filter scholarship ask ("scholarship for girls") is read by resolve.ts scholarshipListDoc.
      terms: uniqTerms([`Scholarships for ${f.audienceTitle}`, ...(SCHOLARSHIP_LIST_WORDS[f.slug] ?? [])]),
      weight: 0.4,
    });
  }
  push({
    id: "landing:/scholarships/closing-soon",
    kind: "landing",
    section: "college",
    title: "Scholarships closing soon",
    sub: `Last dates read on each scheme's official portal, in the next ${CLOSING_SOON_DAYS} days`,
    path: "/scholarships/closing-soon",
    terms: uniqTerms(["scholarships closing soon", "scholarship closing soon", "scholarship deadline", "scholarship deadlines"]),
    weight: 0.4,
  });

  const index: SearchIndex ={ v: 1, builtAt: inputs.builtAt, tier: "deep", docs: dedupeIds(docs), exams };
  return tier === "lite" ? toLiteIndex(index) : index;
}

function dedupeIds(docs: SearchDoc[]): SearchDoc[] {
  const seen = new Set<string>();
  return docs.filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));
}

/** Kinds the client index leaves to the server: topic-note pages (4,000+),
 *  and insight and persona pages — list rows that never open directly. */
const LITE_SKIP: ReadonlySet<DocKind> = new Set<DocKind>(["topic-note", "insight", "persona"]);
/** 27 Sep 2026 (wave 2 fixer): the monthly current-affairs capsules the lite
 *  index keeps — the latest few, the months students search for. The loader
 *  adds a page for every month with rows, so the list only grows; older months
 *  stay in the deep index (a strip search that opens no page goes to /ask,
 *  which resolves on the deep index and opens the capsule there). This keeps
 *  the strip's download bounded (tests/unit/search-resolver.test.ts sizes it
 *  with two years of months). */
export const LITE_CAPSULE_MONTHS = 3;
const CAPSULE_PATH = /^\/current-affairs\/capsule\/\d{4}-\d{2}$/;
/** The lite (client) tier of a deep index: every page but LITE_SKIP, without
 *  the weak keys (career keywords, scholarship tags) — the server's deep index
 *  still ranks with them when a search reaches /ask — and only the latest
 *  LITE_CAPSULE_MONTHS capsules. */
export function toLiteIndex(full: SearchIndex): SearchIndex {
  const capsules = full.docs.filter((d) => d.kind === "landing" && CAPSULE_PATH.test(d.path)).map((d) => d.path).sort();
  const oldCapsules = new Set(capsules.slice(0, Math.max(0, capsules.length - LITE_CAPSULE_MONTHS)));
  const docs = full.docs.filter((d) => !LITE_SKIP.has(d.kind) && !oldCapsules.has(d.path)).map((d) => {
    if (!d.soft) return d;
    const { soft: _soft, ...rest } = d;
    void _soft;
    return rest;
  });
  return { ...full, tier: "lite", docs };
}

/** Kinds that always resolve without a DB read (for the DB-down fallback). */
export const STATIC_KINDS: readonly DocKind[] = [
  "exam-category", "school-board", "college", "college-branch", "college-state", "college-stream", "scholarship", "career", "persona",
  "abroad-country", "abroad-university", "abroad-test", "insight", "landing",
];

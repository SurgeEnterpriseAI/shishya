// Copy for the life-stage pages (30 Sep 2026, P1 build 1, spec §2.1).
//
// i18n-first: every string the P1 pages, the tutor entry and the models
// print lives here, keyed by locale. English is filled in; Hindi and Telugu
// are typed but empty and fall back to English key by key, so the /hi and
// /te twins (later, not P1 — F7) are copy-only work. PATH_SEARCH_TERMS holds
// the words students type in each script; they are search keys only, never
// printed on a page.
//
// Honesty rules the copy keeps (tests/unit/paths-pages.test.ts scans it):
// no salary, no "best / #1 / biggest / largest", no typed counts ({n} is
// always filled from a computed length), and every rule is said to come from
// the official page with the day it was read.
//
// Pure: no imports beyond types.

import type { StreamOptionSlug } from "@/data/paths/types";

export type PathLocale = "en" | "hi" | "te";

export interface PathCopy {
  site: {
    /** Platform one-liner for context.md / llms lines. */
    oneLiner: string;
  };
  after10: {
    h1: string;
    titleCore: string;
    breadcrumb: string;
    /** {n} = number of options (computed). */
    lead: string;
    /** {n} = computed. */
    description: string;
    examsAfterLabel: string;
    /** Next links (block 4): existing pages, route-checked in tests. */
    next: readonly { href: string; label: string }[];
  };
  after12: {
    h1: string;
    titleCore: string;
    breadcrumb: string;
    lead: string;
    description: string;
    examsAfterLabel: string;
    next: readonly { href: string; label: string }[];
    govtJobsName: string;
    govtJobsWhat: string;
    openLearningName: string;
    openLearningWhat: string;
    abroadName: string;
    abroadWhat: string;
  };
  stream: {
    /** "{short} after 10th" → fitTitle core; the tails follow. */
    titleCore: string;
    titleTails: readonly string[];
    /** Tails for an option with no board subject table (diploma, ITI). */
    titleTailsNoBoardTable: readonly string[];
    /** {title}, {what} = the option's own copy. */
    description: string;
    breadcrumbSchooling: string;
    breadcrumbStreams: string;
    /** Both vocabularies, e.g. "MPC / PCM" (nav links, breadcrumbs, tutor seeds). */
    short: Readonly<Record<StreamOptionSlug, string>>;
  };
  table: {
    heading: string;
    option: string;
    whatItIs: string;
    duration: string;
    suits: string;
    leadsTo: string;
    exams: string;
    link: string;
    from: string;
  };
  boards: {
    heading: string;
    board: string;
    localName: string;
    groupCode: string;
    subjects: string;
    source: string;
    checked: string;
    /** Printed when an option has no confirmed board row. */
    pending: string;
    /** {board} = board name: the ONLY way an unconfirmed board appears. */
    checkSite: string;
  };
  blocks: {
    facts: string;
    keepsOpen: string;
    closes: string;
    exams: string;
    next: string;
    families: string;
    collegeStreams: string;
    careers: string;
    scholarships: string;
    /** Printed beside an exam that has no live page on Shishya. */
    examNoPage: string;
    notOnShishyaYet: string;
  };
  sources: {
    heading: string;
    /** {day} = "30 Sep 2026". */
    readOn: string;
    estimate: string;
    reported: string;
  };
  tutor: {
    button: string;
    line: string;
    /** Seeds (student voice, no facts, ≤ 280 characters once filled). */
    seedStage: Readonly<Partial<Record<"after-10th" | "after-12th" | "college" | "after-graduation" | "govt-job-prep" | "working", string>>>;
    /** {option} = stream.short[slug]. */
    seedStream: string;
    /** {family} = the family's name; keyed by CourseFamily.after. */
    seedCourse: Readonly<Record<"10th" | "12th" | "graduation", string>>;
  };
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends string | readonly unknown[] ? T[K] : DeepPartial<T[K]> };

const EN: PathCopy = {
  site: {
    oneLiner: "Shishya (shishya.in) is a free Indian learning site: school subjects, entrance and government exams, colleges, scholarships and careers, with an AI tutor.",
  },
  after10: {
    h1: "What can I do after Class 10?",
    titleCore: "After 10th: Streams, Diploma, ITI and NIOS Options Compared",
    breadcrumb: "After 10th",
    lead: "{n} options after Class 10, side by side: what each one is, how long it takes, and what it keeps open. Every rule below is from an official page, with the day we read it.",
    description: "{n} options after Class 10 compared: the Class 11-12 streams (MPC, BiPC, PCMB, Commerce, Arts), vocational, polytechnic diploma, ITI and NIOS. What each keeps open, with official sources.",
    examsAfterLabel: "Exams you can take after Class 10",
    next: [
      { href: "/schooling/streams", label: "Compare the Class 11 streams in detail" },
      { href: "/colleges/iti-diploma", label: "ITI and polytechnic diploma courses" },
      { href: "/distance-learning", label: "Open schooling and distance learning" },
      { href: "/career-map", label: "Career map" },
      { href: "/after-12th", label: "What comes after Class 12" },
    ],
  },
  after12: {
    h1: "What can I do after Class 12?",
    titleCore: "After 12th: Courses, Entrance Exams and Government Jobs",
    breadcrumb: "After 12th",
    lead: "{n} paths after Class 12, side by side: degree courses with their entrance exams, government jobs, open learning and study abroad. Every rule below is from an official page, with the day we read it.",
    description: "{n} paths after Class 12 compared: engineering, medicine, law, design, commerce, university degrees, defence, architecture, government jobs, open learning and study abroad. Subject rules from official pages.",
    examsAfterLabel: "Exams you can take after Class 12",
    next: [
      { href: "/exams/entrance", label: "Entrance exams after Class 12" },
      { href: "/colleges", label: "Colleges" },
      { href: "/careers", label: "Careers" },
      { href: "/scholarships", label: "Scholarships" },
      { href: "/career-map", label: "Career map" },
    ],
    govtJobsName: "Government jobs and exams after Class 12",
    govtJobsWhat: "Recruitment and entrance exams open to a Class 12 pass, gathered on one page.",
    openLearningName: "Open and distance learning",
    openLearningWhat: "Degrees and courses through open universities and distance learning, for those who cannot attend full time.",
    abroadName: "Study abroad",
    abroadWhat: "Undergraduate study outside India, country by country.",
  },
  stream: {
    titleCore: "{short} After 10th",
    titleTails: ["Subjects, Exams, Careers", "Subjects and Exams"],
    titleTailsNoBoardTable: ["Exams and Careers", "Exams"],
    description: "{title}. {what} Subjects as each board prints them, what it keeps open, and official sources.",
    breadcrumbSchooling: "Schooling",
    breadcrumbStreams: "Streams",
    short: {
      "mpc-pcm": "MPC / PCM",
      "bipc-pcb": "BiPC / PCB",
      pcmb: "PCMB",
      "commerce-cec-mec": "Commerce (CEC / MEC)",
      "arts-hec-humanities": "Arts / Humanities (HEC)",
      vocational: "Vocational Class 11-12",
      "diploma-polytechnic": "Polytechnic diploma",
      iti: "ITI",
      nios: "NIOS Senior Secondary",
    },
  },
  table: {
    heading: "Your options, side by side",
    option: "Option",
    whatItIs: "What it is",
    duration: "How long",
    suits: "Who it suits",
    leadsTo: "Leads to",
    exams: "Exams",
    link: "Full page",
    // 30 Sep 2026 (review fix): the column also lists the diploma, which is not a Class 11-12 option.
    from: "From these options after Class 10",
  },
  boards: {
    heading: "Subjects, board by board",
    board: "Board",
    localName: "The board's name for it",
    groupCode: "Group code",
    subjects: "Subjects as printed",
    source: "Source",
    checked: "Read on",
    pending: "Board-wise subject lists are being checked against each board's own documents.",
    checkSite: "Check {board}'s official site",
  },
  blocks: {
    facts: "Rules to know before you choose",
    keepsOpen: "What it keeps open",
    closes: "What it closes",
    exams: "Exams on this path",
    next: "Where it can lead",
    families: "Courses",
    collegeStreams: "Colleges",
    careers: "Careers",
    scholarships: "Scholarships open at this stage",
    examNoPage: "no Shishya page yet",
    notOnShishyaYet: "Not on Shishya yet: course pages (/courses).",
  },
  sources: {
    heading: "Sources and last checked",
    readOn: "read on {day}",
    estimate: "estimate",
    reported: "reported",
  },
  tutor: {
    button: "Ask about your options",
    line: "AI tutor. It explains; confirm dates and rules on the official site.",
    seedStage: {
      "after-10th":
        "I finished Class 10. Help me compare my options: the Class 11-12 streams, a polytechnic diploma, ITI and NIOS. What does each keep open, and what should I check on my board's website?",
      "after-12th":
        "I finished Class 12. Help me see my options: degree courses, entrance exams and government jobs. Which fit my subjects, and what should I confirm on the official sites?",
      college:
        "I am in college. Help me plan what comes next: higher studies, a job, research or government exams. What should I look at first?",
      "after-graduation":
        "I have finished my degree. Help me weigh my options: a master's degree, a job, research or government exams. What should I confirm on the official sites?",
      "govt-job-prep":
        "I want a government job. Help me find the exams that fit my qualification, and what I should confirm in each official notification.",
      working: "I am working and want to learn something new or change my path. Help me find where to start.",
    },
    seedStream:
      "I finished Class 10. Help me decide if {option} suits me: which courses, entrance exams and careers it keeps open, and what I should check on my board's website.",
    seedCourse: {
      "10th":
        "I finished Class 10 and I am thinking about {family}. Help me understand how admission works and what it can lead to, and what I should confirm on the official sites.",
      "12th":
        "I finished Class 12 and I am thinking about {family}. Help me understand the entrance exams and the subjects it asks for, and what I should confirm on the official sites.",
      graduation:
        "I have finished my degree and I am thinking about {family}. Help me understand the entrance exams and what I should confirm on the official sites.",
    },
  },
};

/** Hindi and Telugu: typed, empty until a person translates (P1 has no twins). */
const HI: DeepPartial<PathCopy> = {};
const TE: DeepPartial<PathCopy> = {};

function merge<T>(base: T, over: DeepPartial<T> | undefined): T {
  if (!over) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    if (v === undefined) continue;
    const b = (base as Record<string, unknown>)[k];
    out[k] = b && typeof b === "object" && !Array.isArray(b) && v && typeof v === "object" && !Array.isArray(v) ? merge(b, v as DeepPartial<typeof b>) : v;
  }
  return out as T;
}

/** The copy for a locale, falling back to English key by key. */
export function pathCopy(locale?: string | null): PathCopy {
  if (locale === "hi") return merge(EN, HI);
  if (locale === "te") return merge(EN, TE);
  return EN;
}

/** "{n} options" + {n: 9} → "9 options". Unknown keys stay as written. */
export function fillCopy(template: string, vars: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** The words students search for the life-stage pages, per script. Search keys
 *  only (src/lib/search, agent C) — never printed. */
export const PATH_SEARCH_TERMS: Readonly<Record<PathLocale, { after10: readonly string[]; after12: readonly string[]; streams: readonly string[] }>> = {
  en: {
    after10: ["after 10th", "after class 10", "what to do after 10th", "courses after 10th", "which group after 10th", "which stream after 10th", "stream selection", "MPC or BiPC", "options after 10th"],
    after12: ["after 12th", "after class 12", "what to do after 12th", "courses after 12th", "career after 12th", "options after 12th", "entrance exams after 12th"],
    streams: ["which group after 10th", "MPC or BiPC", "science or commerce", "group subjects", "stream subjects"],
  },
  hi: {
    after10: ["10वीं के बाद क्या करें", "10वीं के बाद कौन सा विषय", "10वीं के बाद कोर्स", "दसवीं के बाद"],
    after12: ["12वीं के बाद क्या करें", "12वीं के बाद कोर्स", "बारहवीं के बाद"],
    streams: ["कौन सा स्ट्रीम चुनें", "विज्ञान या कॉमर्स"],
  },
  te: {
    after10: ["10వ తరగతి తర్వాత", "పదో తరగతి తర్వాత ఏమి చేయాలి", "ఇంటర్ గ్రూప్"],
    after12: ["12వ తరగతి తర్వాత", "ఇంటర్ తర్వాత ఏమి చేయాలి"],
    streams: ["ఏ గ్రూప్ తీసుకోవాలి", "ఎంపీసీ లేదా బైపీసీ"],
  },
};

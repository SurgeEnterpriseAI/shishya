// Pure helpers for scripts/add-national-exams.ts (27 Sep 2026): turn
// data/national-exams-2026.json into per-exam write plans, and refuse any
// fact whose citation is not on the conducting body's own host. No DB, no
// network — unit-tested in tests/unit/national-exams-plan.test.ts.
//
// The honesty rule this enforces (founder brief, 27 Sep 2026): a fact enters
// the data only with the OFFICIAL source URL where it is stated and the exact
// words it came from. validateSpec() rejects a tracker date whose URL does not
// classify as sourceTier "official" (src/lib/official-source.ts — the same
// rule every date surface uses), a pattern or eligibility source off an
// official host, an empty quote, an impossible calendar date or an unknown
// kind. GATE papers share one organiser page, so expandSpecs() builds each
// GATE_* spec from `gateCommon` + the paper's own code and name — one source
// of truth for the six dates and the scheme.

import { isOfficialSource, sourceTier } from "../src/lib/official-source";

export const PROVENANCE = "official-research:2026-09-27";

export const DATE_KINDS = [
  "NOTIFICATION",
  "APPLICATION_START",
  "APPLICATION_END",
  "CORRECTION_WINDOW",
  "ADMIT_CARD",
  "EXAM",
  "ANSWER_KEY",
  "RESULT",
  "INTERVIEW",
  "OTHER",
] as const;
export type DateKind = (typeof DATE_KINDS)[number];

export const LANGUAGES = ["EN", "HI", "TE", "TA", "KN", "ML", "MR", "BN", "GU", "PA"] as const;
export const CATEGORIES = [
  "GOVT_JOBS",
  "BANKING",
  "CIVIL_SERVICES",
  "MEDICAL",
  "ENGINEERING",
  "TEACHING",
  "UNIVERSITY",
  "MBA",
  "LAW",
  "OLYMPIAD",
  "STATE_LEVEL",
  "OTHER",
] as const;

export interface DateSpec {
  label: string;
  date: string; // YYYY-MM-DD, Asia/Kolkata calendar day
  kind: DateKind;
  isExamDay?: boolean;
  url: string;
  quote: string;
  quoteMethod?: string;
}

export interface ExamFields {
  name: string;
  shortName: string;
  category: (typeof CATEGORIES)[number];
  description: string;
  durationMin: number;
  totalQuestions: number;
  scoredQuestions: number | null;
  totalMarks: number;
  marksPerQ: number;
  negativeMark: number;
  languages: (typeof LANGUAGES)[number][];
}

export interface EligibilityFields {
  minAge: number | null;
  maxAge: number | null;
  ageRelaxation: string | null;
  educationTags: string[];
  educationNote: string | null;
  vacanciesApprox: number | null;
  vacanciesNote: string | null;
  eligibilityNote: string | null;
  officialUrl: string;
  officialName: string;
}

export interface ExamSpec {
  code: string;
  exam: ExamFields;
  pattern: { stage: string; url: string; source?: string; quote: string; note?: string };
  eligibility: EligibilityFields & { sources: { url: string; quote: string }[] };
  syllabus: { url: string; quote: string };
  dates: DateSpec[];
  notAnnounced?: string[];
  activeRecommendation?: string;
}

interface GatePaper {
  paperCode: string;
  paperName: string;
  hasEngineeringMath: boolean;
}

interface GateCommon {
  organiser: string;
  officialUrl: string;
  patternUrl: string;
  patternQuote: string;
  eligibilityUrl: string;
  eligibilityQuote: string;
  homeQuote: string;
  syllabusUrlPattern: string;
  datesUrl: string;
  dates: (Omit<DateSpec, "url"> & { why?: string })[];
  notAnnounced: string[];
}

export interface NationalExamsFile {
  exams: ({ code: string; gatePaper?: GatePaper } & Partial<ExamSpec>)[];
  gateCommon: GateCommon;
  leftOut: { code: string; what: string; why: string }[];
}

/** GATE_ME etc. from the shared organiser facts + the paper's code/name. */
export function gateSpec(code: string, p: GatePaper, g: GateCommon): ExamSpec {
  const split = p.hasEngineeringMath
    ? "General Aptitude 15 marks, Engineering Mathematics 13 and the subject 72"
    : "General Aptitude 15 marks and the subject 85";
  const description =
    `GATE 2027 ${p.paperName} (${p.paperCode}) paper. GATE is conducted jointly by IISc and the IITs for the National Coordination Board – GATE, ` +
    `Ministry of Education; IIT Madras is the organising institute for 2027. Scores are used for admission to postgraduate and doctoral programmes in ` +
    `MoE-supported institutions, several PSUs use them for recruitment, and a score is valid for 3 years. The exams are on 6, 7, 13, 14, 20 and 21 ` +
    `February 2027 — the ${p.paperCode} paper's own date is not announced yet — and results on 19 March 2027 (all dates liable to change). ` +
    `Registration opened on 2 September 2026; regular registration closes on 27 September 2026 and late-fee registration on 5 October 2026; ` +
    `application rectification is 14–21 October 2026 and exam city allotment 4 January 2027. The paper: 65 questions for 100 marks in 3 hours, ` +
    `in English — ${split}; multiple-choice, multiple-select and numerical-answer questions of 1 or 2 marks; a wrong 1-mark multiple-choice ` +
    `answer costs 1/3 mark and a wrong 2-mark one 2/3, with no negative marking for multiple-select or numerical answers. Eligibility: students ` +
    `in the third or higher year of any undergraduate degree, or holders of a government-approved degree in engineering, technology, architecture, ` +
    `science, commerce, arts or humanities.`;
  const syllabusUrl = g.syllabusUrlPattern.replace("{PAPER}", p.paperCode);
  return {
    code,
    exam: {
      name: `Graduate Aptitude Test in Engineering — ${p.paperName}`,
      shortName: `GATE ${code.replace(/^GATE_/, "")}`,
      category: "ENGINEERING",
      description,
      durationMin: 180,
      totalQuestions: 65,
      scoredQuestions: null,
      totalMarks: 100,
      // A 1-mark MCQ's values: the paper mixes 1- and 2-mark questions, so
      // marksPerQ x 65 != 100 and the score-estimate gate withholds the
      // calculator (data/national-exams-2026.json _meta.patternColumns).
      marksPerQ: 1,
      negativeMark: 1 / 3,
      languages: ["EN"],
    },
    pattern: { stage: `${p.paperCode} paper`, url: g.patternUrl, source: "GATE 2027 Question Paper Pattern (IIT Madras)", quote: g.patternQuote },
    eligibility: {
      minAge: null,
      maxAge: null,
      ageRelaxation: null,
      educationTags: ["GRADUATE", "ANY_STREAM"],
      educationNote:
        "In the third or higher year of any undergraduate degree, or holding a government-approved degree in engineering, technology, architecture, science, commerce, arts or humanities.",
      vacanciesApprox: null,
      vacanciesNote: "A qualifying score for postgraduate admission and PSU recruitment, not a recruitment: there is no vacancy count.",
      eligibilityNote: `Score valid for 3 years (GATE 2027 site). ${p.paperCode} syllabus: ${syllabusUrl}`,
      officialUrl: g.officialUrl,
      officialName: g.organiser,
      sources: [
        { url: g.eligibilityUrl, quote: g.eligibilityQuote },
        { url: g.officialUrl, quote: g.homeQuote },
      ],
    },
    syllabus: { url: syllabusUrl, quote: `GATE 2027 Test Papers & Syllabus: ${p.paperCode} — ${p.paperName} (syllabi revised for 2027).` },
    dates: g.dates.map((d) => ({
      label: d.label.replace("{PAPER}", p.paperCode),
      date: d.date,
      kind: d.kind,
      isExamDay: d.isExamDay,
      url: g.datesUrl,
      quote: d.quote,
    })),
    notAnnounced: g.notAnnounced,
    activeRecommendation: "Activate once the hub's zero-question copy is gated.",
  };
}

/** Every spec in file order, GATE papers expanded. */
export function expandSpecs(file: NationalExamsFile): ExamSpec[] {
  return file.exams.map((e) => (e.gatePaper ? gateSpec(e.code, e.gatePaper, file.gateCommon) : (e as ExamSpec)));
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar day written YYYY-MM-DD. */
export function isIsoDay(s: string): boolean {
  const m = ISO_DAY.exec(s);
  if (!m) return false;
  const d = new Date(`${s}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Midnight UTC of the IST calendar day — the repo-wide storage convention. */
export function dayToDate(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

/** Problems that must stop a write. Empty = the spec may be written. */
export function validateSpec(s: ExamSpec): string[] {
  const out: string[] = [];
  const off = s.eligibility?.officialUrl;
  const p = (m: string) => out.push(`${s.code}: ${m}`);
  if (!/^[A-Z][A-Z0-9_]+$/.test(s.code)) p(`bad code ${JSON.stringify(s.code)}`);
  const e = s.exam;
  if (!e) return [`${s.code}: no exam fields`];
  if (!e.name?.trim() || !e.shortName?.trim() || !e.description?.trim()) p("name, shortName and description are required");
  if (!(CATEGORIES as readonly string[]).includes(e.category)) p(`unknown category ${e.category}`);
  for (const l of e.languages) if (!(LANGUAGES as readonly string[]).includes(l)) p(`unknown language ${l}`);
  for (const [k, v] of Object.entries({ durationMin: e.durationMin, totalQuestions: e.totalQuestions, totalMarks: e.totalMarks, marksPerQ: e.marksPerQ })) {
    if (!(typeof v === "number" && v > 0 && Number.isFinite(v))) p(`${k} must be a positive number`);
  }
  if (!(typeof e.negativeMark === "number" && e.negativeMark >= 0)) p("negativeMark must be >= 0");
  if (e.scoredQuestions != null && !(e.scoredQuestions > 0 && e.scoredQuestions <= e.totalQuestions)) p("scoredQuestions must be in 1..totalQuestions");
  if (/\b(mock|pyq|previous year|practice question)/i.test(e.description)) p("description must not mention mocks / PYQs / practice questions");
  if (!off || !/^https:\/\//.test(off)) p("eligibility.officialUrl must be an https URL");
  if (!s.pattern?.quote?.trim() || !isOfficialSource(s.pattern?.url, off)) p(`pattern source must be quoted and on an official host (${s.pattern?.url})`);
  for (const src of s.eligibility?.sources ?? []) {
    if (!src.quote?.trim() || !isOfficialSource(src.url, off)) p(`eligibility source must be quoted and on an official host (${src.url})`);
  }
  if (!s.eligibility?.sources?.length) p("eligibility needs at least one quoted source");
  if (!s.syllabus?.url || !/^https?:\/\//.test(s.syllabus.url)) p("syllabus link missing");
  const seen = new Set<string>();
  for (const d of s.dates) {
    const tag = `date "${d.label}"`;
    if (!d.label?.trim()) p(`${tag}: empty label`);
    if (!isIsoDay(d.date)) p(`${tag}: ${d.date} is not a YYYY-MM-DD calendar day`);
    if (!(DATE_KINDS as readonly string[]).includes(d.kind)) p(`${tag}: unknown kind ${d.kind}`);
    if (!d.quote?.trim()) p(`${tag}: no quote`);
    if (sourceTier("official", d.url, off) !== "official") p(`${tag}: ${d.url} is not an official-tier source`);
    const key = `${d.label}|${d.date}`;
    if (seen.has(key)) p(`${tag}: duplicate label+day`);
    seen.add(key);
  }
  return out;
}

/** The stored-row key the insert is idempotent on: label + IST day. */
export function dateKey(label: string, d: Date | string): string {
  const day = typeof d === "string" ? d : d.toISOString().slice(0, 10);
  return `${label}|${day}`;
}

export interface LiveDateRow {
  label: string;
  date: Date;
  kind: string | null;
}

/** Which spec dates are missing (by label + day), and which live rows share a
 *  kind + day with a new row under another label (printed for review; never
 *  deleted by the script). */
export function planDates(live: readonly LiveDateRow[], dates: readonly DateSpec[]): { add: DateSpec[]; present: DateSpec[]; sameKindDay: string[] } {
  const have = new Set(live.map((r) => dateKey(r.label, r.date)));
  const add = dates.filter((d) => !have.has(dateKey(d.label, d.date)));
  const present = dates.filter((d) => have.has(dateKey(d.label, d.date)));
  const sameKindDay: string[] = [];
  for (const d of add) {
    for (const r of live) {
      if ((r.kind ?? "").toUpperCase() === d.kind && r.date.toISOString().slice(0, 10) === d.date) {
        sameKindDay.push(`${d.date} ${d.kind}: new "${d.label}" beside live "${r.label}"`);
      }
    }
  }
  return { add, present, sameKindDay };
}

const same = (a: unknown, b: unknown): boolean => {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-9;
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
};

/** Keys of `after` whose value differs in `before` (null-safe, float-safe). */
export function changedKeys<T extends Record<string, unknown>>(before: Partial<T> | null | undefined, after: T): (keyof T)[] {
  return (Object.keys(after) as (keyof T)[]).filter((k) => !same(before?.[k], after[k]));
}

/** The Exam columns the script writes (never `active`). */
export function examColumns(s: ExamSpec): ExamFields & { state: null } {
  const e = s.exam;
  return {
    name: e.name,
    shortName: e.shortName,
    category: e.category,
    description: e.description,
    durationMin: e.durationMin,
    totalQuestions: e.totalQuestions,
    scoredQuestions: e.scoredQuestions ?? null,
    totalMarks: e.totalMarks,
    marksPerQ: e.marksPerQ,
    negativeMark: e.negativeMark,
    languages: e.languages,
    state: null,
  };
}

/** The ExamEligibility columns the script writes (skillProfile untouched). */
export function eligibilityColumns(s: ExamSpec): EligibilityFields & { domicileState: null; generatedBy: string } {
  const x = s.eligibility;
  return {
    minAge: x.minAge,
    maxAge: x.maxAge,
    ageRelaxation: x.ageRelaxation,
    educationTags: x.educationTags,
    educationNote: x.educationNote,
    vacanciesApprox: x.vacanciesApprox,
    vacanciesNote: x.vacanciesNote,
    eligibilityNote: x.eligibilityNote,
    officialUrl: x.officialUrl,
    officialName: x.officialName,
    domicileState: null,
    generatedBy: PROVENANCE,
  };
}

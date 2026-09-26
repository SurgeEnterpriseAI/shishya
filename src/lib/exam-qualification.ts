// "Exams after 10th / 12th / graduation" — /exams/after/{level}
// (26 Sep 2026, G4 honest page families).
//
// Why: "government jobs after 12th", "exams after 10th" and "exams after
// graduation" are among the largest career searches in India and Shishya had
// no crawlable answer. Membership comes from ExamEligibility.educationTags
// grouped by the LOWEST qualification an exam lists (the quality critic's
// rule): the tags mean "any one of", so an exam tagged {10TH, 12TH,
// GRADUATE} (HP HPSSSB — "varies by post") belongs after 10th, never after
// postgraduation. Listed exams are split into government recruitment /
// eligibility tests (the find-your-exam job tags) and entrance / admission
// tests. Olympiads are left out — they are for students still in school.
//
// Honesty:
//   • 175 of 179 eligibility rows are AI-drafted summaries: the page says so,
//     quotes each exam's educationNote verbatim (or the hand-checked deep
//     content where it exists) and links the official site;
//   • an exam listing more than one qualification level carries a "several
//     levels" badge — some posts or papers need more than the lowest;
//   • vacancies are not shown (no source field);
//   • /exams/after/postgraduation is held (404) until UGC NET, CSIR NET,
//     CUET PG and IIT JAM have live rows: 5 of the 8 POSTGRADUATE-tagged
//     exams also accept 10th or 12th, and grouped by lowest level only NEET PG
//     remains (the critic's probe, 26 Sep 2026).
// A level page is indexable with at least QUALIFICATION_MIN exams.
//
// 27 Sep 2026 (repair, adversarial review): the page grouped exams by the
// AI-drafted tags while each row printed the hand-checked rule, and the two
// disagreed — /exams/after/10th listed TN Police PC whose checked row said
// "Class 12", /exams/after/graduation listed RRB NTPC and UP UPCET whose
// checked rows say "Class 12", and /exams/after/12th listed CTET and 19
// state TETs, which also need a D.El.Ed. or B.Ed. Now (levelVerdict):
//   • where the hand-checked src/data/exam-deep-content.ts eligibility
//     names a level (deepLevelTag), it must agree with the tags' lowest
//     level; when they disagree the exam is left out of every level page
//     until a person reconciles them (never placed by a guess);
//   • a teaching exam whose rule asks for a teacher-training qualification
//     (D.El.Ed., B.Ed., BTC, JBT …) is on no level page — "after 12th" would
//     tell a 12th-pass reader they can sit it. The lead names how many and
//     the page links /exams/category/teaching.
// Pure: no DB (the sitemap provider imports the loader lazily);
// tests/unit/exam-qualification.test.ts.

import type { MetadataRoute } from "next";
import { findDeepContent } from "@/data/exam-deep-content";
import { computeExamTags } from "@/lib/exam-tags";
import type { ExamLike } from "@/lib/exam-categories";

export const QUALIFICATION_MIN = 5;

/** Education tags that name a qualification level, lowest first. ITI sits
 *  before 12TH: both follow Class 10, and an exam listing ITI beside 12TH
 *  accepts the ITI route. */
export const LEVEL_TAG_ORDER = ["10TH", "ITI", "12TH", "DIPLOMA", "GRADUATE", "POSTGRADUATE"] as const;
export type LevelTag = (typeof LEVEL_TAG_ORDER)[number];

export type QualificationSlug = "10th" | "12th" | "diploma-iti" | "graduation" | "postgraduation";

export interface QualificationLevel {
  slug: QualificationSlug;
  /** The lowest-level tags that put an exam on this page. */
  tags: readonly LevelTag[];
  /** "10th" / "12th" / "a diploma or ITI" … for sentences. */
  after: string;
  /** Title case for headings: "10th". */
  afterTitle: string;
  /** "Class 10" … the qualification as a noun. */
  qualification: string;
  /** Held pages 404 and are never linked or listed. */
  held?: string;
}

export const QUALIFICATION_LEVELS: readonly QualificationLevel[] = [
  { slug: "10th", tags: ["10TH"], after: "10th", afterTitle: "10th", qualification: "Class 10" },
  { slug: "12th", tags: ["12TH"], after: "12th", afterTitle: "12th", qualification: "Class 12" },
  { slug: "diploma-iti", tags: ["ITI", "DIPLOMA"], after: "a diploma or ITI", afterTitle: "Diploma or ITI", qualification: "a diploma or an ITI certificate" },
  { slug: "graduation", tags: ["GRADUATE"], after: "graduation", afterTitle: "Graduation", qualification: "a bachelor's degree" },
  {
    slug: "postgraduation",
    tags: ["POSTGRADUATE"],
    after: "postgraduation",
    afterTitle: "Postgraduation",
    qualification: "a master's degree",
    held: "Held until UGC NET, CSIR NET, CUET PG and IIT JAM have live pages (26 Sep 2026).",
  },
];

/** The levels with a page (not held). */
export const PUBLISHED_LEVELS: readonly QualificationLevel[] = QUALIFICATION_LEVELS.filter((l) => !l.held);

export function findQualificationLevel(slug: string): QualificationLevel | undefined {
  return QUALIFICATION_LEVELS.find((l) => l.slug === slug);
}

/** The lowest qualification level an exam's tags list, or null when none. */
export function lowestLevelTag(tags: readonly string[]): LevelTag | null {
  for (const t of LEVEL_TAG_ORDER) if (tags.includes(t)) return t;
  return null;
}

/** How many distinct qualification levels the tags list. */
export function levelCount(tags: readonly string[]): number {
  return LEVEL_TAG_ORDER.filter((t) => tags.includes(t)).length;
}

/** The tag rule alone: the page of the lowest level the education tags list,
 *  or null (olympiad, no level tag). levelOf adds the checks below. */
export function levelOfTags(category: string, educationTags: readonly string[]): QualificationLevel | null {
  if (category === "OLYMPIAD") return null;
  const low = lowestLevelTag(educationTags);
  if (!low) return null;
  return levelOfTag(low);
}

function levelOfTag(tag: LevelTag): QualificationLevel | null {
  return QUALIFICATION_LEVELS.find((l) => l.tags.includes(tag)) ?? null;
}

/** Words that name each level in an eligibility line, lowest first. */
const LEVEL_WORDS: readonly (readonly [LevelTag, RegExp])[] = [
  ["10TH", /\bclass\s*10\b|\b10th\b|matricul|\bsslc\b/i],
  ["ITI", /\biti\b/i],
  ["12TH", /\bclass\s*12\b|\b12th\b|\b10\s*\+\s*2\b|\bintermediate\b|higher secondary|\bhsc\b|senior secondary|\bpuc\b/i],
  ["DIPLOMA", /\bdiploma\b/i],
  ["GRADUATE", /bachelor|\bb\.\s?e\.|\bb\.\s?tech\b|\bmbbs\b|\bgraduat/i],
  ["POSTGRADUATE", /\bmaster|post-?graduat/i],
];

/** The lowest level an eligibility line names, or null when it names none.
 *  "Bachelor's with Physics + Maths at 10+2" states a school subject rule,
 *  not a qualification: "at 10+2" / "at Class 12" is dropped first. */
export function deepLevelTag(education: string): LevelTag | null {
  const text = education.replace(/\bat\s+(?:the\s+)?(?:10\s*\+\s*2|class\s*12|12th)(?:\s+level)?/gi, " ");
  for (const [tag, re] of LEVEL_WORDS) if (re.test(text)) return tag;
  return null;
}

/** A teacher-training qualification named in a rule. */
const TEACHER_TRAINING = /D\.\s?El\.\s?Ed|B\.\s?El\.\s?Ed|\bB\.\s?Ed\b|\bD\.\s?Ed\b|\bBTC\b|\bJBT\b|\bTTC\b|diploma in (?:elementary )?education|teacher[- ]training/i;

/** What levelOf needs (ExamLike satisfies it; /find-your-exam builds it). */
export interface LevelInput {
  code: string;
  category: string;
  state: string | null;
  candidatesPerYear?: number | null;
  eligibility: { educationTags: readonly string[]; educationNote?: string | null } | null;
}

/** A teaching exam whose rule (hand-checked or summary) asks for a
 *  teacher-training qualification on top of the school or degree level. */
export function needsTeacherTraining(e: LevelInput): boolean {
  const tags = computeExamTags({ code: e.code, category: e.category, state: e.state, candidatesPerYear: e.candidatesPerYear ?? null });
  if (!tags.includes("teaching")) return false;
  const text = [findDeepContent(e.code)?.eligibility?.education ?? "", e.eligibility?.educationNote ?? ""].join(" ");
  return TEACHER_TRAINING.test(text);
}

export type LevelVerdict =
  | { kind: "level"; level: QualificationLevel; basis: "checked" | "tags" }
  | { kind: "teacher-training" }
  | { kind: "disagree"; checked: LevelTag; tags: LevelTag }
  | { kind: "none" };

/** Where an exam goes on the level pages, and why it goes nowhere. */
export function levelVerdict(e: LevelInput): LevelVerdict {
  if (e.category === "OLYMPIAD") return { kind: "none" };
  const tagLow = lowestLevelTag(e.eligibility?.educationTags ?? []);
  const deep = findDeepContent(e.code)?.eligibility;
  const deepLow = deep ? deepLevelTag(deep.education) : null;
  const low = deepLow ?? tagLow;
  if (!low) return { kind: "none" };
  if (needsTeacherTraining(e)) return { kind: "teacher-training" };
  if (deepLow && tagLow && deepLow !== tagLow) return { kind: "disagree", checked: deepLow, tags: tagLow };
  const level = levelOfTag(low);
  return level ? { kind: "level", level, basis: deepLow ? "checked" : "tags" } : { kind: "none" };
}

/** The level page an exam belongs to, or null (olympiad, no level, a
 *  teacher-training exam, or checked and summary rules that disagree). */
export function levelOf(e: LevelInput): QualificationLevel | null {
  const v = levelVerdict(e);
  return v.kind === "level" ? v.level : null;
}

const JOB_TAGS = new Set(["govt", "banking", "teaching", "police", "civil_services", "defence"]);

/** A government recruitment / eligibility exam (the /find-your-exam rule),
 *  as opposed to an entrance or admission test. */
export function isGovernmentExam(e: Pick<ExamLike, "code" | "category" | "state" | "candidatesPerYear">): boolean {
  return computeExamTags({ code: e.code, category: e.category, state: e.state, candidatesPerYear: e.candidatesPerYear }).some((t) => JOB_TAGS.has(t));
}

export interface QualificationGroups<E> {
  government: E[];
  entrance: E[];
  /** Teaching exams the tags alone would put on this page, which also need
   *  a teacher-training qualification — counted in the lead, never listed. */
  teacherTraining?: E[];
}

/** The exams of one level, split, in the loader's order (most-taken first). */
export function examsAfter<E extends ExamLike>(level: QualificationLevel, rows: readonly E[]): QualificationGroups<E> {
  const list = rows.filter((e) => levelOf(e)?.slug === level.slug);
  const teacherTraining = rows.filter(
    (e) => levelVerdict(e).kind === "teacher-training" && levelOfTags(e.category, e.eligibility?.educationTags ?? [])?.slug === level.slug,
  );
  return { government: list.filter(isGovernmentExam), entrance: list.filter((e) => !isGovernmentExam(e)), teacherTraining };
}

export function levelTotal(g: QualificationGroups<unknown>): number {
  return g.government.length + g.entrance.length;
}

export function isLevelIndexable(level: QualificationLevel, g: QualificationGroups<unknown>): boolean {
  return !level.held && levelTotal(g) >= QUALIFICATION_MIN;
}

/** Counts per published level (for link rows: /find-your-exam, the state page). */
export function levelCounts(rows: readonly ExamLike[]): { level: QualificationLevel; total: number; indexable: boolean }[] {
  return PUBLISHED_LEVELS.map((level) => {
    const g = examsAfter(level, rows);
    return { level, total: levelTotal(g), indexable: isLevelIndexable(level, g) };
  });
}

/** Title: "Exams After 12th in India: 75 Government and Entrance Exams Compared". */
export function qualificationTitle(level: QualificationLevel, g: QualificationGroups<unknown>): string {
  const n = levelTotal(g);
  const kinds =
    g.government.length > 0 && g.entrance.length > 0
      ? "Government and Entrance Exams"
      : g.government.length > 0
        ? n === 1 ? "Government Exam" : "Government Exams"
        : n === 1 ? "Entrance Exam" : "Entrance Exams";
  return `Exams After ${level.afterTitle} in India: ${n} ${kinds} Compared`;
}

/** The sentence the page leads with. */
export function qualificationLead(level: QualificationLevel, g: QualificationGroups<unknown>): string {
  const n = levelTotal(g);
  const split = [
    g.government.length > 0 ? `${g.government.length} government recruitment or eligibility ${g.government.length === 1 ? "test" : "tests"}` : "",
    g.entrance.length > 0 ? `${g.entrance.length} entrance or admission ${g.entrance.length === 1 ? "test" : "tests"}` : "",
  ].filter(Boolean);
  const tt = g.teacherTraining?.length ?? 0;
  return (
    `${n} ${n === 1 ? "exam" : "exams"} on Shishya list ${level.qualification} as the lowest qualification${split.length ? `: ${split.join(" and ")}` : ""}. ` +
    "An exam may ask for more for a particular post or paper — each row quotes the exam's own rule. Olympiads, which are for students still in school, are not listed." +
    (tt > 0
      ? ` ${tt} teacher eligibility ${tt === 1 ? "test that also needs" : "tests that also need"} a teacher-training qualification (D.El.Ed. or B.Ed.) ${tt === 1 ? "is" : "are"} not listed here.`
      : "")
  );
}

export function qualificationFaq(level: QualificationLevel, g: QualificationGroups<ExamLike>): { q: string; a: string } {
  const top = (list: ExamLike[]) => list.slice(0, 6).map((e) => e.shortName);
  const gov = top(g.government);
  const ent = top(g.entrance);
  const parts = [
    gov.length ? `government: ${gov.join(", ")}${g.government.length > gov.length ? ` and ${g.government.length - gov.length} more` : ""}` : "",
    ent.length ? `entrance: ${ent.join(", ")}${g.entrance.length > ent.length ? ` and ${g.entrance.length - ent.length} more` : ""}` : "",
  ].filter(Boolean);
  return {
    q: `Which exams can I take after ${level.after}?`,
    a: parts.length
      ? `On Shishya, the exams that list ${level.qualification} as the lowest qualification are — ${parts.join("; ")}. Age limits and the exact qualification differ by exam and post; confirm on each official website before applying.`
      : `No exam on Shishya lists ${level.qualification} as its lowest qualification yet.`,
  };
}

/** Sitemap rows for the indexable level pages, given the loaded rows. No
 *  lastModified (Exam.updatedAt moves on every refresh attempt). */
export function qualificationSitemapEntriesFrom(base: string, rows: readonly ExamLike[]): MetadataRoute.Sitemap {
  return PUBLISHED_LEVELS.filter((l) => isLevelIndexable(l, examsAfter(l, rows))).map((l) => ({
    url: `${base}/exams/after/${l.slug}`,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));
}

/** The provider the main session registers in src/lib/sitemap-sections.ts. */
export async function qualificationSitemapEntries(base: string): Promise<MetadataRoute.Sitemap> {
  const { getExamListRows } = await import("@/lib/exam-list-rows");
  return qualificationSitemapEntriesFrom(base, await getExamListRows());
}

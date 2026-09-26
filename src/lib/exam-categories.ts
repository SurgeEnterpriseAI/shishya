// Exam category hubs — /exams/category/{slug} (26 Sep 2026, G4 honest page families).
//
// Why: "banking exams", "police exams", "teaching exams / TET list", "state
// PSC exams" and "engineering entrance exams" are large searches, and the
// only Shishya answers were /exams/browse?category=… — robots-blocked query
// URLs over DB enums that do not match how students group exams (the TEACHING
// enum holds CTET alone; the 22 state TETs are STATE_LEVEL). A hub groups the
// catalogue's live exams the way computeExamTags (src/lib/exam-tags.ts) and
// the state-exam type rules (src/lib/state-exams.ts examTypeOf) already do,
// and compares them in one table built from DB rows only:
//   exam → hub, conducting body, next exam day with its tier, age limit and
//   qualification (hand-checked deep content where it exists, otherwise the
//   AI-drafted ExamEligibility labelled "indicative"), official site, and the
//   number of Shishya mock tests (computed).
// Not shown (the quality critic's vetoes): vacancies (no source field) and
// the paper pattern (question / marks / minutes columns have no provenance).
//
// A configured slug renders only with at least EXAM_CATEGORY_MIN active real
// exams (railway, SSC, defence, UPSC, medical, management and design entrance
// had fewer on 26 Sep 2026 and 404); the sitemap lists the same set.
// Pure: no DB, no Next runtime (tests/unit/exam-categories.test.ts).

import type { MetadataRoute } from "next";
import { findDeepContent } from "@/data/exam-deep-content";
import { computeExamTags } from "@/lib/exam-tags";
import { examTypeOf } from "@/lib/state-exams";

export const EXAM_CATEGORY_MIN = 5;

/** What the category and qualification pages need from an exam row
 *  (src/lib/exam-list-rows.ts ExamListRow satisfies it). */
export interface ExamLike {
  code: string;
  shortName: string;
  name: string;
  category: string;
  state: string | null;
  candidatesPerYear: number | null;
  updatedAt: string;
  mockCount: number;
  eligibility: {
    minAge: number | null;
    maxAge: number | null;
    educationTags: string[];
    educationNote: string | null;
    officialUrl: string | null;
    officialName: string | null;
  } | null;
  nextExam: { day: string; tier: "official" | "reported" | "expected"; label: string } | null;
}

export type ExamCategorySlug =
  | "banking"
  | "railway"
  | "ssc"
  | "police"
  | "teaching"
  | "defence"
  | "state-psc"
  | "upsc-civil-services"
  | "engineering-entrance"
  | "medical-entrance"
  | "law-entrance"
  | "management-entrance"
  | "design-entrance";

export interface ExamCategory {
  slug: ExamCategorySlug;
  /** Plural noun phrase: "banking exams". */
  noun: string;
  /** H1 / title head: "Banking Exams in India". */
  heading: string;
  /** How membership is decided — printed on the page. */
  rule: string;
  match: (e: Pick<ExamLike, "code" | "category" | "state" | "name" | "shortName" | "candidatesPerYear">) => boolean;
}

const tags = (e: Pick<ExamLike, "code" | "category" | "state" | "candidatesPerYear">) =>
  computeExamTags({ code: e.code, category: e.category, state: e.state, candidatesPerYear: e.candidatesPerYear });

export const EXAM_CATEGORIES: readonly ExamCategory[] = [
  { slug: "banking", noun: "banking exams", heading: "Banking Exams in India", rule: "Bank recruitment exams on Shishya.", match: (e) => tags(e).includes("banking") },
  { slug: "railway", noun: "railway exams", heading: "Railway Exams in India", rule: "Railway Recruitment Board (RRB) exams.", match: (e) => /^RRB_/.test(e.code) },
  { slug: "ssc", noun: "SSC exams", heading: "SSC Exams in India", rule: "Staff Selection Commission exams.", match: (e) => /^SSC_/.test(e.code) },
  {
    slug: "police",
    noun: "police exams",
    heading: "Police Exams in India",
    rule: "State and union-territory police recruitment exams on Shishya (constable and sub-inspector).",
    match: (e) => tags(e).includes("police"),
  },
  {
    slug: "teaching",
    noun: "teaching exams",
    heading: "Teaching Exams in India — CTET and State TETs",
    rule: "Teacher eligibility tests (CTET and the state TETs) and teacher recruitment exams on Shishya.",
    match: (e) => tags(e).includes("teaching"),
  },
  { slug: "defence", noun: "defence exams", heading: "Defence Exams in India", rule: "Defence officer-entry exams.", match: (e) => tags(e).includes("defence") },
  {
    slug: "state-psc",
    noun: "state PSC exams",
    heading: "State PSC Exams in India",
    rule: "Exams run by a state (or union territory) Public Service Commission.",
    match: (e) => e.category === "STATE_LEVEL" && examTypeOf(e) === "PSC",
  },
  { slug: "upsc-civil-services", noun: "UPSC civil services exams", heading: "UPSC Civil Services Exams", rule: "UPSC exams.", match: (e) => /^UPSC_/.test(e.code) },
  {
    slug: "engineering-entrance",
    noun: "engineering entrance exams",
    heading: "Engineering Entrance Exams in India",
    rule: "Engineering admission tests on Shishya — national tests and state engineering CETs.",
    match: (e) => tags(e).includes("engineering"),
  },
  { slug: "medical-entrance", noun: "medical entrance exams", heading: "Medical Entrance Exams in India", rule: "Medical admission tests.", match: (e) => tags(e).includes("medical") },
  {
    slug: "law-entrance",
    noun: "law entrance exams",
    heading: "Law Entrance Exams in India",
    rule: "Law admission tests on Shishya (national tests and state LAWCETs).",
    match: (e) => tags(e).includes("law"),
  },
  { slug: "management-entrance", noun: "management entrance exams", heading: "MBA Entrance Exams in India", rule: "MBA / management admission tests.", match: (e) => tags(e).includes("mba") },
  {
    slug: "design-entrance",
    noun: "design entrance exams",
    heading: "Design Entrance Exams in India",
    rule: "Design admission tests.",
    match: (e) => ["NID_DAT", "NIFT", "UCEED"].includes(e.code),
  },
];

export function findExamCategory(slug: string): ExamCategory | undefined {
  return EXAM_CATEGORIES.find((c) => c.slug === slug);
}

/** The category's exams, most-taken first (the loader's order), olympiads never. */
export function examsInCategory<E extends ExamLike>(cat: ExamCategory, rows: readonly E[]): E[] {
  return rows.filter((e) => e.category !== "OLYMPIAD" && cat.match(e));
}

export function isCategoryLive(list: readonly unknown[]): boolean {
  return list.length >= EXAM_CATEGORY_MIN;
}

// ── Shared cells (the qualification pages use them too) ──────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
/** "2026-11-02" → "2 Nov 2026". */
export function dayLabel(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Tier word for a date: official / reported / expected (an estimate). */
export function tierWord(tier: "official" | "reported" | "expected"): string {
  return tier === "expected" ? "expected — an estimate" : tier;
}

export function nextExamCell(e: Pick<ExamLike, "nextExam">): string {
  if (!e.nextExam) return "Not on the tracker yet";
  return `${dayLabel(e.nextExam.day)} (${tierWord(e.nextExam.tier)})`;
}

function ageText(min: number | null | undefined, max: number | null | undefined): string {
  if (min != null && max != null) return `${min}–${max} years`;
  if (max != null) return `Up to ${max} years`;
  if (min != null) return `At least ${min} years`;
  return "No age limit listed";
}

export interface EligibilityView {
  age: string;
  qualification: string;
  /** "checked" = the hand-checked deep content (with its month); "indicative"
   *  = the AI-drafted ExamEligibility summary. */
  basis: "checked" | "indicative";
  /** The source to verify against: the notification for checked rows, the
   *  official site for indicative ones. */
  sourceUrl: string | null;
  checkedMonth: string | null;
}

/** Age and qualification for a row: the hand-checked deep content when the
 *  exam has it, else the ExamEligibility summary verbatim, labelled indicative. */
export function eligibilityView(e: Pick<ExamLike, "code" | "eligibility">): EligibilityView | null {
  const deep = findDeepContent(e.code)?.eligibility;
  if (deep) {
    return {
      age: ageText(deep.ageMin, deep.ageMax),
      qualification: deep.education,
      basis: "checked",
      sourceUrl: deep.source,
      checkedMonth: deep.verifiedAt,
    };
  }
  if (!e.eligibility) return null;
  return {
    age: ageText(e.eligibility.minAge, e.eligibility.maxAge),
    qualification: e.eligibility.educationNote?.trim() || "Not listed",
    basis: "indicative",
    sourceUrl: e.eligibility.officialUrl,
    checkedMonth: null,
  };
}

/** The soonest next exam among the rows, preferring an announced (official /
 *  reported) day over an estimate. */
export function soonestExam<E extends Pick<ExamLike, "nextExam" | "shortName" | "code">>(rows: readonly E[]): E | null {
  const withDay = rows.filter((e) => e.nextExam);
  const announced = withDay.filter((e) => e.nextExam!.tier !== "expected");
  const pool = announced.length > 0 ? announced : withDay;
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => (a.nextExam!.day < b.nextExam!.day ? -1 : a.nextExam!.day > b.nextExam!.day ? 1 : a.shortName.localeCompare(b.shortName)))[0];
}

/** "{N} banking exams on Shishya; next exam: SBI PO on 2 Nov 2026 (official)." */
export function categoryLead(cat: ExamCategory, list: readonly ExamLike[]): string {
  const n = list.length;
  const head = `${n} ${n === 1 ? cat.noun.replace(/s$/, "") : cat.noun} on Shishya`;
  const next = soonestExam(list);
  if (!next) return `${head}; no upcoming exam day is on Shishya's tracker for them yet.`;
  const t = next.nextExam!;
  return t.tier === "expected"
    ? `${head}; none has an announced upcoming exam day on the tracker — the nearest estimate is ${next.shortName} around ${dayLabel(t.day)} (expected — an estimate, not announced).`
    : `${head}; next exam: ${next.shortName} on ${dayLabel(t.day)} (${t.tier}).`;
}

export interface FaqItem {
  q: string;
  a: string;
}

/** The one visible FAQ item (also the page's FAQPage JSON-LD). */
export function categoryFaq(cat: ExamCategory, list: readonly ExamLike[]): FaqItem {
  const q = `When is the next ${cat.noun.replace(/s$/, "")}?`;
  const announced = list
    .filter((e) => e.nextExam && e.nextExam.tier !== "expected")
    .sort((a, b) => (a.nextExam!.day < b.nextExam!.day ? -1 : a.nextExam!.day > b.nextExam!.day ? 1 : 0))
    .slice(0, 3);
  if (announced.length === 0) {
    return {
      q,
      a: `None of the ${list.length} ${cat.noun} on Shishya has an upcoming exam day announced by its conducting body on the tracker yet. Each exam's page lists its expected dates, marked as estimates; confirm on the official website.`,
    };
  }
  const parts = announced.map((e) => `${e.shortName} — ${dayLabel(e.nextExam!.day)} (${e.nextExam!.tier})`);
  return { q, a: `Announced on Shishya's tracker: ${parts.join("; ")}. Official dates come from the conducting body's own site; reported ones from a cited secondary source.` };
}

/** Sitemap rows for the live category hubs, given the loaded rows. No
 *  lastModified: Exam.updatedAt moves on every refresh attempt (it is not a
 *  content change), and a false lastmod is worse than none. */
export function categoryHubSitemapEntriesFrom(base: string, rows: readonly ExamLike[]): MetadataRoute.Sitemap {
  return EXAM_CATEGORIES.filter((cat) => isCategoryLive(examsInCategory(cat, rows))).map((cat) => ({
    url: `${base}/exams/category/${cat.slug}`,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));
}

/** The provider the main session registers in src/lib/sitemap-sections.ts
 *  (EXTRA_SITEMAP_PROVIDERS). The loader is imported lazily so this module
 *  stays DB-free for its tests. */
export async function categoryHubSitemapEntries(base: string): Promise<MetadataRoute.Sitemap> {
  const { getExamListRows } = await import("@/lib/exam-list-rows");
  return categoryHubSitemapEntriesFrom(base, await getExamListRows());
}

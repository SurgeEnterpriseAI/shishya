// /mock-tests — the one crawlable list of Shishya's free mock tests
// (26 Sep 2026, discoverability wave 2, group "mock-tests-hub").
//
// Why: "mock test" is the most-typed intent in our own logs (mpesb, mp tet,
// uksssc, tnpsc, wbcs mocks top the typed demand), yet no crawlable page
// listed the mocks: /mocks/{id} is robots-blocked (per-user state), and the
// resolver sent "free mock test" to the weekly live test. Each exam hub has a
// #mocks section, but nothing tied them together for a search like "free mock
// test" or "state exam mock test".
//
// One page, no per-exam URL family (a page per exam would repeat the hub's
// #mocks section — a scaled near-duplicate). It lists every active real exam
// with at least one shared mock, grouped by category (national) and by state,
// and each row links to /exams/{code}#mocks. Every number is computed here
// from the rows the loader read (src/lib/db/mock-catalogue-db.ts); nothing is
// typed.
//
// What a row says, and why it is true:
//   • mock count — the shared mocks the exam hub lists: userId NULL, not a
//     live-test paper (hidden from the hub until it opens), the hub's first
//     HUB_MOCK_LIST_CAP by createdAt plus the full-pattern paper when the cap
//     dropped it (src/lib/db/exam-cache.ts getExamShared) — and only mocks
//     with at least one question that still exists (NSEP held 20 dangling
//     question ids on 26 Sep 2026);
//   • question count — distinct existing questions across those mocks (not
//     the exam's whole bank, which the hub FAQ counts);
//   • languages — the languages the questions are WRITTEN in (Question.
//     language). The in-test AI translation picker is stated once, on the
//     page, from src/lib/languages.ts — never per row as if it were stored;
//   • next exam — the same decision the hub title makes (hubDateLead,
//     src/lib/hub-title.ts) over the same live rows (-120 to +365 IST days):
//     an announced next day with its tier (official / reported), "under
//     revision" when announced rows contradict each other, a held sitting in
//     the last 60 days, else the month of the earliest upcoming EXPECTED exam
//     day, labelled as an estimate (the hub title never leads with an
//     expected date; the tracker lists it with its tier word — the month is
//     all an estimate is good for), else "not announced yet".
// No pattern numbers (questions / marks / minutes of the real exam): the
// Exam pattern columns have no provenance (26 Sep 2026 quality critic).
//
// Pure: no DB, no Next runtime imports — tests/unit/mock-catalogue.test.ts.

import type { MetadataRoute } from "next";
import { buildTimeline, isUnannouncedAnswerKey, type SourceTier, type TimelineInput, type TimelineRow } from "@/lib/exam-timeline";
import {
  hubDateLead,
  hubTitleDay,
  isCalledOff,
  isNonWrittenStage,
  labelNamesOtherExam,
  type HeldStage,
  type HeldVerb,
  type HubTitleExam,
} from "@/lib/hub-title";
import { INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import { lastModifiedField, type MaybeDate } from "@/lib/sitemap-lastmod";
import { STATES, languageName, stateSlug } from "@/lib/state-info";

// ── Constants ────────────────────────────────────────────────────────────

export const MOCK_TESTS_PATH = "/mock-tests";
export const SITE = "https://shishya.in";
/** getExamShared lists at most this many shared mocks per hub (createdAt asc). */
export const HUB_MOCK_LIST_CAP = 40;
/** The real-pattern full-length paper the hub always lists, even past the cap. */
export const FULL_PATTERN_GENERATOR = "system:full-pattern-v1";
/** Live-test papers stay off the hub until they open (22 Aug 2026). */
export const LIVE_TEST_GENERATOR = "live-test";
/** The hub title's tracker window, in IST days (src/lib/db/exam-cache.ts loadTitleDates). */
export const DATE_WINDOW_PAST_DAYS = 120;
export const DATE_WINDOW_AHEAD_DAYS = 365;

/** Union territories among STATES (ISO codes) — the lead counts them apart. */
export const UNION_TERRITORY_CODES: ReadonlySet<string> = new Set(["AN", "CH", "DL", "DN", "JK", "LA", "LD", "PY"]);

/** National groups, in display order. STATE_LEVEL rows group by state. */
export const CATEGORY_GROUPS: readonly { category: string; label: string }[] = [
  { category: "CIVIL_SERVICES", label: "Civil services" },
  { category: "GOVT_JOBS", label: "Central government exams" },
  { category: "BANKING", label: "Banking" },
  { category: "TEACHING", label: "Teaching" },
  { category: "ENGINEERING", label: "Engineering entrance" },
  { category: "MEDICAL", label: "Medical entrance" },
  { category: "UNIVERSITY", label: "University entrance" },
  { category: "LAW", label: "Law entrance" },
  { category: "MBA", label: "Management (MBA) entrance" },
  { category: "OLYMPIAD", label: "Olympiads" },
  { category: "OTHER", label: "Other exams" },
];

const STATE_CATEGORY = "STATE_LEVEL";
const NO_STATE_KEY = "state-other";

// ── Inputs (what the loader reads) ───────────────────────────────────────

export interface CatalogueExam {
  id: string;
  code: string;
  shortName: string;
  name: string;
  category: string;
  state: string | null;
}

/** One shared mock (userId NULL, not a live-test paper). */
export interface CatalogueMock {
  id: string;
  examId: string;
  generatedBy: string;
  createdAt: Date | string;
  /** Questions of its questionIds that still exist. */
  questionCount: number;
}

/** Distinct existing questions across an exam's listed mocks. */
export interface CatalogueQuestionStat {
  examId: string;
  questions: number;
  /** Question.language values (Language enum: "EN", "HI", …). */
  languages: string[];
}

/** A live tracker row (archivedAt NULL) inside the date window. */
export interface CatalogueDateRow extends TimelineInput {
  examId: string;
  createdAt: Date | string;
}

export interface MockCatalogueInput {
  exams: CatalogueExam[];
  mocks: CatalogueMock[];
  questionStats: CatalogueQuestionStat[];
  dateRows: CatalogueDateRow[];
  /** examId → ExamEligibility.officialUrl (widens the official tier). */
  officialUrls: ReadonlyMap<string, string | null>;
}

// ── The hub's mock list ──────────────────────────────────────────────────

function time(d: Date | string): number {
  const t = (d instanceof Date ? d : new Date(d)).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** The shared mocks one exam hub lists, exactly as getExamShared picks them:
 *  the first HUB_MOCK_LIST_CAP by createdAt (id breaks ties), plus the
 *  full-pattern paper when the cap left it out. Mocks of other exams, live-
 *  test papers and user mocks must already be filtered out by the caller. */
export function hubListedMocks(mocks: readonly CatalogueMock[]): CatalogueMock[] {
  const sorted = [...mocks].sort((a, b) => time(a.createdAt) - time(b.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const listed = sorted.slice(0, HUB_MOCK_LIST_CAP);
  const fp = sorted.find((m) => m.generatedBy === FULL_PATTERN_GENERATOR);
  if (fp && !listed.some((m) => m.id === fp.id)) listed.unshift(fp);
  return listed;
}

/** Mocks this page counts: the hub's list, less any mock whose questions no
 *  longer exist. Grouped by exam id. */
export function countedMocksByExam(mocks: readonly CatalogueMock[]): Map<string, CatalogueMock[]> {
  const byExam = new Map<string, CatalogueMock[]>();
  for (const m of mocks) {
    if (m.generatedBy === LIVE_TEST_GENERATOR) continue;
    byExam.set(m.examId, [...(byExam.get(m.examId) ?? []), m]);
  }
  const out = new Map<string, CatalogueMock[]>();
  for (const [examId, list] of byExam) {
    const counted = hubListedMocks(list).filter((m) => m.questionCount > 0);
    if (counted.length > 0) out.set(examId, counted);
  }
  return out;
}

/** Ids of every counted mock — the loader's second query reads their questions. */
export function countedMockIds(mocks: readonly CatalogueMock[]): string[] {
  return [...countedMocksByExam(mocks).values()].flat().map((m) => m.id);
}

// ── Next exam ────────────────────────────────────────────────────────────

export type AnnouncedTier = Exclude<SourceTier, "expected">;

export type NextExam =
  | { kind: "announced"; date: Date; tier: AnnouncedTier }
  | { kind: "revision" }
  | { kind: "held"; date: Date; tier: AnnouncedTier; verb: HeldVerb; stage: HeldStage }
  | { kind: "expected"; month: string /* YYYY-MM */ }
  | { kind: "none" };

/** The next-exam cell for one exam: the hub title's decision (hubDateLead)
 *  over the same live rows, else the earliest upcoming expected exam day
 *  (month only) that names this exam's own written paper. */
export function nextExamOf(
  rows: readonly CatalogueDateRow[],
  exam: HubTitleExam,
  officialUrl: string | null | undefined,
  now: Date,
): NextExam {
  const live = rows.filter((r) => !isUnannouncedAnswerKey(r, officialUrl));
  const timeline = buildTimeline(live, now, officialUrl);
  const createdAt = new Map(live.map((r) => [r.id, r.createdAt] as const));
  const lead = hubDateLead(timeline, exam, createdAt);
  if (lead.kind === "announced") return { kind: "announced", date: lead.row.date, tier: lead.row.tier as AnnouncedTier };
  if (lead.kind === "revision") return { kind: "revision" };
  if (lead.kind === "held") return { kind: "held", date: lead.row.date, tier: lead.row.tier as AnnouncedTier, verb: lead.verb, stage: lead.stage };
  const expected = timeline.find((r: TimelineRow) => r.kind === "EXAM" && r.tier === "expected" && r.daysFromToday >= 0 && isOwnWrittenPaper(r, exam));
  return expected ? { kind: "expected", month: expected.day.slice(0, 7) } : { kind: "none" };
}

/** An estimate is only worth a month when it is this exam's own written
 *  paper: not another body's exam filed here, not a physical test or
 *  interview, not a sitting the row itself calls off. (Tentative wording is
 *  no reason to drop it — every expected row is an estimate, and says so.) */
function isOwnWrittenPaper(r: TimelineRow, exam: HubTitleExam): boolean {
  return !labelNamesOtherExam(r.label, exam) && !isNonWrittenStage(r.label, exam) && !isCalledOff(r);
}

/** "Dec 2026" from "2026-12". */
export function monthLabel(month: string): string {
  const d = new Date(`${month}-01T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? month : d.toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
}

/** What the row prints: text before the date, the date, its tier badge and
 *  any text after. Every branch names its tier or says nothing is announced. */
export interface NextExamParts {
  lead: string;
  date: string | null;
  tier: SourceTier | null;
  tail: string | null;
}

export function nextExamParts(n: NextExam): NextExamParts {
  switch (n.kind) {
    case "announced":
      return { lead: "Next exam:", date: hubTitleDay(n.date), tier: n.tier, tail: null };
    case "revision":
      return { lead: "Next exam date under revision — see the exam page", date: null, tier: null, tail: null };
    case "held": {
      const who = n.stage === "prelims" ? "Prelims" : n.stage === "mains" ? "Mains" : "Exam";
      return { lead: `${who} ${n.verb}`, date: hubTitleDay(n.date), tier: n.tier, tail: "next date not announced yet" };
    }
    case "expected":
      return { lead: "Next exam expected around", date: monthLabel(n.month), tier: "expected", tail: "not announced yet" };
    default:
      return { lead: "Next exam date not announced yet", date: null, tier: null, tail: null };
  }
}

/** The whole cell as one line of plain text (tests, context files). */
export function nextExamText(n: NextExam): string {
  const p = nextExamParts(n);
  return [p.lead, p.date, p.tier ? `(${p.tier})` : null, p.tail ? `— ${p.tail}` : null].filter(Boolean).join(" ");
}

// ── The catalogue ────────────────────────────────────────────────────────

export interface MockCatalogueRow {
  code: string;
  shortName: string;
  name: string;
  category: string;
  state: string | null;
  mocks: number;
  questions: number;
  /** Language enum codes, English first. */
  languages: string[];
  next: NextExam;
}

export interface MockCatalogueGroup {
  /** Anchor-safe key: "civil-services", "state-mp", "state-other". */
  key: string;
  label: string;
  kind: "category" | "state";
  stateCode: string | null;
  rows: MockCatalogueRow[];
}

export interface MockCatalogueTotals {
  exams: number;
  mocks: number;
  questions: number;
  nationalExams: number;
  stateExams: number;
  /** Distinct states (not union territories) with at least one listed exam. */
  states: number;
  unionTerritories: number;
}

export interface MockCatalogue {
  groups: MockCatalogueGroup[];
  totals: MockCatalogueTotals;
}

function sortLanguages(codes: readonly string[]): string[] {
  return [...new Set(codes.map((c) => c.toUpperCase()))].sort((a, b) =>
    a === "EN" ? -1 : b === "EN" ? 1 : languageName(a).en.localeCompare(languageName(b).en),
  );
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function categoryLabel(category: string): string {
  return (
    CATEGORY_GROUPS.find((g) => g.category === category)?.label ??
    category.toLowerCase().replace(/_/g, " ").replace(/^./, (x) => x.toUpperCase())
  );
}

/** Rows grouped by national category (fixed order, unknown categories after)
 *  and by state (by name), with totals computed from the same rows. */
export function buildMockCatalogue(input: MockCatalogueInput, now: Date = new Date()): MockCatalogue {
  const counted = countedMocksByExam(input.mocks);
  const stats = new Map(input.questionStats.map((s) => [s.examId, s] as const));
  const datesByExam = new Map<string, CatalogueDateRow[]>();
  for (const r of input.dateRows) datesByExam.set(r.examId, [...(datesByExam.get(r.examId) ?? []), r]);

  const rows: MockCatalogueRow[] = [];
  for (const e of input.exams) {
    if (String(e.category).toUpperCase() === "SCHOOL_BOARD") continue;
    const mocks = counted.get(e.id);
    const stat = stats.get(e.id);
    if (!mocks || !stat || stat.questions <= 0) continue;
    rows.push({
      code: e.code,
      shortName: e.shortName,
      name: e.name,
      category: String(e.category),
      state: e.state,
      mocks: mocks.length,
      questions: stat.questions,
      languages: sortLanguages(stat.languages),
      next: nextExamOf(datesByExam.get(e.id) ?? [], e, input.officialUrls.get(e.id) ?? null, now),
    });
  }
  const byName = (a: MockCatalogueRow, b: MockCatalogueRow) => a.shortName.localeCompare(b.shortName) || a.code.localeCompare(b.code);

  const national = rows.filter((r) => r.category !== STATE_CATEGORY);
  const stateRows = rows.filter((r) => r.category === STATE_CATEGORY);
  const known = CATEGORY_GROUPS.map((g) => g.category);
  const extraCategories = [...new Set(national.map((r) => r.category).filter((c) => !known.includes(c)))].sort();

  const groups: MockCatalogueGroup[] = [];
  for (const category of [...known, ...extraCategories]) {
    const list = national.filter((r) => r.category === category).sort(byName);
    if (list.length) groups.push({ key: slug(category), label: categoryLabel(category), kind: "category", stateCode: null, rows: list });
  }
  const stateCodes = [...new Set(stateRows.map((r) => r.state).filter((s): s is string => !!s && !!STATES[s]))].sort((a, b) =>
    STATES[a].name.localeCompare(STATES[b].name),
  );
  for (const code of stateCodes) {
    groups.push({ key: `state-${code.toLowerCase()}`, label: STATES[code].name, kind: "state", stateCode: code, rows: stateRows.filter((r) => r.state === code).sort(byName) });
  }
  const noState = stateRows.filter((r) => !r.state || !STATES[r.state]).sort(byName);
  if (noState.length) groups.push({ key: NO_STATE_KEY, label: "Other state exams", kind: "state", stateCode: null, rows: noState });

  const listed = groups.flatMap((g) => g.rows);
  const states = stateCodes.filter((c) => !UNION_TERRITORY_CODES.has(c)).length;
  return {
    groups,
    totals: {
      exams: listed.length,
      mocks: listed.reduce((a, r) => a + r.mocks, 0),
      questions: listed.reduce((a, r) => a + r.questions, 0),
      nationalExams: listed.filter((r) => r.category !== STATE_CATEGORY).length,
      stateExams: listed.filter((r) => r.category === STATE_CATEGORY).length,
      states,
      unionTerritories: stateCodes.length - states,
    },
  };
}

/** Every row in display order (JSON-LD, tests). */
export function catalogueRows(c: MockCatalogue): MockCatalogueRow[] {
  return c.groups.flatMap((g) => g.rows);
}

/** Link to the exam hub's mock section. */
export function examMocksHref(code: string): string {
  return `/exams/${encodeURIComponent(code)}#mocks`;
}

/** Link to a state's exam index, or null for the "other" group. */
export function stateExamsHref(stateCode: string | null): string | null {
  return stateCode && STATES[stateCode] ? `/exams/state/${stateSlug(stateCode)}` : null;
}

/** "English, Hindi" from Language codes. */
export function languagesText(codes: readonly string[]): string {
  return codes.map((c) => languageName(c).en).join(", ");
}

// ── Copy (every number from the totals) ──────────────────────────────────

export function fmtCount(n: number): string {
  return n.toLocaleString("en-IN");
}

function plural(n: number, one: string, many: string): string {
  return `${fmtCount(n)} ${n === 1 ? one : many}`;
}

/** "from 20 states and 8 union territories" — only the parts that exist. */
function wherePhrase(t: MockCatalogueTotals): string {
  const parts = [
    t.states > 0 ? plural(t.states, "state", "states") : null,
    t.unionTerritories > 0 ? plural(t.unionTerritories, "union territory", "union territories") : null,
  ].filter(Boolean);
  return parts.length ? ` from ${parts.join(" and ")}` : "";
}

/** The page's H1. */
export function mockCatalogueHeading(t: MockCatalogueTotals): string {
  return `Free mock tests for ${plural(t.exams, "exam", "exams")} in India`;
}

/** The <title>. */
export function mockCatalogueTitle(t: MockCatalogueTotals): string {
  return `Free mock tests for ${plural(t.exams, "exam", "exams")} in India — by category and state | Shishya`;
}

/** The computed lead sentence under the H1. */
export function mockCatalogueLead(t: MockCatalogueTotals): string {
  const kinds = [
    t.nationalExams > 0 ? plural(t.nationalExams, "national-level exam", "national-level exams") : null,
    t.stateExams > 0 ? `${plural(t.stateExams, "state exam", "state exams")}${wherePhrase(t)}` : null,
  ].filter(Boolean);
  return (
    `Shishya has ${plural(t.mocks, "free mock test", "free mock tests")} for ${plural(t.exams, "exam", "exams")} in India` +
    (kinds.length ? ` — ${kinds.join(" and ")} —` : "") +
    ` with ${plural(t.questions, "practice question", "practice questions")} across them. ` +
    `Where an exam's next date is known, it is marked official, reported or expected.`
  );
}

/** Meta description: the lead plus the price, clipped at a sentence. */
export function mockCatalogueDescription(t: MockCatalogueTotals): string {
  return clip(`${mockCatalogueLead(t)} Free sign-in, no payment.`, 300);
}

function clip(text: string, max: number): string {
  const s = text.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("."));
  if (end >= Math.floor(max / 2)) return s.slice(0, end + 1);
  const sp = s.lastIndexOf(" ", max - 1);
  return `${s.slice(0, sp > 0 ? sp : max - 1).replace(/[\s,;:—–-]+$/u, "")}…`;
}

/** The page's one FAQ — the same text renders on the page and in FAQPage. */
export function mockCatalogueFaq(t: MockCatalogueTotals): { question: string; answer: string } {
  return {
    question: "Are the mock tests on Shishya free?",
    answer:
      `Yes. All ${plural(t.mocks, "mock test", "mock tests")} listed on this page are free — no subscription, no payment and no credit card. ` +
      // 27 Sep 2026 (integration): "to follow each exam's syllabus topics on
      // Shishya", not "from each exam's official syllabus and notification" —
      // the question generators work from the Subject/Topic tree in our DB,
      // not from an official document.
      `You sign in to take one, so your score is saved. The questions are written with AI to follow each exam's syllabus topics on Shishya, ` +
      `and any question a student reports is re-checked. They are practice tests, not the real exam papers. Inside every test, a language ` +
      `picker translates the questions with AI into ${fmtCount(INDIAN_LANGUAGE_COUNT)} Indian languages.`,
  };
}

// ── Structured data ──────────────────────────────────────────────────────

/** CollectionPage + ItemList (one item per exam, its hub URL) + FAQPage (the
 *  visible FAQ, word for word) + BreadcrumbList. Absolute URLs only. With
 *  nothing listed, only the breadcrumb (the page shows no list and no FAQ). */
export function mockCatalogueJsonLd(c: MockCatalogue, site: string = SITE): Record<string, unknown>[] {
  const url = `${site}${MOCK_TESTS_PATH}`;
  const rows = catalogueRows(c);
  const faq = mockCatalogueFaq(c.totals);
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: site },
      { "@type": "ListItem", position: 2, name: "Mock tests", item: url },
    ],
  };
  // Nothing listed: no list, no FAQ (the page shows neither).
  if (rows.length === 0) return [breadcrumb];
  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: mockCatalogueHeading(c.totals),
      description: mockCatalogueDescription(c.totals),
      url,
      inLanguage: "en-IN",
      isAccessibleForFree: true,
      isPartOf: { "@type": "WebSite", name: "Shishya", url: site },
      publisher: { "@type": "EducationalOrganization", "@id": `${site}/#organization`, name: "Shishya", url: site },
      mainEntity: { "@id": `${url}#exams` },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": `${url}#exams`,
      name: "Exams with free mock tests on Shishya",
      numberOfItems: rows.length,
      itemListOrder: "https://schema.org/ItemListUnordered",
      itemListElement: rows.map((r, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${r.shortName} mock tests`,
        url: `${site}/exams/${encodeURIComponent(r.code)}`,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [{ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } }],
    },
    breadcrumb,
  ];
}

/** JSON for a <script type="application/ld+json">: <, > and & escaped. */
export function jsonLdText(d: object): string {
  return JSON.stringify(d).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

// ── Sitemap (for the main session to add to src/app/sitemap.ts) ──────────

/** The /mock-tests sitemap entry. lastmod = the newest shared mock's
 *  createdAt (src/lib/db/mock-catalogue-db.ts loadNewestSharedMockAt) — a
 *  real change to the list; omitted when unknown, never invented. Tracker
 *  createdAt is NOT used: rows are archived and re-created on every refresh,
 *  so it would claim changes that did not happen. */
export function mockTestsSitemapEntries(base: string, newestMockAt?: MaybeDate): MetadataRoute.Sitemap {
  return [{ url: `${base}${MOCK_TESTS_PATH}`, changeFrequency: "daily", priority: 0.9, ...lastModifiedField(newestMockAt) }];
}

// The "whole paper" links on a PYQ year page (25 Sep 2026).
//
// Students on /exams/{code}/pyq/{year} ask for "the real 200 question paper"
// and "all 150 ques" (TS Police PC, CTET, TNPSC Group IV — the whole-September
// read, 24 Sep). A year set is PYQ-pattern practice, often 20 of the paper's
// questions, and the page says how many it holds. Two things on the site
// answer that ask, and only the exam hub linked them:
//   • the exam's full-length real-pattern mock — the hub's "Full-Length Mock
//     (Real Pattern)" tile (scripts/assemble-full-mocks.ts, generatedBy
//     'system:full-pattern-v1', src/lib/db/exam-cache.ts);
//   • the conducting body's own papers — the hub's "Official papers" block
//     (src/lib/official-papers.ts, #official-papers).
// This file picks which of them a year page links and holds the copy, per
// locale like src/lib/pyq-year-copy.ts (en/hi/te). Honesty:
//   • the PYQ set is never renamed or called the paper — this is a separate
//     block beside it;
//   • the mock's size is the mock's own (its question count and the timer
//     the player runs), never the exam's, and it is called "full-length" only
//     when it holds ≥80% of the real paper — the year page's own rule;
//   • an official file is labelled with its publisher and kind; an answer key
//     is never headed as "the paper".

import type { Locale } from "@/lib/i18n";
import { groupPapersByYear, listingPages, papersForYear, paperYear, type OfficialPaperRow } from "@/lib/official-papers";
import { pyqCopyLocale, type PyqCopyLocale } from "@/lib/pyq-year-copy";

/** Every system full-pattern paper's generatedBy starts with this. */
export const FULL_PATTERN_PREFIX = "system:full-pattern";
/** The one the hub's "Full-Length Mock (Real Pattern)" tile shows. */
export const HUB_FULL_PATTERN = "system:full-pattern-v1";
/** "Full-length" = holds ≥80% of the real paper (FULL_PAPER_RATIO on the year page). */
export const FULL_LENGTH_RATIO = 0.8;
/** The mock player's timer when a mock's config names no duration (src/app/mocks/[id]/page.tsx). */
export const PLAYER_DEFAULT_MIN = 30;
/** Other years' official papers listed on a year page; the rest are on the hub. */
export const OTHER_YEAR_PAPERS_MAX = 3;

export interface FullPatternCandidate {
  id: string;
  generatedBy: string | null;
  questionIds: readonly string[];
  config: unknown;
  createdAt: Date | string;
}

export interface FullPatternLink {
  id: string;
  /** Questions the mock holds. */
  questions: number;
  /** The timer the player runs; null when the stored value is unusable. */
  minutes: number | null;
}

function timeOf(d: Date | string): number {
  const n = d instanceof Date ? d.getTime() : Date.parse(d);
  return Number.isFinite(n) ? n : 0;
}

/** The minutes /mocks/{id} will time: config.durationMin, else the player's default. */
export function mockMinutes(config: unknown): number | null {
  const raw = config && typeof config === "object" ? (config as { durationMin?: unknown }).durationMin : undefined;
  if (raw == null) return PLAYER_DEFAULT_MIN;
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null;
}

/**
 * The full-length real-pattern mock a year page links, or null. Only shared
 * system full-pattern mocks that hold ≥80% of the real paper qualify (an
 * exam whose paper size is unknown has none — "full-length" cannot be
 * checked). The hub's own v1 paper wins; then the newest.
 */
export function pickFullPatternMock(
  candidates: readonly FullPatternCandidate[],
  exam: { totalQuestions: number },
): FullPatternLink | null {
  if (!(exam.totalQuestions > 0)) return null;
  const ok = candidates.filter(
    (m) =>
      typeof m.generatedBy === "string" &&
      m.generatedBy.startsWith(FULL_PATTERN_PREFIX) &&
      m.questionIds.length > 0 &&
      m.questionIds.length >= FULL_LENGTH_RATIO * exam.totalQuestions,
  );
  if (ok.length === 0) return null;
  const best = [...ok].sort(
    (a, b) =>
      Number(b.generatedBy === HUB_FULL_PATTERN) - Number(a.generatedBy === HUB_FULL_PATTERN) ||
      timeOf(b.createdAt) - timeOf(a.createdAt) ||
      a.id.localeCompare(b.id),
  )[0];
  return { id: best.id, questions: best.questionIds.length, minutes: mockMinutes(best.config) };
}

/** A file of the paper itself (with or without its key) — not a key alone, not a listing page. */
export function isQuestionPaper(r: Pick<OfficialPaperRow, "kind">): boolean {
  return r.kind === "question paper" || r.kind === "question paper with answer key";
}

/**
 * The English sentence the page's FAQ JSON-LD adds about this year's official
 * file (25 Sep 2026). It said "The original {year} paper is published by …"
 * even when the year's only file was an answer key (CTET 2024 and 20 more
 * live years), so answer engines sent students to a key as "the paper",
 * while the visible heading already called it the answer key. The paper
 * is named only when there is a question paper; a key-only year names the
 * answer key; no file, no sentence.
 */
export function officialYearFaqNote(sameYear: readonly OfficialPaperRow[], year: number): string {
  const paperRow = sameYear.find(isQuestionPaper);
  if (paperRow) return ` The original ${year} paper is published by ${paperRow.publisher}: ${paperRow.url}`;
  const keyRow = sameYear.find((r) => r.kind === "answer key");
  if (keyRow) return ` The official ${year} answer key is published by ${keyRow.publisher}: ${keyRow.url}`;
  return "";
}

export interface OfficialPaperLinks {
  /** This year's files, question papers first — the page's "original {year} paper" block. */
  sameYear: OfficialPaperRow[];
  /** This year has a question paper, not only an answer key. */
  sameYearHasPaper: boolean;
  /** When this year has no question paper: other years' question papers, latest first, capped. */
  otherYears: OfficialPaperRow[];
  /** The hub lists question papers this page does not — link its #official-papers block. */
  moreOnHub: boolean;
  /** The body's listing pages, when this page links no question paper file at all. */
  listings: OfficialPaperRow[];
}

/**
 * Which official rows a year page links: that year's first; when that year
 * has no question paper, the latest other years' question papers (answer
 * keys alone do not answer "the real paper"); when there is no paper file at
 * all, the body's listing pages.
 */
export function pickOfficialPaperLinks(
  rows: readonly OfficialPaperRow[],
  year: number,
  max: number = OTHER_YEAR_PAPERS_MAX,
): OfficialPaperLinks {
  const groups = groupPapersByYear(rows);
  const y = String(year);
  const sameYear = papersForYear(rows, year);
  const sameYearHasPaper = sameYear.some(isQuestionPaper);
  const otherPapers = groups
    .filter((g) => paperYear(g.year) !== y)
    .flatMap((g) => g.rows)
    .filter(isQuestionPaper);
  const otherYears = sameYearHasPaper ? [] : otherPapers.slice(0, Math.max(0, max));
  const shownPapers = sameYear.filter(isQuestionPaper).length + otherYears.length;
  const allPapers = groups.flatMap((g) => g.rows).filter(isQuestionPaper).length;
  const listings = sameYearHasPaper || otherYears.length > 0 ? [] : listingPages(rows);
  return { sameYear, sameYearHasPaper, otherYears, moreOnHub: allPapers > shownPapers, listings };
}

/** Anything for the whole-paper block to show; false → the block renders nothing. */
export function hasWholePaperLinks(fullMock: FullPatternLink | null, official: OfficialPaperLinks): boolean {
  return !!fullMock || official.otherYears.length > 0 || official.listings.length > 0 || official.moreOnHub;
}

/** Distinct publishers, in order — the heading names who published the files. */
export function publishersOf(rows: readonly Pick<OfficialPaperRow, "publisher">[]): string {
  return [...new Set(rows.map((r) => r.publisher).filter(Boolean))].join(" · ");
}

/**
 * The English sentence the page's FAQ JSON-LD appends (structured data stays
 * English in every locale). It points to the hub tile, not /mocks/{id}:
 * robots.txt keeps crawlers out of /mocks/.
 */
export function fullMockFaqNote(link: FullPatternLink | null, examCode: string): string {
  if (!link) return "";
  const size = link.minutes ? `${link.questions} questions, ${link.minutes} minutes` : `${link.questions} questions`;
  return ` For a whole paper in one sitting, Shishya has a free full-length mock in the real pattern (${size}): the "Full-Length Mock (Real Pattern)" tile at https://shishya.in/exams/${examCode}.`;
}

export interface PyqFullPaperCopy {
  /** Same-year official block heading when that year has only answer keys. */
  officialKeyHeading: string;
  /** The full-length mock link. */
  fullMock: string;
  fullMockNoMin: string;
  /** What the mock is — Shishya's own questions, never the original paper. */
  fullMockNote: string;
  /** Other years' official papers. */
  otherYearsHeading: string;
  /** Link to the hub's Official papers block. */
  allOfficial: string;
}

export const PYQ_FULL_PAPER_COPY: Readonly<Record<PyqCopyLocale, PyqFullPaperCopy>> = {
  en: {
    officialKeyHeading: "The official {year} answer key, as {publisher} published it",
    fullMock: "Full-length mock in the real pattern — {n} questions, {m} minutes",
    fullMockNoMin: "Full-length mock in the real pattern — {n} questions",
    fullMockNote: "Shishya's own practice questions, set out subject by subject like the real paper — not the original paper.",
    otherYearsHeading: "Official papers from other years, as {publisher} published them",
    allOfficial: "All official {short} papers →",
  },
  hi: {
    officialKeyHeading: "{year} की आधिकारिक उत्तर कुंजी, जैसी {publisher} ने प्रकाशित की",
    fullMock: "असली पैटर्न में पूरी लंबाई का मॉक — {n} सवाल, {m} मिनट",
    fullMockNoMin: "असली पैटर्न में पूरी लंबाई का मॉक — {n} सवाल",
    fullMockNote: "Shishya के अपने प्रैक्टिस सवाल, असली पेपर की तरह विषय-दर-विषय — यह असली पेपर नहीं है।",
    otherYearsHeading: "दूसरे वर्षों के आधिकारिक पेपर, जैसे {publisher} ने प्रकाशित किए",
    allOfficial: "{short} के सभी आधिकारिक पेपर →",
  },
  te: {
    officialKeyHeading: "{year} అధికారిక ఆన్సర్ కీ, {publisher} ప్రచురించిన విధంగా",
    fullMock: "అసలు ప్యాటర్న్‌లో పూర్తి నిడివి మాక్ — {n} ప్రశ్నలు, {m} నిమిషాలు",
    fullMockNoMin: "అసలు ప్యాటర్న్‌లో పూర్తి నిడివి మాక్ — {n} ప్రశ్నలు",
    fullMockNote: "Shishya సొంత ప్రాక్టీస్ ప్రశ్నలు, అసలు పేపర్‌లాగే సబ్జెక్టుల వారీగా — ఇది అసలు పేపర్ కాదు.",
    otherYearsHeading: "ఇతర సంవత్సరాల అధికారిక పేపర్లు, {publisher} ప్రచురించిన విధంగా",
    allOfficial: "{short} అధికారిక పేపర్లన్నీ →",
  },
};

export function pyqFullPaperCopy(locale: Locale | string | null | undefined): PyqFullPaperCopy {
  return PYQ_FULL_PAPER_COPY[pyqCopyLocale(locale)];
}

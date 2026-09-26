// CBSE board-exam hub helpers (26 Sep 2026, G4 honest page families).
//
// Pure functions over src/data/board-exams.ts for
// /schooling/cbse/class-{10,12}/board-exam: the title (built from what the
// hub actually holds — "Date Sheet" only once an official date-sheet row
// exists, the quality critic's rule), the lead sentence, the indexability
// floor and the sitemap rows. No DB, no Next runtime (tests/unit/board-exams.test.ts).

import type { MetadataRoute } from "next";
import { BOARD_EXAM_HUBS, boardExamLinks, type BoardExamHub, type SamplePaper } from "@/data/board-exams";

/** A hub is indexable only with at least this many verified official links. */
export const BOARD_EXAM_MIN_LINKS = 10;

/** The subjects most students take, shown first — names exactly as CBSE's
 *  tables print them (the test fails if one stops matching a row). */
export const BOARD_EXAM_MAIN_SUBJECTS: Readonly<Record<BoardExamHub["cls"], readonly string[]>> = {
  10: [
    "Mathematics (Standard)",
    "Mathematics (Basic)",
    "Science",
    "Social Science",
    "English (Language & Literature)",
    "English (Communicative)",
    "Hindi A",
    "Hindi B",
    "Sanskrit",
    "Computer Application",
  ],
  12: [
    "Physics",
    "Chemistry",
    "Mathematics",
    "Applied Mathematics",
    "Biology",
    "Accountancy",
    "Business Studies",
    "Economics",
    "English Core",
    "Hindi Core",
    "History",
    "Geography",
    "Political Science",
    "Computer Science",
    "Informatics Practices",
    "Psychology",
    "Sociology",
    "Physical Education",
  ],
};

/** The hub's sample papers split into the main subjects (in the order above)
 *  and every other subject (in CBSE's table order). */
export function splitSamplePapers(h: BoardExamHub): { main: SamplePaper[]; other: SamplePaper[] } {
  const order = BOARD_EXAM_MAIN_SUBJECTS[h.cls];
  const main = order.flatMap((name) => h.samplePapers.papers.filter((p) => p.subject === name));
  const other = h.samplePapers.papers.filter((p) => !order.includes(p.subject));
  return { main, other };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
function day(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function boardExamPath(h: Pick<BoardExamHub, "board" | "cls">): string {
  return `/schooling/${h.board}/class-${h.cls}/board-exam`;
}

/** Title from the hub's contents: sample papers / marking schemes only when
 *  CBSE has published them, "Date Sheet" only when an official row exists. */
export function boardExamTitle(h: BoardExamHub): string {
  const core = `CBSE Class ${h.cls} Board Exam ${h.examYear}`;
  const papers = h.samplePapers.papers.length > 0;
  const what = papers ? `Official Sample Papers & Marking Schemes ${h.session}` : `Official Links ${h.session}`;
  const dateSheet = h.dateSheet.tier === "official" ? ", Date Sheet" : "";
  return `${core}: ${what}${dateSheet}`;
}

/** The sentence the page leads with, computed from the rows. */
export function boardExamLead(h: BoardExamHub): string {
  const n = h.samplePapers.papers.length;
  const checked = day(h.samplePapers.page.checkedOn);
  const papers =
    n > 0
      ? `CBSE has published ${h.session} sample question papers with marking schemes for ${n} Class ${h.cls} ${n === 1 ? "subject" : "subjects"} — all linked below from cbseacademic.nic.in (checked ${checked}).`
      : `CBSE has not published ${h.session} sample question papers for Class ${h.cls} on cbseacademic.nic.in yet (checked ${checked}).`;
  const sheet =
    h.dateSheet.tier === "official"
      ? ` The ${h.examYear} date sheet is out: ${h.dateSheet.label}.`
      : ` The ${h.examYear} date sheet is not announced yet — cbse.gov.in shows none as of ${day(h.dateSheet.checkedOn)}.`;
  return papers + sheet;
}

/** Meta description: the lead, plus what else the page links. */
export function boardExamDescription(h: BoardExamHub): string {
  const years = h.previousPapers.years;
  const range = years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : years.join("");
  return `${boardExamLead(h)} Also: the ${h.session} curriculum, CBSE's previous-year papers page (${range}) and the official result portals. Links only — every file stays on CBSE's site.`;
}

export function isBoardExamIndexable(h: BoardExamHub): boolean {
  return boardExamLinks(h).length >= BOARD_EXAM_MIN_LINKS;
}

/** The newest checkedOn among the hub's links — a real day. */
export function boardExamLastChecked(h: BoardExamHub): string {
  return boardExamLinks(h).reduce((m, l) => (l.checkedOn > m ? l.checkedOn : m), h.samplePapers.page.checkedOn);
}

/** Sitemap rows for the indexable hubs (the main session wires this into
 *  src/lib/sitemap-sections.ts). lastModified = the newest official check. */
export function boardExamSitemapEntries(base: string): MetadataRoute.Sitemap {
  return BOARD_EXAM_HUBS.filter(isBoardExamIndexable).map((h) => ({
    url: `${base}${boardExamPath(h)}`,
    lastModified: boardExamLastChecked(h),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
}

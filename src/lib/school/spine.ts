// School curriculum spine — loaders (25 Sep 2026).
//
// Why: one place that reads the official NCERT / CBSE / CISCE structure
// committed under data/curriculum/ (built from ncert.nic.in, cbseacademic.
// nic.in and cisce.org on 25 Sep 2026 — see data/curriculum/README.md), so the
// seed script, the tests and later the school pages and tutor all agree on the
// same codes. Pure data + pure functions: no DB, no network, no AI.
//
// Content key is the NCERT textbook, not the board (product.md §1.2): CBSE
// and every NCERT-adopting state share the NCERT_Cnn trees; CBSE's own file
// only says which CBSE subject uses which NCERT book, with the evidence.

import type { CbseBand, CbseFile, CbseNcertLink, CisceFile, CisceLevel, NcertBook, NcertChapter, NcertClassFile, NcertSubject } from "./types";

import c01 from "../../../data/curriculum/ncert/class-01.json";
import c02 from "../../../data/curriculum/ncert/class-02.json";
import c03 from "../../../data/curriculum/ncert/class-03.json";
import c04 from "../../../data/curriculum/ncert/class-04.json";
import c05 from "../../../data/curriculum/ncert/class-05.json";
import c06 from "../../../data/curriculum/ncert/class-06.json";
import c07 from "../../../data/curriculum/ncert/class-07.json";
import c08 from "../../../data/curriculum/ncert/class-08.json";
import c09 from "../../../data/curriculum/ncert/class-09.json";
import c10 from "../../../data/curriculum/ncert/class-10.json";
import c11 from "../../../data/curriculum/ncert/class-11.json";
import c12 from "../../../data/curriculum/ncert/class-12.json";
import c1112 from "../../../data/curriculum/ncert/class-11-12-combined.json";
import cbseJson from "../../../data/curriculum/cbse/cbse-2026-27.json";
import cisceJson from "../../../data/curriculum/cisce/cisce-2026-27.json";

/** Every NCERT index class file, in index order (the XI & XII combined set last). */
export const NCERT_CLASS_FILES: readonly NcertClassFile[] = [
  c01, c02, c03, c04, c05, c06, c07, c08, c09, c10, c11, c12, c1112,
] as unknown as NcertClassFile[];

export const CBSE: CbseFile = cbseJson as unknown as CbseFile;
export const CISCE: CisceFile = cisceJson as unknown as CisceFile;

export const SCHOOL_CLASSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Exam.code of the NCERT (curriculum, class) container, e.g. NCERT_C09. */
export function ncertExamCode(cls: number): string {
  return `NCERT_C${pad2(cls)}`;
}

/** Exam.code of the CISCE (curriculum, class) container, e.g. CISCE_C10. */
export function cisceExamCode(cls: number): string {
  return `CISCE_C${pad2(cls)}`;
}

/** Topic.code of a chapter: the NCERT book code plus the chapter PDF's own
 *  number (iemh1.ch01 = https://ncert.nic.in/textbook/pdf/iemh101.pdf), so a
 *  code names exactly one official file. NCERT has reused a book code for a
 *  new book (iemh1 was the old Class 9 Mathematics and is Ganita Manjari
 *  from 2026-27); pass an editionTag then, so old content never silently
 *  re-attaches to a different chapter. */
export function ncertTopicCode(bookCode: string, pdfSeq: number, editionTag?: string): string {
  return `${bookCode}${editionTag ? `-${editionTag}` : ""}.ch${pad2(pdfSeq)}`;
}

/** Topic.code of the k-th piece printed inside a chapter PDF (26 Sep 2026):
 *  jeff1.ch01.p01 = "Dust of Snow", inside the "A Letter to God" PDF. A child
 *  Topic of its chapter (product.md §1.2: sections are child Topics). */
export function ncertPieceCode(chapterCode: string, k: number): string {
  return `${chapterCode}.p${pad2(k)}`;
}

/** Upper snake case of a subject name ("Physical Education and Well Being" →
 *  PHYSICAL_EDUCATION_AND_WELL_BEING; "&" reads as "and"). Same rule as
 *  data/curriculum/tools/ncert_spine.py subject_code(). */
export function subjectCodeFor(name: string): string {
  return name.replace(/&/g, " and ").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/** The class file as NCERT lists it (11 and 12 WITHOUT the combined set). */
export function ncertClassFile(cls: number): NcertClassFile | undefined {
  return NCERT_CLASS_FILES.find((f) => f.indexClassValue === cls);
}

/** Subjects for one class, with the "Class XI & XII Combined" books (Hindi,
 *  Sanskrit, Urdu) merged into both 11 and 12 under the same subject. */
export function ncertSubjectsForClass(cls: number): NcertSubject[] {
  const own = ncertClassFile(cls);
  if (!own) return [];
  const subjects = own.subjects.map((s) => ({ ...s, books: [...s.books] }));
  if (cls === 11 || cls === 12) {
    const combined = NCERT_CLASS_FILES.find((f) => f.classes.length > 1);
    for (const cs of combined?.subjects ?? []) {
      const into = subjects.find((s) => s.code === cs.code);
      if (into) into.books.push(...cs.books);
      else subjects.push({ ...cs, books: [...cs.books] });
    }
  }
  return subjects;
}

/** Every book with its subject, for one class (merged view). */
export function ncertBooksForClass(cls: number): { subject: NcertSubject; book: NcertBook }[] {
  return ncertSubjectsForClass(cls).flatMap((subject) => subject.books.map((book) => ({ subject, book })));
}

/** Find a chapter by its topic code within a class. */
export function ncertChapterByTopicCode(cls: number, topicCode: string): { book: NcertBook; chapter: NcertChapter } | null {
  for (const { book } of ncertBooksForClass(cls)) {
    for (const chapter of book.chapters) {
      if (ncertTopicCode(book.code, chapter.pdfSeq) === topicCode) return { book, chapter };
    }
  }
  return null;
}

const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "of", "on", "or", "the", "to", "with"]);
const ROMAN = new Set(["II", "III", "IV", "VI", "VII", "VIII", "IX", "XI", "XII"]);

/** NCERT prints some contents pages in capitals ("WORK, ENERGY AND POWER").
 *  For display only, turn an ALL-CAPS title into title case; any title that
 *  already has lowercase letters is returned untouched. The spine keeps the
 *  printed text (tests match it against NCERT's page). */
export function displayTitle(title: string): string {
  if (/[a-z]/.test(title) || !/[A-Z].*[A-Z]/.test(title)) return title;
  let first = true;
  return title.replace(/[A-Za-z]+/g, (word: string, offset: number) => {
    const prev = offset > 0 ? title[offset - 1] : " ";
    const lower = word.toLowerCase();
    let out: string;
    if (ROMAN.has(word)) out = word;
    else if (!first && SMALL_WORDS.has(lower) && /\s/.test(prev)) out = lower;
    else if (/['’]/.test(prev)) out = lower; // NEWTON'S -> Newton's
    else out = lower.charAt(0).toUpperCase() + lower.slice(1);
    first = false;
    return out;
  });
}

/** CBSE band (scheme + subjects) covering a class. */
export function cbseBandForClass(cls: number): CbseBand | undefined {
  return CBSE.bands.find((b) => b.classes.includes(cls));
}

/** The classes NCERT's index files a book under ([11, 12] for the combined set). */
export function ncertClassesOfBook(code: string): number[] {
  for (const f of NCERT_CLASS_FILES) {
    if (f.subjects.some((s) => s.books.some((b) => b.code === code))) return f.classes;
  }
  return [];
}

/** The classes CBSE teaches a linked NCERT book in. 26 Sep 2026: the XI-XII
 *  band carries this per link (`classes`), because CBSE's course structure
 *  and NCERT's index disagree for Economics — NCERT files Indian Economic
 *  Development under XI and Introductory Microeconomics under XII, CBSE
 *  teaches Statistics + Microeconomics in XI and Macroeconomics + Indian
 *  Economic Development in XII. Single-class bands use the band's class. */
export function cbseClassesOfLink(band: CbseBand, link: CbseNcertLink): number[] {
  if (link.classes?.length) return link.classes;
  if (band.classes.length === 1) return band.classes;
  return ncertClassesOfBook(link.book).filter((c) => band.classes.includes(c));
}

/** CBSE subjects of a class that name at least one NCERT book taught in that
 *  class: `books` = prescribed NCERT books, `referenceBooks` = NCERT books
 *  CBSE names only as a reference (e.g. Biotechnology, whose prescribed
 *  textbook is CBSE's own). */
export function cbseSubjectsWithNcertBooks(cls: number): { name: string; syllabusUrl: string; books: string[]; referenceBooks: string[] }[] {
  const band = cbseBandForClass(cls);
  if (!band) return [];
  return (band.subjects ?? [])
    .map((s) => {
      const links = (s.ncertBooks ?? []).filter((l) => cbseClassesOfLink(band, l).includes(cls));
      return {
        name: s.name,
        syllabusUrl: s.syllabusUrl,
        books: links.filter((l) => l.method !== "reference-only").map((l) => l.book),
        referenceBooks: links.filter((l) => l.method === "reference-only").map((l) => l.book),
      };
    })
    .filter((s) => s.books.length > 0 || s.referenceBooks.length > 0);
}

/** CISCE level (curriculum document / ICSE / ISC year) covering a class. */
export function cisceLevelForClass(cls: number): CisceLevel | undefined {
  return CISCE.levels.find((l) => l.classes.includes(cls));
}

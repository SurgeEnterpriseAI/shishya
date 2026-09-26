// School books — the official book identity behind a DB chapter (26 Sep 2026).
//
// Why: the seeded rows carry the chapter (Topic.code = NCERT book code +
// PDF number, Topic.name = printed title) and its official PDF link, but not
// the BOOK: its title as NCERT's index lists it, the index page to open it,
// and its other-language editions. Those facts live in the committed spine
// (data/curriculum/, read through src/lib/school/spine.ts) — official pages
// only, nothing typed. Pure, memoised per class; no DB.

import type { CisceLevel, NcertBook, NcertChapter } from "./types";
import { cbseSubjectsWithNcertBooks, cisceLevelForClass, displayTitle, ncertSubjectsForClass, ncertTopicCode } from "./spine";
import { schoolBookCodeOf } from "./surface";

export interface SchoolBookEdition {
  code: string;
  title: string;
  /** ISO 639 as NCERT's index names the medium. */
  language: string;
  bookUrl: string;
}

export interface SchoolBookRef {
  code: string;
  /** Title exactly as NCERT's index lists it. */
  title: string;
  language: string;
  /** NCERT's index page for the book (textbook.php?code=0-N). */
  bookUrl: string;
  /** Chapters NCERT's page lists for the book (resolved + unresolved). */
  listedChapterCount: number;
  /** Chapters whose title and PDF were both verified (the ones with a DB Topic). */
  resolvedChapterCount: number;
  editions: SchoolBookEdition[];
}

export interface SchoolChapterMeta {
  bookCode: string;
  bookTitle: string;
  /** Number as printed in the contents ("8" for Physics Part II's first chapter); null when NCERT prints none. */
  number: string | null;
  /** What NCERT calls the unit: chapter / unit / lesson / theme … */
  kind: string;
  /** The official chapter PDF on ncert.nic.in. */
  pdfUrl: string;
}

/** Language names for the edition list, keyed by the spine's ISO codes. */
export const BOOK_LANGUAGE_NAMES: Record<string, string> = {
  en: "English", hi: "Hindi", ur: "Urdu", sa: "Sanskrit", as: "Assamese", bn: "Bengali", brx: "Bodo", doi: "Dogri",
  gu: "Gujarati", kn: "Kannada", ks: "Kashmiri", kok: "Konkani", mai: "Maithili", ml: "Malayalam", mni: "Manipuri",
  mr: "Marathi", ne: "Nepali", or: "Odia", pa: "Punjabi", sat: "Santhali", sd: "Sindhi", ta: "Tamil", te: "Telugu",
};

export function bookLanguageName(code: string): string {
  return BOOK_LANGUAGE_NAMES[code] ?? code;
}

function toRef(b: NcertBook): SchoolBookRef {
  return {
    code: b.code,
    title: b.title,
    language: b.language,
    bookUrl: b.bookUrl,
    listedChapterCount: b.chapters.length + b.unresolved.length,
    resolvedChapterCount: b.chapters.length,
    editions: b.editions.filter((e) => Boolean(e.bookUrl)).map((e) => ({ code: e.code, title: e.title, language: e.language, bookUrl: e.bookUrl })),
  };
}

const chapterIndexByClass = new Map<number, Map<string, { book: NcertBook; chapter: NcertChapter }>>();

/** Topic.code → (book, chapter) for one class, built once. */
function chapterIndex(cls: number): Map<string, { book: NcertBook; chapter: NcertChapter }> {
  let idx = chapterIndexByClass.get(cls);
  if (idx) return idx;
  idx = new Map();
  for (const s of ncertSubjectsForClass(cls)) {
    for (const book of s.books) {
      for (const chapter of book.chapters) idx.set(ncertTopicCode(book.code, chapter.pdfSeq), { book, chapter });
    }
  }
  chapterIndexByClass.set(cls, idx);
  return idx;
}

/** The official books NCERT's index lists under one subject of a class
 *  (Subject.code = subjectCodeFor(name) at seed time). Empty for CISCE. */
export function ncertBooksForSubject(cls: number, subjectCode: string): SchoolBookRef[] {
  return ncertSubjectsForClass(cls).find((s) => s.code === subjectCode)?.books.map(toRef) ?? [];
}

/** Book title, printed number, kind and official PDF of one seeded chapter;
 *  null when the code is not in the spine for that class. */
export function ncertChapterMeta(cls: number, topicCode: string): SchoolChapterMeta | null {
  const hit = chapterIndex(cls).get(topicCode);
  if (!hit) return null;
  return {
    bookCode: hit.book.code,
    bookTitle: hit.book.title,
    number: hit.chapter.number,
    kind: hit.chapter.kind,
    pdfUrl: hit.chapter.pdfUrl,
  };
}

/** The book of a chapter code, from the subject's book list (never the
 *  spine's chapter list, so a code the spine no longer has still names its
 *  book by prefix). */
export function bookOfChapter(books: readonly SchoolBookRef[], topicCode: string): SchoolBookRef | undefined {
  const code = schoolBookCodeOf(topicCode);
  return books.find((b) => b.code === code);
}

/** "Chapter 3" / "Unit 2" / "Lesson 4" as NCERT names the unit; "" when the
 *  book prints no number. */
export function chapterLabel(meta: Pick<SchoolChapterMeta, "number" | "kind"> | null): string {
  if (!meta?.number) return "";
  const kind = meta.kind ? meta.kind[0].toUpperCase() + meta.kind.slice(1) : "Chapter";
  return `${kind} ${meta.number}`;
}

export interface OfficialLink {
  title: string;
  url: string;
}

/** CBSE's 2026-27 syllabus PDFs for the CBSE subjects that prescribe any of
 *  these NCERT books in this class (data/curriculum/cbse/, evidence per link). */
export function cbseSyllabusLinksForBooks(cls: number, bookCodes: readonly string[]): OfficialLink[] {
  const codes = new Set(bookCodes);
  const out: OfficialLink[] = [];
  for (const s of cbseSubjectsWithNcertBooks(cls)) {
    if (!s.syllabusUrl) continue;
    if (![...s.books, ...s.referenceBooks].some((b) => codes.has(b))) continue;
    if (out.some((o) => o.url === s.syllabusUrl)) continue;
    out.push({ title: `CBSE ${s.name} syllabus 2026-27 (PDF)`, url: s.syllabusUrl });
  }
  return out;
}

/** 26 Sep 2026 (integrator): how many of these subjects have a syllabus PDF
 *  of their own on cisce.org. Classes 1-8 have none (the council publishes
 *  one curriculum document per stage), ICSE / ISC classes have one per
 *  subject — the page copy says which, computed here, never typed. */
export function cisceSubjectsWithPdf(cls: number, subjectNames: readonly string[]): number {
  return subjectNames.filter((name) => cisceSubjectLinks(cls, name).length > 0).length;
}

/** CISCE's official documents for one subject of a class: the subject's
 *  syllabus PDFs as cisce.org lists them (matched by the seeded
 *  Subject.name, which is CISCE's own wording). */
export function cisceSubjectLinks(cls: number, subjectName: string): OfficialLink[] {
  const level = cisceLevelForClass(cls);
  const s = level?.subjects.find((x) => x.name === subjectName);
  return (s?.syllabusUrls ?? []).map((url, i, all) => ({
    title: all.length > 1 ? `CISCE ${subjectName} syllabus, document ${i + 1} (PDF)` : `CISCE ${subjectName} syllabus (PDF)`,
    url,
  }));
}

/** The CISCE level (curriculum document / ICSE year / ISC year) of a class:
 *  its stage name and regulations / curriculum document. */
export function cisceClassDocuments(cls: number): { stage: string; links: OfficialLink[] } | null {
  const level: CisceLevel | undefined = cisceLevelForClass(cls);
  if (!level) return null;
  const links: OfficialLink[] = [];
  if (level.regulations?.url) links.push({ title: `CISCE ${level.examinationYear ? `${level.examinationYear} ` : ""}regulations and syllabuses (PDF)`, url: level.regulations.url });
  if (level.document?.url && !links.some((l) => l.url === level.document?.url)) links.push({ title: `${level.document.title} (PDF)`, url: level.document.url });
  if (level.syllabusPage && !links.some((l) => l.url === level.syllabusPage)) links.push({ title: "CISCE syllabus page", url: level.syllabusPage });
  const stage = level.examinationYear ? `${level.stage} ${level.examinationYear}` : level.stage;
  return { stage, links };
}

/** Printed titles come in capitals on some contents pages; the DB holds the
 *  display form already (seed-plan.ts), this is for spine-only strings. */
export { displayTitle };

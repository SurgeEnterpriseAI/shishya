// School curriculum spine — types (25 Sep 2026).
//
// Why: the school expansion (NCERT/CBSE first, then CISCE, then state
// boards) keys content by the official textbook, class by class. The spine
// files under data/curriculum/ are built mechanically from the official
// sites (ncert.nic.in, cbseacademic.nic.in, cisce.org) and record where every
// fact came from; these types mirror those files exactly. Nothing here is
// shown on a page yet — the rows seeded from it are created inactive.

/** ISO 639 codes as NCERT's index names the medium ("und" = not stated). */
export type BookLanguage =
  | "en" | "hi" | "ur" | "sa" | "as" | "bn" | "brx" | "doi" | "gu" | "kn" | "ks" | "kok" | "mai" | "ml" | "mni"
  | "mr" | "ne" | "or" | "pa" | "sat" | "sd" | "ta" | "te" | "und";

/** What NCERT itself calls the unit a chapter PDF holds. */
export type ChapterKind = "chapter" | "unit" | "lesson" | "theme" | "project" | "section";

/** 26 Sep 2026: a piece NCERT prints INSIDE a chapter PDF — a poem after a
 *  prose lesson (First Flight's "Dust of Snow" sits in the "A Letter to God"
 *  PDF), a lesson of a Poorvi unit, or a numbered part ("I. His First
 *  Flight"). Verbatim from the book's contents page; the chapter-checks TSV
 *  records the PDF pages that carry it. */
export interface NcertPiece {
  /** "piece" = its own contents entry with a page number; "part" = a
   *  numbered/bulleted part of the chapter's lesson. */
  kind: "piece" | "part";
  /** Part number as printed ("I", "II"), when printed. */
  n?: string;
  title: string;
  /** Start page as printed in the contents. */
  page?: string;
}

export interface NcertChapter {
  /** 1-based position in the book's chapter list on ncert.nic.in. */
  seq: number;
  /** The NN in https://ncert.nic.in/textbook/pdf/<code><NN>.pdf. */
  pdfSeq: number;
  pdfUrl: string;
  /** Number as printed in the contents ("8" for Physics Part II's first
   *  chapter, "IV" for History themes); null when NCERT prints none. */
  number: string | null;
  kind: ChapterKind;
  /** Verbatim from the book's contents page (or the chapter PDF's first
   *  lines when titleSource is "chapter-pdf"). */
  title: string;
  subtitle?: string;
  /** Grouping printed in the contents, e.g. "Poetry", "Unit 2: Life Around Us". */
  section?: string;
  titleSource: "contents" | "chapter-pdf";
  /** 25 Sep check, set when the chapter PDF was downloaded: the title's words
   *  are somewhere on pages 1-2 (a substring test — a cut-short title passes
   *  it too; false often means the heading is an image, not a mismatch). */
  titleOnFirstPages?: boolean;
  /** 26 Sep check (supersedes titleOnFirstPages where present): "exact" =
   *  pages 1-2 print the whole title as the heading; "contained" = its words
   *  are there but not as the whole heading; "no" = not in the text layer. */
  titleHeading?: "exact" | "contained" | "no";
  /** Pieces printed inside this chapter's PDF (poems, unit lessons, parts). */
  includes?: NcertPiece[];
}

export interface NcertUnresolvedChapter {
  seq: number;
  pdfSeq: number;
  pdfUrl: string;
  number?: string | null;
  /** Known title whose PDF did not return 200 (never a guess). */
  titleCandidate?: string;
  reason: string;
}

export interface NcertEdition {
  code: string;
  title: string;
  language: BookLanguage;
  languageFrom?: "title" | "code";
  chapterCount: number;
  bookUrl: string;
  note?: string;
}

export interface NcertBook {
  code: string;
  /** Title exactly as NCERT's index lists it. */
  title: string;
  language: BookLanguage;
  indexValue: string;
  bookUrl: string;
  /** The N in textbook.php?<code>=0-N. */
  indexChapterCount: number;
  /** How many chapter links the book page actually lists (differs for a few
   *  sectioned readers, e.g. Hornbill lists 12 against 0-14). */
  listedChapterCount: number;
  zipUrl: string;
  prelims: {
    url: string;
    sha256: string;
    fetchedAt: string;
    printedSession: string | null;
    firstEdition: string | null;
    contentsSnapshot: string;
  };
  chapters: NcertChapter[];
  unresolved: NcertUnresolvedChapter[];
  /** Same book in other media, linked by NCERT code stem (e.g. iemh1 → ihmh1). */
  editions: NcertEdition[];
}

export interface NcertSubject {
  /** Subject name exactly as NCERT's index lists it. */
  name: string;
  /** Upper snake case of the name — the Subject.code in the DB. */
  code: string;
  books: NcertBook[];
  unlinkedEditions?: NcertEdition[];
  notYetPublished?: { title: string; indexValue: string }[];
}

export interface NcertClassFile {
  curriculum: "NCERT";
  /** tclass value on textbook.php (13 = "Class XI & XII Combined"). */
  indexClassValue: number;
  classes: number[];
  classLabel: string;
  source: { indexUrl: string; snapshot: string; snapshotSha256: string; fetchedOn: string };
  subjects: NcertSubject[];
  counts: { subjects: number; books: number; chapters: number; unresolvedChapters: number; editions: number };
}

// ── CBSE ──────────────────────────────────────────────────────────────

export interface CbseNcertLink {
  book: string;
  /** A key of CbseFile.linkMethods; "reference-only" = CBSE names the NCERT
   *  book only as a reference (its prescribed textbook is CBSE's own). */
  method: string;
  evidence: string;
  /** XI-XII band only (26 Sep 2026): the class CBSE teaches this book in.
   *  Differs from NCERT's index class for Economics (Microeconomics is CBSE
   *  Class XI, Indian Economic Development Class XII). */
  classes?: number[];
  /** A key of CbseFile.classMethods. */
  classFrom?: "ncert-index" | "cbse-course-structure";
  classEvidence?: string;
  /** CBSE's prescribed pieces from this book, as CBSE prints them. */
  pieces?: string[];
}

export interface CbseSubject {
  name: string;
  group: string | null;
  syllabusUrl: string;
  syllabusSha256?: string;
  syllabusFetchedAt?: string;
  syllabusNotFetched?: string;
  ncertBooks?: CbseNcertLink[];
}

export interface CbseSchemeItem {
  subject: string;
  status: string;
  quote?: string;
}

export interface CbseBand {
  classes: number[];
  schemeOfStudies: {
    source: string;
    readingNote?: string;
    items: CbseSchemeItem[];
    [k: string]: unknown;
  } | null;
  note?: string;
  facts?: { fact: string; source: string; url: string }[];
  subjects?: CbseSubject[];
}

export interface CbseFile {
  board: "CBSE";
  session: string;
  fetchedOn: string;
  sources: Record<string, unknown>;
  linkMethods: Record<string, string>;
  classMethods: Record<string, string>;
  bands: CbseBand[];
}

// ── CISCE ─────────────────────────────────────────────────────────────

export interface CisceSubject {
  name: string;
  group?: string;
  note?: string;
  syllabusUrls?: string[];
}

export interface CisceLevel {
  classes: number[];
  stage: string;
  examinationYear?: string;
  sessionMapping?: string;
  document?: { title: string; url: string; sha256: string; dated: string };
  syllabusPage?: string;
  regulations?: { url: string; sha256: string };
  subjects: CisceSubject[];
  subjectListSource?: string;
  supplementaryDocuments?: string[];
  alsoTakenUp?: string[];
  alsoTakenUpQuote?: string;
  rules?: string[];
  allSyllabusPdfs?: string[];
}

export interface CisceFile {
  board: "CISCE";
  session: string;
  fetchedOn: string;
  note: string;
  sources: Record<string, { url: string; snapshotLinks: string; sha256: string }>;
  levels: CisceLevel[];
}

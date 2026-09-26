// School context files (26 Sep 2026): the markdown behind
// /schooling/{board}/class-{n}/context.md and …/{subject}/context.md — the
// school twin of /exams/{CODE}/context.md, for AI crawlers and answer engines.
//
// Same idea as the exam file: plain facts an assistant can cite in one cheap
// fetch, no marketing, no invented dates. What is in it:
//   * the class and board, its subjects, the official NCERT books (or the
//     CISCE syllabus PDFs) with their links — identity from the committed
//     spine (src/lib/school/spine.ts, read from ncert.nic.in / cisce.org on
//     the date printed), the same files the DB rows were seeded from;
//   * every chapter the DB holds, in book order, with NCERT's own chapter PDF,
//     and for each whether Shishya's notes and answer-checked practice exist
//     (src/lib/school/surface.ts — live rows, computed counts);
//   * a Shishya page link only for chapters that have our content; a chapter
//     that is "not ready yet" gets the official PDF and nothing else;
//   * the last-updated line from the newest note / validated-question
//     timestamp, or the plain statement that the class has nothing of ours yet.
// No textbook text, no chapter body, no question text ever appears here.
//
// Pure builders (testable without a DB); the routes load the surface and
// call them. The spine JSON is imported here, not in surface.ts, so the
// sitemap route does not carry the curriculum files.

import { CISCE, cisceLevelForClass, ncertSubjectsForClass, ncertTopicCode, subjectCodeFor, NCERT_CLASS_FILES } from "./spine";
import type { NcertChapter } from "./types";
import {
  CHAPTER_INDEXABLE_MIN_QUESTIONS,
  SCHOOL_BOARDS,
  SCHOOL_CHILDREN_LINE,
  chapterContentLabel,
  classCounts,
  schoolBoardPath,
  schoolChapterPath,
  schoolClassPath,
  schoolSubjectPath,
  type SchoolCurriculum,
  type SchoolSurfaceClass,
  type SchoolSurfaceSubject,
} from "./surface";

const SITE = "https://shishya.in";

// ── Identity from the spine ───────────────────────────────────────────

export interface SchoolBookIdentity {
  code: string;
  title: string;
  url: string;
  /** Other-language editions NCERT lists for the book (language codes). */
  editionLanguages: string[];
}

export interface SchoolChapterIdentity {
  bookCode: string;
  bookTitle: string;
  /** As printed in the contents ("1", "IV"), null when NCERT prints none. */
  number: string | null;
  /** What NCERT calls the unit: chapter / unit / lesson / theme … */
  kind: string;
  pdfUrl: string;
}

export interface SchoolSubjectIdentity {
  books: SchoolBookIdentity[];
  /** By Topic.code (ncertTopicCode). */
  chapters: Map<string, SchoolChapterIdentity>;
  /** CISCE: the subject's official syllabus PDFs (Classes 9-12 in the 2026-27
   *  spine; Classes 1-8 have one stage document, levelDocument, and none here). */
  syllabusUrls: string[];
  /** NCERT: index entries that name the subject but publish no book yet
   *  (Class 9 ICT on 26 Sep 2026) — the titles as the index prints them. */
  notYetPublished: string[];
}

export interface SchoolClassIdentity {
  curriculum: SchoolCurriculum;
  cls: number;
  /** Where the structure was read from, and when. */
  source: { label: string; url: string; readOn: string };
  /** CISCE: the level's regulations / curriculum document. */
  levelDocument: { title: string; url: string } | null;
  subjects: Map<string, SchoolSubjectIdentity>;
}

/** seed-plan.ts strips a leading article from a CISCE subject name before
 *  making its code ("A Modern Foreign Language" → MODERN_FOREIGN_LANGUAGE). */
function cisceSubjectCode(name: string): string {
  return subjectCodeFor(name.replace(/^(A|An)\s+/, ""));
}

/** The official structure of one (curriculum, class) from the spine; null
 *  when the spine has no such class. */
export function schoolClassIdentity(curriculum: SchoolCurriculum, cls: number): SchoolClassIdentity | null {
  // 1-12 only: NCERT's index files the "Class XI & XII Combined" set as 13,
  // and that set is merged into 11 and 12 by ncertSubjectsForClass.
  if (!Number.isInteger(cls) || cls < 1 || cls > 12) return null;
  if (curriculum === "NCERT") {
    const file = NCERT_CLASS_FILES.find((f) => f.indexClassValue === cls);
    if (!file) return null;
    const subjects = new Map<string, SchoolSubjectIdentity>();
    for (const s of ncertSubjectsForClass(cls)) {
      const chapters = new Map<string, SchoolChapterIdentity>();
      const books: SchoolBookIdentity[] = s.books.map((b) => {
        for (const ch of b.chapters as NcertChapter[]) {
          chapters.set(ncertTopicCode(b.code, ch.pdfSeq), { bookCode: b.code, bookTitle: b.title, number: ch.number, kind: ch.kind, pdfUrl: ch.pdfUrl });
        }
        return { code: b.code, title: b.title, url: b.bookUrl, editionLanguages: [...new Set(b.editions.map((e) => e.language))] };
      });
      subjects.set(s.code, { books, chapters, syllabusUrls: [], notYetPublished: (s.notYetPublished ?? []).map((n) => n.title) });
    }
    return {
      curriculum,
      cls,
      source: { label: "NCERT textbook index", url: file.source.indexUrl, readOn: file.source.fetchedOn },
      levelDocument: null,
      subjects,
    };
  }
  const level = cisceLevelForClass(cls);
  if (!level) return null;
  const subjects = new Map<string, SchoolSubjectIdentity>();
  for (const s of level.subjects) {
    const code = cisceSubjectCode(s.name);
    const prev = subjects.get(code);
    const urls = [...(prev?.syllabusUrls ?? []), ...(s.syllabusUrls ?? [])];
    subjects.set(code, { books: [], chapters: new Map(), syllabusUrls: [...new Set(urls)], notYetPublished: [] });
  }
  const doc = level.regulations
    ? { title: level.examinationYear ? `${level.examinationYear} regulations and syllabuses` : "regulations", url: level.regulations.url }
    : level.document
      ? { title: level.document.title, url: level.document.url }
      : null;
  return {
    curriculum,
    cls,
    source: { label: "CISCE (cisce.org)", url: level.syllabusPage ?? level.document?.url ?? "https://cisce.org", readOn: CISCE.fetchedOn },
    levelDocument: doc,
    subjects,
  };
}

// ── Markdown ──────────────────────────────────────────────────────────

const LANGUAGE_NAMES: Record<string, string> = {
  hi: "Hindi",
  ur: "Urdu",
  sa: "Sanskrit",
  as: "Assamese",
  bn: "Bengali",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  mr: "Marathi",
  or: "Odia",
  pa: "Punjabi",
  ta: "Tamil",
  te: "Telugu",
};

function editionsPhrase(langs: string[]): string {
  const named = langs.filter((l) => l !== "en" && l !== "und").map((l) => LANGUAGE_NAMES[l] ?? l);
  return named.length ? ` (NCERT also lists ${named.length > 3 ? `${named.length} other-language editions` : `${named.join(", ")} edition${named.length === 1 ? "" : "s"}`})` : "";
}

const day = (s: string | null | undefined): string | null => (s ? s.slice(0, 10) : null);

function chapterHeading(id: SchoolChapterIdentity | undefined, name: string): string {
  if (!id || !id.number) return name;
  const kind = id.kind ? id.kind[0].toUpperCase() + id.kind.slice(1) : "Chapter";
  return `${kind} ${id.number} — ${name}`;
}

/** The honesty and children lines every school context file carries. The
 *  children line is the surface's one sentence (SCHOOL_CHILDREN_LINE): 26 Sep
 *  2026 (fixer) it had said "stores nothing" and "parents and teachers may
 *  sign in to keep track" — the quiz's finish sends an anonymous analytics
 *  event, and no school page offers a sign-in. */
export function schoolContextHonestyLines(): string[] {
  return [
    "> Honesty: Shishya never reproduces, summarises or translates textbook text — read a chapter at its official link. Practice questions are Shishya's own, written by AI and answer-checked before they are shown; they are not NCERT exercises, not board questions and not previous-year questions. A chapter marked \"not ready yet\" has no Shishya notes or practice, and its Shishya page is not linked here.",
    `> Children: ${SCHOOL_CHILDREN_LINE}`,
  ];
}

function contentUpdatedLine(lastModified: string | null, what: string): string {
  return lastModified ? `- Shishya content last updated: ${day(lastModified)}` : `- No Shishya notes or practice on this ${what} yet.`;
}

/** One subject's lines (shared by the class file and the subject file).
 *  `levelDocument`: the class's CISCE stage document, printed on a subject
 *  that has no syllabus PDF of its own (Classes 1-8). */
export function schoolSubjectContextLines(
  c: SchoolSurfaceClass,
  s: SchoolSurfaceSubject,
  id: SchoolSubjectIdentity | undefined,
  opts: { site?: string; withHeading: boolean; levelDocument?: { title: string; url: string } | null },
): string[] {
  const site = opts.site ?? SITE;
  const L: string[] = [];
  const subjectUrl = `${site}${schoolSubjectPath(c.boardSlug, c.cls, s.slug)}`;
  if (opts.withHeading) L.push(`### ${s.name} — ${subjectUrl} (context: ${subjectUrl}/context.md)`);
  for (const b of id?.books ?? []) L.push(`- Book: ${b.title} — ${b.url}${editionsPhrase(b.editionLanguages)}`);
  for (const u of id?.syllabusUrls ?? []) L.push(`- Official syllabus (CISCE): ${u}`);
  // 26 Sep 2026 (fixer): NCERT Class 9 ICT IS in NCERT's index — with no book
  // published yet — so "not in NCERT's index" and "read the book at the
  // official link" were both untrue there. Say which case it is.
  const noBook = c.curriculum === "NCERT" && (id?.books.length ?? 0) === 0;
  if (noBook) {
    L.push(
      !id
        ? "- Book: no NCERT textbook link held for this subject and class."
        : id.notYetPublished.length > 0
          ? "- Book: none published yet — NCERT's textbook index lists this subject as forthcoming, with no book to link."
          : "- Book: NCERT's textbook index lists no book for this subject and class.",
    );
  }
  // 26 Sep 2026 (fixer): CISCE Classes 1-8 have no per-subject syllabus PDF;
  // the council publishes one curriculum document for the stage.
  if (c.curriculum === "CISCE" && id && id.syllabusUrls.length === 0) {
    L.push(
      opts.levelDocument
        ? `- Official document (CISCE): ${opts.levelDocument.title} — ${opts.levelDocument.url} (the stage curriculum; CISCE publishes no per-subject syllabus PDF for this class)`
        : "- Official syllabus: CISCE publishes no per-subject syllabus PDF for this class.",
    );
  }
  if (s.chapters.length === 0) {
    L.push(
      c.curriculum === "CISCE"
        ? "- Chapters: CISCE prescribes a syllabus, not one textbook, so there is no chapter map. No Shishya notes or practice for this subject yet."
        : noBook
          ? "- Chapters: none — there is no textbook to list. No Shishya notes or practice for this subject yet."
          : "- Chapters: list not available yet — read the book at the official link. No Shishya notes or practice for this subject yet.",
    );
    return L;
  }
  const sc = classCounts({ subjects: [s] });
  L.push(`- Chapters (${s.chapters.length}; ${sc.chaptersWithNotes} with Shishya notes, ${sc.chaptersWithPractice} with answer-checked practice of ${CHAPTER_INDEXABLE_MIN_QUESTIONS}+ questions):`);
  for (const ch of s.chapters) {
    const cid = id?.chapters.get(ch.code);
    const official = cid ? ` · official PDF: ${cid.pdfUrl}` : "";
    const ours = ch.indexable ? `${chapterContentLabel(ch)}: ${site}${schoolChapterPath(c.boardSlug, c.cls, s.slug, ch.slug)}` : chapterContentLabel(ch);
    L.push(`  - ${chapterHeading(cid, ch.name)} — ${ours}${official}`);
  }
  return L;
}

/** The class file. `id` null = the spine has no such class (the DB row still
 *  renders: names and counts only, no official links). */
export function schoolClassContextMarkdown(c: SchoolSurfaceClass, id: SchoolClassIdentity | null, asOf: string, site: string = SITE): string {
  const board = SCHOOL_BOARDS.find((b) => b.slug === c.boardSlug);
  const classUrl = `${site}${schoolClassPath(c.boardSlug, c.cls)}`;
  const n = classCounts(c);
  const L: string[] = [];
  L.push(`# ${c.name} — ${board?.label ?? c.boardSlug} — Shishya school context`);
  L.push("");
  L.push(`> Class page: ${classUrl} · board: ${site}${schoolBoardPath(c.boardSlug)} · all school pages: ${site}/schooling · data as of ${asOf} (IST). Free to cite; link back to the class page.`);
  // 26 Sep 2026 (fixer): "with the official syllabus PDFs" only where the
  // council publishes them per subject (ICSE / ISC classes); Classes 1-8 have
  // one stage curriculum document and no per-subject PDF.
  const cisceSubjectPdfs = id ? [...id.subjects.values()].some((x) => x.syllabusUrls.length > 0) : false;
  L.push(
    c.curriculum === "NCERT"
      ? `> What this file is: the subjects and textbooks NCERT lists for Class ${c.cls}${id ? ` (${id.source.label}, ${id.source.url}, read ${id.source.readOn})` : ""} and, for every book whose contents page could be read, its chapters — each with NCERT's own PDF — and which chapters carry Shishya's own study notes and answer-checked practice questions. A subject whose chapter list is not available yet says so. CBSE prescribes NCERT textbooks for most subjects; a state board that adopts NCERT books teaches the same chapters.`
      : `> What this file is: the subjects CISCE lists for Class ${c.cls}${id ? ` (${id.source.label}, read ${id.source.readOn})` : ""}${cisceSubjectPdfs ? " with CISCE's per-subject syllabus PDFs" : ""}. CISCE prescribes syllabuses, not one textbook series, so there is no chapter map.${id && !cisceSubjectPdfs && id.levelDocument ? " CISCE publishes one curriculum document for this stage and no per-subject syllabus PDF." : ""}${id?.levelDocument ? ` Level document: ${id.levelDocument.title} — ${id.levelDocument.url}.` : ""}`,
  );
  L.push(...schoolContextHonestyLines());
  L.push("");
  L.push("## Summary");
  L.push(
    c.curriculum === "NCERT"
      ? `- Subjects: ${n.subjects} · chapters listed: ${n.chapters} · with Shishya notes: ${n.chaptersWithNotes} · with answer-checked practice (${CHAPTER_INDEXABLE_MIN_QUESTIONS}+ questions): ${n.chaptersWithPractice}`
      : `- Subjects: ${n.subjects} · chapters listed: ${n.chapters}`,
  );
  L.push(contentUpdatedLine(c.lastModified, "class"));
  L.push("");
  L.push(`## Subjects (${c.subjects.length})`);
  for (const s of c.subjects) {
    L.push(...schoolSubjectContextLines(c, s, id?.subjects.get(s.code), { site, withHeading: true, levelDocument: id?.levelDocument ?? null }));
    L.push("");
  }
  L.push("## More on Shishya");
  L.push(`- School section: ${site}/schooling · board pages: ${SCHOOL_BOARDS.map((b) => `${site}${schoolBoardPath(b.slug)}`).join(" · ")}`);
  L.push(`- Platform index for LLMs: ${site}/llms.txt and ${site}/llms-full.txt (the School block lists every live class and subject page)`);
  L.push("");
  return L.join("\n");
}

/** The subject file. */
export function schoolSubjectContextMarkdown(c: SchoolSurfaceClass, s: SchoolSurfaceSubject, id: SchoolClassIdentity | null, asOf: string, site: string = SITE): string {
  const board = SCHOOL_BOARDS.find((b) => b.slug === c.boardSlug);
  const classUrl = `${site}${schoolClassPath(c.boardSlug, c.cls)}`;
  const subjectUrl = `${site}${schoolSubjectPath(c.boardSlug, c.cls, s.slug)}`;
  const L: string[] = [];
  L.push(`# ${s.name} — ${c.name} — ${board?.label ?? c.boardSlug} — Shishya school context`);
  L.push("");
  L.push(`> Subject page: ${subjectUrl} · class: ${classUrl} (context: ${classUrl}/context.md) · data as of ${asOf} (IST). Free to cite; link back to the subject page.`);
  L.push(...schoolContextHonestyLines());
  L.push("");
  L.push(`## ${s.name}`);
  L.push(...schoolSubjectContextLines(c, s, id?.subjects.get(s.code), { site, withHeading: false, levelDocument: id?.levelDocument ?? null }));
  L.push(contentUpdatedLine(s.lastModified, "subject"));
  L.push("");
  L.push("## Other subjects in this class");
  for (const sib of c.subjects) {
    if (sib.code === s.code) continue;
    L.push(`- ${sib.name}: ${site}${schoolSubjectPath(c.boardSlug, c.cls, sib.slug)}`);
  }
  L.push("");
  return L.join("\n");
}

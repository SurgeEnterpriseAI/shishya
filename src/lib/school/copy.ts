// School page copy (26 Sep 2026) — every sentence the live /schooling pages
// print, in one file, so tests/unit/schooling-honesty.test.ts can read the
// whole voice of the section and so a count is never typed into a sentence
// (the functions below take the computed numbers). English only for now:
// the section has no /hi or /te twins yet (not in this batch).
//
// Voice: say what the page has. A chapter without notes says so in one
// plain line. Practice questions are Shishya's own, written by AI and
// answer-checked — never called an exercise from the book, a board question
// or a previous-year question. No tutor, no sign-in, no account on school
// pages (Anthropic minors policy; the parent-consent layer is not built).
// 26 Sep 2026 (fixer): the practice copy said "nothing is saved" / "saves
// nothing", but the quiz's finish sends one anonymous QUIZ_ATTEMPTED event
// (chapter and score, under the rotating shishya_anon cookie — the same
// analytics every page view sends). The page now says exactly that, in the
// words of the machine surfaces' SCHOOL_CHILDREN_LINE
// (src/lib/school/surface.ts), so HTML, llms-full.txt and context.md agree;
// tests/unit/school-pages.test.ts pins the two to the same facts.

import type { SchoolQuizCopy } from "@/components/school/SchoolChapterQuiz";

export const SCHOOL_SITE = "https://shishya.in";

/** "Mathematics" reads as "Maths" in a title; other subjects keep their name. */
export function subjectShortName(name: string): string {
  return name === "Mathematics" ? "Maths" : name;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "notes, practice and the official NCERT chapter" — only the parts a chapter has. */
export function chapterHasParts(c: { hasNotes: boolean; quiz: boolean }): string {
  const parts: string[] = [];
  if (c.hasNotes) parts.push("notes");
  if (c.quiz) parts.push("practice");
  parts.push("the official NCERT chapter");
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** The status word on a chapter row. */
export function chapterStatusLabel(c: { hasNotes: boolean; quiz: boolean }): string {
  if (c.hasNotes && c.quiz) return "Notes + practice";
  if (c.hasNotes) return "Notes";
  if (c.quiz) return "Practice";
  return "Official chapter only";
}

/** One line of computed counts: "10 chapters listed · Shishya notes on 5 · checked practice on 5". */
export function countsLine(c: { chapters: number; notes: number; practice: number }): string {
  const parts = [`${plural(c.chapters, "chapter")} listed`];
  if (c.notes > 0) parts.push(`Shishya notes on ${c.notes}`);
  if (c.practice > 0) parts.push(`checked practice on ${c.practice}`);
  return parts.join(" · ");
}

/** 26 Sep 2026 (integrator): the tail of a board / class <title> when
 *  Shishya has content of its own — the computed number, never a bare
 *  "with notes and practice" over a tree where 5 of 1,146 chapters have
 *  them (the SERP title is the claim most people read). Empty without. */
export function oursTitleBit(c: { notes: number; practice: number }): string {
  if (c.notes === 0 && c.practice === 0) return "";
  if (c.notes === c.practice) return `, Shishya notes and practice on ${plural(c.notes, "chapter")}`;
  const parts: string[] = [];
  if (c.notes > 0) parts.push(`notes on ${c.notes}`);
  if (c.practice > 0) parts.push(`practice on ${c.practice}`);
  return `, Shishya ${parts.join(" and ")} chapters`;
}

/** 26 Sep 2026 (integrator): what a CISCE class's subjects link — computed
 *  from the spine (src/lib/school/books.ts cisceSubjectsWithPdf). Classes
 *  1-8 have one curriculum document for the stage and no per-subject
 *  syllabus PDF; the ICSE / ISC classes have one per subject. The same
 *  distinction llms-full.txt and context.md draw (surface.ts, context.ts). */
export function cisceDocsPhrase(c: { subjects: number; withPdf: number }): string {
  if (c.withPdf === 0) return "under CISCE's curriculum document for this stage — the council publishes no per-subject syllabus PDF for this class";
  if (c.withPdf === c.subjects) return "each linking its own CISCE syllabus PDF and the council's regulations";
  return `${c.withPdf} of them linking their own CISCE syllabus PDF, the rest the council's regulations`;
}

export const CHAPTER_COPY = {
  officialHeading: "Read the official chapter",
  officialLine: (bookTitle: string) => `This chapter is in NCERT's ${bookTitle}, free to read on ncert.nic.in. Shishya links the official PDF and copies nothing from it.`,
  openPdf: "Open the official chapter (PDF) ↗",
  openBook: (bookTitle: string) => `All of ${bookTitle} on NCERT ↗`,
  notesHeading: "Shishya's notes",
  notesFooter: (dateText: string | null) =>
    `Written by Shishya's AI${dateText ? ` on ${dateText}` : ""} from the chapter's title and class level, in Shishya's own words — not a copy or summary of the textbook. Read the official chapter for the book's own text, activities and exercises.`,
  notReady: "Shishya's notes and practice for this chapter are not ready yet. The official chapter above is the one to study from.",
  piecesHeading: "Also inside this chapter's PDF",
  prev: "← Previous chapter",
  next: "Next chapter →",
  backToSubject: (subjectName: string) => `← All chapters in ${subjectName}`,
} as const;

/** What practice does with a result — the truth, in the machine surfaces'
 *  words: no account, no result saved to any account or profile, one
 *  anonymous usage event (which chapter, what score). */
export const PRACTICE_PRIVACY_LINE =
  "No account needed, and no result is saved to any account or profile: Shishya records only an anonymous usage event (which chapter was practised and the score).";

export const CHAPTER_QUIZ_COPY: SchoolQuizCopy = {
  heading: "Practice: {n} questions on {scope}",
  intro: `One question at a time, with the answer and a short explanation after each. ${PRACTICE_PRIVACY_LINE}`,
  start: "Start {n} questions →",
  tryAgain: "Try again",
  backToNotes: "Back to the notes",
  result: "{score} of {n} right.",
  honesty: "These practice questions are Shishya's own, written by AI and answer-checked before they are shown. They are not taken from the NCERT book or any board paper.",
};

export const SUBJECT_COPY = {
  booksHeading: (n: number) => `Official NCERT ${n === 1 ? "textbook" : "textbooks"}`,
  booksNote: "Titles as NCERT's textbook index lists them. The books are free to read on ncert.nic.in; Shishya links them and copies nothing.",
  editionsLine: (names: string) => `Also published by NCERT in: ${names}.`,
  cbseSyllabusHeading: "CBSE syllabus",
  cisceHeading: "Official CISCE documents",
  cisceNote: "CISCE prescribes a syllabus for each subject, not one textbook, so there is no chapter list here — the council's syllabus or curriculum document is the official statement of what the subject covers. Shishya has no notes or practice for CISCE subjects yet.",
  cisceNoSubjectPdf: "CISCE publishes no separate syllabus PDF for this subject; the council's regulations and curriculum document for this class, linked below, covers it.",
  chaptersHeading: "Chapters",
  chaptersIntro: (c: { chapters: number; notes: number; practice: number }, bookTitles: string) =>
    `${countsLine(c)}. Chapter titles are as printed on the contents page of ${bookTitles}; every chapter links its official PDF on ncert.nic.in.`,
  noChapters: (bookTitles: string) =>
    `The chapters of ${bookTitles} are not listed here yet: NCERT's contents page for this book could not be read reliably by Shishya's check (a scanned or legacy-font PDF). The book link above opens every chapter on ncert.nic.in.`,
  // 26 Sep 2026 (integrator): NCERT's index can list a subject with no book
  // yet (Class 9 ICT, "Coming Soon" on 26 Sep 2026) — no book box, no
  // chapters, nothing to link; the page says that, not "could not be read".
  noBook: (subjectName: string, cls: number) =>
    `NCERT's textbook index lists ${subjectName} for Class ${cls} but publishes no book for it yet, so there is no book to link and no chapter to list here. Shishya has no notes or practice for it.`,
  otherSubjects: (cls: number) => `Other subjects in Class ${cls}`,
} as const;

export const CLASS_COPY = {
  cbseIntro: (cls: number) =>
    `CBSE prescribes NCERT textbooks. This is what NCERT publishes for Class ${cls}: the books, each chapter with its official PDF, and Shishya's own notes and practice where they exist.`,
  cisceIntro: (cls: number, stage: string, c: { subjects: number; withPdf: number }) =>
    `CISCE's subjects for Class ${cls} (${stage}), ${cisceDocsPhrase(c)}. CISCE prescribes syllabuses, not one textbook, so there is no chapter map.`,
  subjectsHeading: "Subjects",
  bookLinkOnly: "Book link only — chapters not listed yet",
  syllabusOnly: "Official syllabus PDF",
  todayHeading: "On these pages today",
  todayNcert: (c: { subjects: number; chapters: number; notes: number; practice: number }) =>
    `${plural(c.subjects, "subject")} · ${countsLine(c)}. Chapters without Shishya notes or practice show the official chapter link only.`,
  todayCisce: (subjects: number, docs: number) => `${plural(subjects, "subject")} with ${plural(docs, "official CISCE document")} linked. No Shishya notes or practice yet.`,
} as const;

export const BOARD_COPY = {
  classesHeading: "Classes",
  classLine: (c: { subjects: number; chapters: number; notes: number; practice: number }) =>
    c.chapters > 0 ? `${plural(c.subjects, "subject")} · ${countsLine(c)}` : `${plural(c.subjects, "subject")} · official syllabus links`,
  todayNcert: (c: { classes: number; chapters: number; notes: number; practice: number }) =>
    `${plural(c.classes, "class", "classes")} on Shishya. ${countsLine(c)}, every chapter linked to its official NCERT PDF. A chapter without Shishya notes or practice shows the official link only.`,
  // 26 Sep 2026 (integrator): per-subject syllabus PDFs exist for the ICSE /
  // ISC classes only; the lower classes have one stage curriculum document.
  todayCisce: (c: { classes: number; subjects: number; classesWithSubjectPdfs: number }) =>
    `${plural(c.classes, "class", "classes")} on Shishya, ${plural(c.subjects, "subject")} in all, each linking the council's own official documents: per-subject syllabus PDFs in ${plural(c.classesWithSubjectPdfs, "class", "classes")}, one stage curriculum document (no per-subject PDF) in ${plural(c.classes - c.classesWithSubjectPdfs, "class", "classes")}. No Shishya notes or practice for CISCE yet.`,
  otherBoardStatus: (boardShort: string) =>
    `Shishya's own chapter notes and practice exist for NCERT chapters (listed under CBSE). There is nothing for ${boardShort} here yet; the links above go straight to the board's own pages.`,
} as const;

export const HUB_COPY = {
  title: "School — CBSE / NCERT chapters, CISCE syllabuses and state board links",
  lead: (c: { chapters: number; notes: number; practice: number }) =>
    `Class 1 to 12. ${countsLine(c)}, each chapter linked to its official PDF on ncert.nic.in. CISCE (ICSE / ISC) subjects with the council's own syllabus and curriculum documents. State and international boards with their official links.`,
  ncertCard: "CBSE — NCERT textbooks",
  ncertCardLine: (c: { classes: number; chapters: number; notes: number; practice: number }) =>
    `${plural(c.classes, "class", "classes")} · ${countsLine(c)}`,
  cisceCard: "CISCE — ICSE / ISC",
  cisceCardLine: (classes: number, subjects: number) => `${plural(classes, "class", "classes")} · ${plural(subjects, "subject")} with the council's official documents`,
  pickClass: "Pick a class",
  noneSeeded: "Class pages for this board are not on Shishya yet; the board's own site is the source.",
  todayHeading: "On these pages today",
  today: (c: { chapters: number; notes: number; practice: number }) =>
    `NCERT chapters: ${countsLine(c)}. Practice questions are Shishya's own, written by AI and answer-checked before they are shown; a chapter without notes or practice shows the official chapter link only. School pages have no chat tutor and ask for no account: practice runs without one, and no result is saved to any account or profile — Shishya records only an anonymous usage event (which chapter was practised and the score), the same cookie-based analytics every page view sends.`,
  boardsHeading: "All boards: official links",
} as const;

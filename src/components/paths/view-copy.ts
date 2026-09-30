// The words the life-stage page views print beyond src/lib/paths/copy.ts
// (30 Sep 2026, P1 build 1, spec §2.1 — agent B).
//
// Why a second copy file: copy.ts belongs to the registry build (agent A)
// and holds the page models' own strings; the views need a handful more
// (breadcrumb, "source", the scholarship preview, the board-table notes).
// Same shape and rules as copy.ts: English filled in, Hindi and Telugu typed
// but empty and falling back to English key by key (no twins in P1, F7), no
// digit other than a class number, no salary, no "best / #1 / biggest /
// largest", and every count is a {n} filled from a computed length.
// tests/unit/paths-views.test.ts scans it.
//
// Pure: no imports.

export type PathViewLocale = "en" | "hi" | "te";

export interface PathViewCopy {
  home: string;
  breadcrumbLabel: string;
  /** Link text beside a confirmed fact: the source document. */
  source: string;
  /** Line under the options heading on /after-10th (rows open the stream pages). */
  optionsNoteAfter10: string;
  /** Line under the options heading on /after-12th (rows open existing Shishya pages). */
  optionsNoteAfter12: string;
  /** "Show the other {n}" (scholarship preview; {n} computed). */
  showMore: string;
  /** "{n} schemes open at this stage in Shishya's list" ({n} computed). */
  scholarshipsCount: string;
  scholarshipsAllAfter10: string;
  scholarshipsAllAfter12: string;
  /** "{n} listed on Shishya" beside the exams-after link ({n} computed). */
  examsListed: string;
  /** Printed above the board table. */
  boardsIntro: string;
  /** Printed above the "check the board's own site" links. */
  boardsCheckIntro: string;
  /** "{n} listed" beside a board's name ({n} computed). */
  boardRowCount: string;
  alsoOnShishya: string;
  otherOptions: string;
  allOptionsAfter10: string;
  /** Tutor box heading. */
  tutorHeading: string;
}

const EN: PathViewCopy = {
  home: "Home",
  breadcrumbLabel: "Breadcrumb",
  source: "source",
  optionsNoteAfter10: "Tap an option for its full page: subjects as each board prints them, what it keeps open, exams and careers.",
  optionsNoteAfter12: "Tap a row for its page on Shishya: colleges, entrance exams, jobs or courses.",
  showMore: "Show the other {n}",
  scholarshipsCount: "{n} schemes open at this stage in Shishya's scholarship list. Each page says who can apply and links where to apply.",
  scholarshipsAllAfter10: "All scholarships for Class 11-12",
  scholarshipsAllAfter12: "Browse every scholarship",
  examsListed: "{n} listed on Shishya",
  boardsIntro: "Only lists we read on an official site are shown, with the subjects exactly as printed there and the document each came from.",
  boardsCheckIntro: "We could not read these boards' lists. Check them on the board's own site:",
  boardRowCount: "{n} listed",
  alsoOnShishya: "Also on Shishya",
  otherOptions: "Other options after Class 10",
  allOptionsAfter10: "All options after Class 10, compared",
  tutorHeading: "Not sure yet?",
};

type Partialize<T> = { [K in keyof T]?: T[K] };

/** Hindi and Telugu: typed, empty until a person translates (P1 has no twins). */
const HI: Partialize<PathViewCopy> = {};
const TE: Partialize<PathViewCopy> = {};

/** The view copy for a locale, falling back to English key by key. */
export function pathViewCopy(locale?: string | null): PathViewCopy {
  if (locale === "hi") return { ...EN, ...HI };
  if (locale === "te") return { ...EN, ...TE };
  return EN;
}

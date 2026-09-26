// Share-card text (26 Sep 2026, share-images group) — the words drawn on the
// per-page social cards of /schooling/{board}/class-{n} (and its subject and
// chapter pages), /careers/{slug}, /current-affairs/{date} and
// /exams/entrance.
//
// Why: WhatsApp and Telegram are how Indian students pass pages on, and these
// families showed no image at all — each page's own `openGraph` replaced the
// inherited one (Next merges openGraph per segment; only a file-based
// opengraph-image in the page's own folder adds an image back). Current
// affairs is the family with the most organic landings outside exams.
//
// Rules (pinned by tests/unit/page-share-cards.test.ts):
//   • every word comes from what the page itself renders — board, class and
//     subject names, a chapter's number label, a career's name and field, a
//     digest's date and item count, the entrance groups that have exams. No
//     claim is typed here that a page does not make itself;
//   • Latin script only: Satori (next/og) cannot shape Devanagari or Telugu,
//     so any piece that is not Latin is dropped, never drawn as boxes;
//   • school cards never draw textbook text: no chapter titles and no book
//     text — the chapter's number label ("Chapter 3") only;
//   • a count is drawn only where a platform's cached copy of the card cannot
//     go stale: a closed day's digest count, and the "and N more" of a list
//     (seeded subjects, a closed day's categories). Chapter counts that grow
//     as notes ship are said as "some chapters" / "every chapter" instead.

export interface PageCardText {
  /** "School", "Careers", … — drawn after the wordmark. */
  section: string;
  headline: string;
  /** One to three short lines under the headline. */
  lines: string[];
}

export const PAGE_CARD_FOOTER = "Free · shishya.in";

// Printable ASCII, Latin-1 (· é ü …) and General Punctuation (– — ‘ ’ “ ” …) —
// the ranges next/og's bundled Noto Sans Latin draws. No ₹, no Indic scripts.
const CARD_SAFE = /^[ -~ -ÿ‐-‧′″]*$/;

/** The trimmed text when every character is drawable Latin; null otherwise. */
export function cardSafe(s: string | null | undefined): string | null {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t && CARD_SAFE.test(t) ? t : null;
}

/** Clip at a word boundary with an ellipsis (the whole text when it fits). */
export function clipCardText(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s·,;:—–&/-]+$/, "")}…`;
}

/** "A · B · C and 4 more" — as many whole items as fit in `max` characters;
 *  the remainder is counted, never silently dropped. An item that is not
 *  drawable Latin is not drawn but still counted in "and N more"; "" when no
 *  item is drawable. */
export function joinCardList(items: readonly string[], max: number, sep = " · "): string {
  const all = [...new Set(items.map((x) => x.replace(/\s+/g, " ").trim()).filter((x) => x.length > 0))];
  const safe = all.map((x) => cardSafe(x)).filter((x): x is string => x !== null);
  const moreText = (shownCount: number) => {
    const rest = all.length - shownCount;
    return rest > 0 ? ` and ${rest} more` : "";
  };
  const shown: string[] = [];
  for (const item of safe) {
    const next = [...shown, item].join(sep);
    if (next.length + moreText(shown.length + 1).length > max && shown.length > 0) break;
    shown.push(item);
  }
  if (shown.length === 0) return "";
  return `${shown.join(sep)}${moreText(shown.length)}`;
}

// Sized for src/lib/og/page-card.tsx: an 80-character headline is two lines
// at its smallest size; a 110-character line is two lines.
export const CARD_HEADLINE_MAX = 80;
export const CARD_LINE_MAX = 110;
const HEADLINE_MAX = CARD_HEADLINE_MAX;
const LINE_MAX = CARD_LINE_MAX;

function card(section: string, headline: string, lines: readonly (string | null | undefined | false)[]): PageCardText {
  return {
    section,
    headline: clipCardText(headline, HEADLINE_MAX),
    lines: lines
      .filter((l): l is string => typeof l === "string" && l.length > 0)
      .map((l) => cardSafe(l))
      .filter((l): l is string => l !== null)
      .map((l) => clipCardText(l, LINE_MAX))
      .slice(0, 3),
  };
}

// ── School ────────────────────────────────────────────────────────────

/** What a class / subject has of Shishya's own, from chapter rows (a chapter
 *  "has practice" at the guest-quiz minimum — src/lib/school/scope.ts). */
export interface SchoolOursCounts {
  chapters: number;
  /** Chapters with notes AND checked practice. */
  both: number;
  notes: number;
  practice: number;
}

/** The official-PDF line of an NCERT class or subject, from how many of its
 *  chapters have a known official chapter PDF. */
export function ncertPdfLine(chapters: number, pdfChapters: number): string {
  if (chapters > 0 && pdfChapters === chapters) return "Every chapter linked to its official NCERT PDF";
  if (pdfChapters > 0) return "Official NCERT chapter PDFs linked";
  return "Official NCERT textbooks linked";
}

/** "Shishya's own notes and checked practice on some chapters" — only what
 *  the rows show; "" when there is nothing of Shishya's yet. */
export function schoolOursLine(c: SchoolOursCounts): string {
  const where = (n: number) => (c.chapters > 0 && n === c.chapters ? "on every chapter" : "on some chapters");
  if (c.both > 0) return `Shishya's own notes and checked practice ${where(c.both)}`;
  if (c.notes > 0) return `Shishya's own notes ${where(c.notes)}`;
  if (c.practice > 0) return `Checked practice questions ${where(c.practice)}`;
  return "";
}

const SCHOOL_GENERIC = card("School", "School, Classes 1-12", [
  "CBSE and CISCE classes and subjects",
  "Official books and syllabuses linked",
]);

/** "CBSE Class 6" / "CBSE Class 6 Mathematics"; null when a part is not Latin. */
function schoolHeadline(boardShortName: string, cls: number, subjectName?: string): string | null {
  const board = cardSafe(boardShortName);
  if (!board) return null;
  if (subjectName === undefined) return `${board} Class ${cls}`;
  const subject = cardSafe(subjectName);
  return subject ? `${board} Class ${cls} ${subject}` : null;
}

export type SchoolClassCardInput =
  | {
      kind: "live";
      boardShortName: string;
      cls: number;
      curriculum: "NCERT" | "CISCE";
      subjectNames: readonly string[];
      ours: SchoolOursCounts;
      /** NCERT: chapters with a known official chapter PDF. */
      pdfChapters: number;
      /** CISCE subjects with a syllabus PDF of their own (0 for NCERT). */
      ciscePdfSubjects: number;
    }
  /** A class the seed does not cover: the 25 Sep hardcoded, noindex form. */
  | { kind: "legacy"; boardSlug: string; boardShortName: string; cls: number; hasSyllabus: boolean }
  /** The seeded-surface read failed: the board and class only. */
  | { kind: "plain"; boardShortName: string; cls: number }
  | { kind: "unknown" };

export function schoolClassCardText(input: SchoolClassCardInput): PageCardText {
  if (input.kind === "unknown") return SCHOOL_GENERIC;
  const headline = schoolHeadline(input.boardShortName, input.cls);
  if (!headline) return SCHOOL_GENERIC;
  if (input.kind === "plain") return card("School", headline, []);
  if (input.kind === "legacy") {
    return card("School", headline, [
      input.hasSyllabus
        ? input.boardSlug === "cbse"
          ? "Subjects, with links to the official NCERT textbooks"
          : "Subjects, with links to the board's official syllabuses"
        : "The board's official source linked",
    ]);
  }
  const subjects = joinCardList(input.subjectNames, LINE_MAX);
  if (input.curriculum === "NCERT") {
    return card("School", headline, [
      subjects,
      ncertPdfLine(input.ours.chapters, input.pdfChapters),
      schoolOursLine(input.ours),
    ]);
  }
  return card("School", headline, [
    subjects,
    input.ciscePdfSubjects > 0
      ? "CISCE's own syllabus PDFs linked where the council publishes them"
      : "CISCE's curriculum document for this stage linked",
  ]);
}

export type SchoolSubjectCardInput =
  | {
      kind: "live";
      boardShortName: string;
      cls: number;
      curriculum: "NCERT" | "CISCE";
      subjectName: string;
      ours: SchoolOursCounts;
      /** NCERT: chapters with a known official chapter PDF. */
      pdfChapters: number;
      /** NCERT lists the subject but publishes no book (no chapters either). */
      noBook: boolean;
      /** CISCE: the subject has a syllabus PDF of its own. */
      subjectPdf: boolean;
    }
  | { kind: "legacy"; boardShortName: string; cls: number; subjectName: string; hasBooks: boolean }
  /** Unknown / moved subject: the class card. */
  | { kind: "class"; classInput: SchoolClassCardInput };

export function schoolSubjectCardText(input: SchoolSubjectCardInput): PageCardText {
  if (input.kind === "class") return schoolClassCardText(input.classInput);
  const headline = schoolHeadline(input.boardShortName, input.cls, input.subjectName) ?? schoolHeadline(input.boardShortName, input.cls);
  if (!headline) return SCHOOL_GENERIC;
  if (input.kind === "legacy") {
    return card("School", headline, [input.hasBooks ? "Official NCERT textbooks linked" : "The official syllabus linked"]);
  }
  if (input.curriculum === "NCERT") {
    if (input.noBook) return card("School", headline, ["NCERT publishes no textbook for this subject yet"]);
    return card("School", headline, [ncertPdfLine(input.ours.chapters, input.pdfChapters), schoolOursLine(input.ours)]);
  }
  return card("School", headline, [
    input.subjectPdf ? "CISCE's own syllabus PDF for this subject linked" : "CISCE's curriculum document for this stage linked",
    "CISCE prescribes a syllabus, not one textbook",
  ]);
}

export type SchoolChapterCardInput =
  | {
      kind: "live";
      boardShortName: string;
      cls: number;
      subjectName: string;
      /** chapterLabel(ncertChapterMeta(...)) — "Chapter 3"; "" when unknown. */
      label: string;
      hasNotes: boolean;
      /** Checked practice at the guest-quiz minimum. */
      quiz: boolean;
      /** The chapter's official NCERT PDF is known. */
      officialPdf: boolean;
    }
  | { kind: "legacy"; boardShortName: string; cls: number; subjectName: string; number: number }
  /** Unknown / moved chapter: the subject (or class) card. */
  | { kind: "subject"; subjectInput: SchoolSubjectCardInput };

export function schoolChapterCardText(input: SchoolChapterCardInput): PageCardText {
  if (input.kind === "subject") return schoolSubjectCardText(input.subjectInput);
  const headline = schoolHeadline(input.boardShortName, input.cls, input.subjectName) ?? schoolHeadline(input.boardShortName, input.cls);
  if (!headline) return SCHOOL_GENERIC;
  if (input.kind === "legacy") {
    return card("School", headline, [
      Number.isInteger(input.number) && input.number > 0 ? `Chapter ${input.number}` : "",
      "The official NCERT textbook linked",
    ]);
  }
  const ours =
    input.hasNotes && input.quiz
      ? "Shishya's own notes and checked practice questions"
      : input.hasNotes
        ? "Shishya's own notes"
        : input.quiz
          ? "Checked practice questions"
          : "";
  return card("School", headline, [
    input.label,
    ours,
    input.officialPdf ? "The official NCERT chapter PDF linked" : "",
  ]);
}

// ── Careers ───────────────────────────────────────────────────────────

export interface CareerCardInput {
  name: string;
  categoryLabel: string;
  entryRoutes: readonly unknown[];
  qualifications: readonly unknown[];
  salaryBands: readonly unknown[];
  pros: readonly unknown[];
  cons: readonly unknown[];
}

const CAREERS_GENERIC = card("Careers", "Career guides for students in India", [
  "Entry routes, qualifications and indicative salary bands",
]);

/** What this career guide covers — only the sections its data fills. */
export function careerCoversLine(c: Omit<CareerCardInput, "name" | "categoryLabel">): string {
  const parts = [
    c.entryRoutes.length > 0 ? "how to get in" : null,
    c.qualifications.length > 0 ? "qualifications" : null,
    c.salaryBands.length > 0 ? "indicative salary bands" : null,
    c.pros.length > 0 && c.cons.length > 0 ? "pros and cons" : null,
  ].filter((p): p is string => p !== null);
  if (parts.length === 0) return "";
  const text = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return text[0].toUpperCase() + text.slice(1);
}

/** The career's name as drawn: the whole name when it is drawable Latin,
 *  else the name without its bracketed note ("College Professor (Assistant
 *  Professor → Full Professor)" → "College Professor" — the arrow does not
 *  draw); null when neither is. */
export function careerCardName(name: string): string | null {
  return cardSafe(name) ?? cardSafe(name.replace(/\s*\([^)]*\)/g, " "));
}

export function careerCardText(c: CareerCardInput | undefined): PageCardText {
  if (!c) return CAREERS_GENERIC;
  const name = careerCardName(c.name);
  if (!name) return CAREERS_GENERIC;
  return card("Careers", `${name} in India`.length <= HEADLINE_MAX ? `${name} in India` : name, [
    c.categoryLabel,
    careerCoversLine(c),
  ]);
}

// ── Current affairs ───────────────────────────────────────────────────

const CA_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CA_AUDIENCE = "UPSC, SSC, banking, railways and state exams";

/** "24 September 2026" — the digest page's own date format (en-IN, UTC). */
export function currentAffairsPrettyDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** The IST calendar date of `now` (YYYY-MM-DD) — the digest's own date basis. */
export function istDate(now: Date): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

/** A valid YYYY-MM-DD whose calendar day exists. */
export function isCurrentAffairsDate(date: string): boolean {
  if (!CA_DATE.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

export interface CurrentAffairsCardInput {
  date: string;
  /** Rows the page lists for the date (the page renders "{n} updates"). */
  count: number;
  /** The day's categories, in page order. */
  categories: readonly string[];
  /** IST date of the request — today's (or a later) digest can still grow,
   *  so its card draws no count. */
  today: string;
}

export function currentAffairsCardText(input: CurrentAffairsCardInput): PageCardText {
  if (!isCurrentAffairsDate(input.date) || input.count <= 0) {
    return card("Current affairs", "Daily current affairs", [`Updates for ${CA_AUDIENCE}`]);
  }
  const closed = input.date < input.today;
  return card("Current affairs", currentAffairsPrettyDate(input.date), [
    closed
      ? `${input.count} ${input.count === 1 ? "update" : "updates"} for ${CA_AUDIENCE}`
      : `Updates for ${CA_AUDIENCE}`,
    joinCardList(input.categories, LINE_MAX),
  ]);
}

// ── Entrance exams ────────────────────────────────────────────────────

/** `groupLabels` = the ENTRANCE_GROUPS labels that have at least one exam in
 *  the catalogue (what /exams/entrance renders as its sections). */
export function entranceCardText(groupLabels: readonly string[]): PageCardText {
  const groups = joinCardList(groupLabels, LINE_MAX);
  return card("Entrance exams", "Entrance exams in India", [
    groups || "JEE, NEET, CUET, NDA, olympiads and state CETs",
    "Each exam linked to its own page",
  ]);
}

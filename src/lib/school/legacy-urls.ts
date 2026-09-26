// Old /schooling URLs → today's (26 Sep 2026).
//
// Why: the 25 Sep pages were built on the hardcoded lists in
// src/lib/schooling-subjects.ts, whose subject slugs were hand-picked
// ("hindi-a", "english-core", "history-civics") and whose chapter slugs were
// shortened by hand ("pair-of-linear-equations"). The live pages derive
// both from the seeded rows (src/lib/school/surface.ts: kebab of
// Subject.code, kebab of the printed chapter title), which keeps 114 of the
// 154 old chapter URLs as they were. The others, and the renamed subject
// segments, resolve here to their new address, so the subject and chapter
// pages can 308 them instead of 404ing a link somebody kept. Pure: no DB.
//
// 26 Sep 2026 (fixer): two holes the review found —
//   * a chapter was mapped to kebab(old printed title) without checking the
//     seeded rows, and one differs (25 Sep typed "Units and Measurements",
//     NCERT prints "Units and Measurement" → keph1.ch01), so that old URL
//     404ed. legacyChapterSlug now resolves against the LIVE chapter list:
//     the kebab title, else the same book's chapter at the old printed
//     position (Topic.code = book code + PDF number, the seed's own rule),
//     else a plural-insensitive title match. tests/unit/school-pages.test.ts
//     walks all 154 old chapter URLs against the seed plan.
//   * the subject map was per board, but ICSE (Class 10) and ISC (11-12)
//     code the same old segment differently ("english" → english in ICSE,
//     english-or-modern-english in ISC; "physics" is its own ISC subject but
//     part of science-physics-chemistry-biology in ICSE), and eight old
//     segments had no entry at all. The map now takes "{class}/{slug}"
//     keys for the class-specific ones. An old subject with no live twin at
//     all (cbse/class-10/computer-applications: CBSE's optional subject has
//     no NCERT book) 308s to its class page — the pages do that.

import { findChapter, type SchoolChapter } from "@/lib/schooling-subjects";
import { kebab, schoolBookCodeOf } from "./surface";

/** Hand-picked 25 Sep subject segments → the segment the seeded Subject.code
 *  gives. A "{class}/{slug}" key applies to that class only and wins over
 *  the board-wide key. Only mappings whose target subject exists in the
 *  seed (scripts/tmp-school3-fixslugs.ts listed the codes on 26 Sep 2026;
 *  the test pins every entry to the seed plan). */
export const LEGACY_SUBJECT_SLUGS: Record<string, Record<string, string>> = {
  cbse: {
    "hindi-a": "hindi",
    "hindi-b": "hindi",
    "english-core": "english",
  },
  "icse-cisce": {
    // ICSE (Class 10): English I / II are one seeded subject; the sciences
    // and History-Civics / Geography are CISCE's combined papers.
    "english-language": "english",
    "english-literature": "english",
    "history-civics": "history-civics-and-geography",
    "10/geography": "history-civics-and-geography",
    "10/physics": "science-physics-chemistry-biology",
    "10/chemistry": "science-physics-chemistry-biology",
    "10/biology": "science-physics-chemistry-biology",
    // ISC (Classes 11-12): CISCE's own subject names.
    accounts: "accountancy",
    "11/english": "english-or-modern-english",
    "12/english": "english-or-modern-english",
    "11/commerce": "business-studies-previously-known-as-commerce",
  },
};

/** The live subject segment an old one maps to; the same segment when the
 *  old one needs no change (or the board has no live tree). */
export function legacySubjectSlug(boardSlug: string, cls: number, subjectSlug: string): string {
  const map = LEGACY_SUBJECT_SLUGS[boardSlug];
  return map?.[`${cls}/${subjectSlug}`] ?? map?.[subjectSlug] ?? subjectSlug;
}

/** What the resolver needs of a live chapter (src/lib/school/surface.ts
 *  SchoolSurfaceChapter has all three). */
export interface LiveChapterLike {
  code: string;
  name: string;
  slug: string;
}

/** kebab with a trailing "s" dropped from every word: "units-and-measurements"
 *  and "units-and-measurement" meet. */
function looseKebab(s: string): string {
  return kebab(s)
    .split("-")
    .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w))
    .join("-");
}

/** Which live chapter an old (25 Sep) chapter is: by printed title, else the
 *  same book's chapter at the old position on NCERT's page (Topic.code =
 *  book code + PDF number), else a plural-insensitive title. Null when the
 *  live subject has no such chapter. */
export function legacyChapterSlug(old: Pick<SchoolChapter, "name" | "book" | "numberInBook">, live: readonly LiveChapterLike[]): string | null {
  const want = kebab(old.name);
  const byTitle = live.find((c) => c.slug === want) ?? live.find((c) => kebab(c.name) === want);
  if (byTitle) return byTitle.slug;
  const bookCode = old.book.query.split("=")[0];
  const sameBook = live.filter((c) => schoolBookCodeOf(c.code) === bookCode);
  const code = `${bookCode}.ch${String(old.numberInBook).padStart(2, "0")}`;
  const byCode = sameBook.find((c) => c.code === code);
  if (byCode) return byCode.slug;
  const loose = looseKebab(old.name);
  const byLooseTitle = sameBook.find((c) => looseKebab(c.name) === loose);
  return byLooseTitle?.slug ?? null;
}

/** Where an old chapter URL points today: the old (board, class, subject,
 *  chapter) → its 25 Sep record → the live chapter under the mapped subject
 *  segment. Null when the old URL never existed or the live subject has no
 *  such chapter. `live` is the mapped subject's chapter list. */
export function legacyChapterTarget(
  boardSlug: string,
  cls: number,
  subjectSlug: string,
  chapterSlug: string,
  live: readonly LiveChapterLike[],
): { subjectSlug: string; chapterSlug: string } | null {
  const old = findChapter(boardSlug, cls, subjectSlug, chapterSlug);
  if (!old) return null;
  const target = legacyChapterSlug(old, live);
  return target ? { subjectSlug: legacySubjectSlug(boardSlug, cls, subjectSlug), chapterSlug: target } : null;
}

// Per-page share cards (26 Sep 2026, share-images group): /schooling class,
// subject and chapter pages, /careers/{slug}, /current-affairs/{date} and
// /exams/entrance had no og:image — each page's own openGraph replaced the
// inherited image. These tests pin:
//   • the six opengraph-image routes exist in the pages' own folders, export
//     the metadata Next reads (alt / size / contentType / runtime) and a
//     revalidate equal to their page's, and each page's openGraph has no
//     `images` key (file-based metadata only fills openGraph.images when the
//     page's own openGraph does not set it — Next resolve-metadata.js
//     mergeStaticMetadata);
//   • every word a card draws is Latin, within the layout limits and true
//     for the page — computed over the real static data (all careers, every
//     board × class the 25 Sep form serves) and over the branch shapes of the
//     DB-backed families; school cards never carry a chapter title;
//   • each route renders a real PNG (Satori throws on a bad tree and ships 0
//     bytes — src/app/opengraph-image.tsx, 11 Sep 2026).
// No DB, no network: prisma, the school surface reads and the exam catalogue
// are mocked.

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  getLiveSchoolClass: vi.fn(),
  getSchoolOfficialLinks: vi.fn(),
  getExamCatalog: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: { $queryRawUnsafe: h.queryRaw } }));
vi.mock("@/lib/school/db", () => ({ getLiveSchoolClass: h.getLiveSchoolClass, getSchoolOfficialLinks: h.getSchoolOfficialLinks }));
vi.mock("@/lib/db/exam-cache", () => ({ getExamCatalog: h.getExamCatalog }));

import { CAREERS, careerCategoryLabel } from "@/data/careers";
import { ENTRANCE_GROUPS } from "@/lib/exam-kind";
import { pageCard, pageCardHeadlinePx, PAGE_CARD_SIZE } from "@/lib/og/page-card";
import {
  currentAffairsCardInput,
  entranceGroupLabels,
  ncertPdfChapters,
  resolveSchoolClass,
  schoolChapterCardInput,
  schoolChapterInputOf,
  schoolClassCardInput,
  schoolClassInputOf,
  schoolOursCounts,
  schoolSubjectCardInput,
  schoolSubjectInputOf,
} from "@/lib/og/page-card-data";
import {
  CARD_HEADLINE_MAX,
  CARD_LINE_MAX,
  PAGE_CARD_FOOTER,
  cardSafe,
  careerCardName,
  careerCardText,
  careerCoversLine,
  clipCardText,
  currentAffairsCardText,
  currentAffairsPrettyDate,
  entranceCardText,
  isCurrentAffairsDate,
  istDate,
  joinCardList,
  ncertPdfLine,
  schoolChapterCardText,
  schoolClassCardText,
  schoolOursLine,
  schoolSubjectCardText,
  type PageCardText,
} from "@/lib/og/page-card-text";
import { cisceLevelForClass, ncertSubjectsForClass, ncertTopicCode } from "@/lib/school/spine";
import * as classImage from "@/app/schooling/[slug]/[classSlug]/opengraph-image";
import * as subjectImage from "@/app/schooling/[slug]/[classSlug]/[subject]/opengraph-image";
import * as chapterImage from "@/app/schooling/[slug]/[classSlug]/[subject]/[chapter]/opengraph-image";
import * as careerImage from "@/app/careers/[slug]/opengraph-image";
import * as caImage from "@/app/current-affairs/[date]/opengraph-image";
import * as entranceImage from "@/app/exams/entrance/opengraph-image";
import type { SchoolSurfaceChapter, SchoolSurfaceClass, SchoolSurfaceSubject } from "@/lib/school/surface";
import { BOARDS, findBoard } from "@/lib/schooling-data";
import { findClassSyllabus } from "@/lib/schooling-subjects";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** Every string a card draws. */
const drawn = (c: PageCardText) => [c.section, c.headline, ...c.lines, PAGE_CARD_FOOTER];

function expectDrawable(c: PageCardText) {
  for (const s of drawn(c)) expect(cardSafe(s), s).toBe(s);
  expect(c.headline.length).toBeLessThanOrEqual(CARD_HEADLINE_MAX);
  expect(c.lines.length).toBeLessThanOrEqual(3);
  for (const l of c.lines) {
    expect(l.length).toBeLessThanOrEqual(CARD_LINE_MAX);
    expect(l.trim()).toBe(l);
    expect(l.length).toBeGreaterThan(0);
  }
}

// ── Routes, metadata exports and the pages they attach to ─────────────

const ROUTES = [
  { image: "src/app/schooling/[slug]/[classSlug]/opengraph-image.tsx", page: "src/app/schooling/[slug]/[classSlug]/page.tsx", mod: classImage },
  { image: "src/app/schooling/[slug]/[classSlug]/[subject]/opengraph-image.tsx", page: "src/app/schooling/[slug]/[classSlug]/[subject]/page.tsx", mod: subjectImage },
  { image: "src/app/schooling/[slug]/[classSlug]/[subject]/[chapter]/opengraph-image.tsx", page: "src/app/schooling/[slug]/[classSlug]/[subject]/[chapter]/page.tsx", mod: chapterImage },
  { image: "src/app/careers/[slug]/opengraph-image.tsx", page: "src/app/careers/[slug]/page.tsx", mod: careerImage },
  { image: "src/app/current-affairs/[date]/opengraph-image.tsx", page: "src/app/current-affairs/[date]/page.tsx", mod: caImage },
  { image: "src/app/exams/entrance/opengraph-image.tsx", page: "src/app/exams/entrance/page.tsx", mod: entranceImage },
];

/** The `{ … }` object literal after each `openGraph:` key (brace-matched). */
function openGraphBlocks(src: string): string[] {
  const out: string[] = [];
  const re = /openGraph\s*:\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    let depth = 0;
    let i = m.index + m[0].length - 1;
    const start = i;
    for (; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}" && --depth === 0) break;
    }
    out.push(src.slice(start, i + 1));
  }
  return out;
}

const literalRevalidate = (src: string) => {
  const m = /export const revalidate\s*=\s*([\d_]+)\s*;/.exec(src);
  return m ? Number(m[1].replace(/_/g, "")) : null;
};

describe("share-card routes", () => {
  it.each(ROUTES)("$image sits in its page's folder, exports the image metadata and matches the page's revalidate", ({ image, page, mod }) => {
    expect(fs.existsSync(path.join(ROOT, image))).toBe(true);
    expect(path.dirname(image)).toBe(path.dirname(page));
    const src = read(image);
    // Segment config must be a literal in the file itself (Next reads it statically).
    expect(src).toMatch(/export const runtime = "nodejs";/);
    expect(literalRevalidate(src)).not.toBeNull();
    expect(literalRevalidate(src)).toBe(literalRevalidate(read(page)));
    // Next 15: params is a Promise — a sync read 500'd the exam cards (2 Sep 2026).
    if (image.includes("[")) expect(src).toMatch(/params: Promise</);
    expect(mod.size).toEqual({ width: 1200, height: 630 });
    expect(mod.size).toEqual(PAGE_CARD_SIZE);
    expect(mod.contentType).toBe("image/png");
    expect(mod.runtime).toBe("nodejs");
    expect(typeof mod.alt).toBe("string");
    expect(mod.alt).toMatch(/^Shishya · /);
    expect(cardSafe(mod.alt)).toBe(mod.alt);
    expect(typeof mod.default).toBe("function");
  });

  it.each(ROUTES)("$page sets openGraph without an `images` key, so the file-based card fills it", ({ page }) => {
    const blocks = openGraphBlocks(read(page));
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) expect(b).not.toMatch(/\bimages\b/);
    // twitter: a page-level twitter.images would stop Next filling
    // twitter:image from openGraph.images.
    expect(read(page)).not.toMatch(/twitter\s*:\s*\{[^}]*\bimages\b/);
  });

  it("no textbook text: the school routes never read a chapter title, notes or book text into a card", () => {
    const data = read("src/lib/og/page-card-data.ts");
    const text = read("src/lib/og/page-card-text.ts");
    // The chapter input carries the number label, never chapter.name / notes / bookTitle.
    expect(data).not.toMatch(/chapter\.name|ch\.name|bookTitle|getSchoolChapterDetail|notes\?\./);
    expect(text).not.toMatch(/chapterName|chapterTitle|bookTitle/);
  });
});

// ── Pure text helpers ─────────────────────────────────────────────────

describe("card text helpers", () => {
  it("cardSafe keeps drawable Latin and refuses Indic scripts, the rupee sign and arrows", () => {
    expect(cardSafe("  CBSE   Class 6 · Mathematics ")).toBe("CBSE Class 6 · Mathematics");
    expect(cardSafe("Pay & Jobs — Sci-Tech")).toBe("Pay & Jobs — Sci-Tech");
    expect(cardSafe("हिंदी")).toBeNull();
    expect(cardSafe("తెలుగు")).toBeNull();
    expect(cardSafe("₹4 LPA")).toBeNull();
    expect(cardSafe("A → B")).toBeNull();
    expect(cardSafe("")).toBeNull();
    expect(cardSafe(null)).toBeNull();
  });

  it("clipCardText clips at a word boundary with an ellipsis", () => {
    expect(clipCardText("short", 10)).toBe("short");
    const c = clipCardText("History, Civics and Geography of the world", 20);
    expect(c.length).toBeLessThanOrEqual(20);
    expect(c.endsWith("…")).toBe(true);
    expect(c).toBe("History, Civics…");
  });

  it("joinCardList fits whole items, counts the rest (non-Latin items too) and never exceeds max", () => {
    expect(joinCardList(["A", "B", "C"], 50)).toBe("A · B · C");
    expect(joinCardList(["Alpha", "Beta", "Gamma", "Delta"], 23)).toBe("Alpha · Beta and 2 more");
    expect(joinCardList(["Alpha", "Beta", "Gamma", "Delta"], 22)).toBe("Alpha and 3 more");
    expect(joinCardList(["Alpha", "हिंदी", "Beta"], 50)).toBe("Alpha · Beta and 1 more");
    expect(joinCardList(["हिंदी"], 50)).toBe("");
    expect(joinCardList([], 50)).toBe("");
    expect(joinCardList(["A", "A", " A "], 50)).toBe("A");
    const long = Array.from({ length: 30 }, (_, i) => `Subject number ${i + 1}`);
    const j = joinCardList(long, CARD_LINE_MAX);
    expect(j.length).toBeLessThanOrEqual(CARD_LINE_MAX);
    const shown = j.replace(/ and \d+ more$/, "").split(" · ").length;
    expect(j).toMatch(new RegExp(` and ${30 - shown} more$`));
  });

  it("schoolOursLine says only what the rows show", () => {
    expect(schoolOursLine({ chapters: 10, both: 0, notes: 0, practice: 0 })).toBe("");
    expect(schoolOursLine({ chapters: 10, both: 2, notes: 3, practice: 2 })).toBe("Shishya's own notes and checked practice on some chapters");
    expect(schoolOursLine({ chapters: 10, both: 0, notes: 3, practice: 0 })).toBe("Shishya's own notes on some chapters");
    expect(schoolOursLine({ chapters: 4, both: 0, notes: 4, practice: 0 })).toBe("Shishya's own notes on every chapter");
    expect(schoolOursLine({ chapters: 10, both: 0, notes: 0, practice: 1 })).toBe("Checked practice questions on some chapters");
  });

  it("headline size keeps the longest headline to a readable size", () => {
    expect(pageCardHeadlinePx("CBSE Class 6")).toBe(64);
    expect(pageCardHeadlinePx("x".repeat(CARD_HEADLINE_MAX))).toBe(46);
  });
});

// ── School ────────────────────────────────────────────────────────────

function chapter(code: string, slug: string, hasNotes: boolean, validatedQuestions: number): SchoolSurfaceChapter {
  return {
    code,
    name: "A Chapter Title As Printed",
    orderIdx: 0,
    slug,
    bookCode: code.split(".")[0],
    hasNotes,
    validatedQuestions,
    noteUpdatedAt: null,
    questionsUpdatedAt: null,
    indexable: hasNotes || validatedQuestions >= 5,
    lastModified: null,
  };
}

/** A class-6 NCERT fixture built from the committed spine (real subject and
 *  chapter codes, so book and chapter-label lookups are the real ones). */
function ncertClass6(): SchoolSurfaceClass {
  const subjects: SchoolSurfaceSubject[] = ncertSubjectsForClass(6)
    .filter((s) => s.books.some((b) => b.chapters.filter((c) => c.number).length >= 3))
    .slice(0, 3)
    .map((s, si) => {
      const book = s.books.find((b) => b.chapters.filter((c) => c.number).length >= 3)!;
      const chapters = book.chapters.filter((c) => c.number).slice(0, 3).map((c, ci) =>
        chapter(ncertTopicCode(book.code, c.pdfSeq), `ch-${si}-${ci}`, si === 0 && ci === 0, si === 0 && ci === 0 ? 12 : 0),
      );
      return { code: s.code, name: s.name, slug: `subject-${si}`, orderIdx: si, chapters, lastModified: null };
    });
  return { examCode: "NCERT_C06", curriculum: "NCERT", boardSlug: "cbse", cls: 6, name: "NCERT Class 6", updatedAt: "2026-09-26T00:00:00Z", subjects, lastModified: null };
}

function cisceClass10(): SchoolSurfaceClass {
  const level = cisceLevelForClass(10)!;
  const withPdf = level.subjects.find((s) => (s.syllabusUrls ?? []).length > 0)!;
  const subjects: SchoolSurfaceSubject[] = [
    { code: "C10A", name: withPdf.name, slug: "with-pdf", orderIdx: 0, chapters: [], lastModified: null },
    { code: "C10B", name: "A Subject CISCE Publishes No PDF For", slug: "no-pdf", orderIdx: 1, chapters: [], lastModified: null },
  ];
  return { examCode: "CISCE_C10", curriculum: "CISCE", boardSlug: "icse-cisce", cls: 10, name: "CISCE Class 10", updatedAt: "2026-09-26T00:00:00Z", subjects, lastModified: null };
}

describe("school cards", () => {
  const cbse = findBoard("cbse")!;
  const cisce = findBoard("icse-cisce")!;

  it("NCERT class: board + class, subject names, the official PDFs and the computed notes/practice line", () => {
    const live = ncertClass6();
    const card = schoolClassCardText(schoolClassInputOf({ kind: "live", board: cbse, cls: 6, live }));
    expectDrawable(card);
    expect(card.section).toBe("School");
    expect(card.headline).toBe("CBSE Class 6");
    for (const s of live.subjects) expect(card.lines[0]).toContain(s.name);
    expect(card.lines[1]).toBe("Every chapter linked to its official NCERT PDF");
    expect(card.lines[2]).toBe("Shishya's own notes and checked practice on some chapters");
    // No notes or practice anywhere → no third line.
    const bare = { ...live, subjects: live.subjects.map((s) => ({ ...s, chapters: s.chapters.map((c) => ({ ...c, hasNotes: false, validatedQuestions: 0 })) })) };
    expect(schoolClassCardText(schoolClassInputOf({ kind: "live", board: cbse, cls: 6, live: bare })).lines).toHaveLength(2);
  });

  it("CISCE class and subjects: the council's documents, never NCERT", () => {
    const live = cisceClass10();
    const r = { kind: "live", board: cisce, cls: 10, live } as const;
    const cls = schoolClassCardText(schoolClassInputOf(r));
    expectDrawable(cls);
    expect(cls.headline).toBe("ICSE / ISC Class 10");
    expect(cls.lines[1]).toBe("CISCE's own syllabus PDFs linked where the council publishes them");
    expect(cls.lines.join(" ")).not.toMatch(/NCERT/);
    const withPdf = schoolSubjectCardText(schoolSubjectInputOf(r, "with-pdf"));
    expect(withPdf.lines).toEqual(["CISCE's own syllabus PDF for this subject linked", "CISCE prescribes a syllabus, not one textbook"]);
    const noPdf = schoolSubjectCardText(schoolSubjectInputOf(r, "no-pdf"));
    expect(noPdf.lines[0]).toBe("CISCE's curriculum document for this stage linked");
  });

  it("NCERT subject and chapter: number label only (never the title), what the chapter has, the official PDF", () => {
    const live = ncertClass6();
    const r = { kind: "live", board: cbse, cls: 6, live } as const;
    const subject = live.subjects[0];
    const sc = schoolSubjectCardText(schoolSubjectInputOf(r, subject.slug));
    expectDrawable(sc);
    expect(sc.headline).toBe(`CBSE Class 6 ${subject.name}`);
    expect(sc.lines).toEqual(["Every chapter linked to its official NCERT PDF", "Shishya's own notes and checked practice on some chapters"]);

    const first = schoolChapterCardText(schoolChapterInputOf(r, subject.slug, subject.chapters[0].slug, null));
    expectDrawable(first);
    expect(first.headline).toBe(`CBSE Class 6 ${subject.name}`);
    expect(first.lines[0]).toMatch(/^[A-Z][a-z]+ [0-9IVX]+$/); // "Chapter 1", "Lesson 2", "Unit 3", "Chapter II"
    expect(first.lines).toContain("Shishya's own notes and checked practice questions");
    expect(first.lines).toContain("The official NCERT chapter PDF linked");
    for (const s of drawn(first)) expect(s).not.toContain("A Chapter Title As Printed");

    const bare = schoolChapterCardText(schoolChapterInputOf(r, subject.slug, subject.chapters[1].slug, null));
    expect(bare.lines.join(" ")).not.toMatch(/notes|practice/i);
    expect(bare.lines).toContain("The official NCERT chapter PDF linked");

    // A code outside the spine: no label and no PDF claim unless the DB links one.
    const off = { ...live, subjects: [{ ...subject, chapters: [chapter("zzz1.ch01", "off", false, 0)] }] };
    const offCard = schoolChapterCardText(schoolChapterInputOf({ kind: "live", board: cbse, cls: 6, live: off }, subject.slug, "off", null));
    expect(offCard.lines).toEqual([]);
    const linked = schoolChapterCardText(schoolChapterInputOf({ kind: "live", board: cbse, cls: 6, live: off }, subject.slug, "off", { "zzz1.ch01": "https://ncert.nic.in/textbook/pdf/x.pdf" }));
    expect(linked.lines).toEqual(["The official NCERT chapter PDF linked"]);
  });

  it("an unknown subject / chapter falls back to the class / subject card", () => {
    const live = ncertClass6();
    const r = { kind: "live", board: cbse, cls: 6, live } as const;
    expect(schoolSubjectCardText(schoolSubjectInputOf(r, "nope"))).toEqual(schoolClassCardText(schoolClassInputOf(r)));
    expect(schoolChapterCardText(schoolChapterInputOf(r, live.subjects[0].slug, "nope", null))).toEqual(
      schoolSubjectCardText(schoolSubjectInputOf(r, live.subjects[0].slug)),
    );
  });

  it("every board × class on the 25 Sep form: true, drawable cards for the class, its subjects and chapters", () => {
    let n = 0;
    for (const board of BOARDS) {
      for (const cls of board.classes) {
        const r = { kind: "legacy", board, cls } as const;
        const c = schoolClassCardText(schoolClassInputOf(r));
        expectDrawable(c);
        expect(c.headline).toBe(`${board.shortName} Class ${cls}`);
        const syl = findClassSyllabus(board.slug, cls);
        expect(c.lines).toEqual([
          syl
            ? board.slug === "cbse"
              ? "Subjects, with links to the official NCERT textbooks"
              : "Subjects, with links to the board's official syllabuses"
            : "The board's official source linked",
        ]);
        for (const s of syl?.subjects ?? []) {
          expectDrawable(schoolSubjectCardText(schoolSubjectInputOf(r, s.slug)));
          for (const ch of s.chapters ?? []) {
            const cc = schoolChapterCardText(schoolChapterInputOf(r, s.slug, ch.slug, null));
            expectDrawable(cc);
            expect(cc.lines[0]).toBe(`Chapter ${ch.number}`);
            if (ch.name.length >= 8) for (const x of drawn(cc)) expect(x).not.toContain(ch.name);
          }
        }
        n++;
      }
    }
    expect(n).toBeGreaterThan(50);
  });

  it("unknown board or class → the generic school card; a failed surface read → board and class only", async () => {
    expect(schoolClassCardText(schoolClassInputOf({ kind: "unknown" })).headline).toBe("School, Classes 1-12");
    h.getLiveSchoolClass.mockReset().mockRejectedValue(new Error("neon timeout"));
    const r = await resolveSchoolClass("cbse", "class-6");
    expect(r.kind).toBe("unread");
    const c = schoolClassCardText(await schoolClassCardInput("cbse", "class-6"));
    expect(c).toEqual({ section: "School", headline: "CBSE Class 6", lines: [] });
    expect((await resolveSchoolClass("cbse", "class-13")).kind).toBe("unknown");
    expect((await resolveSchoolClass("no-such-board", "class-6")).kind).toBe("unknown");
  });

  it("the official-PDF line says 'every chapter' only when every chapter's PDF is known", () => {
    expect(ncertPdfLine(10, 10)).toBe("Every chapter linked to its official NCERT PDF");
    expect(ncertPdfLine(10, 9)).toBe("Official NCERT chapter PDFs linked");
    expect(ncertPdfLine(0, 0)).toBe("Official NCERT textbooks linked");
    expect(ncertPdfLine(3, 0)).toBe("Official NCERT textbooks linked");
    const live = ncertClass6();
    const chapters = live.subjects.flatMap((s) => s.chapters);
    expect(ncertPdfChapters(6, chapters)).toBe(chapters.length);
    const off = [...chapters, chapter("zzz1.ch01", "off", false, 0)];
    expect(ncertPdfChapters(6, off)).toBe(chapters.length);
    expect(ncertPdfChapters(6, off, { "zzz1.ch01": "https://ncert.nic.in/textbook/pdf/x.pdf" })).toBe(off.length);
    const withOff = { ...live, subjects: [{ ...live.subjects[0], chapters: off }] };
    const card = schoolClassCardText(schoolClassInputOf({ kind: "live", board: cbse, cls: 6, live: withOff }));
    expect(card.lines[1]).toBe("Official NCERT chapter PDFs linked");
  });

  it("schoolOursCounts counts chapters at the guest-quiz minimum", () => {
    expect(
      schoolOursCounts([
        { hasNotes: true, validatedQuestions: 5 },
        { hasNotes: true, validatedQuestions: 4 },
        { hasNotes: false, validatedQuestions: 9 },
        { hasNotes: false, validatedQuestions: 0 },
      ]),
    ).toEqual({ chapters: 4, both: 1, notes: 2, practice: 2 });
  });
});

// ── Careers (every career) ────────────────────────────────────────────

describe("career cards", () => {
  it("every career: its name (Latin), its field and only the sections its data fills", () => {
    expect(CAREERS.length).toBeGreaterThan(40);
    for (const c of CAREERS) {
      const card = careerCardText({ ...c, categoryLabel: careerCategoryLabel(c.category) });
      expectDrawable(card);
      expect(card.section).toBe("Careers");
      const name = careerCardName(c.name);
      expect(name, c.slug).not.toBeNull();
      expect(card.headline.startsWith(name!)).toBe(true);
      expect(card.lines[0]).toBe(careerCategoryLabel(c.category));
      const covers = careerCoversLine(c).toLowerCase();
      expect(covers.includes("how to get in")).toBe(c.entryRoutes.length > 0);
      expect(covers.includes("qualifications")).toBe(c.qualifications.length > 0);
      expect(covers.includes("salary")).toBe(c.salaryBands.length > 0);
      expect(covers.includes("pros and cons")).toBe(c.pros.length > 0 && c.cons.length > 0);
      // No figures on the card: bands are indicative and ₹ does not draw.
      expect(card.lines.join(" ")).not.toMatch(/LPA|₹|\d/);
    }
  });

  it("a name with an undrawable bracketed note keeps its drawable part; unknown slug → the /careers card", () => {
    expect(careerCardName("College Professor (Assistant Professor → Full Professor)")).toBe("College Professor");
    expect(careerCardName("हिंदी शिक्षक")).toBeNull();
    expect(careerCardText(undefined).headline).toBe("Career guides for students in India");
  });
});

// ── Current affairs ───────────────────────────────────────────────────

describe("current-affairs cards", () => {
  it("formats the date as the page does and computes the IST date", () => {
    expect(currentAffairsPrettyDate("2026-09-24")).toBe("24 September 2026");
    expect(istDate(new Date("2026-09-25T18:29:59Z"))).toBe("2026-09-25");
    expect(istDate(new Date("2026-09-25T18:30:00Z"))).toBe("2026-09-26");
    expect(isCurrentAffairsDate("2026-09-24")).toBe(true);
    expect(isCurrentAffairsDate("2026-02-30")).toBe(false);
    expect(isCurrentAffairsDate("24-09-2026")).toBe(false);
  });

  it("a closed day draws the page's own count; today's digest (still growing) draws none", () => {
    const closed = currentAffairsCardText({ date: "2026-09-24", count: 12, categories: ["Economy", "National"], today: "2026-09-26" });
    expectDrawable(closed);
    expect(closed).toEqual({
      section: "Current affairs",
      headline: "24 September 2026",
      lines: ["12 updates for UPSC, SSC, banking, railways and state exams", "Economy · National"],
    });
    expect(currentAffairsCardText({ date: "2026-09-24", count: 1, categories: [], today: "2026-09-25" }).lines[0]).toMatch(/^1 update for /);
    const today = currentAffairsCardText({ date: "2026-09-26", count: 7, categories: ["Pay & Jobs"], today: "2026-09-26" });
    expect(today.lines[0]).not.toMatch(/\d/);
    expect(today.lines[1]).toBe("Pay & Jobs");
    const none = currentAffairsCardText({ date: "2026-09-24", count: 0, categories: [], today: "2026-09-26" });
    expect(none.headline).toBe("Daily current affairs");
    expect(currentAffairsCardText({ date: "junk", count: 3, categories: [], today: "2026-09-26" }).headline).toBe("Daily current affairs");
  });

  it("reads the day's rows grouped by category, and a failed read gives the generic card", async () => {
    h.queryRaw.mockReset().mockResolvedValue([
      { category: "Economy", n: 3 },
      { category: "National", n: 2 },
    ]);
    const input = await currentAffairsCardInput("2026-09-24", new Date("2026-09-26T06:00:00Z"));
    expect(input).toEqual({ date: "2026-09-24", count: 5, categories: ["Economy", "National"], today: "2026-09-26" });
    expect(h.queryRaw.mock.calls[0][0]).toMatch(/FROM "CurrentAffair" WHERE date = \$1::date/);
    expect(h.queryRaw.mock.calls[0][1]).toBe("2026-09-24");
    h.queryRaw.mockReset().mockRejectedValue(new Error("down"));
    expect(currentAffairsCardText(await currentAffairsCardInput("2026-09-24")).headline).toBe("Daily current affairs");
    h.queryRaw.mockReset();
    await currentAffairsCardInput("2026-02-30");
    expect(h.queryRaw).not.toHaveBeenCalled();
  });
});

// ── Entrance ──────────────────────────────────────────────────────────

describe("entrance card", () => {
  it("lists only the groups that have exams, in the page's order", async () => {
    h.getExamCatalog.mockReset().mockResolvedValue([
      { code: "NEET_UG", category: "MEDICAL" },
      { code: "JEE_MAIN", category: "ENGINEERING" },
      { code: "NCERT_C06", category: "SCHOOL_BOARD" },
      { code: "SSC_CGL", category: "GOVT_JOBS" },
    ]);
    const labels = await entranceGroupLabels();
    expect(labels).toEqual(["Engineering", "Medical"]);
    const card = entranceCardText(labels);
    expectDrawable(card);
    expect(card.headline).toBe("Entrance exams in India");
    expect(card.lines[0]).toBe("Engineering · Medical");
    const all = entranceCardText(ENTRANCE_GROUPS.map((g) => g.label));
    expectDrawable(all);
    expect(all.lines[0]).toBe(ENTRANCE_GROUPS.map((g) => g.label).join(" · "));
    h.getExamCatalog.mockReset().mockRejectedValue(new Error("down"));
    expect(await entranceGroupLabels()).toEqual([]);
    expect(entranceCardText([]).lines[0]).toBe("JEE, NEET, CUET, NDA, olympiads and state CETs");
  });
});

// ── Rendering: each route returns a real PNG ──────────────────────────

async function png(res: Response): Promise<Buffer> {
  expect(res.headers.get("content-type")).toBe("image/png");
  const buf = Buffer.from(await res.arrayBuffer());
  expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(buf.length).toBeGreaterThan(10_000);
  return buf;
}

describe("share-card routes render", () => {
  beforeEach(() => {
    h.getLiveSchoolClass.mockReset().mockImplementation(async (slug: string, cls: number) => (slug === "cbse" && cls === 6 ? ncertClass6() : undefined));
    h.getSchoolOfficialLinks.mockReset().mockResolvedValue({ byChapter: {}, classDocs: [] });
    h.queryRaw.mockReset().mockResolvedValue([{ category: "Economy", n: 4 }]);
    h.getExamCatalog.mockReset().mockResolvedValue([{ code: "JEE_MAIN", category: "ENGINEERING" }]);
  });

  it("school class, subject and chapter", async () => {
    const live = ncertClass6();
    const s = live.subjects[0];
    expect((await schoolSubjectCardInput("cbse", "class-6", s.slug)).kind).toBe("live");
    expect((await schoolChapterCardInput("cbse", "class-6", s.slug, s.chapters[0].slug)).kind).toBe("live");
    const cls = classImage;
    await png(await cls.default({ params: Promise.resolve({ slug: "cbse", classSlug: "class-6" }) }));
    await png(await subjectImage.default({ params: Promise.resolve({ slug: "cbse", classSlug: "class-6", subject: s.slug }) }));
    await png(await chapterImage.default({ params: Promise.resolve({ slug: "cbse", classSlug: "class-6", subject: s.slug, chapter: s.chapters[0].slug }) }));
    // A state board on the 25 Sep form, and a bad segment, still render.
    const state = BOARDS.find((b) => b.type === "state")!;
    await png(await cls.default({ params: Promise.resolve({ slug: state.slug, classSlug: `class-${state.classes[0]}` }) }));
    await png(await cls.default({ params: Promise.resolve({ slug: "cbse", classSlug: "class-99" }) }));
  }, 30_000);

  it("career, current-affairs day and entrance", async () => {
    await png(await careerImage.default({ params: Promise.resolve({ slug: CAREERS[0].slug }) }));
    await png(await careerImage.default({ params: Promise.resolve({ slug: "no-such-career" }) }));
    await png(await caImage.default({ params: Promise.resolve({ date: "2026-09-24" }) }));
    await png(await caImage.default({ params: Promise.resolve({ date: "not-a-date" }) }));
    await png(await entranceImage.default());
  }, 30_000);

  it("the longest drawable card still renders", async () => {
    const worst: PageCardText = {
      section: "Current affairs",
      headline: "W".repeat(CARD_HEADLINE_MAX),
      lines: ["M".repeat(CARD_LINE_MAX), "M".repeat(CARD_LINE_MAX), "M".repeat(CARD_LINE_MAX)],
    };
    await png(pageCard(worst));
  }, 30_000);
});

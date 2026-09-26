// School search surface (26 Sep 2026, go-live) — src/lib/school/surface.ts
// and src/lib/school/context.ts as tests, plus the static shape of the four
// surface files (sitemap.ts, llms-full.txt, robots.ts, public/llms.txt).
//
//   1. URL rules: board / class / subject / chapter slugs, round trips, the
//      book-code suffix for a repeated chapter title;
//   2. the indexable rule is scope.ts's (notes, or the guest quiz minimum);
//   3. the loader over a mocked Prisma: classes, subjects, chapters, content
//      flags, computed lastModified; a foreign SCHOOL_BOARD code is skipped;
//   4. the sitemap lists boards, classes, subjects and ONLY indexable
//      chapters, with lastmod from content timestamps and never "now";
//   5. llms-full.txt's School block computes its counts;
//   6. context.md renders for a class WITH content (official PDF + Shishya
//      URL per ready chapter) and WITHOUT (CISCE: syllabus links, "no notes
//      or practice yet"), and for a subject;
//   7. static: sitemap.ts / llms-full.txt use the loader, robots allows
//      /schooling for every rule, llms.txt's School section types no count.
//   5b (fixer, 26 Sep 2026): the spine's documents — a CISCE stage document
//      vs per-subject syllabus PDFs, an NCERT subject with no book yet — and
//      the children line that claims no storage or sign-in the code lacks.
// Prisma is mocked; no DB, no network. Run: npx vitest run tests/unit/school-surface.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({ exams: [] as unknown[], rows: [] as unknown[], fail: false }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    exam: {
      findMany: async () => {
        if (db.fail) throw new Error("Neon timeout");
        return db.exams;
      },
    },
    $queryRaw: async () => db.rows,
  },
}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import {
  CHAPTER_INDEXABLE_MIN_QUESTIONS,
  EMPTY_SCHOOL_SURFACE,
  SCHOOL_BOARDS,
  SCHOOL_CHILDREN_LINE,
  chapterContentLabel,
  findSchoolChapterBySlug,
  findSchoolClass,
  isSchoolChapterIndexable,
  isSchoolSubjectIndexable,
  kebab,
  loadSchoolSurface,
  parseSchoolClassSlug,
  readSchoolSurface,
  schoolBoardForExamCode,
  schoolChapterPath,
  schoolChapterSlugs,
  schoolClassOfExamCode,
  schoolExamCode,
  schoolLlmsFullLines,
  schoolSitemapEntries,
  schoolSubjectCodeFromSlug,
  schoolSubjectSlug,
  schoolSurfaceCounts,
  type SchoolSurface,
} from "@/lib/school/surface";
import { SCHOOL_GUEST_QUIZ_MIN, isSchoolChapterIndexable as scopeRule } from "@/lib/school/scope";
import { schoolClassContextMarkdown, schoolClassIdentity, schoolContextHonestyLines, schoolSubjectContextMarkdown } from "@/lib/school/context";
import { liveClassesByBoard, schoolLandingSitemapEntries } from "@/lib/school/landings";
import { BOARDS, isSchoolBoardIndexable } from "@/lib/schooling-data";
import robots from "@/app/robots";

const ROOT = path.resolve(__dirname, "../..");
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const SITE = "https://shishya.in";
const NOTE_AT = "2026-09-26T03:17:57.452Z";
const Q_AT = "2026-09-26T03:39:12.567Z";
const EXAM_AT = "2026-09-26T01:00:00.000Z";
const NOW = new Date("2026-09-26T12:00:00.000Z");

// ── Fixture: NCERT Class 6 (content on Maths ch 1-5, edge cases on 6-8),
// CISCE Class 10 (subjects only), and a container code with no URL. ──

function chapter(examCode: string, subjectCode: string, code: string, name: string, orderIdx: number, c: { notes?: boolean; q?: number } = {}) {
  const notes = c.notes ?? false;
  const q = c.q ?? 0;
  return {
    examCode,
    subjectCode,
    code,
    name,
    orderIdx,
    hasNotes: notes,
    noteUpdatedAt: notes ? new Date(NOTE_AT) : null,
    validatedQuestions: q,
    questionsUpdatedAt: q > 0 ? new Date(Q_AT) : null,
  };
}

function fixture() {
  db.fail = false;
  db.exams = [
    {
      code: "CISCE_C10",
      name: "CISCE Class 10",
      updatedAt: new Date(EXAM_AT),
      subjects: [
        { code: "ENGLISH", name: "English", orderIdx: 1 },
        { code: "MATHEMATICS", name: "Mathematics", orderIdx: 2 },
      ],
    },
    {
      code: "NCERT_C06",
      name: "NCERT Class 6",
      updatedAt: new Date(EXAM_AT),
      subjects: [
        { code: "HINDI", name: "Hindi", orderIdx: 1 },
        { code: "MATHEMATICS", name: "Mathematics", orderIdx: 2 },
        { code: "SOCIAL_SCIENCE", name: "Social Science", orderIdx: 3 },
      ],
    },
    { code: "TNSB_C10", name: "TN State Board Class 10", updatedAt: new Date(EXAM_AT), subjects: [{ code: "TAMIL", name: "Tamil", orderIdx: 1 }] },
  ];
  db.rows = [
    chapter("NCERT_C06", "MATHEMATICS", "fegp1.ch01", "Patterns in Mathematics", 101, { notes: true, q: 38 }),
    chapter("NCERT_C06", "MATHEMATICS", "fegp1.ch02", "Lines and Angles", 102, { notes: true, q: 39 }),
    chapter("NCERT_C06", "MATHEMATICS", "fegp1.ch03", "Number Play", 103, { notes: true, q: 35 }),
    chapter("NCERT_C06", "MATHEMATICS", "fegp1.ch04", "Data Handling and Presentation", 104, { notes: true, q: 38 }),
    chapter("NCERT_C06", "MATHEMATICS", "fegp1.ch05", "Prime Time", 105, { notes: true, q: 40 }),
    chapter("NCERT_C06", "MATHEMATICS", "fegp1.ch06", "Perimeter and Area", 106),
    chapter("NCERT_C06", "MATHEMATICS", "fegp1.ch07", "Fractions", 107, { q: SCHOOL_GUEST_QUIZ_MIN - 1 }),
    chapter("NCERT_C06", "MATHEMATICS", "fegp1.ch08", "Playing with Constructions", 108, { q: SCHOOL_GUEST_QUIZ_MIN }),
    chapter("NCERT_C06", "SOCIAL_SCIENCE", "fees1.ch01", "Locating Places on the Earth", 101),
    chapter("TNSB_C10", "TAMIL", "x.ch01", "Something", 101, { notes: true, q: 50 }),
  ];
}

beforeEach(fixture);

// ── 1. URL rules ──────────────────────────────────────────────────────

describe("school URL rules", () => {
  it("maps every NCERT / CISCE container code to its board and class, and back", () => {
    for (const b of SCHOOL_BOARDS) {
      for (let cls = 1; cls <= 12; cls++) {
        const code = schoolExamCode(b.slug, cls);
        expect(code).toBe(`${b.curriculum}_C${String(cls).padStart(2, "0")}`);
        expect(schoolBoardForExamCode(code!)).toBe(b);
        expect(schoolClassOfExamCode(code!)).toBe(cls);
      }
    }
    expect(schoolBoardForExamCode("NCERT_C06")?.slug).toBe("cbse");
    expect(schoolBoardForExamCode("CISCE_C10")?.slug).toBe("icse-cisce");
    for (const bad of ["SSC_CGL", "TNSB_C10", "NCERT_C13", "NCERT_C00", "NCERT_C6", "ncert_c06"]) {
      expect(schoolBoardForExamCode(bad), bad).toBeNull();
      expect(schoolClassOfExamCode(bad), bad).toBeNull();
    }
    expect(schoolExamCode("up-board", 10)).toBeNull();
    expect(schoolExamCode("cbse", 13)).toBeNull();
    expect(schoolExamCode("cbse", 0)).toBeNull();
  });

  it("parses the class-N segment strictly", () => {
    expect(parseSchoolClassSlug("class-6")).toBe(6);
    expect(parseSchoolClassSlug("class-12")).toBe(12);
    for (const bad of ["class-0", "class-13", "class-06", "class-6x", "Class-6", "6", "class-"]) expect(parseSchoolClassSlug(bad), bad).toBeNull();
  });

  it("subject slugs are the lower-kebab of Subject.code and round-trip", () => {
    expect(schoolSubjectSlug("MATHEMATICS")).toBe("mathematics");
    expect(schoolSubjectSlug("SOCIAL_SCIENCE")).toBe("social-science");
    expect(schoolSubjectSlug("HISTORY_CIVICS_AND_GEOGRAPHY")).toBe("history-civics-and-geography");
    for (const code of ["MATHEMATICS", "SOCIAL_SCIENCE", "ENVIRONMENTAL_STUDIES_EVS", "ART_PAPERS_1_TO_6"]) {
      expect(schoolSubjectCodeFromSlug(schoolSubjectSlug(code))).toBe(code);
    }
  });

  it("kebab folds diacritics and punctuation", () => {
    expect(kebab("Patterns in Mathematics")).toBe("patterns-in-mathematics");
    expect(kebab("Orienting Yourself: The Use of Coordinates")).toBe("orienting-yourself-the-use-of-coordinates");
    expect(kebab("Baudhāyana's Theorem")).toBe("baudhayana-s-theorem");
    expect(kebab("  Two — Stories, About Flying!  ")).toBe("two-stories-about-flying");
    expect(kebab("पुष्प")).toBe("");
  });

  it("chapter slugs: the kebab title, with the book code only where two books of a subject share a title", () => {
    const geography = [
      { code: "legy1.ch07", name: "Transport and Communication" },
      { code: "legy1.ch08", name: "International Trade" },
      { code: "legy2.ch07", name: "Transport and Communication" },
      { code: "legy2.ch08", name: "International Trade" },
      { code: "legy2.ch09", name: "Geographical Perspective on Selected Issues and Problems" },
      { code: "leud1.ch01", name: "पुष्प" },
    ];
    const slugs = schoolChapterSlugs(geography);
    expect(slugs.get("legy1.ch07")).toBe("transport-and-communication-legy1");
    expect(slugs.get("legy2.ch07")).toBe("transport-and-communication-legy2");
    expect(slugs.get("legy1.ch08")).toBe("international-trade-legy1");
    expect(slugs.get("legy2.ch09")).toBe("geographical-perspective-on-selected-issues-and-problems");
    // No ASCII letters in the title: the book code alone names it.
    expect(slugs.get("leud1.ch01")).toBe("leud1");
    expect(findSchoolChapterBySlug(geography, "transport-and-communication-legy2")?.code).toBe("legy2.ch07");
    expect(findSchoolChapterBySlug(geography, "transport-and-communication")).toBeUndefined();
    // The common case: no suffix.
    const maths = [
      { code: "fegp1.ch01", name: "Patterns in Mathematics" },
      { code: "fegp1.ch02", name: "Lines and Angles" },
    ];
    expect([...schoolChapterSlugs(maths).values()]).toEqual(["patterns-in-mathematics", "lines-and-angles"]);
    // An edition tag stays in the suffix so a reissued book never collides with the old one.
    const reissued = [
      { code: "iemh1.ch01", name: "Introduction" },
      { code: "iemh1-2026.ch01", name: "Introduction" },
    ];
    expect([...schoolChapterSlugs(reissued).values()]).toEqual(["introduction-iemh1", "introduction-iemh1-2026"]);
    expect(schoolChapterPath("cbse", 6, "mathematics", "prime-time")).toBe("/schooling/cbse/class-6/mathematics/prime-time");
  });

  it("one book printing a title more than once still gives every chapter its own slug (fixer, 26 Sep 2026)", () => {
    // Class 9 Skill Education, iekv1 "Additional Vocations" ×3: the book code
    // alone put three chapters on one URL, and the page served chapter 4 for
    // all of them. The second and later carry the whole Topic.code.
    const skill = [
      { code: "iekv1.ch03", name: "Beauty and Wellness" },
      { code: "iekv1.ch04", name: "Additional Vocations" },
      { code: "iekv1.ch08", name: "Additional Vocations" },
      { code: "iekv1.ch12", name: "Additional Vocations" },
    ];
    const slugs = schoolChapterSlugs(skill);
    expect([...slugs.values()]).toEqual(["beauty-and-wellness", "additional-vocations-iekv1", "additional-vocations-iekv1-ch08", "additional-vocations-iekv1-ch12"]);
    expect(new Set(slugs.values()).size).toBe(skill.length);
    expect(findSchoolChapterBySlug(skill, "additional-vocations-iekv1-ch12")?.code).toBe("iekv1.ch12");
    expect(findSchoolChapterBySlug(skill, "additional-vocations-iekv1")?.code).toBe("iekv1.ch04");
    // Same title across two books AND twice in one of them: still injective and deterministic.
    const mixed = [
      { code: "a1.ch01", name: "Introduction" },
      { code: "a1.ch02", name: "Introduction" },
      { code: "b1.ch01", name: "Introduction" },
    ];
    expect([...schoolChapterSlugs(mixed).values()]).toEqual(["introduction-a1", "introduction-a1-ch02", "introduction-b1"]);
    expect([...schoolChapterSlugs(mixed).entries()]).toEqual([...schoolChapterSlugs(mixed).entries()]);
  });
});

// ── 2. The indexable rule ─────────────────────────────────────────────

describe("the chapter indexable rule is scope.ts's", () => {
  it("notes, or the guest-quiz minimum of checked questions", () => {
    expect(CHAPTER_INDEXABLE_MIN_QUESTIONS).toBe(SCHOOL_GUEST_QUIZ_MIN);
    expect(isSchoolChapterIndexable).toBe(scopeRule);
    expect(isSchoolChapterIndexable({ hasNotes: true, validatedQuestions: 0 })).toBe(true);
    expect(isSchoolChapterIndexable({ hasNotes: false, validatedQuestions: SCHOOL_GUEST_QUIZ_MIN })).toBe(true);
    expect(isSchoolChapterIndexable({ hasNotes: false, validatedQuestions: SCHOOL_GUEST_QUIZ_MIN - 1 })).toBe(false);
    expect(isSchoolChapterIndexable({ hasNotes: false, validatedQuestions: 0 })).toBe(false);
  });

  it("the content label never calls a question an exercise or a board question", () => {
    expect(chapterContentLabel({ hasNotes: true, validatedQuestions: 38 })).toBe("Shishya notes + 38 answer-checked practice questions");
    expect(chapterContentLabel({ hasNotes: false, validatedQuestions: 5 })).toBe("5 answer-checked practice questions");
    expect(chapterContentLabel({ hasNotes: true, validatedQuestions: 4 })).toBe("Shishya notes");
    expect(chapterContentLabel({ hasNotes: false, validatedQuestions: 4 })).toBe("Shishya notes and practice not ready yet");
    for (const l of [chapterContentLabel({ hasNotes: true, validatedQuestions: 38 })]) expect(l).not.toMatch(/exercise|board question|NCERT question/i);
  });
});

// ── 3. The loader ─────────────────────────────────────────────────────

describe("readSchoolSurface", () => {
  it("assembles classes → subjects → chapters from the rows, skipping a container code with no URL", async () => {
    const s = await readSchoolSurface(NOW);
    expect(s.readAt).toBe(NOW.toISOString());
    expect(s.classes.map((c) => c.examCode)).toEqual(["CISCE_C10", "NCERT_C06"]);
    const c6 = findSchoolClass(s, "cbse", 6)!;
    expect(c6).toMatchObject({ curriculum: "NCERT", boardSlug: "cbse", cls: 6, name: "NCERT Class 6", updatedAt: EXAM_AT, lastModified: Q_AT });
    expect(c6.subjects.map((x) => [x.slug, x.chapters.length])).toEqual([
      ["hindi", 0],
      ["mathematics", 8],
      ["social-science", 1],
    ]);
    const maths = c6.subjects[1];
    expect(maths.lastModified).toBe(Q_AT);
    expect(maths.chapters.map((ch) => ch.slug)).toEqual([
      "patterns-in-mathematics",
      "lines-and-angles",
      "number-play",
      "data-handling-and-presentation",
      "prime-time",
      "perimeter-and-area",
      "fractions",
      "playing-with-constructions",
    ]);
    expect(maths.chapters[0]).toMatchObject({
      code: "fegp1.ch01",
      bookCode: "fegp1",
      hasNotes: true,
      validatedQuestions: 38,
      noteUpdatedAt: NOTE_AT,
      questionsUpdatedAt: Q_AT,
      indexable: true,
      lastModified: Q_AT,
    });
    expect(maths.chapters[5]).toMatchObject({ hasNotes: false, validatedQuestions: 0, noteUpdatedAt: null, questionsUpdatedAt: null, indexable: false, lastModified: null });
    expect(maths.chapters[6]).toMatchObject({ validatedQuestions: SCHOOL_GUEST_QUIZ_MIN - 1, indexable: false, lastModified: Q_AT });
    expect(maths.chapters[7]).toMatchObject({ validatedQuestions: SCHOOL_GUEST_QUIZ_MIN, indexable: true, noteUpdatedAt: null, lastModified: Q_AT });
    expect(c6.subjects[0].lastModified).toBeNull();
    expect(c6.subjects[2].lastModified).toBeNull();
    const c10 = findSchoolClass(s, "icse-cisce", 10)!;
    expect(c10).toMatchObject({ curriculum: "CISCE", boardSlug: "icse-cisce", cls: 10, lastModified: null });
    expect(c10.subjects.map((x) => x.slug)).toEqual(["english", "mathematics"]);
    expect(findSchoolClass(s, "cbse", 7)).toBeUndefined();
    expect(findSchoolClass(s, "up-board", 10)).toBeUndefined();
    expect(schoolSurfaceCounts(s)).toEqual({ boards: 2, classes: 2, subjects: 5, chapters: 9, chaptersWithNotes: 5, chaptersWithPractice: 6, indexableChapters: 6 });
  });

  it("is empty with no containers, and the cached loader rejects on a failed read (callers fall back to EMPTY_SCHOOL_SURFACE)", async () => {
    db.exams = [];
    expect((await readSchoolSurface(NOW)).classes).toEqual([]);
    db.fail = true;
    await expect(loadSchoolSurface()).rejects.toThrow(/Neon/);
    expect(await loadSchoolSurface().catch(() => EMPTY_SCHOOL_SURFACE)).toBe(EMPTY_SCHOOL_SURFACE);
    expect(schoolSitemapEntries(EMPTY_SCHOOL_SURFACE, SITE)).toEqual([]);
    expect(schoolLlmsFullLines(EMPTY_SCHOOL_SURFACE, SITE)).toEqual([]);
  });
});

// ── 4. Sitemap ────────────────────────────────────────────────────────

describe("schoolSitemapEntries", () => {
  // 26 Sep 2026 (G1 index hygiene): a subject is listed only with a chapter
  // list — the CISCE Class 10 subjects and NCERT Class 6 Hindi (no chapter
  // rows) are official links and nothing more, noindex,follow, off the sitemap.
  it("lists boards, classes, subjects with a chapter list and only indexable chapters", async () => {
    const entries = schoolSitemapEntries(await readSchoolSurface(NOW), SITE);
    const urls = entries.map((e) => e.url.replace(SITE, ""));
    expect(urls).toEqual([
      "/schooling/cbse",
      "/schooling/icse-cisce",
      "/schooling/icse-cisce/class-10",
      "/schooling/cbse/class-6",
      "/schooling/cbse/class-6/mathematics",
      "/schooling/cbse/class-6/mathematics/patterns-in-mathematics",
      "/schooling/cbse/class-6/mathematics/lines-and-angles",
      "/schooling/cbse/class-6/mathematics/number-play",
      "/schooling/cbse/class-6/mathematics/data-handling-and-presentation",
      "/schooling/cbse/class-6/mathematics/prime-time",
      "/schooling/cbse/class-6/mathematics/playing-with-constructions",
      "/schooling/cbse/class-6/social-science",
    ]);
    expect(urls).not.toContain("/schooling/icse-cisce/class-10/english");
    expect(urls).not.toContain("/schooling/icse-cisce/class-10/mathematics");
    expect(urls).not.toContain("/schooling/cbse/class-6/hindi");
    expect(urls).not.toContain("/schooling/cbse/class-6/mathematics/perimeter-and-area");
    expect(urls).not.toContain("/schooling/cbse/class-6/mathematics/fractions");
    expect(urls.some((u) => u.startsWith("/schooling/cbse/class-6/social-science/"))).toBe(false);
    expect(urls.some((u) => /tnsb|tamil/i.test(u))).toBe(false);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("lastmod comes from content timestamps or the Exam row, never from the clock", async () => {
    const before = Date.now();
    const entries = schoolSitemapEntries(await readSchoolSurface(NOW), SITE);
    const byUrl = new Map(entries.map((e) => [e.url.replace(SITE, ""), e]));
    const lm = (u: string) => (byUrl.get(u)!.lastModified as Date | undefined)?.toISOString();
    expect(lm("/schooling/cbse/class-6/mathematics/patterns-in-mathematics")).toBe(Q_AT);
    expect(lm("/schooling/cbse/class-6/mathematics")).toBe(Q_AT);
    expect(lm("/schooling/cbse/class-6")).toBe(Q_AT);
    expect(lm("/schooling/cbse")).toBe(Q_AT);
    // No content on the class → the Exam row's own updatedAt; none on a subject → no lastmod at all.
    expect(lm("/schooling/icse-cisce/class-10")).toBe(EXAM_AT);
    expect(lm("/schooling/icse-cisce")).toBe(EXAM_AT);
    // A listed subject whose chapters hold nothing of ours yet carries no lastmod.
    expect(byUrl.get("/schooling/cbse/class-6/social-science")).not.toHaveProperty("lastModified");
    for (const e of entries) {
      if (e.lastModified) expect((e.lastModified as Date).getTime()).toBeLessThan(before - 60_000);
      expect(e.changeFrequency).toMatch(/^(weekly|monthly)$/);
      expect(e.priority).toBeGreaterThan(0);
    }
  });
});

// ── 4b. Landing pages (26 Sep 2026, integrator) ───────────────────────
// The hub, the streams article and the board pages without a seeded tree
// are listed by the board page's own rule (isSchoolBoardIndexable), so the
// sitemap and the robots meta agree for every one of the 20 boards.

describe("schoolLandingSitemapEntries", () => {
  it("lists the hub (newest surface timestamp), the streams article and the indexable link-only boards; seeded boards come from the tree", async () => {
    const s = await readSchoolSurface(NOW);
    const landing = schoolLandingSitemapEntries(s, SITE);
    expect(landing.map((e) => e.url.replace(SITE, ""))).toEqual([
      "/schooling",
      "/schooling/streams",
      "/schooling/nios",
      "/schooling/ib",
      "/schooling/cambridge-igcse",
      "/schooling/tn-state-board",
    ]);
    expect(landing[0].lastModified).toEqual(new Date(Q_AT));
    expect(landing[1].lastModified).toBeUndefined();
    expect(landing[2].lastModified).toBeUndefined();
    // the seam: every board is on the sitemap iff its page is indexable
    const all = [...landing, ...schoolSitemapEntries(s, SITE, schoolClassIdentity)].map((e) => e.url.replace(SITE, ""));
    expect(new Set(all).size).toBe(all.length);
    const live = liveClassesByBoard(s);
    expect([...live.entries()]).toEqual([
      ["icse-cisce", 1],
      ["cbse", 1],
    ]);
    for (const b of BOARDS) {
      expect(all.includes(`/schooling/${b.slug}`), b.slug).toBe(isSchoolBoardIndexable(b, live.get(b.slug) ?? 0));
    }
  });

  it("with the empty surface the hub carries no lastmod and the two seeded boards fall back to their link rule — never the clock", () => {
    const landing = schoolLandingSitemapEntries(EMPTY_SCHOOL_SURFACE, SITE);
    expect(landing.map((e) => e.url.replace(SITE, ""))).toEqual([
      "/schooling",
      "/schooling/streams",
      "/schooling/cbse",
      "/schooling/nios",
      "/schooling/icse-cisce",
      "/schooling/ib",
      "/schooling/cambridge-igcse",
      "/schooling/tn-state-board",
    ]);
    for (const e of landing) expect(e.lastModified).toBeUndefined();
  });
});

// ── 5. llms-full.txt ──────────────────────────────────────────────────

describe("schoolLlmsFullLines", () => {
  it("computes its counts and lists class, subject and indexable chapter URLs with the context files", async () => {
    const lines = schoolLlmsFullLines(await readSchoolSurface(NOW), SITE, schoolClassIdentity);
    const text = lines.join("\n");
    expect(lines[0]).toMatch(/^## School — CBSE/);
    expect(text).toContain("Live now: 2 class pages, 5 subject pages, 9 chapters listed");
    expect(text).toContain("5 chapters with Shishya's own study notes and 6 with answer-checked practice (5+ questions)");
    expect(text).toContain(`### NCERT Class 6 — CBSE (NCERT textbooks) — ${SITE}/schooling/cbse/class-6 (context file: ${SITE}/schooling/cbse/class-6/context.md)`);
    expect(text).toContain("- 3 subjects · 9 chapters listed · 5 with Shishya notes · 6 with answer-checked practice");
    expect(text).toContain(`- Mathematics — ${SITE}/schooling/cbse/class-6/mathematics — 8 chapters · 5 with notes · 6 with checked practice`);
    expect(text).toContain(`- Hindi — ${SITE}/schooling/cbse/class-6/hindi — chapter list not available yet`);
    expect(text).toContain(`- Social Science — ${SITE}/schooling/cbse/class-6/social-science — 1 chapter · notes and practice not ready yet`);
    expect(text).toContain(`  - Patterns in Mathematics — Shishya notes + 38 answer-checked practice questions: ${SITE}/schooling/cbse/class-6/mathematics/patterns-in-mathematics`);
    expect(text).toContain(`  - Playing with Constructions — 5 answer-checked practice questions: ${SITE}/schooling/cbse/class-6/mathematics/playing-with-constructions`);
    expect(text).not.toContain("/mathematics/fractions");
    expect(text).not.toContain("/mathematics/perimeter-and-area");
    expect(text).toContain(`### CISCE Class 10 — CISCE (ICSE / ISC) — ${SITE}/schooling/icse-cisce/class-10`);
    // ICSE Class 10: the spine holds a syllabus PDF per subject, so the line may say so.
    expect(text).toContain(
      "- 2 subjects, each with CISCE's official syllabus PDF; ICSE 2027 regulations and syllabuses: https://cisce.org/wp-content/uploads/2025/03/1.-Regulations.pdf (CISCE prescribes syllabuses, not one textbook series, so there is no chapter map and no Shishya notes or practice yet).",
    );
    expect(text).toContain(`- Mathematics — ${SITE}/schooling/icse-cisce/class-10/mathematics — official syllabus link`);
    expect(text).toMatch(/never NCERT exercises, board questions or previous-year questions/);
    expect(text).toMatch(/Class 1-7 school pages have no chat tutor, offer no sign-in and ask no child to create an account. On Class 8-12 pages a student may sign in .* for students 13 and above/);
    expect(text).not.toMatch(/TNSB|Tamil/);
  });

  it("without the spine it claims no syllabus link at all", async () => {
    const text = schoolLlmsFullLines(await readSchoolSurface(NOW), SITE).join("\n");
    expect(text).toContain("- 2 subjects (CISCE prescribes syllabuses, not one textbook series, so there is no chapter map and no Shishya notes or practice yet; the official CISCE documents are linked on the class page and in its context file).");
    expect(text).toContain(`- Mathematics — ${SITE}/schooling/icse-cisce/class-10/mathematics — no chapter map (official CISCE documents on the class page)`);
    expect(text).not.toMatch(/official syllabus link/);
  });
});

// ── 5b. What the spine adds (fixer, 26 Sep 2026) ──────────────────────
// CISCE Classes 1-8 have ONE stage curriculum document and no per-subject
// syllabus PDF; NCERT Class 9 ICT is in NCERT's index with no book yet
// ("Coming Soon") — a subject page with nothing on it. The surface said
// "official syllabus link" for every CISCE subject and listed ICT.

function spineCases() {
  (db.exams as Record<string, unknown>[]).push(
    {
      code: "CISCE_C03",
      name: "CISCE Class 3",
      updatedAt: new Date(EXAM_AT),
      subjects: [
        { code: "ENGLISH", name: "English", orderIdx: 1 },
        { code: "MATHEMATICS", name: "Mathematics", orderIdx: 2 },
      ],
    },
    {
      code: "NCERT_C09",
      name: "NCERT Class 9",
      updatedAt: new Date(EXAM_AT),
      subjects: [
        { code: "HINDI", name: "Hindi", orderIdx: 1 },
        { code: "ICT", name: "ICT", orderIdx: 2 },
        { code: "SKILL_EDUCATION", name: "Skill Education", orderIdx: 3 },
      ],
    },
  );
  (db.rows as unknown[]).push(
    chapter("NCERT_C09", "SKILL_EDUCATION", "iekv1.ch03", "Beauty and Wellness", 103),
    chapter("NCERT_C09", "SKILL_EDUCATION", "iekv1.ch04", "Additional Vocations", 104),
    chapter("NCERT_C09", "SKILL_EDUCATION", "iekv1.ch08", "Additional Vocations", 108, { notes: true }),
    chapter("NCERT_C09", "SKILL_EDUCATION", "iekv1.ch12", "Additional Vocations", 112),
  );
}

describe("the spine's documents decide what a subject line claims and whether a bare subject is listed", () => {
  // 26 Sep 2026 (G1 index hygiene): ONE rule — a chapter list. A book, a
  // CISCE syllabus PDF or the CISCE stage document alone is an official link
  // and nothing more; the spine no longer decides.
  it("isSchoolSubjectIndexable: a chapter list, and nothing else — a book, a syllabus PDF or a stage document alone no longer counts", () => {
    const docs = (subjects: Record<string, { books?: unknown[]; syllabusUrls?: string[]; notYetPublished?: string[] }>, levelDocument: { title: string; url: string } | null) => ({
      subjects: new Map(Object.entries(subjects).map(([k, v]) => [k, { books: v.books ?? [], syllabusUrls: v.syllabusUrls ?? [], notYetPublished: v.notYetPublished }])),
      levelDocument,
    });
    const bare = { code: "ICT", chapters: [] };
    const withChapters = { code: "ICT", chapters: [{} as never] };
    expect(isSchoolSubjectIndexable(bare, docs({ ICT: { notYetPublished: ["Coming Soon"] } }, null))).toBe(false);
    expect(isSchoolSubjectIndexable(bare, docs({ ICT: {} }, null))).toBe(false);
    expect(isSchoolSubjectIndexable(bare, docs({ ICT: { books: [{}] } }, null))).toBe(false);
    expect(isSchoolSubjectIndexable(bare, docs({ ICT: { syllabusUrls: ["https://cisce.org/x.pdf"] } }, null))).toBe(false);
    expect(isSchoolSubjectIndexable(bare, docs({ ICT: {} }, { title: "Primary", url: "https://cisce.org/p.pdf" }))).toBe(false);
    expect(isSchoolSubjectIndexable(bare, docs({}, null))).toBe(false);
    expect(isSchoolSubjectIndexable(bare, null)).toBe(false);
    expect(isSchoolSubjectIndexable(bare, undefined)).toBe(false);
    expect(isSchoolSubjectIndexable(withChapters, docs({ ICT: {} }, null))).toBe(true);
    expect(isSchoolSubjectIndexable(withChapters, null)).toBe(true);
    // The live spine: NCERT Class 9 ICT (no book) and Hindi (a book, no chapter list) are both out;
    // CISCE subjects (a syllabus PDF or the stage document, never a chapter list) are out.
    const c9 = schoolClassIdentity("NCERT", 9)!;
    expect(isSchoolSubjectIndexable({ code: "ICT", chapters: [] }, c9)).toBe(false);
    expect(isSchoolSubjectIndexable({ code: "HINDI", chapters: [] }, c9)).toBe(false);
    expect(isSchoolSubjectIndexable({ code: "MATHEMATICS", chapters: [{} as never] }, c9)).toBe(true);
    expect(isSchoolSubjectIndexable({ code: "ENGLISH", chapters: [] }, schoolClassIdentity("CISCE", 3)!)).toBe(false);
    expect(isSchoolSubjectIndexable({ code: "ENGLISH", chapters: [] }, schoolClassIdentity("CISCE", 10)!)).toBe(false);
  });

  it("the sitemap lists a subject only with a chapter list — with or without the spine — and carries the injective chapter slug", async () => {
    spineCases();
    const s = await readSchoolSurface(NOW);
    const withSpine = schoolSitemapEntries(s, SITE, schoolClassIdentity).map((e) => e.url.replace(SITE, ""));
    expect(withSpine).toContain("/schooling/icse-cisce/class-3");
    expect(withSpine).not.toContain("/schooling/icse-cisce/class-3/english");
    expect(withSpine).not.toContain("/schooling/cbse/class-9/hindi");
    expect(withSpine).toContain("/schooling/cbse/class-9/skill-education");
    expect(withSpine).toContain("/schooling/cbse/class-9/skill-education/additional-vocations-iekv1-ch08");
    expect(withSpine).not.toContain("/schooling/cbse/class-9/ict");
    expect(withSpine.filter((u) => u.startsWith("/schooling/cbse/class-9/skill-education/"))).toHaveLength(1);
    expect(new Set(withSpine).size).toBe(withSpine.length);
    const withoutSpine = schoolSitemapEntries(s, SITE).map((e) => e.url.replace(SITE, ""));
    expect(withoutSpine).toEqual(withSpine);
  });

  it("llms-full.txt: a stage document for CISCE Class 3, a syllabus PDF only where one exists, 'no textbook published yet' for ICT", async () => {
    spineCases();
    const text = schoolLlmsFullLines(await readSchoolSurface(NOW), SITE, schoolClassIdentity).join("\n");
    const class3 = text.slice(text.indexOf("### CISCE Class 3"), text.indexOf("### ", text.indexOf("### CISCE Class 3") + 1));
    expect(class3).toContain(
      "- 2 subjects; CISCE publishes one curriculum document for this stage, CISCE Curriculum — Primary Classes (I-V): https://cisce.org/wp-content/uploads/2025/03/PrimaryCurriculum.pdf — no per-subject syllabus PDF (CISCE prescribes syllabuses, not one textbook series, so there is no chapter map and no Shishya notes or practice yet).",
    );
    expect(class3).toContain(`- English — ${SITE}/schooling/icse-cisce/class-3/english — no per-subject syllabus PDF; see the stage curriculum document on the class page`);
    expect(class3).not.toMatch(/official syllabus link/);
    const class9 = text.slice(text.indexOf("### NCERT Class 9"), text.indexOf("### ", text.indexOf("### NCERT Class 9") + 1));
    expect(class9).toContain(`- ICT — ${SITE}/schooling/cbse/class-9/ict — no textbook published yet (NCERT's index lists this subject as forthcoming)`);
    expect(class9).toContain(`- Hindi — ${SITE}/schooling/cbse/class-9/hindi — chapter list not available yet`);
    expect(class9).toContain(`  - Additional Vocations — Shishya notes: ${SITE}/schooling/cbse/class-9/skill-education/additional-vocations-iekv1-ch08`);
  });

  it("context.md: CISCE Class 3 names the stage document and no per-subject PDF; NCERT Class 9 ICT says no book is published", async () => {
    spineCases();
    const s = await readSchoolSurface(NOW);
    const c3 = findSchoolClass(s, "icse-cisce", 3)!;
    const md3 = schoolClassContextMarkdown(c3, schoolClassIdentity("CISCE", 3), "2026-09-26");
    expect(md3).toContain(
      "> What this file is: the subjects CISCE lists for Class 3 (CISCE (cisce.org), read 2026-09-25). CISCE prescribes syllabuses, not one textbook series, so there is no chapter map. CISCE publishes one curriculum document for this stage and no per-subject syllabus PDF. Level document: CISCE Curriculum — Primary Classes (I-V) — https://cisce.org/wp-content/uploads/2025/03/PrimaryCurriculum.pdf.",
    );
    expect(md3).not.toMatch(/per-subject syllabus PDFs|Official syllabus \(CISCE\)/);
    expect(md3).toContain(
      "- Official document (CISCE): CISCE Curriculum — Primary Classes (I-V) — https://cisce.org/wp-content/uploads/2025/03/PrimaryCurriculum.pdf (the stage curriculum; CISCE publishes no per-subject syllabus PDF for this class)",
    );
    const english = c3.subjects[0];
    expect(schoolSubjectContextMarkdown(c3, english, schoolClassIdentity("CISCE", 3), "2026-09-26")).toContain("- Official document (CISCE): CISCE Curriculum — Primary Classes (I-V) — https://cisce.org/wp-content/uploads/2025/03/PrimaryCurriculum.pdf (the stage curriculum");
    const c9 = findSchoolClass(s, "cbse", 9)!;
    const md9 = schoolClassContextMarkdown(c9, schoolClassIdentity("NCERT", 9), "2026-09-26");
    const ict = md9.slice(md9.indexOf("### ICT"), md9.indexOf("### Skill Education"));
    expect(ict).toContain("- Book: none published yet — NCERT's textbook index lists this subject as forthcoming, with no book to link.");
    expect(ict).toContain("- Chapters: none — there is no textbook to list. No Shishya notes or practice for this subject yet.");
    expect(ict).not.toMatch(/not in NCERT's index|read the book at the official link/);
    const hindi = md9.slice(md9.indexOf("### Hindi"), md9.indexOf("### ICT"));
    expect(hindi).toMatch(/- Book: [^\n]+ncert\.nic\.in/);
    expect(hindi).toContain("- Chapters: list not available yet — read the book at the official link.");
    // The subject file for ICT says the same; the live spine (not the fixture) is the source of the "forthcoming" fact.
    expect(schoolSubjectContextMarkdown(c9, c9.subjects[1], schoolClassIdentity("NCERT", 9), "2026-09-26")).toContain("- Book: none published yet — NCERT's textbook index lists this subject as forthcoming, with no book to link.");
    expect(schoolClassIdentity("NCERT", 9)!.subjects.get("ICT")).toMatchObject({ books: [], notYetPublished: ["Coming Soon"] });
  });

  it("no machine surface says practice 'stores nothing' or that parents may sign in to keep track (fixer, 26 Sep 2026)", async () => {
    // 26 Sep 2026 (student mode): "a student may sign in" on Class 8-12 pages
    // is now true and said with the age line; the parent / keep-track claim
    // stays banned.
    const claims = /stores nothing|saves nothing|nothing is (saved|stored)|keep track|parents? may sign in/i;
    const children = schoolContextHonestyLines()[1];
    expect(children).toMatch(/^> Children: /);
    expect(children).not.toMatch(claims);
    expect(children).toContain("no result is saved to any account or profile");
    expect(children).toContain("anonymous usage event (which chapter was practised and the score)");
    expect(children).toContain("Class 1-7 school pages have no chat tutor, offer no sign-in");
    expect(children).toMatch(/On Class 8-12 pages a student may sign in .*for students 13 and above/);
    const full = schoolLlmsFullLines(await readSchoolSurface(NOW), SITE, schoolClassIdentity).join("\n");
    expect(full).not.toMatch(claims);
    expect(full).toContain(SCHOOL_CHILDREN_LINE);
    const txt = read("public/llms.txt");
    const section = txt.slice(txt.indexOf("## School — CBSE"), txt.indexOf("\n## ", txt.indexOf("## School — CBSE") + 1));
    expect(section).not.toMatch(claims);
    expect(section).toContain("saves no result to any account or profile");
    expect(section).not.toMatch(/subjects of Classes 1-12 with CISCE's official syllabus PDFs/);
    expect(section).toContain("a per-subject syllabus PDF where CISCE publishes one");
  });
});

// ── 6. context.md ─────────────────────────────────────────────────────

describe("class and subject context.md", () => {
  it("a class WITH content: official PDF per chapter, a Shishya URL only where content exists, computed summary", async () => {
    const s = await readSchoolSurface(NOW);
    const c6 = findSchoolClass(s, "cbse", 6)!;
    const id = schoolClassIdentity("NCERT", 6)!;
    const ch1 = id.subjects.get("MATHEMATICS")!.chapters.get("fegp1.ch01")!;
    expect(ch1).toMatchObject({ bookCode: "fegp1", bookTitle: "Ganita Prakash", number: "1", kind: "chapter", pdfUrl: "https://ncert.nic.in/textbook/pdf/fegp101.pdf" });
    const md = schoolClassContextMarkdown(c6, id, "2026-09-26");
    expect(md).toMatch(/^# NCERT Class 6 — CBSE \(NCERT textbooks\) — Shishya school context\n/);
    expect(md).toContain(`> Class page: ${SITE}/schooling/cbse/class-6 · board: ${SITE}/schooling/cbse · all school pages: ${SITE}/schooling · data as of 2026-09-26 (IST)`);
    expect(md).toContain("(NCERT textbook index, https://ncert.nic.in/textbook.php, read 2026-09-25)");
    expect(md).toContain("- Subjects: 3 · chapters listed: 9 · with Shishya notes: 5 · with answer-checked practice (5+ questions): 6");
    expect(md).toContain("- Shishya content last updated: 2026-09-26");
    expect(md).toContain(`### Mathematics — ${SITE}/schooling/cbse/class-6/mathematics (context: ${SITE}/schooling/cbse/class-6/mathematics/context.md)`);
    expect(md).toContain("- Book: Ganita Prakash — https://ncert.nic.in/textbook.php?fegp1=0-10 (NCERT also lists 22 other-language editions)");
    expect(md).toContain("- Chapters (8; 5 with Shishya notes, 6 with answer-checked practice of 5+ questions):");
    expect(md).toContain(
      `  - Chapter 1 — Patterns in Mathematics — Shishya notes + 38 answer-checked practice questions: ${SITE}/schooling/cbse/class-6/mathematics/patterns-in-mathematics · official PDF: https://ncert.nic.in/textbook/pdf/fegp101.pdf`,
    );
    expect(md).toContain("  - Chapter 6 — Perimeter and Area — Shishya notes and practice not ready yet · official PDF: https://ncert.nic.in/textbook/pdf/fegp106.pdf");
    expect(md).not.toContain("/mathematics/perimeter-and-area");
    expect(md).not.toContain("/mathematics/fractions");
    expect(md).toContain(`  - Chapter 8 — Playing with Constructions — 5 answer-checked practice questions: ${SITE}/schooling/cbse/class-6/mathematics/playing-with-constructions`);
    // Hindi's books are unresolved in the spine: the book is linked, the chapter list is honestly absent.
    expect(md).toMatch(/### Hindi — [^\n]+\n- Book: Malhar — https:\/\/ncert\.nic\.in\/textbook\.php\?fhml1=0-13[^\n]*\n- Chapters: list not available yet — read the book at the official link\. No Shishya notes or practice for this subject yet\./);
    expect(md).toMatch(/> Honesty: Shishya never reproduces, summarises or translates textbook text/);
    expect(md).toMatch(/> Children: Class 1-7 school pages have no chat tutor, offer no sign-in and ask no child to create an account. On Class 8-12 pages a student may sign in .* for students 13 and above/);
    expect(md).not.toMatch(/exercise \d|Exercise \d|Fig\. \d/);
    expect(md).not.toMatch(/TNSB|Tamil/);
  });

  it("a class WITHOUT content (CISCE): syllabus links, no chapter map, the plain 'nothing yet' line — and no spine at all still renders", async () => {
    const s = await readSchoolSurface(NOW);
    const c10 = findSchoolClass(s, "icse-cisce", 10)!;
    const id = schoolClassIdentity("CISCE", 10)!;
    expect(id.subjects.get("MATHEMATICS")?.syllabusUrls).toEqual(["https://cisce.org/wp-content/uploads/2025/03/9.-Mathematics.pdf"]);
    const md = schoolClassContextMarkdown(c10, id, "2026-09-26");
    expect(md).toMatch(/^# CISCE Class 10 — CISCE \(ICSE \/ ISC\) — Shishya school context\n/);
    expect(md).toContain(
      "(CISCE (cisce.org), read 2026-09-25) with CISCE's per-subject syllabus PDFs. CISCE prescribes syllabuses, not one textbook series, so there is no chapter map. Level document: ICSE 2027 regulations and syllabuses — https://cisce.org/wp-content/uploads/2025/03/1.-Regulations.pdf.",
    );
    expect(md).not.toMatch(/one curriculum document for this stage/);
    expect(md).toContain("- Subjects: 2 · chapters listed: 0");
    expect(md).toContain("- No Shishya notes or practice on this class yet.");
    expect(md).toContain("- Official syllabus (CISCE): https://cisce.org/wp-content/uploads/2025/03/9.-Mathematics.pdf");
    expect(md).toContain("- Chapters: CISCE prescribes a syllabus, not one textbook, so there is no chapter map. No Shishya notes or practice for this subject yet.");
    expect(md).not.toMatch(/last updated/);
    // Without the spine (identity null) the DB rows still render: names and counts, no invented links.
    const bare = schoolClassContextMarkdown(c10, null, "2026-09-26");
    expect(bare).toContain("### Mathematics —");
    expect(bare).not.toContain("cisce.org/wp-content");
    expect(bare).not.toMatch(/read \d{4}-\d{2}-\d{2}/);
    expect(schoolClassIdentity("NCERT", 13)).toBeNull();
    expect(schoolClassIdentity("CISCE", 13)).toBeNull();
  });

  it("a subject file: its own lines plus the sibling subjects", async () => {
    const s = await readSchoolSurface(NOW);
    const c6 = findSchoolClass(s, "cbse", 6)!;
    const maths = c6.subjects.find((x) => x.slug === "mathematics")!;
    const md = schoolSubjectContextMarkdown(c6, maths, schoolClassIdentity("NCERT", 6), "2026-09-26");
    expect(md).toMatch(/^# Mathematics — NCERT Class 6 — CBSE \(NCERT textbooks\) — Shishya school context\n/);
    expect(md).toContain(`> Subject page: ${SITE}/schooling/cbse/class-6/mathematics · class: ${SITE}/schooling/cbse/class-6 (context: ${SITE}/schooling/cbse/class-6/context.md)`);
    expect(md).toContain("- Book: Ganita Prakash — https://ncert.nic.in/textbook.php?fegp1=0-10");
    expect(md).toContain("  - Chapter 5 — Prime Time — Shishya notes + 40 answer-checked practice questions:");
    expect(md).toContain("- Shishya content last updated: 2026-09-26");
    expect(md).toContain("## Other subjects in this class");
    expect(md).toContain(`- Hindi: ${SITE}/schooling/cbse/class-6/hindi`);
    expect(md).toContain(`- Social Science: ${SITE}/schooling/cbse/class-6/social-science`);
    expect(md).not.toContain(`- Mathematics: ${SITE}/schooling/cbse/class-6/mathematics`);
    const hindi = c6.subjects.find((x) => x.slug === "hindi")!;
    expect(schoolSubjectContextMarkdown(c6, hindi, schoolClassIdentity("NCERT", 6), "2026-09-26")).toContain("- No Shishya notes or practice on this subject yet.");
  });
});

// ── 7. The surface files ──────────────────────────────────────────────

describe("the surface files", () => {
  it("sitemap.ts spreads the school entries from the loader, with the failed-read fallback and the spine identity", () => {
    const src = stripComments(read("src/app/sitemap.ts"));
    // 26 Sep 2026 (integrator): one surface read feeds both the landing
    // pages (hub, streams, link-only boards) and the DB tree.
    expect(src).toMatch(/const schoolSurface = await loadSchoolSurface\(\)\.catch\(\(\) => EMPTY_SCHOOL_SURFACE\);/);
    expect(src).toMatch(/const schoolUrls: MetadataRoute\.Sitemap = \[\.\.\.schoolLandingSitemapEntries\(schoolSurface, base\), \.\.\.schoolSitemapEntries\(schoolSurface, base, schoolClassIdentity\)\];/);
    expect(src).toMatch(/import \{ schoolClassIdentity \} from "@\/lib\/school\/context";/);
    expect(src).toMatch(/import \{ schoolLandingSitemapEntries \} from "@\/lib\/school\/landings";/);
    expect(src).toMatch(/\.\.\.schoolUrls,/);
    expect(src).not.toMatch(/new Date\(\)/);
  });

  it("llms-full.txt prints the School block from the loader with the spine identity", () => {
    const src = stripComments(read("src/app/llms-full.txt/route.ts"));
    expect(src).toMatch(/lines\.push\(\.\.\.schoolLlmsFullLines\(await loadSchoolSurface\(\)\.catch\(\(\) => EMPTY_SCHOOL_SURFACE\), SITE, schoolClassIdentity\)\);/);
    expect(src).toMatch(/import \{ schoolClassIdentity \} from "@\/lib\/school\/context";/);
  });

  it("robots.txt allows /schooling for every rule — Googlebot, Bingbot and each AI crawler — and disallows nothing under it", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    const agents = rules.map((x) => x.userAgent);
    for (const bot of ["*", "GPTBot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot", "CCBot"]) expect(agents).toContain(bot);
    for (const rule of rules) {
      if (rule.userAgent === "ia_archiver") continue;
      const allow = ([] as string[]).concat(rule.allow ?? []);
      expect(allow, String(rule.userAgent)).toContain("/");
      expect(allow, String(rule.userAgent)).toContain("/schooling");
      const disallow = ([] as string[]).concat(rule.disallow ?? []);
      expect(disallow.some((d) => d.startsWith("/schooling")), String(rule.userAgent)).toBe(false);
    }
  });

  it("llms.txt has a School section that links the board pages and the context files and types no count", () => {
    const txt = read("public/llms.txt");
    const start = txt.indexOf("## School — CBSE");
    expect(start).toBeGreaterThan(0);
    const section = txt.slice(start, txt.indexOf("\n## ", start + 1));
    for (const u of [
      "https://shishya.in/schooling/cbse",
      "https://shishya.in/schooling/icse-cisce",
      "https://shishya.in/schooling/cbse/class-6/context.md",
      "https://shishya.in/schooling/cbse/class-6/mathematics/context.md",
      "https://shishya.in/llms-full.txt",
    ]) expect(section).toContain(u);
    // No typed count of chapters / notes / questions: those are computed on
    // llms-full.txt and the context files (the section says where).
    expect(section).not.toMatch(/\b\d[\d,]*\+?\s+(chapters?|notes|practice questions|questions|subjects|books|classes)\b/i);
    expect(section).toMatch(/computed live/);
    expect(section).toMatch(/never NCERT exercises, board questions or previous-year questions/);
    expect(section).toMatch(/Class 1-7 school pages have no chat tutor, offer no sign-in and ask no child to create an account. On Class 8-12 pages a student may sign in .* for students 13 and above/);
    expect(txt).toContain("- [School — CBSE (NCERT) by class](https://shishya.in/schooling/cbse)");
  });
});

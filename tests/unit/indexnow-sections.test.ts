// IndexNow builders for the whole-education sections (26 Sep 2026,
// B-machine-crawl): the school URL set (the chapter page's own indexable
// rule, the surface's slug helpers), the chapter-update set the news cron
// sends, current-affairs days with their capsules, the section hubs and the
// machine files. Pure — Prisma and next/cache are mocked (src/lib/indexnow.ts
// imports the school surface for its helpers); nothing is submitted.

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import fs from "node:fs";
import path from "node:path";
import {
  MACHINE_FILE_PATHS,
  SECTION_HUB_PATHS,
  currentAffairsUrls,
  machineFileUrls,
  schoolChapterKey,
  schoolChapterUpdateUrls,
  schoolIndexableUrls,
  sectionHubUrls,
} from "@/lib/indexnow";
import { EMPTY_SCHOOL_SURFACE, type SchoolSurface, type SchoolSurfaceChapter } from "@/lib/school/surface";

const S = "https://shishya.in";
const AT = "2026-09-26T03:17:57.452Z";

function ch(code: string, slug: string, hasNotes: boolean, q: number): SchoolSurfaceChapter {
  return {
    code,
    name: slug,
    orderIdx: 1,
    slug,
    bookCode: code.split(".")[0],
    hasNotes,
    validatedQuestions: q,
    noteUpdatedAt: hasNotes ? AT : null,
    questionsUpdatedAt: q ? AT : null,
    indexable: hasNotes || q >= 5,
    lastModified: hasNotes || q ? AT : null,
  };
}

const SURFACE: SchoolSurface = {
  readAt: AT,
  classes: [
    {
      examCode: "NCERT_C06",
      curriculum: "NCERT",
      boardSlug: "cbse",
      cls: 6,
      name: "NCERT Class 6",
      updatedAt: AT,
      lastModified: AT,
      subjects: [
        {
          code: "MATHEMATICS",
          name: "Mathematics",
          slug: "mathematics",
          orderIdx: 1,
          lastModified: AT,
          chapters: [
            ch("fegp1.ch01", "patterns-in-mathematics", true, 12), // notes + practice
            ch("fegp1.ch02", "lines-and-angles", false, 5), // practice only (5 = the guest-quiz minimum)
            ch("fegp1.ch03", "number-play", false, 4), // below the minimum, no notes → noindex
          ],
        },
        { code: "HINDI", name: "Hindi", slug: "hindi", orderIdx: 2, lastModified: null, chapters: [ch("fhmv1.ch01", "matribhumi", false, 0)] },
      ],
    },
    {
      examCode: "CISCE_C10",
      curriculum: "CISCE",
      boardSlug: "icse-cisce",
      cls: 10,
      name: "CISCE Class 10",
      updatedAt: AT,
      lastModified: null,
      subjects: [{ code: "ENGLISH", name: "English", slug: "english", orderIdx: 1, lastModified: null, chapters: [] }],
    },
  ],
};

describe("schoolIndexableUrls", () => {
  const urls = schoolIndexableUrls(SURFACE);
  it("hub, streams, each board with a class, every class", () => {
    for (const u of [`${S}/schooling`, `${S}/schooling/streams`, `${S}/schooling/cbse`, `${S}/schooling/icse-cisce`, `${S}/schooling/cbse/class-6`, `${S}/schooling/icse-cisce/class-10`]) {
      expect(urls).toContain(u);
    }
  });
  it("each chapter that passes the indexable rule, with its subject page", () => {
    expect(urls).toContain(`${S}/schooling/cbse/class-6/mathematics/patterns-in-mathematics`);
    expect(urls).toContain(`${S}/schooling/cbse/class-6/mathematics/lines-and-angles`);
    expect(urls).toContain(`${S}/schooling/cbse/class-6/mathematics`);
  });
  it("never a noindex chapter, nor a subject with no indexable chapter", () => {
    expect(urls).not.toContain(`${S}/schooling/cbse/class-6/mathematics/number-play`);
    expect(urls.some((u) => u.includes("/hindi"))).toBe(false);
    expect(urls.some((u) => u.includes("/english"))).toBe(false);
  });
  it("no duplicates, https only; an empty surface submits nothing", () => {
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.every((u) => u.startsWith("https://"))).toBe(true);
    expect(schoolIndexableUrls(EMPTY_SCHOOL_SURFACE)).toEqual([]);
  });
});

describe("schoolChapterUpdateUrls (the news cron's school set)", () => {
  it("chapter + subject + class for a named chapter that passes the rule", () => {
    const urls = schoolChapterUpdateUrls(SURFACE, new Set([schoolChapterKey("NCERT_C06", "fegp1.ch01")]));
    expect(urls.sort()).toEqual(
      [`${S}/schooling/cbse/class-6`, `${S}/schooling/cbse/class-6/mathematics`, `${S}/schooling/cbse/class-6/mathematics/patterns-in-mathematics`].sort(),
    );
  });
  it("a named chapter that is still noindex, an unknown key or an empty set sends nothing", () => {
    expect(schoolChapterUpdateUrls(SURFACE, new Set([schoolChapterKey("NCERT_C06", "fegp1.ch03")]))).toEqual([]);
    expect(schoolChapterUpdateUrls(SURFACE, new Set([schoolChapterKey("NCERT_C07", "fegp1.ch01")]))).toEqual([]);
    expect(schoolChapterUpdateUrls(SURFACE, new Set())).toEqual([]);
  });
});

describe("currentAffairsUrls", () => {
  it("each day plus its month capsule, deduplicated", () => {
    const urls = currentAffairsUrls([new Date("2026-09-25T00:00:00Z"), "2026-09-26", new Date("2026-08-31T00:00:00Z"), "2026-09-26"]);
    expect(urls).toEqual([
      `${S}/current-affairs/2026-09-25`,
      `${S}/current-affairs/capsule/2026-09`,
      `${S}/current-affairs/2026-09-26`,
      `${S}/current-affairs/2026-08-31`,
      `${S}/current-affairs/capsule/2026-08`,
    ]);
  });
  it("skips a bad date", () => {
    expect(currentAffairsUrls([new Date("nope"), "26-09-2026", ""])).toEqual([]);
  });
});

describe("sectionHubUrls and machineFileUrls", () => {
  it("every section hub, home without a trailing slash", () => {
    const urls = sectionHubUrls();
    expect(urls[0]).toBe(S);
    for (const p of ["/schooling", "/exams/entrance", "/exams/state", "/colleges", "/scholarships", "/careers", "/career-map", "/worldwide", "/insights", "/ask"]) {
      expect(urls).toContain(`${S}${p}`);
    }
    expect(urls.length).toBe(SECTION_HUB_PATHS.length);
    expect(new Set(urls).size).toBe(urls.length);
  });
  it("the machine files include the five context files", () => {
    const urls = machineFileUrls();
    for (const p of ["/llms.txt", "/llms-full.txt", "/context.md", "/schooling/context.md", "/colleges/context.md", "/scholarships/context.md", "/careers/context.md"]) {
      expect(urls).toContain(`${S}${p}`);
    }
    expect(urls.length).toBe(MACHINE_FILE_PATHS.length);
  });
});

describe("the news cron sends the new families in its own window", () => {
  const src = fs.readFileSync(path.resolve(__dirname, "../../src/app/api/cron/indexnow/route.ts"), "utf8").replace(/\r\n/g, "\n");
  it("current-affairs days created since the window start, with their capsules", () => {
    expect(src).toMatch(/FROM "CurrentAffair" WHERE "generatedAt" >= \$\{since\}/);
    expect(src).toMatch(/currentAffairsUrls\(caDays\.map/);
  });
  it("school chapters whose notes were written in the window, by category (school rows are inactive by design), through the indexable rule", () => {
    expect(src).toMatch(/generatedAt: \{ gte: since \}, topic: \{ parentId: null, subject: \{ exam: SCHOOL_CONTAINER_WHERE \} \}/);
    expect(src).toMatch(/schoolChapterUpdateUrls\(/);
    expect(src).toMatch(/readSchoolSurface\(\)\.catch\(\(\) => EMPTY_SCHOOL_SURFACE\)/);
  });
  it("a failed family read never drops the news set", () => {
    expect(src).toMatch(/const urls = \[\.\.\.newsUrls, \.\.\.caUrls, \.\.\.schoolUrls\];/);
    // Both new reads carry their own empty fallback.
    expect(src).toMatch(/\.catch\(\(\) => \[\] as \{ d: Date \}\[\]\)/);
    expect(src).toMatch(/take: 5_000,\n\s*\}\)\n\s*\.catch\(\(\) => \[\]\);/);
  });
});

// "Related on Shishya" on the exam hub (26 Sep 2026): only pages that
// exist, honest labels, at most eight links.

import { describe, it, expect } from "vitest";
import { RELATED_MAX, SCHOOL_LINK_PLAN, relatedCareerLinks, relatedLinks, relatedSchoolLinks } from "@/lib/exam-related-links";
import { CAREERS } from "@/data/careers";
import type { SchoolSurface, SchoolSurfaceChapter, SchoolSurfaceClass, SchoolSurfaceSubject } from "@/lib/school/surface";

function chapter(i: number, hasNotes: boolean, validatedQuestions: number): SchoolSurfaceChapter {
  return {
    code: `x.ch${i}`,
    name: `Chapter ${i}`,
    orderIdx: i,
    slug: `chapter-${i}`,
    bookCode: "x",
    hasNotes,
    validatedQuestions,
    noteUpdatedAt: null,
    questionsUpdatedAt: null,
    indexable: hasNotes || validatedQuestions >= 5,
    lastModified: null,
  };
}
function subject(code: string, chapters: SchoolSurfaceChapter[]): SchoolSurfaceSubject {
  return { code, name: code, slug: code.toLowerCase().replace(/_/g, "-"), orderIdx: 0, chapters, lastModified: null };
}
function cls(n: number, subjects: SchoolSurfaceSubject[]): SchoolSurfaceClass {
  return {
    examCode: `NCERT_C${String(n).padStart(2, "0")}`,
    curriculum: "NCERT",
    boardSlug: "cbse",
    cls: n,
    name: `NCERT Class ${n}`,
    updatedAt: "",
    subjects,
    lastModified: null,
  };
}
const plain = () => [chapter(1, false, 0), chapter(2, false, 0)];
const surface: Pick<SchoolSurface, "classes"> = {
  classes: [
    cls(6, [subject("MATHEMATICS", [chapter(1, true, 12), chapter(2, true, 8), chapter(3, false, 0)]), subject("SCIENCE", plain())]),
    cls(7, [subject("MATHEMATICS", plain()), subject("SCIENCE", plain())]),
    cls(8, [subject("MATHEMATICS", plain()), subject("SCIENCE", [])]),
    cls(11, [subject("PHYSICS", plain()), subject("CHEMISTRY", plain()), subject("MATHEMATICS", plain()), subject("BIOLOGY", plain())]),
    cls(12, [subject("PHYSICS", plain()), subject("CHEMISTRY", plain()), subject("MATHEMATICS", plain()), subject("BIOLOGY", plain())]),
  ],
};

describe("relatedSchoolLinks", () => {
  it("JEE Main: NCERT Class 11 and 12 Physics, Chemistry, Mathematics — chapter lists", () => {
    const links = relatedSchoolLinks("JEE_MAIN", surface);
    expect(links.map((l) => l.href)).toEqual([
      "/schooling/cbse/class-11/physics",
      "/schooling/cbse/class-11/chemistry",
      "/schooling/cbse/class-11/mathematics",
      "/schooling/cbse/class-12/physics",
      "/schooling/cbse/class-12/chemistry",
      "/schooling/cbse/class-12/mathematics",
    ]);
    expect(links[0].label).toBe("NCERT Class 11 Physics — chapter list with the official books");
    for (const l of links) expect(l.label).not.toMatch(/notes|practice/i);
  });

  it("NEET UG links Biology, not Mathematics", () => {
    const hrefs = relatedSchoolLinks("NEET_UG", surface).map((l) => l.href);
    expect(hrefs).toContain("/schooling/cbse/class-12/biology");
    expect(hrefs.some((h) => h.endsWith("/mathematics"))).toBe(false);
  });

  it("says 'notes and practice' only for chapters with both, and counts them", () => {
    const links = relatedSchoolLinks("IOQM", surface);
    expect(links[0]).toEqual({
      href: "/schooling/cbse/class-6/mathematics",
      label: "NCERT Class 6 Mathematics — chapter list with the official books; Shishya notes and practice for 2 chapters",
    });
    expect(links[1].label).toBe("NCERT Class 7 Mathematics — chapter list with the official books");
  });

  it("leaves out a subject with no chapters and a class the surface does not hold", () => {
    const hrefs = relatedSchoolLinks("SOF_NSO", surface).map((l) => l.href);
    expect(hrefs).toEqual(["/schooling/cbse/class-6/science", "/schooling/cbse/class-7/science"]);
  });

  it("no school links for government, PG or design exams, or on an empty surface", () => {
    for (const code of ["SSC_CGL", "GATE_CSE", "NEET_PG", "NIFT", "KA_KCET"]) expect(relatedSchoolLinks(code, surface)).toEqual([]);
    expect(relatedSchoolLinks("JEE_MAIN", { classes: [] })).toEqual([]);
  });

  it("every planned subject code is a real NCERT subject code shape", () => {
    for (const plan of Object.values(SCHOOL_LINK_PLAN)) {
      for (const s of plan.subjects) expect(s).toMatch(/^[A-Z_]+$/);
      for (const c of plan.classes) expect(c >= 1 && c <= 12).toBe(true);
    }
  });
});

describe("relatedCareerLinks / relatedLinks", () => {
  it("careers whose examCodes name the exam, at most three, each an existing career slug", () => {
    const slugs = new Set(CAREERS.map((c) => c.slug));
    const links = relatedCareerLinks("JEE_MAIN", CAREERS);
    expect(links.length).toBeGreaterThan(0);
    expect(links.length).toBeLessThanOrEqual(3);
    for (const l of links) {
      expect(l.href).toMatch(/^\/careers\/[a-z0-9-]+$/);
      expect(slugs.has(l.href.slice("/careers/".length))).toBe(true);
      expect(l.label).toMatch(/ — career guide$/);
      const c = CAREERS.find((x) => `/careers/${x.slug}` === l.href)!;
      expect(c.examCodes).toContain("JEE_MAIN");
    }
  });

  it("the block never passes eight links and keeps the career links", () => {
    const all = relatedLinks("JEE_MAIN", surface, CAREERS);
    expect(all.length).toBeLessThanOrEqual(RELATED_MAX);
    expect(all.filter((l) => l.href.startsWith("/careers/")).length).toBe(relatedCareerLinks("JEE_MAIN", CAREERS).length);
    expect(new Set(all.map((l) => l.href)).size).toBe(all.length);
  });

  it("an exam no career names and no plan covers links nothing", () => {
    expect(relatedLinks("ZZ_NONE", surface, CAREERS)).toEqual([]);
  });
});

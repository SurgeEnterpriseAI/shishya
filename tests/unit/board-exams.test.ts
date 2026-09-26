// CBSE board-exam hubs (26 Sep 2026, G4): official links only, every entry
// dated, no duplicates, a title built from what the hub holds.
// src/data/board-exams.ts + src/lib/board-exams.ts. No DB, no network.
// Run: npx vitest run tests/unit/board-exams.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BOARD_EXAM_HUBS, boardExamLinks, findBoardExamHub, type BoardExamHub } from "@/data/board-exams";
import {
  BOARD_EXAM_MAIN_SUBJECTS,
  BOARD_EXAM_MIN_LINKS,
  boardExamDescription,
  boardExamLead,
  boardExamPath,
  boardExamSitemapEntries,
  boardExamTitle,
  isBoardExamIndexable,
  splitSamplePapers,
} from "@/lib/board-exams";
import { findClassSyllabus } from "@/lib/schooling-subjects";

const OFFICIAL_HOST = /^(www\.)?(cbse\.gov\.in|cbseacademic\.nic\.in|[a-z0-9-]+\.nic\.in|nic\.in|(www\.|results\.)?digilocker\.gov\.in)$/;
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

describe("the data: official, dated, unique", () => {
  it("only CBSE Class 10 and 12 exist", () => {
    expect(BOARD_EXAM_HUBS.map((h) => `${h.board}-${h.cls}`)).toEqual(["cbse-10", "cbse-12"]);
    expect(findBoardExamHub("cbse", 10)).toBeDefined();
    expect(findBoardExamHub("cbse", 11)).toBeUndefined();
    expect(findBoardExamHub("icse-cisce", 10)).toBeUndefined();
  });

  it.each(BOARD_EXAM_HUBS.map((h) => [h.cls, h] as const))("class %s: every URL is https on an official host", (_cls, h) => {
    for (const l of boardExamLinks(h)) {
      const u = new URL(l.url);
      expect(u.protocol, l.url).toBe("https:");
      expect(u.hostname, l.url).toMatch(OFFICIAL_HOST);
    }
    if (h.dateSheet.tier === "not-announced") expect(new URL(h.dateSheet.checkedUrl).hostname).toMatch(OFFICIAL_HOST);
  });

  it.each(BOARD_EXAM_HUBS.map((h) => [h.cls, h] as const))("class %s: every entry carries checkedOn", (_cls, h) => {
    for (const l of boardExamLinks(h)) expect(l.checkedOn, l.url).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const p of h.samplePapers.papers) expect(p.checkedOn, p.subject).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(h.dateSheet.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it.each(BOARD_EXAM_HUBS.map((h) => [h.cls, h] as const))("class %s: no duplicate URL or subject; no placeholder or unverified file", (_cls, h) => {
    const urls = boardExamLinks(h).map((l) => l.url);
    expect(new Set(urls).size).toBe(urls.length);
    const subjects = h.samplePapers.papers.map((p) => p.subject);
    expect(new Set(subjects).size).toBe(subjects.length);
    for (const u of urls) {
      expect(u, u).not.toMatch(/error\.pdf$/);
      expect(u, u).not.toMatch(/_hi\.pdf$/); // every Hindi-medium file was 404 on 26 Sep 2026
    }
    for (const p of h.samplePapers.papers) {
      expect(p.sqp).toMatch(/-SQP\.pdf$/);
      expect(p.ms).toMatch(/-MS\.pdf$/);
      expect(p.sqp).toContain(h.cls === 10 ? "/ClassX_2026_27/" : "/ClassXII_2026_27/");
    }
  });

  it("the counts CBSE's tables gave on 26 Sep 2026 (verified with HTTP 200)", () => {
    expect(findBoardExamHub("cbse", 10)!.samplePapers.papers.length).toBe(46);
    expect(findBoardExamHub("cbse", 12)!.samplePapers.papers.length).toBe(64);
  });

  it("the main-subject names match rows exactly, so none silently disappears", () => {
    for (const h of BOARD_EXAM_HUBS) {
      const names = new Set(h.samplePapers.papers.map((p) => p.subject));
      for (const m of BOARD_EXAM_MAIN_SUBJECTS[h.cls]) expect(names.has(m), `${h.cls}: ${m}`).toBe(true);
      const { main, other } = splitSamplePapers(h);
      expect(main.length + other.length).toBe(h.samplePapers.papers.length);
      expect(main.map((p) => p.subject)).toEqual([...BOARD_EXAM_MAIN_SUBJECTS[h.cls]]);
    }
  });
});

describe("title, lead and floor", () => {
  const h10 = findBoardExamHub("cbse", 10)!;
  const withSheet: BoardExamHub = { ...h10, dateSheet: { tier: "official", label: "Date Sheet Class X 2027", url: "https://www.cbse.gov.in/cbsenew/documents/x.pdf", checkedOn: "2026-12-01" } };
  const noPapers: BoardExamHub = { ...h10, samplePapers: { ...h10.samplePapers, papers: [] } };

  it("'Date Sheet' only with an official date-sheet row; papers only when published", () => {
    expect(boardExamTitle(h10)).toBe("CBSE Class 10 Board Exam 2027: Official Sample Papers & Marking Schemes 2026-27");
    expect(boardExamTitle(h10)).not.toMatch(/Date Sheet|Result/);
    expect(boardExamTitle(withSheet)).toBe("CBSE Class 10 Board Exam 2027: Official Sample Papers & Marking Schemes 2026-27, Date Sheet");
    expect(boardExamTitle(noPapers)).toBe("CBSE Class 10 Board Exam 2027: Official Links 2026-27");
    expect(boardExamTitle(findBoardExamHub("cbse", 12)!)).toBe("CBSE Class 12 Board Exam 2027: Official Sample Papers & Marking Schemes 2026-27");
  });

  it("the lead is computed from the rows and says the date sheet is not announced", () => {
    expect(boardExamLead(h10)).toBe(
      "CBSE has published 2026-27 sample question papers with marking schemes for 46 Class 10 subjects — all linked below from cbseacademic.nic.in (checked 26 Sep 2026). The 2027 date sheet is not announced yet — cbse.gov.in shows none as of 26 Sep 2026.",
    );
    expect(boardExamLead(withSheet)).toContain("The 2027 date sheet is out: Date Sheet Class X 2027.");
    expect(boardExamLead(noPapers)).toMatch(/^CBSE has not published 2026-27 sample question papers for Class 10/);
    expect(boardExamDescription(h10)).toContain("(2022–2026)");
  });

  it("indexable only with at least BOARD_EXAM_MIN_LINKS official links", () => {
    for (const h of BOARD_EXAM_HUBS) expect(isBoardExamIndexable(h)).toBe(true);
    const thin: BoardExamHub = { ...noPapers, curriculum: { ...h10.curriculum, documents: [] }, results: [], notices: [] };
    expect(boardExamLinks(thin).length).toBeLessThan(BOARD_EXAM_MIN_LINKS);
    expect(isBoardExamIndexable(thin)).toBe(false);
  });

  it("sitemap: both hubs, lastModified = the check day", () => {
    expect(boardExamSitemapEntries("https://shishya.in")).toEqual([
      { url: "https://shishya.in/schooling/cbse/class-10/board-exam", lastModified: "2026-09-26", changeFrequency: "weekly", priority: 0.7 },
      { url: "https://shishya.in/schooling/cbse/class-12/board-exam", lastModified: "2026-09-26", changeFrequency: "weekly", priority: 0.7 },
    ]);
    expect(boardExamPath(h10)).toBe("/schooling/cbse/class-10/board-exam");
  });
});

describe("the route", () => {
  const page = read("src/app/schooling/[slug]/[classSlug]/board-exam/page.tsx");
  it("is 404 for any other board or class, and sets robots on every metadata", () => {
    expect(page).toContain("export const dynamicParams = false;");
    expect(page).toContain('{ slug: "cbse", classSlug: "class-10" }');
    expect(page).toContain('{ slug: "cbse", classSlug: "class-12" }');
    expect(page).toContain("robots: schoolRobots(isBoardExamIndexable(hub)),");
    expect(page).toContain('return { title: "Not found — Shishya", robots: SCHOOLING_ROBOTS };');
  });
  it("never shadows a subject: no subject slug is 'board-exam'", () => {
    for (const cls of [10, 12]) {
      const syl = findClassSyllabus("cbse", cls);
      for (const s of syl?.subjects ?? []) expect(s.slug).not.toBe("board-exam");
    }
    // Seeded subject slugs are Subject.code lower-cased with '-' for '_'
    // (src/lib/school/surface.ts schoolSubjectSlug); no NCERT or CISCE code is BOARD_EXAM.
    expect(read("src/lib/school/surface.ts")).toMatch(/return code\.toLowerCase\(\)\.replace\(\/_\/g, "-"\);/);
  });
  it("the class 10 and 12 pages link it from the board-exam card", () => {
    const cls = read("src/app/schooling/[slug]/[classSlug]/page.tsx");
    expect(cls).toContain("const boardExamHub = findBoardExamHub(board.slug, classNum);");
    expect(cls).toMatch(/\{boardExamHub && \(\s*<Link href=\{boardExamPath\(boardExamHub\)\}/);
  });
});

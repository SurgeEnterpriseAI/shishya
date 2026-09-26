// Sitemap lastmod (26 Sep 2026, B-machine-crawl): the pure combiners in
// src/lib/sitemap-lastmod.ts and the sitemap.ts wiring.
//
// Every exam hub / archive said Exam.updatedAt (SSC CGL: 23 May) although
// its tracker changed on 18 Sep; /updates, the PYQ sets and the monthly
// capsules said nothing. The combiners are null-safe, never return a time
// later than their newest input and never invent one (no new Date()).
// sitemap.ts is read as text — nothing here touches the DB.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { capsuleLastmods, examPageLastmods, lastModifiedField, newestDate } from "@/lib/sitemap-lastmod";

const ROOT = path.resolve(__dirname, "../..");
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const d = (s: string) => new Date(s);

describe("newestDate", () => {
  it("picks the newest, ignoring null, undefined and invalid dates", () => {
    expect(newestDate(d("2026-05-23T00:00:00Z"), null, undefined, d("2026-09-18T01:19:55Z"), new Date("nope"))?.toISOString()).toBe("2026-09-18T01:19:55.000Z");
  });
  it("undefined when there is no input at all", () => {
    expect(newestDate()).toBeUndefined();
    expect(newestDate(null, undefined)).toBeUndefined();
  });
  it("returns one of its inputs — never later than the newest, never 'now'", () => {
    const inputs = [d("2026-01-01T00:00:00Z"), d("2025-06-01T00:00:00Z")];
    const out = newestDate(...inputs)!;
    expect(inputs).toContain(out);
    expect(out.getTime()).toBeLessThanOrEqual(Math.max(...inputs.map((x) => x.getTime())));
  });
});

describe("examPageLastmods", () => {
  const row = {
    updatedAt: d("2026-05-23T11:32:17.021Z"),
    trackerAt: d("2026-09-18T01:19:55.048Z"),
    trackerArchivedAt: d("2026-09-18T01:19:54.984Z"),
    newsAt: d("2026-09-12T01:19:54.984Z"),
    newsArchivedAt: d("2026-09-17T00:00:00.000Z"),
  };
  it("hub = newest of the exam row, the tracker change and the newest news", () => {
    expect(examPageLastmods(row).hub?.toISOString()).toBe("2026-09-18T01:19:55.048Z");
    expect(examPageLastmods({ ...row, trackerAt: null }).hub?.toISOString()).toBe("2026-09-12T01:19:54.984Z");
  });
  it("archive = newest of the exam row and the archived tracker / news rows it lists", () => {
    expect(examPageLastmods(row).archive?.toISOString()).toBe("2026-09-18T01:19:54.984Z");
    expect(examPageLastmods({ ...row, trackerArchivedAt: null, newsArchivedAt: null }).archive?.toISOString()).toBe("2026-05-23T11:32:17.021Z");
  });
  it("updates = the tracker change only; nothing when the exam has no tracker row", () => {
    expect(examPageLastmods(row).updates?.toISOString()).toBe("2026-09-18T01:19:55.048Z");
    expect(examPageLastmods({ ...row, trackerAt: null }).updates).toBeUndefined();
  });
  it("all-null row → no claims", () => {
    expect(examPageLastmods({ updatedAt: null, trackerAt: null, trackerArchivedAt: null, newsAt: null, newsArchivedAt: null })).toEqual({ hub: undefined, archive: undefined, updates: undefined });
  });
});

describe("capsuleLastmods / lastModifiedField", () => {
  it("each month's newest day", () => {
    const m = capsuleLastmods([d("2026-09-01T00:00:00Z"), d("2026-09-26T00:00:00Z"), d("2026-08-31T00:00:00Z"), null, new Date("x")]);
    expect([...m.keys()].sort()).toEqual(["2026-08", "2026-09"]);
    expect(m.get("2026-09")?.toISOString()).toBe("2026-09-26T00:00:00.000Z");
    expect(m.get("2026-08")?.toISOString()).toBe("2026-08-31T00:00:00.000Z");
  });
  it("a missing date adds no lastmod key at all", () => {
    expect(lastModifiedField(null)).toEqual({});
    expect(lastModifiedField(undefined)).toEqual({});
    expect(lastModifiedField(d("2026-09-26T00:00:00Z"))).toEqual({ lastModified: d("2026-09-26T00:00:00Z") });
  });
});

describe("no clock, anywhere on the lastmod path", () => {
  it("src/lib/sitemap-lastmod.ts never calls new Date() or Date.now()", () => {
    const src = stripComments(read("src/lib/sitemap-lastmod.ts"));
    expect(src).not.toMatch(/new Date\(|Date\.now\(/);
  });
});

describe("sitemap.ts wiring", () => {
  const src = stripComments(read("src/app/sitemap.ts"));
  it("one grouped SELECT for the tracker change (createdAt and archivedAt — the model has no updatedAt) and the newest non-suppressed news", () => {
    expect(src).toMatch(/MAX\(GREATEST\("createdAt", COALESCE\("archivedAt", "createdAt"\)\)\) AS "trackerAt"/);
    expect(src).toMatch(/FROM "ExamImportantDate" GROUP BY 1/);
    expect(src).toMatch(/FROM "ExamNewsItem" WHERE source IS NULL OR source <> \$\{SUPPRESSED_SOURCE\}/);
    // ExamImportantDate has no updatedAt column (prisma/schema.prisma).
    expect(src).not.toMatch(/\bd\."updatedAt"/);
  });
  it("hub, archive, /updates and their twins read the combiners; a failed read keeps Exam.updatedAt for hub and archive", () => {
    expect(src).toMatch(/lastModified: lastmodByCode\.get\(e\.code\)\?\.hub \?\? e\.updatedAt/);
    expect(src).toMatch(/lastModified: lastmodByCode\.get\(e\.code\)\?\.archive \?\? e\.updatedAt/);
    expect(src).toMatch(/\.\.\.lastModifiedField\(lastmodByCode\.get\(e\.code\)\?\.updates\)/);
  });
  it("news lastmod is publishedAt, never archivedAt — archiving is a status, not an edit (26 Sep 2026, G1)", () => {
    expect(src).toMatch(/lastModified: n\.publishedAt \?\? n\.createdAt,/);
    expect(src).not.toMatch(/lastModified: n\.archivedAt/);
  });
  it("PYQ sets are grouped per (exam, year) with the newest question's time; capsules carry their newest day", () => {
    expect(src).toMatch(/GROUP BY e\."code", q\."pyqYear"/);
    expect(src).toMatch(/\.\.\.lastModifiedField\(p\.lastmod\)/);
    expect(src).toMatch(/capsuleLastmods\(caDates\.map/);
  });
  it("every URL family is still spread into the result", () => {
    for (const fam of [
      "sectionLandings",
      "stateUrls",
      "examUrls",
      "cutoffUrls",
      "syllabusUrls",
      "scoreEstimateUrls",
      "tricksUrls",
      "guideUrls",
      "updatesUrls",
      "checklistUrls",
      "builderUrls",
      "localeTwinUrls",
      "currentAffairsUrls",
      "examArchiveUrls",
      "phaseUrls",
      "pyqUrls",
      "personaUrls",
      "newsUrls",
      // 26 Sep 2026 (G1): results are their own family (the news flag never takes them out).
      "resultUrls",
      "topicUrls",
      "hindiTopicUrls",
      "streamUrls",
      "collegeStateUrls",
      "collegeUrls",
      "schoolUrls",
      "scholarshipUrls",
      "countryUrls",
      "universityUrls",
      "testPrepUrls",
      "insightUrls",
      "careerUrls",
      "branchUrls",
      "userProfileUrls",
    ]) {
      expect(src, fam).toMatch(new RegExp(`\\.\\.\\.${fam},`));
    }
  });
  it("the section landings are the exported list, with the Entrance hub", () => {
    expect(src).toMatch(/export const SECTION_LANDING_PATHS: readonly string\[\] = \[/);
    expect(src).toMatch(/const sectionLandings: MetadataRoute\.Sitemap = SECTION_LANDING_PATHS\.map/);
    expect(src).toMatch(/"\/exams\/entrance",/);
  });
});

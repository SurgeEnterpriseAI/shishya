// Official SAMPLE papers (29 Sep 2026): a body's own practice paper for the
// coming exam (SOF's per-class "SAMPLE PAPER 2026-27"). They share the
// OfficialPaper table with past papers, so every past-paper path must leave
// them out — a sample paper shown as "the original 2026 paper" would be a lie.
// Run: npx vitest run tests/unit/official-sample-papers.test.ts

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  groupPapersByYear,
  isSamplePaper,
  paperContextLines,
  papersForYear,
  sampleClassOf,
  samplePaperContextLines,
  samplePaperGroups,
  type OfficialPaperRow,
} from "@/lib/official-papers";
import { pickOfficialPaperLinks } from "@/lib/pyq-full-paper";

const row = (over: Partial<OfficialPaperRow>): OfficialPaperRow => ({
  year: "2026-27",
  paper: "Class 8",
  kind: "sample paper",
  language: "English",
  url: "https://sofworld.org/download/file/fid/73663",
  listingUrl: "https://sofworld.org/ieo/class-8/sample-model-test-papers/ieo-sample-papers-class-8",
  publisher: "Science Olympiad Foundation",
  bytes: 106_574,
  pages: 4,
  scan: false,
  ...over,
});

const past = row({ year: "2026", paper: "NSEP 2026 question paper", kind: "question paper", url: "https://olympiads.hbcse.tifr.res.in/x.pdf", publisher: "IAPT" });

describe("sample papers are never past papers", () => {
  const rows = [row({}), row({ paper: "Class 10", url: "https://sofworld.org/download/file/fid/2" }), past];

  it("recognises the kind", () => {
    expect(isSamplePaper(row({}))).toBe(true);
    expect(isSamplePaper(past)).toBe(false);
  });

  it("year grouping and a /pyq/{year} page leave them out", () => {
    expect(groupPapersByYear(rows).flatMap((g) => g.rows)).toEqual([past]);
    expect(papersForYear(rows, 2026)).toEqual([past]);
    const onlySamples = [row({}), row({ paper: "Class 3", url: "https://sofworld.org/download/file/fid/3" })];
    expect(groupPapersByYear(onlySamples)).toEqual([]);
    const links = pickOfficialPaperLinks(onlySamples, 2026);
    expect(links.sameYear).toEqual([]);
    expect(links.otherYears).toEqual([]);
    expect(links.moreOnHub).toBe(false);
  });

  it("past-paper context lines leave them out; sample lines say what they are", () => {
    expect(paperContextLines(rows).join("\n")).not.toContain("sofworld.org");
    const lines = samplePaperContextLines(rows);
    expect(lines).toHaveLength(2);
    for (const l of lines) expect(l).toMatch(/official sample paper 2026-27, not a previous year's paper/);
  });
});

describe("sample paper groups", () => {
  it("orders by class number, unnumbered last, latest session first", () => {
    const g = samplePaperGroups([
      row({ paper: "Class 10", url: "u10" }),
      row({ paper: "Class 2", url: "u2" }),
      row({ paper: "Teacher's guide", url: "ux" }),
      row({ paper: "Class 11 · Level 1", url: "u11" }),
      row({ year: "2025-26", paper: "Class 1", url: "old" }),
    ]);
    expect(g.map((x) => x.session)).toEqual(["2026-27", "2025-26"]);
    expect(g[0].rows.map((r) => r.url)).toEqual(["u2", "u10", "u11", "ux"]);
    expect(g[0].publisher).toBe("Science Olympiad Foundation");
  });

  it("reads the class number", () => {
    expect(sampleClassOf("Class 8")).toBe(8);
    expect(sampleClassOf("class 12 · Level 2")).toBe(12);
    expect(sampleClassOf("Paper")).toBeNull();
  });
});

// Every raw query on "OfficialPaper" in src/ must say what it does with sample
// papers: the past-paper paths exclude them, the sample loader selects them.
describe("every OfficialPaper query decides about sample papers", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(name)) files.push(p);
    }
  };
  walk(join(process.cwd(), "src"));
  // Read each file once; only files that query the table are kept.
  const sources = files
    .map((f) => ({ f, s: readFileSync(f, "utf8") }))
    .filter(({ s }) => s.includes('FROM "OfficialPaper"'));

  it("finds the queries", () => {
    expect(sources.length).toBeGreaterThanOrEqual(4);
  });

  it("each query names 'sample paper'", () => {
    const offenders: string[] = [];
    for (const { f, s } of sources) {
      let at = s.indexOf('FROM "OfficialPaper"');
      while (at !== -1) {
        // The query text up to its closing backtick.
        const end = s.indexOf("`", at);
        const q = s.slice(at, end === -1 ? at + 400 : end);
        if (!q.includes("'sample paper'")) offenders.push(`${f}: ${q.slice(0, 120).replace(/\s+/g, " ")}`);
        at = s.indexOf('FROM "OfficialPaper"', at + 1);
      }
    }
    expect(offenders).toEqual([]);
  });
});

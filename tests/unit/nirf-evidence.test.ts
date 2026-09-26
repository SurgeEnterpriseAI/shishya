// NIRF ranks in the college catalogue match the official table rows behind
// them (27 Sep 2026, organic wave 3). src/lib/colleges-data.ts is written by
// scripts/import-nirf.ts from nirfindia.org; data/nirf/nirf-evidence.json
// keeps every table row it used. This pins that no rank can be hand-typed
// past the evidence, and that every row is on nirfindia.org. No network.
// Run: npx vitest run tests/unit/nirf-evidence.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { COLLEGES, NIRF_PREVIOUS_YEAR, NIRF_SOURCE_YEAR, formatNirfRanks, type NirfRanks } from "@/lib/colleges-data";

interface Row {
  year: number;
  category: keyof NirfRanks;
  rank: string;
  instituteId?: string;
  name: string;
  city: string;
  sourceUrl: string;
  heading: string;
}
const EVIDENCE = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/nirf/nirf-evidence.json"), "utf8")) as {
  year: number;
  previousYear: number;
  colleges: Record<string, { none?: string; rows: Row[] }>;
};

function fromRows(rows: Row[], year: number) {
  const ranks: NirfRanks = {};
  const bands: Partial<Record<keyof NirfRanks, string>> = {};
  for (const r of rows.filter((x) => x.year === year)) {
    if (/^\d+$/.test(r.rank)) ranks[r.category] = Number(r.rank);
    else bands[r.category] = r.rank;
  }
  return { ranks, bands };
}

describe("NIRF evidence", () => {
  it("covers the years the catalogue names", () => {
    expect(EVIDENCE.year).toBe(NIRF_SOURCE_YEAR);
    expect(EVIDENCE.previousYear).toBe(NIRF_PREVIOUS_YEAR);
  });

  it("has one entry per college and nothing else", () => {
    expect(Object.keys(EVIDENCE.colleges).sort()).toEqual(COLLEGES.map((c) => c.slug).sort());
  });

  it("every row was read on nirfindia.org, on a page headed with its year", () => {
    for (const { rows } of Object.values(EVIDENCE.colleges)) {
      for (const r of rows) {
        expect(new URL(r.sourceUrl).hostname).toBe("www.nirfindia.org");
        expect(r.sourceUrl).toContain(`/Rankings/${r.year}/`);
        expect(r.heading).toContain(`India Rankings ${r.year}`);
        expect(r.rank).toMatch(/^\d+$|^\d+-\d+$/);
        // Numeric ranks come from the coded main tables; bands from band pages.
        expect(/^\d+$/.test(r.rank)).toBe(!!r.instituteId);
      }
    }
  });

  it("each college's nirf, nirfBands and nirfPrevious are exactly the evidence rows", () => {
    for (const c of COLLEGES) {
      const rows = EVIDENCE.colleges[c.slug].rows;
      const now = fromRows(rows, NIRF_SOURCE_YEAR);
      const prev = fromRows(rows, NIRF_PREVIOUS_YEAR);
      expect(c.nirf, c.slug).toEqual(now.ranks);
      expect(c.nirfBands ?? {}, c.slug).toEqual(now.bands);
      expect(c.nirfPrevious?.year, c.slug).toBe(NIRF_PREVIOUS_YEAR);
      expect(c.nirfPrevious?.ranks, c.slug).toEqual(prev.ranks);
      expect(c.nirfPrevious?.bands ?? {}, c.slug).toEqual(prev.bands);
    }
  });

  it("a college NIRF does not rank says why and shows no rank", () => {
    const none = Object.entries(EVIDENCE.colleges).filter(([, e]) => e.none);
    expect(none.map(([s]) => s).sort()).toEqual(["amrita-medical-faridabad", "jindal-global-law", "nlu-jodhpur"]);
    for (const [slug, e] of none) {
      expect(e.rows).toEqual([]);
      const c = COLLEGES.find((x) => x.slug === slug)!;
      expect(formatNirfRanks(c.nirf)).toBe("");
    }
  });

  it("prints the source year with the ranks", () => {
    const iitm = COLLEGES.find((c) => c.slug === "iit-madras")!;
    expect(formatNirfRanks(iitm.nirf)).toMatch(new RegExp(`^NIRF Overall #1, Engineering #1.*\\(${NIRF_SOURCE_YEAR}\\)$`));
  });
});

// Published cutoffs on the page: one column per category and one row name
// per state, however each document prints them (14 Sep 2026). Pure — no DB,
// no network.
// Run: npx vitest run tests/unit/official-cutoffs-display.test.ts

import { describe, it, expect } from "vitest";
import { canonicalRegion, completeStateFragments, displayCategoryLabel, groupCutoffTables, type OfficialCutoffRow } from "@/lib/official-cutoffs";
import { cutoffNoun, officialCutoffTitle, pickCutoffHeadline, scoreTypeNoun } from "@/lib/official-cutoff-title";
import fs from "node:fs";
import path from "node:path";

const stored = (over: Partial<OfficialCutoffRow>): OfficialCutoffRow => ({
  cycle: "CEN 01/2024",
  stage: "CBT 1",
  post: "Assistant Loco Pilot",
  region: "",
  gender: "",
  category: "UR",
  categoryLabel: "UR",
  marks: "50",
  maxMarks: "",
  scoreType: "normalised marks",
  sourceUrl: "https://rrb.indianrailways.gov.in/cutoff.pdf",
  sourceTitle: "CBT 1 cutoff",
  publisher: "RRB",
  publishedOn: "2025-02-26",
  ...over,
});

describe("displayCategoryLabel", () => {
  it("heads a column by category however the document spells it", () => {
    expect(displayCategoryLabel("Open UR", "UR")).toBe("UR");
    expect(displayCategoryLabel("Cut-Off UR", "UR")).toBe("UR");
    expect(displayCategoryLabel("Cut-Off ExSM", "ESM")).toBe("ESM");
    expect(displayCategoryLabel("EXSM OBC", "ESM")).toBe("ESM OBC");
    expect(displayCategoryLabel("Ex-SM SC", "ESM")).toBe("ESM SC");
    expect(displayCategoryLabel("Ex.SM SC", "ESM")).toBe("ESM SC");
    for (const spelling of ["Pwd-Others", "Others", "Other-PWD", "Pwd_Others", "Others (PwD)", "PWD- Others", "OTHERS", "PwBD- Others", "PwD Others", "OTH"]) {
      expect(displayCategoryLabel(spelling, "PWD")).toBe("PwD-Others");
    }
  });

  it("leaves labels that carry meaning as printed", () => {
    expect(displayCategoryLabel("Others", "OTHER")).toBe("Others");
    expect(displayCategoryLabel("R-LD", "PWD")).toBe("R-LD");
    expect(displayCategoryLabel("LD UR", "PWD")).toBe("LD UR");
    expect(displayCategoryLabel("Open", "UR")).toBe("Open");
    expect(displayCategoryLabel("अनारक्षित — भूतपूर्व सैनिक की कट ऑफ", "ESM")).toBe("अनारक्षित — भूतपूर्व सैनिक की कट ऑफ");
  });
});

describe("canonicalRegion", () => {
  it("stores a state or UT in one spelling however its cell printed it", () => {
    expect(canonicalRegion("Chhattisga rh")).toBe("Chhattisgarh");
    expect(canonicalRegion("Maharasht ra")).toBe("Maharashtra");
    expect(canonicalRegion("ANDHRA PRADESH")).toBe("Andhra Pradesh");
    expect(canonicalRegion("Andhra\nPradesh")).toBe("Andhra Pradesh");
    expect(canonicalRegion("Jammu &Kashmir")).toBe("Jammu and Kashmir");
    expect(canonicalRegion("Dadra& Nagar Haveli and Daman & Diu")).toBe("Dadra and Nagar Haveli and Daman and Diu");
    expect(canonicalRegion("Andaman & Nicobar")).toBe("Andaman and Nicobar Islands");
    expect(canonicalRegion("ANDAMAN AND NICOBAR ISLANDS")).toBe("Andaman and Nicobar Islands");
    expect(canonicalRegion("Orissa")).toBe("Odisha");
    expect(canonicalRegion("UTTRAKHAND")).toBe("Uttarakhand");
  });

  it("leaves anything that is not a whole state or UT name alone", () => {
    expect(canonicalRegion("Andhra")).toBeNull();
    expect(canonicalRegion("West")).toBeNull();
    expect(canonicalRegion("RRB Ahmedabad")).toBeNull();
    expect(canonicalRegion("Goa CGST")).toBeNull();
    expect(canonicalRegion("")).toBeNull();
  });
});

describe("completeStateFragments", () => {
  // One state-wise document: every state in full, several rows each (like SSC CT GD's final results).
  const states = ["Bihar", "Assam", "Kerala", "Odisha", "Punjab", "Goa", "Delhi", "Sikkim", "Madhya Pradesh", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andhra Pradesh", "Chhattisgarh", "Maharashtra", "Chandigarh"];
  const rows = [...states, ...states, ...states];

  it("completes a state name cut short in its cell to the one state it can be", () => {
    const fixes = completeStateFragments([...rows, "Madhya", "Chhattisga", "Uttarakhan", "Uttar", "West", "ANDHRA", "Maharasht", "Chandigar"]);
    expect(Object.fromEntries(fixes)).toEqual({
      Madhya: "Madhya Pradesh",
      Chhattisga: "Chhattisgarh",
      Uttarakhan: "Uttarakhand",
      Uttar: "Uttar Pradesh",
      West: "West Bengal",
      ANDHRA: "Andhra Pradesh",
      Maharasht: "Maharashtra",
      Chandigar: "Chandigarh",
    });
  });

  it("never completes anything in a zone-wise document", () => {
    expect(completeStateFragments(["RRB Ajmer", "RRB Kolkata", "RRB Mumbai", "West", "Madhya"]).size).toBe(0);
  });

  it("leaves a cell that is not the start of exactly one state name as printed", () => {
    expect(completeStateFragments([...rows, "Goa CGST", "Raj", "Hyderabad-Karnataka (371J)"]).size).toBe(0);
  });
});

describe("groupCutoffTables columns", () => {
  it("merges one category's spellings across zones into one column, in reservation order", () => {
    const [t] = groupCutoffTables([
      stored({ region: "RRB Kolkata", category: "ESM", categoryLabel: "EXSM UR", marks: "41.2" }),
      stored({ region: "RRB Ajmer", category: "UR", categoryLabel: "Open UR", marks: "54.3" }),
      stored({ region: "RRB Kolkata", category: "UR", categoryLabel: "Cut-Off UR", marks: "63.4" }),
      stored({ region: "RRB Ajmer", category: "SC", categoryLabel: "Open SC", marks: "36.2" }),
    ]);
    expect(t.categories).toEqual(["UR", "SC", "ESM UR"]);
    expect(t.rows.map((r) => [r.label, r.cells])).toEqual([
      ["RRB Ajmer", { UR: "54.3", SC: "36.2" }],
      ["RRB Kolkata", { "ESM UR": "41.2", UR: "63.4" }],
    ]);
  });

  it("keeps two spellings apart when one row prints both", () => {
    const [t] = groupCutoffTables([
      stored({ region: "RRB Ajmer", categoryLabel: "Open UR", marks: "54.3" }),
      stored({ region: "RRB Ajmer", categoryLabel: "Cut-Off UR", marks: "50.1" }),
    ]);
    expect(t.categories).toEqual(["Open UR", "Cut-Off UR"]);
  });

  it("keeps a sub-category group's columns together", () => {
    const [t] = groupCutoffTables([
      stored({ region: "RRB Mumbai", category: "PWD", categoryLabel: "LD SC", marks: "40.1" }),
      stored({ region: "RRB Mumbai", category: "PWD", categoryLabel: "VI UR", marks: "39.8" }),
      stored({ region: "RRB Mumbai", category: "PWD", categoryLabel: "LD UR", marks: "53.5" }),
      stored({ region: "RRB Mumbai", category: "PWD", categoryLabel: "VI SC", marks: "30.1" }),
    ]);
    expect(t.categories).toEqual(["LD UR", "LD SC", "VI UR", "VI SC"]);
  });
});

// 26 Sep 2026 (discoverability wave 2 G3): the page's official headline —
// the first table's first figure — and the title noun (src/lib/
// official-cutoff-title.ts). "(Official)" only for a first table wholly from
// the body's own site; the noun comes from scoreType (percentile / rank
// figures are not marks). scoreType strings below are prod's own.
describe("official cutoff headline and title noun", () => {
  it("reads the noun from scoreType", () => {
    expect(scoreTypeNoun("normalised marks")).toBe("marks");
    expect(scoreTypeNoun("Total Marks of last selected candidate (Tier-II)")).toBe("marks");
    expect(scoreTypeNoun("normalised scores (cut-off marks)")).toBe("marks");
    expect(scoreTypeNoun("Percentile Score")).toBe("percentile");
    expect(scoreTypeNoun("NTA percentile")).toBe("percentile");
    expect(scoreTypeNoun("closing rank")).toBe("rank");
    expect(scoreTypeNoun("cut-off merit index")).toBe("score");
    expect(scoreTypeNoun("cut off score")).toBe("score");
    expect(scoreTypeNoun("कट-ऑफ अंक (Board notice calls them प्रसामान्यीकृत / normalised) - as reproduced by Amar Ujala")).toBe("marks");
  });

  it("one noun across the page's tables, else 'score' (RRB Group D mixes marks and percentile)", () => {
    expect(cutoffNoun([{ scoreType: "normalised marks" }, { scoreType: "Cut-off Marks in Section-I" }])).toBe("marks");
    expect(cutoffNoun([{ scoreType: "Normalized Marks" }, { scoreType: "Percentile Score" }])).toBe("score");
    expect(cutoffNoun([{ scoreType: "Percentile Score" }])).toBe("percentile");
  });

  it("the headline is the first table's first category in reservation order, with its document", () => {
    const tables = groupCutoffTables([
      stored({ cycle: "CEN 01/2019", region: "RRB Ajmer", categoryLabel: "UR", marks: "40" }),
      stored({ cycle: "CEN 01/2024", region: "", post: "Assistant Loco Pilot", category: "SC", categoryLabel: "SC", marks: "36.2" }),
      stored({ cycle: "CEN 01/2024", region: "", post: "Assistant Loco Pilot", category: "UR", categoryLabel: "UR", marks: "54.3" }),
    ]);
    const h = pickCutoffHeadline(tables, "https://rrb.indianrailways.gov.in")!;
    expect(h.cycle).toBe("CEN 01/2024");
    expect(h.category).toBe("UR");
    expect(h.marks).toBe("54.3");
    expect(h.publisher).toBe("RRB");
    expect(h.publishedOn).toBe("2025-02-26");
    expect(h.tier).toBe("official");
    expect(h.tableOfficial).toBe(true);
    expect(officialCutoffTitle(h)).toBe(true);
    expect(pickCutoffHeadline([], null)).toBeNull();
  });

  it("a newspaper's copy, or any non-official document in the first table, never makes the title '(Official)'", () => {
    const paper = groupCutoffTables([stored({ sourceUrl: "https://www.amarujala.com/cutoff", publisher: "Amar Ujala" })]);
    const hp = pickCutoffHeadline(paper, "https://uppbpb.gov.in")!;
    expect(hp.tier).toBe("reported");
    expect(officialCutoffTitle(hp)).toBe(false);
    const mixed = groupCutoffTables([
      stored({ region: "RRB Ajmer" }),
      stored({ region: "RRB Kolkata", sourceUrl: "https://www.adda247.com/rrb-cutoff", publisher: "Adda247" }),
    ]);
    const hm = pickCutoffHeadline(mixed, null)!;
    expect(hm.tier).toBe("official");
    expect(hm.tableOfficial).toBe(false);
    expect(officialCutoffTitle(hm)).toBe(false);
    expect(officialCutoffTitle(null)).toBe(false);
  });

  it("wiring: the cutoff page titles, H1 and JSON-LD use the official copy only through officialCutoffTitle", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "src/app/exams/[code]/cutoff/page.tsx"), "utf8");
    expect(page).toContain("const official = officialCutoffTitle(headline);");
    expect(page).toContain('tt("cutoff.metaTitleOfficial")');
    expect(page).toContain('t("cutoff.h1Official")');
    expect(page).toContain('tUrl("cutoff.metaTitleOfficial")');
    // The bands stay below the published tables and are called indicative.
    expect(page.indexOf('id="published"')).toBeLessThan(page.indexOf('t("cutoff.bands")'));
  });
});

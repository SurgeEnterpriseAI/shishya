// Published cutoffs on the page: one column per category and one row name
// per state, however each document prints them (14 Sep 2026). Pure — no DB,
// no network.
// Run: npx vitest run tests/unit/official-cutoffs-display.test.ts

import { describe, it, expect } from "vitest";
import { canonicalRegion, completeStateFragments, displayCategoryLabel, groupCutoffTables, type OfficialCutoffRow } from "@/lib/official-cutoffs";

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

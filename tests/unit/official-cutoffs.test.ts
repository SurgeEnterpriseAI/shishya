// Published cutoffs: the verification gate and the display grouping
// (13 Sep 2026). Pure — no DB, no network.
// Run: npx vitest run tests/unit/official-cutoffs.test.ts

import { describe, it, expect } from "vitest";
import {
  asciiDigits,
  candidateFigures,
  cutoffContextLines,
  cycleYear,
  dataLineInDocument,
  groupCutoffTables,
  hasNumberToken,
  headingKeys,
  prepareCutoffGrid,
  verifyCutoffRow,
  verifyCutoffRowByGrid,
  verifyPrintedLine,
  type CutoffCandidate,
  type CutoffGridPage,
  type CutoffGridTable,
  type OfficialCutoffRow,
} from "@/lib/official-cutoffs";

const SOURCE = `
  STAFF SELECTION COMMISSION
  Constable (GD) Examination, 2024 — Cut-off marks
  Category      Cut-off Marks     Candidates
  UR            147.64322         12,345
  OBC           140.10000         9,876
  SC            131.2             4,321
`;

const row = (over: Partial<CutoffCandidate> = {}): CutoffCandidate => ({
  cycle: "2024",
  stage: "Final selection",
  post: "",
  region: "",
  gender: "",
  category: "UR",
  categoryLabel: "UR",
  marks: "147.64322",
  maxMarks: "160",
  scoreType: "normalised marks",
  evidence: "UR            147.64322         12,345",
  ...over,
});

describe("asciiDigits / hasNumberToken", () => {
  it("turns Indic digits into ASCII and leaves everything else", () => {
    expect(asciiDigits("गुण ४६.५०")).toBe("गुण 46.50");
    expect(asciiDigits("૭૨.૫")).toBe("72.5");
    expect(asciiDigits("౯౮")).toBe("98");
  });

  it("matches whole numbers only", () => {
    expect(hasNumberToken("UR 82.08 marks", "82.08")).toBe(true);
    expect(hasNumberToken("UR 182.08 marks", "82.08")).toBe(false);
    expect(hasNumberToken("UR 82.081 marks", "82.08")).toBe(false);
    expect(hasNumberToken("UR ८२.०८", "82.08")).toBe(true);
    expect(hasNumberToken("anything", "82,08")).toBe(false);
  });
});

describe("verifyCutoffRow", () => {
  it("passes a figure that sits on its evidence line in the document", () => {
    expect(verifyCutoffRow(row(), SOURCE)).toEqual({ ok: true, reasons: [] });
  });

  it("tolerates different whitespace between the saved copy and the fresh download", () => {
    expect(verifyCutoffRow(row({ evidence: "UR 147.64322 12,345" }), SOURCE).ok).toBe(true);
  });

  it("rejects a figure that is not in the document", () => {
    const v = verifyCutoffRow(row({ marks: "147.6", evidence: "UR 147.6" }), SOURCE);
    expect(v.ok).toBe(false);
    expect(v.reasons).toContain("evidence line not found in the source document");
    expect(v.reasons).toContain("marks figure not found in the source document");
  });

  it("rejects a figure attached to the wrong category", () => {
    const v = verifyCutoffRow(row({ category: "OBC", categoryLabel: "OBC" }), SOURCE);
    expect(v.ok).toBe(false);
    expect(v.reasons.some((r) => r.includes("category label"))).toBe(true);
  });

  it("rejects a marks value that is not on the evidence line", () => {
    const v = verifyCutoffRow(row({ marks: "140.10000" }), SOURCE);
    expect(v.ok).toBe(false);
    expect(v.reasons).toContain("marks figure is not on the evidence line");
  });

  it("rejects unknown categories and empty evidence", () => {
    expect(verifyCutoffRow(row({ category: "GEN" }), SOURCE).reasons).toContain('unknown category "GEN"');
    expect(verifyCutoffRow(row({ evidence: "" }), SOURCE).reasons).toContain("no evidence line");
  });

  it("reads table pipes the way the PDF text prints them", () => {
    const src = "Category | Cut-off\nUR | 147.64322\n";
    expect(verifyCutoffRow(row({ evidence: "UR | 147.64322", maxMarks: "" }), src).ok).toBe(true);
  });
});

describe("which column a figure sits in", () => {
  it("counts only cutoff-like figures on a line", () => {
    expect(candidateFigures("2 GM/W 817.7500 30/05/94")).toEqual(["817.7500"]);
    expect(candidateFigures("123.000 5% OPEN --- --- ---")).toEqual(["123.000"]);
    expect(candidateFigures("General Standards (OC) = 81.20 Marks (Maximum Marks 150)")).toEqual(["81.20"]);
    expect(candidateFigures("UR 147.64322 12,345")).toEqual(["147.64322"]);
    expect(candidateFigures("OBC 61.5 of 100", "100")).toEqual(["61.5"]);
  });

  it("recognises column headings, in order, in English, Hindi and Gujarati", () => {
    expect(headingKeys("sr. no. category male cut off female cut off")).toEqual(["male", "female"]);
    expect(headingKeys("category male female ex-serviceman")).toEqual(["male", "female", "esm"]);
    expect(headingKeys("श्रेणी पुरुष महिला")).toEqual(["male", "female"]);
    expect(headingKeys("કેટેગરી પુરુષ મહિલા")).toEqual(["male", "female"]);
    expect(headingKeys("category general women hg cpp ncc cdi")).toEqual(["female"]);
  });

  const PB =
    "SR. NO. CATEGORY MALE CUT OFF FEMALE CUT OFF\n1 Backward Classes, Punjab 73.53959 67.48365\n2 Economically Weaker Sections, Punjab 59.38353 57.45265\n";
  const pbRow = (over: Partial<CutoffCandidate>): CutoffCandidate =>
    row({
      categoryLabel: "Backward Classes, Punjab",
      category: "OBC",
      evidence: "SR. NO. CATEGORY MALE CUT OFF FEMALE CUT OFF\n1 Backward Classes, Punjab 73.53959 67.48365",
      maxMarks: "",
      ...over,
    });

  it("proves a MALE / FEMALE column by the table's heading order", () => {
    expect(verifyCutoffRow(pbRow({ gender: "Male", marks: "73.53959" }), PB).ok).toBe(true);
    expect(verifyCutoffRow(pbRow({ gender: "Female", marks: "67.48365" }), PB).ok).toBe(true);
  });

  it("finds the heading above a row whose evidence quotes only the row", () => {
    const ews = (gender: string, marks: string) =>
      pbRow({ categoryLabel: "Economically Weaker Sections, Punjab", category: "EWS", gender, marks, evidence: "2 Economically Weaker Sections, Punjab 59.38353 57.45265" });
    expect(verifyCutoffRow(ews("Male", "59.38353"), PB).ok).toBe(true);
    expect(verifyCutoffRow(ews("Female", "57.45265"), PB).ok).toBe(true);
  });

  it("rejects a male figure stored as the female cutoff", () => {
    const v = verifyCutoffRow(pbRow({ gender: "Female", marks: "73.53959" }), PB);
    expect(v.ok).toBe(false);
    expect(v.reasons).toContain("the figure is not under the column this row names");
  });

  it("rejects a row that does not say which column of a male / female table it reads", () => {
    const v = verifyCutoffRow(pbRow({ gender: "", marks: "73.53959" }), PB);
    expect(v.ok).toBe(false);
    expect(v.reasons.some((r) => r.startsWith("the table splits into columns"))).toBe(true);
  });

  const GJ = "CATEGORY | MALE | FEMALE | EX-SERVICEMAN\nGENERAL | 132.25 | 113.50 | 105.80\n";
  const gjRow = (over: Partial<CutoffCandidate>): CutoffCandidate =>
    row({ categoryLabel: "GENERAL", category: "UR", evidence: "GENERAL | 132.25 | 113.50 | 105.80", maxMarks: "", ...over });

  it("proves a three-column table, including a qualifier in the label", () => {
    expect(verifyCutoffRow(gjRow({ gender: "Male", marks: "132.25" }), GJ).ok).toBe(true);
    expect(verifyCutoffRow(gjRow({ gender: "Female", marks: "113.50" }), GJ).ok).toBe(true);
    expect(verifyCutoffRow(gjRow({ categoryLabel: "GENERAL / Ex-serviceman", marks: "105.80" }), GJ).ok).toBe(true);
    const wrong = verifyCutoffRow(gjRow({ categoryLabel: "GENERAL / Ex-serviceman", marks: "113.50" }), GJ);
    expect(wrong.reasons).toContain("the figure is not under the column this row names");
  });

  it("accepts a 'label figure' pair when a line holds several pairs", () => {
    const WB = "Category Cut-off Category Relaxation\nGeneral 49 PwBD-A -3.75 Ex-SM* -2\nOBC-A 48 PwBD-B -3.75 SC(Ex-SM) -7.5\n";
    const wb = (categoryLabel: string, marks: string, evidence: string) =>
      row({ categoryLabel, marks, evidence, maxMarks: "", category: "OTHER" });
    expect(verifyCutoffRow(wb("General", "49", "General 49 PwBD-A -3.75 Ex-SM* -2"), WB).ok).toBe(true);
    expect(verifyCutoffRow(wb("OBC-A", "48", "OBC-A 48 PwBD-B -3.75 SC(Ex-SM) -7.5"), WB).ok).toBe(true);
    expect(verifyCutoffRow(wb("PwBD-A", "-3.75", "General 49 PwBD-A -3.75 Ex-SM* -2"), WB).reasons).toContain('marks "-3.75" is not a plain number');
  });

  const TS = "Category General Women HG CPP NCC CDI\n123.000\n5% OPEN --- --- --- --- ---\n119.000 110.000 117.000 122.000\nOC --- ---\n";

  it("rejects a district row under several quota columns", () => {
    const v = verifyCutoffRow(
      row({ category: "UR", categoryLabel: "OC", marks: "117.000", evidence: "119.000 110.000 117.000 122.000 OC --- ---", maxMarks: "" }),
      TS,
    );
    expect(v.ok).toBe(false);
    expect(v.reasons).toContain("the line has empty-column placeholders (---); which column holds the figure could not be verified");
  });

  it("rejects even a single figure printed beside empty-column placeholders", () => {
    const v = verifyCutoffRow(
      row({ category: "OTHER", categoryLabel: "5% OPEN", marks: "123.000", evidence: "123.000 5% OPEN --- --- --- --- ---", maxMarks: "" }),
      TS,
    );
    expect(v.ok).toBe(false);
  });

  it("rejects the maximum marks stored as a cutoff", () => {
    const src = "General Standards (OC) = 81.20 Marks (Maximum Marks 150)";
    const v = verifyCutoffRow(row({ categoryLabel: "General Standards (OC)", marks: "150", maxMarks: "150", evidence: src }), src);
    expect(v.ok).toBe(false);
    expect(v.reasons.some((r) => r.startsWith("marks figure is not a cutoff figure"))).toBe(true);
  });
});

describe("the evidence's data row", () => {
  it("rejects a label that appears only in a quoted heading line", () => {
    const src = "UR SC ST\n80.1\n";
    const v = verifyCutoffRow(row({ category: "SC", categoryLabel: "SC", marks: "80.1", maxMarks: "", evidence: "UR SC ST\n80.1" }), src);
    expect(v.ok).toBe(false);
    expect(v.reasons).toContain('category label "SC" is not on the evidence line');
  });
});

const page = (tables: CutoffGridTable[], text = "", n = 1): CutoffGridPage => ({ page: n, text, tables });

describe("verifyCutoffRowByGrid — categories across the top", () => {
  const RRB = prepareCutoffGrid([
    page(
      [
        { above: "Cutoff Marks of Candidates shortlisted for NTPC (Graduate) 2nd Stage under CEN No. 05/2024", rows: [["RRB : AHMEDABAD"], ["CEN No. 05/2024"]] },
        {
          above: "",
          rows: [
            ["CAT_NO", "UR", "SC", "ST", "OBC", "EWS", "ESM", "R-VI", "R-HI", "R-LD"],
            ["1", "80.67967", "73.20003", "72.73387", "77.87368", "77.27507", "52.59353", "", "37.13724", "57.69813"],
            ["2", "80.21971", "72.71586", "72.06838", "77.70516", "76.86486", "48.46731", "", "", ""],
          ],
        },
      ],
      "RRB : AHMEDABAD\nCutoff Marks of Candidates shortlisted for NTPC (Graduate) 2nd Stage",
    ),
  ]);
  const line1 = "1  80.67967 73.20003 72.73387 77.87368 77.27507 52.59353 37.13724 57.69813";
  const rrb = (over: Partial<CutoffCandidate>) =>
    row({ cycle: "CEN 05/2024", stage: "CBT 1", post: "NTPC (Graduate) CAT_NO 1", region: "RRB Ahmedabad", maxMarks: "", evidence: line1, ...over });

  it("reads the column from the ruled cell, even after an empty cell", () => {
    expect(verifyCutoffRowByGrid(rrb({ category: "PWD", categoryLabel: "R-HI", marks: "37.13724" }), RRB)).toEqual({ ok: true, reasons: [], scoreType: undefined });
    expect(verifyCutoffRowByGrid(rrb({ category: "UR", categoryLabel: "UR", marks: "80.67967" }), RRB).ok).toBe(true);
  });

  it("rejects the same figure claimed for the empty column before it", () => {
    // The layout text reads "52.59353 37.13724" — in order, 37.13724 would land under R-VI.
    expect(verifyCutoffRowByGrid(rrb({ category: "PWD", categoryLabel: "R-VI", marks: "37.13724" }), RRB).ok).toBe(false);
  });

  it("checks the post number, the zone and that the quoted line is that row", () => {
    expect(verifyCutoffRowByGrid(rrb({ post: "NTPC (Graduate) CAT_NO 2", marks: "80.67967" }), RRB).ok).toBe(false);
    expect(verifyCutoffRowByGrid(rrb({ region: "RRB Ajmer", marks: "80.67967" }), RRB).reasons).toContain('the table\'s page does not name the region "RRB Ajmer"');
    expect(verifyCutoffRowByGrid(rrb({ marks: "80.67967", evidence: "1 80.67967 99.99999" }), RRB).reasons).toContain(
      "the quoted line is not the table row that holds the figure",
    );
  });

  it("refuses a count row even under a category heading", () => {
    const MTS = prepareCutoffGrid([page([{ above: "", rows: [["Category", "EWS", "SC"], ["Vacancy", "120", "126"], ["Candidates Shortlisted", "840", "882"]] }])]);
    const v = verifyCutoffRowByGrid(row({ category: "EWS", categoryLabel: "EWS", marks: "120", maxMarks: "", evidence: "Vacancy 120 126" }), MTS);
    expect(v.ok).toBe(false);
    expect(v.reasons).toContain('the table row "Vacancy" holds counts, not marks');
  });

  it("accepts a labelled cut-off row, small whole-number marks included", () => {
    const CHSL = prepareCutoffGrid([
      page([{ above: "(i) Category-wise cut-off in Section III", rows: [["", "SC", "ST", "OBC", "PWD-\nOthers", "UR"], ["Cut-off marks", "9", "9", "11.25", "9", "13.5"]] }]),
    ]);
    const chsl = (categoryLabel: string, category: string, marks: string) =>
      row({ categoryLabel, category, marks, maxMarks: "", evidence: "Cut-off marks 9 9 11.25 9 13.5" });
    expect(verifyCutoffRowByGrid(chsl("PwD-Others", "PWD", "9"), CHSL).ok).toBe(true);
    expect(verifyCutoffRowByGrid(chsl("UR", "UR", "13.5"), CHSL).ok).toBe(true);
    expect(verifyCutoffRowByGrid(chsl("OBC", "OBC", "13.5"), CHSL).ok).toBe(false);
  });
});

describe("verifyCutoffRowByGrid — row qualifiers and lone rows", () => {
  const ALP = prepareCutoffGrid([
    page(
      [
        {
          above: "RRB KOLKATA\nNormalised cut-off marks of candidates shortlisted for CBT-2, CEN 01/2024 (ALP)",
          rows: [
            ["Category", "UR", "SC", "ST", "OBC", "EWS"],
            ["Open", "63.44130", "45.72091", "34.71880", "46.82396", "40.05217"],
            ["EXSM", "40.10000", "", "", "38.20000", ""],
          ],
        },
      ],
      "RRB KOLKATA Normalised cut-off marks",
    ),
  ]);
  const alp = (over: Partial<CutoffCandidate>) => row({ cycle: "CEN 01/2024", stage: "CBT 1", region: "RRB Kolkata", maxMarks: "", ...over });
  const open = "Open 63.44130 45.72091 34.71880 46.82396 40.05217";

  it("proves a label that names both the row and the column", () => {
    expect(verifyCutoffRowByGrid(alp({ category: "ST", categoryLabel: "Open ST", marks: "34.71880", evidence: open }), ALP).ok).toBe(true);
    expect(verifyCutoffRowByGrid(alp({ category: "ESM", categoryLabel: "EXSM OBC", marks: "38.20000", evidence: "EXSM 40.10000 38.20000" }), ALP).ok).toBe(true);
  });

  it("rejects a sub-category row stored under the community alone, or under the wrong column", () => {
    expect(verifyCutoffRowByGrid(alp({ category: "ST", categoryLabel: "ST", marks: "34.71880", evidence: open }), ALP).reasons).toContain(
      'the table row says "Open"; the row does not name it',
    );
    expect(verifyCutoffRowByGrid(alp({ category: "ESM", categoryLabel: "EXSM SC", marks: "38.20000", evidence: "EXSM 40.10000 38.20000" }), ALP).ok).toBe(false);
  });

  const lone = (tables: CutoffGridTable[]) => prepareCutoffGrid([page(tables, "RRB PRAYAGRAJ Cut-off marks of candidates shortlisted for PET")]);
  const one: CutoffGridTable = { above: "", rows: [["UR", "SC", "ST", "OBC", "EWS"], ["78.12573", "72.40928", "66.6584", "77.31772", "74.14863"]] };
  const gpd = (over: Partial<CutoffCandidate>) =>
    row({ cycle: "CEN 08/2024", stage: "CBT", region: "RRB Prayagraj", maxMarks: "", evidence: "78.12573 72.40928 66.6584 77.31772 74.14863", ...over });

  it("accepts a lone row of figures under category headings in a cut-off document", () => {
    expect(verifyCutoffRowByGrid(gpd({ category: "UR", categoryLabel: "UR", marks: "78.12573" }), lone([one])).ok).toBe(true);
    expect(verifyCutoffRowByGrid(gpd({ category: "EWS", categoryLabel: "EWS", marks: "74.14863" }), lone([one])).ok).toBe(true);
  });

  it("refuses unlabelled rows once there are two of them, or two tables on the page", () => {
    const two: CutoffGridTable = { above: "", rows: [...one.rows, ["70.1", "60.2", "50.3", "65.4", "66.5"]] };
    expect(verifyCutoffRowByGrid(gpd({ category: "UR", categoryLabel: "UR", marks: "78.12573" }), lone([two])).ok).toBe(false);
    const other: CutoffGridTable = { above: "Ex-servicemen", rows: [["UR", "SC"], ["40.5", "30.5"]] };
    expect(verifyCutoffRowByGrid(gpd({ category: "UR", categoryLabel: "UR", marks: "78.12573" }), lone([one, other])).ok).toBe(false);
  });
});

describe("verifyCutoffRowByGrid — spellings, score kinds, corrigenda, long tables", () => {
  it("reads a board's full name and a renamed city's older name as the zone", () => {
    const grid = prepareCutoffGrid([
      page(
        [{ above: "RAILWAY RECRUITMENT BOARD - ALLAHABAD\nNORMALISED CUT OFF MARKS OF CANDIDATES SHORTLISTED FOR PET", rows: [["UR", "SC"], ["72.1634", "66.06265"]] }],
        "RAILWAY RECRUITMENT BOARD - ALLAHABAD NORMALISED CUT OFF MARKS",
      ),
    ]);
    const r = (region: string) =>
      row({ region, cycle: "CEN 08/2024", stage: "CBT", category: "SC", categoryLabel: "SC", marks: "66.06265", maxMarks: "", evidence: "72.1634 66.06265" });
    expect(verifyCutoffRowByGrid(r("RRB Prayagraj"), grid).ok).toBe(true);
    expect(verifyCutoffRowByGrid(r("RRB Allahabad"), grid).ok).toBe(true);
    expect(verifyCutoffRowByGrid(r("RRB Patna"), grid).ok).toBe(false);
  });

  it("holds a figure to the kind of score its row prints", () => {
    const grid = prepareCutoffGrid([
      page(
        [
          {
            above: "",
            rows: [
              // Title rows ruled into the table: context, not column headings.
              ["GOVERNMENT OF INDIA\nRAILWAY RECRUITMENT BOARD : BHUBANESWAR", "", "", ""],
              ["CEN RRC 01/2019 (Posts in Level-1 of 7th CPC Pay Matrix)", "", "", ""],
              ["Category", "Cut-off", "UR", "SC"],
              ["Open", "Percentile Score", "96.96366", "88.26087"],
              ["", "Normalized Marks", "66.49810", "49.13464"],
            ],
          },
        ],
        "GOVERNMENT OF INDIA RAILWAY RECRUITMENT BOARD : BHUBANESWAR Cut-off Percentile Score/Normalized Marks",
      ),
    ]);
    const r = (marks: string, scoreType: string, evidence: string) =>
      row({
        region: "RRB Bhubaneswar",
        cycle: "CEN RRC 01/2019",
        stage: "CBT",
        post: "Posts in Level-1 of 7th CPC Pay Matrix",
        category: "UR",
        categoryLabel: "Open UR",
        marks,
        scoreType,
        maxMarks: "",
        evidence,
      });
    expect(verifyCutoffRowByGrid(r("96.96366", "Percentile Score", "Percentile Score 96.96366 88.26087"), grid).ok).toBe(true);
    expect(verifyCutoffRowByGrid(r("66.49810", "Normalized Marks", "Normalized Marks 66.49810 49.13464"), grid).ok).toBe(true);
    expect(verifyCutoffRowByGrid(r("96.96366", "Normalized Marks", "Percentile Score 96.96366 88.26087"), grid).ok).toBe(false);
  });

  it("takes a corrigendum's READ AS column over its FOR column", () => {
    const grid = prepareCutoffGrid([
      page([
        {
          above: "Corrigendum",
          rows: [
            ["Category", "FOR", "", "READ AS", ""],
            ["", "Cut-off marks", "Candidates\navailable", "Actual Cut-off\nmarks", "Actual Candidates\navailable"],
            ["SC", "114.97063", "25338", "115.02843", "25229"],
          ],
        },
      ]),
    ]);
    const r = (marks: string) => row({ category: "SC", categoryLabel: "SC", marks, maxMarks: "", evidence: "SC 114.97063 25338 115.02843 25229" });
    expect(verifyCutoffRowByGrid(r("115.02843"), grid).ok).toBe(true);
    expect(verifyCutoffRowByGrid(r("114.97063"), grid).ok).toBe(false);
  });

  it("finds a long table's data row without its far-away heading", () => {
    const src = `Post Code Category Vacancy Filled Total Marks\n${"filler line\n".repeat(600)}D55 VH 8 8 220.00 115.00 27-01-1999\n`;
    const r = row({ evidence: "Total Marks\nD55 VH 8 8 220.00 115.00 27-01-1999" });
    expect(dataLineInDocument(r, src)).toBe(true);
    expect(verifyCutoffRow(r, src).reasons).toContain("evidence line not found in the source document");
    expect(dataLineInDocument(row({ evidence: "D55 VH 8 8 220.00 115.00" }), "D55 VH 8 8 220.001 115.00")).toBe(false);
  });
});

describe("verifyCutoffRowByGrid — merged headings and revised columns", () => {
  it("reads a two-level heading spread over its sub-columns, and skips title rows ruled into the table", () => {
    const title = "GOVERNMENT OF INDIA RAILWAY RECRUITMENT BOARD, BENGALURU";
    const grid = prepareCutoffGrid([
      page(
        [
          {
            above: "",
            rows: [
              [title, title, title, title, title, title],
              ["Level 2", "Level 2", "Level 2", "Level 2", "Level 2", "Level 2"],
              ["UR", "SC", "Ex-SM", "Ex-SM", "LD", "LD"],
              ["UR", "SC", "UR", "SC", "UR", "SC"],
              ["68.16898", "60.51048", "—", "—", "53.54282", "53.55485"],
            ],
            spans: [
              ["", "<", "<", "<", "<", "<"],
              ["", "<", "<", "<", "<", "<"],
              ["", "", "", "<", "", "<"],
              ["^", "^", "", "", "", ""],
              ["", "", "", "", "", ""],
            ],
          },
        ],
        "CEN 01/2019 NTPC revised cut-off marks",
      ),
    ]);
    const r = (categoryLabel: string, marks: string) =>
      row({
        region: "RRB Bengaluru",
        cycle: "CEN 01/2019",
        stage: "CBT 1",
        post: "Level 2",
        category: "PWD",
        categoryLabel,
        marks,
        maxMarks: "",
        evidence: "68.16898 60.51048 — — 53.54282 53.55485",
      });
    expect(verifyCutoffRowByGrid(r("LD SC", "53.55485"), grid).ok).toBe(true);
    expect(verifyCutoffRowByGrid(r("UR", "68.16898"), grid).ok).toBe(true);
    // "SC" alone would drop the LD sub-category; "Ex-SM SC" names the wrong group.
    expect(verifyCutoffRowByGrid(r("SC", "53.55485"), grid).ok).toBe(false);
    expect(verifyCutoffRowByGrid(r("Ex-SM SC", "53.55485"), grid).ok).toBe(false);
  });

  it("takes the column the document marks as revised", () => {
    const grid = prepareCutoffGrid([
      page([
        {
          above: "additional result",
          rows: [
            ["Category", "Original\ncut-off", "Revised\ncut-off", "No. of additional\ncandidates"],
            ["SC", "126.45554", "126.42235", "49"],
          ],
        },
      ]),
    ]);
    const r = (marks: string) => row({ category: "SC", categoryLabel: "SC", marks, maxMarks: "", evidence: "SC 126.45554 126.42235 49" });
    expect(verifyCutoffRowByGrid(r("126.42235"), grid).ok).toBe(true);
    expect(verifyCutoffRowByGrid(r("126.45554"), grid).ok).toBe(false);
  });
});

describe("printed lines", () => {
  const withLines = (lines: string[], tables: CutoffGridTable[] = []) => prepareCutoffGrid([{ page: 1, text: "", lines, tables }]);

  it("accepts a text-proof row only when its label is printed on the figure's line", () => {
    // pdftotext's layout put "UR" beside 45.74222; the page prints EWS on that row.
    const grid = withLines(["West", "BSF B EWS 39 30 45.74222 23.25 3.50 28-02-2002", "Bengal", "BSF G UR 9 9 90.55873 33.50 7.50 01-03-2003"]);
    expect(verifyPrintedLine(row({ category: "EWS", categoryLabel: "EWS", marks: "45.74222" }), grid).ok).toBe(true);
    expect(verifyPrintedLine(row({ category: "UR", categoryLabel: "UR", marks: "45.74222" }), grid).ok).toBe(false);
    expect(verifyPrintedLine(row(), prepareCutoffGrid([])).reasons).toContain("the document's printed lines could not be read");
  });

  it("holds a grid row's category cell to the figure's printed line", () => {
    const tables: CutoffGridTable[] = [{ above: "", rows: [["Category", "Cut-off Marks"], ["UR", "147.64322"], ["OBC", "140.10000"]] }];
    const straight = withLines(["Category Cut-off Marks", "UR 147.64322", "OBC 140.10000"], tables);
    const crossed = withLines(["Category Cut-off Marks", "OBC 147.64322", "UR 140.10000"], tables);
    expect(verifyCutoffRowByGrid(row({ maxMarks: "", evidence: "UR 147.64322" }), straight).ok).toBe(true);
    expect(verifyCutoffRowByGrid(row({ maxMarks: "", evidence: "UR 147.64322" }), crossed).reasons).toContain(
      'the category "UR" is not printed on the figure\'s line',
    );
  });

  it("does not let a wrapped name at the top of a page break a table's continuation", () => {
    const head = [["State", "Force", "Area", "Category", "Vacancy", "Filled", "Cut-off Marks", "Part-A Marks", "Part-B Marks", "Date of Birth"]];
    const grid = prepareCutoffGrid([
      page(
        [
          {
            above: "Annexure-II Cut-off details of female candidates",
            rows: [...head, ["Andhra\nPradesh", "AR", "G", "OBC", "1", "1", "105.93522", "24.25", "15.25", "04-08-2002"]],
          },
        ],
        "",
        6,
      ),
      page(
        [
          {
            above: "",
            rows: [
              ...head,
              ["Pradesh", "", "", "", "", "", "", "", "", ""],
              ["Andhra\nPradesh", "BSF", "G", "OBC", "13", "13", "98.48854", "35.50", "19.00", "15-06-2001"],
            ],
          },
        ],
        "",
        7,
      ),
    ]);
    const r = row({
      cycle: "2025",
      stage: "Final selection",
      region: "Andhra Pradesh",
      post: "BSF (G)",
      gender: "Female",
      category: "OBC",
      categoryLabel: "OBC",
      marks: "98.48854",
      maxMarks: "",
      evidence: "Andhra Pradesh BSF G OBC 13 13 98.48854 35.50 19.00 15-06-2001",
    });
    expect(verifyCutoffRowByGrid(r, grid).ok).toBe(true);
  });

  it("reads a whole number among decimal figures as marks", () => {
    const grid = prepareCutoffGrid([page([{ above: "", rows: [["CAT_NO", "UR", "SC"], ["1", "80", "57.33333"]] }], "RRB MUZAFFARPUR Cut-off marks")]);
    const r = row({
      cycle: "CEN 05/2024",
      stage: "CBT 1",
      post: "NTPC (Graduate) CAT_NO 1",
      region: "RRB Muzaffarpur",
      categoryLabel: "UR",
      marks: "80",
      maxMarks: "",
      evidence: "1 80 57.33333",
    });
    expect(verifyCutoffRowByGrid(r, grid).ok).toBe(true);
  });
});

describe("verifyCutoffRowByGrid — categories down the side", () => {
  const head = [
    ["State", "Force", "Area", "Category", "Vacancy", "Filled", "Cut-off Details", "", "", ""],
    ["", "", "", "", "", "", "Cut-off\nMarks", "Part-A\nMarks", "Part-B\nMarks", "Date of Birth\n(DD-MM-YYYY)"],
  ];
  const GD = prepareCutoffGrid([
    page(
      [
        {
          above: "Annexure-II\nCut-off details of female candidates selected against State/ UT-wise vacancies of CAPFs",
          rows: [...head, ["Andhra\nPradesh", "AR", "G", "OBC", "1", "1", "105.93522", "24.25", "15.25", "04-08-2002"]],
        },
      ],
      "",
      6,
    ),
    page([{ above: "Page 7 of 88", rows: [["Andhra\nPradesh", "BSF", "G", "OBC", "13", "13", "98.48854", "35.50", "19.00", "15-06-2001"]] }], "", 7),
    page(
      [
        {
          above: "Annexure-IV\nCut-off details of male candidates selected against State/ UT-wise vacancies of CAPFs",
          rows: [...head, ["Andaman &\nNicobar", "CISF", "G", "UR", "1", "1", "108.00705", "33.50", "11.50", "19-10-2002"]],
        },
      ],
      "",
      39,
    ),
  ]);
  const gd = (over: Partial<CutoffCandidate>) => row({ cycle: "2025", stage: "Final selection", category: "OBC", categoryLabel: "OBC", maxMarks: "", ...over });

  it("reads the category from its cell, the figure from the first marks column and the gender from the annexure title", () => {
    const v = verifyCutoffRowByGrid(
      gd({ region: "Andhra Pradesh", post: "AR (G)", gender: "Female", marks: "105.93522", evidence: "Andhra Pradesh AR G OBC 1 1 105.93522 24.25 15.25 04-08-2002" }),
      GD,
    );
    expect(v).toEqual({ ok: true, reasons: [], scoreType: "Cut-off Details Cut-off Marks", regionCell: "Andhra\nPradesh" });
  });

  it("carries the header and the title onto a continuation page", () => {
    const base = { region: "Andhra Pradesh", post: "BSF (G)", marks: "98.48854", evidence: "Andhra Pradesh BSF G OBC 13 13 98.48854 35.50 19.00 15-06-2001" };
    expect(verifyCutoffRowByGrid(gd({ ...base, gender: "Female" }), GD).ok).toBe(true);
    expect(verifyCutoffRowByGrid(gd({ ...base, gender: "Male" }), GD).reasons).toContain("the table lists female candidates, not Male");
    expect(verifyCutoffRowByGrid(gd({ ...base, gender: "" }), GD).reasons).toContain("the table lists female candidates; the row must say so");
  });

  it("checks state, force and area against the row's cells", () => {
    const base = { category: "UR", categoryLabel: "UR", gender: "Male", marks: "108.00705", evidence: "Andaman & Nicobar CISF G UR 1 1 108.00705 33.50 11.50 19-10-2002" };
    expect(verifyCutoffRowByGrid(gd({ ...base, region: "Andaman & Nicobar Islands", post: "CISF (G)" }), GD).ok).toBe(true);
    expect(verifyCutoffRowByGrid(gd({ ...base, region: "Andaman & Nicobar Islands", post: "CISF (N)" }), GD).ok).toBe(false);
    expect(verifyCutoffRowByGrid(gd({ ...base, region: "Arunachal Pradesh", post: "CISF (G)" }), GD).ok).toBe(false);
    expect(verifyCutoffRowByGrid(gd({ ...base, region: "", post: "CISF (G)" }), GD).reasons).toContain("the table splits by region; the row does not name its region");
  });

  it("takes only the first marks column and needs the printed post code", () => {
    const CGL = prepareCutoffGrid([
      page([
        {
          above: "List-2: Cut-off details for all other posts",
          rows: [
            ["Post Code", "Category", "Vacancy", "Filled", "Details of last selected candidate", "", ""],
            ["", "", "", "", "Total Marks", "Tier-II\nPaper I\nMarks", "Date of Birth"],
            ["B01", "EWS", "14", "14", "323.00", "156.00", "24-08-2002"],
          ],
        },
      ]),
    ]);
    const cgl = (over: Partial<CutoffCandidate>) =>
      row({ category: "EWS", categoryLabel: "EWS", maxMarks: "", post: "Assistant Audit Officer (B01)", evidence: "B01 EWS 14 14 323.00 156.00 24-08-2002", ...over });
    expect(verifyCutoffRowByGrid(cgl({ marks: "323.00" }), CGL)).toEqual({ ok: true, reasons: [], scoreType: "Details of last selected candidate Total Marks" });
    expect(verifyCutoffRowByGrid(cgl({ marks: "156.00" }), CGL).ok).toBe(false);
    expect(verifyCutoffRowByGrid(cgl({ marks: "14" }), CGL).ok).toBe(false);
    expect(verifyCutoffRowByGrid(cgl({ marks: "323.00", post: "Assistant Audit Officer" }), CGL).ok).toBe(false);
  });

  it("does not lend a header to a following table of a different width", () => {
    const grid = prepareCutoffGrid([
      page([{ above: "", rows: [["Category", "Cut-off Marks"], ["UR", "147.64322"]] }], "", 1),
      page([{ above: "", rows: [["OBC", "140.10000", "12"]] }], "", 2),
    ]);
    expect(verifyCutoffRowByGrid(row({ maxMarks: "", evidence: "UR 147.64322" }), grid).ok).toBe(true);
    expect(verifyCutoffRowByGrid(row({ category: "OBC", categoryLabel: "OBC", marks: "140.10000", maxMarks: "", evidence: "OBC 140.10000 12" }), grid).ok).toBe(false);
  });
});

const stored = (over: Partial<OfficialCutoffRow>): OfficialCutoffRow => ({
  cycle: "2024",
  stage: "CBT 1",
  post: "",
  region: "",
  gender: "",
  category: "UR",
  categoryLabel: "UR",
  marks: "80",
  maxMarks: "",
  scoreType: "normalised marks",
  sourceUrl: "https://rrbcdg.gov.in/cutoff.pdf",
  sourceTitle: "CBT 1 cutoff",
  publisher: "RRB Chandigarh",
  publishedOn: "2025-01-10",
  ...over,
});

describe("groupCutoffTables", () => {
  it("builds one zone × category matrix per cycle and stage, each row with its document", () => {
    const tables = groupCutoffTables([
      stored({ cycle: "CEN 01/2019", region: "RRB Chandigarh", category: "SC", categoryLabel: "SC", marks: "61.2" }),
      stored({ cycle: "CEN 01/2019", region: "RRB Chandigarh", category: "UR", categoryLabel: "UR", marks: "79.1" }),
      stored({ cycle: "CEN 01/2019", region: "RRB Ajmer", category: "UR", categoryLabel: "UR", marks: "77.4", sourceUrl: "https://rrbajmer.gov.in/c.pdf", publisher: "RRB Ajmer" }),
      stored({ cycle: "CEN 05/2024", region: "", category: "OBC", categoryLabel: "OBC", marks: "70", sourceUrl: "https://rrbcdg.gov.in/2024.pdf" }),
    ]);
    expect(tables.map((t) => t.cycle)).toEqual(["CEN 05/2024", "CEN 01/2019"]);
    const old = tables[1];
    expect(old.splitBy).toEqual({ region: true, post: false });
    expect(old.rows.map((r) => r.label)).toEqual(["RRB Ajmer", "RRB Chandigarh"]);
    expect(old.categories).toEqual(["UR", "SC"]);
    expect(old.rows[1].cells).toEqual({ SC: "61.2", UR: "79.1" });
    expect(old.sources.map((s) => s.publisher)).toEqual(["RRB Chandigarh", "RRB Ajmer"]);
    expect(old.sources[old.rows[0].source].publisher).toBe("RRB Ajmer");
  });

  it("turns a post-wise list into rows and keeps a shared post in the title", () => {
    const tables = groupCutoffTables([
      stored({ post: "Tax Assistant (D55)", categoryLabel: "UR", marks: "250.00" }),
      stored({ post: "Assistant Section Officer (B10)", categoryLabel: "UR", marks: "349.00" }),
      stored({ stage: "CBT 2", post: "Assistant Loco Pilot", region: "RRB Kolkata", categoryLabel: "UR", marks: "63.4" }),
      stored({ stage: "CBT 2", post: "Assistant Loco Pilot", region: "RRB Ajmer", categoryLabel: "UR", marks: "54.3" }),
    ]);
    const posts = tables.find((t) => t.stage === "CBT 1");
    expect(posts?.splitBy).toEqual({ region: false, post: true });
    expect(posts?.rows.map((r) => r.label)).toEqual(["Assistant Section Officer (B10)", "Tax Assistant (D55)"]);
    const zones = tables.find((t) => t.stage === "CBT 2");
    expect(zones?.post).toBe("Assistant Loco Pilot");
    expect(zones?.rows.map((r) => r.label)).toEqual(["RRB Ajmer", "RRB Kolkata"]);
  });

  it("reads the latest year out of a cycle string", () => {
    expect(cycleYear("CEN 01/2019")).toBe(2019);
    expect(cycleYear("2024-25")).toBe(2025);
    expect(cycleYear("Advt 12")).toBe(0);
  });
});

describe("cutoffContextLines", () => {
  it("prints every figure with its tier word and the document link", () => {
    const tables = groupCutoffTables([
      stored({ category: "UR", categoryLabel: "UR", marks: "79.1" }),
      stored({ category: "OBC", categoryLabel: "OBC", marks: "72.3", maxMarks: "100" }),
    ]);
    const lines = cutoffContextLines(tables, () => "official");
    expect(lines).toEqual([
      "- 2024 · CBT 1: UR 79.1, OBC 72.3 (normalised marks, out of 100) — official, published by RRB Chandigarh: https://rrbcdg.gov.in/cutoff.pdf",
    ]);
  });

  it("caps the number of lines", () => {
    const rows = Array.from({ length: 40 }, (_, i) => stored({ region: `Zone ${i}`, marks: String(60 + i) }));
    expect(cutoffContextLines(groupCutoffTables(rows), () => "reported", 5)).toHaveLength(5);
  });

  it("takes rows from every table in turn before a long table fills the cap", () => {
    const tables = groupCutoffTables([
      stored({ cycle: "2025", region: "Zone A", marks: "71" }),
      stored({ cycle: "2025", region: "Zone B", marks: "72" }),
      stored({ cycle: "2025", region: "Zone C", marks: "73" }),
      stored({ cycle: "2024", marks: "64" }),
    ]);
    const heads = cutoffContextLines(tables, () => "official", 3).map((l) => l.split(":")[0]);
    expect(heads).toEqual(["- 2025 · CBT 1 · Zone A", "- 2024 · CBT 1", "- 2025 · CBT 1 · Zone B"]);
  });
});

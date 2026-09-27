// Scanned official PDFs: the second-reading match rule (27 Sep 2026).
// Pure — no DB, no network, no model call.
// Run: npx vitest run tests/unit/scanned-cutoff.test.ts

import { describe, it, expect } from "vitest";
import type { CutoffCandidate } from "@/lib/official-cutoffs";
import {
  categoryLabelProblem,
  digitTokens,
  isScannedEvidence,
  isScannedSourceKind,
  matchScannedRow,
  parseScannedReading,
  readCostUsd,
  SCANNED_EVIDENCE_PREFIX,
  SCANNED_READ_MAX_USD,
  SCANNED_READ_PROMPT,
  scannedDisclosure,
  scannedEvidence,
  scannedLabelKey,
  withinCap,
  worstCaseReadUsd,
  type ScannedPageReading,
} from "@/lib/scanned-cutoff";

// ── fixtures shaped like the two NTA scans (values as the pages print them) ──

const NEET_COLUMNS = [
  "Category",
  "Qualifying percentile criteria",
  "NEET(UG) – 2024 > Marks range",
  "NEET(UG) – 2024 > Total Candidates",
  "NEET (UG) – 2025 > Marks range",
  "NEET (UG) – 2025 > Total Candidates",
  "NEET (UG) – 2026 > Marks range",
  "NEET (UG) – 2026 > Total Candidates",
];
const neetPage = (rows: string[][]): ScannedPageReading => ({
  page: 3,
  lines: ["8. The category-wise number of candidates qualified, based on qualifying criteria of NEET (UG)- 2024, 2025 and 2026."],
  tables: [
    {
      title: "7. The Nationality-wise number of candidates registered, appeared, and qualified in 2025 and 2026",
      columns: ["Nationality", "NEET (UG) - 2025 > Registered", "NEET (UG) - 2025 > Appeared"],
      rows: [["Indian", "2273528", "2206968"]],
    },
    { title: "8. The category-wise number of candidates qualified", columns: NEET_COLUMNS, rows },
  ],
});
const NEET_ROWS = [
  ["UR/EWS", "≥50th percentile", "720-162", "1165334", "686-144", "1101151", "715-213", "996935"],
  ["OBC", "≥40th but <50th percentile", "161-127", "100876", "143-113", "88692", "212-177", "81111"],
  ["UR/EWS & PwBD", "≥45th but <50th percentile", "161-144", "473", "143-127", "472", "212-194", "480"],
  ["ST & PwBD", "≥40th but <45th percentile", "142-127", "13", "126-113", "17", "191-177", "11"],
];
const NEET_EVIDENCE_HEAD =
  "Category Qualifying percentile criteria NEET(UG) – 2024 NEET (UG) – 2025 NEET (UG) – 2026\nMarks range Total Candidates Marks range Total Candidates Marks range Total Candidates\n";

const neetRow = (cycle: string, label: string, category: string, marks: string, dataLine: string): CutoffCandidate => ({
  cycle,
  stage: "All-India qualifying cut-off (NEET UG) — lowest marks of the qualifying range",
  post: "",
  region: "",
  gender: "",
  categoryLabel: label,
  category,
  marks,
  maxMarks: "720",
  scoreType: "marks",
  evidence: NEET_EVIDENCE_HEAD + dataLine,
});
const UR_LINE = "UR/EWS ≥50th percentile 720-162 1165334 686-144 1101151 715-213 996935";

const JEE_PAGE: ScannedPageReading = {
  page: 3,
  lines: [
    "The Number of candidates registered and appeared for JEE (Main)-2026 B.E. /B.Tech. (Paper 1) in both Sessions: -",
    "The NTA Scores/ Results of JEE (Main) 2026 Session 2, Paper 1 (B.E./B.Tech.) computed using the Final Answer keys released on 20 April 2026 are being declared today.",
  ],
  tables: [
    {
      title: "The Category-wise Cut-off of NTA Score for candidates to become eligible for JEE (Advanced) - 2026 for Paper 1 (B.E/ B.Tech.) is given below:-",
      columns: ["S.No", "Category", "Percentile > From", "Percentile > To", "Candidates"],
      rows: [
        ["1", "UR-ALL", "100.0000000", "93.4123549", "96,873"],
        ["2", "UR-PwBD", "93.3244144", "0.0023186", "4,391"],
        ["6", "ST-ALL", "93.4041748", "52.0174712", "18,790"],
      ],
    },
  ],
};
const jeeRow = (label: string, category: string, marks: string, dataLine: string, cycle = "2026"): CutoffCandidate => ({
  cycle,
  stage: "Eligibility for JEE (Advanced) 2026 — NTA score cut-off, Paper 1 (B.E./B.Tech.)",
  post: "",
  region: "",
  gender: "",
  categoryLabel: label,
  category,
  marks,
  maxMarks: "",
  scoreType: "NTA score (percentile)",
  evidence: `S.No Category Percentile Candidates\nFrom To\n${dataLine}`,
});

// ── tokens ──────────────────────────────────────────────────────────────

describe("digitTokens", () => {
  it("drops thousands separators (Western and Indian grouping) but keeps every printed digit", () => {
    expect(digitTokens("96,873")).toEqual(["96873"]);
    expect(digitTokens("13,55,293")).toEqual(["1355293"]);
    expect(digitTokens("1,165,334")).toEqual(["1165334"]);
    expect(digitTokens("100.0000000 93.4123549")).toEqual(["100.0000000", "93.4123549"]);
  });
  it("splits ranges and ordinals into their numbers", () => {
    expect(digitTokens("720-162")).toEqual(["720", "162"]);
    expect(digitTokens("715 – 213")).toEqual(["715", "213"]);
    expect(digitTokens("≥40th but <50th percentile")).toEqual(["40", "50"]);
  });
  it("reads Indic digits as ASCII and never joins across an unreadable mark", () => {
    expect(digitTokens("१६२")).toEqual(["162"]);
    expect(digitTokens("1[?]2")).toEqual(["1", "2"]);
  });
  it("joins only a well-formed grouping (last group three digits): 1,62 is never 162", () => {
    expect(digitTokens("1,62")).toEqual(["1", "62"]);
    expect(digitTokens("8,61,343")).toEqual(["861343"]);
    expect(digitTokens("12,345,67")).toEqual(["12", "345", "67"]);
    expect(digitTokens("162,144")).toEqual(["162144"]);
  });
});

describe("scannedLabelKey", () => {
  it("keeps letters and digits only, lower case", () => {
    expect(scannedLabelKey("UR/EWS & PwBD")).toBe("urewspwbd");
    expect(scannedLabelKey("UR / EWS")).toBe("urews");
    expect(scannedLabelKey("UR-ALL")).toBe("urall");
  });
});

// ── parsing ─────────────────────────────────────────────────────────────

describe("parseScannedReading", () => {
  it("accepts the JSON the prompt asks for, with or without a code fence", () => {
    const body = '{"tables":[{"title":"T","columns":["Category","Marks"],"rows":[["UR","162"]]}],"lines":["Page 3 of 4"]}';
    for (const raw of [body, "```json\n" + body + "\n```"]) {
      const r = parseScannedReading(3, raw);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.reading).toEqual({ page: 3, tables: [{ title: "T", columns: ["Category", "Marks"], rows: [["UR", "162"]] }], lines: ["Page 3 of 4"] });
    }
  });
  it("rejects a cell written as a JSON number (100.0000000 would become 100)", () => {
    const r = parseScannedReading(3, '{"tables":[{"title":"","columns":["From"],"rows":[[100.0000000]]}],"lines":[]}');
    expect(r.ok).toBe(false);
  });
  it("rejects truncated or missing JSON", () => {
    expect(parseScannedReading(1, '{"tables":[{"title":"x","columns":["a"],"rows":[["1"').ok).toBe(false);
    expect(parseScannedReading(1, "I cannot read this page.").ok).toBe(false);
    expect(parseScannedReading(1, '{"lines":["only lines"]}').ok).toBe(false);
  });
});

// ── the rule ────────────────────────────────────────────────────────────

describe("matchScannedRow — NEET (UG): three cycles side by side, ranges", () => {
  const page = neetPage(NEET_ROWS);

  it("passes each cycle's lower end from its own year column", () => {
    for (const [cycle, marks, col] of [
      ["2024", "162", "NEET(UG) – 2024 > Marks range"],
      ["2025", "144", "NEET (UG) – 2025 > Marks range"],
      ["2026", "213", "NEET (UG) – 2026 > Marks range"],
    ] as const) {
      const v = matchScannedRow(neetRow(cycle, "UR/EWS", "UR", marks, UR_LINE), [page]);
      expect(v.ok, `${cycle}: ${v.reasons.join("; ")}`).toBe(true);
      expect(v.page).toBe(3);
      expect(v.column).toBe(col);
      expect(v.cells?.[0]).toBe("UR/EWS");
    }
  });

  it("refuses a figure filed under the wrong cycle", () => {
    // 144 is printed in the 2025 column; a row claiming it for 2024 fails.
    const v = matchScannedRow(neetRow("2024", "UR/EWS", "UR", "144", UR_LINE), [page]);
    expect(v.ok).toBe(false);
    expect(v.reasons.join(" ")).toMatch(/not the 2024 column/);
  });

  it("refuses the upper end of a printed range", () => {
    const v = matchScannedRow(neetRow("2024", "UR/EWS", "UR", "720", UR_LINE), [page]);
    expect(v.ok).toBe(false);
    expect(v.reasons.join(" ")).toMatch(/upper end/);
  });

  it("refuses a figure that is a candidates count", () => {
    const v = matchScannedRow(neetRow("2024", "UR/EWS", "UR", "1165334", UR_LINE), [page]);
    expect(v.ok).toBe(false);
  });

  it("does not read the 'UR/EWS & PwBD' row as the 'UR/EWS' row", () => {
    // 127 is in the UR/EWS & PwBD row (2025 range 143-127), never in UR/EWS.
    const v = matchScannedRow(neetRow("2025", "UR/EWS", "UR", "127", "UR/EWS ≥50th percentile 720-162 1165334 686-144 1101151 715-213 996935"), [page]);
    expect(v.ok).toBe(false);
    const pw = matchScannedRow(
      neetRow("2025", "UR/EWS & PwBD", "PWD", "127", "UR/EWS & PwBD ≥45th but <50th percentile 161-144 473 143-127 472 212-194 480"),
      [page],
    );
    expect(pw.ok, pw.reasons.join("; ")).toBe(true);
  });

  it("fails when any figure of the evidence line differs by one digit (candidates count included)", () => {
    const typo = "UR/EWS ≥50th percentile 720-162 1165384 686-144 1101151 715-213 996935";
    const v = matchScannedRow(neetRow("2024", "UR/EWS", "UR", "162", typo), [page]);
    expect(v.ok).toBe(false);
    expect(v.reasons.join(" ")).toMatch(/differs from the evidence line/);
  });

  it("fails when the second reading read the figure differently", () => {
    const misread = neetPage([["ST & PwBD", "≥40th but <45th percentile", "142-127", "13", "126-113", "17", "193-177", "11"]]);
    const v = matchScannedRow(
      neetRow("2026", "ST & PwBD", "PWD", "177", "ST & PwBD ≥40th but <45th percentile 142-127 13 126-113 17 191-177 11"),
      [misread],
    );
    expect(v.ok).toBe(false);
  });

  it("fails when the reading's cells do not line up with its columns", () => {
    const short = neetPage([["UR/EWS", "≥50th percentile", "720-162", "1165334", "686-144", "1101151", "715-213 996935"]]);
    const v = matchScannedRow(neetRow("2024", "UR/EWS", "UR", "162", UR_LINE), [short]);
    expect(v.ok).toBe(false);
  });

  it("fails with no reading, or no row with the label", () => {
    expect(matchScannedRow(neetRow("2024", "UR/EWS", "UR", "162", UR_LINE), []).ok).toBe(false);
    const v = matchScannedRow(neetRow("2024", "GEN", "UR", "162", "GEN ≥50th percentile 720-162 1165334"), [page]);
    expect(v.ok).toBe(false);
    expect(v.reasons.join(" ")).toMatch(/no table row/);
  });
});

describe("matchScannedRow — JEE (Main): From / To percentile pair, 7 decimals", () => {
  it("passes the To column (the lower end) with 7-decimal NTA scores", () => {
    const v = matchScannedRow(jeeRow("UR-ALL", "UR", "93.4123549", "1 UR-ALL 100.0000000 93.4123549 96,873"), [JEE_PAGE]);
    expect(v.ok, v.reasons.join("; ")).toBe(true);
    expect(v.column).toBe("Percentile > To");
    const pw = matchScannedRow(jeeRow("UR-PwBD", "PWD", "0.0023186", "2 UR-PwBD 93.3244144 0.0023186 4,391"), [JEE_PAGE]);
    expect(pw.ok, pw.reasons.join("; ")).toBe(true);
  });

  it("refuses the From figure (the top of the band, not the cut-off)", () => {
    const v = matchScannedRow(jeeRow("ST-ALL", "ST", "93.4041748", "6 ST-ALL 93.4041748 52.0174712 18,790"), [JEE_PAGE]);
    expect(v.ok).toBe(false);
    expect(v.reasons.join(" ")).toMatch(/upper end/);
  });

  it("is digit-for-digit: a dropped trailing digit or a changed decimal fails", () => {
    expect(matchScannedRow(jeeRow("UR-ALL", "UR", "93.412354", "1 UR-ALL 100.0000000 93.412354 96,873"), [JEE_PAGE]).ok).toBe(false);
    expect(matchScannedRow(jeeRow("UR-ALL", "UR", "93.4123548", "1 UR-ALL 100.0000000 93.4123548 96,873"), [JEE_PAGE]).ok).toBe(false);
  });

  it("needs the cycle year on the page when the table has no year columns", () => {
    const v = matchScannedRow(jeeRow("UR-ALL", "UR", "93.4123549", "1 UR-ALL 100.0000000 93.4123549 96,873", "2025"), [JEE_PAGE]);
    expect(v.ok).toBe(false);
    expect(v.reasons.join(" ")).toMatch(/cycle 2025/);
  });

  it("checks the row's own basics first", () => {
    const bad = { ...jeeRow("UR-ALL", "UR", "93.4123549", "1 UR-ALL 100.0000000 93.4123549 96,873"), category: "GENERAL" };
    expect(matchScannedRow(bad, [JEE_PAGE]).reasons).toContain('unknown category "GENERAL"');
    const range = { ...jeeRow("UR-ALL", "UR", "100-93", "1 UR-ALL 100.0000000 93.4123549 96,873") };
    expect(matchScannedRow(range, [JEE_PAGE]).ok).toBe(false);
  });
});

// ── review hardening (27 Sep 2026): each of these passed before ──────────

const simplePage = (title: string, columns: string[], rows: string[][], lines: string[] = []): ScannedPageReading => ({
  page: 1,
  lines,
  tables: [{ title, columns, rows }],
});
const plainRow = (cycle: string, label: string, category: string, marks: string, dataLine: string): CutoffCandidate => ({
  cycle,
  stage: "Qualifying cut-off",
  post: "",
  region: "",
  gender: "",
  categoryLabel: label,
  category,
  marks,
  maxMarks: "",
  scoreType: "marks",
  evidence: dataLine,
});

describe("matchScannedRow — review hardening", () => {
  it("never agrees with a row the reader marked unreadable ('16[?]' is not 16, '[?]62' is not 62)", () => {
    for (const [cell, marks] of [
      ["16[?]", "16"],
      ["[?]62", "62"],
    ] as const) {
      const v = matchScannedRow(plainRow("2024", "UR", "UR", marks, `UR ${marks}`), [simplePage("Cut-off 2024", ["Category", "Marks"], [["UR", cell]])]);
      expect(v.ok, cell).toBe(false);
      expect(v.reasons.join(" ")).toMatch(/unreadable/);
    }
    // an unreadable mark anywhere in the row (here the candidates count) also blocks it
    const page = neetPage([["UR/EWS", "≥50th percentile", "720-162", "11653[?]4", "686-144", "1101151", "715-213", "996935"]]);
    expect(matchScannedRow(neetRow("2024", "UR/EWS", "UR", "162", UR_LINE), [page]).ok).toBe(false);
  });

  it("does not join '1,62' into 162", () => {
    const page = simplePage("Cut-off 2024", ["Category", "Marks"], [["UR", "1,62"]]);
    expect(matchScannedRow(plainRow("2024", "UR", "UR", "162", "UR 162"), [page]).ok).toBe(false);
    expect(matchScannedRow(plainRow("2024", "UR", "UR", "162", "UR 162"), [simplePage("Cut-off 2024", ["Category", "Marks"], [["UR", "162"]])]).ok).toBe(true);
  });

  it("refuses a research row whose category contradicts its label (UR vs UR-PwBD)", () => {
    const asUr = matchScannedRow(jeeRow("UR-PwBD", "UR", "0.0023186", "2 UR-PwBD 93.3244144 0.0023186 4,391"), [JEE_PAGE]);
    expect(asUr.ok).toBe(false);
    expect(asUr.reasons.join(" ")).toMatch(/PwBD group, but the category is UR/);
    const asPwd = matchScannedRow(jeeRow("UR-ALL", "PWD", "93.4123549", "1 UR-ALL 100.0000000 93.4123549 96,873"), [JEE_PAGE]);
    expect(asPwd.ok).toBe(false);
    expect(asPwd.reasons.join(" ")).toMatch(/names no PwBD group/);
    expect(matchScannedRow(jeeRow("ST-ALL", "SC", "52.0174712", "6 ST-ALL 93.4041748 52.0174712 18,790"), [JEE_PAGE]).ok).toBe(false);
  });

  it("categoryLabelProblem accepts the labels NTA prints", () => {
    for (const [cat, label] of [
      ["UR", "UR-ALL"],
      ["UR", "UR/EWS"],
      ["PWD", "UR-PwBD"],
      ["PWD", "UR/EWS & PwBD"],
      ["PWD", "ST & PwBD"],
      ["EWS", "EWS-ALL"],
      ["OBC", "OBC-NCL"],
      ["SC", "SC-ALL"],
      ["ST", "ST-ALL"],
      ["UR", "General"],
    ] as const) {
      expect(categoryLabelProblem(cat, label), `${cat} / ${label}`).toBeNull();
    }
    expect(categoryLabelProblem("OBC", "SC-ALL")).not.toBeNull();
  });

  it("refuses a non-PwBD figure read off a row or column that names PwBD", () => {
    const split = simplePage("Cut-off 2024", ["Category", "Group", "Marks"], [["ST", "PwBD", "127"]]);
    const v = matchScannedRow(plainRow("2024", "ST", "ST", "127", "ST 127"), [split]);
    expect(v.ok).toBe(false);
    expect(v.reasons.join(" ")).toMatch(/names a PwBD group/);
    const col = simplePage("Cut-off 2024", ["Category", "Marks > General", "Marks > PwBD"], [["ST", "140", "127"]]);
    expect(matchScannedRow(plainRow("2024", "ST", "ST", "127", "ST 140 127"), [col]).ok).toBe(false);
    expect(matchScannedRow(plainRow("2024", "ST", "ST", "140", "ST 140 127"), [col]).ok).toBe(true);
  });

  it("refuses a figure from a row that prints another year, and accepts the row that prints the cycle", () => {
    const byYear = simplePage("Qualifying marks", ["Year", "Category", "Marks"], [["2024", "UR", "162"], ["2025", "UR", "144"]]);
    const wrong = matchScannedRow(plainRow("2024", "UR", "UR", "144", "UR 144"), [byYear]);
    expect(wrong.ok).toBe(false);
    expect(wrong.reasons.join(" ")).toMatch(/prints 2025, not the cycle 2024/);
    expect(matchScannedRow(plainRow("2025", "UR", "UR", "144", "UR 144"), [byYear]).ok).toBe(true);
  });

  it("refuses when the table's title names another year beside the cycle", () => {
    const two = { ...JEE_PAGE, tables: [{ ...JEE_PAGE.tables[0], title: "Cut-off of NTA Score for 2025 and 2026" }] };
    const v = matchScannedRow(jeeRow("UR-ALL", "UR", "93.4123549", "1 UR-ALL 100.0000000 93.4123549 96,873"), [two]);
    expect(v.ok).toBe(false);
    expect(v.reasons.join(" ")).toMatch(/names 2025 as well as the cycle 2026/);
  });

  it("falls back to the page's years only when the title names none, and needs just the cycle there", () => {
    const cols = ["Category", "Marks"];
    expect(matchScannedRow(plainRow("2024", "UR", "UR", "162", "UR 162"), [simplePage("Qualifying marks", cols, [["UR", "162"]], ["Result 2024"])]).ok).toBe(true);
    const mixed = matchScannedRow(plainRow("2024", "UR", "UR", "162", "UR 162"), [simplePage("Qualifying marks", cols, [["UR", "162"]], ["Result 2024", "Revised 2025"])]);
    expect(mixed.ok).toBe(false);
    expect(mixed.reasons.join(" ")).toMatch(/the page names 2025/);
    expect(matchScannedRow(plainRow("2024", "UR", "UR", "162", "UR 162"), [simplePage("Qualifying marks", cols, [["UR", "162"]])]).ok).toBe(false);
  });

  it("treats Max / Min like From / To: the upper end is refused", () => {
    const page = simplePage("Cut-off 2024", ["Category", "Marks > Max", "Marks > Min"], [["UR", "650", "162"]]);
    const upper = matchScannedRow(plainRow("2024", "UR", "UR", "650", "UR 650 162"), [page]);
    expect(upper.ok).toBe(false);
    expect(upper.reasons.join(" ")).toMatch(/upper end/);
    expect(matchScannedRow(plainRow("2024", "UR", "UR", "162", "UR 650 162"), [page]).ok).toBe(true);
  });
});

// ── markers, prompt, spend, copy ────────────────────────────────────────

describe("scanned-source markers", () => {
  it("recognises a scanned source by its kind", () => {
    expect(isScannedSourceKind("pdf (scanned page images, no text layer)")).toBe(true);
    expect(isScannedSourceKind("pdf")).toBe(false);
    expect(isScannedSourceKind(undefined)).toBe(false);
  });
  it("prefixes the stored evidence so the page can tell", () => {
    const e = scannedEvidence("UR-ALL 93.4123549", 3, ["1", "UR-ALL", "100.0000000", "93.4123549", "96,873"]);
    expect(e.startsWith(SCANNED_EVIDENCE_PREFIX)).toBe(true);
    expect(isScannedEvidence(e)).toBe(true);
    expect(e).toContain("[second reading, page 3] 1 | UR-ALL | 100.0000000 | 93.4123549 | 96,873");
    expect(isScannedEvidence("UR 147.64322")).toBe(false);
  });
  it("never shows the second reader a figure: the prompt carries no digit and no document's headings", () => {
    expect(digitTokens(SCANNED_READ_PROMPT)).toEqual([]);
    for (const w of ["Percentile", "Candidates", "NEET", "JEE", "NTA", "OBC", "PwBD", "UR/EWS", "UR-ALL"]) expect(SCANNED_READ_PROMPT).not.toContain(w);
  });
});

describe("spend", () => {
  it("prices usage at the conservative rate", () => {
    expect(readCostUsd({ input_tokens: 1_000_000, output_tokens: 0 })).toBeCloseTo(3);
    expect(readCostUsd({ input_tokens: 0, output_tokens: 1_000_000 })).toBeCloseTo(15);
  });
  it("lets a call start only when its worst case fits under the cap", () => {
    const worst = worstCaseReadUsd(SCANNED_READ_PROMPT.length);
    expect(worst).toBeGreaterThan(0.1);
    expect(withinCap(0, worst)).toBe(true);
    expect(withinCap(SCANNED_READ_MAX_USD - worst / 2, worst)).toBe(false);
    expect(withinCap(1.5, 0.5, 2)).toBe(true);
  });
});

describe("scannedDisclosure", () => {
  it("names the publisher in the reader's language and falls back to English", () => {
    expect(scannedDisclosure("en", "National Testing Agency").text).toMatch(/^Read from National Testing Agency's scanned PDF/);
    expect(scannedDisclosure("hi", "National Testing Agency").text).toContain("National Testing Agency की स्कैन");
    expect(scannedDisclosure("te", "National Testing Agency").link).toBe("PDF చూడండి");
    expect(scannedDisclosure("fr", "NTA").link).toBe("Check the PDF");
  });
});

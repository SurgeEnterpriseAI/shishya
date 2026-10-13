// Rank bands (13 Oct 2026) — the grounding block, the prompt and the code
// checks in src/lib/ai/rank-bands.ts. Pure, no DB, no model call.
//
// The 12-13 Oct quality audit (20 real exams, blind judge) found real errors in
// Claude's own bands in 6-8 of 20: institutions the exam does not fill (SSC CPO
// with CBI and NIA posts, IITs and DSE through CUET PG, Telangana colleges and
// NIT Andhra Pradesh through AP EAMCET), invented cut-offs, fees and pay
// levels, rank windows written backwards (BITSAT) and 39→40 gaps between bands
// (CA Foundation). The model was given only the exam's name.
// Run: npx vitest run tests/unit/rank-bands.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

import {
  allowedNumbers,
  checkRankBands,
  loadRankBandFacts,
  parseBands,
  pickCutoffs,
  promisesResult,
  publishesNoRank,
  wrongPathwayNames,
  rankBandFactsBlock,
  rankBandsRequest,
  rankBandsUserPrompt,
  scrubOutcomeLine,
  RANK_FACTS_CUTOFF_CAP,
  type RankBand,
  type RankBandCutoff,
  type RankBandInput,
} from "@/lib/ai/rank-bands";

const cut = (o: Partial<RankBandCutoff>): RankBandCutoff => ({
  cycle: "2024",
  stage: "Paper-I",
  post: "",
  region: "",
  gender: "",
  categoryLabel: "UR",
  marks: "120.50",
  maxMarks: "200",
  scoreType: "",
  publisher: "Staff Selection Commission",
  ...o,
});

const CPO: RankBandInput = {
  examCode: "SSC_CPO",
  examName: "SSC CPO (Sub-Inspector in Delhi Police and CAPFs)",
  examShortName: "SSC CPO",
  category: "GOVT_JOBS",
  facts: {
    state: null,
    description: "Recruitment of Sub-Inspectors in Delhi Police and the Central Armed Police Forces.",
    pattern: { totalQuestions: 200, totalMarks: 200, negativeMark: 0.25, durationMin: 120 },
    conductingBody: { name: "Staff Selection Commission (SSC)", url: "https://ssc.gov.in" },
    officialCutoffs: [cut({}), cut({ categoryLabel: "OBC", marks: "113.75" })],
  },
};

const EAMCET: RankBandInput = {
  examCode: "AP_EAMCET",
  examName: "AP EAMCET",
  examShortName: "AP EAMCET",
  category: "STATE_LEVEL",
  facts: { state: "AP", description: null, pattern: null, conductingBody: null, officialCutoffs: [] },
};

const band = (o: Partial<RankBand>): RankBand => ({
  scorePctMin: 0,
  scorePctMax: 100,
  rankMin: null,
  rankMax: null,
  label: "Band",
  outcomes: "- Outcome one\n- Outcome two",
  ...o,
});

describe("rankBandFactsBlock — the stored data the call is grounded on", () => {
  it("names the exam kind, the conducting body, Shishya's description, the paper and the verified cut-offs", () => {
    const b = rankBandFactsBlock(CPO);
    expect(b).toContain("STORED DATA (Shishya's records for this exam — stay inside them):");
    expect(b).toContain("- Exam type: Government recruitment exam");
    expect(b).toContain("- Conducting body: Staff Selection Commission (SSC) (https://ssc.gov.in)");
    expect(b).toContain("- About the exam (Shishya's summary, not checked against the notification): Recruitment of Sub-Inspectors");
    expect(b).toContain("- Paper (Shishya's record): 200 questions · 200 marks · 120 minutes · negative marking 0.25 per wrong answer");
    expect(b).toContain("- Official cut-offs, checked against the published document (as printed):");
    expect(b).toContain("  - 2024 · Paper-I · UR: 120.50 / 200 — Staff Selection Commission");
    expect(b).toContain("  - 2024 · Paper-I · OBC: 113.75 / 200 — Staff Selection Commission");
  });

  it("names a state exam's state, and says so when no cut-off is stored", () => {
    const b = rankBandFactsBlock(EAMCET);
    expect(b).toContain("- Exam type: Entrance exam · state exam: Andhra Pradesh");
    expect(b).toContain("- Official cut-offs: none stored for this exam — so write no cut-off figure anywhere.");
    expect(b).not.toContain("Conducting body");
    expect(b).not.toContain("Paper (Shishya's record)");
  });

  it("works with no facts at all (a failed read, or a caller that passed none): says they were not loaded, never 'none stored'", () => {
    const lines = [
      "STORED DATA (Shishya's records for this exam — stay inside them):",
      "- Exam type: Entrance exam",
      "- Shishya's records: not loaded for this call (no description, conducting body or official cut-offs here) — so write no cut-off figure anywhere.",
    ];
    expect(rankBandFactsBlock({ examCode: "CLAT", category: "LAW", facts: null }).split("\n")).toEqual(lines);
    expect(rankBandFactsBlock({ examCode: "CLAT", category: "LAW" }).split("\n")).toEqual(lines);
  });

  it("prints a cut-off row's gender, so a Male / Female pair of one category never reads as two plain category cut-offs (13 Oct review)", () => {
    const b = rankBandFactsBlock({
      ...CPO,
      facts: {
        ...CPO.facts!,
        officialCutoffs: [
          cut({ stage: "Cut-off for Stage II (PST/PMT)", categoryLabel: "General/Open/Unreserved", gender: "Male", marks: "71.70199", maxMarks: "" }),
          cut({ stage: "Cut-off for Stage II (PST/PMT)", categoryLabel: "General/Open/Unreserved", gender: "Female", marks: "65.15417", maxMarks: "" }),
        ],
      },
    });
    expect(b).toContain("  - 2024 · Cut-off for Stage II (PST/PMT) · Male · General/Open/Unreserved: 71.70199 — Staff Selection Commission");
    expect(b).toContain("  - 2024 · Cut-off for Stage II (PST/PMT) · Female · General/Open/Unreserved: 65.15417 — Staff Selection Commission");
  });

  it("clips a long description", () => {
    const b = rankBandFactsBlock({ ...CPO, facts: { ...CPO.facts!, description: "x".repeat(3000) } });
    const line = b.split("\n").find((l) => l.startsWith("- About the exam"))!;
    expect(line.length).toBeLessThan(1600);
    expect(line.endsWith("…")).toBe(true);
  });
});

describe("the prompt", () => {
  const req = rankBandsRequest(CPO);
  const system = (req.system as Array<{ text: string }>)[0].text;

  it("no longer asks for cut-offs, fees or stipends from memory", () => {
    expect(system).not.toContain("last year's approximate cut-off");
    expect(system).not.toContain("typical fee/stipend");
    expect(system).toContain("NUMBERS: inside outcomes write no cut-off, rank, percentile, marks, fee, salary, pay level, stipend, seat or vacancy count, age, validity period or pass percentage — EXCEPT a figure copied from the STORED DATA block");
  });

  it("lists only outcomes filled from this exam's own result, with the audit's wrong pathways named", () => {
    expect(system).toContain("WHICH OUTCOMES — only institutions, courses, posts or next stages filled from THIS exam's own result");
    for (const s of ["never through a state CET, BITSAT or CUET", "not CUET PG", "go through INI-CET, not NEET PG", "NEET-SS", "NLU Delhi admits through AILET, not CLAT", "Andhra Pradesh's never fills Telangana's colleges"]) {
      expect(system).toContain(s);
    }
    expect(system).toContain("Never map a score to a job posting the certificate alone does not give.");
    expect(system).toContain("If you are not sure that an institution or post is filled through this exam, leave it out.");
  });

  it("keeps rank windows for rank-based exams (13 Oct eval: without this line 8 of 11 entrance exams lost their ranks)", () => {
    expect(system).toContain("For JEE Main, JEE Advanced, NEET, GATE, CLAT, AILET, state CETs and polytechnic tests and every other entrance test whose result gives the candidate an all-India or state RANK, ALWAYS fill them with a conservative estimate");
    expect(system).toContain("Rule 5 is about outcome text only: a rank-based exam's rank window always goes in rankMin/rankMax.");
  });

  it("gives no rank window to exams that publish a score or percentile (BITSAT, CAT, CUET), and never promises a result", () => {
    expect(system).toContain("and BITSAT, CAT and CUET (UG and PG), which publish a score or a percentile — never turn a score or percentile into a rank.");
    expect(system).not.toMatch(/labelled as an estimate/);
    expect(system).toContain('Never promise a result: no "guaranteed", "assured", "sure-shot", "almost certain" or "automatic" seat');
    expect(system).toContain("ISRO is not a PSU and recruits its scientists and engineers through its own ICRB test, not GATE.");
    expect(system).toContain("name an organisation only when the STORED DATA description names it");
  });

  it("asks for shared band edges and rankMin as the better number", () => {
    expect(system).toContain("if one band ends at 40, the next starts at 40 (0-40, 40-55, …), never 0-39 then 40-49");
    expect(system).toContain("rankMin is the BETTER (smaller) number, rankMax the worse (larger) one");
  });

  it("puts the stored data in the user message (the system prompt stays one cached block)", () => {
    expect(req.messages).toHaveLength(1);
    expect(req.messages[0].content).toBe(rankBandsUserPrompt(CPO));
    expect(req.messages[0].content).toContain(rankBandFactsBlock(CPO));
    expect((req.system as Array<{ cache_control?: unknown }>)[0].cache_control).toEqual({ type: "ephemeral" });
    expect(req.max_tokens).toBe(3500);
  });
});

describe("scrubOutcomeLine — numbers the stored data does not hold", () => {
  const allowed = allowedNumbers(CPO);

  it("keeps the stored figures and the exam's own names", () => {
    expect(allowed.has(120.5)).toBe(true);
    expect(allowed.has(113.75)).toBe(true);
    expect(allowed.has(200)).toBe(true);
    expect(scrubOutcomeLine("- Sub-Inspector (Delhi Police) — 2024 Paper-I UR cut-off 120.5/200", allowed)).toBe("- Sub-Inspector (Delhi Police) — 2024 Paper-I UR cut-off 120.5/200");
  });

  it("drops a bracket that holds an unsupported number, keeping the name", () => {
    expect(scrubOutcomeLine("- NIT Andhra Pradesh — CSE (General cut-off ~700 rank, OBC ~1500)", allowed)).toBe("- NIT Andhra Pradesh — CSE");
    expect(scrubOutcomeLine("- Officer Grade B (General) — Direct Recruitment (₹77,208 pay level)", allowed)).toBe("- Officer Grade B (General) — Direct Recruitment");
  });

  it("cuts a ' — ' clause that holds one", () => {
    expect(scrubOutcomeLine("- JNTUK affiliated colleges — non-core branches, approximately ₹80k-1L annual fee", allowed)).toBe("- JNTUK affiliated colleges");
    expect(scrubOutcomeLine("- BITS Goa - Mechanical, score 240-280", allowed)).toBe("- BITS Goa");
  });

  it("drops a bullet whose own text is the unsupported number", () => {
    expect(scrubOutcomeLine("- Phase-I cut-off typically ~40-45% aggregate for General category", allowed)).toBeNull();
    expect(scrubOutcomeLine("- Top 300-400 students nationally (approximate)", allowed)).toBeNull();
    expect(scrubOutcomeLine("- Salary: Pay Level 7 (₹44,900)", allowed)).toBeNull();
  });

  it("lets stage, class and course-length names through", () => {
    expect(scrubOutcomeLine("- Qualify for Tier-2 and CBT 2", allowed)).toBe("- Qualify for Tier-2 and CBT 2");
    expect(scrubOutcomeLine("- Eligible after Class 12 / 10+2 (12th pass)", allowed)).toBe("- Eligible after Class 12 / 10+2 (12th pass)");
    expect(scrubOutcomeLine("- NLSIU Bengaluru — 5-year BA LLB", allowed)).toBe("- NLSIU Bengaluru — 5-year BA LLB");
    expect(scrubOutcomeLine("- TNPSC Group 4 services", allowed)).toBe("- TNPSC Group 4 services");
  });

  it("takes out a promised result: its clause, else the whole bullet (13 Oct review of the new bands)", () => {
    expect(scrubOutcomeLine("- BITS Pilani Pilani campus — Computer Science guaranteed", allowed)).toBe("- BITS Pilani Pilani campus");
    expect(scrubOutcomeLine("- National Law University Delhi — assured seat in integrated program", allowed)).toBe("- National Law University Delhi");
    expect(scrubOutcomeLine("- NLU Jodhpur (seat almost certain)", allowed)).toBe("- NLU Jodhpur");
    expect(scrubOutcomeLine("- Guaranteed admission to BA LLB at NLU Delhi", allowed)).toBeNull();
    expect(scrubOutcomeLine("- Admission almost certain in first counselling round", allowed)).toBeNull();
    expect(scrubOutcomeLine("- Virtually assured admission at top participating NLUs", allowed)).toBeNull();
    expect(scrubOutcomeLine("- Automatic shortlist for all PSU positions", allowed)).toBeNull();
    expect(scrubOutcomeLine("- A sure-shot selection", allowed)).toBeNull();
  });

  it("does not read 'certain branches' or Assured Career Progression as a promise", () => {
    expect(promisesResult("BITS Pilani Goa campus — certain branches")).toBe(false);
    expect(promisesResult("Pay with Modified Assured Career Progression")).toBe(false);
    expect(promisesResult("Likely in range for core branches")).toBe(false);
    expect(scrubOutcomeLine("- BITS Pilani Goa campus — certain branches", allowed)).toBe("- BITS Pilani Goa campus — certain branches");
  });

  it("takes out a name the exam never fills (13 Oct review: AIIMS in NEET PG bands, ISRO in GATE CSE bands)", () => {
    const neetPg = wrongPathwayNames("NEET_PG");
    expect(scrubOutcomeLine("- MD/MS in AIIMS, PGI Chandigarh, JIPMER — super-speciality feeders", allowed, neetPg)).toBeNull();
    expect(scrubOutcomeLine("- MD/MS in government medical colleges — popular branches", allowed, neetPg)).toBe("- MD/MS in government medical colleges — popular branches");
    expect(scrubOutcomeLine("- MD/MS at SGPGI Lucknow — popular branches", allowed, neetPg)).toBe("- MD/MS at SGPGI Lucknow — popular branches");
    const gate = wrongPathwayNames("GATE_CSE");
    expect(scrubOutcomeLine("- PSU recruitment — ONGC, BARC, BEL, ISRO scientist/engineer positions", allowed, gate)).toBe("- PSU recruitment");
    expect(scrubOutcomeLine("- M.Tech at IITs — Computer Science", allowed, gate)).toBe("- M.Tech at IITs — Computer Science");
    const eamcet = wrongPathwayNames("AP_EAMCET");
    expect(scrubOutcomeLine("- NIT Andhra Pradesh — CSE", allowed, eamcet)).toBeNull();
    expect(scrubOutcomeLine("- IIIT RGUKT campuses — CSE", allowed, eamcet)).toBe("- IIIT RGUKT campuses — CSE");
    expect(scrubOutcomeLine("- JNTUK Kakinada — Computer Science", allowed, eamcet)).toBe("- JNTUK Kakinada — Computer Science");
    expect(scrubOutcomeLine("- NLU Delhi — BA LLB", allowed, wrongPathwayNames("CLAT"))).toBeNull();
    expect(scrubOutcomeLine("- NLU Delhi — BA LLB", allowed, wrongPathwayNames("AILET"))).toBe("- NLU Delhi — BA LLB");
    for (const code of ["JEE_MAIN", "JEE_ADVANCED", "NEET_UG", "AILET", "IIT_JAM", "SSC_CGL", "CAT"]) expect(wrongPathwayNames(code)).toBeNull();
    for (const code of ["BITSAT", "CUET_UG", "TS_EAMCET", "KA_KCET", "WB_WBJEE", "MH_MHTCET", "GATE_DA"]) expect(wrongPathwayNames(code)).not.toBeNull();
  });

  it("normalises the bullet and leaves number-free lines alone", () => {
    expect(scrubOutcomeLine("* Indian Military Academy (IMA), Dehradun", allowed)).toBe("- Indian Military Academy (IMA), Dehradun");
    expect(scrubOutcomeLine("   ", allowed)).toBeNull();
  });
});

describe("checkRankBands — repairs and refusals", () => {
  const none = new Set<number>();

  it("swaps a rank window written backwards (BITSAT, 13 Oct audit)", () => {
    const { bands, issues } = checkRankBands(
      parseBands([
        band({ scorePctMin: 60, scorePctMax: 100, rankMin: 12000, rankMax: 1 }),
        band({ scorePctMin: 0, scorePctMax: 60, rankMin: 50000, rankMax: 12000 }),
      ]),
      none,
    );
    expect(bands.map((b) => [b.rankMin, b.rankMax])).toEqual([
      [1, 12000],
      [12000, 50000],
    ]);
    expect(issues[0]).toMatch(/swapped 2 backwards rank window/);
  });

  it("closes 39→40 gaps and snaps the ends to 0 and 100 (CA Foundation)", () => {
    const { bands, issues } = checkRankBands(
      parseBands([
        band({ scorePctMin: 1, scorePctMax: 39 }),
        band({ scorePctMin: 40, scorePctMax: 49 }),
        band({ scorePctMin: 50, scorePctMax: 99.5 }),
      ]),
      none,
    );
    expect(bands.map((b) => [b.scorePctMin, b.scorePctMax])).toEqual([
      [49, 100],
      [39, 49],
      [0, 39],
    ]);
    expect(issues.join(" ")).toMatch(/closed 4 boundary gap/);
  });

  it("leaves a wider gap as it is (the card falls back to the nearest band)", () => {
    const { bands } = checkRankBands(parseBands([band({ scorePctMin: 0, scorePctMax: 30 }), band({ scorePctMin: 40, scorePctMax: 100 })]), none);
    expect(bands.map((b) => b.scorePctMin)).toEqual([40, 0]);
  });

  it("refuses a ladder whose ranks get better as the score falls", () => {
    const { bands, issues } = checkRankBands(
      parseBands([
        band({ scorePctMin: 50, scorePctMax: 100, rankMin: 5000, rankMax: 9000 }),
        band({ scorePctMin: 0, scorePctMax: 50, rankMin: 100, rankMax: 900 }),
      ]),
      none,
    );
    expect(bands).toEqual([]);
    expect(issues.at(-1)).toMatch(/^refused: ranks get better as the score falls/);
  });

  it("strips unsupported outcome numbers, and refuses a band left with no outcome", () => {
    const ok = checkRankBands(parseBands([band({ outcomes: "- IIM Indore — PGP (95+ percentile)\n- IIM Kozhikode" })]), none);
    expect(ok.bands[0].outcomes).toBe("- IIM Indore — PGP\n- IIM Kozhikode");
    expect(ok.issues.join(" ")).toMatch(/removed unsupported numbers, promised results or wrong-pathway names from 1 outcome line/);
    const bad = checkRankBands(parseBands([band({ label: "Top", outcomes: "- Top 50 nationally\n- Rank under 100" })]), none);
    expect(bad.bands).toEqual([]);
    expect(bad.issues.at(-1)).toMatch(/^refused: every outcome of "Top" rested on numbers with no stored source/);
  });

  it("passes a clean ladder through unchanged, highest band first", () => {
    const clean = parseBands([
      band({ scorePctMin: 0, scorePctMax: 40, rankMin: 20000, rankMax: null, outcomes: "- Unlikely to qualify this cycle" }),
      band({ scorePctMin: 40, scorePctMax: 100, rankMin: 1, rankMax: 20000, outcomes: "- National Law School of India University — BA LLB" }),
    ]);
    const { bands, issues } = checkRankBands(clean, none);
    expect(issues).toEqual([]);
    expect(bands).toEqual(clean);
  });

  it("returns nothing for nothing", () => {
    expect(checkRankBands([], none)).toEqual({ bands: [], issues: ["no bands"] });
  });

  it("clears every rank window of an exam that publishes no rank (BITSAT, CAT, CUET)", () => {
    expect(["BITSAT", "CAT", "CUET_UG", "CUET_PG", "cuet_ug"].map(publishesNoRank)).toEqual([true, true, true, true, true]);
    expect(["JEE_MAIN", "NEET_UG", "GATE_CSE", "CLAT", "AILET", "AP_EAMCET", "SSC_CGL"].some(publishesNoRank)).toBe(false);
    const ladder = parseBands([
      band({ scorePctMin: 50, scorePctMax: 100, rankMin: 1, rankMax: 5000, outcomes: "- BITS Pilani — core branches" }),
      band({ scorePctMin: 0, scorePctMax: 50, rankMin: 5000, rankMax: null, outcomes: "- Unlikely this cycle" }),
    ]);
    const { bands, issues } = checkRankBands(ladder, none, { noRank: true });
    expect(bands.map((b) => [b.rankMin, b.rankMax])).toEqual([
      [null, null],
      [null, null],
    ]);
    expect(issues[0]).toBe("cleared 2 rank window(s): this exam publishes a score or percentile, not a rank");
    expect(checkRankBands(ladder, none).bands[0].rankMax).toBe(5000);
  });

  it("applies the wrong-pathway names to every band, and refuses a band left with none", () => {
    const opts = { wrongNames: wrongPathwayNames("NEET_PG") };
    const ok = checkRankBands(parseBands([band({ outcomes: "- MD/MS in AIIMS, PGI Chandigarh, JIPMER\n- All India Quota seats in government colleges" })]), none, opts);
    expect(ok.bands[0].outcomes).toBe("- All India Quota seats in government colleges");
    const bad = checkRankBands(parseBands([band({ label: "Top", outcomes: "- AIIMS Delhi — MD Medicine\n- JIPMER — MS Surgery" })]), none, opts);
    expect(bad.bands).toEqual([]);
    expect(bad.issues.at(-1)).toMatch(/^refused: every outcome of "Top" rested on numbers with no stored source, a promised result or a wrong pathway/);
  });

  it("drops a promised result from a label: its clause, else the score range", () => {
    const { bands, issues } = checkRankBands(
      parseBands([
        band({ scorePctMin: 95, scorePctMax: 100, label: "Top 50 — Premium NLUs assured" }),
        band({ scorePctMin: 80, scorePctMax: 95, label: "Guaranteed seat" }),
        band({ scorePctMin: 0, scorePctMax: 80, label: "Keep going" }),
      ]),
      none,
    );
    expect(bands.map((b) => b.label)).toEqual(["Top 50", "Score band 80–95%", "Keep going"]);
    expect(issues).toContain("removed a promised result from 2 label(s)");
  });
});

describe("parseBands — the old shape filter (an array of outcomes is still dropped)", () => {
  it("keeps string outcomes only and sorts highest first", () => {
    const b = parseBands([
      { scorePctMin: 0, scorePctMax: 50, label: "Low", outcomes: "- a" },
      { scorePctMin: 50, scorePctMax: 100, label: "High", outcomes: ["- b"] },
      { scorePctMin: 50, scorePctMax: 120, label: "High", outcomes: "- c", rankMin: 0.4 },
    ]);
    expect(b.map((x) => [x.label, x.scorePctMax, x.rankMin])).toEqual([
      ["High", 100, 1],
      ["Low", 50, null],
    ]);
  });
});

describe("pickCutoffs / loadRankBandFacts", () => {
  it("takes the newest cycles first, whatever the stored order, up to the cap", () => {
    const rows = [
      ...Array.from({ length: 20 }, (_, i) => ({ ...cut({ cycle: "2022", categoryLabel: `C${i}` }), publishedOn: null })),
      ...Array.from({ length: 20 }, (_, i) => ({ ...cut({ cycle: "CEN 01/2024", categoryLabel: `D${i}` }), publishedOn: null })),
      { ...cut({ cycle: "Final", categoryLabel: "E" }), publishedOn: new Date("2025-03-01") },
    ];
    const out = pickCutoffs(rows);
    expect(out).toHaveLength(RANK_FACTS_CUTOFF_CAP);
    expect(out[0].cycle).toBe("Final");
    expect(out.slice(1).every((r) => r.cycle === "CEN 01/2024" || r.cycle === "2022")).toBe(true);
    expect(out.filter((r) => r.cycle === "CEN 01/2024")).toHaveLength(20);
    expect((out[0] as any).publishedOn).toBeUndefined();
  });

  it("reads the exam, its conducting body and its live official cut-offs — reads only", async () => {
    const calls: any[] = [];
    const db = {
      exam: {
        findUnique: async (args: any) => {
          calls.push(["exam.findUnique", args]);
          return { state: "AP", description: "AP EAPCET", totalQuestions: 160, totalMarks: 160, negativeMark: 0, durationMin: 180, eligibility: { officialName: "APSCHE", officialUrl: "https://cets.apsche.ap.gov.in" } };
        },
      },
      officialCutoff: {
        findMany: async (args: any) => {
          calls.push(["officialCutoff.findMany", args]);
          return [{ ...cut({}), publishedOn: null }];
        },
      },
    };
    const f = await loadRankBandFacts(db, "exam-1");
    expect(f).toEqual({
      state: "AP",
      description: "AP EAPCET",
      pattern: { totalQuestions: 160, totalMarks: 160, negativeMark: 0, durationMin: 180 },
      conductingBody: { name: "APSCHE", url: "https://cets.apsche.ap.gov.in" },
      officialCutoffs: [cut({})],
    });
    expect(calls.map((c) => c[0])).toEqual(["exam.findUnique", "officialCutoff.findMany"]);
    // A real exam only (realExamKey): a school container reads as no row, so facts = null.
    expect(calls[0][1].where).toEqual({ id: "exam-1", category: { not: "SCHOOL_BOARD" } });
    expect(calls[1][1].where).toEqual({ examId: "exam-1", archivedAt: null });
    expect(calls[1][1].select.gender).toBe(true);
  });

  it("is null for a missing exam row, and has no pattern for an empty one", async () => {
    const db = (exam: any) => ({ exam: { findUnique: async () => exam }, officialCutoff: { findMany: async () => [] } });
    expect(await loadRankBandFacts(db(null), "x")).toBeNull();
    const f = await loadRankBandFacts(db({ state: null, description: null, totalQuestions: 0, totalMarks: 0, negativeMark: 0, durationMin: 0, eligibility: null }), "x");
    expect(f).toEqual({ state: null, description: null, pattern: null, conductingBody: null, officialCutoffs: [] });
  });
});

describe("the cron and the seed script ground every call", () => {
  it("the cron loads the facts for the exam and passes them to generateRankBands", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src/app/api/cron/refresh-rank-bands/route.ts"), "utf8");
    expect(src).toContain('import { generateRankBands, loadRankBandFacts } from "@/lib/ai/rank-bands";');
    expect(src).toMatch(/const facts = await loadRankBandFacts\(prisma, exam\.id\)\.catch\(/);
    expect(src).toMatch(/category: String\(exam\.category\),\s*facts,/);
  });

  it("the seed script does too (13 Oct review), and skips an exam with no real row before any AI call", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "scripts/seed-rank-bands.ts"), "utf8");
    expect(src).toContain('import { generateRankBands, loadRankBandFacts } from "../src/lib/ai/rank-bands";');
    expect(src).toMatch(/const facts = await loadRankBandFacts\(p, exam\.id\);\s*if \(!facts\) \{/);
    expect(src).toMatch(/category: String\(exam\.category\),\s*facts,/);
    expect(src.indexOf("loadRankBandFacts(p, exam.id)")).toBeLessThan(src.indexOf("await generateRankBands("));
  });
});

describe("RankCard shows a rank window as an estimate (13 Oct 2026)", () => {
  // Source scan: the component is TSX, which this vitest setup does not parse.
  const src = fs.readFileSync(path.join(process.cwd(), "src/components/RankCard.tsx"), "utf8");

  it("says Est. on every window and only 'No rank estimate' without one", () => {
    expect(src).toContain('if (b.rankMin == null && b.rankMax == null) return "No rank estimate";');
    expect(src).toContain("return `Est. rank ${b.rankMin.toLocaleString(\"en-IN\")} – ${b.rankMax.toLocaleString(\"en-IN\")}`;");
    expect(src).toContain("if (b.rankMin != null) return `Est. rank ${b.rankMin.toLocaleString(\"en-IN\")}+`;");
    expect(src).toContain("if (b.rankMax != null) return `Est. rank up to ${b.rankMax.toLocaleString(\"en-IN\")}`;");
    expect(src).not.toContain(`return "Post-based exam`);
    expect(src).not.toContain("based on historic cut-off patterns");
  });
});

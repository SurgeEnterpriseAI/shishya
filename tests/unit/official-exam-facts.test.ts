// Official facts of the national / PG exams (27 Sep 2026,
// src/lib/official-exam-facts.ts) — the no-practice hub panel's pattern,
// syllabus and eligibility sources. Checked against the script that wrote the
// rows (scripts/national-exams-plan.ts expandSpecs over the same JSON), so the
// hub and the DB can never describe two different schemes. No DB, no network.
// Run: npx vitest run tests/unit/official-exam-facts.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { examColumns, expandSpecs, type NationalExamsFile } from "../../scripts/national-exams-plan";
import { isOfficialSource } from "@/lib/official-source";
import { officialExamFacts, officialFactCodes, officialPattern, officialPatternSentence } from "@/lib/official-exam-facts";

const file = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/national-exams-2026.json"), "utf8")) as NationalExamsFile;
const specs = expandSpecs(file);

describe("official-exam-facts mirrors data/national-exams-2026.json as the add script expands it", () => {
  it("one entry per exam, GATE papers expanded", () => {
    expect(officialFactCodes().sort()).toEqual(specs.map((s) => s.code).sort());
    expect(officialExamFacts("SSC_CGL")).toBeNull();
  });

  for (const s of specs) {
    it(`${s.code}: the pattern numbers, the syllabus and the official site are the script's`, () => {
      const f = officialExamFacts(s.code)!;
      expect(f.pattern.numbers).toEqual({
        totalQuestions: s.exam.totalQuestions,
        scoredQuestions: s.exam.scoredQuestions ?? null,
        totalMarks: s.exam.totalMarks,
        durationMin: s.exam.durationMin,
        marksPerQ: s.exam.marksPerQ,
        negativeMark: s.exam.negativeMark,
      });
      expect(f.pattern.url).toBe(s.pattern.url);
      expect(s.pattern.stage.startsWith(f.pattern.stage)).toBe(true);
      expect(f.syllabusUrl).toBe(s.syllabus.url);
      expect(f.officialUrl).toBe(s.eligibility.officialUrl);
      expect(f.officialName).toBe(s.eligibility.officialName);
      expect(f.eligibilitySourceUrl).toBe(s.eligibility.sources[0].url);
      // Every source the panel links is on the conducting body's own host.
      expect(isOfficialSource(f.pattern.url, f.officialUrl), f.pattern.url).toBe(true);
      expect(isOfficialSource(f.eligibilitySourceUrl!, f.officialUrl), f.eligibilitySourceUrl!).toBe(true);
      expect(f.readOn).toBe("2026-09-27");
      // The rows the script writes agree, so the hub prints the pattern.
      expect(officialPattern(s.code, examColumns(s))).not.toBeNull();
    });
  }
});

describe("officialPattern — numbers only while the stored row agrees", () => {
  const cpo = specs.find((s) => s.code === "SSC_CPO")!;
  it("any stored number off → no pattern", () => {
    const cols = examColumns(cpo);
    expect(officialPattern("SSC_CPO", cols)?.stage).toBe("Paper-I");
    for (const k of ["totalQuestions", "totalMarks", "durationMin", "marksPerQ", "negativeMark"] as const) {
      expect(officialPattern("SSC_CPO", { ...cols, [k]: cols[k] + 1 }), k).toBeNull();
    }
    expect(officialPattern("SSC_CPO", null)).toBeNull();
    expect(officialPattern("NEET_PG", { totalQuestions: 200, totalMarks: 800, durationMin: 210, marksPerQ: 4, negativeMark: 1 })).toBeNull();
  });

  it("the sentence: a uniform paper states its deduction; a mixed-marks paper does not", () => {
    expect(officialPatternSentence(officialExamFacts("SSC_CPO")!.pattern)).toBe("Paper-I: 100 questions, 100 marks, 60 minutes, −0.25 per wrong answer.");
    expect(officialPatternSentence(officialExamFacts("UGC_NET")!.pattern)).toBe(
      "Paper 1 + Paper 2 in one sitting: 150 questions, 300 marks, 180 minutes, no negative marking.",
    );
    // GATE and JAM mix 1- and 2-mark questions: no "−1/3 per wrong answer".
    const gate = officialPatternSentence(officialExamFacts("GATE_ME")!.pattern);
    expect(gate).toBe("ME paper: 65 questions, 100 marks, 180 minutes; marks and negative marking differ by question type.");
    expect(officialPatternSentence(officialExamFacts("IIT_JAM")!.pattern)).toMatch(/differ by question type\.$/);
    // CSIR NET (never activated): 145 printed, 75 scored — the stage says which paper.
    expect(officialPatternSentence(officialExamFacts("CSIR_NET")!.pattern)).toMatch(/^Life Sciences \(703\) paper: 145 questions \(75 of them scored\)/);
    for (const c of officialFactCodes()) expect(officialPatternSentence(officialExamFacts(c)!.pattern)).not.toMatch(/mock|PYQ|practice/i);
  });
});

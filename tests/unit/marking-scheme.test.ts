// Pure unit tests for src/lib/marking-scheme.ts — the honesty gate in
// front of the score estimator. No DB. No network.
// Run with: npx vitest run tests/unit/marking-scheme.test.ts
//
// Guards the 11 Sep 2026 exam-night failure: SBI PO's Exam row is the
// PRELIMS paper (100 Q, 100 marks, +1/−0.25) but the 12 Sep sitting is
// MAINS (200 marks, unequal section weights). The stored scheme is
// self-consistent, so the numeric rules passed it and the estimator printed
// Prelims arithmetic for a Mains paper.

import { describe, it, expect } from "vitest";
import {
  declaredStages,
  fullPaperFitsSitting,
  sittingExamName,
  sittingStageLabel,
  markingSchemeStatable,
  markingSchemeVerdict,
  scoredCount,
  stageMismatchReason,
  UNEQUAL_PAPER_EXAMS,
} from "@/lib/marking-scheme";

// Exam rows as read from prod, 11 Sep 2026 19:20 IST.
const SBI_PO = {
  code: "SBI_PO",
  name: "SBI Probationary Officer (Prelims)",
  shortName: "SBI PO",
  totalQuestions: 100,
  scoredQuestions: null,
  totalMarks: 100,
  marksPerQ: 1,
  description: "Online preliminary exam: English, Quantitative Aptitude, Reasoning.",
};
const CDS = {
  code: "CDS",
  name: "Combined Defence Services",
  shortName: "CDS",
  totalQuestions: 300,
  scoredQuestions: null,
  totalMarks: 300,
  marksPerQ: 1,
  description: "English, General Knowledge and Elementary Mathematics.",
};
// NDA: 270 Q / 900 marks. Whatever marksPerQ the row stores, the exam must
// refuse for its OWN numeric reason — never via the per-exam list.
const NDA_AVERAGED = {
  code: "NDA",
  name: "National Defence Academy",
  shortName: "NDA",
  totalQuestions: 270,
  scoredQuestions: null,
  totalMarks: 900,
  marksPerQ: 3.33,
  description: "Mathematics (300 marks, 120 questions) and General Ability Test (600 marks, 150 questions).",
};
const NDA_SINGLE = { ...NDA_AVERAGED, marksPerQ: 2.5, description: "Mathematics and General Ability Test." };
// A normal single-stage paper: SSC CGL Tier 1 — 100 Q, 200 marks, +2/−0.5.
const SSC_CGL = {
  code: "SSC_CGL",
  name: "SSC CGL Tier 1",
  shortName: "SSC CGL",
  totalQuestions: 100,
  scoredQuestions: null,
  totalMarks: 200,
  marksPerQ: 2,
  description: "Computer-based Tier 1: 100 questions, 200 marks, 60 minutes.",
};
const mains = { rowLabel: "Mains Exam", rowDate: "2026-09-12T00:00:00.000Z" };

describe("rule 4 — stage mismatch between the stored pattern and the sitting", () => {
  it("SBI PO: Prelims entity + 'Mains Exam' row → refuses, names both stages and the date", () => {
    const v = markingSchemeVerdict(SBI_PO, mains);
    expect(v.ok).toBe(false);
    expect(v.reason).toContain("Prelims paper (100 questions, 100 marks)");
    expect(v.reason).toContain("12 Sept sitting is Mains");
    // The verified Mains figures (SBI handout CRPD/PO/2026-27/09).
    expect(v.reason).toContain("200 marks across 4 sections with unequal per-question marks");
    expect(v.reason).toContain("one per-question mark cannot be stated");
    expect(markingSchemeStatable(SBI_PO, mains)).toBe(false);
  });

  it("SBI PO: the same entity on its own Prelims row (or no row) is statable", () => {
    expect(markingSchemeStatable(SBI_PO)).toBe(true);
    expect(markingSchemeStatable(SBI_PO, { rowLabel: "Prelims Exam" })).toBe(true);
    expect(markingSchemeStatable(SBI_PO, { rowLabel: "Exam day (shift 1)" })).toBe(true);
  });

  it("an exam whose name declares no stage never trips the stage rule", () => {
    expect(stageMismatchReason({ name: "IBPS Clerk", shortName: "IBPS Clerk" }, "Mains Exam")).toBeNull();
    expect(markingSchemeStatable({ ...SSC_CGL, name: "SSC CGL", shortName: "SSC CGL" }, { rowLabel: "Tier 2" })).toBe(true);
  });

  it("Tier / Paper / Phase spellings map to one stage each; Tier I never matches Tier II", () => {
    expect([...declaredStages("SSC CGL Tier-I")]).toEqual(["tier1"]);
    expect([...declaredStages("Tier II exam")]).toEqual(["tier2"]);
    expect([...declaredStages("Paper-II (Mains)")].sort()).toEqual(["mains", "paper2"]);
    expect([...declaredStages("RBI Grade B Phase 1")]).toEqual(["phase1"]);
    expect(declaredStages("Exam day, shift 2").size).toBe(0);
    expect(markingSchemeStatable(SSC_CGL, { rowLabel: "Tier 1 exam" })).toBe(true);
    expect(markingSchemeStatable(SSC_CGL, { rowLabel: "Tier-II exam" })).toBe(false);
    expect(markingSchemeStatable(SSC_CGL, { rowLabel: "Tier II" })).toBe(false);
  });

  it("words the sitting generically when no date is known", () => {
    const r = stageMismatchReason({ name: "SSC CGL Tier 1", totalQuestions: 100, totalMarks: 200 }, "Tier 2");
    expect(r).toContain("the sitting in question is Tier 2, which is scored differently");
  });
});

describe("rule 5 — exams whose papers score unequally (stop-gap list)", () => {
  it("CDS refuses with the per-paper reason although its row is self-consistent", () => {
    // The numeric rules alone would pass 300 Q × 1 = 300 marks.
    const v = markingSchemeVerdict(CDS);
    expect(v.ok).toBe(false);
    expect(v.reason).toBe(UNEQUAL_PAPER_EXAMS.CDS);
    expect(v.reason).toContain("English and GK: 120 questions for 100 marks each; Maths: 100 for 100");
    expect(markingSchemeStatable(CDS)).toBe(false);
    expect(markingSchemeStatable(CDS, { rowLabel: "CDS II exam" })).toBe(false);
  });

  it("the list is keyed by exam code, case-insensitively, and does not catch other exams", () => {
    expect(markingSchemeStatable({ ...CDS, code: "cds" })).toBe(false);
    expect(markingSchemeStatable({ ...CDS, code: "AFCAT" })).toBe(true);
  });
});

describe("numeric rules 1–3 (unchanged behaviour)", () => {
  it("NDA still refuses for its own reason, whichever marksPerQ the row stores", () => {
    // 3.33 is a third, and 3.33 × 270 ≈ 900 → rules 1–2 pass; the
    // description's two part totals (300, 600) catch it.
    const a = markingSchemeVerdict(NDA_AVERAGED);
    expect(a.ok).toBe(false);
    expect(a.reason).toContain("300 marks, 600 marks");
    // 2.5 × 270 = 675 ≠ 900 → rule 2.
    const b = markingSchemeVerdict(NDA_SINGLE);
    expect(b.ok).toBe(false);
    expect(b.reason).toContain("does not add up to the paper's 900 marks");
    expect(UNEQUAL_PAPER_EXAMS.NDA).toBeUndefined();
  });

  it("a normal single-stage paper is statable", () => {
    expect(markingSchemeVerdict(SSC_CGL)).toEqual({ ok: true, reason: null });
    expect(markingSchemeStatable(SSC_CGL, { rowLabel: "Tier 1", rowDate: "2026-09-25T00:00:00.000Z" })).toBe(true);
  });

  it("papers that ask more than they score state over the scored count (NEET UG)", () => {
    const neet = { totalQuestions: 200, scoredQuestions: 180, totalMarks: 720, marksPerQ: 4, description: "" };
    expect(scoredCount(neet)).toBe(180);
    expect(markingSchemeStatable(neet)).toBe(true);
  });

  it("a fifths-valued average (NSEP 3.6) refuses under rule 1", () => {
    const v = markingSchemeVerdict({ totalQuestions: 60, scoredQuestions: null, totalMarks: 216, marksPerQ: 3.6, description: "" });
    expect(v.ok).toBe(false);
    expect(v.reason).toContain("average across papers");
  });

  it("missing numbers refuse rather than divide by nothing", () => {
    expect(markingSchemeStatable({ totalQuestions: 0, scoredQuestions: null, totalMarks: 0, marksPerQ: 0, description: "" })).toBe(false);
  });
});

describe("fullPaperFitsSitting / sittingStageLabel — the stage check behind every real-pattern paper link (16 Sep 2026)", () => {
  it("SBI PO (Prelims record) + a 'Mains exam (Phase II)' row: the paper does not fit, and the sitting is named", () => {
    const row = { label: "Mains exam (Phase II)", date: "2026-09-12T00:00:00.000Z" };
    expect(fullPaperFitsSitting(SBI_PO, row)).toBe(false);
    expect(sittingStageLabel(SBI_PO, row.label)).toBe("Mains / Phase 2");
    expect(sittingStageLabel(SBI_PO, "Mains Exam")).toBe("Mains");
  });

  it("UPSC Prelims record + 'Mains exam begins' row does not fit; a Prelims row fits", () => {
    const upsc = { code: "UPSC_PRELIMS", name: "UPSC Civil Services Examination — Prelims", shortName: "UPSC Prelims" };
    expect(fullPaperFitsSitting(upsc, { label: "Mains exam begins" })).toBe(false);
    expect(sittingStageLabel(upsc, "Mains exam begins")).toBe("Mains");
    expect(fullPaperFitsSitting(upsc, { label: "Prelims exam" })).toBe(true);
    expect(sittingStageLabel(upsc, "Prelims exam")).toBeNull();
  });

  it("fits whenever either side is silent: no row, a stage-less row, a stage-less exam name", () => {
    expect(fullPaperFitsSitting(SBI_PO, null)).toBe(true);
    expect(fullPaperFitsSitting(SBI_PO, undefined)).toBe(true);
    expect(fullPaperFitsSitting(SBI_PO, { label: "Online exam — shift 1" })).toBe(true);
    expect(fullPaperFitsSitting({ code: "MP_RAEO", name: "MP Krishi Vistar Adhikari", shortName: "MP RAEO" }, { label: "Mains" })).toBe(true);
    expect(sittingStageLabel({ name: "IBPS Clerk" }, "Mains Exam")).toBeNull();
  });

  it("sittingExamName re-stages the full name only for a sitting of another stage", () => {
    const ibps = { code: "IBPS_PO", name: "IBPS Probationary Officer (Prelims)", shortName: "IBPS PO" };
    expect(sittingExamName(ibps, "Mains exam")).toBe("IBPS Probationary Officer (Mains)");
    expect(sittingExamName(ibps, "Prelims exam (Day 1)")).toBe("IBPS Probationary Officer (Prelims)");
    expect(sittingExamName(ibps, "Online exam")).toBe("IBPS Probationary Officer (Prelims)");
    expect(sittingExamName({ name: "IBPS Clerk" }, "Mains exam")).toBe("IBPS Clerk");
    expect(sittingExamName({ name: "MPSC Rajyaseva (State Service) Prelims" }, "Mains exam - Day 2")).toBe(
      "MPSC Rajyaseva (State Service) Mains",
    );
  });

  it("agrees with the estimator's stage rule", () => {
    const row = { label: "Mains Exam", date: "2026-09-12T00:00:00.000Z" };
    expect(fullPaperFitsSitting(SBI_PO, row)).toBe(markingSchemeStatable(SBI_PO, { rowLabel: row.label, rowDate: row.date }));
  });
});

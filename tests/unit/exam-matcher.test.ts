import { describe, it, expect } from "vitest";
import { matchExam, matchAll, type ExamElig, type MatchInput } from "@/lib/exam-matcher";

const base: ExamElig = {
  code: "X", shortName: "X", name: "Exam X", category: "GOVT_JOBS", state: null,
  minAge: 18, maxAge: 30, educationTags: ["GRADUATE", "ANY_STREAM"], educationNote: "Any graduate",
  domicileState: null, vacanciesApprox: 10000, skillProfile: { quant: 5, reasoning: 5, gk: 4, english: 3, technical: 0 },
  vacanciesNote: null,
};
const grad: MatchInput = { age: 22, education: "GRADUATE", stream: "SCIENCE", state: "AP", category: "GEN", strengths: ["quant", "reasoning"] };

describe("matchExam", () => {
  it("passes a graduate within age for an any-graduate exam", () => {
    const r = matchExam(grad, base);
    expect(r.eligible).toBe(true);
    expect(r.blockers).toHaveLength(0);
    expect(r.fitScore).toBeGreaterThan(0);
  });

  it("blocks a 12th-pass from a graduate-only exam", () => {
    const r = matchExam({ ...grad, education: "12TH" }, base);
    expect(r.eligible).toBe(false);
    expect(r.blockers.join(" ")).toMatch(/qualif|graduate|degree/i);
  });

  it("blocks over-age but honours category relaxation", () => {
    expect(matchExam({ ...grad, age: 34 }, base).eligible).toBe(false);
    // OBC +3 → limit 33, still blocked at 34; SC +5 → 35, allowed
    expect(matchExam({ ...grad, age: 34, category: "SC" }, base).eligible).toBe(true);
  });

  it("requires a specific stream when the exam mandates one", () => {
    const eng: ExamElig = { ...base, educationTags: ["GRADUATE", "ENGINEERING"] };
    expect(matchExam({ ...grad, stream: "SCIENCE" }, eng).eligible).toBe(false);
    expect(matchExam({ ...grad, stream: "ENGINEERING" }, eng).eligible).toBe(true);
  });

  it("enforces domicile for a state exam", () => {
    const st: ExamElig = { ...base, state: "AP", domicileState: "AP" };
    expect(matchExam({ ...grad, state: "AP" }, st).eligible).toBe(true);
    expect(matchExam({ ...grad, state: "TN" }, st).eligible).toBe(false);
  });

  it("ranks skill-aligned exams above misaligned ones", () => {
    const techExam: ExamElig = { ...base, code: "T", skillProfile: { quant: 0, reasoning: 0, gk: 0, english: 0, technical: 5 } };
    const quantExam: ExamElig = { ...base, code: "Q", skillProfile: { quant: 5, reasoning: 5, gk: 0, english: 0, technical: 0 } };
    const { eligible } = matchAll(grad, [techExam, quantExam]);
    expect(eligible[0].exam.code).toBe("Q"); // user is strong in quant/reasoning
  });
});

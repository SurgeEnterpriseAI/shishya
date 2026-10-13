// The sentence gate on a streamed local reply (13 Oct 2026): links repaired,
// sentences with unsupported facts dropped, the rest shown. Pure.
// Run: npx vitest run tests/unit/sentence-gate.test.ts

import { describe, expect, it } from "vitest";
import { cleanActions, gateUnit, takeSentences, type GateStats } from "@/lib/ai/sentence-gate";

const fresh = (): GateStats => ({ sentences: 0, dropped: [], repairedLinks: 0 });
const ctx = "Exam SSC_MTS. Pages /exams/{CODE}/quiz. Topics: quant.percentage. Article 17 abolishes untouchability.";

describe("takeSentences", () => {
  it("cuts at sentence ends and newlines, keeps the unfinished tail", () => {
    expect(takeSentences("First one. Second one! Third")).toEqual({ done: ["First one.", " Second one!"], rest: " Third" });
    expect(takeSentences("Line one\nLine two")).toEqual({ done: ["Line one\n"], rest: "Line two" });
  });
  it("does not cut inside a decimal", () => {
    expect(takeSentences("It costs 2.5 marks. Next").done).toEqual(["It costs 2.5 marks."]);
  });
});

describe("gateUnit", () => {
  it("shows a clean sentence as written", () => {
    const s = fresh();
    expect(gateUnit("Revise percentages daily.", ctx, "SSC_MTS", s)).toBe("Revise percentages daily.");
    expect(s.dropped).toEqual([]);
  });
  it("drops a sentence with an unsupported fact or marking claim", () => {
    const s = fresh();
    expect(gateUnit(" Paper 1 has −1 mark for every wrong answer.", ctx, "SSC_MTS", s)).toBe("");
    expect(gateUnit("The 104th Amendment did this.\n", ctx, "SSC_MTS", s)).toBe("\n");
    expect(s.dropped).toHaveLength(2);
  });
  it("keeps a supported fact", () => {
    expect(gateUnit("Article 17 abolishes untouchability.", ctx, "SSC_MTS", fresh())).toBe("Article 17 abolishes untouchability.");
  });
  it("repairs an invented link to the exam hub, and an invented topic code to plain words", () => {
    const s = fresh();
    expect(gateUnit("Practise at https://shishya.in/exams/SSC_MTS/topics/quant.series now.", ctx, "SSC_MTS", s)).toBe("Practise at https://shishya.in/exams/SSC_MTS now.");
    expect(gateUnit("Revise `quant.number_series` today.", ctx, "SSC_MTS", s)).toBe("Revise number series today.");
    expect(s.repairedLinks).toBe(2);
  });
});

describe("cleanActions", () => {
  it("removes suggested actions whose topic code is not in the context", () => {
    expect(cleanActions([{ topicCode: "quant.percentage" }, { topicCode: "quant.made_up" }, { topicCode: null }], ctx)).toEqual([{ topicCode: "quant.percentage" }, { topicCode: null }]);
  });
});

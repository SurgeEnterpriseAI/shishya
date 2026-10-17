// Quiz answers graded in code (16 Oct 2026): a student's "b" / "1.b 2.c" to bank questions the tutor
// showed is marked against the verified key, and a local reply that contradicts the marking is rejected.
// Run: npx vitest run tests/unit/answer-grading.test.ts

import { describe, expect, it } from "vitest";
import { gradeAnswers, gradingBlock, gradingConsistent, parseAnswerTurn, pendingQuestionIdsFromMetadata, shownQuestionIds, type GradableQuestion } from "@/lib/ai/answer-grading";
import { pendingQuestionIdsFromRows } from "@/lib/tutor-turn";

const q = (id: string, key: string): GradableQuestion => ({
  id, body: `Question ${id}`, answerKey: key, solution: `Because ${key}.`,
  options: [{ key: "A", text: "one" }, { key: "B", text: "two" }, { key: "C", text: "three" }, { key: "D", text: "four" }],
});

describe("parseAnswerTurn", () => {
  it("reads single answers when one question was shown", () => {
    for (const m of ["b", "B", "(b)", "b.", "option b", "Ans: B", "answer is b", "b is the answer", "B is correct"]) {
      expect(parseAnswerTurn(m, 1), m).toEqual([{ index: 0, letter: "B" }]);
    }
  });
  it("reads numbered answers for several questions", () => {
    expect(parseAnswerTurn("1.b 2.c", 2)).toEqual([{ index: 0, letter: "B" }, { index: 1, letter: "C" }]);
    expect(parseAnswerTurn("2.c / 3.c /", 3)).toEqual([{ index: 1, letter: "C" }, { index: 2, letter: "C" }]);
    expect(parseAnswerTurn("1) a, 2) d", 2)).toEqual([{ index: 0, letter: "A" }, { index: 1, letter: "D" }]);
  });
  it("reads all ten answers when ten bank questions were shown (17 Oct 2026: cap 10)", () => {
    const ten = "1 - b, 2 - c, 3 - a, 4 - d, 5 - b, 6 - c, 7 - a, 8 - d, 9 - b, 10 - c";
    expect(ten.length).toBeGreaterThan(60);
    expect(parseAnswerTurn(ten, 10)?.map((a) => a.letter).join("")).toBe("BCADBCADBC");
    expect(parseAnswerTurn(ten, 5)).toBeNull(); // only five were shown
  });
  it("refuses anything that is not purely an answer", () => {
    expect(parseAnswerTurn("b", 2)).toBeNull(); // which question?
    expect(parseAnswerTurn("why is b wrong", 1)).toBeNull();
    expect(parseAnswerTurn("12 is ans", 1)).toBeNull();
    expect(parseAnswerTurn("3.b", 2)).toBeNull(); // no third question
    expect(parseAnswerTurn("b", 0)).toBeNull();
    expect(parseAnswerTurn("e", 1)).toBeNull();
  });
});

describe("grading", () => {
  it("marks against the verified key; an option that does not exist is not graded", () => {
    const g = gradeAnswers([q("q1", "C")], [{ index: 0, letter: "B" }])!;
    expect(g[0].correct).toBe(false);
    expect(gradeAnswers([q("q1", "C")], [{ index: 0, letter: "C" }])![0].correct).toBe(true);
    expect(gradeAnswers([{ ...q("q1", "C"), options: [{ key: "A", text: "x" }, { key: "C", text: "y" }] }], [{ index: 0, letter: "B" }])).toBeNull();
    const block = gradingBlock(g);
    expect(block).toContain("Student chose B (two) — WRONG. Correct answer: C (three)");
    expect(block).toContain("Verified solution: Because C.");
  });
  it("rejects a reply that contradicts the grading", () => {
    const wrong = gradeAnswers([q("q1", "C")], [{ index: 0, letter: "B" }])!;
    expect(gradingConsistent("Not quite — the correct answer is **C** (three). B is wrong because…", wrong)).toBeNull();
    expect(gradingConsistent("Yes! B is correct.", wrong)).toMatch(/correct option C|wrong pick B/);
    expect(gradingConsistent("Option B is correct here, and C also works.", wrong)).toMatch(/wrong pick B/);
    const right = gradeAnswers([q("q1", "C")], [{ index: 0, letter: "C" }])!;
    expect(gradingConsistent("Correct! C (three) is right because…", right)).toBeNull();
    expect(gradingConsistent("That's wrong. The answer is C.", right)).toMatch(/right pick C wrong|does not say/);
  });
});

describe("the shown questions travel from the tool to the next turn as ids only", () => {
  it("takes ids from find_questions_on_topic only", () => {
    expect(shownQuestionIds("find_questions_on_topic", { ok: true, data: { questions: [{ id: "q1", answer_key: "C" }, { id: "q2" }] } })).toEqual(["q1", "q2"]);
    expect(shownQuestionIds("get_recent_attempts", { ok: true, data: {} })).toBeUndefined();
    expect(shownQuestionIds("find_questions_on_topic", { ok: false })).toBeUndefined();
  });
  it("reads the last tool call's ids, and only when the last row is the tutor's reply", () => {
    const meta = { toolCalls: [{ name: "find_questions_on_topic", shown: ["old"] }, { name: "find_questions_on_topic", shown: ["q1"] }] };
    expect(pendingQuestionIdsFromMetadata(meta)).toEqual(["q1"]);
    const rows = [
      { id: "u1", role: "USER", content: "quiz me", metadata: null },
      { id: "a1", role: "ASSISTANT", content: "Q: …", metadata: meta },
      { id: "u2", role: "USER", content: "b", metadata: null },
    ];
    expect(pendingQuestionIdsFromRows(rows, "u2")).toEqual(["q1"]);
    expect(pendingQuestionIdsFromRows(rows, null)).toEqual([]); // a USER row after the reply
  });
});

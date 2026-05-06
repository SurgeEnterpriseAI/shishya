// Pure unit tests for src/lib/scoring.ts.
// No DB. No network. Run with: npm test

import { describe, it, expect } from "vitest";
import { scoreAttempt, recentTrend } from "@/lib/scoring";

// Helper to build the questionsById map quickly.
function qmap(
  rows: Array<{ id: string; answerKey: string; topicId?: string; topicCode?: string; topicName?: string; difficulty?: any }>
) {
  const m = new Map();
  for (const r of rows) {
    m.set(r.id, {
      id: r.id,
      answerKey: r.answerKey,
      topicId: r.topicId ?? "t1",
      topicCode: r.topicCode ?? "topic.1",
      topicName: r.topicName ?? "Topic 1",
      difficulty: r.difficulty ?? "MEDIUM",
    });
  }
  return m;
}

describe("scoreAttempt — basic correctness", () => {
  it("scores all correct = full marks, no negatives", () => {
    const r = scoreAttempt({
      questionIds: ["q1", "q2", "q3"],
      questionsById: qmap([
        { id: "q1", answerKey: "A" },
        { id: "q2", answerKey: "B" },
        { id: "q3", answerKey: "C" },
      ]),
      submittedAnswers: [
        { questionId: "q1", chosen: "A", timeSec: 30, marked: false },
        { questionId: "q2", chosen: "B", timeSec: 30, marked: false },
        { questionId: "q3", chosen: "C", timeSec: 30, marked: false },
      ],
      marksPerQ: 2,
      negativeMark: 0.5,
    });
    expect(r.scoreRaw).toBe(6);
    expect(r.scoreMax).toBe(6);
    expect(r.scorePct).toBe(100);
    expect(r.scored.every((s) => s.correct)).toBe(true);
  });

  it("scores all wrong = full negative penalty", () => {
    const r = scoreAttempt({
      questionIds: ["q1", "q2"],
      questionsById: qmap([
        { id: "q1", answerKey: "A" },
        { id: "q2", answerKey: "B" },
      ]),
      submittedAnswers: [
        { questionId: "q1", chosen: "B", timeSec: 30, marked: false },
        { questionId: "q2", chosen: "C", timeSec: 30, marked: false },
      ],
      marksPerQ: 2,
      negativeMark: 0.5,
    });
    expect(r.scoreRaw).toBe(-1); // -0.5 × 2
    expect(r.scoreMax).toBe(4);
    expect(r.scorePct).toBeCloseTo(-25);
  });

  it("skipped questions get zero, no penalty", () => {
    const r = scoreAttempt({
      questionIds: ["q1", "q2", "q3"],
      questionsById: qmap([
        { id: "q1", answerKey: "A" },
        { id: "q2", answerKey: "B" },
        { id: "q3", answerKey: "C" },
      ]),
      submittedAnswers: [
        { questionId: "q1", chosen: "A", timeSec: 30, marked: false },
        // q2 not submitted at all
        { questionId: "q3", chosen: null, timeSec: 0, marked: false }, // explicitly null
      ],
      marksPerQ: 2,
      negativeMark: 0.5,
    });
    expect(r.scoreRaw).toBe(2); // only q1 correct; q2/q3 = 0
    const skipped = r.scored.filter((s) => s.chosen == null);
    expect(skipped).toHaveLength(2);
    expect(skipped.every((s) => s.marks === 0)).toBe(true);
  });

  it("topic aggregates correct / total / score", () => {
    const r = scoreAttempt({
      questionIds: ["q1", "q2", "q3", "q4"],
      questionsById: qmap([
        { id: "q1", answerKey: "A", topicId: "t1", topicCode: "t.a" },
        { id: "q2", answerKey: "A", topicId: "t1", topicCode: "t.a" },
        { id: "q3", answerKey: "A", topicId: "t2", topicCode: "t.b" },
        { id: "q4", answerKey: "A", topicId: "t2", topicCode: "t.b" },
      ]),
      submittedAnswers: [
        { questionId: "q1", chosen: "A", timeSec: 30, marked: false }, // ✓
        { questionId: "q2", chosen: "B", timeSec: 30, marked: false }, // ✗
        { questionId: "q3", chosen: "A", timeSec: 30, marked: false }, // ✓
        { questionId: "q4", chosen: "A", timeSec: 30, marked: false }, // ✓
      ],
      marksPerQ: 1,
      negativeMark: 0,
    });
    expect(r.topicScores.t1).toEqual({ topicCode: "t.a", topicName: "Topic 1", correct: 1, total: 2, score: 0.5 });
    expect(r.topicScores.t2).toEqual({ topicCode: "t.b", topicName: "Topic 1", correct: 2, total: 2, score: 1 });
  });

  it("drops questions whose ID is not in the map (missing-data resilience)", () => {
    const r = scoreAttempt({
      questionIds: ["q1", "missing"],
      questionsById: qmap([{ id: "q1", answerKey: "A" }]),
      submittedAnswers: [{ questionId: "q1", chosen: "A", timeSec: 0, marked: false }],
      marksPerQ: 2,
      negativeMark: 0,
    });
    expect(r.scored).toHaveLength(1);
    expect(r.scoreRaw).toBe(2);
    // scoreMax includes the missing Q so % is "honest"
    expect(r.scoreMax).toBe(4);
    expect(r.scorePct).toBe(50);
  });

  it("scoreMax = 0 returns scorePct = 0 (no NaN)", () => {
    const r = scoreAttempt({
      questionIds: [],
      questionsById: new Map(),
      submittedAnswers: [],
      marksPerQ: 0,
      negativeMark: 0,
    });
    expect(r.scoreRaw).toBe(0);
    expect(r.scoreMax).toBe(0);
    expect(r.scorePct).toBe(0);
  });

  it("preserves ordering of questionIds in the scored output", () => {
    const r = scoreAttempt({
      questionIds: ["q3", "q1", "q2"],
      questionsById: qmap([
        { id: "q1", answerKey: "A" },
        { id: "q2", answerKey: "A" },
        { id: "q3", answerKey: "A" },
      ]),
      submittedAnswers: [],
      marksPerQ: 1,
      negativeMark: 0,
    });
    expect(r.scored.map((s) => s.questionId)).toEqual(["q3", "q1", "q2"]);
  });
});

describe("scoreAttempt — exam-specific config", () => {
  it("SSC CGL: +2 / -0.5 — half wrong, quarter right => check arithmetic", () => {
    // 4 Qs: 1 correct, 1 wrong, 2 skipped. SSC CGL: +2 correct, -0.5 wrong, 0 skipped.
    const r = scoreAttempt({
      questionIds: ["q1", "q2", "q3", "q4"],
      questionsById: qmap([
        { id: "q1", answerKey: "A" },
        { id: "q2", answerKey: "A" },
        { id: "q3", answerKey: "A" },
        { id: "q4", answerKey: "A" },
      ]),
      submittedAnswers: [
        { questionId: "q1", chosen: "A", timeSec: 30, marked: false }, // ✓ +2
        { questionId: "q2", chosen: "B", timeSec: 30, marked: false }, // ✗ -0.5
        // q3, q4 skipped
      ],
      marksPerQ: 2,
      negativeMark: 0.5,
    });
    expect(r.scoreRaw).toBe(1.5); // 2 - 0.5
    expect(r.scoreMax).toBe(8);
  });

  it("RRB NTPC: +1 / -1/3 — does not let third-rounding break the sum", () => {
    // 6 wrong @ -1/3 each = -2 exactly
    const r = scoreAttempt({
      questionIds: ["q1", "q2", "q3", "q4", "q5", "q6"],
      questionsById: qmap([
        { id: "q1", answerKey: "A" },
        { id: "q2", answerKey: "A" },
        { id: "q3", answerKey: "A" },
        { id: "q4", answerKey: "A" },
        { id: "q5", answerKey: "A" },
        { id: "q6", answerKey: "A" },
      ]),
      submittedAnswers: [
        { questionId: "q1", chosen: "B", timeSec: 30, marked: false },
        { questionId: "q2", chosen: "B", timeSec: 30, marked: false },
        { questionId: "q3", chosen: "B", timeSec: 30, marked: false },
        { questionId: "q4", chosen: "B", timeSec: 30, marked: false },
        { questionId: "q5", chosen: "B", timeSec: 30, marked: false },
        { questionId: "q6", chosen: "B", timeSec: 30, marked: false },
      ],
      marksPerQ: 1,
      negativeMark: 1 / 3,
    });
    expect(r.scoreRaw).toBeCloseTo(-2, 10); // 6 × -1/3 = -2
  });
});

describe("recentTrend", () => {
  it("returns undefined for fewer than 3 attempts", () => {
    expect(recentTrend([])).toBeUndefined();
    expect(recentTrend([60])).toBeUndefined();
    expect(recentTrend([60, 70])).toBeUndefined();
  });

  it("IMPROVING when newest is meaningfully better than oldest", () => {
    // Newest first: 75 (latest), 65, 50 (oldest). delta = 75 - 50 = 25 > 5
    expect(recentTrend([75, 65, 50])).toBe("IMPROVING");
  });

  it("DECLINING when newest is meaningfully worse", () => {
    expect(recentTrend([40, 50, 60])).toBe("DECLINING");
  });

  it("FLAT when within ±5 points", () => {
    expect(recentTrend([55, 53, 54])).toBe("FLAT");
    expect(recentTrend([60, 58, 56])).toBe("FLAT"); // delta = 4
  });
});

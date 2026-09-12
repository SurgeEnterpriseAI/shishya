// Pure unit tests for src/lib/attempts-submit.ts — the server side of the
// batched submit: the payload is authoritative for WHAT was chosen, never
// for the grade; idempotency is by content; scoreAttempt stays the single
// grader. No DB, no network.

import { describe, it, expect } from "vitest";
import {
  SubmitAnswerSchema,
  SubmitBodySchema,
  gradeSubmission,
  mergeAuthoritative,
  normaliseChosen,
  samePayloadAsGraded,
} from "@/lib/attempts-submit";
import { scoreAttempt } from "@/lib/scoring";
import type { AnswerRecord } from "@/lib/attempts-sync";

function qmap(rows: Array<{ id: string; answerKey: string; topicId?: string }>) {
  const m = new Map();
  for (const r of rows) {
    m.set(r.id, {
      id: r.id,
      answerKey: r.answerKey,
      topicId: r.topicId ?? "t1",
      topicCode: "topic.1",
      topicName: "Topic 1",
      difficulty: "MEDIUM",
    });
  }
  return m;
}

function rec(questionId: string, patch: Partial<AnswerRecord> = {}): AnswerRecord {
  return { questionId, chosen: null, timeSec: 0, marked: false, ...patch };
}

const QIDS = ["q1", "q2", "q3"];
const QUESTIONS = qmap([
  { id: "q1", answerKey: "A" },
  { id: "q2", answerKey: "B" },
  { id: "q3", answerKey: "C" },
]);

describe("normaliseChosen", () => {
  it("maps empty / whitespace / null / undefined to null and trims", () => {
    expect(normaliseChosen(null)).toBeNull();
    expect(normaliseChosen(undefined)).toBeNull();
    expect(normaliseChosen("")).toBeNull();
    expect(normaliseChosen("   ")).toBeNull();
    expect(normaliseChosen(" A ")).toBe("A");
  });
});

describe("mergeAuthoritative", () => {
  it("payload replaces the stored row for the same question; stored-only rows are kept", () => {
    const stored = [rec("q1", { chosen: "D", timeSec: 5 }), rec("q2", { chosen: "B", timeSec: 8, marked: true })];
    const payload = [rec("q1", { chosen: "A", timeSec: 30, updatedAt: 42 })];
    const { answers, dropped } = mergeAuthoritative(stored, payload, QIDS);
    expect(answers).toEqual([
      rec("q1", { chosen: "A", timeSec: 30, updatedAt: 42 }),
      rec("q2", { chosen: "B", timeSec: 8, marked: true }),
    ]);
    expect(dropped).toEqual([]);
  });

  it("orders by questionIds and omits questions with nothing on either side", () => {
    const { answers } = mergeAuthoritative([rec("q3", { chosen: "C" })], [rec("q1", { chosen: "A" })], QIDS);
    expect(answers.map((a) => a.questionId)).toEqual(["q1", "q3"]);
  });

  it("drops payload rows for questions not in the mock (deduped) and stored rows too", () => {
    const { answers, dropped } = mergeAuthoritative(
      [rec("ghost", { chosen: "A" })],
      [rec("zzz", { chosen: "A" }), rec("zzz", { chosen: "B" }), rec("q1", { chosen: "A" })],
      QIDS,
    );
    expect(answers.map((a) => a.questionId)).toEqual(["q1"]);
    expect(dropped).toEqual(["zzz"]);
  });

  it("normalises '' to null, coerces marked, and clamps bad timeSec", () => {
    const { answers } = mergeAuthoritative(
      [],
      [{ questionId: "q1", chosen: "", timeSec: -3, marked: "yes" as unknown as boolean }],
      QIDS,
    );
    expect(answers).toEqual([rec("q1", { chosen: null, timeSec: 0, marked: false })]);
  });

  it("undefined payload = grade what the server stored (legacy bare submit)", () => {
    const stored = [rec("q2", { chosen: "B" })];
    const { answers } = mergeAuthoritative(stored, undefined, QIDS);
    expect(answers).toEqual([rec("q2", { chosen: "B" })]);
  });

  it("last occurrence wins when the payload repeats a question", () => {
    const { answers } = mergeAuthoritative([], [rec("q1", { chosen: "A" }), rec("q1", { chosen: "B" })], QIDS);
    expect(answers[0].chosen).toBe("B");
  });
});

describe("gradeSubmission — never trusts the client for the grade", () => {
  it("a wrong answer tagged correct/marks by the client is still graded wrong and negative-marked", () => {
    const payload = [
      { ...rec("q1", { chosen: "D" }), correct: true, marks: 99 },
      { ...rec("q2", { chosen: "B" }), correct: false, marks: -5 },
    ] as unknown as AnswerRecord[];
    const r = gradeSubmission({
      questionIds: QIDS,
      questionsById: QUESTIONS,
      stored: [],
      payload,
      marksPerQ: 2,
      negativeMark: 0.5,
    });
    const byId = new Map(r.scored.map((s) => [s.questionId, s]));
    expect(byId.get("q1")).toMatchObject({ chosen: "D", correct: false, marks: -0.5 });
    expect(byId.get("q2")).toMatchObject({ chosen: "B", correct: true, marks: 2 });
    expect(byId.get("q3")).toMatchObject({ chosen: null, correct: false, marks: 0 });
    expect(r.scoreRaw).toBe(1.5);
    expect(r.scoreMax).toBe(6);
    // Nothing client-supplied leaks into what the route persists.
    for (const a of r.answersUsed) {
      expect(Object.keys(a).sort()).toEqual(["chosen", "marked", "questionId", "timeSec"]);
    }
  });

  it("is identical to scoreAttempt for the same effective answers", () => {
    const stored = [rec("q1", { chosen: "A", timeSec: 10 }), rec("q3", { chosen: "B", timeSec: 20 })];
    const payload = [rec("q3", { chosen: "C", timeSec: 25, updatedAt: 1 })];
    const r = gradeSubmission({
      questionIds: QIDS,
      questionsById: QUESTIONS,
      stored,
      payload,
      marksPerQ: 1,
      negativeMark: 0.25,
    });
    const direct = scoreAttempt({
      questionIds: QIDS,
      questionsById: QUESTIONS,
      submittedAnswers: [
        { questionId: "q1", chosen: "A", timeSec: 10, marked: false },
        { questionId: "q3", chosen: "C", timeSec: 25, marked: false },
      ],
      marksPerQ: 1,
      negativeMark: 0.25,
    });
    expect(r.scored).toEqual(direct.scored);
    expect(r.scoreRaw).toBe(direct.scoreRaw);
    expect(r.scorePct).toBe(direct.scorePct);
    expect(r.topicScores).toEqual(direct.topicScores);
    expect(r.dropped).toEqual([]);
  });

  it("the payload overrides an autosaved row — the device the student finished on wins", () => {
    const stored = [rec("q1", { chosen: "A" })]; // a stale autosave
    const payload = [rec("q1", { chosen: null, updatedAt: 5 })]; // student cleared it before submitting
    const r = gradeSubmission({
      questionIds: QIDS,
      questionsById: QUESTIONS,
      stored,
      payload,
      marksPerQ: 1,
      negativeMark: 0,
    });
    expect(r.scored[0]).toMatchObject({ questionId: "q1", chosen: null, correct: false, marks: 0 });
  });

  it("a question in neither stored nor payload scores 0 with chosen null", () => {
    const r = gradeSubmission({
      questionIds: QIDS,
      questionsById: QUESTIONS,
      stored: [],
      payload: [],
      marksPerQ: 3,
      negativeMark: 1,
    });
    expect(r.scored.every((s) => s.chosen === null && s.marks === 0 && !s.correct)).toBe(true);
    expect(r.scoreRaw).toBe(0);
    expect(r.scorePct).toBe(0);
  });

  it("reports payload rows for foreign questions as dropped without grading them", () => {
    const r = gradeSubmission({
      questionIds: QIDS,
      questionsById: QUESTIONS,
      stored: [],
      payload: [rec("hax", { chosen: "A" })],
      marksPerQ: 1,
      negativeMark: 0,
    });
    expect(r.dropped).toEqual(["hax"]);
    expect(r.scored.map((s) => s.questionId)).toEqual(QIDS);
  });
});

describe("samePayloadAsGraded — idempotency by content", () => {
  const graded = [
    { questionId: "q1", chosen: "A" },
    { questionId: "q2", chosen: null },
    { questionId: "q3", chosen: "C" },
  ];

  it("true for an identical payload and for an undefined (bare) resubmit", () => {
    expect(samePayloadAsGraded(graded, undefined, QIDS)).toBe(true);
    expect(
      samePayloadAsGraded(graded, [rec("q1", { chosen: "A" }), rec("q3", { chosen: "C" })], QIDS),
    ).toBe(true);
  });

  it("ignores timeSec / marked / updatedAt differences and treats '' as null", () => {
    expect(
      samePayloadAsGraded(
        graded,
        [
          rec("q1", { chosen: "A", timeSec: 999, marked: true, updatedAt: 1 }),
          rec("q2", { chosen: "" }),
          rec("q3", { chosen: "C" }),
        ],
        QIDS,
      ),
    ).toBe(true);
  });

  it("false when any chosen differs — including an answer the graded copy never had", () => {
    expect(samePayloadAsGraded(graded, [rec("q1", { chosen: "B" }), rec("q3", { chosen: "C" })], QIDS)).toBe(false);
    expect(
      samePayloadAsGraded(
        graded,
        [rec("q1", { chosen: "A" }), rec("q2", { chosen: "B" }), rec("q3", { chosen: "C" })],
        QIDS,
      ),
    ).toBe(false);
    // A stale tab with fewer answers than what was graded is also different.
    expect(samePayloadAsGraded(graded, [rec("q1", { chosen: "A" })], QIDS)).toBe(false);
  });

  it("only compares questions in the mock", () => {
    expect(
      samePayloadAsGraded(graded, [rec("q1", { chosen: "A" }), rec("q3", { chosen: "C" }), rec("zzz", { chosen: "Q" })], QIDS),
    ).toBe(true);
  });
});

describe("SubmitBodySchema — compatibility", () => {
  it("accepts {} and { auto: true }", () => {
    expect(SubmitBodySchema.safeParse({}).success).toBe(true);
    const r = SubmitBodySchema.safeParse({ auto: true });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.auto).toBe(true);
      expect(r.data.answers).toBeUndefined();
    }
  });

  it("accepts a batched payload and defaults marked to false", () => {
    const r = SubmitBodySchema.safeParse({
      auto: false,
      answers: [{ questionId: "q1", chosen: "A", timeSec: 12, updatedAt: 1700000000000 }],
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.answers?.[0].marked).toBe(false);
  });

  it("strips client-supplied grade fields", () => {
    const r = SubmitAnswerSchema.safeParse({ questionId: "q1", chosen: "A", timeSec: 1, correct: true, marks: 9 });
    expect(r.success).toBe(true);
    if (r.success) expect(Object.keys(r.data).sort()).toEqual(["chosen", "marked", "questionId", "timeSec"]);
  });

  it("rejects timeSec -1, an over-long chosen, an empty questionId, a non-integer updatedAt", () => {
    expect(SubmitBodySchema.safeParse({ answers: [{ questionId: "q1", chosen: "A", timeSec: -1 }] }).success).toBe(false);
    expect(
      SubmitBodySchema.safeParse({ answers: [{ questionId: "q1", chosen: "A".repeat(41), timeSec: 1 }] }).success,
    ).toBe(false);
    expect(SubmitBodySchema.safeParse({ answers: [{ questionId: "", chosen: "A", timeSec: 1 }] }).success).toBe(false);
    expect(
      SubmitBodySchema.safeParse({ answers: [{ questionId: "q1", chosen: "A", timeSec: 1, updatedAt: 1.5 }] }).success,
    ).toBe(false);
  });
});

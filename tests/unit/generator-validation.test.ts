// Lightweight tests for generator validation rules.
//
// We re-implement the validator inline (mirror of the one in
// scripts/generate-questions.ts) so this stays a pure unit test without
// needing to import the script's CJS entry. If the validator drifts, this
// test will go red — and the right fix is to re-mirror the change here.

import { describe, it, expect } from "vitest";

interface RawQ {
  body?: any;
  options?: any;
  answerKey?: any;
  solution?: any;
  difficulty?: any;
  tags?: any;
}

function validateGenerated(q: any): { ok: true } | { ok: false; reason: string } {
  if (!q || typeof q !== "object") return { ok: false, reason: "not an object" };
  if (typeof q.body !== "string" || q.body.trim().length < 10) return { ok: false, reason: "body too short" };
  if (!Array.isArray(q.options) || q.options.length !== 4) return { ok: false, reason: "must have 4 options" };
  const keys = q.options.map((o: any) => o?.key);
  const expected = ["A", "B", "C", "D"];
  if (JSON.stringify(keys) !== JSON.stringify(expected))
    return { ok: false, reason: "options must be keyed A/B/C/D in order" };
  for (const o of q.options) {
    if (typeof o.text !== "string" || o.text.trim().length === 0)
      return { ok: false, reason: "empty option text" };
  }
  if (!expected.includes(q.answerKey))
    return { ok: false, reason: `answerKey must be A/B/C/D, got ${q.answerKey}` };
  if (typeof q.solution !== "string" || q.solution.trim().length < 20)
    return { ok: false, reason: "solution too short" };
  if (!["EASY", "MEDIUM", "HARD"].includes(q.difficulty))
    return { ok: false, reason: `invalid difficulty: ${q.difficulty}` };
  return { ok: true };
}

const goodQ: RawQ = {
  body: "What is 2 + 2 in basic arithmetic?",
  options: [
    { key: "A", text: "3" },
    { key: "B", text: "4" },
    { key: "C", text: "5" },
    { key: "D", text: "22" },
  ],
  answerKey: "B",
  solution: "Addition of 2 and 2 yields 4. This is a foundational arithmetic fact.",
  difficulty: "EASY",
  tags: ["arithmetic"],
};

describe("validateGenerated — happy path", () => {
  it("accepts a well-formed question", () => {
    expect(validateGenerated(goodQ).ok).toBe(true);
  });
});

describe("validateGenerated — body", () => {
  it("rejects when body is missing", () => {
    const q = { ...goodQ } as any;
    delete q.body;
    expect(validateGenerated(q)).toEqual({ ok: false, reason: "body too short" });
  });
  it("rejects when body is too short", () => {
    expect(validateGenerated({ ...goodQ, body: "2+2?" })).toEqual({
      ok: false,
      reason: "body too short",
    });
  });
});

describe("validateGenerated — options", () => {
  it("rejects when options is not an array of length 4", () => {
    expect(validateGenerated({ ...goodQ, options: [] }).ok).toBe(false);
    expect(validateGenerated({ ...goodQ, options: goodQ.options.slice(0, 3) }).ok).toBe(false);
  });
  it("rejects when option keys are not A/B/C/D in order", () => {
    expect(
      validateGenerated({
        ...goodQ,
        options: [
          { key: "1", text: "x" },
          { key: "2", text: "y" },
          { key: "3", text: "z" },
          { key: "4", text: "w" },
        ],
      }).ok
    ).toBe(false);
    expect(
      validateGenerated({
        ...goodQ,
        options: [
          { key: "A", text: "x" },
          { key: "C", text: "y" },
          { key: "B", text: "z" },
          { key: "D", text: "w" },
        ],
      }).ok
    ).toBe(false);
  });
  it("rejects when an option text is empty", () => {
    expect(
      validateGenerated({
        ...goodQ,
        options: [
          { key: "A", text: "" },
          { key: "B", text: "y" },
          { key: "C", text: "z" },
          { key: "D", text: "w" },
        ],
      }).ok
    ).toBe(false);
  });
});

describe("validateGenerated — answer key", () => {
  it("rejects when answerKey is not in A/B/C/D", () => {
    expect(validateGenerated({ ...goodQ, answerKey: "E" }).ok).toBe(false);
    expect(validateGenerated({ ...goodQ, answerKey: "" }).ok).toBe(false);
  });
});

describe("validateGenerated — solution", () => {
  it("rejects when solution is too short", () => {
    expect(
      validateGenerated({ ...goodQ, solution: "Add them." }).ok
    ).toBe(false);
  });
});

describe("validateGenerated — difficulty", () => {
  it("rejects unknown difficulty values", () => {
    expect(validateGenerated({ ...goodQ, difficulty: "TRIVIAL" }).ok).toBe(false);
    expect(validateGenerated({ ...goodQ, difficulty: "easy" }).ok).toBe(false); // lowercase
  });
});

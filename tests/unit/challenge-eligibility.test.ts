// Mock challenge eligibility and one-link-per-attempt reuse (16 Sep 2026).
// Pure rules in src/lib/challenge.ts; no DB.
// Run with: npx vitest run tests/unit/challenge-eligibility.test.ts

import { describe, expect, it } from "vitest";
import {
  CHALLENGE_MAX_QUESTIONS,
  CHALLENGE_MIN_QUESTIONS,
  isSameMockSlice,
  mockChallengeEligible,
  mockSlice,
  playableMockIds,
} from "@/lib/challenge";
import { CHALLENGE_I18N_KEYS, challengeLabels } from "@/lib/challenge-copy";
import { dict, type StringKey } from "@/lib/i18n";

type Q = { examId: string; validated: boolean; type: string };
const EXAM = "exam-1";
const ok = (): Q => ({ examId: EXAM, validated: true, type: "MCQ" });
const byId = (entries: [string, Q][]) => new Map(entries);

describe("playableMockIds", () => {
  it("keeps the exam's validated MCQs in mock order and skips the rest", () => {
    const m = byId([
      ["a", ok()],
      ["b", { ...ok(), validated: false }],
      ["c", { ...ok(), type: "DESCRIPTIVE" }],
      ["d", { ...ok(), examId: "other" }],
      ["e", ok()],
    ]);
    expect(playableMockIds(["e", "missing", "d", "c", "b", "a"], m, EXAM)).toEqual(["e", "a"]);
  });
});

describe("mockChallengeEligible", () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `q${i}`);
  const all = (n: number) => byId(ids(n).map((id) => [id, ok()]));

  it(`needs at least ${CHALLENGE_MIN_QUESTIONS} playable questions — the same line mockSlice draws`, () => {
    expect(mockChallengeEligible({ examActive: true, examId: EXAM, questionIds: ids(4), byId: all(4) })).toBe(false);
    expect(mockChallengeEligible({ examActive: true, examId: EXAM, questionIds: ids(5), byId: all(5) })).toBe(true);
    expect(mockSlice(ids(4))).toBeNull();
    expect(mockSlice(ids(5))).not.toBeNull();
  });

  it("an on-demand AI mock made only of unvalidated questions can't make a link (the 185 attempts)", () => {
    const m = byId(ids(10).map((id) => [id, { ...ok(), validated: false }]));
    expect(mockChallengeEligible({ examActive: true, examId: EXAM, questionIds: ids(10), byId: m })).toBe(false);
  });

  it("counts playable positions, not the mock's length", () => {
    const m = byId(ids(100).map((id, i) => [id, { ...ok(), validated: i % 25 === 0 }])); // 4 validated of 100
    expect(mockChallengeEligible({ examActive: true, examId: EXAM, questionIds: ids(100), byId: m })).toBe(false);
  });

  it("an inactive exam never shows the card", () => {
    expect(mockChallengeEligible({ examActive: false, examId: EXAM, questionIds: ids(10), byId: all(10) })).toBe(false);
  });

  it(`a big mock slices to ${CHALLENGE_MAX_QUESTIONS}`, () => {
    expect(mockChallengeEligible({ examActive: true, examId: EXAM, questionIds: ids(99), byId: all(99) })).toBe(true);
    expect(mockSlice(playableMockIds(ids(99), all(99), EXAM))).toHaveLength(CHALLENGE_MAX_QUESTIONS);
  });
});

describe("isSameMockSlice — a repeat tap reuses the link only for the same questions", () => {
  it("same ids in the same order → reuse", () => {
    expect(isSameMockSlice(["a", "b", "c", "d", "e"], ["a", "b", "c", "d", "e"])).toBe(true);
  });
  it("a changed pool (different, reordered, shorter or missing) → a fresh link", () => {
    expect(isSameMockSlice(["a", "b", "c", "d", "x"], ["a", "b", "c", "d", "e"])).toBe(false);
    expect(isSameMockSlice(["b", "a", "c", "d", "e"], ["a", "b", "c", "d", "e"])).toBe(false);
    expect(isSameMockSlice(["a", "b", "c", "d"], ["a", "b", "c", "d", "e"])).toBe(false);
    expect(isSameMockSlice(null, ["a", "b", "c", "d", "e"])).toBe(false);
    expect(isSameMockSlice(undefined, [])).toBe(false);
  });
});

describe("challenge.card.notEnough", () => {
  const raw = (locale: string, key: StringKey) => (dict as unknown as Record<string, Record<string, string>>)[locale]?.[key];

  it("is a card label, so the key test holds it to en + hi + te", () => {
    expect(CHALLENGE_I18N_KEYS).toContain("challenge.card.notEnough");
    for (const locale of ["en", "hi", "te"]) expect(raw(locale, "challenge.card.notEnough")?.trim(), locale).toBeTruthy();
  });

  it("says why, and is not the retry message", () => {
    const L = challengeLabels((k) => dict.en[k]);
    expect(L["challenge.card.notEnough"]).toBe("This mock doesn't have enough questions a friend can play.");
    for (const locale of ["en", "hi", "te"]) {
      expect(raw(locale, "challenge.card.notEnough"), locale).not.toBe(raw(locale, "challenge.card.error"));
    }
  });
});

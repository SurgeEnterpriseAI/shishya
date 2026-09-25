// Withdrawn questions in a finished attempt's review (25 Sep 2026) — pure, no DB.
//
// The review shows the paper the attempt had (src/lib/attempt-paper.ts), so it
// can hold a question pulled after a wrong key was found. Its key must not be
// shown as "Correct" and its solution must not argue for it; the stored grade
// stays as submit counted it.
// Run: npx vitest run tests/unit/review-withdrawn.test.ts

import { describe, it, expect } from "vitest";
import {
  isWithdrawnForReview,
  maskWithdrawnReviewItem,
  withdrawnReviewNote,
  WITHDRAWN_KEY_MARK,
} from "@/lib/review-withdrawn";

const row = (over: Record<string, unknown> = {}) => ({
  id: "q1",
  body: "Let a1 = 2, a2 = 5 and a(n+2) = 3a(n+1) − 2a(n). Find a10.",
  options: [
    { key: "A", text: "1021" },
    { key: "B", text: "1533" },
    { key: "C", text: "1534" },
    { key: "D", text: "2047" },
  ],
  answerKey: "C",
  solution: "… so a10 = 1534.",
  chosen: "B" as string | null,
  correct: false,
  timeSec: 40,
  ...over,
});

describe("isWithdrawnForReview", () => {
  it("a question tagged rejected is withdrawn", () => {
    expect(isWithdrawnForReview({ validated: false, validatedAt: null, tags: ["rejected"], metadata: null })).toBe(true);
  });
  it("a question validated once and later pulled is withdrawn", () => {
    expect(isWithdrawnForReview({ validated: false, validatedAt: new Date("2026-06-01"), tags: [], metadata: null })).toBe(true);
  });
  it("a question the answer check failed is withdrawn", () => {
    expect(isWithdrawnForReview({ validated: false, validatedAt: null, tags: [], metadata: { factoryVerify: { verdict: "REJECT" } } })).toBe(true);
  });
  it("a never-validated draft is shown as before", () => {
    expect(isWithdrawnForReview({ validated: false, validatedAt: null, tags: [], metadata: null })).toBe(false);
  });
  it("a validated question is shown as before", () => {
    expect(isWithdrawnForReview({ validated: true, validatedAt: new Date(), tags: ["rejected"], metadata: null })).toBe(false);
  });
});

describe("maskWithdrawnReviewItem", () => {
  it("a withdrawn question: no key marked correct, no solution, the note instead", () => {
    const out = maskWithdrawnReviewItem(row(), true, "en");
    expect(out.answerKey).toBe(WITHDRAWN_KEY_MARK);
    expect(out.options.some((o) => o.key === out.answerKey)).toBe(false);
    expect(out.solution).toBe(withdrawnReviewNote("en"));
    expect(out.solution).not.toContain("1534");
  });
  it("keeps the student's answer and the stored grade (the score line still matches)", () => {
    const graded = maskWithdrawnReviewItem(row({ chosen: "C", correct: true }), true, "en");
    expect(graded.chosen).toBe("C");
    expect(graded.correct).toBe(true);
    const wrong = maskWithdrawnReviewItem(row(), true, "en");
    expect(wrong.chosen).toBe("B");
    expect(wrong.correct).toBe(false);
    expect(wrong.body).toBe(row().body);
    expect(wrong.options).toEqual(row().options);
  });
  it("any other question is returned untouched", () => {
    const r = row();
    expect(maskWithdrawnReviewItem(r, false, "en")).toBe(r);
  });
  it("the note follows the page language, English for any other", () => {
    expect(maskWithdrawnReviewItem(row(), true, "hi").solution).toBe(withdrawnReviewNote("hi"));
    expect(maskWithdrawnReviewItem(row(), true, "te").solution).toBe(withdrawnReviewNote("te"));
    expect(withdrawnReviewNote("hi")).not.toBe(withdrawnReviewNote("en"));
    expect(withdrawnReviewNote("te")).not.toBe(withdrawnReviewNote("en"));
    expect(withdrawnReviewNote("ta")).toBe(withdrawnReviewNote("en"));
    expect(withdrawnReviewNote(undefined)).toBe(withdrawnReviewNote("en"));
  });
});

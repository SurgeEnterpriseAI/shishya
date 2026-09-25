// Withdrawn questions in a finished attempt's review (25 Sep 2026).
//
// The review shows the paper an attempt actually had (src/lib/attempt-paper.ts),
// so it can hold a question that was taken out of use after a problem was
// found in it — the SBI Clerk question withdrawn on 24 Sep (no correct
// option), and PYQ-pattern questions pulled after student reports of a wrong
// key (an IOQM recurrence keyed C when a10 = 1535 is none of the options;
// "the answer is 215 not 195 but there is no option"). Probe, 25 Sep: 16
// finished attempts re-show 24 such slots from 7 questions. Rendered like a
// live question, the review marked the faulty key "Correct", printed the
// solution that argues for it, and marked a student's right working wrong —
// teaching an answer the site already knows is false.
//
// Rule: a question a bulk validate would hold back as withdrawn, pulled after
// validation, or failed by the answer check (bulkValidateVerdict in
// src/lib/question-withdrawn.ts) keeps its place in the review — the student
// did see it — but its key and solution are replaced by a short note. The
// stored grade is left as it is (the score, the accuracy line and the result
// card still agree with what submit counted). A never-validated question (an
// AI draft awaiting review, verdict "eligible") is shown as before.
//
// Pure — no DB. Tests: tests/unit/review-withdrawn.test.ts

import { bulkValidateVerdict } from "@/lib/question-withdrawn";
import { pickCopy, type CopyLocale } from "@/lib/ui-locale-copy";

/** Shown in place of a withdrawn question's answer key ("You chose B, correct —"). */
export const WITHDRAWN_KEY_MARK = "—";

const NOTE: Readonly<Record<CopyLocale, string>> = {
  en: "This question was withdrawn after a problem was found in it (for example, in its answer key), so its answer and solution are not shown here. Your score is unchanged.",
  hi: "यह प्रश्न वापस ले लिया गया है क्योंकि इसमें एक गड़बड़ी मिली (जैसे इसकी उत्तर कुंजी में), इसलिए इसका उत्तर और हल यहाँ नहीं दिखाया गया है। आपका स्कोर नहीं बदला है।",
  te: "ఈ ప్రశ్నలో ఒక లోపం కనిపించినందున (ఉదాహరణకు దీని జవాబు కీలో) దీన్ని ఉపసంహరించాం, అందుకే దీని జవాబు, పరిష్కారం ఇక్కడ చూపడం లేదు. మీ స్కోరు మారలేదు.",
};

/** The note that replaces a withdrawn question's solution, in the page's language (English for any other). */
export function withdrawnReviewNote(locale: string | null | undefined): string {
  return pickCopy(NOTE, locale);
}

/** True when the review must not present this question's key as correct. */
export function isWithdrawnForReview(q: {
  validated: boolean;
  validatedAt?: Date | string | null;
  tags?: readonly string[] | null;
  metadata?: unknown;
}): boolean {
  const v = bulkValidateVerdict(q);
  return v === "withdrawn" || v === "pulled" || v === "failed-check";
}

/**
 * A review row with a withdrawn question's key and solution replaced by the
 * note; any other row is returned as it is. `chosen` and `correct` (the stored
 * grade) are never touched.
 */
export function maskWithdrawnReviewItem<T extends { answerKey: string; solution: string }>(
  item: T,
  withdrawn: boolean,
  locale: string | null | undefined,
): T {
  if (!withdrawn) return item;
  return { ...item, answerKey: WITHDRAWN_KEY_MARK, solution: withdrawnReviewNote(locale) };
}

// Printed practice questions on a school chapter page (3 Oct 2026, crawl
// audit G3) — which questions, and whether the page prints them at all.
//
// Why: a chapter page with 30+ answer-checked questions printed none of them
// in its HTML — the guest quiz opens closed and keeps its questions in the
// script payload — so a student or parent asking an assistant for "Class 10
// Life Processes questions with answers" found no worked question on
// Shishya. The chapter page can print up to ten of them, stem and options
// visible, each answer and explanation under a native <details>
// (src/components/school/SchoolChapterQuestions.tsx; the pattern of
// src/components/TopicQuestionsInFull.tsx and the PYQ page).
//
// SWITCH, default OFF: printing them changes what crawlers read on about two
// hundred chapter pages, so it ships as its own search-surface change, on
// the founder's word — flip SCHOOL_CHAPTER_QUESTIONS_PRINTED and nothing
// else. While it is off the chapter page makes no extra database read and
// its HTML is unchanged.
//
// Which questions: the topic pages' display rules
// (src/lib/topic-question-display.ts — answer check ACCEPT with all three
// solves agreeing at 0.9+, key not changed by the check, never tagged
// rejected, whole options, a worked solution, no twins, at most two of one
// kind, one of each kind first, easy to hard, fixed order), read from the
// school-servable rows only (validated, MCQ, not withdrawn —
// src/lib/school/scope.ts). One difference: the KIND of a school question.
// The display rules take a row's first tag, and every school question's
// first tag is its chapter's code ("jesc1.ch05"), so a chapter printed 2
// questions at most (read 3 Oct 2026: all 230 chapters with checked
// questions printed exactly 2). The kind here is the question's own concept
// tag — the first tag that is not the chapter code, "school" or the
// generation date ("gen:2026-09-26") — so ten questions cover up to ten
// concepts of the chapter.
//
// Who sees them: Class 8-12 chapters with the guest quiz's minimum of
// checked questions (5). A Class 1-7 page prints nothing new. English only.
// Pure: no DB, no React. tests/unit/school-chapter-questions.test.ts pins it.

import { pickShownQuestions, type QuestionRow, type ShownQuestion } from "@/lib/topic-question-display";
import { WITHDRAWN_TAG } from "@/lib/question-withdrawn";
import { SCHOOL_GUEST_QUIZ_MIN } from "./scope";
import { isStudentModeClass } from "./student-classes";

/** THE SWITCH (default OFF): the chapter page prints its checked questions
 *  with answers. Its own search-surface change — see the header. */
export const SCHOOL_CHAPTER_QUESTIONS_PRINTED = false;

/** At most this many printed on one chapter page. */
export const SCHOOL_CHAPTER_QUESTIONS_MAX = 10;

/** A chapter or piece code as a tag: "jesc1.ch05", "fecu1.ch11.p02". */
const CHAPTER_CODE_TAG = /\.ch\d+/i;

/** A school question's kind: its first concept tag ("de-broglie-wavelength"),
 *  never the chapter code, "school", the generation date or "rejected".
 *  Null when the row carries no concept tag. */
export function schoolQuestionKind(q: Pick<QuestionRow, "tags">): string | null {
  for (const raw of q.tags) {
    const t = raw.trim().toLowerCase();
    if (!t || t === "school" || t === WITHDRAWN_TAG || t.startsWith("gen:") || CHAPTER_CODE_TAG.test(t)) continue;
    return t;
  }
  return null;
}

/** Up to ten of a chapter's checked questions, in the order the page prints them. */
export function pickSchoolChapterQuestions(rows: readonly QuestionRow[]): ShownQuestion[] {
  return pickShownQuestions(rows, { max: SCHOOL_CHAPTER_QUESTIONS_MAX, kindOf: schoolQuestionKind });
}

/** The chapter page prints them: the switch is on, a Class 8-12 chapter,
 *  and the chapter has the guest quiz's minimum of checked questions. `on`
 *  is the switch; tests pass true. */
export function printsSchoolChapterQuestions(c: { cls: number; validatedQuestions: number }, on: boolean = SCHOOL_CHAPTER_QUESTIONS_PRINTED): boolean {
  return on && isStudentModeClass(c.cls) && c.validatedQuestions >= SCHOOL_GUEST_QUIZ_MIN;
}

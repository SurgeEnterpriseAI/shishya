// School scope (26 Sep 2026) — what a school surface may read from the Exam
// tree, and the one rule that decides whether a chapter page is public.
// Shared by the pages (src/app/schooling/**, src/lib/school/db.ts), the
// guest quiz getter (src/lib/anon-quiz.ts getSchoolGuestQuiz) and the
// search-surface loader (src/lib/school/surface.ts: sitemap, llms-full.txt,
// context.md), so none of them can disagree.
//
// Why not SCHOOL_WHERE (src/lib/db/exam-scope.ts): every school container
// (NCERT_C01..C12, CISCE_C01..C12) was seeded active=false on purpose
// (src/lib/school/seed-plan.ts) and stays so — `active` on an Exam row means
// "a real exam whose bank is open", and the real-exam surfaces already keep
// school rows out by CATEGORY (REAL_EXAM_WHERE, realExamKey). The founder's
// go-live decision of 26 Sep 2026 is per CHAPTER, by the content it has
// (isSchoolChapterIndexable), not per container. So a school reader pins
// the category (and the container's code) and never reads `active`;
// SCHOOL_WHERE would find none of the 24 rows. Category-pinned, it can never
// return a real exam. tests/unit/exam-scope-guard.test.ts allow-lists the
// school loaders for exactly this (reason "SCHOOL").
//
// Pure: no DB, no React, no import of the loaders (surface.ts imports this).

import type { Prisma } from "@prisma/client";
import { SCHOOL_CATEGORY } from "@/lib/db/exam-scope";
import { WITHDRAWN_TAG } from "@/lib/question-withdrawn";

/** A school (curriculum, class) container, whatever its `active` flag. Always
 *  combined with the container's code(s) or read as the school catalog —
 *  never mixed into a real-exam list. */
export const SCHOOL_CONTAINER_WHERE = { category: SCHOOL_CATEGORY } satisfies Prisma.ExamWhereInput;

/** Questions a school page may show: answer-checked MCQs that were not
 *  withdrawn. The same three tests the exam guest quiz applies
 *  (src/lib/anon-quiz.ts), so "practice" means the same thing everywhere. */
export const SCHOOL_SERVABLE_QUESTION_WHERE = {
  validated: true,
  type: "MCQ",
  NOT: { tags: { has: WITHDRAWN_TAG } },
} satisfies Prisma.QuestionWhereInput;

/** Checked questions a chapter needs before its guest quiz is offered — the
 *  guest quiz's own minimum (ANON_QUIZ_MIN in src/lib/anon-quiz.ts, pinned
 *  equal by tests/unit/school-pages.test.ts). Also the sitemap's minimum
 *  for a chapter without notes. */
export const SCHOOL_GUEST_QUIZ_MIN = 5;

/** What a chapter has, computed from its rows — never typed. */
export interface SchoolChapterContent {
  hasNotes: boolean;
  /** Checked, servable questions on the chapter. */
  validatedQuestions: number;
}

/** The chapter page offers the 5-question guest quiz. */
export function hasSchoolGuestQuiz(c: SchoolChapterContent): boolean {
  return c.validatedQuestions >= SCHOOL_GUEST_QUIZ_MIN;
}

/** The ONE rule (page metadata and the sitemap builder both use it): a
 *  chapter page is indexable when it has Shishya's notes or a checked guest
 *  quiz. With neither it is title + book + official link only, and stays
 *  noindex (links followed). */
export function isSchoolChapterIndexable(c: SchoolChapterContent): boolean {
  return c.hasNotes || hasSchoolGuestQuiz(c);
}

/** Next data-cache TTL for the school loaders and the page revalidate —
 *  the exam topic pages' 10 minutes (a content batch lands within that). */
export const SCHOOL_REVALIDATE = 600;

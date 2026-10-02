// School-age accounts (2 Oct 2026, personalisation wave W1b) — the ONE rule.
//
// Why: Shishya asks nobody their age (27 Sep 2026: no question before
// content), so which accounts get the child safeguards is read from what the
// account already holds. Until now only a SCHOOL-ONLY account — a Class 8-12
// container enrolment and no real exam (src/lib/db/enrollment.ts
// schoolOnlyAccountSql) — was kept out of the exam mail loops. The privacy
// review of 2 Oct 2026 found the students that rule misses: an olympiad (SOF,
// Silverzone, NSTSE, the HBCSE stages …) is sat by school students, and in
// the catalogue it is a REAL exam, so its followers counted as adult
// aspirants. In 30 days, 95 olympiad-only accounts got 107 win-back mails.
//
// Founder decisions PD-5 and PD-16 option A (2 Oct 2026): an account is
// treated as SCHOOL AGE when ANY of these holds —
//   1. it holds an enrolment on an olympiad — Exam.category = OLYMPIAD, the
//      category of the catalogue row itself, never a typed list of exam
//      codes: an olympiad added to the catalogue tomorrow is covered the day
//      it is added;
//   2. it holds an enrolment on a school class container (Exam.category =
//      SCHOOL_BOARD — written by a school sign-in or by chapter practice);
//   3. it stored the 13-17 band (the card of 26-27 Sep 2026, read through
//      schoolBandOfProfile / isMinorBand — src/lib/school/student-classes.ts);
//   4. its onboarding-wizard stage is a school stage: CLASS_8, CLASS_9_10 or
//      CLASS_11_12 (src/lib/onboarding-options.ts).
// ANY enrolment row counts, active or not: a student does not grow older when
// an enrolment is switched off. (The one removal a student can make today —
// "Change exam" on the welcome strip, src/app/api/me/welcome/route.ts —
// deletes the row, so a wrong sign-up guess stops counting.)
//
// What it is NOT: a fact about anyone's age. It is a likely-age safeguard
// that errs towards fewer mails, so a parent or teacher who signed in from a
// class page, or an adult who follows an olympiad, is treated the same way.
// Nothing shown to a student may state it, and it is never stored — no new
// table, no new field; it is worked out on each read.
//
// What wave W1b does with it (and nothing else):
//   • no win-back, lapse-nudge or evening-nudge mail to a school-age account
//     (the three selections carry `NOT schoolAgeAccountSql("u")`);
//   • no quoted tutor-chat line in their Daily 5 and coach-morning mails —
//     the mails themselves stay (src/lib/pickup.ts pickupEmailLine is told
//     who is school age, and their chats are not read for the mail at all).
// Daily 5, coach-morning and the exam alerts a student asked for are kept.
//
// This file is the rule for a row already in hand; its SQL twin, for a
// selection over "User", is schoolAgeAccountSql in src/lib/db/enrollment.ts —
// built from the constants exported here, so the two cannot name different
// categories or stages. Pure: no DB, no React.
// Tests: tests/unit/mail-school-age.test.ts

import { STUDENT_STAGES, isMinorBand, schoolBandOfProfile } from "@/lib/school/student-classes";

/** = ExamCategory.OLYMPIAD (prisma/schema.prisma) — the catalogue's own category. */
export const OLYMPIAD_CATEGORY = "OLYMPIAD";
/** = SCHOOL_CATEGORY (src/lib/db/exam-scope.ts) — a (curriculum, class) container. */
export const SCHOOL_CLASS_CATEGORY = "SCHOOL_BOARD";
/** The wizard stages of a school student (the same three the 13-17 band was stored in). */
export const SCHOOL_AGE_WIZARD_STAGES: readonly string[] = STUDENT_STAGES;

/** What the rule reads — all of it already on the account. */
export interface SchoolAgeFacts {
  /** Exam.category of every enrolment the account holds, active or not — the
   *  catalogue row's own category, never guessed from an exam code. */
  enrolmentCategories: readonly (string | null | undefined)[];
  /** User.onbStage. */
  onbStage: string | null | undefined;
  /** User.onbPrepCodes. */
  onbPrepCodes: readonly string[] | null | undefined;
}

export type SchoolAgeTrigger = "olympiad-enrolment" | "class-enrolment" | "minor-band" | "wizard-school-stage";

const upper = (v: string | null | undefined) => String(v ?? "").toUpperCase();

/** Every trigger that holds for this account, in the order of the header; [] = not school age. */
export function schoolAgeTriggers(f: SchoolAgeFacts): SchoolAgeTrigger[] {
  const out: SchoolAgeTrigger[] = [];
  const categories = (f.enrolmentCategories ?? []).map(upper);
  if (categories.includes(OLYMPIAD_CATEGORY)) out.push("olympiad-enrolment");
  if (categories.includes(SCHOOL_CLASS_CATEGORY)) out.push("class-enrolment");
  const band = schoolBandOfProfile({ onbStage: f.onbStage ?? null, onbPrepCodes: f.onbPrepCodes ?? null });
  if (isMinorBand(band?.band)) out.push("minor-band");
  if (typeof f.onbStage === "string" && SCHOOL_AGE_WIZARD_STAGES.includes(f.onbStage)) out.push("wizard-school-stage");
  return out;
}

/** True when the account gets the school-age safeguards (any one trigger). */
export function isSchoolAge(f: SchoolAgeFacts): boolean {
  return schoolAgeTriggers(f).length > 0;
}

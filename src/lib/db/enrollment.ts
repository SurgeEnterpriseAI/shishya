// One door for Enrollment writes (26 Sep 2026).
//
// Why: an Enrollment is what makes an exam "the student's" — Daily-5, the
// coach, the dashboard, the eve / day-after / lapse / win-back mails and the
// live-test invites all start from it. School (curriculum, class) containers
// live in the same Exam table (category SCHOOL_BOARD, src/lib/db/exam-scope.ts),
// and before this every writer upserted straight from an exam looked up by a
// client-supplied code — a chat with examCode NCERT_C09 would have enrolled
// a child into the govt-exam mail loops. So every writer passes the exam ROW
// (id + category) through here, and a school container is refused with a
// thrown error, not skipped: every caller looked the exam up with
// realExamKey(), so reaching this with a school row is a bug, and a bug
// should fail loudly. The static guard (tests/unit/exam-scope-guard.test.ts)
// fails on any other enrollment.upsert / create under src/.
//
// The upsert is byte-for-byte what the nine callers did: `patch` is the
// update, and create = { userId, examId, ...patch } (Enrollment.active
// defaults to true, so a bare call creates an active enrolment).
//
// 26 Sep 2026 (student mode): the founder opened Class 8-12 school pages to
// student sign-in, the tutor and account practice. A school container of a
// STUDENT-MODE class (NCERT_C08..C12, CISCE_C08..C12 —
// src/lib/school/student-classes.ts) may now hold an Enrollment, but ONLY
// when the caller says so with `{ school: true }` — the school flows (the
// age-band write, the chapter mock builder, the mock player / attempt start
// for a school mock) — and never for Classes 1-7. Every other caller is
// unchanged: without the flag a school row is refused exactly as before.
// Such an enrolment must reach NO exam mail loop: the audience helpers
// below (realEnrollmentExistsSql, hasRealExamEnrollment, schoolOnlyUserIds)
// are what the crons keyed on "has an active enrolment" use, so a
// school-only account is invisible to win-back, the lapse nudge, Daily-5's
// "would mail" predicate and the coach rollover — and, through
// schoolOnlyAccountSql, to the day-3 nudge, which is keyed on the User row
// alone (26 Sep 2026, fixer).

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { NOT_SCHOOL_SQL, NOT_SCHOOL_WHERE, isSchoolCategory, notSchoolSql } from "./exam-scope";
import { isStudentModeContainer } from "@/lib/school/student-classes";

export interface EnrollmentPatch {
  active?: boolean;
  targetDate?: Date | null;
  goalScore?: number | null;
  shiftDate?: Date | null;
}

export interface EnrollmentOptions {
  /** 26 Sep 2026: set by the school flows only. Allows a school container of
   *  a student-mode class (8-12); a Class 1-7 container is refused even with
   *  it, and a real exam ignores it. */
  school?: boolean;
}

/** Create the student's enrolment on a REAL exam, or update it with `patch`.
 *  Throws for a SCHOOL_BOARD container — unless `opts.school` is set by a
 *  school flow AND the container is a student-mode class (needs `code`). */
export async function ensureEnrollment(
  userId: string,
  exam: { id: string; category: string; code?: string },
  patch: EnrollmentPatch = {},
  opts: EnrollmentOptions = {},
) {
  if (isSchoolCategory(exam.category)) {
    const allowed = opts.school === true && typeof exam.code === "string" && isStudentModeContainer({ code: exam.code, category: exam.category });
    if (!allowed) {
      throw new Error(
        `enrollment refused: exam ${exam.id} is a school container (SCHOOL_BOARD)${
          opts.school ? " outside the student-mode classes (8-12)" : ""
        }`,
      );
    }
  }
  return prisma.enrollment.upsert({
    where: { userId_examId: { userId, examId: exam.id } },
    update: patch,
    create: { userId, examId: exam.id, ...patch },
  });
}

// ── Audiences (26 Sep 2026) ───────────────────────────────────────────
// "Has an active enrolment" used to be `EXISTS (SELECT 1 FROM "Enrollment"
// en WHERE en."userId" = u.id AND en.active = TRUE)` in the win-back and
// lapse-nudge selections and in Daily-5's would-mail predicate — no exam
// join, so a school-only account would have qualified for exam mail. These
// helpers say "an active enrolment on a REAL exam".

const SQL_ALIAS = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** `EXISTS (… active enrolment on a real exam for <userAlias>.id …)` as a
 *  Prisma.sql fragment for a raw selection over "User" <userAlias>. */
export function realEnrollmentExistsSql(userAlias = "u"): Prisma.Sql {
  if (!SQL_ALIAS.test(userAlias)) throw new Error(`enrollment: bad SQL alias ${JSON.stringify(userAlias)}`);
  const userId = Prisma.raw(`${userAlias}.id`);
  return Prisma.sql`EXISTS (SELECT 1 FROM "Enrollment" en JOIN "Exam" e ON e.id = en."examId" WHERE en."userId" = ${userId} AND en.active = TRUE AND ${NOT_SCHOOL_SQL})`;
}

/** True when the user holds an active enrolment on a real exam. */
export async function hasRealExamEnrollment(userId: string): Promise<boolean> {
  const n = await prisma.enrollment.count({ where: { userId, active: true, exam: NOT_SCHOOL_WHERE } });
  return n > 0;
}

/** = the container code shape (src/lib/school/student-classes.ts
 *  CONTAINER_CODE) as a Postgres regex: a school container code among
 *  onbPrepCodes is the age-band marker only the school flow writes. */
const SCHOOL_CODE_SQL_RE = "^(NCERT|CISCE)_C[0-9]{2}$";

/** `(<school-only account>)` as a Prisma.sql fragment for a raw selection
 *  over "User" <userAlias> — for the audiences keyed on the User row alone
 *  (26 Sep 2026, fixer: the day-3 nudge had no enrolment to join, so a
 *  Class 8-12 account that declared its band and then only read got the
 *  exam-prep diagnostic mail). True when the account is MARKED school — an
 *  active enrolment on a SCHOOL_BOARD container (the band write enrols),
 *  or a school container code in onbPrepCodes (the marker; kept even when
 *  the wizard later rewrites the codes) — and holds NO active enrolment on
 *  a real exam. A student who is also a real-exam aspirant is not
 *  school-only and keeps every exam mail. Use as `AND NOT ${…}`. */
export function schoolOnlyAccountSql(userAlias = "u"): Prisma.Sql {
  if (!SQL_ALIAS.test(userAlias)) throw new Error(`enrollment: bad SQL alias ${JSON.stringify(userAlias)}`);
  const userId = Prisma.raw(`${userAlias}.id`);
  const prepCodes = Prisma.raw(`${userAlias}."onbPrepCodes"`);
  return Prisma.sql`((EXISTS (SELECT 1 FROM "Enrollment" en JOIN "Exam" e ON e.id = en."examId" WHERE en."userId" = ${userId} AND en.active = TRUE AND NOT ${notSchoolSql("e")}) OR EXISTS (SELECT 1 FROM unnest(COALESCE(${prepCodes}, '{}'::text[])) c WHERE c ~ ${SCHOOL_CODE_SQL_RE})) AND NOT ${realEnrollmentExistsSql(userAlias)})`;
}

/** Of `userIds`, the ones whose active enrolments are ALL school containers
 *  (at least one) — the accounts every exam audience must drop. */
export async function schoolOnlyUserIds(userIds: readonly string[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  const rows = await prisma.$queryRaw<{ userId: string }[]>`
    SELECT DISTINCT en."userId"
    FROM "Enrollment" en JOIN "Exam" e ON e.id = en."examId"
    WHERE en."userId" = ANY(${[...userIds]}) AND en.active = TRUE AND e."category"::text = 'SCHOOL_BOARD'
      AND NOT EXISTS (
        SELECT 1 FROM "Enrollment" en2 JOIN "Exam" e2 ON e2.id = en2."examId"
        WHERE en2."userId" = en."userId" AND en2.active = TRUE AND ${notSchoolSql("e2")}
      )`;
  return rows.map((r) => r.userId);
}

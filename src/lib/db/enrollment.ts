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
import { OLYMPIAD_CATEGORY, SCHOOL_AGE_WIZARD_STAGES } from "@/lib/school-age";

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

// ── School-age accounts (2 Oct 2026, personalisation wave W1b) ─────────
// The rule and why: src/lib/school-age.ts (founder decisions PD-5, PD-16).
// "School-only" above means "holds a class container and NO real exam"; it
// misses the school student who follows an olympiad (a real exam in the
// catalogue) or who picked a school stage in the wizard and then enrolled on
// JEE or NTSE. Those accounts stay in the exam audiences that serve them
// (Daily 5, coach-morning, the alerts they asked for) and leave the three
// come-back mails — win-back, lapse nudge, evening nudge — and the quoted
// chat line. The fragment below is the SQL twin of isSchoolAge(), built from
// the same constants.

/** A code-owned name inlined as a SQL text literal (never bound, never user input). */
const SQL_NAME = /^[A-Z][A-Z0-9_]*$/;
function sqlName(v: string): string {
  if (!SQL_NAME.test(v)) throw new Error(`enrollment: bad SQL name ${JSON.stringify(v)}`);
  return `'${v}'`;
}

/** `(<school-age account>)` as a Prisma.sql fragment for a raw selection over
 *  "User" <userAlias>: ANY enrolment (active or not) on an exam whose
 *  catalogue category is OLYMPIAD or a school class container, OR a school
 *  stage in onbStage. The stored 13-17 band needs no test of its own — it is
 *  one of those stages plus a class code (schoolBandOfProfile), so the stage
 *  test already holds for it (pinned in tests/unit/mail-school-age.test.ts).
 *  COALESCE: onbStage is NULL on most accounts, and `NULL IN (…)` is NULL —
 *  under `AND NOT` that would drop every such account from the audience.
 *  Use as `AND NOT ${…}`; the aliases `en` and `e` are the fragment's own. */
export function schoolAgeAccountSql(userAlias = "u"): Prisma.Sql {
  if (!SQL_ALIAS.test(userAlias) || userAlias === "en" || userAlias === "e") {
    throw new Error(`enrollment: bad SQL alias ${JSON.stringify(userAlias)}`);
  }
  const userId = Prisma.raw(`${userAlias}.id`);
  const stage = Prisma.raw(`${userAlias}."onbStage"`);
  const olympiad = Prisma.raw(sqlName(OLYMPIAD_CATEGORY));
  const stages = Prisma.raw(SCHOOL_AGE_WIZARD_STAGES.map(sqlName).join(", "));
  return Prisma.sql`(EXISTS (SELECT 1 FROM "Enrollment" en JOIN "Exam" e ON e.id = en."examId" WHERE en."userId" = ${userId} AND (e."category"::text = ${olympiad} OR NOT ${notSchoolSql("e")})) OR COALESCE(${stage} IN (${stages}), FALSE))`;
}

/** Of `userIds`, the school-age ones. THROWS when the read fails: the caller
 *  decides what a failed read means (see schoolAgeTestFor). */
export async function schoolAgeUserIds(userIds: readonly string[]): Promise<string[]> {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return [];
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT u.id FROM "User" u WHERE u.id = ANY(${ids}) AND ${schoolAgeAccountSql("u")}`;
  return rows.map((r) => r.id);
}

/** For one mail batch: "is this account school age?" — one read for the whole
 *  batch. FAILS CLOSED: when the read fails, every account in the batch is
 *  answered true for this run, so a safeguard is never skipped because the
 *  database hiccupped (the mail goes out without the quoted line). */
export async function schoolAgeTestFor(userIds: readonly string[]): Promise<(userId: string) => boolean> {
  try {
    const set = new Set(await schoolAgeUserIds(userIds));
    return (userId) => set.has(userId);
  } catch (err) {
    console.error("[school-age] read failed — the whole batch is treated as school age:", err);
    return () => true;
  }
}

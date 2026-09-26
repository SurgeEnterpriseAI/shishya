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

import { prisma } from "./prisma";
import { isSchoolCategory } from "./exam-scope";

export interface EnrollmentPatch {
  active?: boolean;
  targetDate?: Date | null;
  goalScore?: number | null;
  shiftDate?: Date | null;
}

/** Create the student's enrolment on a REAL exam, or update it with `patch`.
 *  Throws for a SCHOOL_BOARD container. */
export async function ensureEnrollment(
  userId: string,
  exam: { id: string; category: string },
  patch: EnrollmentPatch = {},
) {
  if (isSchoolCategory(exam.category)) {
    throw new Error(`enrollment refused: exam ${exam.id} is a school container (SCHOOL_BOARD)`);
  }
  return prisma.enrollment.upsert({
    where: { userId_examId: { userId, examId: exam.id } },
    update: patch,
    create: { userId, examId: exam.id, ...patch },
  });
}

// /api/me/exams/[code] — the student takes an exam off their list, or puts
// it back (7 Oct 2026, inbox fix B5). A student asked on 20 Sep "how to
// remove an exam that you don't need"; until now only the welcome strip's
// "Change exam" could drop one, and only an untouched sign-up goal.
//
// DELETE → { ok, removed, exam }: the signed-in student's OWN enrolment on
//          this exam is turned off (src/lib/db/enrollment.ts removeEnrollment
//          — the row is kept, active = FALSE). It leaves the dashboard list,
//          Daily 5's topic pick and every exam mail keyed on an active
//          enrolment. Idempotent: again, or for an exam they never held,
//          removed: false.
// POST   → { ok, restored, exam }: the dashboard's Undo — the same row back
//          on. Never creates an enrolment; that stays with the enrol doors.
// Whose: the row is found by (session user, exam) — no id from the client —
//        so a request can only ever reach the caller's own enrolment.
// What stays: every attempt, score and weakness row (none hangs off an
//        Enrollment row) and the row itself (shift day, target date, goal).
// A school class container is not an exam a student lists: its code is a
//        404 here (realExamKey), like every other exam door.
// No model call. Route files export handlers only.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { realExamKey } from "@/lib/db/exam-scope";
import { removeEnrollment, restoreEnrollment } from "@/lib/db/enrollment";
import { notFound, ok, serverError, unauth } from "@/lib/http";

type Ctx = { params: Promise<{ code: string }> };

/** The signed-in user and the real exam named in the URL, or the error response. */
async function resolve(ctx: Ctx): Promise<{ userId: string; exam: { id: string; code: string; shortName: string } } | Response> {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) return unauth();
  const { code } = await ctx.params;
  if (!code || code.length > 60) return notFound("exam");
  const exam = await prisma.exam.findUnique({
    where: realExamKey({ code }),
    select: { id: true, code: true, shortName: true },
  });
  if (!exam) return notFound("exam");
  return { userId, exam };
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const r = await resolve(ctx);
    if (r instanceof Response) return r;
    const removed = await removeEnrollment(r.userId, r.exam.id);
    return ok({ ok: true, removed, exam: { code: r.exam.code, shortName: r.exam.shortName } });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const r = await resolve(ctx);
    if (r instanceof Response) return r;
    const restored = await restoreEnrollment(r.userId, r.exam.id);
    return ok({ ok: true, restored, exam: { code: r.exam.code, shortName: r.exam.shortName } });
  } catch (err) {
    return serverError(err);
  }
}

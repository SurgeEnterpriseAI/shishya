// /api/me/welcome — the one-time "Your Shishya is ready" strip (30 Sep 2026,
// sign-up build 2; rules in src/lib/welcome-strip.ts).
//
// GET  → WelcomeData. show:false unless the signed-in account is under
//        WELCOME_WINDOW_MS old, is not school-only (a Class 8-12 school
//        account never gets the exam strip) and has no "welcome-strip"
//        beacon yet — the server-side "shown once". The island asks only
//        when the one-time cookie createUser set is present.
// POST { to, from? } → the strip's "Change exam": enrols the account on
//        `to` (a real, active exam, through the one enrolment door), and
//        removes `from` ONLY when it is the goal createUser wrote at
//        sign-up (made within SIGNUP_GOAL_GRACE_MS of the account), the
//        student has never started a mock on it and never set a date or
//        goal on it — so a wrong guess stops its exam mails, and nothing
//        the student built is touched. Answers the new exam's practice and
//        Daily-5 mail flags by the same rule as GET, so the strip's lines
//        follow the pick.
//        30 Sep 2026 (review): the row is DELETED, not set active: false.
//        Every mock / attempt path re-enrols through ensureEnrollment with
//        an empty patch (update: {}), which would have left an inactive
//        row inactive for good — the hub's history, the dashboard, Daily 5
//        and every exam mail skip active = FALSE. Nothing references an
//        Enrollment row (only User / Exam cascade onto it), and a later
//        ensureEnrollment creates a fresh one, active by default.
//        7 Oct 2026 (B5): the attempt paths now pass active: true (a
//        student's own "Remove" keeps the row inactive — /api/me/exams);
//        this untouched sign-up guess is still deleted, as above.
// No model call. Route files export handlers only.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { NOT_SCHOOL_WHERE, SCHOOL_CATEGORY, realExamKey } from "@/lib/db/exam-scope";
import { ensureEnrollment } from "@/lib/db/enrollment";
import { practiceExamCodes } from "@/lib/db/exam-practice";
import { bad, notFound, ok, parseBody, serverError, unauth } from "@/lib/http";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { SIGNUP_GOAL_GRACE_MS, WELCOME_CTA, withinWelcomeWindow, type WelcomeData } from "@/lib/welcome-strip";

const HIDDEN: WelcomeData = { show: false, exam: null, practice: false, dailyFiveEmail: false, challenges: 0, alerts: 0 };

/** The strip's Daily 5 flags for one exam: practice (a set on /today) and
 *  the morning mail (practice + an email + not opted out). A failed
 *  practice read promises nothing. */
async function dailyFlags(
  code: string | null,
  user: { email: string | null; emailOptOut: boolean },
): Promise<{ practice: boolean; dailyFiveEmail: boolean }> {
  if (!code) return { practice: false, dailyFiveEmail: false };
  const codes = await practiceExamCodes();
  const practice = codes?.has(code) === true;
  return { practice, dailyFiveEmail: practice && !!user.email && !user.emailOptOut };
}

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;
    if (!userId) return ok(HIDDEN);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, email: true, emailOptOut: true },
    });
    if (!user || !withinWelcomeWindow(user.createdAt, Date.now())) return ok(HIDDEN);

    const [shown, goal, schoolRows, counts] = await Promise.all([
      prisma.analyticsEvent.count({
        where: { userId, kind: "CTA_CLICKED", createdAt: { gte: user.createdAt }, props: { path: ["cta"], equals: WELCOME_CTA } },
      }),
      prisma.enrollment.findFirst({
        where: { userId, active: true, exam: NOT_SCHOOL_WHERE },
        orderBy: { createdAt: "desc" },
        select: { exam: { select: { code: true, shortName: true } } },
      }),
      prisma.enrollment.count({ where: { userId, active: true, exam: { category: SCHOOL_CATEGORY } } }),
      prisma.$queryRaw<{ challenges: number; alerts: number }[]>`
        SELECT
          (SELECT COUNT(*)::int FROM "Challenge" WHERE "creatorUserId" = ${userId} AND "expiresAt" > NOW()) AS challenges,
          (SELECT COUNT(*)::int FROM "ExamAlert" WHERE "userId" = ${userId} AND "unsubscribedAt" IS NULL) AS alerts`,
    ]);
    if (shown > 0) return ok(HIDDEN);
    // A school-only account (a class container, no real exam): no exam strip.
    if (schoolRows > 0 && !goal) return ok(HIDDEN);

    const exam = goal ? { code: goal.exam.code, shortName: goal.exam.shortName } : null;
    // "Daily 5" (the headline) promises a set on /today, the mail line also
    // the morning mail: only for an exam with practice (pickDailyFive and the
    // daily-five cron skip one without — src/lib/db/exam-practice.ts) and,
    // for the mail, an account it can reach.
    const data: WelcomeData = {
      show: true,
      exam,
      ...(await dailyFlags(exam?.code ?? null, user)),
      challenges: counts[0]?.challenges ?? 0,
      alerts: counts[0]?.alerts ?? 0,
    };
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}

const Body = z.object({
  to: z.string().min(2).max(40),
  from: z.string().min(2).max(40).nullish(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;
    if (!userId) return unauth();
    const rl = await checkRateLimit("examGoal", `goal:${userId}`);
    if (!rl.ok) return rateLimited(rl);
    const body = await parseBody(req, Body);

    const to = await prisma.exam.findUnique({
      where: realExamKey({ code: body.to }),
      select: { id: true, code: true, shortName: true, category: true, active: true },
    });
    if (!to || !to.active) return notFound("exam");
    await ensureEnrollment(userId, to, { active: true });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true, email: true, emailOptOut: true } });

    let dropped = false;
    if (user && body.from && body.from !== to.code) {
      const from = await prisma.exam.findUnique({ where: realExamKey({ code: body.from }), select: { id: true, code: true, category: true } });
      if (from) {
        const [enrolment, attempts] = await Promise.all([
          prisma.enrollment.findUnique({ where: { userId_examId: { userId, examId: from.id } }, select: { active: true, createdAt: true } }),
          prisma.attempt.count({ where: { userId, mock: { examId: from.id } } }),
        ]);
        const signupGoal =
          !!enrolment && enrolment.active &&
          Math.abs(enrolment.createdAt.getTime() - user.createdAt.getTime()) <= SIGNUP_GOAL_GRACE_MS;
        if (signupGoal && attempts === 0) {
          // Only the untouched row: a shift day, target date or goal score
          // the student set in the meantime keeps it.
          const r = await prisma.enrollment.deleteMany({
            where: { userId, examId: from.id, shiftDate: null, targetDate: null, goalScore: null },
          });
          dropped = r.count > 0;
        }
      }
    }
    const flags = await dailyFlags(to.code, { email: user?.email ?? null, emailOptOut: user?.emailOptOut ?? true });
    return ok({ ok: true, exam: { code: to.code, shortName: to.shortName }, dropped, ...flags });
  } catch (err: any) {
    if (err?.status === 400) return bad(String(err.message ?? "Invalid body"));
    return serverError(err);
  }
}

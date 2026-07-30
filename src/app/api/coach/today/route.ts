// GET /api/coach/today — the signed-in student's plan for today with
// per-task done flags. Powers the "next on today's plan" breadcrumb
// that keeps the coach's chain unbroken: finish a task anywhere on the
// site and the next one is one tap away.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { computeCoachPlan } from "@/lib/coach-plan";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ hasPlan: false });
  const userId = session.user.id;

  const plan = await computeCoachPlan(userId).catch(() => null);
  if (!plan) return Response.json({ hasPlan: false });

  const dayStart = new Date(
    Math.floor((Date.now() + 5.5 * 3600_000) / 86_400_000) * 86_400_000 - 5.5 * 3600_000,
  );

  // Today's actual activity, for done-detection.
  const [topicsToday, attemptsToday] = await Promise.all([
    prisma.$queryRaw<{ code: string }[]>`
      SELECT t.code FROM "TopicStudyState" ts JOIN "Topic" t ON t.id = ts."topicId"
      WHERE ts."userId" = ${userId}
        AND (ts."readAt" >= ${dayStart} OR ts."completedAt" >= ${dayStart})`.catch(() => []),
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(*) n FROM "Attempt"
      WHERE "userId" = ${userId} AND "startedAt" >= ${dayStart}
        AND status IN ('SUBMITTED','AUTO_SUBMITTED')`.catch(() => [{ n: BigInt(0) }]),
  ]);
  const touchedTopics = new Set(topicsToday.map((t) => t.code));
  const anyMockToday = Number(attemptsToday[0]?.n ?? 0) > 0;

  const tasks = plan.todayTasks.map((t) => {
    const m = t.href.match(/\/topics\/([^/?#]+)/);
    const done = m
      ? touchedTopics.has(decodeURIComponent(m[1]))
      : t.kind === "daily5" || t.kind === "mock" || t.kind === "livetest" || t.kind === "test"
        ? anyMockToday
        : false;
    return { ...t, done };
  });

  return Response.json({
    hasPlan: true,
    examCode: plan.examCode,
    examShort: plan.examShort,
    dayNumber: plan.dayNumber,
    totalDays: plan.totalDays,
    daysLeft: plan.daysLeft,
    allDone: tasks.every((t) => t.done),
    tasks,
  });
}

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

  // Today's actual activity, for done-detection. Attempts carry their
  // mock's type + generatedBy so each task matches only the RIGHT kind
  // of attempt — a 10-question topic drill must not tick off the
  // full-length mock (audit 18 Aug 2026).
  const [topicsToday, attemptsToday] = await Promise.all([
    prisma.$queryRaw<{ code: string }[]>`
      SELECT t.code FROM "TopicStudyState" ts JOIN "Topic" t ON t.id = ts."topicId"
      WHERE ts."userId" = ${userId}
        AND (ts."readAt" >= ${dayStart} OR ts."completedAt" >= ${dayStart})`.catch(() => []),
    prisma.$queryRaw<{ type: string; generatedBy: string | null }[]>`
      SELECT m.type::text AS type, m."generatedBy"
      FROM "Attempt" a JOIN "Mock" m ON m.id = a."mockId"
      WHERE a."userId" = ${userId} AND a."startedAt" >= ${dayStart}
        AND a.status IN ('SUBMITTED','AUTO_SUBMITTED')`.catch(() => []),
  ]);
  const touchedTopics = new Set(topicsToday.map((t) => t.code));
  const fullMockToday = attemptsToday.some((a) => a.type === "FULL" && a.generatedBy !== "live-test");
  const liveTestToday = attemptsToday.some((a) => a.generatedBy === "live-test");
  // daily5 / generic "did you practise" stays lenient — any submitted
  // attempt keeps the momentum task ticked.
  const anyAttemptToday = attemptsToday.length > 0;

  const tasks = plan.todayTasks.map((t) => {
    const m = t.href.match(/\/topics\/([^/?#]+)/);
    let done = false;
    if (m) {
      done = touchedTopics.has(decodeURIComponent(m[1]));
    } else if (t.kind === "mock") {
      done = fullMockToday;
    } else if (t.kind === "livetest") {
      done = liveTestToday;
    } else if (t.kind === "daily5") {
      done = anyAttemptToday;
    } else if (t.kind === "test") {
      // A weak-topic revise task with no /topics/ href — any attempt is
      // a reasonable proxy that they practised.
      done = anyAttemptToday;
    }
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

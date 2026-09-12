// GET /api/coach/today — the signed-in student's plan for today with
// per-task done flags. Powers the "next on today's plan" breadcrumb
// that keeps the coach's chain unbroken: finish a task anywhere on the
// site and the next one is one tap away.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { computeCoachPlan, DRILL_HREF_PREFIX } from "@/lib/coach-plan";

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
    // coachTopic = the topic a coach drill (/api/coach/today/drill) was
    // assigned for — set even when the questions came from the subject
    // or exam pool; topics = every topic the attempt's questions sat on.
    prisma.$queryRaw<
      { type: string; generatedBy: string | null; coachTopic: string | null; topics: string[] }[]
    >`
      SELECT m.type::text AS type, m."generatedBy",
             m.config->>'coachTopic' AS "coachTopic",
             ARRAY(SELECT DISTINCT t.code FROM "Question" q JOIN "Topic" t ON t.id = q."topicId"
                    WHERE q.id = ANY(m."questionIds")) AS topics
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
    const drill = t.href.startsWith(DRILL_HREF_PREFIX)
      ? new URLSearchParams(t.href.slice(DRILL_HREF_PREFIX.length)).get("topic")
      : null;
    const m = t.href.match(/\/topics\/([^/?#]+)/);
    let done = false;
    if (drill) {
      // A coach drill for a topic whose notes are not ready: a submitted
      // drill assigned for THIS topic — or any submitted mock today that
      // actually covered it — counts. (TopicStudyState is never stamped
      // for a notes-less topic: that would open a second road to the
      // empty page via the dashboard's "continue where you left off".)
      done = attemptsToday.some((a) => a.coachTopic === drill || (a.topics ?? []).includes(drill));
    } else if (m) {
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

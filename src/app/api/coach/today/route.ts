// GET /api/coach/today — the signed-in student's plan for today with
// per-task done flags. Powers the "next on today's plan" breadcrumb
// that keeps the coach's chain unbroken: finish a task anywhere on the
// site and the next one is one tap away.
//
// Done-detection lives in src/lib/coach-done.ts (16 Sep 2026), shared with
// /coach and the dashboard strip, so the breadcrumb and the plan can never
// disagree about what is done.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { computeCoachPlan } from "@/lib/coach-plan";
import { coachTaskDoneFlags } from "@/lib/coach-done";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ hasPlan: false });
  const userId = session.user.id;

  const plan = await computeCoachPlan(userId).catch(() => null);
  if (!plan) return Response.json({ hasPlan: false });

  const done = await coachTaskDoneFlags(userId, plan.todayTasks).catch(() => plan.todayTasks.map(() => false));
  const tasks = plan.todayTasks.map((t, i) => ({ ...t, done: done[i] ?? false }));

  return Response.json({
    hasPlan: true,
    examCode: plan.examCode,
    examShort: plan.examShort,
    dayNumber: plan.dayNumber,
    totalDays: plan.totalDays,
    daysLeft: plan.daysLeft,
    phase: plan.phase,
    allDone: tasks.length > 0 && tasks.every((t) => t.done),
    tasks,
  });
}

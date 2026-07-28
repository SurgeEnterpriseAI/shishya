// The Personal Coach plan engine — the free replacement for what a
// ₹50,000 coaching institute actually sells: someone who looks at how
// many days you have left, what you've actually done, and tells you
// exactly what to do TODAY.
//
// Design principles (product soul — do not violate in copy or code):
//   • The plan is ALWAYS "the best possible from today". There is no
//     backlog and no guilt: missing a day just means today's plan is
//     rebuilt from reality. Fresh-start psychology, every morning.
//   • Deterministic math, not AI: instant, free at any scale, and
//     explainable — the plan can always say WHY.
//   • Triage is transparent: when time runs short we openly DROP
//     low-value topics and say so. That's what a great coach does.
//
// Priority score per remaining topic:
//   priority = subjectWeight × (1 − mastery) − untouched topics count
//   as mastery 0 (highest need), completed topics leave the pool.

import { prisma } from "@/lib/db/prisma";

export interface CoachTask {
  kind: "read" | "test" | "daily5" | "livetest" | "mock";
  label: string;
  href: string;
}

export interface ComputedPlan {
  examCode: string;
  examShort: string;
  examDateIso: string;
  dayNumber: number; // day N since the plan was created (1-based)
  totalDays: number; // createdAt → examDate
  daysLeft: number;
  phase: "cover" | "strengthen" | "final";
  status: "fresh" | "on-track" | "rebuilt";
  todayTasks: CoachTask[];
  progress: { covered: number; total: number; mastered: number };
  triage: { dropped: number; examples: string[] } | null;
  dailyMinutes: number;
}

const DAY_MS = 86_400_000;
/** IST day number for consistent "day" boundaries. */
function istDay(t: Date | number): number {
  return Math.floor(((typeof t === "number" ? t : t.getTime()) + 5.5 * 3600_000) / DAY_MS);
}

function topicsPerDay(dailyMinutes: number): number {
  // One topic loop ≈ read notes (~15m) + 10-Q test (~15m) + review (~10m).
  if (dailyMinutes >= 180) return 3;
  if (dailyMinutes >= 90) return 2;
  return 1;
}

export async function computeCoachPlan(userId: string): Promise<ComputedPlan | null> {
  const plans = await prisma.$queryRaw<
    { id: string; examId: string; examDate: Date; dailyMinutes: number; createdAt: Date; code: string; short: string }[]
  >`
    SELECT cp.id, cp."examId", cp."examDate", cp."dailyMinutes", cp."createdAt",
           e.code, e."shortName" AS short
    FROM "CoachPlan" cp JOIN "Exam" e ON e.id = cp."examId"
    WHERE cp."userId" = ${userId}
    ORDER BY cp."updatedAt" DESC LIMIT 1`;
  const plan = plans[0];
  if (!plan) return null;

  const today = istDay(Date.now());
  const daysLeft = Math.max(0, istDay(plan.examDate) - today);
  const dayNumber = Math.max(1, today - istDay(plan.createdAt) + 1);
  const totalDays = Math.max(1, istDay(plan.examDate) - istDay(plan.createdAt));

  // Full topic pool with subject weight + the student's reality.
  const topics = await prisma.$queryRaw<
    { code: string; name: string; weight: number; mastery: number | null; read: boolean; completed: boolean }[]
  >`
    SELECT t.code, t.name, s.weight,
           w."masteryScore" AS mastery,
           (ts."readAt" IS NOT NULL) AS read,
           (ts."completedAt" IS NOT NULL) AS completed
    FROM "Topic" t
    JOIN "Subject" s ON s.id = t."subjectId" AND s."examId" = ${plan.examId}
    LEFT JOIN "WeaknessMap" w ON w."topicId" = t.id AND w."userId" = ${userId}
    LEFT JOIN "TopicStudyState" ts ON ts."topicId" = t.id AND ts."userId" = ${userId}`;

  const done = (t: { completed: boolean; mastery: number | null }) =>
    t.completed || (t.mastery ?? 0) >= 0.7;
  const remaining = topics
    .filter((t) => !done(t))
    .map((t) => ({ ...t, priority: t.weight * (1 - (t.mastery ?? 0)) }))
    .sort((a, b) => b.priority - a.priority || a.code.localeCompare(b.code));

  // Phase by time left.
  const phase: ComputedPlan["phase"] = daysLeft > 14 ? "cover" : daysLeft > 7 ? "strengthen" : "final";

  // Capacity vs need → transparent triage. The last stretch (20% of
  // remaining days, max 7) is reserved for revision + full mocks.
  const reserve = Math.min(7, Math.ceil(daysLeft * 0.2));
  const slots = Math.max(0, (daysLeft - reserve) * topicsPerDay(plan.dailyMinutes));
  let triage: ComputedPlan["triage"] = null;
  let pool = remaining;
  if (remaining.length > slots && daysLeft > 0) {
    const kept = remaining.slice(0, Math.max(slots, topicsPerDay(plan.dailyMinutes)));
    const droppedList = remaining.slice(kept.length);
    pool = kept;
    triage = {
      dropped: droppedList.length,
      examples: droppedList.slice(-4).map((t) => t.name),
    };
  }

  // Did yesterday see any real work? (Any attempt or topic touch.)
  const yStart = new Date((today - 1) * DAY_MS - 5.5 * 3600_000);
  const yEnd = new Date(today * DAY_MS - 5.5 * 3600_000);
  const activity = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT (SELECT COUNT(*) FROM "Attempt" WHERE "userId" = ${userId}
             AND "startedAt" >= ${yStart} AND "startedAt" < ${yEnd})
         + (SELECT COUNT(*) FROM "TopicStudyState" WHERE "userId" = ${userId}
             AND ("readAt" >= ${yStart} AND "readAt" < ${yEnd}
                  OR "completedAt" >= ${yStart} AND "completedAt" < ${yEnd})) AS n`;
  const workedYesterday = Number(activity[0]?.n ?? 0) > 0;
  const status: ComputedPlan["status"] =
    dayNumber <= 1 ? "fresh" : workedYesterday ? "on-track" : "rebuilt";

  // Today's tasks.
  const perDay = topicsPerDay(plan.dailyMinutes);
  const todayTasks: CoachTask[] = [];
  if (phase === "final") {
    todayTasks.push({
      kind: "mock",
      label: `Full ${plan.short} mock — exam-length, exam-silence`,
      href: `/exams/${plan.code}`,
    });
    for (const t of pool.slice(0, Math.max(1, perDay - 1))) {
      todayTasks.push({
        kind: "test",
        label: `Revise weak topic: ${t.name}`,
        href: `/exams/${plan.code}/topics/${encodeURIComponent(t.code)}`,
      });
    }
  } else {
    for (const t of pool.slice(0, perDay)) {
      todayTasks.push({
        kind: "read",
        label: `${t.name} — read the notes, then test yourself (10 Qs)`,
        href: `/exams/${plan.code}/topics/${encodeURIComponent(t.code)}`,
      });
    }
    todayTasks.push({ kind: "daily5", label: "Daily 5 — keep the streak", href: "/dashboard" });
  }
  // Sunday = All-India Live Test day (IST). istDay 0 = 1 Jan 1970 (Thu),
  // so day % 7 === 3 is Sunday.
  if (today % 7 === 3) {
    todayTasks.unshift({
      kind: "livetest",
      label: "🇮🇳 All-India Live Test — today's paper, national rank",
      href: "/live-test",
    });
  }

  const covered = topics.filter((t) => t.read || t.completed || (t.mastery ?? 0) > 0).length;
  const mastered = topics.filter((t) => done(t)).length;

  return {
    examCode: plan.code,
    examShort: plan.short,
    examDateIso: plan.examDate.toISOString().slice(0, 10),
    dayNumber,
    totalDays,
    daysLeft,
    phase,
    status,
    todayTasks: todayTasks.slice(0, 4),
    progress: { covered, total: topics.length, mastered },
    triage,
    dailyMinutes: plan.dailyMinutes,
  };
}

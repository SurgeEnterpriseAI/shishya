// The Personal Coach — free replacement for what a ₹50,000 coaching
// institute actually sells: someone who looks at your days left, what
// you actually did, and tells you exactly what to do TODAY.
//
// Two-layer architecture:
//   • Deterministic skeleton (this file, pure math): syllabus weights ×
//     weakness × time left → candidate tasks, triage, progress. Instant,
//     free, explainable — and the always-available fallback.
//   • AI night-brain (generateCoachDay, run by the 4 AM IST cron while
//     the student sleeps): Claude reads the student's full persona —
//     score trajectories, tutor conversations, abandoned mocks, streak —
//     and picks + arranges today's tasks FROM the validated candidate
//     menu, plus writes the coach's personal morning note. Stored in
//     CoachDay; the dashboard reads it instantly at login.
//
// Product soul (do not violate in copy or code): the plan is ALWAYS
// "the best possible from today". No backlog, no guilt. Triage is
// transparent strategy, not loss.

import { prisma } from "@/lib/db/prisma";
import { callClaude, cachedSystem, parseJson, MODEL } from "@/lib/ai/client";

export interface CoachTask {
  kind: "read" | "test" | "daily5" | "livetest" | "mock";
  label: string;
  href: string;
}

export interface ComputedPlan {
  examCode: string;
  examShort: string;
  examDateIso: string;
  dayNumber: number;
  totalDays: number;
  daysLeft: number;
  // "exam-day" = the exam is today (a send-off, not a study day);
  // "post-exam" = the exam date has passed (the plan is over — we ask
  // how it went instead of assigning more mocks). Both were a permanent
  // "Day N · 0 days left" trap before (audit 18 Aug 2026).
  phase: "cover" | "strengthen" | "final" | "exam-day" | "post-exam";
  status: "fresh" | "on-track" | "rebuilt";
  todayTasks: CoachTask[];
  progress: { covered: number; total: number; mastered: number };
  triage: { dropped: number; examples: string[] } | null;
  dailyMinutes: number;
  /** The AI coach's morning note (present when the night cron planned today). */
  note: string | null;
  aiPlanned: boolean;
}

const DAY_MS = 86_400_000;
function istDay(t: Date | number): number {
  return Math.floor(((typeof t === "number" ? t : t.getTime()) + 5.5 * 3600_000) / DAY_MS);
}
/** Date (UTC midnight) representing today's IST calendar day — the
 *  CoachDay.date key. */
function istToday(): Date {
  return new Date(istDay(Date.now()) * DAY_MS);
}

function topicsPerDay(dailyMinutes: number): number {
  if (dailyMinutes >= 180) return 3;
  if (dailyMinutes >= 90) return 2;
  return 1;
}

// ── Context: everything both layers need, loaded once ─────────────────

interface PlanContext {
  userId: string;
  examId: string;
  examCode: string;
  examShort: string;
  examDate: Date;
  dailyMinutes: number;
  dayNumber: number;
  totalDays: number;
  daysLeft: number;
  phase: ComputedPlan["phase"];
  status: ComputedPlan["status"];
  progress: ComputedPlan["progress"];
  triage: ComputedPlan["triage"];
  /** Remaining topics, priority-sorted, post-triage. */
  pool: { code: string; name: string; mastery: number | null; priority: number }[];
  isSunday: boolean;
}

async function loadPlanContext(userId: string): Promise<PlanContext | null> {
  const plans = await prisma.$queryRaw<
    { examId: string; examDate: Date; dailyMinutes: number; createdAt: Date; code: string; short: string }[]
  >`
    SELECT cp."examId", cp."examDate", cp."dailyMinutes", cp."createdAt",
           e.code, e."shortName" AS short
    FROM "CoachPlan" cp JOIN "Exam" e ON e.id = cp."examId"
    WHERE cp."userId" = ${userId}
    ORDER BY cp."updatedAt" DESC LIMIT 1`;
  const plan = plans[0];
  if (!plan) return null;

  const today = istDay(Date.now());
  const rawDaysLeft = istDay(plan.examDate) - today; // signed: <0 = exam passed
  const daysLeft = Math.max(0, rawDaysLeft);
  const dayNumber = Math.max(1, today - istDay(plan.createdAt) + 1);
  const totalDays = Math.max(1, istDay(plan.examDate) - istDay(plan.createdAt));

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

  const phase: ComputedPlan["phase"] =
    rawDaysLeft < 0
      ? "post-exam"
      : rawDaysLeft === 0
        ? "exam-day"
        : daysLeft > 14
          ? "cover"
          : daysLeft > 7
            ? "strengthen"
            : "final";

  const reserve = Math.min(7, Math.ceil(daysLeft * 0.2));
  const slots = Math.max(0, (daysLeft - reserve) * topicsPerDay(plan.dailyMinutes));
  let triage: ComputedPlan["triage"] = null;
  let pool = remaining;
  if (remaining.length > slots && daysLeft > 0) {
    const kept = remaining.slice(0, Math.max(slots, topicsPerDay(plan.dailyMinutes)));
    const droppedList = remaining.slice(kept.length);
    pool = kept;
    triage = { dropped: droppedList.length, examples: droppedList.slice(-4).map((t) => t.name) };
  }

  const yStart = new Date((today - 1) * DAY_MS - 5.5 * 3600_000);
  const yEnd = new Date(today * DAY_MS - 5.5 * 3600_000);
  const activity = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT (SELECT COUNT(*) FROM "Attempt" WHERE "userId" = ${userId}
             AND "startedAt" >= ${yStart} AND "startedAt" < ${yEnd})
         + (SELECT COUNT(*) FROM "TopicStudyState" WHERE "userId" = ${userId}
             AND ("readAt" >= ${yStart} AND "readAt" < ${yEnd}
                  OR "completedAt" >= ${yStart} AND "completedAt" < ${yEnd})) AS n`;
  const workedYesterday = Number(activity[0]?.n ?? 0) > 0;

  return {
    userId,
    examId: plan.examId,
    examCode: plan.code,
    examShort: plan.short,
    examDate: plan.examDate,
    dailyMinutes: plan.dailyMinutes,
    dayNumber,
    totalDays,
    daysLeft,
    phase,
    status: dayNumber <= 1 ? "fresh" : workedYesterday ? "on-track" : "rebuilt",
    progress: {
      covered: topics.filter((t) => t.read || t.completed || (t.mastery ?? 0) > 0).length,
      total: topics.length,
      mastered: topics.filter((t) => done(t)).length,
    },
    triage,
    pool: pool.map(({ code, name, mastery, priority }) => ({ code, name, mastery, priority })),
    isSunday: today % 7 === 3, // epoch day 0 = Thu → 3 = Sun
  };
}

// ── Task construction from stable ids (shared by both layers) ─────────

function taskFromId(ctx: PlanContext, id: string): CoachTask | null {
  if (id === "examday")
    return {
      kind: "read",
      label: `Today is your ${ctx.examShort} exam. Carry your admit card & ID, reach early, stay calm — you've prepared for this. Go get it. 🇮🇳`,
      href: `/exams/${ctx.examCode}`,
    };
  if (id === "postexam")
    return {
      kind: "read",
      label: `Your ${ctx.examShort} exam is done — how did it go? Tell us, and we'll set up what's next.`,
      href: `/me/report?exam-done=1`,
    };
  if (id === "daily5") return { kind: "daily5", label: "Daily 5 — keep the streak", href: "/dashboard" };
  if (id === "livetest")
    return ctx.isSunday
      ? { kind: "livetest", label: "🇮🇳 All-India Live Test — today's paper, national rank", href: "/live-test" }
      : null;
  if (id === "fullmock")
    return { kind: "mock", label: `Full ${ctx.examShort} mock — exam-length, exam-silence`, href: `/exams/${ctx.examCode}` };
  const m = id.match(/^(read|revise):(.+)$/);
  if (m) {
    const t = ctx.pool.find((p) => p.code === m[2]);
    if (!t) return null;
    return {
      kind: m[1] === "read" ? "read" : "test",
      label:
        m[1] === "read"
          ? `${t.name} — read the notes, then test yourself (10 Qs)`
          : `Revise weak topic: ${t.name}`,
      href: `/exams/${ctx.examCode}/topics/${encodeURIComponent(t.code)}`,
    };
  }
  return null;
}

function deterministicTaskIds(ctx: PlanContext): string[] {
  const per = topicsPerDay(ctx.dailyMinutes);
  const ids: string[] = [];
  // Terminal phases don't assign study work — no Sunday live test, no
  // mock on the morning of the exam (audit 18 Aug 2026).
  if (ctx.phase === "exam-day") return ["examday"];
  if (ctx.phase === "post-exam") return ["postexam"];
  if (ctx.isSunday) ids.push("livetest");
  if (ctx.phase === "final") {
    ids.push("fullmock");
    for (const t of ctx.pool.slice(0, Math.max(1, per - 1))) ids.push(`revise:${t.code}`);
  } else {
    for (const t of ctx.pool.slice(0, per)) ids.push(`read:${t.code}`);
    ids.push("daily5");
  }
  return ids.slice(0, 4);
}

function toComputedPlan(
  ctx: PlanContext,
  tasks: CoachTask[],
  note: string | null,
  aiPlanned: boolean,
): ComputedPlan {
  return {
    examCode: ctx.examCode,
    examShort: ctx.examShort,
    examDateIso: ctx.examDate.toISOString().slice(0, 10),
    dayNumber: ctx.dayNumber,
    totalDays: ctx.totalDays,
    daysLeft: ctx.daysLeft,
    phase: ctx.phase,
    status: ctx.status,
    todayTasks: tasks,
    progress: ctx.progress,
    triage: ctx.triage,
    dailyMinutes: ctx.dailyMinutes,
    note,
    aiPlanned,
  };
}

// ── Layer 1: what the dashboard calls (instant) ───────────────────────

export async function computeCoachPlan(userId: string): Promise<ComputedPlan | null> {
  const ctx = await loadPlanContext(userId);
  if (!ctx) return null;

  // The night-brain's plan for today, if it ran.
  const day = await prisma.$queryRaw<{ tasks: any; note: string | null }[]>`
    SELECT tasks, note FROM "CoachDay"
    WHERE "userId" = ${userId} AND date = ${istToday()} LIMIT 1`;
  if (day[0] && Array.isArray(day[0].tasks) && day[0].tasks.length > 0) {
    const tasks = (day[0].tasks as CoachTask[]).filter(
      (t) => t && typeof t.label === "string" && typeof t.href === "string",
    );
    if (tasks.length) return toComputedPlan(ctx, tasks.slice(0, 4), day[0].note, true);
  }

  // Deterministic fallback — the coach always shows up.
  const tasks = deterministicTaskIds(ctx)
    .map((id) => taskFromId(ctx, id))
    .filter((t): t is CoachTask => Boolean(t));
  return toComputedPlan(ctx, tasks, null, false);
}

// ── Layer 2: the AI night-brain (cron, while the student sleeps) ──────

async function personaPacket(ctx: PlanContext): Promise<string> {
  const [attempts, tutorAsks, abandoned] = await Promise.all([
    prisma.$queryRaw<{ title: string; type: string; pct: number | null; d: Date }[]>`
      SELECT m.title, m.type, a."scorePct" AS pct, a."finishedAt" AS d
      FROM "Attempt" a JOIN "Mock" m ON m.id = a."mockId"
      WHERE a."userId" = ${ctx.userId} AND a.status IN ('SUBMITTED','AUTO_SUBMITTED')
      ORDER BY a."finishedAt" DESC LIMIT 6`,
    prisma.$queryRaw<{ c: string }[]>`
      SELECT LEFT(content, 90) AS c FROM "ChatMessage"
      WHERE role::text ILIKE 'user'
        AND "sessionId" IN (SELECT id FROM "ChatSession" WHERE "userId" = ${ctx.userId})
        AND "createdAt" > NOW() - INTERVAL '4 days'
      ORDER BY "createdAt" DESC LIMIT 4`,
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(*) n FROM "Attempt"
      WHERE "userId" = ${ctx.userId} AND status = 'IN_PROGRESS'
        AND "startedAt" > NOW() - INTERVAL '3 days'`,
  ]);

  const lines: string[] = [
    `Exam: ${ctx.examShort} · ${ctx.daysLeft} days left (day ${ctx.dayNumber} of plan) · phase: ${ctx.phase} · daily time: ${ctx.dailyMinutes} min`,
    `Worked yesterday: ${ctx.status === "on-track" ? "yes" : ctx.status === "fresh" ? "first day" : "no"}`,
    `Syllabus: ${ctx.progress.covered}/${ctx.progress.total} touched, ${ctx.progress.mastered} mastered`,
    `Recent mocks (newest first): ${
      attempts.length
        ? attempts.map((a) => `${a.type} ${a.pct != null ? Math.round(a.pct) + "%" : "?"}`).join(", ")
        : "none yet"
    }`,
    `Unfinished mocks last 3 days: ${abandoned[0]?.n ?? 0}`,
    `Recently asked the AI tutor about: ${tutorAsks.length ? tutorAsks.map((t) => `"${t.c.replace(/\n/g, " ")}"`).join("; ") : "nothing recently"}`,
    `Weakest topics (priority order): ${ctx.pool.slice(0, 8).map((t) => `${t.name} [${t.code}] mastery ${Math.round((t.mastery ?? 0) * 100)}%`).join("; ")}`,
  ];
  return lines.join("\n");
}

const COACH_SYSTEM = `You are Shishya's personal coach planning ONE student's study day for a competitive Indian government/entrance exam. You are the kind of coach a student loves: specific, warm, honest, zero guilt. You will receive the student's persona (recent scores, what they asked the tutor, whether yesterday happened) and a MENU of valid task ids.

Rules:
- Choose 2-4 task ids FROM THE MENU ONLY, ordered for the day (hardest cognitive work first).
- Balance subjects when possible; if a topic keeps failing in mocks or tutor questions, prefer reading it before re-testing it.
- On Sundays, the live test (if in menu) comes first.
- Write "note": 1-2 sentences of the coach's morning voice — specific to THIS student's data (quote a score, a topic, a pattern). NEVER guilt ("you missed", "you failed to"). Missing days = "plan rebuilt, here's the best path from today". English, simple words, at most one emoji.

Respond with ONLY JSON: {"taskIds": ["..."], "note": "..."}`;

export async function generateCoachDay(userId: string): Promise<"planned" | "skipped" | "failed"> {
  const ctx = await loadPlanContext(userId);
  if (!ctx || ctx.daysLeft <= 0) return "skipped";

  // Candidate menu: deterministic, validated.
  const menu: { id: string; desc: string }[] = [];
  if (ctx.isSunday) menu.push({ id: "livetest", desc: "All-India Live Test (shared paper, national rank)" });
  menu.push({ id: "fullmock", desc: `Full ${ctx.examShort} mock (exam-length simulation)` });
  menu.push({ id: "daily5", desc: "Daily 5 quick questions (streak keeper, 5 min)" });
  for (const t of ctx.pool.slice(0, 8)) {
    menu.push({ id: `read:${t.code}`, desc: `Study ${t.name} — notes + 10-question topic test (mastery ${Math.round((t.mastery ?? 0) * 100)}%)` });
    menu.push({ id: `revise:${t.code}`, desc: `Re-test ${t.name} without re-reading` });
  }

  try {
    const persona = await personaPacket(ctx);
    const res = await callClaude({
      system: cachedSystem(COACH_SYSTEM),
      messages: [
        {
          role: "user",
          content: `STUDENT:\n${persona}\n\nMENU:\n${menu.map((m) => `- ${m.id}: ${m.desc}`).join("\n")}`,
        },
      ],
      maxTokens: 400,
      model: MODEL,
    });
    const text = res.response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const out = parseJson<{ taskIds: string[]; note: string }>(text);

    const tasks = (out.taskIds ?? [])
      .filter((id) => menu.some((m) => m.id === id))
      .map((id) => taskFromId(ctx, id))
      .filter((t): t is CoachTask => Boolean(t))
      .slice(0, 4);
    if (!tasks.length) return "failed";
    const note = typeof out.note === "string" ? out.note.slice(0, 400) : null;

    await prisma.$executeRaw`
      INSERT INTO "CoachDay" (id, "userId", date, tasks, note, "createdAt")
      VALUES (gen_random_uuid()::text, ${userId}, ${istToday()},
              ${JSON.stringify(tasks)}::jsonb, ${note}, NOW())
      ON CONFLICT ("userId", date)
      DO UPDATE SET tasks = ${JSON.stringify(tasks)}::jsonb, note = ${note}`;
    return "planned";
  } catch {
    return "failed"; // dashboard falls back to the deterministic plan
  }
}

/** All plan-holders who were active in the last 7 days (the cron's
 *  worklist — inactive plans don't burn tokens). */
export async function activePlanUserIds(cap = 200): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ userId: string }[]>`
    SELECT DISTINCT cp."userId"
    FROM "CoachPlan" cp
    WHERE cp."examDate" > NOW()
      AND EXISTS (
        SELECT 1 FROM "AnalyticsEvent" ae
        WHERE ae."userId" = cp."userId" AND ae."createdAt" > NOW() - INTERVAL '7 days'
        UNION
        SELECT 1 FROM "Attempt" a
        WHERE a."userId" = cp."userId" AND a."startedAt" > NOW() - INTERVAL '7 days'
      )
    LIMIT ${cap}`;
  return rows.map((r) => r.userId);
}

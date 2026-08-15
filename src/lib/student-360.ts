// Student-360 — the whole aspirant on one screen.
//
// Founder vision (15 Aug 2026): capture the aspirant's full behavioural
// pattern — strengths, weaknesses, habits, usage — so that a human
// coach/mentor opening this profile knows the student better than a
// tuition teacher learns in a month. One assembly, four consumers:
// the aspirant's own /me/report, the founder's teacher-request view,
// the mentor screen (consent-gated), and educator batch drill-downs.
//
// Everything here is read-assembly of tables the product already
// fills; the only generation is a small daily-cached "coach's read"
// paragraph. Raw SQL throughout (works regardless of client staleness).

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { callClaude, MODEL } from "@/lib/ai/client";

export interface Student360 {
  userId: string;
  name: string;
  joinedDaysAgo: number;
  exam: { code: string; short: string; name: string } | null;
  daysToExam: number | null;
  plan: { dayNumber: number; dailyMinutes: number; briefsRead7d: number } | null;
  totals: {
    attempts: number;
    submitted: number;
    avgPct: number | null;
    studyMinutes: number;
    tutorQuestions: number;
    activeDaysLast30: number;
  };
  scoreTrend: Array<{ d: string; pct: number; exam: string }>;
  subjects: Array<{ name: string; mastery: number; attempts: number }>;
  weakTopics: Array<{ name: string; subject: string; mastery: number }>;
  strongTopics: Array<{ name: string; subject: string; mastery: number }>;
  revisionDue: number;
  studyHours: { morning: number; afternoon: number; evening: number; night: number };
  tutorThemes: string[];
  lastActiveDaysAgo: number | null;
  coachRead: string | null;
}

function istDate(): string {
  return new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
}

export async function buildStudent360(userId: string): Promise<Student360 | null> {
  const users = await prisma.$queryRaw<any[]>`
    SELECT id, name, email, "createdAt" FROM "User" WHERE id = ${userId} LIMIT 1`;
  const u = users[0];
  if (!u) return null;

  // Primary exam: coach plan first (deliberate choice), else most-attempted.
  const examRows = await prisma.$queryRaw<any[]>`
    SELECT e.code, e."shortName" AS short, e.name, e.id AS eid, 1 AS pri
    FROM "CoachPlan" cp JOIN "Exam" e ON e.id = cp."examId"
    WHERE cp."userId" = ${userId}
    UNION ALL
    SELECT e.code, e."shortName", e.name, e.id, 2
    FROM "Attempt" a JOIN "Mock" m ON m.id = a."mockId" JOIN "Exam" e ON e.id = m."examId"
    WHERE a."userId" = ${userId}
    ORDER BY pri LIMIT 1`;
  const exam = examRows[0] ?? null;

  const [dates, plan, totals, trend, subjects, topics, due, hours, themes, lastAct] =
    await Promise.all([
      exam
        ? prisma.$queryRaw<any[]>`
            SELECT MIN(d.date) AS next FROM "ExamImportantDate" d
            WHERE d."examId" = ${exam.eid} AND d."isExamDay" = TRUE AND d.date > now()`
        : Promise.resolve([]),
      prisma.$queryRaw<any[]>`
        SELECT cp."dailyMinutes",
          (now()::date - cp."createdAt"::date) + 1 AS day_number,
          (SELECT COUNT(*)::int FROM "CoachDay" cd WHERE cd."userId" = ${userId}
            AND cd.date >= (now() + interval '5.5 hours')::date - 6) AS briefs7
        FROM "CoachPlan" cp WHERE cp."userId" = ${userId} LIMIT 1`,
      prisma.$queryRaw<any[]>`
        SELECT COUNT(*)::int AS attempts,
          COUNT(*) FILTER (WHERE status IN ('SUBMITTED','AUTO_SUBMITTED'))::int AS submitted,
          ROUND(AVG("scorePct") FILTER (WHERE status IN ('SUBMITTED','AUTO_SUBMITTED')))::int AS avg_pct,
          COALESCE(ROUND(SUM(LEAST(COALESCE("durationSec",0), 10800))/60.0), 0)::int AS minutes
        FROM "Attempt" WHERE "userId" = ${userId}`,
      prisma.$queryRaw<any[]>`
        SELECT to_char(a."startedAt" + interval '5.5 hours', 'DD Mon') AS d,
          ROUND(a."scorePct")::int AS pct, e."shortName" AS exam
        FROM "Attempt" a JOIN "Mock" m ON m.id = a."mockId" JOIN "Exam" e ON e.id = m."examId"
        WHERE a."userId" = ${userId} AND a.status IN ('SUBMITTED','AUTO_SUBMITTED') AND a."scorePct" IS NOT NULL
        ORDER BY a."startedAt" DESC LIMIT 10`,
      exam
        ? prisma.$queryRaw<any[]>`
            SELECT s.name, ROUND(AVG(w."masteryScore")::numeric, 2)::float AS mastery,
              SUM(w."attemptsCount")::int AS attempts
            FROM "WeaknessMap" w JOIN "Topic" t ON t.id = w."topicId"
            JOIN "Subject" s ON s.id = t."subjectId"
            WHERE w."userId" = ${userId} AND w."examId" = ${exam.eid}
            GROUP BY s.name, s."orderIdx" ORDER BY s."orderIdx"`
        : Promise.resolve([]),
      exam
        ? prisma.$queryRaw<any[]>`
            SELECT t.name, s.name AS subject, ROUND(w."masteryScore"::numeric, 2)::float AS mastery
            FROM "WeaknessMap" w JOIN "Topic" t ON t.id = w."topicId"
            JOIN "Subject" s ON s.id = t."subjectId"
            WHERE w."userId" = ${userId} AND w."examId" = ${exam.eid} AND w."attemptsCount" >= 2
            ORDER BY w."masteryScore" ASC`
        : Promise.resolve([]),
      prisma.$queryRaw<any[]>`
        SELECT COUNT(*)::int AS n FROM "ReviewState"
        WHERE "userId" = ${userId} AND due <= now()`,
      prisma.$queryRaw<any[]>`
        SELECT
          COUNT(*) FILTER (WHERE h BETWEEN 5 AND 11)::int AS morning,
          COUNT(*) FILTER (WHERE h BETWEEN 12 AND 16)::int AS afternoon,
          COUNT(*) FILTER (WHERE h BETWEEN 17 AND 21)::int AS evening,
          COUNT(*) FILTER (WHERE h >= 22 OR h < 5)::int AS night
        FROM (SELECT EXTRACT(hour FROM "createdAt" + interval '5.5 hours')::int AS h
          FROM "AnalyticsEvent" WHERE "userId" = ${userId}
            AND "createdAt" >= now() - interval '30 days') x`,
      prisma.$queryRaw<any[]>`
        SELECT LEFT(cm.content, 90) AS q FROM "ChatMessage" cm
        WHERE cm.role = 'USER'
          AND cm."sessionId" IN (SELECT id FROM "ChatSession" WHERE "userId" = ${userId})
        ORDER BY cm."createdAt" DESC LIMIT 6`,
      prisma.$queryRaw<any[]>`
        SELECT GREATEST(
          (SELECT MAX("startedAt") FROM "Attempt" WHERE "userId" = ${userId}),
          (SELECT MAX("createdAt") FROM "AnalyticsEvent" WHERE "userId" = ${userId})
        ) AS last`,
    ]);

  const activeDays = await prisma.$queryRaw<any[]>`
    SELECT COUNT(DISTINCT ("createdAt" + interval '5.5 hours')::date)::int AS n
    FROM "AnalyticsEvent" WHERE "userId" = ${userId} AND "createdAt" >= now() - interval '30 days'`;
  const tutorCount = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*)::int AS n FROM "ChatMessage" cm
    WHERE cm.role = 'USER'
      AND cm."sessionId" IN (SELECT id FROM "ChatSession" WHERE "userId" = ${userId})`;

  const daysToExam = dates[0]?.next
    ? Math.max(0, Math.ceil((new Date(dates[0].next).getTime() - Date.now()) / 86_400_000))
    : null;
  const lastMs = lastAct[0]?.last ? new Date(lastAct[0].last).getTime() : null;

  const profile: Student360 = {
    userId,
    name: u.name ?? "Aspirant",
    joinedDaysAgo: Math.floor((Date.now() - new Date(u.createdAt).getTime()) / 86_400_000),
    exam: exam ? { code: exam.code, short: exam.short, name: exam.name } : null,
    daysToExam,
    plan: plan[0]
      ? { dayNumber: Number(plan[0].day_number), dailyMinutes: plan[0].dailyMinutes, briefsRead7d: plan[0].briefs7 }
      : null,
    totals: {
      attempts: totals[0]?.attempts ?? 0,
      submitted: totals[0]?.submitted ?? 0,
      avgPct: totals[0]?.avg_pct ?? null,
      studyMinutes: totals[0]?.minutes ?? 0,
      tutorQuestions: tutorCount[0]?.n ?? 0,
      activeDaysLast30: activeDays[0]?.n ?? 0,
    },
    scoreTrend: (trend as any[]).reverse(),
    subjects: subjects as any[],
    weakTopics: (topics as any[]).slice(0, 5),
    strongTopics: (topics as any[]).slice(-3).reverse().filter((t: any) => t.mastery >= 0.6),
    revisionDue: due[0]?.n ?? 0,
    studyHours: hours[0] ?? { morning: 0, afternoon: 0, evening: 0, night: 0 },
    tutorThemes: (themes as any[]).map((t) => t.q),
    lastActiveDaysAgo: lastMs ? Math.floor((Date.now() - lastMs) / 86_400_000) : null,
    coachRead: null,
  };

  // The coach's read — small daily-cached synthesis. try/catch stays
  // OUTSIDE the cache so an API failure is never cached as the answer.
  try {
    profile.coachRead = await cachedCoachRead(userId, istDate(), profile);
  } catch {
    profile.coachRead = null;
  }
  return profile;
}

const cachedCoachRead = (userId: string, day: string, p: Student360) =>
  unstable_cache(
    async () => {
      const packet = JSON.stringify({
        exam: p.exam?.short, daysToExam: p.daysToExam, joinedDaysAgo: p.joinedDaysAgo,
        attempts: p.totals.submitted, avgPct: p.totals.avgPct,
        activeDays30: p.totals.activeDaysLast30, lastActiveDaysAgo: p.lastActiveDaysAgo,
        scoreTrend: p.scoreTrend.map((s) => s.pct), subjects: p.subjects,
        weakTopics: p.weakTopics.map((t) => t.name), studyHours: p.studyHours,
        recentTutorAsks: p.tutorThemes.slice(0, 4), planDay: p.plan?.dayNumber ?? null,
      });
      const res = await callClaude({
        system: [
          {
            type: "text" as const,
            text: "You are an exam-prep counsellor writing a 3-4 sentence professional read of ONE aspirant for a human mentor about to counsel them. Name the single biggest strength, the single biggest risk, and the one next step you would push. Ground every claim in the data given — never invent numbers. Never guilt language: gaps are framed as 'the opportunity'. Plain English, no headings, no bullets.",
          },
        ],
        messages: [{ role: "user", content: packet }],
        maxTokens: 220,
        model: MODEL,
      });
      const text = res.response.content
        .map((b: any) => (b.type === "text" ? b.text : ""))
        .join("")
        .trim();
      if (!text) throw new Error("empty coach read");
      return text;
    },
    ["student-360-read", userId, day],
    { revalidate: 86_400 },
  )();

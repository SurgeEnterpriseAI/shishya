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

export async function buildStudent360(
  userId: string,
  audience: "self" | "mentor" = "self",
): Promise<Student360 | null> {
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
            WHERE d."examId" = ${exam.eid} AND d."isExamDay" = TRUE AND d."archivedAt" IS NULL AND d.date > now()`
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

  // The coach's read — small daily-cached synthesis, one variant per
  // AUDIENCE: the aspirant hears their coach speaking TO them (second
  // person, encouraging); the mentor gets a counsellor's brief ABOUT
  // them (third person, clinical). try/catch stays OUTSIDE the cache so
  // an API failure is never cached as the answer.
  try {
    profile.coachRead = await cachedCoachRead(userId, istDate(), profile, audience);
  } catch {
    profile.coachRead = null;
  }
  return profile;
}

// 13 Oct 2026: the packet's field meanings and a length limit. The 12-13 Oct
// audit (25 real students, blind judge) found both models reading the old
// "studyHours" field (counts of app events by time of day) as hours studied —
// "477 hours of your best work", "your 4-hour afternoon study block" — and a
// score trend read backwards. Claude also ran past maxTokens 220 on 7 of 25
// reads (cut off mid-sentence on the student's own report), often after
// headings or a table.
const COACH_READ_DATA =
  "Field meanings: attempts = mocks submitted; avgPct = their average mock score in %; scoreTrend = mock scores in %, oldest first and newest last; subjects[].mastery runs 0 to 1 (0.42 means 42%); subjects[].attempts = questions answered in that subject; appEventsByTimeOfDay = how many app events (page views and clicks) fell in each part of the day over the last 30 days — counts of events, NOT hours, NOT sessions and NOT a study habit; activeDays30 = days with any activity in the last 30; daysToExam null = exam date not known (never guess one). Quote numbers exactly as they appear in the data: never work out new percentages, ranges or totals from them.";
const COACH_READ_SHAPE =
  "Write ONE paragraph of 3-4 short sentences, under 90 words. Plain text only: no headings, no bullets, no bold, no tables.";

const COACH_READ_SYSTEM: Record<"self" | "mentor", string> = {
  self:
    `You are the student's own exam-prep coach writing 3-4 sentences DIRECTLY TO THEM (second person: 'you'). Name their single biggest strength, their single biggest opportunity, and the one next step to take today. Ground every claim in the data given — never invent numbers. Encouraging and specific, never guilt: gaps are framed as 'your opportunity'. ${COACH_READ_SHAPE}\n\n${COACH_READ_DATA}`,
  mentor:
    `You are an exam-prep counsellor writing a 3-4 sentence professional read of ONE aspirant for a human mentor about to counsel them. Write about the aspirant in the third person ('they', 'the aspirant'), never to them. Name the single biggest strength, the single biggest risk, and the one next step you would push. Ground every claim in the data given — never invent numbers. Never guilt language: gaps are framed as 'the opportunity'. ${COACH_READ_SHAPE}\n\n${COACH_READ_DATA}`,
};

/**
 * The coach's read request (13 Oct 2026: pure, so the prompt can be tested
 * and evaluated outside Next). The packet's key for p.studyHours is
 * appEventsByTimeOfDay: the counts are app events, not hours.
 */
export function coachReadRequest(p: Student360, audience: "self" | "mentor") {
  const packet = JSON.stringify({
    exam: p.exam?.short, daysToExam: p.daysToExam, joinedDaysAgo: p.joinedDaysAgo,
    attempts: p.totals.submitted, avgPct: p.totals.avgPct,
    activeDays30: p.totals.activeDaysLast30, lastActiveDaysAgo: p.lastActiveDaysAgo,
    scoreTrend: p.scoreTrend.map((s) => s.pct), subjects: p.subjects,
    weakTopics: p.weakTopics.map((t) => t.name), appEventsByTimeOfDay: p.studyHours,
    recentTutorAsks: p.tutorThemes.slice(0, 4), planDay: p.plan?.dayNumber ?? null,
  });
  return {
    system: [{ type: "text" as const, text: COACH_READ_SYSTEM[audience] }],
    messages: [{ role: "user" as const, content: packet }],
    // 220 cut 7 of 25 Claude reads mid-sentence; 90 words is ~130 tokens.
    maxTokens: 400,
  };
}

const STRUCTURE_LINE = /^\s*(#|[-*•]\s|\d+\.\s|\||-{3,}\s*$)/;

/**
 * The read as stored and shown (13 Oct 2026). Only the leading paragraph is
 * kept when a heading, bullet or table follows it, and bold markers are
 * dropped. A reply that stopped at max_tokens, or was cut at a heading, keeps
 * its full sentences only, never a half one. Null when fewer than 2 full
 * sentences survive a cut: nothing is stored, and the next view asks again.
 */
export function finishCoachRead(text: string, stopReason: string | null | undefined): string | null {
  const lines = text.trim().split("\n");
  const firstStructure = lines.findIndex((l) => STRUCTURE_LINE.test(l));
  const cut = stopReason === "max_tokens" || firstStructure >= 0;
  let t = (firstStructure >= 0 ? lines.slice(0, firstStructure) : lines)
    .join(" ")
    .replace(/\*\*|__/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cut) return t || null;
  const lastEnd = t.match(/^[\s\S]*[.!?]["'”’)]?(?=\s|$)/);
  t = lastEnd ? lastEnd[0].trim() : "";
  return t.split(/(?<=[.!?]["'”’)]?)\s+/).filter(Boolean).length >= 2 ? t : null;
}

/**
 * Quality guard on a coach's read from Surge's own server (13 Oct 2026).
 * The 12-13 Oct audit's local critical reads were: app-event counts stated
 * as hours ("16 hours per day", "196 evening study hours"), a mentor brief
 * written to the student, and a "consistent study block" claimed for a
 * student active 1 day in 30. Each of those, and a reply cut off at
 * max_tokens, goes to Claude instead. Null = serve the local read.
 */
export function coachReadLocalCheck(
  text: string,
  audience: "self" | "mentor",
  activeDays30: number,
  stopReason?: string | null,
): string | null {
  if (stopReason === "max_tokens") return "cut off";
  // A read the store step would drop (it opens with a heading or list) would
  // leave the student with no read and every view retrying locally.
  if (!finishCoachRead(text, stopReason)) return "no plain paragraph";
  if (audience === "mentor" && /\byou(r)?\b/i.test(text)) return "mentor brief speaks to the student";
  if (/\b\d+[- ]?hours?\b/i.test(text) || /\b\d+\s+(?:[a-z-]+\s+){1,2}hours?\b/i.test(text)) return "states hours";
  if (activeDays30 < 7 && /\b(consistent|regular|existing|proven|established)\s+(?:[\w-]+\s+){0,2}(block|habit|routine|focus|schedule)\b/i.test(text))
    return "claims a study habit";
  return null;
}

const cachedCoachRead = (userId: string, day: string, p: Student360, audience: "self" | "mentor") =>
  unstable_cache(
    async () => {
      const req = coachReadRequest(p, audience);
      const res = await callClaude({
        feature: "student-360",
        ...req,
        model: MODEL,
        acceptLocal: (msg) =>
          coachReadLocalCheck(
            msg.content.map((b) => (b.type === "text" ? b.text : "")).join(""),
            audience,
            p.totals.activeDaysLast30,
            msg.stop_reason,
          ),
      });
      const raw = res.response.content
        .map((b: any) => (b.type === "text" ? b.text : ""))
        .join("")
        .trim();
      if (!raw) throw new Error("empty coach read");
      // A read cut off with no full sentences left is not stored (throwing
      // keeps it out of the cache, so the next view asks again).
      const text = finishCoachRead(raw, res.response.stop_reason);
      if (!text) throw new Error("coach read cut off");
      return text;
    },
    // v2 (13 Oct 2026): reads cached under the old prompt are not reused.
    ["student-360-read-v2", userId, day, audience],
    { revalidate: 86_400 },
  )();

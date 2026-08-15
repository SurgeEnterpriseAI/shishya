// Week-over-week comparison — computed from raw attempt history, not
// stored snapshots, so it's honest and works retroactively. "This week"
// = last 7 days; "last week" = the 7 before. Subject accuracy comes
// from Attempt.topicScores (per-topic correct/total recorded at submit
// time), joined up to subjects.

import { prisma } from "@/lib/db/prisma";

export interface WeekCompare {
  thisWeek: WeekSlice;
  lastWeek: WeekSlice;
  subjects: Array<{ name: string; thisPct: number | null; lastPct: number | null }>;
}
export interface WeekSlice {
  mocks: number;
  avgPct: number | null;
  activeDays: number;
  tutorQuestions: number;
  studyMinutes: number;
}

export async function buildWeekCompare(userId: string): Promise<WeekCompare> {
  const slices = await prisma.$queryRaw<any[]>`
    SELECT
      (a."startedAt" >= now() - interval '7 days') AS this_week,
      COUNT(*) FILTER (WHERE a.status IN ('SUBMITTED','AUTO_SUBMITTED'))::int AS mocks,
      ROUND(AVG(a."scorePct") FILTER (WHERE a.status IN ('SUBMITTED','AUTO_SUBMITTED')))::int AS avg_pct,
      COUNT(DISTINCT (a."startedAt" + interval '5.5 hours')::date)::int AS active_days,
      COALESCE(ROUND(SUM(LEAST(COALESCE(a."durationSec",0),10800))/60.0),0)::int AS minutes
    FROM "Attempt" a
    WHERE a."userId" = ${userId} AND a."startedAt" >= now() - interval '14 days'
    GROUP BY 1`;
  const tutor = await prisma.$queryRaw<any[]>`
    SELECT (cm."createdAt" >= now() - interval '7 days') AS this_week, COUNT(*)::int AS n
    FROM "ChatMessage" cm
    WHERE cm.role = 'USER' AND cm."createdAt" >= now() - interval '14 days'
      AND cm."sessionId" IN (SELECT id FROM "ChatSession" WHERE "userId" = ${userId})
    GROUP BY 1`;

  // Per-subject accuracy per week from topicScores jsonb.
  const subj = await prisma.$queryRaw<any[]>`
    WITH scored AS (
      SELECT (a."startedAt" >= now() - interval '7 days') AS this_week,
        kv.key AS topic_id,
        COALESCE((kv.value->>'correct')::float, 0) AS correct,
        COALESCE((kv.value->>'total')::float, 0) AS total
      FROM "Attempt" a, jsonb_each(a."topicScores") kv
      WHERE a."userId" = ${userId} AND a."startedAt" >= now() - interval '14 days'
        AND a."topicScores" IS NOT NULL AND a.status IN ('SUBMITTED','AUTO_SUBMITTED'))
    SELECT s.name, sc.this_week,
      ROUND(100.0 * SUM(sc.correct) / NULLIF(SUM(sc.total), 0))::int AS pct
    FROM scored sc
    JOIN "Topic" t ON t.id = sc.topic_id
    JOIN "Subject" s ON s.id = t."subjectId"
    GROUP BY s.name, sc.this_week HAVING SUM(sc.total) >= 3`;

  function slice(flag: boolean): WeekSlice {
    const r = slices.find((x) => x.this_week === flag);
    const tq = tutor.find((x) => x.this_week === flag);
    return {
      mocks: r?.mocks ?? 0,
      avgPct: r?.avg_pct ?? null,
      activeDays: r?.active_days ?? 0,
      tutorQuestions: tq?.n ?? 0,
      studyMinutes: r?.minutes ?? 0,
    };
  }

  const names = [...new Set(subj.map((r) => r.name as string))];
  const subjects = names
    .map((name) => ({
      name,
      thisPct: subj.find((r) => r.name === name && r.this_week === true)?.pct ?? null,
      lastPct: subj.find((r) => r.name === name && r.this_week === false)?.pct ?? null,
    }))
    .sort((a, b) => (a.thisPct ?? 101) - (b.thisPct ?? 101));

  return { thisWeek: slice(true), lastWeek: slice(false), subjects };
}

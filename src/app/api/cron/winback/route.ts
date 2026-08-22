// GET /api/cron/winback — the win-back flow for the unowned band.
//
// Found 3 Aug 2026: 289 of 427 recent users (68%) were lapsed 7+ days
// with ZERO outreach touching them — Daily-5 needs 3-day recency, the
// day-3 nudge fires once, evening rescue needs a live streak. Past day
// ~4 a lapsed student never heard from Shishya again. This closes that.
//
// Selection: enrolled users with email, last activity 7–60 days ago.
// Anti-nag guarantees (hard rules):
//   • max 2 win-backs per user EVER, at least 21 days apart (EmailTouch)
//   • max 60 sends per run (backlog drains over days, freshest-lapsed
//     first — they're the most recoverable)
// Personalization: their exam + wrong-answer count from Attempt.answers
// (each cleared mistake = a mark saved — the honest loss-frame).
// Auth: Bearer ${CRON_SECRET}. Daily 04:00 UTC (9:30 AM IST).

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { sendWinbackEmail } from "@/lib/email";

const MAX_SENDS = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";

  // Lapsed 7–60 days, enrolled, has email, within anti-nag limits.
  const candidates = await prisma.$queryRaw<
    { id: string; email: string; name: string | null; lastSeen: Date; short: string; coachDaysLeft: number | null }[]
  >`
    WITH act AS (
      SELECT "userId", MAX("createdAt") AS last_seen
      FROM "AnalyticsEvent" WHERE "userId" IS NOT NULL GROUP BY "userId"
    )
    SELECT u.id, u.email, u.name, act.last_seen AS "lastSeen",
           -- Exam name: when a live coach plan exists, take the exam FROM
           -- THAT PLAN so the subject's "N days to <exam>" names the same
           -- exam the countdown refers to (review 22 Aug 2026); else the
           -- newest active enrollment.
           COALESCE(
             (SELECT e."shortName" FROM "CoachPlan" cp JOIN "Exam" e ON e.id = cp."examId"
              WHERE cp."userId" = u.id AND cp."examDate" > NOW()
              ORDER BY cp."updatedAt" DESC LIMIT 1),
             (SELECT e."shortName" FROM "Enrollment" en JOIN "Exam" e ON e.id = en."examId"
              WHERE en."userId" = u.id AND en.active = TRUE
              ORDER BY en."createdAt" DESC LIMIT 1)
           ) AS short,
           -- Coach-plan awareness: if they still have a future exam via a
           -- coach plan, the winback leads with "your coach already
           -- rebuilt your plan — N days left" instead of a cold nudge
           -- (audit 18 Aug 2026 — the comeback promise was client-only).
           (SELECT GREATEST(0, CEIL(EXTRACT(EPOCH FROM (cp."examDate" - NOW())) / 86400))::int
            FROM "CoachPlan" cp WHERE cp."userId" = u.id AND cp."examDate" > NOW()
            ORDER BY cp."updatedAt" DESC LIMIT 1) AS "coachDaysLeft"
    FROM "User" u JOIN act ON act."userId" = u.id
    WHERE u.email <> '' AND u."emailOptOut" = FALSE
      AND act.last_seen < NOW() - INTERVAL '7 days'
      AND act.last_seen > NOW() - INTERVAL '60 days'
      AND (SELECT COUNT(*) FROM "EmailTouch" t WHERE t."userId" = u.id AND t.tag = 'winback') < 2
      AND NOT EXISTS (SELECT 1 FROM "EmailTouch" t WHERE t."userId" = u.id AND t.tag = 'winback'
                      AND t."sentAt" > NOW() - INTERVAL '21 days')
    ORDER BY act.last_seen DESC
    LIMIT ${MAX_SENDS}
  `.catch((e) => {
    console.error("winback selection failed:", e);
    return [];
  });

  const eligible = candidates.filter((c) => c.short);
  if (dry) {
    return Response.json({
      ok: true,
      dry: true,
      eligible: eligible.length,
      sample: eligible.slice(0, 5).map((c) => ({ name: c.name, short: c.short, lastSeen: c.lastSeen })),
    });
  }
  if (eligible.length === 0) return Response.json({ ok: true, sent: 0 });

  // Wrong-answer counts for the batch (one query): each element of
  // Attempt.answers with correct=false is an uncleared mistake.
  const ids = eligible.map((c) => c.id);
  const mistakes = await prisma.$queryRaw<{ userId: string; n: bigint }[]>`
    SELECT a."userId", SUM(
      (SELECT COUNT(*) FROM jsonb_array_elements(a.answers::jsonb) el
       WHERE (el->>'correct') = 'false')
    ) AS n
    FROM "Attempt" a
    WHERE a."userId" = ANY(${ids}) AND a.status IN ('SUBMITTED', 'AUTO_SUBMITTED')
    GROUP BY a."userId"
  `.catch(() => [] as { userId: string; n: bigint }[]);
  const mBy = new Map(mistakes.map((m) => [m.userId, Number(m.n)]));

  let sent = 0, failed = 0;
  for (const c of eligible) {
    const daysGone = Math.max(7, Math.round((Date.now() - c.lastSeen.getTime()) / 86_400_000));
    const ok = await sendWinbackEmail({
      to: c.email,
      userId: c.id,
      name: c.name,
      examShort: c.short,
      mistakes: Math.min(mBy.get(c.id) ?? 0, 999),
      daysGone,
      coachDaysLeft: c.coachDaysLeft ?? undefined,
    }).catch(() => false);
    if (ok) {
      sent++;
      await prisma
        .$executeRaw`INSERT INTO "EmailTouch" (id, "userId", tag) VALUES (${crypto.randomUUID()}, ${c.id}, 'winback')`
        .catch(() => {});
    } else {
      failed++;
    }
  }

  return Response.json({ ok: true, eligible: eligible.length, sent, failed });
}

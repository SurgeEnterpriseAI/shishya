// GET /api/cron/daily-five — the Daily 5 retention nudge.
//
// Jul 20 retention checkpoint: D1-7 return stuck at 14%, one-and-done 85%,
// and the only outbound touch was a single day-3 email. This cron gives
// recently-active students a daily reason to return: each morning (8:30 AM
// IST) it emails everyone who (a) has an active enrollment, (b) was active
// in the last 3 days, (c) hasn't visited yet today — "your Daily 5 is
// ready", linking to the dashboard's one-tap weakest-topic quiz.
//
// Recency window keeps it a nudge, not spam: lapse >3 days and the daily
// email stops (the day-3 nudge and future win-back flows own that band).
// Auth: Bearer ${CRON_SECRET}. Daily per vercel.json.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { sendDailyFiveEmail } from "@/lib/email";
import { optedOutUserIds } from "@/lib/email-optout";
import { computeStreak, istDay } from "@/lib/db/streak";
import { liveTestEmailNotice } from "@/lib/live-test-today";

const MAX_SENDS = 200;

function istTodayStart(now = new Date()): Date {
  // IST = UTC+5:30 — compute midnight IST expressed in UTC.
  const istMs = now.getTime() + 5.5 * 3600_000;
  const istMidnightMs = Math.floor(istMs / 86_400_000) * 86_400_000;
  return new Date(istMidnightMs - 5.5 * 3600_000);
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ error: "CRON_SECRET not configured" }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { "content-type": "application/json" },
    });
  }

  const now = new Date();
  const dayStart = istTodayStart(now);
  const threeDaysAgo = new Date(now.getTime() - 3 * 86_400_000);

  // Active in last 3 days…
  const recent = await prisma.analyticsEvent.findMany({
    where: { userId: { not: null }, createdAt: { gte: threeDaysAgo } },
    select: { userId: true, createdAt: true },
  });
  const lastSeen = new Map<string, number>();
  for (const e of recent) {
    const t = e.createdAt.getTime();
    if (t > (lastSeen.get(e.userId!) ?? 0)) lastSeen.set(e.userId!, t);
  }
  // …but not yet today.
  const candidates = [...lastSeen.entries()]
    .filter(([, t]) => t < dayStart.getTime())
    .map(([id]) => id);
  if (candidates.length === 0) {
    return Response.json({ ok: true, sent: 0, reason: "no candidates" });
  }

  const users = await prisma.user.findMany({
    where: {
      id: { in: candidates, notIn: await optedOutUserIds() }, // opt-out applied at selection too (review 22 Aug 2026)
      email: { not: "" },
      enrollments: { some: { active: true } },
    },
    select: {
      id: true, email: true, name: true,
      enrollments: {
        where: { active: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { exam: { select: { shortName: true } } },
      },
    },
    take: MAX_SENDS,
  });

  // Batch-compute each recipient's streak (two queries total, not two
  // per user) so the email can lead with loss-aversion when a streak is
  // actually live. 90-day window matches getStudyStreak.
  const userIds = users.map((u) => u.id);
  const since = new Date(now.getTime() - 90 * 86_400_000);
  const [attempts, chats] = await Promise.all([
    prisma.attempt.findMany({
      where: {
        userId: { in: userIds },
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
        finishedAt: { gte: since },
      },
      select: { userId: true, finishedAt: true },
    }),
    prisma.chatSession.findMany({
      where: { userId: { in: userIds }, createdAt: { gte: since } },
      select: { userId: true, createdAt: true },
    }),
  ]);
  const daysByUser = new Map<string, Set<number>>();
  const add = (uid: string | null, d: Date | null) => {
    if (!uid || !d) return;
    if (!daysByUser.has(uid)) daysByUser.set(uid, new Set());
    daysByUser.get(uid)!.add(istDay(d));
  };
  for (const a of attempts) add(a.userId, a.finishedAt);
  for (const c of chats) add(c.userId, c.createdAt);
  const todayIdx = istDay(now);

  // Students who already committed to a coach plan — they get the plain
  // mail; everyone else gets the coach invitation at the end.
  const planUserIds = new Set(
    (
      await prisma
        .$queryRaw<{ userId: string }[]>`SELECT "userId" FROM "CoachPlan"`
        .catch(() => [])
    ).map((r) => r.userId),
  );

  // Plan-holders get a richer, DEDICATED "your plan for today" email from
  // the coach-morning cron (7 AM IST). To avoid two morning emails, skip
  // anyone who already received that today (18 Aug 2026 founder call:
  // keep the coach plan email independent, not folded into Daily-5).
  const gotCoachEmail = new Set(
    userIds.length
      ? (
          await prisma
            .$queryRaw<{ userId: string }[]>`
              SELECT DISTINCT "userId" FROM "EmailTouch"
              WHERE tag = 'coach-morning' AND "userId" = ANY(${userIds})
                AND "sentAt" > NOW() - INTERVAL '20 hours'`
            .catch(() => [])
        ).map((r) => r.userId)
      : [],
  );

  // Yesterday's platform-wide effort — social proof for the mail. The
  // Daily-5 goes out at ~8:30 AM IST, so "yesterday" is the honest word.
  const yesterdayPeers = await (async () => {
    try {
      const dayStart = new Date(todayIdx * 86_400_000 - 5.5 * 3600_000);
      const prevStart = new Date(dayStart.getTime() - 86_400_000);
      const r = await prisma.$queryRaw<{ students: bigint; sets: bigint }[]>`
        SELECT COUNT(DISTINCT "userId") students, COUNT(*) sets FROM "Attempt"
        WHERE "finishedAt" >= ${prevStart} AND "finishedAt" < ${dayStart}
          AND status IN ('SUBMITTED','AUTO_SUBMITTED') AND "userId" IS NOT NULL`;
      const students = Number(r[0]?.students ?? 0);
      return students >= 3 ? { students, sets: Number(r[0].sets) } : null;
    } catch {
      return null;
    }
  })();

  // Sunday mornings this says "LIVE today: N All-India tests" (the
  // 8:30 AM send lands 2.5h after the 6 AM test-hall open).
  const liveTest = await liveTestEmailNotice().catch(() => null);

  let sent = 0, failed = 0, skippedCoach = 0;
  for (const u of users) {
    if (!u.email || !u.enrollments[0]) continue;
    if (gotCoachEmail.has(u.id)) { skippedCoach++; continue; } // got the dedicated coach email
    const streak = computeStreak(daysByUser.get(u.id) ?? new Set(), todayIdx);
    const ok = await sendDailyFiveEmail({
      to: u.email,
      userId: u.id,
      name: u.name,
      examShort: u.enrollments[0].exam.shortName,
      streakCurrent: streak.current,
      hasCoachPlan: planUserIds.has(u.id),
      peers: yesterdayPeers,
      liveTest,
    }).catch(() => false);
    if (ok) sent++; else failed++;
  }

  return Response.json({ ok: true, candidates: candidates.length, sent, failed, skippedCoach });
}

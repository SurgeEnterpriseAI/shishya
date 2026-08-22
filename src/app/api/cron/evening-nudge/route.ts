// GET /api/cron/evening-nudge — the 8:30 PM IST streak rescue.
//
// Usage data: the platform's biggest study block is 9 PM–midnight IST,
// which the 8:30 AM Daily-5 email can't reach. This cron emails ONLY
// students whose live streak (≥2 days) dies at midnight — studied
// yesterday, not yet today. Peak loss-aversion at the exact hour they'd
// study anyway. Deliberately scarce (streak-holders only, not every
// lapsed user) so it never reads as spam.
//
// Auth: Bearer ${CRON_SECRET}. Daily 15:00 UTC per vercel.json.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { sendEveningRescueEmail } from "@/lib/email";
import { optedOutUserIds } from "@/lib/email-optout";
import { computeStreak, istDay } from "@/lib/db/streak";
import { liveTestEmailNotice } from "@/lib/live-test-today";

const MAX_SENDS = 200;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const since = new Date(now.getTime() - 90 * 86_400_000);
  const todayIdx = istDay(now);

  // Everyone with study activity in the last 2 days — the only people
  // who can possibly hold a streak that's at risk tonight.
  const twoDaysAgo = new Date(now.getTime() - 2 * 86_400_000);
  const activeUserIds = await prisma.$queryRaw<{ userId: string }[]>`
    SELECT DISTINCT "userId" FROM (
      SELECT "userId" FROM "Attempt" WHERE "finishedAt" >= ${twoDaysAgo} AND "userId" IS NOT NULL
      UNION
      SELECT "userId" FROM "ChatSession" WHERE "createdAt" >= ${twoDaysAgo} AND "userId" IS NOT NULL
    ) s
  `;
  const ids = activeUserIds.map((r) => r.userId);
  if (ids.length === 0) return Response.json({ ok: true, sent: 0, reason: "no recent activity" });

  // Batch activity-day sets (2 queries, not 2 per user).
  const [attempts, chats] = await Promise.all([
    prisma.attempt.findMany({
      where: { userId: { in: ids }, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, finishedAt: { gte: since } },
      select: { userId: true, finishedAt: true },
    }),
    prisma.chatSession.findMany({
      where: { userId: { in: ids }, createdAt: { gte: since } },
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

  // At-risk = streak ≥2 and NOT yet active today (dies at IST midnight).
  const atRisk: { userId: string; current: number }[] = [];
  for (const [uid, days] of daysByUser) {
    const s = computeStreak(days, todayIdx);
    if (s.current >= 2 && !s.activeToday) atRisk.push({ userId: uid, current: s.current });
  }
  if (atRisk.length === 0) return Response.json({ ok: true, sent: 0, reason: "no streaks at risk" });

  const users = await prisma.user.findMany({
    where: {
      email: { not: "" },
      id: { in: atRisk.map((r) => r.userId), notIn: await optedOutUserIds() }, // opt-out at selection (review 22 Aug 2026)
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
  const streakById = new Map(atRisk.map((r) => [r.userId, r.current]));

  // Plan-holders get the plain rescue; the rest get the coach invite.
  const planUserIds = new Set(
    (
      await prisma
        .$queryRaw<{ userId: string }[]>`SELECT "userId" FROM "CoachPlan"`
        .catch(() => [])
    ).map((r) => r.userId),
  );

  // Saturday evenings this says "tomorrow is Live Test Sunday" (and on
  // any day tests are still open, "LIVE today"). One lookup per run.
  const liveTest = await liveTestEmailNotice().catch(() => null);

  let sent = 0, failed = 0;
  for (const u of users) {
    if (!u.email || !u.enrollments[0]) continue;
    const ok = await sendEveningRescueEmail({
      to: u.email,
      userId: u.id,
      name: u.name,
      examShort: u.enrollments[0].exam.shortName,
      streakCurrent: streakById.get(u.id) ?? 2,
      hasCoachPlan: planUserIds.has(u.id),
      liveTest,
    }).catch(() => false);
    if (ok) sent++; else failed++;
  }

  return Response.json({ ok: true, atRisk: atRisk.length, sent, failed });
}

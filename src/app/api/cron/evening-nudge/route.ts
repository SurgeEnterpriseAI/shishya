// GET /api/cron/evening-nudge — the 8:30 PM IST streak rescue.
//
// Usage data: the platform's biggest study block is 9 PM–midnight IST,
// which the 8:30 AM Daily-5 email can't reach. This cron emails ONLY
// students whose live streak (≥2 days) dies at midnight — studied
// yesterday, not yet today. Peak loss-aversion at the exact hour they'd
// study anyway. Deliberately scarce (streak-holders only, not every
// lapsed user) so it never reads as spam.
//
// Study days (11 Sep 2026) come from the ONE definition in
// src/lib/study-day.ts — attempts incl. live tests, tutor chats,
// descriptive attempts and coach topic completions. Before this, a
// plan-holder whose streak was built on coach tasks never qualified.
// The mail's CTA points at /today (build-or-resume in one hop).
//
// 2 Oct 2026 (wave W1b): never a school-age account (src/lib/school-age.ts);
// the first read below drops them.
//
// Auth: Bearer ${CRON_SECRET}. Daily 15:00 UTC per vercel.json.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { NOT_SCHOOL_WHERE } from "@/lib/db/exam-scope";
import { schoolAgeAccountSql } from "@/lib/db/enrollment";
import { sendEveningRescueEmail } from "@/lib/email";
import { optedOutUserIds } from "@/lib/email-optout";
import { computeStreak, istDay } from "@/lib/db/streak";
import { loadStudyDays } from "@/lib/study-day";
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
  // who can possibly hold a streak that's at risk tonight. The four legs
  // are the four study-day sources (src/lib/study-day.ts); a source
  // missing here can never be rescued, whatever the streak says.
  // 2 Oct 2026 (personalisation wave W1b, founder decision PD-5): never a
  // school-age account (src/lib/school-age.ts) — an olympiad follower, a
  // class enrolment, a stored 13-17 band or a school wizard stage, even when
  // it also holds a real exam. This mail is a streak-loss warning, and the
  // decision keeps streak pressure away from school students. Dropped here,
  // in the first read, so no streak is computed for them and they take no
  // place in the batch; if this read fails the run stops before any mail (it
  // has no catch).
  const twoDaysAgo = new Date(now.getTime() - 2 * 86_400_000);
  const activeUserIds = await prisma.$queryRaw<{ userId: string }[]>`
    SELECT DISTINCT s."userId" FROM (
      SELECT "userId" FROM "Attempt" WHERE "finishedAt" >= ${twoDaysAgo} AND "userId" IS NOT NULL
      UNION
      SELECT "userId" FROM "ChatSession" WHERE "createdAt" >= ${twoDaysAgo} AND "userId" IS NOT NULL
      UNION
      SELECT "userId" FROM "DescriptiveAttempt" WHERE "createdAt" >= ${twoDaysAgo} AND "userId" IS NOT NULL
      UNION
      SELECT "userId" FROM "TopicStudyState" WHERE "completedAt" >= ${twoDaysAgo} AND "userId" IS NOT NULL
    ) s
    JOIN "User" u ON u.id = s."userId"
    WHERE NOT ${schoolAgeAccountSql("u")}
  `;
  const ids = activeUserIds.map((r) => r.userId);
  if (ids.length === 0) return Response.json({ ok: true, sent: 0, reason: "no recent activity" });

  // Batch activity-day sets — one UNION query for the whole candidate set,
  // built on the shared study-day definition.
  const daysByUser = await loadStudyDays(ids, since);

  // At-risk = streak ≥2 and NOT yet active today (dies at IST midnight).
  const atRisk: { userId: string; current: number }[] = [];
  for (const [uid, days] of daysByUser) {
    const s = computeStreak(days, todayIdx);
    if (s.current >= 2 && !s.activeToday) atRisk.push({ userId: uid, current: s.current });
  }
  if (atRisk.length === 0) return Response.json({ ok: true, sent: 0, reason: "no streaks at risk" });

  // 25 Sep 2026: the mail names the newest active enrolment as "your exam",
  // so school class containers (src/lib/db/exam-scope.ts) count neither for
  // the audience nor for the name — a student enrolled only in a school
  // class gets no exam streak mail.
  const users = await prisma.user.findMany({
    where: {
      email: { not: "" },
      id: { in: atRisk.map((r) => r.userId), notIn: await optedOutUserIds() }, // opt-out at selection (review 22 Aug 2026)
      enrollments: { some: { active: true, exam: NOT_SCHOOL_WHERE } },
    },
    select: {
      id: true, email: true, name: true,
      enrollments: {
        where: { active: true, exam: NOT_SCHOOL_WHERE },
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

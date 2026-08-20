// GET /api/cron/coach-morning — the coach's morning email.
//
// Founder call (18 Aug 2026): coach-plan holders should get a DEDICATED,
// standalone email with today's plan gist — the coach's note + the day's
// 2-3 tasks + days to exam — so the plan content itself pulls them back
// to preparation, instead of them only finding out on login (report/plan
// opens were sitting at ~0). Kept independent of the Daily-5; the
// daily-five cron skips anyone who got this today via the EmailTouch tag.
//
// Runs ~7 AM IST (1:30 UTC), after the 4 AM night-brain writes today's
// CoachDay. Reads the pre-generated CoachDay (cheap — no AI here), so it
// only mails plan-holders whose plan for today actually exists (active
// plans with days left; exam-day/post-exam write no CoachDay).
//
// Dedup: EmailTouch tag 'coach-morning', one per user per day.
// Auth: Bearer ${CRON_SECRET}.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { prisma } from "@/lib/db/prisma";
import { sendCoachDayEmail } from "@/lib/email";

const MAX_SENDS = 500;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";

  // Today's IST calendar day = the CoachDay.date key (stored as a DATE at
  // UTC midnight of the IST day).
  const IST_MS = 5.5 * 3600_000;
  const istTodayMidnight = Math.floor((Date.now() + IST_MS) / 86_400_000) * 86_400_000;
  const dayKey = new Date(istTodayMidnight);

  const rows = await prisma
    .$queryRaw<
      { userId: string; email: string; name: string | null; short: string; tasks: any; note: string | null; daysLeft: number }[]
    >`
      SELECT DISTINCT ON (cd."userId") cd."userId", u.email, u.name,
        e."shortName" AS short, cd.tasks, cd.note,
        GREATEST(0, CEIL(EXTRACT(EPOCH FROM (cp."examDate" - NOW())) / 86400))::int AS "daysLeft"
      FROM "CoachDay" cd
      JOIN "CoachPlan" cp ON cp."userId" = cd."userId"
      JOIN "User" u ON u.id = cd."userId"
      JOIN "Exam" e ON e.id = cp."examId"
      WHERE cd.date = ${dayKey} AND u.email <> ''
        AND NOT EXISTS (
          SELECT 1 FROM "EmailTouch" t
          WHERE t."userId" = cd."userId" AND t.tag = 'coach-morning'
            AND t."sentAt" > NOW() - INTERVAL '20 hours'
        )
      ORDER BY cd."userId", cp."updatedAt" DESC
      LIMIT ${MAX_SENDS}
    `.catch((e) => {
      console.error("[coach-morning] selection failed", e);
      return [];
    });

  if (dry) return Response.json({ ok: true, dry: true, eligible: rows.length, sample: rows.slice(0, 3).map((r) => ({ name: r.name, short: r.short, daysLeft: r.daysLeft })) });

  let sent = 0, failed = 0;
  for (const r of rows) {
    const tasks = Array.isArray(r.tasks)
      ? (r.tasks as { label?: string }[]).map((t) => t?.label).filter((l): l is string => !!l).slice(0, 3)
      : [];
    if (tasks.length === 0) continue; // nothing to say — don't send an empty plan
    const ok = await sendCoachDayEmail({
      to: r.email,
      userId: r.userId,
      name: r.name,
      examShort: r.short,
      daysLeft: r.daysLeft,
      tasks,
      note: r.note,
    }).catch(() => false);
    if (ok) {
      sent++;
      await prisma
        .$executeRaw`INSERT INTO "EmailTouch" (id, "userId", tag) VALUES (${crypto.randomUUID()}, ${r.userId}, 'coach-morning')`
        .catch(() => {});
    } else {
      failed++;
    }
  }
  return Response.json({ ok: true, eligible: rows.length, sent, failed });
}

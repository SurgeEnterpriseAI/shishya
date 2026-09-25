// GET /api/cron/live-test-remind — Sunday-morning alarm clock.
//
// Emails everyone who tapped "Remind me on Sunday" on the week-long
// announcement banner. Runs 6:15 AM IST Sunday (just after the test
// hall opens at 6). Idempotent: notifiedAt is stamped, so a re-run
// never double-sends. No-ops silently when no tests are open.
// Auth: Bearer ${CRON_SECRET}.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { NOT_SCHOOL_SQL } from "@/lib/db/exam-scope";
import { sendLiveTestReminderEmail } from "@/lib/email";
import { EXCLUDE_REHEARSAL_SQL } from "@/lib/live-test-today";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // Today's IST date — the reminders keyed to it are due now.
  const istToday = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

  // Sunday-paper rows only. An exam-week rehearsal stays open for days,
  // so without this filter its exam name lands in the 6:15 AM reminder
  // that people signed up for THIS SUNDAY's All-India test. 25 Sep 2026:
  // nor may a school class container's name (src/lib/db/exam-scope.ts).
  const exams = await prisma.$queryRaw<{ short: string }[]>`
    SELECT e."shortName" AS short
    FROM "LiveTest" lt JOIN "Exam" e ON e.id = lt."examId"
    WHERE lt."closesAt" > NOW() AND lt."opensAt" <= NOW() + INTERVAL '2 hours'
      AND ${EXCLUDE_REHEARSAL_SQL} AND ${NOT_SCHOOL_SQL}
    ORDER BY e."shortName"
  `.catch(() => []);
  if (exams.length === 0) {
    return Response.json({ ok: true, sent: 0, reason: "no live tests open today" });
  }

  const due = await prisma.$queryRaw<{ id: string; email: string }[]>`
    SELECT id, email FROM "LiveTestReminder"
    WHERE "sundayDate" = ${istToday}::date AND "notifiedAt" IS NULL
    LIMIT 500
  `.catch(() => []);

  let sent = 0;
  for (const r of due) {
    const ok = await sendLiveTestReminderEmail({
      to: r.email,
      exams: exams.map((e) => e.short),
      count: exams.length,
    }).catch(() => false);
    if (ok) {
      sent++;
      await prisma
        .$executeRaw`UPDATE "LiveTestReminder" SET "notifiedAt" = NOW() WHERE id = ${r.id}`
        .catch(() => {});
    }
  }

  return Response.json({ ok: true, due: due.length, sent, exams: exams.length });
}

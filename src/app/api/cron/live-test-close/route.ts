// GET /api/cron/live-test-close — final-rank delivery for closed live tests.
//
// The All-India Live Test loop used to never close (audit 18 Aug 2026):
// early submitters saw a provisional rank that drifted all day, and
// nobody ever heard a final result. This freezes each just-closed test's
// leaderboard and emails every in-window participant their final rank.
//
// DAILY, not Sunday-only (review 7 Sep 2026). The schedule was
// "0 18 * * 0" — Sunday 18:00 UTC (23:30 IST), 30 min after the Sunday
// window closes at 23:00 IST. Then wave 2 added exam-week REHEARSAL
// papers (createRehearsalLiveTests) that closed at 20:00 IST on exam eve,
// which is a WEEKDAY: a rehearsal that closed on a Tuesday fell outside
// every Sunday run's 26-hour lookback and its writers never got the one
// thing this cron exists to deliver. So "0 18 * * *" — but that put the
// rehearsal rank mail at 23:30 IST on exam eve, five hours after the
// 18:30 IST eve mail told the student tonight is for sleep.
//
// TWO runs a day since 11 Sep 2026 (vercel.json):
//   "50 12 * * *"  12:50 UTC = 18:20 IST. Rehearsals now close at 18:00
//                  IST (REHEARSAL_CLOSE_IST_HOUR, src/lib/live-test.ts);
//                  a 20-minute paper started at the last permitted second
//                  is auto-submitted by 18:20, so the board is complete
//                  and every rank mail is out before the 13:00 UTC eve mail.
//   "0 18 * * *"   18:00 UTC = 23:30 IST, unchanged: the Sunday paper
//                  (closes 17:30 UTC), rehearsal rows created before the
//                  hour changed (they keep their stored 20:00 IST closesAt),
//                  and a catch-up for anything the 12:50 run missed.
//
// Running twice a day means every paper is listed by more than one run
// (a rehearsal closing 12:30 UTC is inside the 26h lookback at 12:50 and
// again at 18:00; Sunday's paper again on Monday). That is harmless: the
// per-mock EmailTouch tag 'lt-result:{mockId}' is checked per user before
// every send, so a participant emailed once is skipped by every later run.
// A later run only re-freezes the same board and re-reads the guard.
//
// Dedup: EmailTouch tag 'lt-result:{mockId}' — one result email per user
// per test, for both paper kinds. Auth: Bearer ${CRON_SECRET}.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { liveTestFinalBoard, liveTestResultEmail } from "@/lib/live-test";
import { sendEmail } from "@/lib/email";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";

  // Tests that closed in the last ~26h (covers a missed run) and are past
  // close. LEFT JOIN the Mock so a paper is never silently dropped from
  // results delivery if its config row can't be read; config->>'rehearsalFor'
  // is the same no-migration marker EXCLUDE_REHEARSAL_SQL uses for the
  // inverse case (src/lib/live-test-today.ts) and tells the two copies apart.
  const closed = await prisma.$queryRaw<
    {
      mockId: string;
      short: string;
      examCode: string;
      rehearsalFor: string | null;
      examDayTier: string | null;
    }[]
  >`
    SELECT lt."mockId", e."shortName" AS short, e.code AS "examCode",
           m.config->>'rehearsalFor' AS "rehearsalFor",
           m.config->>'examDayTier'  AS "examDayTier"
    FROM "LiveTest" lt
    JOIN "Exam" e ON e.id = lt."examId"
    LEFT JOIN "Mock" m ON m.id = lt."mockId"
    WHERE lt."closesAt" < NOW() AND lt."closesAt" > NOW() - INTERVAL '26 hours'`.catch(() => []);

  let emailed = 0;
  const report: {
    exam: string;
    kind: "sunday" | "rehearsal";
    participants: number;
    emailed: number;
  }[] = [];

  for (const t of closed) {
    const board = await liveTestFinalBoard(t.mockId);
    const kind = t.rehearsalFor ? "rehearsal" : "sunday";
    if (dry) {
      report.push({ exam: t.short, kind, participants: board.length, emailed: 0 });
      continue;
    }
    let sent = 0;
    for (const p of board) {
      // One result email per user per test — per MOCK, so a daily run can
      // never re-email Sunday's participants on Monday.
      const already = await prisma.$queryRaw<{ n: bigint }[]>`
        SELECT COUNT(*) AS n FROM "EmailTouch"
        WHERE "userId" = ${p.userId} AND tag = ${"lt-result:" + t.mockId}`.catch(() => [{ n: BigInt(1) }]);
      if (Number(already[0]?.n ?? 1) > 0) continue;

      const { subject, html } = liveTestResultEmail(t, p);
      const ok = await sendEmail({
        to: p.email,
        unsubUserId: p.userId,
        subject,
        html,
        // Separate analytics tag so the rehearsal stream is measurable on
        // its own; the duplicate guard above is the per-mock tag, not this.
        tag: kind === "rehearsal" ? "lt-rehearsal-result" : "lt-result",
        priority: "important", // their own rank — always gets through the inbox budget
      }).catch(() => false);
      if (ok) {
        sent++;
        emailed++;
        await prisma
          .$executeRaw`INSERT INTO "EmailTouch" (id, "userId", tag) VALUES (${crypto.randomUUID()}, ${p.userId}, ${"lt-result:" + t.mockId})`
          .catch(() => {});
      }
    }
    report.push({ exam: t.short, kind, participants: board.length, emailed: sent });
  }

  return Response.json({ ok: true, dry, tests: closed.length, emailed, report });
}

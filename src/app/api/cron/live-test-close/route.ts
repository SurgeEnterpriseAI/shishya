// GET /api/cron/live-test-close — Sunday-night results delivery.
//
// The All-India Live Test loop used to never close (audit 18 Aug 2026):
// early submitters saw a provisional rank that drifted all day, and
// nobody ever heard a final result. This runs after the Sunday window
// closes (18:00 UTC = 23:30 IST), freezes each just-closed test's
// leaderboard, and emails every in-window participant their final rank.
//
// Dedup: EmailTouch tag 'lt-result' — one result email per user per
// test. Auth: Bearer ${CRON_SECRET}.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { liveTestFinalBoard } from "@/lib/live-test";
import { sendEmail } from "@/lib/email";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";

  // Tests that closed in the last ~26h (covers a missed run) and are past close.
  const closed = await prisma.$queryRaw<{ mockId: string; short: string; examCode: string }[]>`
    SELECT lt."mockId", e."shortName" AS short, e.code AS "examCode"
    FROM "LiveTest" lt JOIN "Exam" e ON e.id = lt."examId"
    WHERE lt."closesAt" < NOW() AND lt."closesAt" > NOW() - INTERVAL '26 hours'`.catch(() => []);

  let emailed = 0;
  const report: { exam: string; participants: number; emailed: number }[] = [];

  for (const t of closed) {
    const board = await liveTestFinalBoard(t.mockId);
    if (dry) {
      report.push({ exam: t.short, participants: board.length, emailed: 0 });
      continue;
    }
    let sent = 0;
    for (const p of board) {
      // One result email per user per test.
      const already = await prisma.$queryRaw<{ n: bigint }[]>`
        SELECT COUNT(*) AS n FROM "EmailTouch"
        WHERE "userId" = ${p.userId} AND tag = ${"lt-result:" + t.mockId}`.catch(() => [{ n: BigInt(1) }]);
      if (Number(already[0]?.n ?? 1) > 0) continue;

      const first = (p.name ?? "").split(" ")[0] || "Aspirant";
      const topThird = p.rank <= Math.ceil(p.of / 3);
      const ok = await sendEmail({
        to: p.email,
        unsubUserId: p.userId,
        subject: `🏆 Your All-India rank in today's ${t.short} Live Test: #${p.rank} of ${p.of}`,
        html: `<p>${first}, the results are in.</p>
<p style="font-size:16px"><b>All-India Rank #${p.rank}</b> out of <b>${p.of}</b> aspirants who took today's ${t.short} Live Test — you scored ${Math.round(p.pct)}%.</p>
<p>${
          topThird
            ? "Top third of the country today — that's real. Keep this rhythm and the rank sheet on exam day will look familiar."
            : "Every rank is a starting line. Your weak areas from today are already on your report — fix one this week and watch next Sunday's rank move."
        }</p>
<p>See the full breakdown: <a href="https://shishya.in/exams/${t.examCode}">shishya.in/exams/${t.examCode}</a><br/>
Next All-India Live Test is next Sunday — same time, fresh paper.</p>
<p>— Shishya</p>`,
        tag: "lt-result",
        priority: "important", // their own national rank — always gets through the inbox budget
      }).catch(() => false);
      if (ok) {
        sent++;
        emailed++;
        await prisma
          .$executeRaw`INSERT INTO "EmailTouch" (id, "userId", tag) VALUES (${crypto.randomUUID()}, ${p.userId}, ${"lt-result:" + t.mockId})`
          .catch(() => {});
      }
    }
    report.push({ exam: t.short, participants: board.length, emailed: sent });
  }

  return Response.json({ ok: true, dry, tests: closed.length, emailed, report });
}

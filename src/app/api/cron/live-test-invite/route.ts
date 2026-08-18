// GET /api/cron/live-test-invite — midweek personalised invitations.
//
// Founder rule (6 Aug 2026): students who already touched an exam
// should hear that THEIR exam has an All-India Live Test coming —
// "see your strengths, weaknesses, and where you stand in the crowd".
// Runs Friday 9:30 AM IST: two days of notice, still inside the week.
//
// "Touched" = active enrollment, a submitted attempt in the last 60
// days, or a coach plan on that exam. Anti-nag: EmailTouch tag
// 'lt-invite' caps it at ONE invite per user per 6 days, and anyone
// already registered for a reminder is skipped (they've been told).
// Auth: Bearer ${CRON_SECRET}.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { sendLiveTestInviteEmail } from "@/lib/email";

const MAX_SENDS = 200;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";

  // The nearest upcoming Sunday batch.
  const tests = await prisma.$queryRaw<
    { examId: string; short: string; opensAt: Date }[]
  >`
    SELECT lt."examId", e."shortName" AS short, lt."opensAt"
    FROM "LiveTest" lt JOIN "Exam" e ON e.id = lt."examId"
    WHERE lt."opensAt" > NOW()
    ORDER BY lt."opensAt" ASC
  `.catch(() => []);
  if (tests.length === 0) return Response.json({ ok: true, sent: 0, reason: "no upcoming tests" });

  const first = tests[0].opensAt.getTime();
  const batch = tests.filter((t) => t.opensAt.getTime() === first);
  const sundayIst = new Date(first + 5.5 * 3600_000);
  const sundayLabel = sundayIst.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "short", timeZone: "UTC",
  });
  const sundayDate = sundayIst.toISOString().slice(0, 10);
  const examIds = batch.map((b) => b.examId);
  const shortById = new Map(batch.map((b) => [b.examId, b.short]));

  // Students who have engaged with any of those exams.
  const targets = await prisma.$queryRaw<
    { id: string; email: string; name: string | null; examId: string; daysToExam: number | null }[]
  >`
    WITH touched AS (
      SELECT en."userId" AS uid, en."examId" AS eid
      FROM "Enrollment" en WHERE en.active = TRUE AND en."examId" = ANY(${examIds})
      UNION
      SELECT a."userId", m."examId"
      FROM "Attempt" a JOIN "Mock" m ON m.id = a."mockId"
      WHERE a."userId" IS NOT NULL AND m."examId" = ANY(${examIds})
        AND a."finishedAt" > NOW() - INTERVAL '60 days'
    )
    SELECT DISTINCT ON (u.id) u.id, u.email, u.name, t.eid AS "examId",
      (SELECT (MIN(d.date)::date - CURRENT_DATE)
         FROM "ExamImportantDate" d
        WHERE d."examId" = t.eid AND d."isExamDay" = TRUE AND d."archivedAt" IS NULL AND d.date > NOW()
      ) AS "daysToExam"
    FROM touched t JOIN "User" u ON u.id = t.uid
    WHERE u.email <> ''
      AND NOT EXISTS (
        SELECT 1 FROM "LiveTestReminder" r
        WHERE LOWER(r.email) = LOWER(u.email) AND r."sundayDate" = ${sundayDate}::date
      )
      AND NOT EXISTS (
        SELECT 1 FROM "EmailTouch" et
        WHERE et."userId" = u.id AND et.tag = 'lt-invite' AND et."sentAt" > NOW() - INTERVAL '6 days'
      )
    LIMIT ${MAX_SENDS}
  `.catch((e) => {
    console.error("live-test-invite selection failed:", e);
    return [];
  });

  // Never invite someone whose real exam lands BEFORE this Sunday —
  // the rehearsal would arrive too late to help them (dry-run caught
  // students with exam dates 1 day out).
  const daysToSunday = Math.ceil((first - Date.now()) / 86_400_000);
  const eligible = targets.filter(
    (t) => t.daysToExam == null || t.daysToExam >= daysToSunday + 1,
  );

  if (dry) {
    return Response.json({
      ok: true, dry: true, sundayLabel, exams: batch.length,
      matched: targets.length, eligible: eligible.length,
      sample: eligible.slice(0, 5).map((t) => ({ exam: shortById.get(t.examId), daysToExam: t.daysToExam })),
    });
  }

  let sent = 0, failed = 0;
  for (const t of eligible) {
    const ok = await sendLiveTestInviteEmail({
      to: t.email,
      userId: t.id,
      name: t.name,
      examShort: shortById.get(t.examId) ?? "your exam",
      daysToExam: t.daysToExam,
      sundayLabel,
    }).catch(() => false);
    if (ok) {
      sent++;
      await prisma
        .$executeRaw`INSERT INTO "EmailTouch" (id, "userId", tag) VALUES (${crypto.randomUUID()}, ${t.id}, 'lt-invite')`
        .catch(() => {});
    } else {
      failed++;
    }
  }

  return Response.json({ ok: true, sundayLabel, matched: targets.length, eligible: eligible.length, sent, failed });
}

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
//
// CROSS-EXAM SET (Exam Week Mode wave 2, play 14): students whose touched
// exam just FINISHED (last announced exam day within the last 14 days,
// nothing within 60 days) and who have no active enrollment with an exam
// day in the next 30 days are invited to Sunday's paper of the nearest
// same-track exam (same category + state) that has a LiveTest this week:
// "Your {done} is done. {next} is on {date (tier)} — Sunday's shared
// paper, national rank, free". Same 6-day cap; never before a student's
// own exam (the target's exam day must be after Sunday, like set 1).
// Auth: Bearer ${CRON_SECRET}.  ?dry=1 → both sets computed, nothing sent.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { NOT_SCHOOL_SQL, REAL_EXAM_SQL } from "@/lib/db/exam-scope";
import { sendLiveTestInviteEmail } from "@/lib/email";
import { istDay } from "@/lib/exam-week";
import { buildTimeline, type TimelineRow } from "@/lib/exam-timeline";
import { dayDiff, examDoneState, loadExamBundles, trackKey, whenWithTier, type ExamBundle } from "@/lib/exam-week-mail";

const MAX_SENDS = 200;
/** Cross-exam invites share the run's cap; this bounds their own query. */
const MAX_CROSS = 100;

type Target = { id: string; email: string; name: string | null; examId: string; daysToExam: number | null };
type CrossTarget = { id: string; email: string; name: string | null; doneExamId: string };

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const now = new Date();
  const today = istDay(now);

  // The nearest upcoming Sunday batch. 25 Sep 2026: real exams only, here
  // and in the exam-day selection below (src/lib/db/exam-scope.ts).
  const tests = await prisma.$queryRaw<
    { examId: string; short: string; opensAt: Date }[]
  >`
    SELECT lt."examId", e."shortName" AS short, lt."opensAt"
    FROM "LiveTest" lt JOIN "Exam" e ON e.id = lt."examId"
    WHERE lt."opensAt" > NOW() AND ${NOT_SCHOOL_SQL}
    ORDER BY lt."opensAt" ASC
  `.catch(() => []);
  if (tests.length === 0) return Response.json({ ok: true, dry, sent: 0, reason: "no upcoming tests" });

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
  const targets = await prisma.$queryRaw<Target[]>`
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
    WHERE u.email <> '' AND u."emailOptOut" = FALSE
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
    return [] as Target[];
  });

  // Never invite someone whose real exam lands BEFORE this Sunday —
  // the rehearsal would arrive too late to help them (dry-run caught
  // students with exam dates 1 day out).
  const daysToSunday = Math.ceil((first - Date.now()) / 86_400_000);
  const eligible = targets.filter(
    (t) => t.daysToExam == null || t.daysToExam >= daysToSunday + 1,
  );

  // ── Cross-exam set (play 14) ────────────────────────────────────────
  // 1) Exams with a typed exam-day row in the last 14 days (IST) — the
  //    candidates; examDoneState() confirms "finished" per exam.
  const recentExams = await prisma.$queryRaw<{ examId: string }[]>`
    SELECT DISTINCT d."examId"
    FROM "ExamImportantDate" d
    JOIN "Exam" e ON e.id = d."examId" AND ${REAL_EXAM_SQL}
    WHERE d."archivedAt" IS NULL AND d.kind = 'EXAM'
      AND (d.date + INTERVAL '5.5 hours')::date >= (NOW() + INTERVAL '5.5 hours')::date - 14
      AND (d.date + INTERVAL '5.5 hours')::date < (NOW() + INTERVAL '5.5 hours')::date
  `.catch((e) => {
    console.error("live-test-invite cross-exam selection failed:", e);
    return [] as { examId: string }[];
  });
  const bundles = await loadExamBundles([...recentExams.map((x) => x.examId), ...examIds]);
  const doneExams = new Map<string, ExamBundle>();
  for (const { examId } of recentExams) {
    const b = bundles.get(examId);
    if (!b) continue;
    const st = examDoneState(b.rows, b.meta.officialUrl, now, { lookbackDays: 14 });
    if (st.done) doneExams.set(examId, b);
  }
  // 2) Each batch exam's nearest upcoming typed exam day (with tier).
  const nextDayByExam = new Map<string, TimelineRow | null>();
  for (const examId of examIds) {
    const b = bundles.get(examId);
    const typed = (b?.rows ?? []).filter((r) => typeof r.kind === "string" && r.kind.length > 0);
    const rowsNext = buildTimeline(typed, now, b?.meta.officialUrl)
      .filter((r) => r.kind === "EXAM" && istDay(r.date) >= today)
      .sort((a, c) => a.date.getTime() - c.date.getTime());
    nextDayByExam.set(examId, rowsNext[0] ?? null);
  }
  // 3) Done exam → nearest same-track batch exam whose exam day is after
  //    Sunday (or unknown) — never a paper for an exam already sat.
  const targetByDone = new Map<string, { examId: string; short: string; nextDay: TimelineRow | null }>();
  const crossSkipped: { code: string; reason: string }[] = [];
  for (const [doneId, done] of doneExams) {
    const key = trackKey(done.meta);
    const options = examIds
      .filter((id) => id !== doneId && bundles.get(id) && trackKey(bundles.get(id)!.meta) === key)
      .map((id) => ({ examId: id, short: shortById.get(id) ?? bundles.get(id)!.meta.short, nextDay: nextDayByExam.get(id) ?? null }))
      .filter((o) => !o.nextDay || dayDiff(today, istDay(o.nextDay.date)) >= daysToSunday + 1)
      .sort((a, b) => {
        if (a.nextDay && b.nextDay) return a.nextDay.date.getTime() - b.nextDay.date.getTime();
        return a.nextDay ? -1 : b.nextDay ? 1 : 0;
      });
    if (options[0]) targetByDone.set(doneId, options[0]);
    else crossSkipped.push({ code: done.meta.code, reason: "no same-track paper this Sunday" });
  }
  const doneIds = Array.from(targetByDone.keys());
  const crossTargets =
    doneIds.length === 0
      ? ([] as CrossTarget[])
      : await prisma.$queryRaw<CrossTarget[]>`
    WITH touched AS (
      SELECT en."userId" AS uid, en."examId" AS eid
      FROM "Enrollment" en WHERE en.active = TRUE AND en."examId" = ANY(${doneIds})
      UNION
      SELECT a."userId", m."examId"
      FROM "Attempt" a JOIN "Mock" m ON m.id = a."mockId"
      WHERE a."userId" IS NOT NULL AND m."examId" = ANY(${doneIds})
        AND a."finishedAt" > NOW() - INTERVAL '60 days'
    )
    SELECT DISTINCT ON (u.id) u.id, u.email, u.name, t.eid AS "doneExamId"
    FROM touched t JOIN "User" u ON u.id = t.uid
    WHERE u.email <> '' AND u."emailOptOut" = FALSE
      AND NOT EXISTS (
        SELECT 1 FROM "LiveTestReminder" r
        WHERE LOWER(r.email) = LOWER(u.email) AND r."sundayDate" = ${sundayDate}::date
      )
      AND NOT EXISTS (
        SELECT 1 FROM "EmailTouch" et
        WHERE et."userId" = u.id AND et.tag = 'lt-invite' AND et."sentAt" > NOW() - INTERVAL '6 days'
      )
      -- Their own next exam comes first: no active enrollment with an
      -- exam day in the next 30 days (untyped legacy rows count too).
      AND NOT EXISTS (
        SELECT 1 FROM "Enrollment" en2
        JOIN "ExamImportantDate" d ON d."examId" = en2."examId"
        WHERE en2."userId" = u.id AND en2.active = TRUE AND d."archivedAt" IS NULL
          AND (d."isExamDay" = TRUE OR d.kind = 'EXAM')
          AND d.date >= NOW() - INTERVAL '1 day' AND d.date <= NOW() + INTERVAL '30 days'
      )
    LIMIT ${MAX_CROSS}
  `.catch((e) => {
          console.error("live-test-invite cross-exam recipients failed:", e);
          return [] as CrossTarget[];
        });
  const inSetOne = new Set(eligible.map((t) => t.id));
  const cross = crossTargets.filter((t) => !inSetOne.has(t.id) && targetByDone.has(t.doneExamId));

  if (dry) {
    return Response.json({
      ok: true, dry: true, sundayLabel, exams: batch.length,
      matched: targets.length, eligible: eligible.length,
      sample: eligible.slice(0, 5).map((t) => ({ exam: shortById.get(t.examId), daysToExam: t.daysToExam })),
      crossExam: {
        doneExams: Array.from(doneExams.values()).map((b) => b.meta.code),
        targets: Array.from(targetByDone.entries()).map(([doneId, t]) => ({
          done: doneExams.get(doneId)?.meta.code,
          next: bundles.get(t.examId)?.meta.code ?? t.examId,
          when: t.nextDay ? whenWithTier(t.nextDay) : null,
        })),
        skipped: crossSkipped,
        eligible: cross.length,
        sample: cross.slice(0, 5).map((t) => ({ done: doneExams.get(t.doneExamId)?.meta.short, next: targetByDone.get(t.doneExamId)?.short })),
      },
    });
  }

  let sent = 0, failed = 0;
  const touch = async (userId: string) =>
    prisma
      .$executeRaw`INSERT INTO "EmailTouch" (id, "userId", tag) VALUES (${crypto.randomUUID()}, ${userId}, 'lt-invite')`
      .catch(() => {});
  for (const t of eligible) {
    if (sent >= MAX_SENDS) break;
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
      await touch(t.id);
    } else {
      failed++;
    }
  }

  let crossSent = 0;
  for (const t of cross) {
    if (sent >= MAX_SENDS) break;
    const done = doneExams.get(t.doneExamId);
    const target = targetByDone.get(t.doneExamId);
    if (!done || !target) continue;
    const ok = await sendLiveTestInviteEmail({
      to: t.email,
      userId: t.id,
      name: t.name,
      examShort: target.short,
      daysToExam: target.nextDay ? dayDiff(today, istDay(target.nextDay.date)) : null,
      sundayLabel,
      crossExam: { done: done.meta.short, when: target.nextDay ? whenWithTier(target.nextDay) : null },
    }).catch(() => false);
    if (ok) {
      sent++;
      crossSent++;
      await touch(t.id);
    } else {
      failed++;
    }
  }

  return Response.json({ ok: true, sundayLabel, matched: targets.length, eligible: eligible.length, crossEligible: cross.length, sent, crossSent, failed });
}

// GET /api/cron/exam-eve — "all the best" the evening before the exam.
//
// Founder call (6 Aug 2026): students registered for an exam should
// hear from Shishya just before they sit it — wishes, a calm checklist,
// and a motivational quote that holds up whatever the outcome.
// Runs daily 6:30 PM IST; finds exams happening TOMORROW (IST) and
// emails every actively-enrolled student.
//
// DATA-CONFIDENCE GUARD (learned the same day): our exam calendar is
// partly AI-refreshed and can carry stale or contradictory rows — SSC
// CGL had an unsourced "exam tomorrow" row alongside an officially
// sourced date five weeks later. Telling 63 students their exam is
// tomorrow when it isn't would be worse than saying nothing, so an
// exam is skipped when EITHER:
//   • the date row has no source AND was written >30 days ago, or
//   • the same exam has ANOTHER exam-day row within the next 90 days
//     (i.e. the calendar contradicts itself about when the exam is).
// Anti-duplicate: EmailTouch tag 'exam-eve' per user per day.
// Auth: Bearer ${CRON_SECRET}.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { sendExamEveEmail } from "@/lib/email";
import { getDailyQuote } from "@/data/motivational-quotes";

const MAX_SENDS = 400;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";

  // Exams whose exam day is TOMORROW in IST, with the confidence guard.
  const exams = await prisma.$queryRaw<
    { examId: string; code: string; short: string; label: string }[]
  >`
    SELECT e.id AS "examId", e.code, e."shortName" AS short, d.label
    FROM "ExamImportantDate" d
    JOIN "Exam" e ON e.id = d."examId" AND e.active = TRUE
    WHERE d."isExamDay" = TRUE
      AND d."archivedAt" IS NULL
      AND (d.date + INTERVAL '5.5 hours')::date
          = (NOW() + INTERVAL '5.5 hours' + INTERVAL '1 day')::date
      -- trustworthy row: sourced, or recently refreshed
      AND (d.source IS NOT NULL OR d."createdAt" > NOW() - INTERVAL '30 days')
      -- and the calendar must not contradict itself for this exam
      AND NOT EXISTS (
        SELECT 1 FROM "ExamImportantDate" d2
        WHERE d2."examId" = e.id AND d2."isExamDay" = TRUE AND d2."archivedAt" IS NULL
          AND d2.id <> d.id
          AND d2.date > NOW() + INTERVAL '2 days'
          AND d2.date < NOW() + INTERVAL '90 days'
          AND d2.label ILIKE '%exam%'
      )
    GROUP BY e.id, e.code, e."shortName", d.label
  `.catch((err) => {
    console.error("[exam-eve] selection failed", err);
    return [];
  });

  // NOTE (review 22 Aug 2026): no early return here — the coach-plan
  // recipient source below must run even when the global calendar has no
  // confidently-dated exam tomorrow (that is exactly the case it exists
  // for). An empty `exams` simply skips the enrollment loop.

  const quote = getDailyQuote();
  const report: { exam: string; students: number; sent: number }[] = [];
  let totalSent = 0;

  for (const ex of exams) {
    const students = await prisma.$queryRaw<{ id: string; email: string; name: string | null }[]>`
      SELECT u.id, u.email, u.name
      FROM "Enrollment" en JOIN "User" u ON u.id = en."userId"
      WHERE en."examId" = ${ex.examId} AND en.active = TRUE AND u.email <> '' AND u."emailOptOut" = FALSE
        AND NOT EXISTS (
          SELECT 1 FROM "EmailTouch" t
          WHERE t."userId" = u.id AND t.tag = 'exam-eve'
            AND t."sentAt" > NOW() - INTERVAL '20 hours'
        )
      LIMIT ${MAX_SENDS}
    `.catch(() => []);

    if (dry) {
      report.push({ exam: ex.short, students: students.length, sent: 0 });
      continue;
    }

    let sent = 0;
    for (const s of students) {
      const ok = await sendExamEveEmail({
        to: s.email,
        userId: s.id,
        name: s.name,
        examShort: ex.short,
        quote: { text: quote.text, author: quote.author },
      }).catch(() => false);
      if (ok) {
        sent++;
        await prisma
          .$executeRaw`INSERT INTO "EmailTouch" (id, "userId", tag) VALUES (${crypto.randomUUID()}, ${s.id}, 'exam-eve')`
          .catch(() => {});
      }
    }
    totalSent += sent;
    report.push({ exam: ex.short, students: students.length, sent });
  }

  // Second recipient source: coach-plan holders whose OWN confirmed exam
  // date is tomorrow (IST) — the one date the student personally set,
  // which the global exam calendar above may not carry (audit 18 Aug
  // 2026). Deduped via the same 'exam-eve' EmailTouch tag so nobody who
  // already got one from the enrollment path is emailed twice.
  const coachStudents = await prisma.$queryRaw<
    { id: string; email: string; name: string | null; short: string }[]
  >`
    SELECT DISTINCT ON (u.id) u.id, u.email, u.name, e."shortName" AS short
    FROM "CoachPlan" cp
    JOIN "User" u ON u.id = cp."userId"
    JOIN "Exam" e ON e.id = cp."examId"
    WHERE u.email <> '' AND u."emailOptOut" = FALSE
      AND (cp."examDate" + INTERVAL '5.5 hours')::date
          = (NOW() + INTERVAL '5.5 hours' + INTERVAL '1 day')::date
      AND NOT EXISTS (
        SELECT 1 FROM "EmailTouch" t
        WHERE t."userId" = u.id AND t.tag = 'exam-eve'
          AND t."sentAt" > NOW() - INTERVAL '20 hours'
      )
    LIMIT ${MAX_SENDS}
  `.catch(() => []);

  let coachSent = 0;
  if (!dry) {
    for (const s of coachStudents) {
      const ok = await sendExamEveEmail({
        to: s.email,
        userId: s.id,
        name: s.name,
        examShort: s.short,
        quote: { text: quote.text, author: quote.author },
      }).catch(() => false);
      if (ok) {
        coachSent++;
        totalSent++;
        await prisma
          .$executeRaw`INSERT INTO "EmailTouch" (id, "userId", tag) VALUES (${crypto.randomUUID()}, ${s.id}, 'exam-eve')`
          .catch(() => {});
      }
    }
  }
  report.push({ exam: "(coach-plan dates)", students: coachStudents.length, sent: coachSent });

  return Response.json({ ok: true, dry, exams: exams.length, sent: totalSent, report });
}

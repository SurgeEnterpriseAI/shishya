// GET /api/cron/exam-day-after — "How did the paper go?" the morning
// after the exam day (Exam Week Mode, 6 Sep 2026). Runs 03:00 UTC =
// 08:30 IST, ~38 h after the exam-eve cron (18:30 IST, two evenings back).
//
// Recipients: users who RECEIVED the exam-eve mail (EmailTouch tag
// 'exam-eve' — the eve cron's own guard row — or 'sent:exam-eve', the
// send-layer log) within the last 40 h, are not opted out, and are
// actively enrolled in — or hold a coach plan dated yesterday for — an
// exam whose exam day was yesterday (IST). The exam must pass the SAME
// eve decision the eve cron used, re-evaluated at the eve instant, so a
// student who got "all the best for SSC CGL" is never asked about a
// different exam the calendar disagreed on.
// One send per (user, exam day): EmailTouch tag 'sent:exam-day-after'
// (written by the send layer) within 20 h.
//
// Content is deterministic DB reads only — no LLM, no prediction:
//   • three one-tap verdict links → /exams/{code}?verdict=EASY|MODERATE|TOUGH
//     (the hub block preselects the chip and posts it);
//   • answer-key / result rows from the tracker WITH their tier word, or
//     "not announced yet" — never a guessed date;
//   • "what score qualifies" → /exams/{code}/cutoff;
//   • the next exam in the same category + state 7–60 days out (the
//     student's own other enrollments first), with its tier.
// Auth: Bearer ${CRON_SECRET}.  ?dry=1 → compute the recipient list per
// exam, send nothing.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { sendExamDayAfterEmail } from "@/lib/email";
import { computeExamWeekState, istDay } from "@/lib/exam-week";
import { buildTimeline } from "@/lib/exam-timeline";
import {
  examEveDecision,
  examRowOnDay,
  loadExamBundles,
  nextExamsInTrack,
  plainDay,
  rowOnOrAfter,
  statusLine,
  tierWord,
  whenWithTier,
  type ExamBundle,
  type NextExam,
} from "@/lib/exam-week-mail";

const MAX_SENDS = 400;
const DAY_MS = 86_400_000;
/** Eve cron (18:30 IST, D-1) → this cron (08:30 IST, D+1). */
const EVE_OFFSET_MS = 38 * 3600_000;

type Student = { id: string; email: string; name: string | null };

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const started = Date.now();
  const now = new Date();
  const yesterday = istDay(new Date(now.getTime() - DAY_MS));
  const eveInstant = new Date(now.getTime() - EVE_OFFSET_MS);
  const outOfTime = () => Date.now() - started > (maxDuration - 30) * 1000;

  // 1) Exams with a live exam-day row dated yesterday (IST).
  const trackerExams = await prisma.$queryRaw<{ examId: string }[]>`
    SELECT DISTINCT d."examId"
    FROM "ExamImportantDate" d
    JOIN "Exam" e ON e.id = d."examId" AND e.active = TRUE
    WHERE d."archivedAt" IS NULL
      AND (d."isExamDay" = TRUE OR d.kind = 'EXAM')
      AND (d.date + INTERVAL '5.5 hours')::date = (NOW() + INTERVAL '5.5 hours' - INTERVAL '1 day')::date
  `.catch((err) => {
    console.error("[exam-day-after] selection failed", err);
    return [] as { examId: string }[];
  });

  // 2) Exams some student's coach plan dated yesterday (their eve mail
  //    went out on the coach-plan path regardless of the tracker).
  const coachExams = await prisma.$queryRaw<{ examId: string }[]>`
    SELECT DISTINCT cp."examId"
    FROM "CoachPlan" cp
    JOIN "Exam" e ON e.id = cp."examId" AND e.active = TRUE
    WHERE (cp."examDate" + INTERVAL '5.5 hours')::date = (NOW() + INTERVAL '5.5 hours' - INTERVAL '1 day')::date
  `.catch((err) => {
    console.error("[exam-day-after] coach-plan selection failed", err);
    return [] as { examId: string }[];
  });

  const bundles = await loadExamBundles([...trackerExams.map((x) => x.examId), ...coachExams.map((x) => x.examId)]);

  // Order: tracker exams whose eve decision was "send" first, then the
  // coach-plan-only exams. Each user gets at most one mail per run.
  const targets: { bundle: ExamBundle; why: "tracker" | "coach-plan" }[] = [];
  const skipped: { code: string; reason: string }[] = [];
  const coachSet = new Set(coachExams.map((x) => x.examId));
  for (const { examId } of trackerExams) {
    const bundle = bundles.get(examId);
    if (!bundle) continue;
    const decision = examEveDecision(bundle.rows, bundle.meta.officialUrl, eveInstant);
    if (decision.ok) targets.push({ bundle, why: "tracker" });
    else if (!coachSet.has(examId)) skipped.push({ code: bundle.meta.code, reason: `eve was not sent (${decision.reason})` });
  }
  const targeted = new Set(targets.map((t) => t.bundle.meta.examId));
  for (const { examId } of coachExams) {
    const bundle = bundles.get(examId);
    if (bundle && !targeted.has(examId)) targets.push({ bundle, why: "coach-plan" });
  }

  const report: { code: string; why: string; users: number; sent: number; next: string | null }[] = [];
  const mailed = new Set<string>();
  const trackCache = new Map<string, NextExam[]>();
  let totalSent = 0;

  for (const { bundle, why } of targets) {
    if (totalSent >= MAX_SENDS || outOfTime()) break;
    const { meta, rows } = bundle;
    const timeline = buildTimeline(rows, now, meta.officialUrl);
    const state = computeExamWeekState(rows, meta.officialUrl, now);
    const examDay = why === "tracker" ? examRowOnDay(timeline, yesterday) : null;
    // Coach-plan-only exams reached the student on THEIR date, not the
    // tracker's: label it as such — never dressed up as a tracker tier.
    const examDayLine = examDay
      ? whenWithTier(examDay)
      : `${plainDay(new Date(now.getTime() - DAY_MS))} (the date you set in your coach plan)`;
    const windowEnd = state.windowEnd && istDay(state.windowEnd.date) > yesterday ? state.windowEnd : null;
    const answerKeyLine = statusLine("ew.post.key", rowOnOrAfter(timeline, "ANSWER_KEY", yesterday));
    const resultLine = statusLine("ew.post.result", rowOnOrAfter(timeline, "RESULT", yesterday));

    const trackKey = `${meta.category}|${meta.state ?? ""}`;
    let candidates = trackCache.get(trackKey);
    if (!candidates) {
      candidates = await nextExamsInTrack(meta, now);
      trackCache.set(trackKey, candidates);
    }
    const inTrack = candidates.filter((c) => c.examId !== meta.examId);

    const students = await prisma.$queryRaw<Student[]>`
      SELECT u.id, u.email, u.name
      FROM "User" u
      WHERE u.email <> '' AND u."emailOptOut" = FALSE
        AND EXISTS (
          SELECT 1 FROM "EmailTouch" t
          WHERE t."userId" = u.id AND t.tag IN ('exam-eve', 'sent:exam-eve')
            AND t."sentAt" > NOW() - INTERVAL '40 hours'
        )
        AND NOT EXISTS (
          SELECT 1 FROM "EmailTouch" t
          WHERE t."userId" = u.id AND t.tag = 'sent:exam-day-after'
            AND t."sentAt" > NOW() - INTERVAL '20 hours'
        )
        AND (
          ${why === "tracker"
            ? Prisma.sql`EXISTS (
            SELECT 1 FROM "Enrollment" en
            WHERE en."userId" = u.id AND en."examId" = ${meta.examId} AND en.active = TRUE
          ) OR`
            : Prisma.empty}
          EXISTS (
            SELECT 1 FROM "CoachPlan" cp
            WHERE cp."userId" = u.id AND cp."examId" = ${meta.examId}
              AND (cp."examDate" + INTERVAL '5.5 hours')::date = (NOW() + INTERVAL '5.5 hours' - INTERVAL '1 day')::date
          )
        )
      LIMIT ${MAX_SENDS}
    `.catch((err) => {
      console.error("[exam-day-after] recipients failed", err);
      return [] as Student[];
    });
    const pending = students.filter((s) => !mailed.has(s.id));

    // The student's other active enrollments decide which "next exam in
    // your track" they see; the earliest in the track otherwise.
    const enrolled = new Map<string, Set<string>>();
    if (inTrack.length > 0 && pending.length > 0) {
      const rowsEnr = await prisma.$queryRaw<{ userId: string; examId: string }[]>`
        SELECT "userId", "examId" FROM "Enrollment"
        WHERE active = TRUE AND "userId" IN (${Prisma.join(pending.map((s) => s.id))})
      `.catch(() => [] as { userId: string; examId: string }[]);
      for (const r of rowsEnr) {
        const set = enrolled.get(r.userId) ?? new Set<string>();
        set.add(r.examId);
        enrolled.set(r.userId, set);
      }
    }
    const pickNext = (userId: string): NextExam | null => {
      const mine = enrolled.get(userId);
      return (mine && inTrack.find((c) => mine.has(c.examId))) ?? inTrack[0] ?? null;
    };

    let sent = 0;
    if (!dry) {
      for (const s of pending) {
        if (totalSent >= MAX_SENDS || outOfTime()) break;
        const next = pickNext(s.id);
        const ok = await sendExamDayAfterEmail({
          to: s.email,
          userId: s.id,
          name: s.name,
          examShort: meta.short,
          examCode: meta.code,
          examDayLine,
          windowEndLine: windowEnd ? whenWithTier(windowEnd) : null,
          answerKeyLine,
          resultLine,
          nextExam: next ? { code: next.code, short: next.short, date: plainDay(next.row.date), tier: tierWord(next.row.tier) } : null,
        }).catch(() => false);
        if (ok) {
          sent++;
          totalSent++;
          mailed.add(s.id);
        }
      }
    }
    report.push({
      code: meta.code,
      why,
      users: pending.length,
      sent,
      next: inTrack[0] ? `${inTrack[0].short} ${whenWithTier(inTrack[0].row)}` : null,
    });
  }

  return Response.json({
    ok: true,
    dry,
    yesterday,
    exams: targets.length,
    sent: totalSent,
    report,
    skipped,
    elapsedMs: Date.now() - started,
  });
}

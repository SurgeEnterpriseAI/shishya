// GET /api/cron/exam-day-after — "How did the paper go?" the morning
// after the exam day (Exam Week Mode, 6 Sep 2026). Runs 03:00 UTC =
// 08:30 IST, ~38 h after the exam-eve cron (18:30 IST, two evenings back).
//
// Recipients: users who RECEIVED the exam-eve mail FOR THIS EXAM — the
// exam-scoped EmailTouch tag 'exam-eve-{CODE}' (wave 2) within the last
// 40 h. Rows written before the scoped tag shipped carry only the generic
// 'exam-eve' / 'sent:exam-eve' tags; those are accepted only until
// 2026-09-09 (see LEGACY_TOUCH_BEFORE — the eve cron still writes the
// generic tag, so a longer grace leaves exam scoping inert).
// They must also be not opted out
// and actively enrolled in — or hold a coach plan dated yesterday for — an
// exam whose exam day was yesterday (IST). The exam must pass the SAME eve
// decision the eve cron used, re-evaluated at the eve instant, so a student
// who got "all the best for SSC CGL" is never asked about a different exam
// the calendar disagreed on.
//
// SHIFT DAYS (wave 2): a student with Enrollment.shiftDate is asked on the
// morning after THEIR day, not the window's first day — on the first-day
// morning they are skipped unless their shift was the first day; on their
// own day-after they are picked up by the shift path (which requires the
// scoped eve touch, i.e. they got the eve mail the evening before).
// Only THIS window's announced days move a student (review fix, 7 Sep): a
// stale shiftDate from an earlier cycle is ignored, exactly as the hub
// ignores it (applyShiftDay, src/lib/exam-week-student.ts), and the
// coach-plan membership obeys the same rule instead of ignoring shiftDate
// and asking the same student twice. The shift mail is about ONE day, so
// it carries no window-end line.
//
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
//     student's own enrollments first), with its tier.
// Auth: Bearer ${CRON_SECRET}.  ?dry=1 → compute the recipient list per
// exam, send nothing.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { sendExamDayAfterEmail } from "@/lib/email";
import { computeExamWeekState, istDay } from "@/lib/exam-week";
import { shiftableDays } from "@/lib/exam-week-student";
import { buildTimeline } from "@/lib/exam-timeline";
import {
  examEveDecision,
  examRowOnDay,
  loadExamBundles,
  nextExamsInTrack,
  pickNextInTrack,
  plainDay,
  rowOnOrAfter,
  shiftTierWord,
  statusLine,
  tierWord,
  trackKey,
  whenWithTier,
  windowContainsDay,
  type ExamBundle,
  type NextExam,
} from "@/lib/exam-week-mail";

const MAX_SENDS = 400;
const DAY_MS = 86_400_000;
/** Eve cron (18:30 IST, D-1) → this cron (08:30 IST, D+1). */
const EVE_OFFSET_MS = 38 * 3600_000;
/** Generic 'exam-eve' touches are accepted only when written before this
 *  instant. The grace exists for rows written BEFORE the scoped tag shipped
 *  (deploy 7 Sep 2026) — and only those matter, for the ~40 h the eve-touch
 *  lookback reaches back. It cannot run longer: the eve cron still writes
 *  the generic 'exam-eve' / 'sent:exam-eve' tags today, so every extra day
 *  of grace is a day exam scoping is inert and the wrong-exam mail wave 2
 *  fixed can happen again (e.g. through SSC CGL opening on 12 Sep). */
const LEGACY_TOUCH_BEFORE = "2026-09-09";

type Student = { id: string; email: string; name: string | null };
type Why = "tracker" | "coach-plan" | "shift-day";

function scopedTag(code: string): string {
  return `exam-eve-${code.replace(/[^A-Za-z0-9_-]/g, "-")}`;
}

/** `en."shiftDate" IN (…)` over the window's OTHER announced days — the
 *  student sat one of them, so yesterday's paper was not theirs. FALSE when
 *  the window has no other day, which leaves the caller's guard a no-op.
 *  Days are compared as dates (Enrollment.shiftDate is @db.Date). */
function onAnotherShiftDay(days: string[]): Prisma.Sql {
  if (days.length === 0) return Prisma.sql`FALSE`;
  return Prisma.sql`en."shiftDate" IN (${Prisma.join(days.map((d) => Prisma.sql`${d}::date`))})`;
}

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
  const yesterdayDate = new Date(yesterday + "T00:00:00Z");
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

  // 3) Exams where some active enrollment names YESTERDAY as the student's
  //    shift day (wave 2) — verified against the window per exam below.
  const shiftExams = await prisma.$queryRaw<{ examId: string }[]>`
    SELECT DISTINCT en."examId"
    FROM "Enrollment" en
    JOIN "Exam" e ON e.id = en."examId" AND e.active = TRUE
    WHERE en.active = TRUE AND en."shiftDate" = ${yesterday}::date
  `.catch((err) => {
    console.error("[exam-day-after] shift-day selection failed", err);
    return [] as { examId: string }[];
  });

  const bundles = await loadExamBundles([
    ...trackerExams.map((x) => x.examId),
    ...coachExams.map((x) => x.examId),
    ...shiftExams.map((x) => x.examId),
  ]);

  // Order: tracker exams whose eve decision was "send" first, then the
  // coach-plan-only exams, then shift-day exams. Each user gets at most
  // one mail per run.
  const targets: { bundle: ExamBundle; why: Why }[] = [];
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
    if (bundle && !targeted.has(examId)) {
      targets.push({ bundle, why: "coach-plan" });
      targeted.add(examId);
    }
  }
  for (const { examId } of shiftExams) {
    const bundle = bundles.get(examId);
    if (!bundle) continue;
    // A first-day exam already includes its shiftDate = yesterday students.
    if (targeted.has(examId) && targets.some((t) => t.bundle.meta.examId === examId && t.why === "tracker")) continue;
    const state = computeExamWeekState(bundle.rows, bundle.meta.officialUrl, now);
    if (!windowContainsDay(state, yesterday)) {
      skipped.push({ code: `${bundle.meta.code} (shift-day)`, reason: `yesterday is not inside an announced exam window (phase:${state.phase})` });
      continue;
    }
    // When yesterday WAS the window's first day, this is the same paper the
    // tracker path asks about, so it owes the same eve decision (re-evaluated
    // at the eve instant): an exam whose eve mail was refused must not reach
    // the student here through their shiftDate (review fix, 7 Sep).
    const firstDay = state.windowDays.map((r) => istDay(r.date)).sort()[0];
    if (yesterday === firstDay) {
      const decision = examEveDecision(bundle.rows, bundle.meta.officialUrl, eveInstant);
      if (!decision.ok) {
        skipped.push({ code: `${bundle.meta.code} (shift-day)`, reason: `eve was not sent (${decision.reason})` });
        continue;
      }
    }
    targets.push({ bundle, why: "shift-day" });
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
    const examDay = why === "coach-plan" ? null : examRowOnDay(timeline, yesterday);
    // Coach-plan-only exams reached the student on THEIR date, not the
    // tracker's: label it as such — never dressed up as a tracker tier. A
    // shift day with no row of its own carries the window's tier.
    let examDayLine: string;
    if (examDay) examDayLine = whenWithTier(examDay);
    else if (why === "shift-day") {
      const days = state.windowDays.map((r) => istDay(r.date)).sort();
      const firstRow = state.windowDays.find((r) => istDay(r.date) === days[0]) ?? state.windowDays[0];
      examDayLine = `${plainDay(yesterdayDate)} (${shiftTierWord(firstRow.tier)})`;
    } else examDayLine = `${plainDay(yesterdayDate)} (the date you set in your coach plan)`;
    // A shift-day mail is about ONE day — the student's own — so it never
    // carries the window range: "your exam window opened yesterday, 15 Sep,
    // and runs to 25 Sep" is false when the window opened on the 12th. null
    // falls through to the single-day opener in sendExamDayAfterEmail.
    const windowEnd = state.windowEnd && istDay(state.windowEnd.date) > yesterday ? state.windowEnd : null;
    // Same reasoning for a coach-plan mail: its day is the date the student
    // typed into their plan, not the day the tracker's window opened, so
    // "your window opened yesterday … and runs to" would be false there too.
    const windowEndLine =
      why === "shift-day" || why === "coach-plan" || !windowEnd ? null : whenWithTier(windowEnd);
    const answerKeyLine = statusLine("ew.post.key", rowOnOrAfter(timeline, "ANSWER_KEY", yesterday));
    const resultLine = statusLine("ew.post.result", rowOnOrAfter(timeline, "RESULT", yesterday));

    const tk = trackKey(meta);
    let candidates = trackCache.get(tk);
    if (!candidates) {
      candidates = await nextExamsInTrack(meta, now);
      trackCache.set(tk, candidates);
    }
    const inTrack = candidates.filter((c) => c.examId !== meta.examId);

    // Eve-touch proof: the exam-scoped tag, or a generic one written before
    // the scoped tag shipped (short grace, LEGACY_TOUCH_BEFORE).
    const eveTouch = Prisma.sql`EXISTS (
          SELECT 1 FROM "EmailTouch" t
          WHERE t."userId" = u.id AND t."sentAt" > NOW() - INTERVAL '40 hours'
            AND (
              t.tag = ${scopedTag(meta.code)}
              OR (t.tag IN ('exam-eve', 'sent:exam-eve') AND t."sentAt" < ${LEGACY_TOUCH_BEFORE}::timestamp)
            )
        )`;
    // The window's OTHER announced days: a student booked on one of them is
    // asked on THEIR morning, not this one. Only days of THIS window count —
    // a stale shiftDate from an earlier cycle is ignored, so the student
    // stays on the window's first-day mail (the hub's applyShiftDay ignores
    // it too, and mail and hub must not disagree).
    const otherShiftDays = shiftableDays(state)
      .map((r) => istDay(r.date))
      .filter((d) => d !== yesterday);
    const elsewhere = onAnotherShiftDay(otherShiftDays);
    // Coach-plan holders used to be pulled in with no shiftDate condition at
    // all, so a student on shift 15 Sep was asked on the window's first-day
    // morning AND again after their own day (review fix, 7 Sep).
    const coachPlanYesterday = Prisma.sql`EXISTS (
            SELECT 1 FROM "CoachPlan" cp
            WHERE cp."userId" = u.id AND cp."examId" = ${meta.examId}
              AND (cp."examDate" + INTERVAL '5.5 hours')::date = (NOW() + INTERVAL '5.5 hours' - INTERVAL '1 day')::date
          ) AND NOT EXISTS (
            SELECT 1 FROM "Enrollment" en
            WHERE en."userId" = u.id AND en."examId" = ${meta.examId} AND en.active = TRUE
              AND en."shiftDate" IS NOT NULL AND (${elsewhere})
          )`;
    const membership =
      why === "tracker"
        ? Prisma.sql`(
          EXISTS (
            SELECT 1 FROM "Enrollment" en
            WHERE en."userId" = u.id AND en."examId" = ${meta.examId} AND en.active = TRUE
              AND (en."shiftDate" IS NULL OR NOT (${elsewhere}))
          ) OR (${coachPlanYesterday})
        )`
        : why === "shift-day"
          ? Prisma.sql`EXISTS (
            SELECT 1 FROM "Enrollment" en
            WHERE en."userId" = u.id AND en."examId" = ${meta.examId} AND en.active = TRUE
              AND en."shiftDate" = ${yesterday}::date
          )`
          : Prisma.sql`(${coachPlanYesterday})`;

    const students = await prisma.$queryRaw<Student[]>`
      SELECT u.id, u.email, u.name
      FROM "User" u
      WHERE u.email <> '' AND u."emailOptOut" = FALSE
        AND ${eveTouch}
        AND NOT EXISTS (
          SELECT 1 FROM "EmailTouch" t
          WHERE t."userId" = u.id AND t.tag = 'sent:exam-day-after'
            AND t."sentAt" > NOW() - INTERVAL '20 hours'
        )
        AND ${membership}
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
    const pickNext = (userId: string): NextExam | null => pickNextInTrack(inTrack, enrolled.get(userId) ?? [], meta.examId);

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
          windowEndLine,
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

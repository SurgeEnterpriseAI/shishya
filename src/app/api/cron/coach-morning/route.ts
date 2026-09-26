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
// Exam Week Mode wave 2 (play 10): the plan's exam is checked against the
// tracker via examDoneState(). If its last announced exam day is past and
// nothing is scheduled within 60 days (and the plan predates that day —
// a plan created after it is next-cycle prep), the mail rolls over to the
// next exam in the track with ITS tracker date + tier word and offers
// "Set up my next plan"; with no candidate it goes generic (no exam name,
// no countdown). Otherwise the plan's own date drives the countdown as
// before, plus one exam-week line in phase week / eve.
//
// Two honesty fixes (7 Sep 2026):
//   • ROLLOVER NEVER HEADLINES A COUNTDOWN. The next exam's tracker date is
//     often expected-tier, and "30 days to your SSC CHSL exam" in the
//     subject/H1 read as a firm date with no tier word — and named an exam
//     the student isn't preparing for. Rollover now passes daysLeft null
//     (heading falls back to "Your plan for today") and names the next exam
//     only inside the rollover block, which carries its date + tier word.
//   • ONE MAIL, ONE EXAM DAY. The exam-week line used to key off the
//     window's FIRST day while the countdown came from CoachPlan.examDate —
//     a 15 Sep shift got "exam tomorrow, 12 Sep". The line is now keyed on
//     the plan's own day (and, on a rollover, the student's shiftDate); if
//     the tracker still lands on a different day the line is dropped rather
//     than printed as a second countdown.
//
// Dedup: EmailTouch tag 'coach-morning', one per user per day.
// Auth: Bearer ${CRON_SECRET}.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { prisma } from "@/lib/db/prisma";
import { NOT_SCHOOL_SQL, notSchoolSql } from "@/lib/db/exam-scope";
import { sendCoachDayEmail, type MailRollover } from "@/lib/email";
import { istDay } from "@/lib/exam-week";
import {
  examDoneState,
  examWeekMailLine,
  loadExamBundles,
  nextExamsInTrack,
  pickNextInTrack,
  trackKey,
  whenWithTier,
  type ExamWeekMailLine,
  type NextExam,
} from "@/lib/exam-week-mail";
import { shiftDayIso } from "@/lib/exam-week-student";

const MAX_SENDS = 500;

type Row = {
  userId: string;
  email: string;
  name: string | null;
  examId: string;
  code: string;
  short: string;
  tasks: unknown;
  note: string | null;
  daysLeft: number;
  /** The plan's own exam date (@db.Date → UTC midnight) — the day the
   *  countdown counts to, and the day the exam-week line must agree with. */
  examDate: Date;
  planCreatedAt: Date;
};

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const now = new Date();

  // Today's IST calendar day = the CoachDay.date key (stored as a DATE at
  // UTC midnight of the IST day).
  const IST_MS = 5.5 * 3600_000;
  const istTodayMidnight = Math.floor((Date.now() + IST_MS) / 86_400_000) * 86_400_000;
  const dayKey = new Date(istTodayMidnight);

  const rows = await prisma
    .$queryRaw<Row[]>`
      SELECT latest."userId", latest.email, latest.name, latest."examId", latest.code, latest.short,
        latest.tasks, latest.note, latest."daysLeft", latest."examDate", latest."planCreatedAt"
      FROM (
        SELECT DISTINCT ON (cd."userId") cd."userId", u.email, u.name,
          cp."examId", e.code, e."shortName" AS short, e.category, cd.tasks, cd.note,
          GREATEST(0, CEIL(EXTRACT(EPOCH FROM (cp."examDate" - NOW())) / 86400))::int AS "daysLeft",
          cp."examDate", cp."createdAt" AS "planCreatedAt"
        FROM "CoachDay" cd
        JOIN "CoachPlan" cp ON cp."userId" = cd."userId"
        JOIN "User" u ON u.id = cd."userId"
        JOIN "Exam" e ON e.id = cp."examId"
        WHERE cd.date = ${dayKey} AND u.email <> '' AND u."emailOptOut" = FALSE
          AND NOT EXISTS (
            SELECT 1 FROM "EmailTouch" t
            WHERE t."userId" = cd."userId" AND t.tag = 'coach-morning'
              AND t."sentAt" > NOW() - INTERVAL '20 hours'
          )
        ORDER BY cd."userId", cp."updatedAt" DESC
      ) latest
      -- 25 Sep 2026: exam coaching mail only; a school class plan never mails.
      -- The newest plan is picked FIRST and dropped when it is a school plan:
      -- today's CoachDay tasks were written for the newest plan
      -- (coach-plan.ts loadPlanContext), so falling back to an older exam
      -- plan would print that exam's name and countdown over school tasks.
      WHERE ${notSchoolSql("latest")}
      ORDER BY latest."userId"
      LIMIT ${MAX_SENDS}
    `.catch((e) => {
      console.error("[coach-morning] selection failed", e);
      return [] as Row[];
    });
  if (rows.length === 0) return Response.json({ ok: true, dry, eligible: 0, sent: 0 });

  // Exam-week machinery, batched: tracker bundles per exam, the batch's
  // active enrollments (the rollover prefers the student's own), next-in-
  // track candidates once per track, the exam-week line once per exam.
  const bundles = await loadExamBundles(rows.map((r) => r.examId));
  const enrolled = new Map<string, Set<string>>();
  /** "userId|examId" → the student's own shift day, when they picked one. */
  const shiftBy = new Map<string, string | null>();
  type EnrRow = { userId: string; examId: string; shiftDate: Date | null };
  // 26 Sep 2026: real exams only — a school class enrolment (Class 8-12
  // student mode) is never "the student's own next exam".
  const enrRows = await prisma.$queryRaw<EnrRow[]>`
    SELECT en."userId", en."examId", en."shiftDate" FROM "Enrollment" en JOIN "Exam" e ON e.id = en."examId"
    WHERE en.active = TRUE AND en."userId" = ANY(${rows.map((r) => r.userId)}) AND ${NOT_SCHOOL_SQL}
  `.catch(() => [] as EnrRow[]);
  for (const r of enrRows) {
    const set = enrolled.get(r.userId) ?? new Set<string>();
    set.add(r.examId);
    enrolled.set(r.userId, set);
    shiftBy.set(`${r.userId}|${r.examId}`, shiftDayIso(r.shiftDate));
  }
  const trackCache = new Map<string, NextExam[]>();
  const weekLineCache = new Map<string, ExamWeekMailLine | null>();

  type Prepared = {
    row: Row;
    tasks: string[];
    examShort: string | null;
    daysLeft: number | null;
    rollover: MailRollover | null;
    examWeek: ExamWeekMailLine | null;
    mode: string;
  };
  const prepared: Prepared[] = [];
  for (const r of rows) {
    const tasks = Array.isArray(r.tasks)
      ? (r.tasks as { label?: string }[]).map((t) => t?.label).filter((l): l is string => !!l).slice(0, 3)
      : [];
    if (tasks.length === 0) continue; // nothing to say — don't send an empty plan

    const bundle = bundles.get(r.examId) ?? null;
    const st = bundle ? examDoneState(bundle.rows, bundle.meta.officialUrl, now) : null;
    const planAfter = st?.lastDay ? istDay(r.planCreatedAt) > istDay(st.lastDay.date) : false;
    if (bundle && st && st.done && !planAfter) {
      const key = trackKey(bundle.meta);
      let candidates = trackCache.get(key);
      if (!candidates) {
        candidates = await nextExamsInTrack(bundle.meta, now);
        trackCache.set(key, candidates);
      }
      const next = pickNextInTrack(candidates, enrolled.get(r.userId) ?? [], r.examId);
      if (next) {
        // The next exam is a SUGGESTION — this student's plan was for the
        // finished one. Name it only inside the rollover block (which
        // carries its date AND tier word) unless they are actually enrolled
        // in it; and never count down to it in the subject / H1, where the
        // tier word cannot travel with the number.
        const alsoEnrolled = (enrolled.get(r.userId) ?? new Set<string>()).has(next.examId);
        const nextBundle = bundles.get(next.examId) ?? (await loadExamBundles([next.examId])).get(next.examId) ?? null;
        if (nextBundle) bundles.set(next.examId, nextBundle);
        // The exam-week line ("exam in N days") is a preparing-for-it line,
        // so it only renders for a student who IS enrolled in the next exam
        // — keyed on their own shift day when they picked one.
        let examWeek: ExamWeekMailLine | null = null;
        if (alsoEnrolled) {
          const nextShift = shiftBy.get(`${r.userId}|${next.examId}`) ?? null;
          const cacheKey = `${next.examId}|${nextShift ?? ""}`;
          if (weekLineCache.has(cacheKey)) examWeek = weekLineCache.get(cacheKey) ?? null;
          else {
            examWeek = nextBundle ? await examWeekMailLine(nextBundle, now, nextShift).catch(() => null) : null;
            weekLineCache.set(cacheKey, examWeek);
          }
        }
        prepared.push({
          row: r,
          tasks,
          examShort: alsoEnrolled ? next.short : null,
          // Never a bare countdown to a rollover suggestion: the next exam's
          // date is often expected-tier and the subject / H1 cannot carry the
          // tier word. The rollover block prints it WITH its tier instead.
          daysLeft: null,
          rollover: { done: r.short, next: { code: next.code, short: next.short, when: whenWithTier(next.row) } },
          examWeek,
          mode: `next:${r.code}→${next.code}`,
        });
      } else {
        prepared.push({ row: r, tasks, examShort: null, daysLeft: null, rollover: { done: r.short, next: null }, examWeek: null, mode: `generic:${r.code}` });
      }
      continue;
    }
    // ONE MAIL, ONE EXAM DAY: the countdown above comes from the plan's own
    // examDate, so the exam-week line is keyed on that same day (a shift the
    // student picked is what the plan holds). applyShiftDay inside
    // examWeekMailLine accepts it only when it IS one of the window's
    // announced exam days; when the tracker still points elsewhere we drop
    // the line rather than print a second, contradicting countdown.
    const planDay = shiftDayIso(r.examDate);
    const cacheKey = `${r.examId}|${planDay ?? ""}`;
    let examWeek = weekLineCache.get(cacheKey) ?? null;
    if (!weekLineCache.has(cacheKey)) {
      examWeek = bundle ? await examWeekMailLine(bundle, now, planDay).catch(() => null) : null;
      weekLineCache.set(cacheKey, examWeek);
    }
    if (examWeek && planDay && examWeek.focusDay !== planDay) examWeek = null;
    prepared.push({ row: r, tasks, examShort: r.short, daysLeft: r.daysLeft, rollover: null, examWeek, mode: "same" });
  }

  if (dry) {
    const modes: Record<string, number> = {};
    for (const p of prepared) modes[p.mode] = (modes[p.mode] ?? 0) + 1;
    return Response.json({
      ok: true,
      dry: true,
      eligible: rows.length,
      prepared: prepared.length,
      modes,
      sample: prepared.slice(0, 5).map((p) => ({ name: p.row.name, short: p.examShort, daysLeft: p.daysLeft, mode: p.mode, examWeek: p.examWeek?.text ?? null })),
    });
  }

  let sent = 0, failed = 0;
  for (const p of prepared) {
    const ok = await sendCoachDayEmail({
      to: p.row.email,
      userId: p.row.userId,
      name: p.row.name,
      examShort: p.examShort,
      daysLeft: p.daysLeft,
      tasks: p.tasks,
      note: p.row.note,
      examWeek: p.examWeek ? { text: p.examWeek.text, html: p.examWeek.html } : null,
      rollover: p.rollover,
    }).catch(() => false);
    if (ok) {
      sent++;
      await prisma
        .$executeRaw`INSERT INTO "EmailTouch" (id, "userId", tag) VALUES (${crypto.randomUUID()}, ${p.row.userId}, 'coach-morning')`
        .catch(() => {});
    } else {
      failed++;
    }
  }
  return Response.json({ ok: true, eligible: rows.length, sent, failed });
}

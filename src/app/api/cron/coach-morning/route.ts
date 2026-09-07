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
// Dedup: EmailTouch tag 'coach-morning', one per user per day.
// Auth: Bearer ${CRON_SECRET}.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { prisma } from "@/lib/db/prisma";
import { sendCoachDayEmail, type MailRollover } from "@/lib/email";
import { istDay } from "@/lib/exam-week";
import {
  dayDiff,
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
  const today = istDay(now);

  // Today's IST calendar day = the CoachDay.date key (stored as a DATE at
  // UTC midnight of the IST day).
  const IST_MS = 5.5 * 3600_000;
  const istTodayMidnight = Math.floor((Date.now() + IST_MS) / 86_400_000) * 86_400_000;
  const dayKey = new Date(istTodayMidnight);

  const rows = await prisma
    .$queryRaw<Row[]>`
      SELECT DISTINCT ON (cd."userId") cd."userId", u.email, u.name,
        cp."examId", e.code, e."shortName" AS short, cd.tasks, cd.note,
        GREATEST(0, CEIL(EXTRACT(EPOCH FROM (cp."examDate" - NOW())) / 86400))::int AS "daysLeft",
        cp."createdAt" AS "planCreatedAt"
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
  const enrRows = await prisma.$queryRaw<{ userId: string; examId: string }[]>`
    SELECT "userId", "examId" FROM "Enrollment"
    WHERE active = TRUE AND "userId" = ANY(${rows.map((r) => r.userId)})
  `.catch(() => [] as { userId: string; examId: string }[]);
  for (const r of enrRows) {
    const set = enrolled.get(r.userId) ?? new Set<string>();
    set.add(r.examId);
    enrolled.set(r.userId, set);
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
        const nextBundle = bundles.get(next.examId) ?? (await loadExamBundles([next.examId])).get(next.examId) ?? null;
        if (nextBundle) bundles.set(next.examId, nextBundle);
        let examWeek = weekLineCache.get(next.examId) ?? null;
        if (!weekLineCache.has(next.examId)) {
          examWeek = nextBundle ? await examWeekMailLine(nextBundle, now).catch(() => null) : null;
          weekLineCache.set(next.examId, examWeek);
        }
        prepared.push({
          row: r,
          tasks,
          examShort: next.short,
          daysLeft: Math.max(0, dayDiff(today, istDay(next.row.date))),
          rollover: { done: r.short, next: { code: next.code, short: next.short, when: whenWithTier(next.row) } },
          examWeek,
          mode: `next:${r.code}→${next.code}`,
        });
      } else {
        prepared.push({ row: r, tasks, examShort: null, daysLeft: null, rollover: { done: r.short, next: null }, examWeek: null, mode: `generic:${r.code}` });
      }
      continue;
    }
    let examWeek = weekLineCache.get(r.examId) ?? null;
    if (!weekLineCache.has(r.examId)) {
      examWeek = bundle ? await examWeekMailLine(bundle, now).catch(() => null) : null;
      weekLineCache.set(r.examId, examWeek);
    }
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

// GET /api/cron/daily-five — the Daily 5 retention nudge.
//
// Jul 20 retention checkpoint: D1-7 return stuck at 14%, one-and-done 85%,
// and the only outbound touch was a single day-3 email. This cron gives
// recently-active students a daily reason to return: each morning (03:20
// UTC = 08:50 IST per vercel.json) it emails everyone who (a) has an active
// enrollment, (b) was active in the last 3 days, (c) hasn't visited yet
// today — "your Daily 5 is ready", linking to /today (11 Sep 2026: the
// deep link that builds or resumes the weakest-topic set in one hop; it
// used to point at /dashboard, two taps short of the quiz).
//
// Streak input (11 Sep 2026): study days come from the ONE definition in
// src/lib/study-day.ts (loadStudyDays) — attempts incl. live tests, tutor
// chats, descriptive attempts and coach topic completions — so the mail's
// streak number matches the dashboard and the results page.
//
// Recency window keeps it a nudge, not spam: lapse >3 days and the daily
// email stops (the day-3 nudge and future win-back flows own that band).
//
// Exam Week Mode wave 2 (play 10): the exam the mail names comes from
// resolveMailExam() — never a finished exam. When the addressed exam is in
// phase week / eve the mail carries one line: "Exam in N days (tier):
// checklist · full-length paper · no new topics tonight" (checklist link
// only when the article is REAL, else the hub). That line is keyed on the
// student's OWN shift day (Enrollment.shiftDate → applyShiftDay), so it can
// never say "exam tomorrow" while the hub says their shift is four days out.
//
// Rollover honesty (fix 7 Sep 2026): in "next" mode the named exam is a
// SUGGESTION — the dashboard's Daily 5 still serves the ENROLLED exam. So
// the next exam appears only inside the rollover block; the subject, the
// weakest-topic line and the exam-week line go generic unless the student
// is actually enrolled in that next exam too.
// Auth: Bearer ${CRON_SECRET}. Daily per vercel.json.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { sendDailyFiveEmail, type MailRollover } from "@/lib/email";
import { optedOutUserIds } from "@/lib/email-optout";
import { computeStreak, istDay } from "@/lib/db/streak";
import { loadStudyDays } from "@/lib/study-day";
import { liveTestEmailNotice } from "@/lib/live-test-today";
import {
  examWeekMailLine,
  loadExamBundles,
  nextExamsInTrack,
  resolveMailExam,
  trackKey,
  type ExamBundle,
  type ExamMeta,
  type ExamWeekMailLine,
  type NextExam,
} from "@/lib/exam-week-mail";
import { shiftDayIso } from "@/lib/exam-week-student";

const MAX_SENDS = 200;

function istTodayStart(now = new Date()): Date {
  // IST = UTC+5:30 — compute midnight IST expressed in UTC.
  const istMs = now.getTime() + 5.5 * 3600_000;
  const istMidnightMs = Math.floor(istMs / 86_400_000) * 86_400_000;
  return new Date(istMidnightMs - 5.5 * 3600_000);
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ error: "CRON_SECRET not configured" }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { "content-type": "application/json" },
    });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";

  const now = new Date();
  const dayStart = istTodayStart(now);
  const threeDaysAgo = new Date(now.getTime() - 3 * 86_400_000);

  // Active in last 3 days…
  const recent = await prisma.analyticsEvent.findMany({
    where: { userId: { not: null }, createdAt: { gte: threeDaysAgo } },
    select: { userId: true, createdAt: true },
  });
  const lastSeen = new Map<string, number>();
  for (const e of recent) {
    const t = e.createdAt.getTime();
    if (t > (lastSeen.get(e.userId!) ?? 0)) lastSeen.set(e.userId!, t);
  }
  // …but not yet today.
  const candidates = [...lastSeen.entries()]
    .filter(([, t]) => t < dayStart.getTime())
    .map(([id]) => id);
  if (candidates.length === 0) {
    return Response.json({ ok: true, dry, sent: 0, reason: "no candidates" });
  }

  const users = await prisma.user.findMany({
    where: {
      id: { in: candidates, notIn: await optedOutUserIds() }, // opt-out applied at selection too (review 22 Aug 2026)
      email: { not: "" },
      enrollments: { some: { active: true } },
    },
    select: {
      id: true, email: true, name: true,
      // ALL active enrollments, newest first — resolveMailExam walks them.
      enrollments: {
        where: { active: true },
        orderBy: { createdAt: "desc" },
        // shiftDate: the day THIS student sits a multi-day window — the
        // exam-week line is keyed on it, exactly like the hub block.
        select: { examId: true, createdAt: true, shiftDate: true, exam: { select: { code: true, shortName: true } } },
      },
    },
    take: MAX_SENDS,
  });

  // Batch-compute each recipient's streak (one UNION query for the whole
  // batch, not one per user) so the email can lead with loss-aversion
  // when a streak is actually live. 90-day window matches getStudyStreak;
  // the day definition is the shared one in src/lib/study-day.ts.
  const userIds = users.map((u) => u.id);
  const since = new Date(now.getTime() - 90 * 86_400_000);
  const daysByUser = await loadStudyDays(userIds, since);
  const todayIdx = istDay(now);

  // Students who already committed to a coach plan — they get the plain
  // mail; everyone else gets the coach invitation at the end.
  const planUserIds = new Set(
    (
      await prisma
        .$queryRaw<{ userId: string }[]>`SELECT "userId" FROM "CoachPlan"`
        .catch(() => [])
    ).map((r) => r.userId),
  );

  // REVERTED 25 Aug 2026 (founder call): Daily-5 goes to every candidate
  // again, including coach-plan holders who also got the 7 AM coach
  // email — email scenarios restored to the pre-22-Aug behaviour.

  // Yesterday's platform-wide effort — social proof for the mail. The
  // Daily-5 goes out at ~8:30 AM IST, so "yesterday" is the honest word.
  const yesterdayPeers = await (async () => {
    try {
      const dayStart = new Date(todayIdx * 86_400_000 - 5.5 * 3600_000);
      const prevStart = new Date(dayStart.getTime() - 86_400_000);
      const r = await prisma.$queryRaw<{ students: bigint; sets: bigint }[]>`
        SELECT COUNT(DISTINCT "userId") students, COUNT(*) sets FROM "Attempt"
        WHERE "finishedAt" >= ${prevStart} AND "finishedAt" < ${dayStart}
          AND status IN ('SUBMITTED','AUTO_SUBMITTED') AND "userId" IS NOT NULL`;
      const students = Number(r[0]?.students ?? 0);
      return students >= 3 ? { students, sets: Number(r[0].sets) } : null;
    } catch {
      return null;
    }
  })();

  // Sunday mornings this says "LIVE today: N All-India tests" (the
  // 8:30 AM send lands 2.5h after the 6 AM test-hall open).
  const liveTest = await liveTestEmailNotice().catch(() => null);

  // Exam-week machinery: bundles for every enrolled exam in the batch,
  // next-in-track candidates once per track, exam-week line once per exam.
  const bundles = await loadExamBundles(users.flatMap((u) => u.enrollments.map((e) => e.examId)));
  const trackCache = new Map<string, NextExam[]>();
  const nextInTrack = async (meta: ExamMeta) => {
    const key = trackKey(meta);
    let list = trackCache.get(key);
    if (!list) {
      list = await nextExamsInTrack(meta, now);
      trackCache.set(key, list);
    }
    return list;
  };
  const bundleFor = async (examId: string): Promise<ExamBundle | null> => {
    const hit = bundles.get(examId);
    if (hit) return hit;
    const extra = await loadExamBundles([examId]);
    for (const [k, v] of extra) bundles.set(k, v);
    return bundles.get(examId) ?? null;
  };
  // Cached per (exam, shift day): students who picked different shift days
  // inside the same window get different countdowns, so the day is part of
  // the key (most students have no shiftDate → one shared entry).
  const weekLineCache = new Map<string, ExamWeekMailLine | null>();
  const weekLineFor = async (examId: string, shiftDay: string | null): Promise<ExamWeekMailLine | null> => {
    const key = `${examId}|${shiftDay ?? ""}`;
    if (weekLineCache.has(key)) return weekLineCache.get(key) ?? null;
    const bundle = await bundleFor(examId);
    const line = bundle ? await examWeekMailLine(bundle, now, shiftDay).catch(() => null) : null;
    weekLineCache.set(key, line);
    return line;
  };

  let sent = 0, failed = 0;
  const modes: Record<string, number> = {};
  const sample: { name: string | null; short: string | null; mode: string; examWeek: string | null }[] = [];
  for (const u of users) {
    if (!u.email || !u.enrollments[0]) continue;
    const resolved = await resolveMailExam(
      u.enrollments.map((e) => ({ examId: e.examId, code: e.exam.code, short: e.exam.shortName, createdAt: e.createdAt })),
      bundles,
      now,
      nextInTrack,
    );
    if (!resolved) continue;
    // The student's own shift day for an exam they are enrolled in (null
    // when they never picked one, or the exam isn't theirs).
    const shiftDayFor = (examId: string) =>
      shiftDayIso(u.enrollments.find((e) => e.examId === examId)?.shiftDate ?? null);
    let examShort: string | null = null;
    let rollover: MailRollover | null = null;
    let examWeek: ExamWeekMailLine | null = null;
    let mode: string = resolved.mode;
    if (resolved.mode === "same") {
      examShort = resolved.short;
      examWeek = await weekLineFor(resolved.examId, shiftDayFor(resolved.examId));
    } else if (resolved.mode === "next") {
      // Rollover: the next exam is a suggestion, and the dashboard's Daily 5
      // still serves the ENROLLED exam — so name it only inside the rollover
      // block unless the student is genuinely enrolled in it as well.
      const alsoEnrolled = u.enrollments.some((e) => e.examId === resolved.examId);
      examShort = alsoEnrolled ? resolved.short : null;
      rollover = { done: resolved.done.short, next: { code: resolved.code, short: resolved.short, when: resolved.when } };
      examWeek = alsoEnrolled ? await weekLineFor(resolved.examId, shiftDayFor(resolved.examId)) : null;
      mode = `next:${resolved.done.code}→${resolved.code}`;
    } else {
      rollover = { done: resolved.done.short, next: null };
      mode = `generic:${resolved.done.code}`;
    }
    modes[mode] = (modes[mode] ?? 0) + 1;
    if (dry) {
      if (sample.length < 10) sample.push({ name: u.name, short: examShort, mode, examWeek: examWeek?.text ?? null });
      continue;
    }
    const streak = computeStreak(daysByUser.get(u.id) ?? new Set(), todayIdx);
    const ok = await sendDailyFiveEmail({
      to: u.email,
      userId: u.id,
      name: u.name,
      examShort,
      streakCurrent: streak.current,
      hasCoachPlan: planUserIds.has(u.id),
      peers: yesterdayPeers,
      liveTest,
      examWeek: examWeek ? { text: examWeek.text, html: examWeek.html } : null,
      rollover,
    }).catch(() => false);
    if (ok) sent++; else failed++;
  }

  if (dry) return Response.json({ ok: true, dry: true, candidates: candidates.length, users: users.length, modes, sample });
  return Response.json({ ok: true, candidates: candidates.length, sent, failed, modes });
}

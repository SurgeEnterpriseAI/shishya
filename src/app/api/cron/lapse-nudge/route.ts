// GET /api/cron/lapse-nudge — one template mail on lapse day 4-6, the gap
// between Daily-5 (last seen < 72 h) and win-back (7+ days). Rules, guards
// and the numbers behind them: src/lib/lapse-nudge.ts.
//
// NOT IN vercel.json (16 Sep 2026): a new inbox touch is the founder's call
// (he reverted the inbox budget on 25 Aug). Run by hand:
//   ?dry=1  → who would get it (first name, exam the mail would name, days
//             since last seen) — sends nothing, writes nothing;
//   no flag → sends, and writes the 'lapse-d4' guard row per delivered send.
// If it is scheduled later, after the morning mails (e.g. 04:30 UTC, after
// daily-five 03:00 and winback 04:00) so the 20-hour "any mail" guard sees
// them.
//
// Never names a finished exam: resolveMailExam, exactly as win-back. A live
// coach plan with a future date is the student's own word and keeps its exam.
// No model call. Opt-out is checked here and again inside sendEmail.
// Auth: Bearer ${CRON_SECRET}.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { sendLapseNudgeEmail, type MailRollover } from "@/lib/email";
import { loadExamBundles, nextExamsInTrack, resolveMailExam, trackKey, type ExamMeta, type NextExam } from "@/lib/exam-week-mail";
import { LAPSE_NUDGE_TAG, pickLapseRecipients, type LapseCandidate } from "@/lib/lapse-nudge";

type Row = {
  id: string;
  email: string;
  name: string | null;
  emailOptOut: boolean;
  lastSeen: Date;
  enrolled: boolean;
  livePlan: boolean;
  coachShort: string | null;
  coachDaysLeft: number | null;
};

type EnrollmentRow = { userId: string; examId: string; code: string; short: string; createdAt: Date };

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const now = new Date();

  // Candidates: seen 3-7 days ago with an exam to talk about. The guards
  // (repeat, recent mail, recent check-in) run in lapseEligibility below.
  let rows: Row[];
  try {
    rows = await prisma.$queryRaw<Row[]>`
      WITH act AS (
        SELECT "userId", MAX("createdAt") AS last_seen
        FROM "AnalyticsEvent"
        WHERE "userId" IS NOT NULL AND "createdAt" > NOW() - INTERVAL '8 days'
        GROUP BY "userId"
      )
      SELECT u.id, u.email, u.name, u."emailOptOut", act.last_seen AS "lastSeen",
             EXISTS (SELECT 1 FROM "Enrollment" en WHERE en."userId" = u.id AND en.active = TRUE) AS enrolled,
             EXISTS (SELECT 1 FROM "CoachPlan" cp WHERE cp."userId" = u.id AND cp."examDate" > NOW()) AS "livePlan",
             (SELECT e."shortName" FROM "CoachPlan" cp JOIN "Exam" e ON e.id = cp."examId"
              WHERE cp."userId" = u.id AND cp."examDate" > NOW()
              ORDER BY cp."updatedAt" DESC LIMIT 1) AS "coachShort",
             (SELECT GREATEST(0, CEIL(EXTRACT(EPOCH FROM (cp."examDate" - NOW())) / 86400))::int
              FROM "CoachPlan" cp WHERE cp."userId" = u.id AND cp."examDate" > NOW()
              ORDER BY cp."updatedAt" DESC LIMIT 1) AS "coachDaysLeft"
      FROM "User" u JOIN act ON act."userId" = u.id
      WHERE u.email <> '' AND u."emailOptOut" = FALSE
        AND act.last_seen < NOW() - INTERVAL '72 hours'
        AND act.last_seen > NOW() - INTERVAL '7 days'
      ORDER BY act.last_seen DESC
      LIMIT 500`;
  } catch (e) {
    console.error("[lapse-nudge] selection failed:", e);
    return Response.json({ ok: false, error: "selection failed" }, { status: 500 });
  }
  if (rows.length === 0) return Response.json({ ok: true, dry, candidates: 0, eligible: 0, sent: 0 });

  const ids = rows.map((r) => r.id);
  const touches = await prisma.$queryRaw<{ userId: string; tag: string; sentAt: Date }[]>`
    SELECT "userId", tag, "sentAt" FROM "EmailTouch"
    WHERE "userId" = ANY(${ids}) AND "sentAt" > NOW() - INTERVAL '21 days'
      AND (tag = ${LAPSE_NUDGE_TAG} OR tag = 'winback' OR tag LIKE 'sent:%')`.catch((e) => {
    console.error("[lapse-nudge] touch read failed:", e);
    return null;
  });
  // Without the touch log the repeat / recent-mail guards can't run — send nothing.
  if (!touches) return Response.json({ ok: false, error: "touch log unavailable" }, { status: 500 });
  const touchesBy = new Map<string, { tag: string; sentAt: Date }[]>();
  for (const t of touches) {
    const list = touchesBy.get(t.userId) ?? [];
    list.push({ tag: t.tag, sentAt: new Date(t.sentAt) });
    touchesBy.set(t.userId, list);
  }
  const candidates: (Row & LapseCandidate)[] = rows.map((r) => ({
    ...r,
    lastSeen: new Date(r.lastSeen),
    touches: touchesBy.get(r.id) ?? [],
  }));
  const picked = pickLapseRecipients(candidates, now);
  if (picked.length === 0) return Response.json({ ok: true, dry, candidates: rows.length, eligible: 0, sent: 0 });

  // Resolve the exam each mail may name (same as win-back).
  const pickedIds = picked.map((c) => c.id);
  const enrollmentRows = await prisma.$queryRaw<EnrollmentRow[]>`
    SELECT en."userId", en."examId", e.code, e."shortName" AS short, en."createdAt"
    FROM "Enrollment" en JOIN "Exam" e ON e.id = en."examId"
    WHERE en.active = TRUE AND en."userId" = ANY(${pickedIds})
    ORDER BY en."createdAt" DESC
  `.catch(() => [] as EnrollmentRow[]);
  const enrollmentsByUser = new Map<string, EnrollmentRow[]>();
  for (const r of enrollmentRows) {
    const list = enrollmentsByUser.get(r.userId) ?? [];
    list.push(r);
    enrollmentsByUser.set(r.userId, list);
  }
  const bundles = await loadExamBundles(enrollmentRows.map((r) => r.examId));
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

  type Resolved = (typeof picked)[number] & { examShort: string | null; rollover: MailRollover | null; mode: string };
  const eligible: Resolved[] = [];
  for (const c of picked) {
    if (c.coachShort && (c.coachDaysLeft ?? 0) > 0) {
      eligible.push({ ...c, examShort: c.coachShort, rollover: null, mode: "coach-plan" });
      continue;
    }
    const mine = enrollmentsByUser.get(c.id) ?? [];
    const resolved = await resolveMailExam(mine, bundles, now, nextInTrack);
    if (!resolved) continue; // nothing honest to name — no mail
    if (resolved.mode === "same") eligible.push({ ...c, examShort: resolved.short, rollover: null, mode: "same" });
    else if (resolved.mode === "next")
      eligible.push({
        ...c,
        examShort: mine.some((e) => e.examId === resolved.examId) ? resolved.short : null,
        rollover: { done: resolved.done.short, next: { code: resolved.code, short: resolved.short, when: resolved.when } },
        mode: `next:${resolved.done.code}→${resolved.code}`,
      });
    else eligible.push({ ...c, examShort: null, rollover: { done: resolved.done.short, next: null }, mode: `generic:${resolved.done.code}` });
  }

  if (dry) {
    return Response.json({
      ok: true,
      dry: true,
      candidates: rows.length,
      eligible: eligible.length,
      recipients: eligible.map((c) => ({
        userId: c.id,
        firstName: (c.name ?? "").split(" ")[0] || null,
        exam: c.examShort,
        mode: c.mode,
        daysGone: c.daysGone,
        lastSeen: c.lastSeen,
      })),
    });
  }

  let sent = 0;
  let failed = 0;
  for (const c of eligible) {
    const ok = await sendLapseNudgeEmail({
      to: c.email,
      userId: c.id,
      name: c.name,
      examShort: c.examShort,
      daysGone: c.daysGone,
      coachDaysLeft: c.mode === "coach-plan" ? c.coachDaysLeft : null,
      rollover: c.rollover,
    }).catch(() => false);
    if (ok) {
      sent++;
      await prisma
        .$executeRaw`INSERT INTO "EmailTouch" (id, "userId", tag) VALUES (${crypto.randomUUID()}, ${c.id}, ${LAPSE_NUDGE_TAG})`
        .catch(() => {});
    } else {
      failed++;
    }
  }

  return Response.json({ ok: true, candidates: rows.length, eligible: eligible.length, sent, failed });
}

// GET /api/cron/winback — the win-back flow for the unowned band.
//
// Found 3 Aug 2026: 289 of 427 recent users (68%) were lapsed 7+ days
// with ZERO outreach touching them — Daily-5 needs 3-day recency, the
// day-3 nudge fires once, evening rescue needs a live streak. Past day
// ~4 a lapsed student never heard from Shishya again. This closes that.
//
// Selection: enrolled users with email, last activity 7–60 days ago.
// Anti-nag guarantees (hard rules):
//   • max 2 win-backs per user EVER, at least 21 days apart (EmailTouch)
//   • max 60 sends per run (backlog drains over days, freshest-lapsed
//     first — they're the most recoverable)
// Personalization: their exam + wrong-answer count from Attempt.answers
// (each cleared mistake = a mark saved — the honest loss-frame).
//
// NEVER NAME A FINISHED EXAM (Exam Week Mode wave 2, play 10): the exam
// the mail names is resolved by resolveMailExam() — the newest active
// enrollment whose exam is not over (last announced exam day in the
// past, nothing within 60 days; an enrollment created after that day is
// next-cycle prep and is named as-is). When every enrollment is on a
// finished exam the mail rolls over to the next exam in the track with
// its date + tier word — inside the rollover block ONLY; the rest of the
// mail stays generic ("your prep is saved"), because a suggested next exam
// is not prep the student did (fix 7 Sep 2026) — or goes generic with no
// exam name. A live coach plan with a FUTURE date is the student's own
// word and keeps its exam.
// Auth: Bearer ${CRON_SECRET}. Daily 04:00 UTC (9:30 AM IST).

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { sendWinbackEmail, type MailRollover } from "@/lib/email";
import { loadExamBundles, nextExamsInTrack, resolveMailExam, trackKey, type ExamMeta, type NextExam } from "@/lib/exam-week-mail";

const MAX_SENDS = 60;

type Candidate = {
  id: string;
  email: string;
  name: string | null;
  lastSeen: Date;
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

  // Lapsed 7–60 days, has email, within anti-nag limits.
  const candidates = await prisma.$queryRaw<Candidate[]>`
    WITH act AS (
      SELECT "userId", MAX("createdAt") AS last_seen
      FROM "AnalyticsEvent" WHERE "userId" IS NOT NULL GROUP BY "userId"
    )
    SELECT u.id, u.email, u.name, act.last_seen AS "lastSeen",
           -- Coach-plan awareness: a live plan with a FUTURE date is the
           -- student's own word — the mail names THAT exam and leads with
           -- "your coach already rebuilt your plan — N days left" (audit
           -- 18 Aug 2026; review 22 Aug 2026: subject and countdown must
           -- name the same exam).
           (SELECT e."shortName" FROM "CoachPlan" cp JOIN "Exam" e ON e.id = cp."examId"
            WHERE cp."userId" = u.id AND cp."examDate" > NOW()
            ORDER BY cp."updatedAt" DESC LIMIT 1) AS "coachShort",
           (SELECT GREATEST(0, CEIL(EXTRACT(EPOCH FROM (cp."examDate" - NOW())) / 86400))::int
            FROM "CoachPlan" cp WHERE cp."userId" = u.id AND cp."examDate" > NOW()
            ORDER BY cp."updatedAt" DESC LIMIT 1) AS "coachDaysLeft"
    FROM "User" u JOIN act ON act."userId" = u.id
    WHERE u.email <> '' AND u."emailOptOut" = FALSE
      AND act.last_seen < NOW() - INTERVAL '7 days'
      AND act.last_seen > NOW() - INTERVAL '60 days'
      AND (
        EXISTS (SELECT 1 FROM "Enrollment" en WHERE en."userId" = u.id AND en.active = TRUE)
        OR EXISTS (SELECT 1 FROM "CoachPlan" cp WHERE cp."userId" = u.id AND cp."examDate" > NOW())
      )
      AND (SELECT COUNT(*) FROM "EmailTouch" t WHERE t."userId" = u.id AND t.tag = 'winback') < 2
      AND NOT EXISTS (SELECT 1 FROM "EmailTouch" t WHERE t."userId" = u.id AND t.tag = 'winback'
                      AND t."sentAt" > NOW() - INTERVAL '21 days')
    ORDER BY act.last_seen DESC
    LIMIT ${MAX_SENDS}
  `.catch((e) => {
    console.error("winback selection failed:", e);
    return [] as Candidate[];
  });
  if (candidates.length === 0) return Response.json({ ok: true, dry, eligible: 0, sent: 0 });

  // Active enrollments of the batch, newest first (one query).
  const ids = candidates.map((c) => c.id);
  const enrollmentRows = await prisma.$queryRaw<EnrollmentRow[]>`
    SELECT en."userId", en."examId", e.code, e."shortName" AS short, en."createdAt"
    FROM "Enrollment" en JOIN "Exam" e ON e.id = en."examId"
    WHERE en.active = TRUE AND en."userId" = ANY(${ids})
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

  // Resolve, per student, the exam the mail may name.
  type Resolved = Candidate & { examShort: string | null; rollover: MailRollover | null; mode: string };
  const eligible: Resolved[] = [];
  for (const c of candidates) {
    if (c.coachShort && (c.coachDaysLeft ?? 0) > 0) {
      eligible.push({ ...c, examShort: c.coachShort, rollover: null, mode: "coach-plan" });
      continue;
    }
    const mine = enrollmentsByUser.get(c.id) ?? [];
    const resolved = await resolveMailExam(mine, bundles, now, nextInTrack);
    if (!resolved) continue; // neither an enrollment nor a live plan — nothing honest to say
    if (resolved.mode === "same") eligible.push({ ...c, examShort: resolved.short, rollover: null, mode: "same" });
    else if (resolved.mode === "next")
      // Rollover: the next exam is a SUGGESTION, not their exam — "your CHSL
      // prep is saved" would be false for prep they never did. It is named
      // only inside the rollover block (and the subject's "X is done — Y is
      // next"), so examShort stays null unless they are enrolled in it too
      // (fix 7 Sep 2026).
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
      eligible: eligible.length,
      sample: eligible.slice(0, 8).map((c) => ({ name: c.name, short: c.examShort, mode: c.mode, lastSeen: c.lastSeen })),
    });
  }
  if (eligible.length === 0) return Response.json({ ok: true, sent: 0 });

  // Wrong-answer counts for the batch (one query): each element of
  // Attempt.answers with correct=false is an uncleared mistake.
  const mistakes = await prisma.$queryRaw<{ userId: string; n: bigint }[]>`
    SELECT a."userId", SUM(
      (SELECT COUNT(*) FROM jsonb_array_elements(a.answers::jsonb) el
       WHERE (el->>'correct') = 'false')
    ) AS n
    FROM "Attempt" a
    WHERE a."userId" = ANY(${ids}) AND a.status IN ('SUBMITTED', 'AUTO_SUBMITTED')
    GROUP BY a."userId"
  `.catch(() => [] as { userId: string; n: bigint }[]);
  const mBy = new Map(mistakes.map((m) => [m.userId, Number(m.n)]));

  let sent = 0, failed = 0;
  for (const c of eligible) {
    const daysGone = Math.max(7, Math.round((Date.now() - c.lastSeen.getTime()) / 86_400_000));
    const ok = await sendWinbackEmail({
      to: c.email,
      userId: c.id,
      name: c.name,
      examShort: c.examShort,
      mistakes: Math.min(mBy.get(c.id) ?? 0, 999),
      daysGone,
      coachDaysLeft: c.mode === "coach-plan" ? (c.coachDaysLeft ?? undefined) : undefined,
      rollover: c.rollover,
    }).catch(() => false);
    if (ok) {
      sent++;
      await prisma
        .$executeRaw`INSERT INTO "EmailTouch" (id, "userId", tag) VALUES (${crypto.randomUUID()}, ${c.id}, 'winback')`
        .catch(() => {});
    } else {
      failed++;
    }
  }

  return Response.json({ ok: true, eligible: eligible.length, sent, failed });
}

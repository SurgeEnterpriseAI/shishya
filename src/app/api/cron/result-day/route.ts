// GET /api/cron/result-day — one mail on result day (Exam Week Mode
// wave 2, play 13). Runs 04:15 UTC = 09:45 IST daily.
//
// Trigger: an active exam whose tracker holds a RESULT row of OFFICIAL
// tier (announced AND cited on the conducting body's own site — gold
// only, via sourceTier with the exam's ExamEligibility.officialUrl).
// Reported / expected result rows never trigger this mail: "the result is
// out" on a coaching-portal citation or an estimate is a broken promise.
// Window (30 Sep 2026, src/lib/result-day-trigger.ts): the mail fires when
// that row FIRST appears, for a result dated within the last 14 days (IST) —
// max(first-seen day, result day) ≥ today−2, first-seen = the earliest
// createdAt over live AND archived official-tier rows of that exam and day.
// Until today it needed a row DATED today−2..today, and 189 of 201 such
// rows were written more than 2 days after their date: 0 mails ever sent.
//
// Cohort: ACTIVELY enrolled students (Enrollment.active) with email, not
// opted out, seen in the last 60 days (AnalyticsEvent or Attempt). Once
// per user per exam PER RESULT DAY: EmailTouch 'sent:result-day-{CODE}-
// {YYYYMMDD}' (the send layer writes it from the mail's tag) — the cron
// also writes the bare 'result-day-{CODE}-{YYYYMMDD}' guard itself. The
// day is part of the key (fix 7 Sep 2026) because a code-only guard meant
// the Tier-2 / next-cycle result never reached anyone who had already got
// a result mail for that exam. Tags are [A-Za-z0-9_-]; exam codes are
// A-Z0-9_.
//
// The mail NEVER asserts publication on an announced date: an official
// RESULT row certifies the announced DATE, not that the list is live. It
// prints "the tracker's official result date is {date (tier)}" + the
// conducting body's notice. The one exception (30 Sep 2026): a row the
// official watch wrote (source official-watch — our own fetch read the
// result link on the body's page) says "published on {host}"; when that
// row's date is the day the watch first saw it, the date reads "first seen
// {date} on {host}". A student already mailed for the same result under an
// earlier date (resultDayFires coversDays) is not mailed again.
//
// Content is deterministic DB reads only — two honest paths, no score,
// no prediction, no LLM:
//   cleared      → next stage exactly as the tracker has it (next typed
//                  EXAM / INTERVIEW row after the result, with tier), or
//                  "not announced yet"
//   not this time → next exam in the student's track (same category +
//                  state, 7–60 days out, their own enrollments first),
//                  with its date + tier word
// plus the conducting body's notice (the result row's URL), the cutoff
// page (only when it renders — examPageGates, 16 Sep 2026; a failed gate
// read links none) and the tracker. Unsubscribe footer via the send layer.
// Limits: MAX 400 sends per run, 240 s time guard. ?dry=1 → the
// per-exam recipient counts, nothing sent. Auth: Bearer ${CRON_SECRET}.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { REAL_EXAM_SQL } from "@/lib/db/exam-scope";
import { sendResultDayEmail } from "@/lib/email";
import { istDay } from "@/lib/exam-week";
import { buildTimeline } from "@/lib/exam-timeline";
import { loadExamPageGates, type ExamPageGates } from "@/lib/exam-page-gates";
import { sourceHostLabel } from "@/lib/official-source";
import { RESULT_WINDOW_DAYS, resultDayFires, type ResultTriggerRow } from "@/lib/result-day-trigger";
import {
  dayDiff,
  loadExamBundles,
  nextExamsInTrack,
  nextStageAfter,
  pickNextInTrack,
  plainDay,
  tierWord,
  trackKey,
  whenWithTier,
  type NextExam,
} from "@/lib/exam-week-mail";

const MAX_SENDS = 400;
const TIME_GUARD_MS = 240_000;

type Student = { id: string; email: string; name: string | null };

/** Once-per-(user, exam, RESULT DAY) guard. The day (IST, YYYYMMDD) is in
 *  the key so a later result for the same exam — Tier 2, the next cycle —
 *  still mails to students who already got the previous one. */
function guardTag(code: string, resultDay: string): string {
  return `result-day-${code.replace(/[^A-Za-z0-9_-]/g, "-")}-${resultDay.replace(/-/g, "")}`;
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
  const today = istDay(now);
  const outOfTime = () => Date.now() - started > TIME_GUARD_MS;

  // Typed, announced RESULT rows dated in [today-14, today] IST, LIVE AND
  // ARCHIVED (30 Sep 2026): the archived copies say when the result first
  // appeared (resultDayFires). The tier (official vs reported) and the
  // first-seen rule are decided in TS. 25 Sep 2026: real exams only
  // (REAL_EXAM_SQL) — never a school class container.
  const triggerRows = await prisma.$queryRaw<(ResultTriggerRow & { examId: string })[]>`
    SELECT d.id, d."examId", d.label, d.date, d."isExamDay", d.kind, d.confidence, d.url, d.source, d."createdAt", d."archivedAt"
    FROM "ExamImportantDate" d
    JOIN "Exam" e ON e.id = d."examId" AND ${REAL_EXAM_SQL}
    WHERE d.kind = 'RESULT'
      AND LOWER(COALESCE(d.confidence, '')) = 'official' AND d.url IS NOT NULL
      AND (d.date + INTERVAL '5.5 hours')::date >= (NOW() + INTERVAL '5.5 hours')::date - ${RESULT_WINDOW_DAYS}::int
      AND (d.date + INTERVAL '5.5 hours')::date <= (NOW() + INTERVAL '5.5 hours')::date
  `.catch((err) => {
    console.error("[result-day] selection failed", err);
    return [] as (ResultTriggerRow & { examId: string })[];
  });
  const rowsByExam = new Map<string, ResultTriggerRow[]>();
  for (const r of triggerRows) rowsByExam.set(r.examId, [...(rowsByExam.get(r.examId) ?? []), r]);
  const hits = [...rowsByExam.keys()].map((examId) => ({ examId }));
  const bundles = await loadExamBundles(hits.map((h) => h.examId));
  // /cutoff renders only with rank bands. A mail cannot take a 404 back, so
  // a failed gate read links no cutoff page (GATES_OPEN is for pages).
  const gates =
    hits.length > 0
      ? await loadExamPageGates().catch((err) => {
          console.error("[result-day] page gates failed", err);
          return new Map<string, ExamPageGates>();
        })
      : new Map<string, ExamPageGates>();

  const report: { code: string; result: string; firstSeen: string; published: string | null; covers: string[]; nextStage: string | null; users: number; sent: number }[] = [];
  const skipped: { code: string; reason: string }[] = [];
  const trackCache = new Map<string, NextExam[]>();
  let totalSent = 0;

  for (const { examId } of hits) {
    if (totalSent >= MAX_SENDS || outOfTime()) break;
    const bundle = bundles.get(examId);
    if (!bundle) continue;
    const { meta, rows } = bundle;
    const typed = rows.filter((r) => typeof r.kind === "string" && r.kind.length > 0);
    const timeline = buildTimeline(typed, now, meta.officialUrl);
    // 30 Sep 2026: the newest result day that fires today (first appeared
    // within the window — src/lib/result-day-trigger.ts), then its live row.
    const fire = resultDayFires(rowsByExam.get(examId) ?? [], meta.officialUrl, now, [meta.short])[0] ?? null;
    const result = fire ? timeline.find((r) => r.id === fire.rowId && r.kind === "RESULT" && r.tier === "official" && !!r.url) ?? null : null;
    if (!fire || !result || !result.url || dayDiff(istDay(result.date), today) < 0) {
      skipped.push({
        code: meta.code,
        reason: fire
          ? "result row is not official tier (cited off the conducting body's site)"
          : "no official-tier result first seen within 2 days (older rows already had their day, or none is official tier)",
      });
      continue;
    }
    const resultDay = istDay(result.date);
    // Only a row our own fetch saw on the body's page may say "published".
    const publishedHost = fire.verified && result.verified ? sourceHostLabel(result.url) : null;
    // "5 Sep (official)" — the date, never a claim it published. Review, 30
    // Sep 2026: a watch row dated the day it was FIRST SEEN (the body printed
    // no single release date) says so — never a result day we did not read.
    const resultWhen = publishedHost && result.firstSeen ? `first seen ${plainDay(result.date)} on ${publishedHost}` : whenWithTier(result);
    const resultLine = `${result.label} — ${resultWhen}`;
    const stage = nextStageAfter(timeline, resultDay);
    const nextStage = stage ? { label: stage.label, when: whenWithTier(stage) } : null;

    const key = trackKey(meta);
    let candidates = trackCache.get(key);
    if (!candidates) {
      candidates = await nextExamsInTrack(meta, now);
      trackCache.set(key, candidates);
    }
    const inTrack = candidates.filter((c) => c.examId !== meta.examId);

    const tag = guardTag(meta.code, resultDay);
    // Review, 30 Sep 2026: the same result under an earlier date (an AI row
    // the watch re-dated, a re-dated refresh row — fire.coversDays) already
    // mailed these students; never a second mail for one result.
    const guardTags = [tag, ...fire.coversDays.map((d) => guardTag(meta.code, d))].flatMap((g) => [g, `sent:${g}`]);
    const students = await prisma.$queryRaw<Student[]>`
      SELECT u.id, u.email, u.name
      FROM "Enrollment" en JOIN "User" u ON u.id = en."userId"
      WHERE en."examId" = ${examId} AND en.active = TRUE
        AND u.email <> '' AND u."emailOptOut" = FALSE
        AND NOT EXISTS (
          SELECT 1 FROM "EmailTouch" t
          WHERE t."userId" = u.id AND t.tag IN (${Prisma.join(guardTags)})
        )
        AND (
          EXISTS (SELECT 1 FROM "AnalyticsEvent" ae WHERE ae."userId" = u.id AND ae."createdAt" > NOW() - INTERVAL '60 days')
          OR EXISTS (SELECT 1 FROM "Attempt" a WHERE a."userId" = u.id AND a."startedAt" > NOW() - INTERVAL '60 days')
        )
      LIMIT ${MAX_SENDS}
    `.catch((err) => {
      console.error("[result-day] recipients failed", err);
      return [] as Student[];
    });

    // The student's other active enrollments decide the "next exam".
    const enrolled = new Map<string, Set<string>>();
    if (inTrack.length > 0 && students.length > 0) {
      const enr = await prisma.$queryRaw<{ userId: string; examId: string }[]>`
        SELECT "userId", "examId" FROM "Enrollment"
        WHERE active = TRUE AND "userId" IN (${Prisma.join(students.map((s) => s.id))})
      `.catch(() => [] as { userId: string; examId: string }[]);
      for (const r of enr) {
        const set = enrolled.get(r.userId) ?? new Set<string>();
        set.add(r.examId);
        enrolled.set(r.userId, set);
      }
    }

    let sent = 0;
    if (!dry) {
      for (const s of students) {
        if (totalSent >= MAX_SENDS || outOfTime()) break;
        const next = pickNextInTrack(inTrack, enrolled.get(s.id) ?? [], meta.examId);
        const ok = await sendResultDayEmail({
          to: s.email,
          userId: s.id,
          name: s.name,
          examShort: meta.short,
          examCode: meta.code,
          resultLine,
          resultWhen,
          officialUrl: result.url,
          publishedHost,
          guardTag: tag,
          hasCutoffPage: gates.get(meta.code)?.cutoff === true,
          nextStage,
          nextExam: next ? { code: next.code, short: next.short, date: plainDay(next.row.date), tier: tierWord(next.row.tier) } : null,
        }).catch(() => false);
        if (ok) {
          sent++;
          totalSent++;
          await prisma
            .$executeRaw`INSERT INTO "EmailTouch" (id, "userId", tag) VALUES (${crypto.randomUUID()}, ${s.id}, ${tag})`
            .catch(() => {});
        }
      }
    }
    report.push({
      code: meta.code,
      result: resultLine,
      firstSeen: fire.firstSeenDay,
      published: publishedHost,
      covers: fire.coversDays,
      nextStage: nextStage ? `${nextStage.label} — ${nextStage.when}` : null,
      users: students.length,
      sent,
    });
  }

  return Response.json({
    ok: true,
    dry,
    today,
    exams: hits.length,
    sent: totalSent,
    report,
    skipped,
    elapsedMs: Date.now() - started,
  });
}

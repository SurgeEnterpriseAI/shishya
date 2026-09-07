// GET /api/cron/result-day — one mail on result day (Exam Week Mode
// wave 2, play 13). Runs 04:15 UTC = 09:45 IST daily.
//
// Trigger: an active exam whose tracker holds a RESULT row of OFFICIAL
// tier (announced AND cited on the conducting body's own site — gold
// only, via sourceTier with the exam's ExamEligibility.officialUrl) dated
// within the last 2 days (IST). Reported / expected result rows never
// trigger this mail: "the result is out" on a coaching-portal citation or
// an estimate is a broken promise.
//
// Cohort: ACTIVELY enrolled students (Enrollment.active) with email, not
// opted out, seen in the last 60 days (AnalyticsEvent or Attempt). Once
// per user per exam: EmailTouch 'sent:result-day-{CODE}' (the send layer
// writes it from the mail's tag) — the cron also writes the bare
// 'result-day-{CODE}' guard itself. Tags are [A-Za-z0-9_-]; exam codes
// are A-Z0-9_.
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
// page and the tracker. Unsubscribe footer via the send layer.
// Limits: MAX 400 sends per run, 240 s time guard. ?dry=1 → the
// per-exam recipient counts, nothing sent. Auth: Bearer ${CRON_SECRET}.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { sendResultDayEmail } from "@/lib/email";
import { istDay } from "@/lib/exam-week";
import { buildTimeline } from "@/lib/exam-timeline";
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
const RESULT_LOOKBACK_DAYS = 2;

type Student = { id: string; email: string; name: string | null };

function guardTag(code: string): string {
  return `result-day-${code.replace(/[^A-Za-z0-9_-]/g, "-")}`;
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

  // Exams with a typed, announced RESULT row dated in [today-2, today] IST.
  // The tier (official vs reported) is decided in TS from the cited domain.
  const hits = await prisma.$queryRaw<{ examId: string }[]>`
    SELECT DISTINCT d."examId"
    FROM "ExamImportantDate" d
    JOIN "Exam" e ON e.id = d."examId" AND e.active = TRUE
    WHERE d."archivedAt" IS NULL AND d.kind = 'RESULT'
      AND LOWER(COALESCE(d.confidence, '')) = 'official' AND d.url IS NOT NULL
      AND (d.date + INTERVAL '5.5 hours')::date >= (NOW() + INTERVAL '5.5 hours')::date - 2
      AND (d.date + INTERVAL '5.5 hours')::date <= (NOW() + INTERVAL '5.5 hours')::date
  `.catch((err) => {
    console.error("[result-day] selection failed", err);
    return [] as { examId: string }[];
  });
  const bundles = await loadExamBundles(hits.map((h) => h.examId));

  const report: { code: string; result: string; nextStage: string | null; users: number; sent: number }[] = [];
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
    const result = timeline
      .filter((r) => r.kind === "RESULT" && r.tier === "official" && !!r.url)
      .filter((r) => {
        const d = dayDiff(istDay(r.date), today);
        return d >= 0 && d <= RESULT_LOOKBACK_DAYS;
      })
      .pop();
    if (!result || !result.url) {
      skipped.push({ code: meta.code, reason: "result row is not official tier (cited off the conducting body's site)" });
      continue;
    }
    const resultDay = istDay(result.date);
    const resultLine = `${result.label} — ${whenWithTier(result)}`;
    const stage = nextStageAfter(timeline, resultDay);
    const nextStage = stage ? { label: stage.label, when: whenWithTier(stage) } : null;

    const key = trackKey(meta);
    let candidates = trackCache.get(key);
    if (!candidates) {
      candidates = await nextExamsInTrack(meta, now);
      trackCache.set(key, candidates);
    }
    const inTrack = candidates.filter((c) => c.examId !== meta.examId);

    const tag = guardTag(meta.code);
    const students = await prisma.$queryRaw<Student[]>`
      SELECT u.id, u.email, u.name
      FROM "Enrollment" en JOIN "User" u ON u.id = en."userId"
      WHERE en."examId" = ${examId} AND en.active = TRUE
        AND u.email <> '' AND u."emailOptOut" = FALSE
        AND NOT EXISTS (
          SELECT 1 FROM "EmailTouch" t
          WHERE t."userId" = u.id AND t.tag IN (${tag}, ${"sent:" + tag})
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
          officialUrl: result.url,
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
    report.push({ code: meta.code, result: resultLine, nextStage: nextStage ? `${nextStage.label} — ${nextStage.when}` : null, users: students.length, sent });
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

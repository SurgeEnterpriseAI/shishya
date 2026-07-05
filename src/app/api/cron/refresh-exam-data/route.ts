// GET /api/cron/refresh-exam-data — daily refresh of news + important
// dates for a rotating subset of exams. Goal: every exam gets refreshed
// at least once per week without blowing the daily budget.
//
// Strategy:
//   - 163 active exams → ~23 per day for full coverage on a 7-day rotation.
//   - Pick today's slice by (dayOfYear mod 7) so each exam lands on a
//     deterministic day-of-week; restart from same point if the cron
//     misses a day.
//   - For each exam in the slice, call src/lib/ai/exam-info.ts and replace
//     its AI-generated rows (preserving human-curated entries).
//
// Auth: Bearer ${CRON_SECRET}.
// Vercel Cron config in vercel.json wires this to a daily schedule.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { generateExamInfo } from "@/lib/ai/exam-info";

const GEN_SOURCE = "ai-generated:claude";
// Approximate Sonnet 4.5 cost per exam (~1k input + 1.5k output).
const COST_PER_EXAM_USD = 0.04;
// Safety cap: total per-day cron spend ceiling.
const PER_DAY_BUDGET_USD = 5.0;
// Upper bound on exams attempted per run; the time guard below usually
// stops the run first (~12-16 exams/run at ~15-25s each).
const DAILY_EXAM_CAP = 60;
// Exit the loop cleanly with headroom before Vercel kills the function at
// maxDuration (300s) — a killed run loses its report and skips the exams
// it never reached silently.
const TIME_BUDGET_MS = 240_000;

export async function GET(req: Request) {
  // ── auth ─────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ error: "CRON_SECRET not configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // ── pick today's slice: MOST-STALE-FIRST ────────────────────────────
  // The old dayOfYear-mod-7 slices were alphabetical, and each run
  // (sequential Claude + web search, ~15-25s/exam ≈ 6-10 min for ~25
  // exams) was killed at maxDuration=300s mid-slice — so the same K–Z
  // exams never refreshed (105 exams found frozen at 54+ days).
  // Most-stale-first is self-healing: anything missed today is at the
  // front of the queue tomorrow, so no exam can starve regardless of
  // timeouts, budget stops, or upstream failures.
  const staleness = await prisma.examNewsItem.groupBy({
    by: ["examId"],
    where: { source: GEN_SOURCE },
    _max: { createdAt: true },
  });
  const lastRefreshed = new Map(
    staleness.map((s) => [s.examId, s._max.createdAt?.getTime() ?? 0]),
  );
  const exams = await prisma.exam.findMany({
    where: { active: true },
    select: { id: true, code: true, name: true, shortName: true, category: true },
  });
  const slice = exams
    .sort((a, b) => (lastRefreshed.get(a.id) ?? 0) - (lastRefreshed.get(b.id) ?? 0))
    .slice(0, DAILY_EXAM_CAP);

  const started = Date.now();
  const log: Array<{ code: string; ok: boolean; news?: number; dates?: number; err?: string }> = [];
  let spent = 0;

  for (const exam of slice) {
    if (Date.now() - started > TIME_BUDGET_MS) {
      log.push({ code: exam.code, ok: false, err: "time-budget — resumes next run (most-stale-first)" });
      break;
    }
    if (spent >= PER_DAY_BUDGET_USD) {
      log.push({ code: exam.code, ok: false, err: "budget" });
      continue;
    }
    try {
      // Web search is enabled in the daily cron so refresh runs always
      // surface the freshest official notifications. Each search bumps
      // cost by ~$0.02 per exam but gives genuine "internet data".
      const info = await generateExamInfo(
        {
          examCode: exam.code,
          examName: exam.name,
          examShortName: exam.shortName,
          category: String(exam.category),
        },
        { useWebSearch: true },
      );
      const now = new Date();
      // ARCHIVE (don't delete) prior generated rows. Students can
      // still browse the historical news + dates via the "Show older
      // updates" toggle on the per-exam page — preserves the
      // institutional memory of each exam cycle (last year's cutoff
      // notification, postponement notices, syllabus changes, etc).
      // Only the active feed (archivedAt IS NULL) is shown by default.
      await prisma.examNewsItem.updateMany({
        where: { examId: exam.id, source: GEN_SOURCE, archivedAt: null },
        data: { archivedAt: now },
      });
      await prisma.examImportantDate.updateMany({
        where: { examId: exam.id, source: GEN_SOURCE, archivedAt: null },
        data: { archivedAt: now },
      });
      for (const n of info.news) {
        await prisma.examNewsItem.create({
          data: {
            examId: exam.id,
            title: n.title,
            body: n.body,
            source: GEN_SOURCE,
            publishedAt: new Date(now.getTime() - n.daysAgo * 24 * 60 * 60 * 1000),
          },
        });
      }
      for (const d of info.dates) {
        await prisma.examImportantDate.create({
          data: {
            examId: exam.id,
            label: d.label,
            date: new Date(now.getTime() + d.daysFromNow * 24 * 60 * 60 * 1000),
            isExamDay: d.isExamDay,
            notes: d.notes,
            source: GEN_SOURCE,
          },
        });
      }
      log.push({ code: exam.code, ok: true, news: info.news.length, dates: info.dates.length });
      spent += COST_PER_EXAM_USD;
    } catch (err) {
      log.push({ code: exam.code, ok: false, err: (err as Error).message });
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      strategy: "most-stale-first",
      queueDepth: slice.length,
      processed: log.length,
      ok_count: log.filter((l) => l.ok).length,
      failed: log.filter((l) => !l.ok).length,
      estSpendUsd: Number(spent.toFixed(2)),
      elapsedMs: Date.now() - started,
      log,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

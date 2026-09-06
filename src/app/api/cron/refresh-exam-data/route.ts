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
import { writeExamInfo, GEN_SOURCE } from "@/lib/exam-data-writer";
// Measured 6 Sep 2026 (spend audit): Sonnet 4.5 + 3-5 web searches per
// exam ≈ $0.15-0.20, not the $0.04 the old constant assumed — which is
// why the "budget" below never bound. Real per-call cost is now logged
// to AiUsage (feature "exam-info") by generateExamInfo itself.
const COST_PER_EXAM_USD = 0.18;
// Spend cap per RUN (the cron runs 3×/day): 10 exams at the real cost ≈
// 30 exams/day — the top-15 daily plus ~15 of the tail, so the tail
// cycles in ~10 days. Was effectively ~14/run (time-bound) ≈ $7.5/day.
const PER_DAY_BUDGET_USD = 1.8;
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
  const lastNews = new Map(
    staleness.map((s) => [s.examId, s._max.createdAt?.getTime() ?? 0]),
  );
  const exams = await prisma.exam.findMany({
    where: { active: true },
    select: {
      id: true,
      code: true,
      name: true,
      shortName: true,
      category: true,
      candidatesPerYear: true,
      refreshAttemptedAt: true,
      // Conducting-body portal — steers the generator's web search to the
      // official domain (the only source tier labelled OFFICIAL).
      eligibility: { select: { officialUrl: true, officialName: true } },
    },
  });
  // FRESHNESS TIERS (25 Aug 2026, Google-channel push): the TOP_N biggest
  // exams refresh at least once a day — their tracker pages compete on
  // "latest updates" freshness — everything else stays most-stale-first.
  // The cron now runs 3×/day (vercel.json), so the tail still cycles
  // ~2× faster than the old once-daily rotation.
  const TOP_N = 15;
  const STALE_MS = 20 * 3600_000;
  const topIds = new Set(
    [...exams]
      .sort((a, b) => (b.candidatesPerYear ?? 0) - (a.candidatesPerYear ?? 0))
      .slice(0, TOP_N)
      .map((e) => e.id),
  );
  // Staleness = the later of "last generated news row" and "last refresh
  // ATTEMPT" (6 Sep 2026). Before, only news rows counted, so an exam that
  // returned zero news or failed to parse kept its old timestamp, stayed
  // at the head of the queue and was re-queried (Sonnet + web search) on
  // every one of the three daily runs — the single biggest line of the
  // ~$20/day API bill. Now every attempt moves the exam to the back.
  const lastRefreshed = new Map(
    exams.map((e) => [e.id, Math.max(lastNews.get(e.id) ?? 0, e.refreshAttemptedAt?.getTime() ?? 0)]),
  );
  const nowMs = Date.now();
  const slice = exams
    .sort((a, b) => {
      const la = lastRefreshed.get(a.id) ?? 0;
      const lb = lastRefreshed.get(b.id) ?? 0;
      const pa = topIds.has(a.id) && nowMs - la > STALE_MS ? 0 : 1;
      const pb = topIds.has(b.id) && nowMs - lb > STALE_MS ? 0 : 1;
      return pa - pb || la - lb;
    })
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
    // Stamp the attempt FIRST so a timeout, parse failure or empty result
    // still moves this exam to the back of the staleness queue. Raw SQL on
    // purpose: prisma.exam.update() would also bump Exam.updatedAt, which
    // is the sitemap lastModified for every exam URL — "changed today" on
    // ~30 exams/day is the spam signal the 25 Aug honesty pass removed.
    await prisma
      .$executeRaw`UPDATE "Exam" SET "refreshAttemptedAt" = NOW() WHERE id = ${exam.id}`
      .catch(() => {});
    // Charge the run budget whether the call succeeds or fails — a failed
    // web-search call costs the same tokens.
    spent += COST_PER_EXAM_USD;
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
          officialUrl: exam.eligibility?.officialUrl ?? null,
          officialName: exam.eligibility?.officialName ?? null,
        },
        { useWebSearch: true },
      );
      // ARCHIVE (don't delete) prior generated rows and insert the new
      // generation — shared writer (src/lib/exam-data-writer.ts) so the
      // cron and the backfill script can't drift: archives only when the
      // new run returned rows, keeps prior OFFICIAL dates the new run did
      // not re-confirm, stores absolute dates at midnight UTC, persists
      // cited URLs. Students can still browse history via the archive page.
      const w = await writeExamInfo(prisma, exam.id, info);
      log.push({ code: exam.code, ok: true, news: w.news, dates: w.dates });
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

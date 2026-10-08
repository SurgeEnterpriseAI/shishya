// The refresh-exam-data run — shared by the two cron routes
// (/api/cron/refresh-exam-data and …/today-pm) so the handlers stay
// export-clean (a non-handler export from a route.ts breaks the Next
// build type-check). Body moved out of the route on 13 Sep 2026 when the
// exam-week lane was added; the tail behaviour is unchanged.
//
// Per run:
//   1. staleness = max(last generated news row, last refresh ATTEMPT) per
//      exam (6 Sep 2026: an exam that returned nothing used to stay at the
//      head of the queue and be re-queried 3×/day)
//   2. exam-week lane: loadExamWeekExams (typed rows, ±9-day prefilter,
//      computeExamWeekState per exam — read-only) → every exam in
//      eve / today-am / today-pm / window / post, ≤ LANE_MAX_PER_RUN,
//      ordered by src/lib/exam-refresh-lane.ts, AHEAD of the tail
//   3. tail: exams not in exam week, picked by hub visitors (7 Oct 2026,
//      plan build 5d; src/lib/exam-refresh-lane.ts), TAIL_MAX_PER_RUN a run
//   4. loop: ask the background spend guard (src/lib/ai/spend-guard.ts,
//      7 Oct 2026) — lane calls are must-run ("exam-info"), tail calls
//      can-wait ("exam-info-other") — then stamp refreshAttemptedAt first (raw SQL — never bump
//      Exam.updatedAt, the sitemap lastModified), generateExamInfo with
//      web search, writeExamInfo (archives prior generated rows, keeps
//      prior OFFICIAL rows, IndexNow-pings exam-week exams)
// Budgets: the lane is charged separately (LANE_BUDGET_USD) and never
// consumes the tail's PER_RUN_TAIL_BUDGET_USD; the TIME_BUDGET_MS guard is
// shared, so a lane-heavy run shortens the tail (self-healing: the most
// overdue exam is first again next run). The spend guard's daily caps bind
// across runs.
// An empty AI balance (7 Oct 2026): the run stops at the first credit error,
// writes that exam's previous refreshAttemptedAt back so it keeps its place,
// and every other background job skips for 20 minutes.

import { prisma } from "@/lib/db/prisma";
import { REAL_EXAM_WHERE } from "@/lib/db/exam-scope";
import { generateExamInfo } from "@/lib/ai/exam-info";
import { writeExamInfo, GEN_SOURCE } from "@/lib/exam-data-writer";
import { loadExamWeekExams } from "@/lib/exam-week-aeo";
import type { ExamWeekPhase } from "@/lib/exam-week";
import type { SourceTier } from "@/lib/official-source";
import { LANE_MAX_PER_RUN, orderRefreshQueue, type LaneState, type QueueExam } from "@/lib/exam-refresh-lane";
import type { SpendGuard } from "@/lib/ai/spend-guard";

// Measured 6 Sep 2026 (spend audit): Sonnet 4.5 + 3-5 web searches per
// exam ≈ $0.15-0.20, not the $0.04 the old constant assumed — which is
// why the "budget" below never bound. Real per-call cost is now logged
// to AiUsage (feature "exam-info") by generateExamInfo itself.
const COST_PER_EXAM_USD = 0.18;
// Tail spend cap per RUN. 7 Oct 2026: 3 exams a run (TAIL_MAX_PER_RUN), two
// full runs a day (06:45 and 18:45 IST, vercel.json "15 1,13 * * *"); the
// guard's $1.22 "exam-info-other" cap at about $0.21 a call holds the
// evening run to 2, so 5 a day. Until then $1.80 a run (10 exams) never
// bound: the clock did, at 1-2 tail exams a run.
const TAIL_MAX_PER_RUN = 3;
const PER_RUN_TAIL_BUDGET_USD = TAIL_MAX_PER_RUN * COST_PER_EXAM_USD;
// Lane spend cap per run — LANE_MAX_PER_RUN exams; separate from the
// tail so exam night never starves the rotation and vice versa.
const LANE_BUDGET_USD = LANE_MAX_PER_RUN * COST_PER_EXAM_USD;
// Upper bound on exams attempted per run; the time guard below usually
// stops the run first (~12-16 exams/run at ~15-25s each).
const RUN_EXAM_CAP = 60;
// Exit the loop cleanly with headroom before Vercel kills the function at
// maxDuration (300s) — a killed run loses its report and skips the exams
// it never reached silently.
const TIME_BUDGET_MS = 240_000;

export interface ExamRefreshLogEntry {
  code: string;
  ok: boolean;
  lane?: ExamWeekPhase;
  news?: number;
  dates?: number;
  /** Generated rows the writer dropped (suppressed, beside a curated row, uncited answer key). */
  datesDropped?: number;
  newsSuppressed?: number;
  err?: string;
}

export interface ExamRefreshReport {
  ok: true;
  strategy: string;
  queueDepth: number;
  laneDepth: number;
  processed: number;
  ok_count: number;
  failed: number;
  estSpendUsd: number;
  elapsedMs: number;
  lane: Array<{ code: string; phase: ExamWeekPhase; tier: SourceTier | null }>;
  /** Exam-week exams refreshed too recently to call again (option C rest). */
  resting: Array<{ code: string; phase: ExamWeekPhase }>;
  /** Calls the spend guard held (the reason per exam is in the log). */
  held: number;
  /** True when the hub-visitor read failed and the tail fell back to most-stale-first. */
  visitorsUnavailable?: boolean;
  spendGuard?: ReturnType<SpendGuard["summary"]>;
  log: ExamRefreshLogEntry[];
}

export interface ExamRefreshRunOptions {
  /** Only the lane, restricted to these phases (the 20:15 IST run passes ["today-pm"]). */
  laneOnly?: ExamWeekPhase[];
  now?: Date;
  /** The background spend guard (the cron routes pass one; scripts run without). */
  guard?: SpendGuard;
}

/**
 * Human hub visitors per exam code, last 7 days (5d). One grouped SELECT
 * (131 ms on 2 Oct 2026). Null when the read fails: the tail then falls
 * back to most-stale-first.
 */
async function loadHubVisitors(now: Date): Promise<Map<string, number> | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ code: string; people: number }>>(
      `SELECT split_part(e.path, '/', 3) AS code, COUNT(DISTINCT COALESCE(e."userId", e."anonId"))::int AS people
         FROM "AnalyticsEvent" e
        WHERE e.kind = 'PAGE_VIEW'::"EventKind" AND (e.client IS NULL OR e.client = 'browser')
          AND e."createdAt" >= $1 AND e.path LIKE '/exams/%'
        GROUP BY 1`,
      new Date(now.getTime() - 7 * 86_400_000),
    );
    return new Map(rows.map((r) => [r.code, Number(r.people) || 0]));
  } catch (err) {
    console.warn("[refresh-exam-data] hub visitor read failed; tail is most-stale-first:", (err as Error)?.message);
    return null;
  }
}

export async function runExamDataRefresh(opts: ExamRefreshRunOptions = {}): Promise<ExamRefreshReport> {
  const now = opts.now ?? new Date();

  // ── staleness ───────────────────────────────────────────────────────
  // Most-stale-first is self-healing: anything missed today is at the
  // front of the queue tomorrow, so no exam can starve regardless of
  // timeouts, budget stops, or upstream failures.
  const staleness = await prisma.examNewsItem.groupBy({
    by: ["examId"],
    where: { source: GEN_SOURCE },
    _max: { createdAt: true },
  });
  const lastNews = new Map(staleness.map((s) => [s.examId, s._max.createdAt?.getTime() ?? 0]));
  const exams = await prisma.exam.findMany({
    // 25 Sep 2026: real exams only — a web-searched "news" refresh for a
    // school class (SCHOOL_BOARD container) would be spend on a non-exam.
    where: REAL_EXAM_WHERE,
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
  const byId = new Map(exams.map((e) => [e.id, e]));

  // ── exam-week lane ──────────────────────────────────────────────────
  // Read-only: loadExamWeekExams runs the shared state machine over each
  // exam's typed tracker rows; a failure here must not stop the tail.
  const week = await loadExamWeekExams({ now }).catch(() => []);
  const lanes = new Map<string, LaneState>(week.map((w) => [w.id, { phase: w.state.phase, tier: w.state.tier, daysTo: w.state.daysTo }]));
  const visitors = opts.laneOnly ? null : await loadHubVisitors(now);

  const queueExams: QueueExam[] = exams.map((e) => ({
    id: e.id,
    code: e.code,
    candidatesPerYear: e.candidatesPerYear,
    lastRefreshedMs: Math.max(lastNews.get(e.id) ?? 0, e.refreshAttemptedAt?.getTime() ?? 0),
  }));
  const { lane, tail, resting } = orderRefreshQueue(queueExams, lanes, { nowMs: now.getTime(), laneOnly: opts.laneOnly, visitors });
  const laneById = new Map(lane.map((l) => [l.id, l]));
  // Only the tail exams this run may reach (review, 7 Oct 2026): with 3 a
  // run, the rest of the tail would each log a "budget" failure, and the
  // reply would show ~50 failures a run that are not failures.
  const slice = [...lane, ...tail.slice(0, TAIL_MAX_PER_RUN)].slice(0, RUN_EXAM_CAP);

  const started = Date.now();
  const log: ExamRefreshLogEntry[] = [];
  let laneSpent = 0;
  let tailSpent = 0;
  let held = 0;
  const heldFeatures = new Set<string>();

  for (const q of slice) {
    const exam = byId.get(q.id);
    if (!exam) continue;
    const laneEntry = laneById.get(q.id);
    if (Date.now() - started > TIME_BUDGET_MS) {
      log.push({ code: exam.code, ok: false, lane: laneEntry?.phase, err: "time-budget — resumes next run (most-stale-first)" });
      break;
    }
    if (laneEntry ? laneSpent >= LANE_BUDGET_USD : tailSpent >= PER_RUN_TAIL_BUDGET_USD) {
      log.push({ code: exam.code, ok: false, lane: laneEntry?.phase, err: "budget" });
      continue;
    }
    // Exam-week exams are must-run, the others can-wait (src/lib/ai/spend-guard.ts).
    const feature = laneEntry ? "exam-info" : "exam-info-other";
    if (heldFeatures.has(feature)) {
      // Caps and the outage pause do not lift within a run: counted, not asked again.
      held++;
      continue;
    }
    if (opts.guard) {
      const d = await opts.guard.allow(feature);
      if (!d.allow) {
        held++;
        heldFeatures.add(feature);
        // Not stamped: a held exam keeps its place in the queue.
        log.push({ code: exam.code, ok: false, lane: laneEntry?.phase, err: `held: ${d.reason}` });
        if (d.reason === "credit-cooldown") break;
        continue;
      }
    }
    // Stamp the attempt FIRST so a timeout, parse failure or empty result
    // still moves this exam to the back of the staleness queue. Raw SQL on
    // purpose: prisma.exam.update() would also bump Exam.updatedAt, which
    // is the sitemap lastModified for every exam URL — "changed today" on
    // ~30 exams/day is the spam signal the 25 Aug honesty pass removed.
    await prisma
      .$executeRaw`UPDATE "Exam" SET "refreshAttemptedAt" = NOW() WHERE id = ${exam.id}`
      .catch(() => {});
    // Charge the budget whether the call succeeds or fails — a failed
    // web-search call costs the same tokens.
    if (laneEntry) laneSpent += COST_PER_EXAM_USD;
    else tailSpent += COST_PER_EXAM_USD;
    try {
      // Web search is enabled in the cron so refresh runs always surface
      // the freshest official notifications (and, on exam evening, the
      // key / question-paper pages the conducting body just posted).
      const info = await generateExamInfo(
        {
          examCode: exam.code,
          examName: exam.name,
          examShortName: exam.shortName,
          category: String(exam.category),
          officialUrl: exam.eligibility?.officialUrl ?? null,
          officialName: exam.eligibility?.officialName ?? null,
        },
        { useWebSearch: true, usageFeature: feature },
      );
      // ARCHIVE (don't delete) prior generated rows and insert the new
      // generation — shared writer (src/lib/exam-data-writer.ts) so the
      // cron and the backfill script can't drift: archives only when the
      // new run returned rows, keeps prior OFFICIAL dates the new run did
      // not re-confirm, stores absolute dates at midnight UTC, persists
      // cited URLs. Students can still browse history via the archive page.
      const w = await writeExamInfo(prisma, exam.id, info);
      log.push({ code: exam.code, ok: true, lane: laneEntry?.phase, news: w.news, dates: w.dates, datesDropped: w.datesDropped, newsSuppressed: w.newsSuppressed });
    } catch (err) {
      log.push({ code: exam.code, ok: false, lane: laneEntry?.phase, err: (err as Error).message });
      if (opts.guard && (await opts.guard.noteFailure(feature, err))) {
        // Empty balance: nothing was refreshed, so the exam keeps its place.
        await prisma.$executeRaw`UPDATE "Exam" SET "refreshAttemptedAt" = ${exam.refreshAttemptedAt} WHERE id = ${exam.id}`.catch(() => {});
        break;
      }
    }
  }

  return {
    ok: true,
    strategy: opts.laneOnly ? `exam-week-lane:${opts.laneOnly.join(",")}` : `exam-week-lane + ${visitors ? "hub-visitor interval" : "most-stale-first"}`,
    queueDepth: slice.length,
    laneDepth: lane.length,
    processed: log.length,
    ok_count: log.filter((l) => l.ok).length,
    failed: log.filter((l) => !l.ok).length,
    estSpendUsd: Number((laneSpent + tailSpent).toFixed(2)),
    elapsedMs: Date.now() - started,
    lane: lane.map((l) => ({ code: l.code, phase: l.phase, tier: l.tier })),
    resting: resting.map((r) => ({ code: r.code, phase: r.phase })),
    held,
    ...(opts.laneOnly ? {} : { visitorsUnavailable: visitors === null }),
    ...(opts.guard ? { spendGuard: opts.guard.summary() } : {}),
    log,
  };
}

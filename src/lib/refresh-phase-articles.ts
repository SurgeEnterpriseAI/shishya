// The Stage-2 orchestrator: figure out which exams are in a phase
// window, scrape their sources, summarise via Claude, write the
// ExamPhaseArticle row.
//
// Called by:
//   - GET /api/cron/refresh-phase-articles (Vercel cron, daily 07:00 IST)
//   - scripts/refresh-phase-articles.ts    (manual / local testing)
//
// Exam Week Mode (6 Sep 2026) — honesty + cost rules, in order:
//   1. Candidates come from the shared IST state machine
//      (computeExamWeekState over TYPED tracker rows only). A legacy
//      untyped row can never put an exam on a "live today" page (CDS got
//      one from a stale row before this).
//        week / eve        → CHECKLIST
//        today-am          → LIVE       (only after the first shift can
//                                        have ended, LIVE_EARLIEST_IST_HOUR)
//        today-pm          → REACTIONS
//        window            → LIVE + REACTIONS (multi-day CBT windows)
//        post              → REACTIONS
//   2. Per-exam daily caps checked BEFORE the model is called:
//      LIVE 2/day, REACTIONS 1/day, CHECKLIST 1/day — plus the existing
//      90-minute spacing, and a checklist is not rewritten while a live
//      one from this window exists.
//   3. The summariser returns null for anything that is not REAL (< 2
//      cited sources, placeholder body) — then the previous article is
//      KEPT untouched: no archive-and-create, nothing written.
//   4. Titles are dated from the focus day ("SSC CGL 2026 paper analysis
//      (12 Sep)"), never "live today" without a date.
//   5. New article URLs are submitted to IndexNow (best-effort).
//
// Returns a structured summary so the cron handler can log + return
// it to the caller.

import { prisma } from "@/lib/db/prisma";
import { fetchSubredditNew, searchReddit } from "@/lib/scrape/reddit";
import { fetchRss } from "@/lib/scrape/rss";
import type { ScrapedSnippet } from "@/lib/scrape/types";
import { getSourcesFor } from "@/data/exam-sources";
import { summarisePhase } from "@/lib/ai/phase-summariser";
import { istDay, istHour, type ExamWeekPhase, type ExamWeekState } from "@/lib/exam-week";
import { loadExamWeekExams } from "@/lib/exam-week-aeo";
import { MIN_ARTICLE_SOURCES } from "@/lib/phase-article-quality";
import { phaseArticleUrl, SITE_ORIGIN, submitIndexNow } from "@/lib/indexnow";
import type { ExamPhase } from "@prisma/client";

export interface RefreshOptions {
  /** Don't refresh articles updated within the last N minutes. Default 90. */
  minMinutesBetweenRuns?: number;
  /** Hard cap on Claude calls per run (cost guard). Default 25. */
  maxClaudeCalls?: number;
  /** When set, only refresh this examCode (used for manual debugging). */
  examCodeOverride?: string;
  /** Evaluate "now" at a fixed instant (tests / dry runs). */
  now?: Date;
}

export interface RefreshReport {
  candidatesConsidered: number;
  refreshed: Array<{ examCode: string; phase: ExamPhase; snippetCount: number; title: string }>;
  skipped: Array<{ examCode: string; phase: ExamPhase; reason: string }>;
  errors: Array<{ examCode: string; phase: ExamPhase; error: string }>;
  claudeCalls: number;
  indexNow: { urls: number; acceptedChunks: number };
}

interface Candidate {
  examId: string;
  examCode: string;
  examShort: string;
  examName: string;
  phase: ExamPhase;
  state: ExamWeekState;
}

/** Per-exam, per-phase generation cap per IST day (archived versions count). */
export const DAILY_CAP: Record<ExamPhase, number> = { LIVE: 2, REACTIONS: 1, CHECKLIST: 1 };

/** No "live" article before the first shift can have ended — an exam-day
 *  page written at 07:00 IST can only be about yesterday's paper. */
export const LIVE_EARLIEST_IST_HOUR = 10;

/** A checklist written inside this many days is "this window's" and is
 *  kept rather than rewritten (evergreen prep content, no new signal). */
const CHECKLIST_KEEP_DAYS = 8;

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

const PHASES_FOR: Record<ExamWeekPhase, ExamPhase[]> = {
  none: [],
  week: ["CHECKLIST"],
  eve: ["CHECKLIST"],
  "today-am": ["LIVE"],
  "today-pm": ["REACTIONS"],
  window: ["LIVE", "REACTIONS"],
  post: ["REACTIONS"],
};

async function findCandidates(examCodeOverride: string | undefined, now: Date): Promise<Candidate[]> {
  const exams = await loadExamWeekExams({ examCode: examCodeOverride, now });
  const out: Candidate[] = [];
  for (const e of exams) {
    for (const phase of PHASES_FOR[e.state.phase]) {
      // Exam-day coverage needs a confirmed exam day: an "expected" date is
      // an estimate, so no LIVE / REACTIONS article for it (checklists are
      // still fine — they say "expected" on the date).
      if (phase !== "CHECKLIST" && e.state.tier === "expected") continue;
      out.push({
        examId: e.id,
        examCode: e.code,
        examShort: e.shortName,
        examName: e.name,
        phase,
        state: e.state,
      });
    }
  }
  return out;
}

async function scrapeForExam(examShort: string, examCode: string): Promise<ScrapedSnippet[]> {
  const cfg = getSourcesFor(examCode);
  const tasks: Array<Promise<ScrapedSnippet[]>> = [];

  for (const sub of cfg.subreddits ?? []) {
    tasks.push(fetchSubredditNew(sub, 15));
  }
  for (const term of cfg.redditSearchTerms ?? []) {
    tasks.push(searchReddit(term, "week", 20));
  }
  for (const feed of cfg.rssFeeds ?? []) {
    tasks.push(fetchRss(feed, 15));
  }

  const results = await Promise.allSettled(tasks);
  const all: ScrapedSnippet[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  // Filter to snippets that plausibly mention this exam (case-insensitive
  // contains either the exam short-name or any non-trivial token from the
  // search terms). Reddit's /new is noisy and a search by exam name still
  // returns off-topic posts; this trims it down to ~40-70% signal.
  const tokens = new Set<string>([examShort.toLowerCase()]);
  for (const term of cfg.redditSearchTerms ?? []) {
    for (const t of term.toLowerCase().split(/\s+/)) {
      if (t.length >= 3) tokens.add(t);
    }
  }
  const filtered = all.filter((s) => {
    const hay = `${s.title} ${s.body}`.toLowerCase();
    for (const t of tokens) if (hay.includes(t)) return true;
    return false;
  });

  // Dedupe by id and bound total size — 120 snippets max into the LLM
  // step (it caps to 80 internally; we leave headroom for variety).
  const byId = new Map<string, ScrapedSnippet>();
  for (const s of filtered) if (!byId.has(s.id)) byId.set(s.id, s);
  return [...byId.values()].slice(0, 120);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "12 Sep" from "2026-09-12" — fixed English month names so the title
 *  never depends on the runtime's ICU data. */
function dayMon(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[(m || 1) - 1]}`;
}

/**
 * Dated title from the focus day — "{exam} {year} paper analysis ({day}
 * {Mon})" style. Multi-day windows print the span; a LIVE article inside
 * an open window is dated TODAY (the sitting it covers).
 */
export function datedTitle(short: string, phase: ExamPhase, state: ExamWeekState, now: Date = new Date()): string {
  const today = istDay(now);
  const days = state.windowDays.map((r) => r.day).sort();
  const first = days[0] ?? state.focusDay ?? today;
  const last = days[days.length - 1] ?? first;
  const year = first.slice(0, 4);
  const span = first === last ? dayMon(first) : `${dayMon(first)}–${dayMon(last)}`;
  switch (phase) {
    case "CHECKLIST":
      return `${short} ${year} last-minute checklist (exam ${span})`;
    case "LIVE": {
      const day = state.phase === "window" && today >= first && today <= last ? today : (state.focusDay ?? first);
      return `${short} ${year} paper analysis (${dayMon(day)}) — exam-day live`;
    }
    case "REACTIONS":
      return `${short} ${year} paper analysis (${span}) — student verdict & expected cutoff`;
  }
}

/** Start of the current IST calendar day, as a UTC instant. */
function istDayStart(now: Date): Date {
  return new Date(Date.parse(istDay(now) + "T00:00:00Z") - IST_OFFSET_MS);
}

export async function refreshPhaseArticles(opts: RefreshOptions = {}): Promise<RefreshReport> {
  const minMinutes = opts.minMinutesBetweenRuns ?? 90;
  const maxCalls = opts.maxClaudeCalls ?? 25;
  const now = opts.now ?? new Date();

  const candidates = await findCandidates(opts.examCodeOverride, now);
  const report: RefreshReport = {
    candidatesConsidered: candidates.length,
    refreshed: [],
    skipped: [],
    errors: [],
    claudeCalls: 0,
    indexNow: { urls: 0, acceptedChunks: 0 },
  };
  const newUrls: string[] = [];

  // Sort by phase priority: LIVE > REACTIONS > CHECKLIST. If we hit
  // the budget cap, time-sensitive phases get refreshed first.
  const phaseRank: Record<ExamPhase, number> = { LIVE: 0, REACTIONS: 1, CHECKLIST: 2 };
  candidates.sort((a, b) => phaseRank[a.phase] - phaseRank[b.phase]);

  // Hard time guard: Vercel kills the function at 300 s and a killed run
  // loses its report and the end-of-run IndexNow submission.
  const startedMs = Date.now();
  for (const c of candidates) {
    if (Date.now() - startedMs > 240_000) {
      report.skipped.push({ examCode: c.examCode, phase: c.phase, reason: "time budget — resumes next run" });
      break;
    }
    if (report.claudeCalls >= maxCalls) {
      report.skipped.push({ examCode: c.examCode, phase: c.phase, reason: "max claude calls reached" });
      continue;
    }

    // No exam-day "live" page before the first shift can have ended.
    if (c.phase === "LIVE" && istHour(now) < LIVE_EARLIEST_IST_HOUR) {
      report.skipped.push({
        examCode: c.examCode,
        phase: c.phase,
        reason: `before ${LIVE_EARLIEST_IST_HOUR}:00 IST — no live page before the first shift ends`,
      });
      continue;
    }

    // Daily cap per (exam, phase), counted BEFORE any scraping or model
    // call. Archived versions created today count too — the cap bounds
    // generations, not live rows.
    const madeToday = await prisma.examPhaseArticle.count({
      where: { examId: c.examId, phase: c.phase, createdAt: { gte: istDayStart(now) } },
    });
    if (madeToday >= DAILY_CAP[c.phase]) {
      report.skipped.push({
        examCode: c.examCode,
        phase: c.phase,
        reason: `daily cap reached (${madeToday}/${DAILY_CAP[c.phase]})`,
      });
      continue;
    }

    // Skip if we just refreshed this article — bounds writes per day.
    // findFirst (not findUnique) because the (examId, phase) unique was
    // dropped in favour of archived-version history — there can be many
    // archived rows + one active row per (examId, phase). We want the
    // current active one.
    const existing = await prisma.examPhaseArticle.findFirst({
      where: { examId: c.examId, phase: c.phase, archivedAt: null },
      orderBy: { lastUpdatedAt: "desc" },
    });
    if (existing?.lastUpdatedAt) {
      const minsAgo = (now.getTime() - existing.lastUpdatedAt.getTime()) / 60_000;
      if (minsAgo < minMinutes) {
        report.skipped.push({
          examCode: c.examCode,
          phase: c.phase,
          reason: `updated ${Math.round(minsAgo)} min ago (< ${minMinutes})`,
        });
        continue;
      }
      // A checklist is evergreen prep content: once this window has one,
      // there is no new signal to fold in — keep it rather than archiving
      // and rewriting it every run.
      if (c.phase === "CHECKLIST" && minsAgo < CHECKLIST_KEEP_DAYS * 24 * 60) {
        report.skipped.push({
          examCode: c.examCode,
          phase: c.phase,
          reason: "checklist already present for this window (evergreen)",
        });
        await prisma.examPhaseArticle.update({
          where: { id: existing.id },
          data: { lastScrapedAt: now },
        });
        continue;
      }
    }

    const snippets = await scrapeForExam(c.examShort, c.examCode);
    if (c.phase === "CHECKLIST" && snippets.length < MIN_ARTICLE_SOURCES) {
      // A checklist can only be REAL when it cites >= 2 scraped sources;
      // the summariser would refuse anyway — don't spend the call.
      report.skipped.push({
        examCode: c.examCode,
        phase: c.phase,
        reason: `${snippets.length} snippet(s) < ${MIN_ARTICLE_SOURCES} sources`,
      });
      continue;
    }
    // LIVE/REACTIONS with thin or zero snippets fall through: the
    // summariser web-searches its own sources for exactly these (state
    // exams live on Telegram/YouTube/local news our scrapers don't
    // reach) and publishes nothing if the web genuinely has nothing —
    // the daily cap + spacing above bound the retry cost.

    const days = c.state.windowDays.map((r) => r.day).sort();
    const examWindow = days.length > 1 && days[0] !== days[days.length - 1] ? `${days[0]} to ${days[days.length - 1]}` : null;
    const examDay =
      c.phase === "LIVE" && c.state.phase === "window" ? istDay(now) : (c.state.focusDay ?? days[0] ?? null);

    let summary;
    try {
      summary = await summarisePhase({
        examShortName: c.examShort,
        examName: c.examName,
        examCode: c.examCode,
        phase: c.phase,
        snippets,
        examDay,
        examWindow,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      report.errors.push({ examCode: c.examCode, phase: c.phase, error: msg });
      continue;
    }
    report.claudeCalls++;
    if (!summary) {
      // Nothing REAL came back — the previous article (if any) stays as
      // is. No archive, no placeholder row.
      report.skipped.push({ examCode: c.examCode, phase: c.phase, reason: "no real article (kept previous)" });
      if (existing) {
        await prisma.examPhaseArticle.update({ where: { id: existing.id }, data: { lastScrapedAt: now } }).catch(() => {});
      }
      continue;
    }

    const title = datedTitle(c.examShort, c.phase, c.state, now);

    // ARCHIVE-THEN-CREATE (was overwrite-in-place). When fresh REAL
    // content is generated, stamp the current active version as archived
    // and insert a new active row. This preserves every prior cycle's
    // write-up so the phase page can show "previous updates" — students
    // returning a year later can read what last cycle's LIVE / REACTIONS
    // article said. Reactions + shares stay attached to the version they
    // were made on (historical accuracy).
    const writtenAt = new Date();
    if (existing) {
      await prisma.examPhaseArticle.update({
        where: { id: existing.id },
        data: { archivedAt: writtenAt },
      });
    }
    const slug = c.phase.toLowerCase();
    await prisma.examPhaseArticle.create({
      data: {
        examId: c.examId,
        phase: c.phase,
        slug,
        title,
        summarySnippet: summary.summarySnippet,
        bodyMarkdown: summary.bodyMarkdown,
        sourcesScraped: summary.sourcesUsed,
        lastUpdatedAt: writtenAt,
        lastScrapedAt: writtenAt,
      },
    });
    newUrls.push(phaseArticleUrl(c.examCode, slug), `${SITE_ORIGIN}/exams/${c.examCode}`);
    report.refreshed.push({
      examCode: c.examCode,
      phase: c.phase,
      snippetCount: snippets.length,
      title,
    });
  }

  // Tell Bing/ChatGPT about the new article pages. Awaited (10s cap
  // inside) rather than detached so a serverless run cannot drop the
  // final ping when the function returns; still best-effort — the daily
  // ?scope=examweek IndexNow cron re-submits every real article URL.
  if (newUrls.length) {
    report.indexNow = { urls: new Set(newUrls).size, acceptedChunks: await submitIndexNow(newUrls) };
  }

  return report;
}

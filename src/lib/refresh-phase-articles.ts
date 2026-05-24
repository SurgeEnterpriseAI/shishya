// The Stage-2 orchestrator: figure out which exams are in a phase
// window, scrape their sources, summarise via Claude, upsert the
// ExamPhaseArticle row.
//
// Called by:
//   - GET /api/cron/refresh-phase-articles (Vercel cron, every 2h)
//   - scripts/refresh-phase-articles.ts    (manual / local testing)
//
// Returns a structured summary so the cron handler can log + return
// it to the caller.

import { prisma } from "@/lib/db/prisma";
import { fetchSubredditNew, searchReddit } from "@/lib/scrape/reddit";
import { fetchRss } from "@/lib/scrape/rss";
import type { ScrapedSnippet } from "@/lib/scrape/types";
import { getSourcesFor } from "@/data/exam-sources";
import { summarisePhase } from "@/lib/ai/phase-summariser";
import type { ExamPhase } from "@prisma/client";

export interface RefreshOptions {
  /** Don't refresh articles updated within the last N minutes. Default 90. */
  minMinutesBetweenRuns?: number;
  /** Hard cap on Claude calls per run (cost guard). Default 25. */
  maxClaudeCalls?: number;
  /** When set, only refresh this examCode (used for manual debugging). */
  examCodeOverride?: string;
}

export interface RefreshReport {
  candidatesConsidered: number;
  refreshed: Array<{ examCode: string; phase: ExamPhase; snippetCount: number; title: string }>;
  skipped: Array<{ examCode: string; phase: ExamPhase; reason: string }>;
  errors: Array<{ examCode: string; phase: ExamPhase; error: string }>;
  claudeCalls: number;
}

/** Map daysFromExam to the right phase, or null if outside any window. */
function phaseForOffset(daysFromExam: number): ExamPhase | null {
  // Note: positive daysFromExam = exam still in the future, negative = past.
  if (daysFromExam >= -0.5 && daysFromExam < 1) return "LIVE";
  if (daysFromExam >= 1 && daysFromExam <= 7) return "CHECKLIST";
  if (daysFromExam < -0.5 && daysFromExam >= -3.5) return "REACTIONS";
  return null;
}

interface Candidate {
  examId: string;
  examCode: string;
  examShort: string;
  examName: string;
  phase: ExamPhase;
  daysFromExam: number;
}

async function findCandidates(examCodeOverride?: string): Promise<Candidate[]> {
  // Pull all upcoming/recent exam-day rows; we filter to ±7 days in
  // SQL to bound the result set on busy weeks (CET season has 30+ a
  // week). Then narrow to a phase window in JS.
  const now = new Date();
  const from = new Date(now.getTime() - 4 * 86_400_000); // 4 days past
  const to = new Date(now.getTime() + 8 * 86_400_000); // 8 days future
  const rows = await prisma.examImportantDate.findMany({
    where: {
      date: { gte: from, lte: to },
      isExamDay: true,
      exam: { active: true, ...(examCodeOverride ? { code: examCodeOverride } : {}) },
    },
    include: { exam: { select: { id: true, code: true, shortName: true, name: true } } },
  });

  const seen = new Set<string>(); // dedupe (examId, phase) across multiple shifts
  const out: Candidate[] = [];
  for (const r of rows) {
    const daysFromExam = (r.date.getTime() - now.getTime()) / 86_400_000;
    const phase = phaseForOffset(daysFromExam);
    if (!phase) continue;
    const key = `${r.exam.id}:${phase}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      examId: r.exam.id,
      examCode: r.exam.code,
      examShort: r.exam.shortName,
      examName: r.exam.name,
      phase,
      daysFromExam,
    });
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

export async function refreshPhaseArticles(opts: RefreshOptions = {}): Promise<RefreshReport> {
  const minMinutes = opts.minMinutesBetweenRuns ?? 90;
  const maxCalls = opts.maxClaudeCalls ?? 25;

  const candidates = await findCandidates(opts.examCodeOverride);
  const report: RefreshReport = {
    candidatesConsidered: candidates.length,
    refreshed: [],
    skipped: [],
    errors: [],
    claudeCalls: 0,
  };

  // Sort by phase priority: LIVE > REACTIONS > CHECKLIST. If we hit
  // the budget cap, time-sensitive phases get refreshed first.
  const phaseRank: Record<ExamPhase, number> = { LIVE: 0, REACTIONS: 1, CHECKLIST: 2 };
  candidates.sort((a, b) => phaseRank[a.phase] - phaseRank[b.phase]);

  for (const c of candidates) {
    if (report.claudeCalls >= maxCalls) {
      report.skipped.push({ examCode: c.examCode, phase: c.phase, reason: "max claude calls reached" });
      continue;
    }

    // Skip if we just refreshed this article — bounds writes per day.
    const existing = await prisma.examPhaseArticle.findUnique({
      where: { examId_phase: { examId: c.examId, phase: c.phase } },
    });
    if (existing?.lastUpdatedAt) {
      const minsAgo = (Date.now() - existing.lastUpdatedAt.getTime()) / 60_000;
      if (minsAgo < minMinutes) {
        report.skipped.push({
          examCode: c.examCode,
          phase: c.phase,
          reason: `updated ${Math.round(minsAgo)} min ago (< ${minMinutes})`,
        });
        continue;
      }
    }

    const snippets = await scrapeForExam(c.examShort, c.examCode);
    if (snippets.length === 0) {
      report.skipped.push({ examCode: c.examCode, phase: c.phase, reason: "no snippets" });
      // Still bump lastScrapedAt so we don't hammer dead sources.
      if (existing) {
        await prisma.examPhaseArticle.update({
          where: { id: existing.id },
          data: { lastScrapedAt: new Date() },
        });
      }
      continue;
    }

    let summary;
    try {
      summary = await summarisePhase({
        examShortName: c.examShort,
        examName: c.examName,
        examCode: c.examCode,
        phase: c.phase,
        snippets,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      report.errors.push({ examCode: c.examCode, phase: c.phase, error: msg });
      continue;
    }
    report.claudeCalls++;
    if (!summary) {
      report.skipped.push({ examCode: c.examCode, phase: c.phase, reason: "summariser returned null" });
      continue;
    }

    // Upsert. The (examId, phase) unique constraint makes this safe.
    if (existing) {
      await prisma.examPhaseArticle.update({
        where: { id: existing.id },
        data: {
          slug: c.phase.toLowerCase(),
          title: summary.title,
          bodyMarkdown: summary.bodyMarkdown,
          sourcesScraped: summary.sourcesUsed,
          lastUpdatedAt: new Date(),
          lastScrapedAt: new Date(),
        },
      });
    } else {
      await prisma.examPhaseArticle.create({
        data: {
          examId: c.examId,
          phase: c.phase,
          slug: c.phase.toLowerCase(),
          title: summary.title,
          bodyMarkdown: summary.bodyMarkdown,
          sourcesScraped: summary.sourcesUsed,
          lastScrapedAt: new Date(),
        },
      });
    }
    report.refreshed.push({
      examCode: c.examCode,
      phase: c.phase,
      snippetCount: snippets.length,
      title: summary.title,
    });
  }

  return report;
}

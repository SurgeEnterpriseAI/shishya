// Exam-week IndexNow submission — ONE implementation behind two entry
// points (6 Sep 2026, Exam Week Mode wave 2):
//   • GET /api/cron/indexnow-examweek   — the daily Vercel cron. Vercel
//     cron paths with a query string are undocumented, so the daily
//     ?scope=examweek schedule moved to its own path.
//   • GET /api/cron/indexnow?scope=examweek — kept for manual runs.
//
// Lives in its own module (not src/lib/indexnow.ts) because
// exam-week-aeo.ts imports indexnow.ts for the URL builders — putting the
// runner there would close an import cycle.
//
// What it submits, for every active exam currently in an exam-week phase
// (typed exam-day row within ±7 days): hub, /updates, /cutoff, the hi/te
// twins that exist, and any REAL phase-article URL (>= 2 cited sources,
// not a placeholder). Idempotent — engines dedupe; never throws to the
// route (the caller decides the HTTP status from `ok`).

import { pingIndexNow } from "@/lib/indexnow";
import { examWeekIndexNowUrls, loadExamWeekExams, loadRealPhaseArticles } from "@/lib/exam-week-aeo";

export interface ExamWeekIndexNowReport {
  ok: boolean;
  scope: "examweek";
  /** "CODE:phase" per exam submitted. */
  exams: string[];
  urls: number;
  acceptedChunks: number;
  error?: string;
}

export async function submitExamWeekIndexNow(now: Date = new Date()): Promise<ExamWeekIndexNowReport> {
  try {
    const exams = await loadExamWeekExams({ now });
    const articles = await loadRealPhaseArticles(exams.map((e) => e.id));
    const urls = exams.flatMap((e) => examWeekIndexNowUrls(e, articles.get(e.id) ?? []));
    const acceptedChunks = urls.length ? await pingIndexNow(urls) : 0;
    return {
      ok: true,
      scope: "examweek",
      exams: exams.map((e) => `${e.code}:${e.state.phase}`),
      urls: urls.length,
      acceptedChunks,
    };
  } catch (err) {
    return {
      ok: false,
      scope: "examweek",
      exams: [],
      urls: 0,
      acceptedChunks: 0,
      error: String((err as Error)?.message ?? err).slice(0, 200),
    };
  }
}

// GET /api/cron/answer-key-watch/evening — the 21:00 IST check of the
// official answer-key / result watch (30 Sep 2026, vercel.json
// "30 15 * * *"). HTML first; AI only for HOT exams (answer key: exam held
// 1–10 days ago; result: expected within ±7 days) whose official page could
// not settle it, at most 6 exams, hard cap $0.90 a run, spend recorded as
// 'akr-check'. What it writes is picked up by the 09:45 IST result-day mail
// the next morning. See /api/cron/answer-key-watch and
// src/lib/answer-key-watch-run.ts. ?dry=1 → report only. Auth: Bearer
// ${CRON_SECRET}.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { handleAnswerKeyWatchCron } from "@/lib/answer-key-watch-run";

export async function GET(req: Request) {
  return handleAnswerKeyWatchCron(req, "evening");
}

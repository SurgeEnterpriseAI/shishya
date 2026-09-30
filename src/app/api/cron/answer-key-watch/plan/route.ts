// GET /api/cron/answer-key-watch/plan — the Monday plan of the official
// answer-key / result watch (30 Sep 2026). vercel.json "30 0 * * 1" = Mon
// 06:00 IST: the week's due set and a full check — HTML first, then AI
// (official hosts only, candidates only, every URL through the same gate)
// for HOT exams the HTML could not settle, hard cap $3.00 a run, spend
// recorded as 'akr-check'. See /api/cron/answer-key-watch and
// src/lib/answer-key-watch-run.ts. ?dry=1 → report only. Auth: Bearer
// ${CRON_SECRET}.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { handleAnswerKeyWatchCron } from "@/lib/answer-key-watch-run";

export async function GET(req: Request) {
  return handleAnswerKeyWatchCron(req, "plan");
}

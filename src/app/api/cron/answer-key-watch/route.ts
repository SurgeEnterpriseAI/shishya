// GET /api/cron/answer-key-watch — the official answer-key / result watch
// (30 Sep 2026). vercel.json "30 6 * * *" = 12:00 IST: the daily HTML-only
// check ($0) of every due exam's official listing pages. It writes a release
// ONLY when our own fetch read the link on the conducting body's page and the
// row beside it named the key / result, the exam and the cycle year — the
// five-condition gate in src/lib/answer-key-watch.ts. Logic:
// src/lib/answer-key-watch-run.ts.
//
// The Monday plan (06:00 IST, AI cap $3.00) and the evening check (21:00
// IST, AI for hot exams only, cap $0.90) are the sibling paths /plan and
// /evening: Vercel cron paths carrying a query string are undocumented (see
// /api/cron/indexnow-examweek). Manual runs may pass ?mode=plan|check|evening,
// ?dry=1 (report only: nothing written, no IndexNow), ?ai=0, ?maxUsd=<lower
// cap>, ?only=CODE,CODE. Auth: Bearer ${CRON_SECRET}.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { handleAnswerKeyWatchCron } from "@/lib/answer-key-watch-run";

export async function GET(req: Request) {
  return handleAnswerKeyWatchCron(req, "check");
}

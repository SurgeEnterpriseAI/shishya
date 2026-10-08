// GET /api/cron/sweep-question-reports — weekly answer-key trust sweep.
//
// Students flag wrong answer keys via QuestionReport; leaving them
// unresolved is the most trust-damaging failure an exam platform can have
// (a student loses marks and blames themselves). This adjudicates every
// open report with an independent Claude re-solve (see
// src/lib/question-sweep.ts) so the queue never silently piles up between
// manual runs.
//
// Auth: Bearer ${CRON_SECRET} (Vercel-injected). Weekly per vercel.json.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { sweepReportedQuestions } from "@/lib/question-sweep";
import { createSpendGuard } from "@/lib/ai/spend-guard";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ error: "CRON_SECRET not configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // Time-bounded: ~30-60s per question; 15 keeps us safely inside
  // maxDuration. Anything left stays open for next week's run.
  // Each re-solve asks the background spend guard first (7 Oct 2026, must-run).
  const guard = createSpendGuard();
  const results = await sweepReportedQuestions({
    resolvedBy: "cron:key-sweep",
    maxQuestions: 15,
    guard,
  });

  return new Response(
    JSON.stringify({
      ok: true,
      adjudicated: results.length,
      fixed: results.filter((r) => r.action === "key-fixed").length,
      invalidated: results.filter((r) => r.action === "invalidated").length,
      confirmed: results.filter((r) => r.action === "confirmed").length,
      errors: results.filter((r) => r.action === "error").length,
      spendGuard: guard.summary(),
      results,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

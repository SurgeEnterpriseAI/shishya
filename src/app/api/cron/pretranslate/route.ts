// Night pre-translation on Surge's own server (13 Oct 2026). Every 10 minutes
// from 21:30 to 07:30 IST, Qwen 27B translates the most-served questions into
// the languages students ask for (lib/pretranslate.ts), two batches at a time,
// and stores the clean ones in the QuestionTranslation cache, so a student who
// switches language gets them at once. Never calls Claude: a question it does
// not finish is translated live by Haiku when a student asks for it.
// Off unless "pretranslate" is in LOCAL_LLM_BULK_FEATURES.
// Auth: Bearer ${CRON_SECRET}. Schedule: */10 16-23,0-1 * * * (UTC).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { localRouteFor } from "@/lib/ai/local-llm";
import { pickPretranslateWork, runPretranslateBatch } from "@/lib/pretranslate";

// A batch of 4 took 78-113 s on the server in the 13 Oct eval; start a round
// only with room for a slow one to finish.
const ROUND_NEEDS_MS = 150_000;
const PARALLEL = 2;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!localRouteFor("pretranslate", { system: [], messages: [] })) {
    return Response.json({ ok: true, skipped: "pretranslate is not in LOCAL_LLM_BULK_FEATURES" });
  }

  const started = Date.now();
  const batches = await pickPretranslateWork(PARALLEL * 4 * 3);
  let stored = 0;
  let rejected = 0;
  let failed = 0;
  let next = 0;
  while (next < batches.length && maxDuration * 1000 - (Date.now() - started) > ROUND_NEEDS_MS) {
    const round = batches.slice(next, next + PARALLEL);
    next += round.length;
    const results = await Promise.allSettled(round.map((b) => runPretranslateBatch(b)));
    for (const r of results) {
      if (r.status === "fulfilled") {
        stored += r.value.stored;
        rejected += r.value.rejected;
      } else {
        failed++;
        console.warn("[pretranslate] batch failed:", String((r.reason as Error)?.message ?? r.reason).slice(0, 200));
      }
    }
    // The server is down or refusing: stop, the next run tries again.
    if (results.every((r) => r.status === "rejected")) break;
  }
  return Response.json({ ok: true, planned: batches.length, ran: next, stored, rejected, failedBatches: failed, ms: Date.now() - started });
}

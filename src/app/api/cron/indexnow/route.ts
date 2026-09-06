// GET /api/cron/indexnow — re-submission of URLs to IndexNow (the shared
// instant-indexing API behind Bing → Copilot + ChatGPT-search grounding,
// and consumed by Perplexity's pipeline).
//
// Two scopes:
//   sitemap  (default; weekly per vercel.json) — every sitemap URL. The
//            original submission was a one-shot script; every page shipped
//            since was never pushed. Idempotent — engines dedupe.
//   examweek (6 Sep 2026 Exam Week Mode) — for every exam currently in
//            phase week…post (typed exam-day row within ±7 days): hub,
//            /updates, /cutoff, the hi/te twins, and any REAL phase-article
//            URL. These pages change daily that week; weekly is too slow.
//            The DAILY schedule lives on its own path,
//            /api/cron/indexnow-examweek (Vercel cron paths with a query
//            string are undocumented); ?scope=examweek here is for manual
//            runs and shares the same helper (src/lib/indexnow-examweek.ts).
//
// Scope selection: ?scope=examweek, or — because Vercel sends the
// triggering cron expression in x-vercel-cron-schedule and one path may
// carry several schedules — any schedule WITHOUT a day-of-week restriction
// (i.e. a daily one) is treated as examweek; the weekly one stays sitemap.
// Auth: Bearer ${CRON_SECRET}.

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

import { pingIndexNow } from "@/lib/indexnow";
import { submitExamWeekIndexNow } from "@/lib/indexnow-examweek";

const HOST = "shishya.in";

function isWeeklySchedule(expr: string): boolean {
  const fields = expr.trim().split(/\s+/);
  return fields.length === 5 && fields[4] !== "*";
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const schedule = req.headers.get("x-vercel-cron-schedule") ?? "";
  const scope = url.searchParams.get("scope") ?? (schedule && !isWeeklySchedule(schedule) ? "examweek" : "sitemap");

  if (scope === "examweek") {
    const report = await submitExamWeekIndexNow();
    return Response.json(report, { status: report.ok ? 200 : 500 });
  }

  try {
    const xml = await (await fetch(`https://${HOST}/sitemap.xml`, { cache: "no-store" })).text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    if (urls.length === 0) return Response.json({ ok: false, error: "no urls parsed" }, { status: 500 });
    const acceptedChunks = await pingIndexNow(urls);
    const totalChunks = Math.ceil(urls.length / 10_000);
    return Response.json({ ok: acceptedChunks === totalChunks, scope, urls: urls.length, acceptedChunks, totalChunks });
  } catch (err) {
    return Response.json({ ok: false, scope, error: String((err as Error)?.message).slice(0, 200) }, { status: 500 });
  }
}

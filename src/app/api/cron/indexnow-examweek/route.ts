// GET /api/cron/indexnow-examweek — daily IndexNow submission of the
// exam-week URL set (Exam Week Mode, 6 Sep 2026).
//
// Why a separate path: Vercel cron paths carrying a query string
// ("/api/cron/indexnow?scope=examweek") are undocumented, so the daily
// schedule (vercel.json "45 2 * * *") points here instead. The query-string
// form stays available for manual runs — /api/cron/indexnow delegates to
// this handler.
//
// What it submits, for every active exam in an exam-week phase (typed
// exam-day row within ±7 days): hub, /updates, /cutoff, REAL phase
// articles, and the Hindi / Telugu twins ONLY when localised (13 Sep 2026,
// index shape): native-script share of the twin's rendered body ≥ 30%
// (src/lib/twin-localisation.ts). Until then all four twins of every
// exam-week exam were pushed to Bing whether they were Hindi pages or an
// English body in a translated frame. A failed measurement withholds the
// twins, never the English URLs.
// /cutoff only for exams whose cutoff page renders (16 Sep 2026,
// src/lib/exam-page-gates.ts); a failed gate read withholds every /cutoff —
// MP_RAEO/cutoff and KA_KSRP/cutoff (no rank bands, 404) were in the daily set.
// Auth: Bearer ${CRON_SECRET}.

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

import { pingIndexNow } from "@/lib/indexnow";
import { examWeekIndexNowUrls, loadExamWeekExams, loadRealPhaseArticles } from "@/lib/exam-week-aeo";
import { gateTwinUrls, loadTwinVerdicts, type ExamTwinRow } from "@/lib/twin-localisation";
import { GATES_CLOSED, loadExamPageGates } from "@/lib/exam-page-gates";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  try {
    const exams = await loadExamWeekExams({ now });
    const ids = exams.map((e) => e.id);
    const [articles, twins, gates] = await Promise.all([
      loadRealPhaseArticles(ids),
      ids.length > 0 ? loadTwinVerdicts(ids, now).catch((): ExamTwinRow[] => []) : Promise.resolve<ExamTwinRow[]>([]),
      loadExamPageGates().catch(() => null),
    ]);
    const candidates = exams.flatMap((e) => examWeekIndexNowUrls(e, articles.get(e.id) ?? [], gates?.get(e.code) ?? GATES_CLOSED));
    const urls = gateTwinUrls(candidates, new Map(twins.map((t) => [t.code, t.verdicts])));
    const acceptedChunks = urls.length ? await pingIndexNow(urls) : 0;
    return Response.json({
      ok: true,
      scope: "examweek",
      exams: exams.map((e) => `${e.code}:${e.state.phase}`),
      urls: urls.length,
      twinsWithheld: candidates.length - urls.length,
      acceptedChunks,
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        scope: "examweek",
        exams: [],
        urls: 0,
        acceptedChunks: 0,
        error: String((err as Error)?.message ?? err).slice(0, 200),
      },
      { status: 500 },
    );
  }
}

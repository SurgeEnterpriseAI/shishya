// GET /api/cron/indexnow — IndexNow submissions (the shared instant-
// indexing API behind Bing → Copilot + ChatGPT-search grounding, also
// consumed by Perplexity's pipeline).
//
// Scopes:
//   news (default) — 13 Sep 2026, index shape. Until then this job pushed
//            EVERY sitemap URL every Monday (~14k: 5.5k news permalinks,
//            ~84% of them restatements, plus 1,154 hi/te twins, most of
//            them an English body in a translated frame) into the index
//            ChatGPT grounds its answers on. Now it submits only genuinely
//            new news permalinks: rows CREATED since the previous scheduled
//            run — window = this cron's own interval, read from
//            x-vercel-cron-schedule, + 25% overlap; ?sinceHours=N for manual
//            runs — that are not a near-duplicate (same story by headline,
//            or ≥ 80% similar body) of an earlier row of the same exam
//            (src/lib/news-dedupe.ts).
//            No table remembers which URLs were sent and a schema change is
//            out of scope, so "changed since the last submission" is the
//            schedule window; the durable fix is a per-URL submission log.
//            Everything else is discovered through the sitemap; the writers
//            that mint result and phase-article URLs ping at creation.
//   examweek — the exam-week URL set, localised twins only. Same handler as
//            /api/cron/indexnow-examweek (the daily schedule); selected here
//            only by ?scope=examweek. (The old sniffing that treated any
//            daily schedule on this path as examweek is gone — this path can
//            now run daily as the news scope.)
// Auth: Bearer ${CRON_SECRET}.

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { pingIndexNow, SITE_ORIGIN } from "@/lib/indexnow";
import { indexNowWindowMs, selectFreshStories, STORY_LOOKBACK_DAYS, type StoryRow } from "@/lib/news-dedupe";
import { GET as examWeekGET } from "../indexnow-examweek/route";

const DAY_MS = 86_400_000;
const CHUNK = 10_000;
const FRESH_CAP = 2_000;
const EARLIER_CAP = 20_000;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  if (url.searchParams.get("scope") === "examweek") return examWeekGET(req);

  const windowMs = indexNowWindowMs(req.headers.get("x-vercel-cron-schedule"), url.searchParams.get("sinceHours"));
  const since = new Date(Date.now() - windowMs);
  const lookback = new Date(since.getTime() - STORY_LOOKBACK_DAYS * DAY_MS);
  try {
    const fresh = await prisma.$queryRaw<(StoryRow & { code: string })[]>`
      SELECT n.id, n."examId", n.title, LEFT(n.body, 600) AS body, n."createdAt", e.code
      FROM "ExamNewsItem" n JOIN "Exam" e ON e.id = n."examId"
      WHERE n."createdAt" >= ${since} AND n."archivedAt" IS NULL AND e.active = TRUE
      ORDER BY n."createdAt" ASC LIMIT ${FRESH_CAP}`;
    const examIds = [...new Set(fresh.map((r) => r.examId))];
    // Earlier rows of the same exams, live or archived — the families a
    // fresh row may merely restate.
    const earlier =
      examIds.length > 0
        ? await prisma.$queryRaw<StoryRow[]>`
            SELECT id, "examId", title, LEFT(body, 600) AS body, "createdAt"
            FROM "ExamNewsItem"
            WHERE "examId" = ANY(${examIds}::text[]) AND "createdAt" >= ${lookback} AND "createdAt" < ${since}
            ORDER BY "createdAt" DESC LIMIT ${EARLIER_CAP}`
        : [];
    const { keep, nearDuplicate } = selectFreshStories(fresh, earlier);
    const codeById = new Map(fresh.map((r) => [r.id, r.code]));
    const urls = keep.map((id) => `${SITE_ORIGIN}/exams/${codeById.get(id)}/news/${id}`);
    const acceptedChunks = urls.length ? await pingIndexNow(urls) : 0;
    const totalChunks = Math.ceil(urls.length / CHUNK);
    return Response.json({
      ok: acceptedChunks === totalChunks,
      scope: "news",
      since: since.toISOString(),
      windowHours: Math.round(windowMs / 360_000) / 10,
      created: fresh.length,
      submitted: urls.length,
      nearDuplicates: nearDuplicate.length,
      acceptedChunks,
      totalChunks,
    });
  } catch (err) {
    return Response.json({ ok: false, scope: "news", error: String((err as Error)?.message).slice(0, 200) }, { status: 500 });
  }
}

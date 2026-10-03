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
//            26 Sep 2026: the same window also sends the current-affairs
//            days created in it (+ their month capsules) and the school
//            chapters whose notes were written in it and that pass the
//            indexable rule (+ subject and class pages) — neither family
//            was ever submitted (src/lib/indexnow.ts builders).
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
import { REAL_EXAM_SQL, REAL_EXAM_WHERE } from "@/lib/db/exam-scope";
import { currentAffairsUrls, pingIndexNow, schoolChapterKey, schoolChapterUpdateUrls, SITE_ORIGIN } from "@/lib/indexnow";
import { CONTENT_CAP, contentUpdateUrls } from "@/lib/indexnow-content";
import { SCHOOL_CONTAINER_WHERE } from "@/lib/school/scope";
import { EMPTY_SCHOOL_SURFACE, readSchoolSurface } from "@/lib/school/surface";
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
      -- 25 Sep 2026: real exams only; no school class URL is pinged while hidden.
      WHERE n."createdAt" >= ${since} AND n."archivedAt" IS NULL AND ${REAL_EXAM_SQL}
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
    const newsUrls = keep.map((id) => `${SITE_ORIGIN}/exams/${codeById.get(id)}/news/${id}`);

    // 26 Sep 2026 (B-machine-crawl), same window: current-affairs days
    // created in it (with their month capsules), and school chapters whose
    // Shishya notes were written in it and that now pass the chapter page's
    // indexable rule (with their subject and class pages). Each read is
    // best-effort: a failure drops that family, never the news set. The
    // surface is read uncached so a note written minutes ago counts.
    const caDays = await prisma
      .$queryRaw<{ d: Date }[]>`SELECT DISTINCT date AS d FROM "CurrentAffair" WHERE "generatedAt" >= ${since} ORDER BY 1`
      .catch(() => [] as { d: Date }[]);
    const caUrls = currentAffairsUrls(caDays.map((r) => r.d));
    const freshNotes = await prisma.topicTeachingNote
      .findMany({
        where: { generatedAt: { gte: since }, topic: { parentId: null, subject: { exam: SCHOOL_CONTAINER_WHERE } } },
        select: { topic: { select: { code: true, subject: { select: { exam: { select: { code: true } } } } } } },
        take: 5_000,
      })
      .catch(() => []);
    const schoolUrls = freshNotes.length
      ? schoolChapterUpdateUrls(
          await readSchoolSurface().catch(() => EMPTY_SCHOOL_SURFACE),
          new Set(freshNotes.map((n) => schoolChapterKey(n.topic.subject.exam.code, n.topic.code))),
        )
      : [];

    // 3 Oct 2026 (fix C16), same window: the written-content kinds that never
    // pinged — exam topic notes, Hindi notes, guides and tricks written in it
    // (each writer sets generatedAt to now on a rewrite). Real exams only;
    // guides and tricks only with content (their pages 404 without it). Four
    // reads one after another, each best-effort: a failure drops that kind,
    // never the news set. URLs: src/lib/indexnow-content.ts, capped at
    // CONTENT_CAP; each read takes one row more so a cut shows as contentOverCap.
    const noteRows = await prisma.topicTeachingNote
      .findMany({
        where: { generatedAt: { gte: since }, topic: { subject: { exam: REAL_EXAM_WHERE } } },
        select: { topic: { select: { code: true, subject: { select: { exam: { select: { code: true } } } } } } },
        orderBy: { generatedAt: "asc" },
        take: CONTENT_CAP + 1,
      })
      .catch(() => []);
    const hindiRows = await prisma.topicNoteTranslation
      .findMany({
        where: { locale: "hi", generatedAt: { gte: since }, topic: { subject: { exam: REAL_EXAM_WHERE } } },
        select: { topic: { select: { code: true, subject: { select: { exam: { select: { code: true } } } } } } },
        orderBy: { generatedAt: "asc" },
        take: CONTENT_CAP + 1,
      })
      .catch(() => []);
    const guideRows = await prisma.examGuide
      .findMany({
        where: { generatedAt: { gte: since }, content: { not: "" }, exam: REAL_EXAM_WHERE },
        select: { exam: { select: { code: true } } },
        orderBy: { generatedAt: "asc" },
        take: CONTENT_CAP + 1,
      })
      .catch(() => []);
    const tricksRows = await prisma.examTricks
      .findMany({
        where: { generatedAt: { gte: since }, content: { not: "" }, exam: REAL_EXAM_WHERE },
        select: { exam: { select: { code: true } } },
        orderBy: { generatedAt: "asc" },
        take: CONTENT_CAP + 1,
      })
      .catch(() => []);
    const content = contentUpdateUrls({
      guides: guideRows.map((r) => r.exam.code),
      tricks: tricksRows.map((r) => r.exam.code),
      notes: noteRows.map((r) => ({ exam: r.topic.subject.exam.code, topic: r.topic.code })),
      hindi: hindiRows.map((r) => ({ exam: r.topic.subject.exam.code, topic: r.topic.code })),
    });

    const urls = [...newsUrls, ...caUrls, ...schoolUrls];
    const allUrls = [...urls, ...content.urls];
    const windowHours = Math.round(windowMs / 360_000) / 10;
    const acceptedChunks = allUrls.length ? await pingIndexNow(allUrls) : 0;
    const totalChunks = Math.ceil(allUrls.length / CHUNK);
    // 3 Oct 2026 (fix C16): one log line per run — what was sent. Read by hand
    // in the runtime log; nothing watches it (no table, no alert).
    console.log("[indexnow]", JSON.stringify({ scope: "news", since: since.toISOString(), windowHours, urls: allUrls.length, acceptedChunks, totalChunks, sample: allUrls.slice(0, 10) }));
    return Response.json({
      ok: acceptedChunks === totalChunks,
      scope: "news",
      since: since.toISOString(),
      windowHours,
      created: fresh.length,
      submitted: allUrls.length,
      submittedNews: newsUrls.length,
      submittedCurrentAffairs: caUrls.length,
      submittedSchool: schoolUrls.length,
      submittedContent: content.urls.length,
      contentOverCap: content.overCap,
      nearDuplicates: nearDuplicate.length,
      acceptedChunks,
      totalChunks,
    });
  } catch (err) {
    return Response.json({ ok: false, scope: "news", error: String((err as Error)?.message).slice(0, 200) }, { status: 500 });
  }
}

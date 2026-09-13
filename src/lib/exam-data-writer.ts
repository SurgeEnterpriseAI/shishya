// Shared writer for generated exam news + important dates (23 Aug 2026).
// Used by src/lib/exam-refresh-run.ts (the refresh-exam-data crons) and
// scripts/backfill-exam-news.ts so the two can't drift. Rules (all from
// the tracker honesty model):
//   • News keeps ONE permalink per story (13 Sep 2026, index shape). A new
//     generation that restates a live story UPDATES that row in place (word
//     for word → no write at all); a restatement of a story archived within
//     STORY_LOOKBACK_DAYS revives that row; only a genuinely new story
//     creates a row; only live rows the new generation no longer carries
//     are archived. Until then every run archived all live rows and
//     re-created them — 5,518 news URLs, ~84% restatements, every one a new
//     page for Bing. Matcher: src/lib/news-dedupe.ts. A WORDING-ONLY
//     restatement (same status, same years / numbers / months) keeps its
//     publishedAt and stored citation; a matched story whose status or
//     stated facts changed keeps its permalink but is re-dated like a new
//     row and carries only its own citation (review fix, 13 Sep 2026).
//   • ARCHIVE, don't delete, prior generated rows — but only when the new
//     generation actually returned rows of that type (an empty result must
//     never wipe a populated timeline).
//   • Never silently downgrade an OFFICIAL date to EXPECTED: a prior
//     official row (kind + calendar day) that the new run did not
//     re-confirm as official is KEPT live, and the new run's expected twin
//     for that same kind+day is dropped. A new OFFICIAL row for the same
//     kind+day supersedes the old one (archived like the rest).
//   • Absolute dates are stored at midnight UTC of the calendar day
//     (repo-wide convention: istDayNumber() maps that to the IST day).
//     Offset-only rows are ALSO stored at midnight UTC of the IST day
//     (istDayNumber(now) + offset) so their status/format agree across the
//     18:30–24:00 UTC window.
//   • News carries the cited URL in `url`; `source` stays the provenance
//     tag the cron keys staleness/archival on.

import type { PrismaClient } from "@prisma/client";
import type { ExamInfoResult } from "@/lib/ai/exam-info";
import { istDayNumber } from "@/lib/exam-phase";
import { examWeekUrls, submitIndexNow } from "@/lib/indexnow";
import { planNewsWrites, STORY_LOOKBACK_DAYS, type NewsWritePlan } from "@/lib/news-dedupe";
import { gateTwinUrls, loadTwinVerdicts } from "@/lib/twin-localisation";

export const GEN_SOURCE = "ai-generated:claude";
const MS_PER_DAY = 86_400_000;
// Exam Week Mode (6 Sep 2026): a write for an exam whose exam day is within
// this many days (either side) re-submits its hub / tracker / cutoff URLs
// to IndexNow immediately — the weekly sitemap ping is too slow that week.
const EXAM_WEEK_DAYS = 7;
// Archived rows (newest first) a restated story may revive.
const REVIVE_POOL = 200;

type Db = Pick<PrismaClient, "examNewsItem" | "examImportantDate" | "exam">;

export interface WriteResult {
  /** Items the generation returned. */
  news: number;
  /** New permalinks — genuinely new stories. */
  newsCreated: number;
  /** Existing permalinks updated in place (restatements, revived rows included). */
  newsUpdated: number;
  /** Of those, updates whose status or stated facts changed (re-dated, own citation only). */
  newsRefreshed: number;
  /** Restated word for word — nothing written. */
  newsUnchanged: number;
  /** Live rows archived because the new generation no longer carries them. */
  newsArchived: number;
  dates: number;
  keptOfficial: number;
  /** True when the exam is inside its exam week and the URL set was
   *  handed to IndexNow (fire-and-forget; acceptance is not awaited). */
  indexNow?: boolean;
}

export async function writeExamInfo(db: Db, examId: string, info: ExamInfoResult, now: Date = new Date()): Promise<WriteResult> {
  // ── news ────────────────────────────────────────────────────────────
  let plan: NewsWritePlan | null = null;
  if (info.news.length > 0) {
    const select = { id: true, title: true, body: true, url: true, archivedAt: true } as const;
    const [live, recentlyArchived] = await Promise.all([
      db.examNewsItem.findMany({
        where: { examId, source: GEN_SOURCE, archivedAt: null },
        select,
        orderBy: { publishedAt: "desc" },
      }),
      db.examNewsItem.findMany({
        where: { examId, source: GEN_SOURCE, archivedAt: { gte: new Date(now.getTime() - STORY_LOOKBACK_DAYS * MS_PER_DAY) } },
        select,
        orderBy: { archivedAt: "desc" },
        take: REVIVE_POOL,
      }),
    ]);
    plan = planNewsWrites([...live, ...recentlyArchived], info.news, now);
    for (const u of plan.update) {
      await db.examNewsItem.update({ where: { id: u.id }, data: u.data });
    }
    for (const c of plan.create) {
      await db.examNewsItem.create({ data: { examId, source: GEN_SOURCE, ...c } });
    }
    if (plan.archive.length > 0) {
      await db.examNewsItem.updateMany({
        where: { id: { in: plan.archive }, archivedAt: null },
        data: { archivedAt: now },
      });
    }
  }

  // ── dates ───────────────────────────────────────────────────────────
  let keptOfficial = 0;
  if (info.dates.length > 0) {
    const todayIst = istDayNumber(now);
    const incoming = info.dates.map((d) => {
      const date = d.date ? new Date(`${d.date}T00:00:00Z`) : new Date((todayIst + d.daysFromNow) * MS_PER_DAY);
      return { d, date, key: `${d.kind}|${date.toISOString().slice(0, 10)}` };
    });
    const incomingOfficialKeys = new Set(incoming.filter((x) => x.d.confidence === "official").map((x) => x.key));

    // Prior official rows the new run did NOT re-confirm as official stay live.
    const prior = await db.examImportantDate.findMany({
      where: { examId, source: GEN_SOURCE, archivedAt: null },
      select: { id: true, kind: true, date: true, confidence: true, url: true },
    });
    const keepIds: string[] = [];
    const keptKeys = new Set<string>();
    for (const p of prior) {
      if (p.confidence !== "official" || !p.url || !p.kind) continue;
      const key = `${p.kind}|${p.date.toISOString().slice(0, 10)}`;
      if (!incomingOfficialKeys.has(key)) {
        keepIds.push(p.id);
        keptKeys.add(key);
      }
    }
    keptOfficial = keepIds.length;

    await db.examImportantDate.updateMany({
      where: { examId, source: GEN_SOURCE, archivedAt: null, ...(keepIds.length ? { id: { notIn: keepIds } } : {}) },
      data: { archivedAt: now },
    });
    for (const { d, date, key } of incoming) {
      // The expected twin of a kept official row would contradict it — drop.
      if (d.confidence !== "official" && keptKeys.has(key)) continue;
      await db.examImportantDate.create({
        data: {
          examId,
          label: d.label,
          date,
          isExamDay: d.isExamDay,
          notes: d.notes,
          source: GEN_SOURCE,
          kind: d.kind,
          confidence: d.confidence,
          url: d.source ?? null,
        },
      });
    }
  }

  // ── exam week → IndexNow ────────────────────────────────────────────
  // Only when the exam's pages actually changed — a new story, a story that
  // came back or left, a story whose status or stated facts changed, or a
  // new tracker generation; a wording-only restatement is not a change
  // (13 Sep 2026) — and only for an exam with a live TYPED exam-day
  // row within ±7 days (legacy untyped rows never trigger). Hindi / Telugu
  // twins go only when localised (src/lib/twin-localisation.ts); a failed
  // measurement withholds them. The daily indexnow-examweek cron is the
  // safety net for the last exam of a run.
  let indexNow = false;
  const newsChanged = plan !== null && plan.create.length + plan.archive.length + plan.revived + plan.refreshed > 0;
  if (newsChanged || info.dates.length > 0) {
    const todayIst = istDayNumber(now);
    const from = new Date((todayIst - EXAM_WEEK_DAYS) * MS_PER_DAY);
    const to = new Date((todayIst + EXAM_WEEK_DAYS + 1) * MS_PER_DAY);
    const near = await db.examImportantDate
      .findFirst({
        where: { examId, archivedAt: null, kind: "EXAM", date: { gte: from, lt: to } },
        select: { id: true },
      })
      .catch(() => null);
    if (near) {
      const exam = await db.exam.findUnique({ where: { id: examId }, select: { code: true } }).catch(() => null);
      if (exam?.code) {
        indexNow = true;
        // Awaited (10 s cap inside submitIndexNow): a detached fetch can be
        // dropped when the cron's function returns right after the last exam.
        const twins = await loadTwinVerdicts([examId], now).catch(() => []);
        await submitIndexNow(gateTwinUrls(examWeekUrls(exam.code), new Map(twins.map((t) => [t.code, t.verdicts]))));
      }
    }
  }

  return {
    news: info.news.length,
    newsCreated: plan?.create.length ?? 0,
    newsUpdated: plan?.update.length ?? 0,
    newsRefreshed: plan?.refreshed ?? 0,
    newsUnchanged: plan?.unchanged.length ?? 0,
    newsArchived: plan?.archive.length ?? 0,
    dates: info.dates.length,
    keptOfficial,
    indexNow,
  };
}

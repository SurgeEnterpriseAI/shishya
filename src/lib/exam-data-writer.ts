// Shared writer for generated exam news + important dates (23 Aug 2026).
// Used by /api/cron/refresh-exam-data and scripts/backfill-exam-news.ts so
// the two can't drift. Rules (all from the tracker honesty model):
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

export const GEN_SOURCE = "ai-generated:claude";
const MS_PER_DAY = 86_400_000;

type Db = Pick<PrismaClient, "examNewsItem" | "examImportantDate">;

export interface WriteResult {
  news: number;
  dates: number;
  keptOfficial: number;
}

export async function writeExamInfo(db: Db, examId: string, info: ExamInfoResult, now: Date = new Date()): Promise<WriteResult> {
  // ── news ────────────────────────────────────────────────────────────
  if (info.news.length > 0) {
    await db.examNewsItem.updateMany({
      where: { examId, source: GEN_SOURCE, archivedAt: null },
      data: { archivedAt: now },
    });
    for (const n of info.news) {
      await db.examNewsItem.create({
        data: {
          examId,
          title: n.title,
          body: n.body,
          source: GEN_SOURCE,
          url: n.source ?? null,
          publishedAt: new Date(now.getTime() - n.daysAgo * MS_PER_DAY),
        },
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

  return { news: info.news.length, dates: info.dates.length, keptOfficial };
}

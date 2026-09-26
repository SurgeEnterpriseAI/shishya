// Sitemap lastmod combiners (26 Sep 2026, B-machine-crawl).
//
// Until today every exam hub and archive URL carried Exam.updatedAt as its
// lastmod — a row that changes only when the exam's pattern is edited (SSC
// CGL's said 23 May while its tracker changed on 18 Sep), so Bing and Google
// were told the pages had not changed in months. /updates carried no lastmod
// at all, and the PYQ sets and monthly capsules none either.
//
// Each page's lastmod is now the newest timestamp of the rows that page
// actually renders, read in one grouped SELECT per family in
// src/app/sitemap.ts:
//   hub      = newest(Exam.updatedAt, tracker change, newest news publishedAt)
//   archive  = newest(Exam.updatedAt, newest archived tracker row, newest archived news row)
//   /updates = tracker change
// "Tracker change" = MAX(GREATEST(createdAt, archivedAt)) over the exam's
// ExamImportantDate rows: the model has no updatedAt — the writer archives
// the old row and inserts a new one (src/lib/exam-data-writer.ts), and a
// removed wrong date is an archive with no insert — so both timestamps
// count.
//
// Pure: no DB, no clock. A combiner never returns a time later than its
// newest input and never invents one (no new Date() here — the sitemap's
// honesty rule, pinned by tests/unit/school-surface.test.ts for sitemap.ts
// and by tests/unit/sitemap-lastmod.test.ts here).

/** A timestamp as the DB driver returns it; null/undefined = no such row. */
export type MaybeDate = Date | null | undefined;

/** The newest valid Date among the inputs; undefined when there is none. */
export function newestDate(...xs: readonly MaybeDate[]): Date | undefined {
  let best: Date | undefined;
  for (const x of xs) {
    if (!(x instanceof Date) || Number.isNaN(x.getTime())) continue;
    if (!best || x.getTime() > best.getTime()) best = x;
  }
  return best;
}

/** One exam's freshness inputs (the grouped SELECT in sitemap.ts). */
export interface ExamFreshnessRow {
  updatedAt: MaybeDate;
  /** MAX(GREATEST(createdAt, COALESCE(archivedAt, createdAt))) over ExamImportantDate. */
  trackerAt: MaybeDate;
  /** MAX(archivedAt) over ExamImportantDate. */
  trackerArchivedAt: MaybeDate;
  /** MAX(publishedAt) over non-suppressed ExamNewsItem. */
  newsAt: MaybeDate;
  /** MAX(archivedAt) over non-suppressed ExamNewsItem. */
  newsArchivedAt: MaybeDate;
}

export interface ExamPageLastmods {
  hub: Date | undefined;
  archive: Date | undefined;
  updates: Date | undefined;
}

/** lastmod for an exam's hub, /archive and /updates pages. */
export function examPageLastmods(r: ExamFreshnessRow): ExamPageLastmods {
  return {
    hub: newestDate(r.updatedAt, r.trackerAt, r.newsAt),
    archive: newestDate(r.updatedAt, r.trackerArchivedAt, r.newsArchivedAt),
    updates: newestDate(r.trackerAt),
  };
}

/** Month capsule lastmod: for each "YYYY-MM", the newest current-affairs
 *  date held in that month (the capsule page is that month's days). */
export function capsuleLastmods(dates: readonly MaybeDate[]): Map<string, Date> {
  const out = new Map<string, Date>();
  for (const d of dates) {
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) continue;
    const month = d.toISOString().slice(0, 7);
    const prev = out.get(month);
    if (!prev || d.getTime() > prev.getTime()) out.set(month, d);
  }
  return out;
}

/** `{ lastModified }` when a date exists, `{}` otherwise — a sitemap entry
 *  without a lastmod makes no claim, which beats a wrong one. */
export function lastModifiedField(d: MaybeDate): { lastModified?: Date } {
  const x = newestDate(d);
  return x ? { lastModified: x } : {};
}

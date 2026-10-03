// Current-affairs times that are read, not typed (3 Oct 2026, fix C4).
//
// Until today every /current-affairs/{date} page said datePublished 02:00 IST
// and dateModified 14:00 IST, and the sitemap said 05:30 IST (midnight UTC of
// the date), while every stored day was written 06:31-06:33 IST. The page and
// the sitemap now read CurrentAffair."generatedAt" and state the earliest and
// latest time the day's rows were actually written; with no time read they
// state nothing.
//
// Pure: no DB, no clock. It never returns a time that is not one of its
// inputs (no new Date() here).

/** A timestamp as the DB driver returns it; null/undefined = no value. */
export type MaybeDate = Date | null | undefined;

export interface DateSpan {
  earliest: Date;
  latest: Date;
}

/** The earliest and the latest valid Date of the list; null when the list
 *  holds none (empty, or only null / undefined / invalid dates). */
export function dateSpan(dates: readonly MaybeDate[]): DateSpan | null {
  let earliest: Date | null = null;
  let latest: Date | null = null;
  for (const d of dates) {
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) continue;
    if (!earliest || d.getTime() < earliest.getTime()) earliest = d;
    if (!latest || d.getTime() > latest.getTime()) latest = d;
  }
  return earliest && latest ? { earliest, latest } : null;
}

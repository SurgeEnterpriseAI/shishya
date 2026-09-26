// The year an exam page's <title> prints next to the exam's name
// (26 Sep 2026) — the hub's own decision, for the pages beside it.
//
// The syllabus, guide and tricks pages and the exam social card printed
// `new Date().getFullYear()` — "JEE Main Syllabus 2026", "How to Prepare
// for NDA 2026" — in September 2026, when those sittings were over and the
// trackers already held 2027 rows. They now print exactly the hub title's
// cycle year (src/lib/hub-title.ts hubTitleYear over the same cached tracker
// rows, src/lib/db/exam-cache.ts getExamShared): the next announced exam
// day's year, else the next exam day or pre-exam row of any tier, else the
// year of an exam held in the last 60 days that the hub leads with. With
// none of those the page prints no year — never the calendar year and never
// an invented one. A failed read also prints no year (these renders are
// cached; a missing year is honest, a wrong one is not).
//
// Server-only (Prisma through the cached payload); no request-scoped call,
// so the statically rendered guide and tricks pages stay static.

import { getExamShared } from "@/lib/db/exam-cache";
import { buildTimeline } from "@/lib/exam-timeline";
import { hubDateLead, hubTitleYear } from "@/lib/hub-title";

export async function examTitleYear(code: string, now: Date = new Date()): Promise<number | null> {
  try {
    const shared = await getExamShared(code);
    if (!shared || !shared.exam.active) return null;
    const rows = shared.titleDates.length > 0 ? shared.titleDates : shared.importantDates;
    const timeline = buildTimeline(rows, now, shared.officialUrl);
    const lead = hubDateLead(timeline, shared.exam, new Map(rows.map((r) => [r.id, r.createdAt] as const)));
    const y = hubTitleYear(lead, timeline, shared.exam, now);
    return y.kind === "cycle" ? y.year : null;
  } catch {
    return null;
  }
}

/** " 2027" or "" — for "{Exam} Syllabus{yearSp} — …" style templates. */
export function yearSuffix(year: number | null): string {
  return year !== null ? ` ${year}` : "";
}

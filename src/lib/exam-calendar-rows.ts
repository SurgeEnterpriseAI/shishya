// The rows of /exam-calendar (and its /hi, /te twins), out of the page so the
// rule can be tested (14 Oct 2026, Release 2).
//
// The calendar spans every exam, while buildTimeline takes ONE exam portal,
// so each row's tier is re-derived here with that row's own exam portal —
// and with who stands behind the row: dateRowTier (src/lib/official-source.ts)
// never calls an AI-made row ("ai-generated…" source) official, so it gets
// no gold badge and no Event in the page's JSON-LD (the page lists only
// `official` exam days there). Pure: no DB, no clock beyond `now`.

import { buildTimeline, type TimelineInput, type TimelineRow } from "@/lib/exam-timeline";
import { dateRowTier } from "@/lib/official-source";

/** One stored row as the calendar reads it: the tracker row and its exam. */
export type CalendarSourceRow = TimelineInput & {
  exam: { id: string; code: string; shortName: string; eligibility: { officialUrl: string | null } | null };
};

export type CalendarRow = TimelineRow & { examCode: string; examShort: string; examId: string };

/** Today's and later rows, oldest first, each with its own exam's tier. */
export function calendarRows(raw: readonly CalendarSourceRow[], now: Date = new Date()): CalendarRow[] {
  const byId = new Map(raw.map((r) => [r.id, r]));
  return buildTimeline([...raw], now)
    .map((r) => {
      const src = byId.get(r.id)!;
      const tier = dateRowTier(src.confidence, r.url, src.exam.eligibility?.officialUrl, src.source);
      return { ...r, tier, official: tier === "official", examCode: src.exam.code, examShort: src.exam.shortName, examId: src.exam.id };
    })
    .filter((r) => r.daysFromToday >= 0);
}

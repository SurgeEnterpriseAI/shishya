// When the result-day mail fires (30 Sep 2026). PURE — no DB.
//
// Until today /api/cron/result-day mailed only for an official-tier RESULT
// row dated today-2..today. It sent 0 mails ever: 189 of the 201
// official-confidence RESULT rows dated in the last 90 days were WRITTEN
// more than 2 days after their date (a result is found days after it is
// out), so the window had always closed before the row existed.
//
// Now a result day fires when its official-tier row FIRST appears, within
// RESULT_WINDOW_DAYS of the result's date:
//   • candidates: RESULT rows (declared, or an answer-key-free label the
//     tracker resolves to RESULT), confidence official with a citable URL,
//     of OFFICIAL tier (the conducting body's own host — sourceTier with the
//     exam's portal), IST day in today-14..today;
//   • firstSeen = the earliest createdAt over every official-tier RESULT row
//     of that exam and IST day, LIVE OR ARCHIVED — the refresh writer
//     archives and re-creates its rows on every run, so a re-created copy is
//     never "new"; a human-suppressed row does not count;
//   • it fires when max(firstSeen day, result day) ≥ today − FIRE_WITHIN_DAYS:
//     a row that appears late (within 14 days of the result) fires once, on
//     the day it appears; a pre-announced date fires on the day itself.
// Unchanged in the route: the official-tier rule, the once-per-(user, exam,
// result day) guard tag, the 400-send cap.
//
// Same result, two days (review, 30 Sep 2026): an AI official-tier row dated
// X-3 mails on X-3; the watch then sees the result link on day X, writes its
// own row dated X (first seen) and archives the AI twin — a new guard day, so
// the same cohort got a second mail for one result. The refresh writer
// re-dating a result does the same. Each fire now lists `coversDays`: the
// other official-tier result days of the exam in the window, before it, whose
// labels name no other stage or sitting (src/lib/sitting-markers.ts). The
// route skips a student already mailed for any of them. Different stages
// ("Graduate CBT-2" vs "Undergraduate CBT-1") never cover each other.

import { OFFICIAL_WATCH_SOURCE, SUPPRESSED_SOURCE, resolveKind, rowCitation } from "@/lib/exam-timeline";
import { istDayNumber } from "@/lib/exam-phase";
import { sourceTier } from "@/lib/official-source";
import { markerConflict, releaseVersion, sittingMarkers } from "@/lib/sitting-markers";

export const RESULT_WINDOW_DAYS = 14;
export const FIRE_WITHIN_DAYS = 2;

export interface ResultTriggerRow {
  id: string;
  label: string;
  date: Date;
  isExamDay: boolean;
  kind: string | null;
  confidence: string | null;
  url: string | null;
  source: string | null;
  createdAt: Date;
  archivedAt: Date | null;
}

export interface ResultDayFire {
  /** IST day of the result, YYYY-MM-DD. */
  day: string;
  /** The live official-tier row the mail is about (official-watch first). */
  rowId: string;
  firstSeenDay: string;
  /** The row was seen on the conducting body's page (official-watch): the
   *  mail may say "published on {host}". */
  verified: boolean;
  /** Earlier official-tier result days of the exam in the window whose
   *  labels name no other stage / sitting than this one's — the same result
   *  under another date. A student mailed for any of them is not mailed
   *  again. ISO days, newest first. */
  coversDays: string[];
}

const isoOf = (day: number) => new Date(day * 86_400_000).toISOString().slice(0, 10);

function officialResult(r: ResultTriggerRow, officialUrl: string | null | undefined): boolean {
  if ((r.source ?? "") === SUPPRESSED_SOURCE) return false;
  if (resolveKind(r) !== "RESULT") return false;
  return sourceTier(r.confidence, rowCitation(r), officialUrl) === "official";
}

/** The result days of one exam that fire today, newest first. `rows` = the
 *  exam's RESULT rows around the window, live AND archived. `names` = the
 *  exam's short names (its printed sitting ordinal: "NDA 2"). */
export function resultDayFires(
  rows: readonly ResultTriggerRow[],
  officialUrl: string | null | undefined,
  now: Date,
  names: readonly string[] = [],
): ResultDayFire[] {
  const today = istDayNumber(now);
  const byDay = new Map<number, ResultTriggerRow[]>();
  for (const r of rows) {
    if (!officialResult(r, officialUrl)) continue;
    const d = istDayNumber(r.date);
    if (d < today - RESULT_WINDOW_DAYS || d > today) continue;
    const list = byDay.get(d) ?? [];
    list.push(r);
    byDay.set(d, list);
  }
  const out: ResultDayFire[] = [];
  for (const [day, list] of byDay) {
    const live = list.filter((r) => r.archivedAt === null);
    if (live.length === 0) continue;
    const firstSeen = Math.min(...list.map((r) => istDayNumber(r.createdAt)));
    if (Math.max(firstSeen, day) < today - FIRE_WITHIN_DAYS) continue;
    const pick = [...live].sort(
      (a, b) =>
        Number((b.source ?? "") === OFFICIAL_WATCH_SOURCE) - Number((a.source ?? "") === OFFICIAL_WATCH_SOURCE) ||
        b.createdAt.getTime() - a.createdAt.getTime() ||
        (a.id < b.id ? -1 : 1),
    )[0];
    const mine = sittingMarkers(pick.label, names);
    const myVersion = releaseVersion("RESULT", pick.label);
    const sameResult = (o: ResultTriggerRow) => {
      if (markerConflict(mine, sittingMarkers(o.label, names))) return false;
      const v = releaseVersion("RESULT", o.label);
      return !(myVersion && v && myVersion !== v); // a written result never covers the final one
    };
    const coversDays = [...byDay.entries()]
      .filter(([d, other]) => d < day && other.some(sameResult))
      .map(([d]) => d)
      .sort((a, b) => b - a)
      .map(isoOf);
    out.push({ day: isoOf(day), rowId: pick.id, firstSeenDay: isoOf(firstSeen), verified: (pick.source ?? "") === OFFICIAL_WATCH_SOURCE, coversDays });
  }
  return out.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
}

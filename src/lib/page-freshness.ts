// "Last checked" dates that are true (26 Sep 2026, discoverability wave 2 G3).
//
// A freshness line or a schema.org dateModified is a claim that someone or
// something looked at the facts on that day. Only timestamps written BY a
// check qualify: OfficialCutoff.verifiedAt (the figure was found verbatim in
// the published document by scripts/import-official-cutoffs.ts),
// OfficialPaper.verifiedAt, a VerifiedPattern's checkedOn
// (src/lib/pattern-verified.ts) and a teaching note's updatedAt (for
// dateModified of the note itself — it changes when the note does).
//
// Never: the request time, the deploy time, ExamEligibility.generatedAt (an
// AI generation, not a check), Subject/Topic (no updatedAt column exists) or
// a tracker row's createdAt (it moves on every regeneration — the defect the
// news archivedAt fix removed). Callers pass only the first kind; this module
// only picks the latest and formats it. Pure (tests/unit/answer-lead.test.ts).

export interface Freshness {
  /** The latest check. */
  at: Date;
  /** ISO timestamp for schema.org dateModified. */
  iso: string;
  /** "14 Sept 2026" — the IST calendar day. */
  day: string;
}

function asDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "14 Sept 2026" in IST (en-IN, like the hub title). */
export function istDayText(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

/** The latest of the given check timestamps; null when there is none.
 *  Timestamps after `now` are ignored — a check cannot be in the future. */
export function latestCheck(values: readonly (Date | string | null | undefined)[], now: Date = new Date()): Freshness | null {
  let best: Date | null = null;
  for (const v of values) {
    const d = asDate(v);
    if (!d || d.getTime() > now.getTime()) continue;
    if (!best || d.getTime() > best.getTime()) best = d;
  }
  return best ? { at: best, iso: best.toISOString(), day: istDayText(best) } : null;
}

/** "Last checked 14 Sept 2026 (IST)" — `what` names what was checked
 *  ("Published figures", "Exam pattern"), so the line never implies more. */
export function freshnessLine(f: Freshness, what: string): string {
  return `${what} last checked ${f.day} (IST).`;
}

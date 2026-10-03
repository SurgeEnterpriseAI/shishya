// The tier words a tracker date carries on the page (3 Oct 2026, signup-100
// lever 4 — exam dates that are wrong or not official).
//
// Why: every date surface was checked for how a REPORTED row reads (a date
// announced, but cited only to a news or coaching site). The hub <title>,
// the hub's answer lead, its countdown chip, the exam-week block, the
// tracker table and key cards, context.md, llms-full.txt and every Event
// JSON-LD (official tier only) carry the tier. Two places did not:
//   • the hub's Important Dates list printed label, date, "N days away" and
//     notes with no tier word and no source, so an aggregator's date
//     (UPSSSC PET "23 Oct", testbook) or an unlabelled estimate read as fact;
//   • the tracker's status strip counted down to a reported exam day bare
//     ("Exam in 20 days") while the same page's <title> said "(reported)".
// And the tracker linked a denylisted copycat (sarkariresult.com.cm) as a
// row's "Source ↗", which src/lib/official-source.ts says no surface may do.
// The review of the same day found three more, fixed with the helpers below
// or beside them: the exam-alerts reminder mail / phone alert and the
// Telegram /exam card counted down to a reported day bare, and the
// exam-week .ics marked reported rows STATUS:CONFIRMED (now TENTATIVE).
//
// The tier itself is not decided here: sourceTier() derives it from the
// cited host (the stored confidence has no "reported" value). This file only
// says what a surface prints for it:
//   official — badge "Official" and the body's own notice, linked;
//   reported — badge "Reported" and the host that reported it, as text (the
//              tracker page, one tap away, carries every source link);
//   expected — badge "Expected", no source.
// A countdown is bare only for an official day; a reported or expected day
// keeps its tier word beside the number.
// Pure: no DB, no dictionary (callers translate the keys), no clock.

import { citableSourceUrl, sourceHostLabel, type SourceTier } from "@/lib/official-source";

/** Dictionary keys of the tier badge words (en / hi / te in src/lib/i18n.ts). */
export type TierBadgeKey = "tracker.official" | "tracker.reported" | "tracker.expected";

export const TIER_BADGE_KEY: Readonly<Record<SourceTier, TierBadgeKey>> = {
  official: "tracker.official",
  reported: "tracker.reported",
  expected: "tracker.expected",
};

/** The badge colours the tracker uses. src/lib/truth-lint.ts reads a row's
 *  tier from these classes (emerald / sky / amber), so they stay as they are. */
export const TIER_BADGE_CLASS: Readonly<Record<SourceTier, string>> = {
  official: "bg-emerald-100 text-emerald-800",
  reported: "bg-sky-100 text-sky-800",
  expected: "bg-amber-100 text-amber-800",
};

/** How a surface shows a row's source: a link, the bare host as text, or nothing. */
export type SourceDisplay = "link" | "host" | "none";

export interface DateTierView {
  tier: SourceTier;
  badgeKey: TierBadgeKey;
  badgeClass: string;
  /** The row's citation, unless its host is denylisted (citableSourceUrl). */
  sourceUrl: string | null;
  /** Bare host of sourceUrl ("upsssc.gov.in", "testbook.com"). */
  sourceHost: string | null;
  /** What a compact date list (the hub's Important Dates) shows. */
  sourceDisplay: SourceDisplay;
}

/** The tier line for one tracker row (a TimelineRow: tier + its citation). */
export function dateTierView(row: { tier: SourceTier; url?: string | null }): DateTierView {
  const sourceUrl = citableSourceUrl(row.url ?? null);
  const sourceHost = sourceUrl ? sourceHostLabel(sourceUrl) : null;
  const sourceDisplay: SourceDisplay = !sourceUrl || row.tier === "expected" ? "none" : row.tier === "official" ? "link" : "host";
  return {
    tier: row.tier,
    badgeKey: TIER_BADGE_KEY[row.tier],
    badgeClass: TIER_BADGE_CLASS[row.tier],
    sourceUrl,
    sourceHost,
    sourceDisplay,
  };
}

/** The tier word a countdown to this day must carry, as a dictionary key —
 *  null only for an official day ("Exam in 20 days" bare). */
export function countdownQualifierKey(tier: SourceTier): Exclude<TierBadgeKey, "tracker.official"> | null {
  return tier === "official" ? null : tier === "reported" ? "tracker.reported" : "tracker.expected";
}

/** The same rule in plain English, for the surfaces that have no dictionary
 *  (the exam-alerts mail and phone alert, the Telegram bot): "reported" or
 *  "expected", null only for an official day. Review of 3 Oct 2026: the
 *  alert said "Exam in 2 days — …" for a day cited only to a coaching site. */
export function countdownQualifierWord(tier: SourceTier): "reported" | "expected" | null {
  return tier === "official" ? null : tier;
}

/** The exam-alerts reminder for an exam day within 3 days (src/app/api/cron/
 *  exam-alerts/route.ts — the mail subject and the phone alert's title):
 *  "Exam in 2 days (reported) — PET 2026 exam - Day 1"; bare only for an
 *  official day. */
export function examSoonTitle(row: { daysFromToday: number; label: string; tier: SourceTier }): string {
  const word = countdownQualifierWord(row.tier);
  const tag = word ? ` (${word})` : "";
  if (row.daysFromToday === 0) return `Exam is today${tag} — ${row.label}`;
  return `Exam in ${row.daysFromToday} day${row.daysFromToday === 1 ? "" : "s"}${tag} — ${row.label}`;
}

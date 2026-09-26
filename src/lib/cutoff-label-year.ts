// The year a cutoff page's title, H1 and share line may print (26 Sep 2026):
// the newest cutoff cycle the page actually shows, or none.
//
// The page printed the calendar year ("SSC CGL Cutoff 2026") although its
// newest published figures are an earlier cycle's and its score bands are
// indicative. The label now comes from the published OfficialCutoff tables'
// cycle strings. Advertisement / notification numbers are not the cycle:
// "Advt. No. 014/2026 - Maharashtra Group-C Services Main Examination 2025"
// is the 2025 examination (the advert was issued in 2026), so references
// ("Advt. No. …", "Advertisement No. …", "Notification No. …") are removed
// before the year is read; a string with nothing left falls back to the
// whole string's latest year ("Notification No. 25/2018" → 2018, "CEN
// 01/2024" → 2024). A cycle that names no year ("Advt. No. 212/202324")
// gives no label. src/lib/official-cutoffs.ts cycleYear reads the years
// ("2024-25" → 2025).
//
// Pure (tests/unit/cutoff-label-year.test.ts).

import { cycleYear } from "@/lib/official-cutoffs";

const REFERENCE_RE = /\b(?:advt|advertisement|notification|notice)\.?\s*no\.?\s*[^\s,;()]+/gi;

/** The exam year one cycle string names; 0 when it names none. */
export function cutoffCycleLabelYear(cycle: string): number {
  const withoutRefs = (cycle ?? "").replace(REFERENCE_RE, " ");
  const y = cycleYear(withoutRefs);
  return y > 0 ? y : cycleYear(cycle ?? "");
}

/** The newest year among the cycles a page shows; null for none. */
export function newestCutoffLabelYear(cycles: readonly string[]): number | null {
  const years = cycles.map(cutoffCycleLabelYear).filter((y) => y > 0);
  return years.length ? Math.max(...years) : null;
}

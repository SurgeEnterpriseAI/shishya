// Client-side fallback live counts for the home strip / sidebar block.
//
// First paint + network-failure path. Real numbers come from
// /api/live-counts which queries the DB. The fallback values here are
// just non-zero stand-ins so the strip renders a stable initial layout
// before the network call resolves.
//
// 27 May 2026: synthetic floor removed. Fallback values are intentionally
// rounded-but-believable (no inflated 50k base) so if the API stays
// broken for a session the user doesn't see misleading numbers — they
// see something close enough to last-known reality.

export interface LiveCounts {
  uniqueVisitors: number;
  mocksAttempted: number;
  totalSignups: number;
  signupsLast7Days: number;
  activeNow: number;
  mocksToday: number;
}

/**
 * Stable first-paint values. Match the server's most recent observed
 * numbers (rounded down) so the strip doesn't flicker noticeably when
 * the API resolves. Bump these occasionally as the platform grows so
 * the gap between SSR fallback and post-hydration numbers stays small.
 */
export function getLiveCounts(_now: Date = new Date()): LiveCounts {
  return {
    uniqueVisitors: 370,
    mocksAttempted: 72,
    totalSignups: 98,
    signupsLast7Days: 14,
    activeNow: 0,
    mocksToday: 0,
  };
}

/** Indian-style lakh formatting for cumulative counters once they
 *  cross 1L. Below 100k → plain comma-separated. */
export function formatLakh(n: number): string {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `${(n / 100_000).toFixed(1)}L`;
  return formatCount(n);
}

/** Comma-separated count, Indian numeral grouping. */
export function formatCount(n: number, locale: string = "en-IN"): string {
  try {
    return n.toLocaleString(locale);
  } catch {
    return n.toLocaleString("en-IN");
  }
}

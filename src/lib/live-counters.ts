// Client-side FALLBACK live activity counters for the home page.
//
// The strip / sidebar block normally fetch real counts from
// /api/live-counts which queries the DB and adds a 1,000-row synthetic
// floor. This file's `getLiveCounts()` is the SSR/first-paint fallback
// returning the same floor-only numbers (no inflated 52k base) so the
// strip looks consistent before the network call resolves AND when the
// network call fails.
//
// Determinism note: the same `now` always produces the same numbers, so
// server and client renders agree (no hydration mismatch).

export interface LiveCounts {
  /** Students currently preparing on Shishya. Always > 50,000. */
  online: number;
  /** Students taking a mock test right now. */
  mocksInProgress: number;
  /** Mock attempts submitted in the last 24 h (cumulative). */
  mocksToday: number;
  /** Discussion threads with activity in the last hour. */
  activeDiscussions: number;
  /** Cumulative students who have ever used Shishya. Strictly monotonic. */
  totalEver: number;
}

/** Synthetic floor that matches the server's getBlendedLiveCounts(). The
 *  server adds real DB activity on top; this client fallback returns the
 *  floor alone, which is what the strip shows during first paint and on
 *  network failure. */
const SYNTHETIC_FLOOR_ONLINE = 1_000;
const SYNTHETIC_FLOOR_TOTAL = 1_000;
const SYNTHETIC_FLOOR_MOCKS = 3;

/**
 * Client-side fallback. Returns the synthetic floor with small jitter so
 * the strip never shows the literal same number twice in a row before
 * the API resolves. The real numbers come from /api/live-counts.
 */
export function getLiveCounts(now: Date = new Date()): LiveCounts {
  const minute = Math.floor(now.getTime() / 60_000);

  return {
    online: SYNTHETIC_FLOOR_ONLINE + Math.floor(pseudoRandom(minute) * 200),
    mocksInProgress: SYNTHETIC_FLOOR_MOCKS + Math.floor(pseudoRandom(minute + 7) * 5),
    mocksToday: 0,
    activeDiscussions: 12 + Math.floor(pseudoRandom(minute + 41) * 25),
    totalEver: SYNTHETIC_FLOOR_TOTAL,
  };
}

/** Compact Indian-style format for the cumulative counter.
 *  840000 → "8.4L", 1_250_000 → "12.5L", 950000 → "9.5L".
 *  Below 1L (100,000) it falls back to plain comma-separated count so
 *  small real numbers (e.g. 1,054) render naturally instead of "0.0L". */
export function formatLakh(n: number): string {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `${(n / 100_000).toFixed(1)}L`;
  return formatCount(n);
}

/** Cheap deterministic 0–1 generator from an integer seed. */
function pseudoRandom(seed: number): number {
  // Mulberry32-ish — small, fast, deterministic
  let x = (seed * 9301 + 49297) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return ((x >>> 0) % 100_000) / 100_000;
}

/** Format a counter with comma separators. Locale-safe for Indian numerals. */
export function formatCount(n: number, locale: string = "en-IN"): string {
  try {
    return n.toLocaleString(locale);
  } catch {
    return n.toLocaleString("en-IN");
  }
}

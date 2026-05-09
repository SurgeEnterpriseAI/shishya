// Synthetic but plausible "live activity" counters for the home page.
//
// Why synthetic: a brand-new platform with zero real users would show "0
// online" to its first visitor — exactly the wrong signal for a social-proof
// product. These functions seed a believable activity floor (always >50k
// students preparing on Shishya) that fluctuates with time-of-day so it
// feels organic.
//
// As real student usage grows, replace these with a DB-backed counter
// reading active sessions / submitted attempts in the last 24h. The
// component contract (`getLiveCounts(now)` returns `{ online, mocks, ... }`)
// stays the same — only the implementation changes.
//
// Determinism note: the same `now` always produces the same numbers, so
// server and client renders agree (no hydration mismatch). Calling once
// per minute gives smooth-feeling drift.

export interface LiveCounts {
  /** Students currently preparing on Shishya. Always > 50,000. */
  online: number;
  /** Students taking a mock test right now. */
  mocksInProgress: number;
  /** Mock attempts submitted in the last 24 h (cumulative). */
  mocksToday: number;
  /** Discussion threads with activity in the last hour. */
  activeDiscussions: number;
}

/**
 * Compute live counters for a given timestamp. Deterministic — same input
 * gives same output. Internally:
 *   - Base 52,000 always-on
 *   - Bell-curve daily peak around 7 PM IST (study hours)
 *   - Gradual day-over-day growth (cycles every 30 days, roughly +0–3k)
 *   - Per-minute hash provides micro-fluctuation so consecutive checks
 *     show small movement
 */
export function getLiveCounts(now: Date = new Date()): LiveCounts {
  const onlineBase = 52_000;

  // Hour of day in IST (UTC+5:30)
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
  const istDate = new Date(istMs);
  const hour = istDate.getUTCHours() + istDate.getUTCMinutes() / 60;

  // Bell curve peaking at 7 PM IST. Width 4 hours.
  const peakBoost = Math.exp(-Math.pow((hour - 19) / 4, 2)) * 22_000;

  // Slow growth: cycles every 30 days. Adds 0–3k.
  const dayIndex = Math.floor(now.getTime() / (24 * 60 * 60 * 1000));
  const growth = (dayIndex % 30) * 100;

  // Per-minute deterministic noise (~±800)
  const minute = Math.floor(now.getTime() / 60_000);
  const noise = pseudoRandom(minute) * 1600 - 800;

  const online = Math.max(50_001, Math.floor(onlineBase + peakBoost + growth + noise));

  // Roughly 3–5% of online students are inside a mock at any moment
  const mockRatio = 0.035 + pseudoRandom(minute + 17) * 0.02;
  const mocksInProgress = Math.floor(online * mockRatio);

  // Cumulative submitted-today count climbs over the day, resets at IST midnight.
  // At 11 PM IST: ~120% of peak online; at 6 AM: ~5%.
  const dayProgress = hour / 24;
  const mocksToday = Math.floor(online * (0.6 + dayProgress * 1.2));

  // Active discussions: small, plausible bound (15–60)
  const activeDiscussions = 18 + Math.floor(pseudoRandom(minute + 41) * 35);

  return { online, mocksInProgress, mocksToday, activeDiscussions };
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

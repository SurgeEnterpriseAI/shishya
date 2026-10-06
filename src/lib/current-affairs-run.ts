// When the daily current-affairs cron may pay for a model call (6 Oct 2026).
//
// vercel.json runs /api/cron/daily-current-affairs three times a day:
// "0 1,9,15 * * *" = 06:30, 14:30 and 20:30 IST. Until 3 Oct (c5c4451) there
// was one slot a day, so a 06:30 run that failed left the day empty (12, 17
// and 27 Sep: paid replies that stored nothing). From 3 Oct the later slots
// existed but never called again once the day had a paid current-affairs
// ledger row ("paid-run-stored-nothing"): on 3 Oct the 06:30 run paid and
// stored nothing and the ledger has no second call that day; on 6 Oct the
// 06:30 run did the same. Now the later slots try again whenever the day has
// no rows, within one paid call per slot:
//   - the day already has rows             → never call (nothing is paid twice for a written day)
//   - paid calls for the day < slots begun → call (at most one per slot, three a day)
//   - otherwise                            → skip until the next slot
// A credit stop (empty AI balance) bills nothing and leaves no ledger row, so
// it never uses up a slot.
//
// Two runs at once (a second delivery of the same cron event, or a hand run
// while a call is in flight) are kept apart by a transaction-scoped advisory
// lock on caCallLockKey(date), held from the check through the model call,
// the ledger row and the write (src/lib/current-affairs-slot.ts): the second
// run does not wait, it answers "call-in-flight" and pays nothing.
//
// Pure: no DB, no clock (the caller passes now).

/** The IST times of the three cron slots, in minutes after IST midnight
 *  (UTC 01:00, 09:00, 15:00 — vercel.json "0 1,9,15 * * *"). */
export const CA_SLOT_IST_MINUTES = [6 * 60 + 30, 14 * 60 + 30, 20 * 60 + 30] as const;

/** Most paid calls one IST day can make: one per slot. */
export const MAX_PAID_CALLS_PER_DAY = CA_SLOT_IST_MINUTES.length;

/** A cron can fire a little early; a slot counts as begun this many minutes before its time. */
export const SLOT_EARLY_MINUTES = 5;

const IST_OFFSET_MS = 5.5 * 3600_000;

/** The IST calendar date of an instant, as YYYY-MM-DD. */
export function istDateStr(now: Date): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Minutes since IST midnight. */
function istMinutes(now: Date): number {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
}

/** How many of the day's slots have begun at `now` (0 before 06:25 IST). */
export function slotsBegun(now: Date): number {
  const m = istMinutes(now);
  return CA_SLOT_IST_MINUTES.filter((s) => m >= s - SLOT_EARLY_MINUTES).length;
}

/** Paid calls the day may have made by `now`: the slots begun, and at least
 *  one (a hand run before the 06:30 slot may make the day's first call). */
export function paidCallsAllowed(now: Date): number {
  return Math.min(MAX_PAID_CALLS_PER_DAY, Math.max(1, slotsBegun(now)));
}

/** The next slot after `now` as an ISO instant (UTC), or null after the day's last slot. */
export function nextSlotIso(now: Date): string | null {
  const m = istMinutes(now);
  const next = CA_SLOT_IST_MINUTES.find((s) => s - SLOT_EARLY_MINUTES > m);
  if (next === undefined) return null;
  const istMidnightUtcMs = Date.parse(`${istDateStr(now)}T00:00:00Z`) - IST_OFFSET_MS;
  return new Date(istMidnightUtcMs + next * 60_000).toISOString();
}

export type CaRunDecision =
  | { run: true; attempt: number }
  | { run: false; skipped: "already-written" }
  | { run: false; skipped: "slot-call-used"; paidCalls: number; allowed: number; nextSlot: string | null };

/**
 * Whether this run may make the day's next paid call.
 * rowsToday: CurrentAffair rows stored for today's IST date.
 * paidCallsToday: current-affairs AiUsage ledger rows for today's IST date.
 */
export function caRunDecision(input: { rowsToday: number; paidCallsToday: number; now: Date }): CaRunDecision {
  if (input.rowsToday > 0) return { run: false, skipped: "already-written" };
  const allowed = paidCallsAllowed(input.now);
  if (input.paidCallsToday >= allowed) {
    return { run: false, skipped: "slot-call-used", paidCalls: input.paidCallsToday, allowed, nextSlot: nextSlotIso(input.now) };
  }
  return { run: true, attempt: input.paidCallsToday + 1 };
}

/** The advisory-lock key that admits one current-affairs call at a time for an IST date. */
export function caCallLockKey(istDate: string): string {
  return `current-affairs-call:${istDate}`;
}

/** How long the locked check-call-write transaction may stay open. Above the
 *  model call's own limit (CA_MODEL_TIMEOUT_MS in src/lib/current-affairs.ts,
 *  240 s) plus the write, below the route's maxDuration (300 s). The DB ends a
 *  transaction left idle for 5 minutes (idle_in_transaction_session_timeout,
 *  read 6 Oct 2026); the longest idle stretch is the model call. */
export const CA_CALL_TX_TIMEOUT_MS = 280_000;

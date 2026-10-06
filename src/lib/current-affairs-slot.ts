// One run of the daily current-affairs cron slot, under a lock (6 Oct 2026, B2).
//
// The slot rule (src/lib/current-affairs-run.ts) counts the day's paid calls
// in the AiUsage ledger, and that row lands only once the model has answered
// (36-102 s after the 01:00 UTC slot, in the ledger since 7 Sep 2026). Two
// runs at once (Vercel can deliver one cron event twice; a hand run can start
// while the cron's call is in flight) would both read 0 paid calls and both
// pay. So the check, the model call,
// the ledger row and the write run in one interactive transaction whose first
// statement takes pg_try_advisory_xact_lock(caCallLockKey(date)):
//   - lock not free                → { kind: "in-flight" }: no call, nothing paid
//   - day written / slot used      → { kind: "skipped" }: no call
//   - otherwise                    → one call; the ledger row is awaited inside
//                                    the lock, then the rows are written through
//                                    the same transaction (all or none)
// The lock is held until the transaction ends, so the next run to take it
// sees both the ledger row and the rows. No schema change: the lock lives in
// Postgres, keyed by the date. Cost: one DB connection held open while the
// model answers (at most CA_MODEL_TIMEOUT_MS, 240 s). The database ends a
// transaction left idle for 5 minutes (idle_in_transaction_session_timeout,
// read 6 Oct 2026); a read-only probe from a workstation that day held a
// transaction idle for 150 s and then queried it without error.
//
// Used by /api/cron/daily-current-affairs and scripts/seed-current-affairs.ts.

import { generateDailyCurrentAffairs, type CurrentAffairItem } from "@/lib/current-affairs";
import { CA_CALL_TX_TIMEOUT_MS, caCallLockKey, caRunDecision, istDateStr, type CaRunDecision } from "@/lib/current-affairs-run";
import { prisma } from "@/lib/db/prisma";

export type CaSlotOutcome =
  | { kind: "in-flight"; istDate: string }
  | { kind: "skipped"; istDate: string; decision: Exclude<CaRunDecision, { run: true }> }
  | {
      kind: "written";
      istDate: string;
      attempt: number;
      items: CurrentAffairItem[];
      written: number;
      inputTokens: number;
      outputTokens: number;
    }
  | { kind: "written-by-another-run"; istDate: string; attempt: number; inputTokens: number; outputTokens: number }
  | { kind: "call-failed"; istDate: string; attempt: number; error: unknown };

/**
 * Run the slot for the IST date of `now`. Resolves with what happened; a
 * failure after the model call began is { kind: "call-failed" } (its rows, if
 * any, were rolled back). Rejects only when the lock or the check failed, in
 * which case no model call was made.
 */
export async function runCurrentAffairsSlot(now: Date): Promise<CaSlotOutcome> {
  const istDate = istDateStr(now);
  let attempt = 0; // > 0 once the model call has begun
  try {
    return await prisma.$transaction(
      async (tx): Promise<CaSlotOutcome> => {
        const [{ got }] = await tx.$queryRaw<{ got: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(hashtext(${caCallLockKey(istDate)})) AS got`;
        if (!got) return { kind: "in-flight", istDate };
        const [{ n }] = await tx.$queryRaw<{ n: number }[]>`
          SELECT COUNT(*)::int AS n FROM "CurrentAffair" WHERE date = ${istDate}::date`;
        const rowsToday = Number(n);
        const paidCallsToday =
          rowsToday === 0 ? await tx.aiUsage.count({ where: { feature: "current-affairs", ref: istDate } }) : 0;
        const decision = caRunDecision({ rowsToday, paidCallsToday, now });
        if (!decision.run) return { kind: "skipped", istDate, decision };
        attempt = decision.attempt;
        const r = await generateDailyCurrentAffairs({ istDate, tx });
        if (r.written === 0) {
          return { kind: "written-by-another-run", istDate, attempt, inputTokens: r.inputTokens, outputTokens: r.outputTokens };
        }
        return { kind: "written", istDate, attempt, ...r };
      },
      { maxWait: 10_000, timeout: CA_CALL_TX_TIMEOUT_MS },
    );
  } catch (error) {
    if (attempt > 0) return { kind: "call-failed", istDate, attempt, error };
    throw error;
  }
}

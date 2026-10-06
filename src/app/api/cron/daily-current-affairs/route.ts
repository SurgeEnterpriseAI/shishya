// GET /api/cron/daily-current-affairs — generate today's exam-relevant
// current-affairs digest (Claude + web_search) and store it under
// today's IST date. Runs each morning (see vercel.json). Auth: Bearer
// ${CRON_SECRET}.
//
// 3 Oct 2026 (fix C15): same-day catch-up. vercel.json runs this at 06:30,
// 14:30 and 20:30 IST ("0 1,9,15 * * *"). An empty AI balance ("credit")
// answers 200 { ok: false, stopped: "credit" }: nothing billed, no ledger row.
//
// 6 Oct 2026 (B2): a failed or empty run is retried by the later slots
// whenever the day has no rows. Until today a paid run that stored nothing
// made the 14:30 and 20:30 slots skip the day ("paid-run-stored-nothing").
// The run (src/lib/current-affairs-slot.ts) takes a per-date advisory lock
// first and holds it through the check, the model call, the ledger row and
// the write; the rule is src/lib/current-affairs-run.ts:
//   - another run holds the lock                      → 200 skipped "call-in-flight", no call
//   - today already has rows                          → 200 skipped "already-written", no call
//   - paid calls today (AiUsage ledger) ≥ slots begun → 200 skipped "slot-call-used", no call
//     (one paid call per slot, three a day at most; a hand re-run in the same slot pays nothing)
//   - the lock or a count fails                       → 500, no call (the next slot tries again)
//   - otherwise                                       → one paid call
// A reply with no usable digest (prose instead of JSON, or fewer than
// MIN_DIGEST_ITEMS sourced items) stores nothing and answers 500 naming the
// reason and the next slot; the day's rows are written in one transaction or
// not at all (src/lib/current-affairs.ts). Only today: a past missing day
// stays missing here (a digest written later and filed under an earlier date
// would carry the wrong day's news); past days are filled only from a
// date-scoped official source (scripts/backfill-current-affairs-pib.ts).

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { CurrentAffairsReplyError } from "@/lib/current-affairs";
import { istDateStr, nextSlotIso } from "@/lib/current-affairs-run";
import { runCurrentAffairsSlot, type CaSlotOutcome } from "@/lib/current-affairs-slot";
import { classifyTutorFailure } from "@/lib/ai/tutor-failure";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let outcome: CaSlotOutcome;
  try {
    outcome = await runCurrentAffairsSlot(now);
  } catch (err) {
    // The lock or today's check failed before any model call.
    console.error("[daily-current-affairs] today's check failed; no model call", (err as Error)?.message);
    return Response.json({ ok: false, date: istDateStr(now), error: "today's check failed" }, { status: 500 });
  }

  const date = outcome.istDate;
  switch (outcome.kind) {
    case "in-flight":
      // Another run holds today's call lock (a second delivery of the same cron event, or a hand run).
      return Response.json({ ok: false, date, skipped: "call-in-flight" });
    case "skipped": {
      const d = outcome.decision;
      if (d.skipped === "already-written") return Response.json({ ok: true, date, skipped: "already-written" });
      return Response.json({ ok: false, date, skipped: "slot-call-used", paidCalls: d.paidCalls, allowed: d.allowed, nextSlot: d.nextSlot });
    }
    case "written-by-another-run": {
      // Another writer stored the day while this one waited for the model; ours is not mixed in.
      const estCost = (outcome.inputTokens * 3 + outcome.outputTokens * 15) / 1_000_000;
      return Response.json({ ok: true, date, skipped: "written-by-another-run", attempt: outcome.attempt, estCostUsd: Number(estCost.toFixed(3)) });
    }
    case "written": {
      const estCost = (outcome.inputTokens * 3 + outcome.outputTokens * 15) / 1_000_000;
      return Response.json({ ok: true, date, items: outcome.written, attempt: outcome.attempt, estCostUsd: Number(estCost.toFixed(3)) });
    }
    case "call-failed": {
      const err = outcome.error;
      if (classifyTutorFailure(err) === "credit") {
        // The AI balance is empty: nothing was paid and nothing written. The next slot tries again.
        console.warn("[daily-current-affairs] stopped: AI credit", (err as Error)?.message);
        return Response.json({ ok: false, date, stopped: "credit" });
      }
      const nextSlot = nextSlotIso(now);
      if (err instanceof CurrentAffairsReplyError) {
        // Paid, nothing stored (the reason is logged by the writer). The next slot tries again.
        console.error("[daily-current-affairs] no usable digest; nothing stored", JSON.stringify({ reason: err.reason, attempt: outcome.attempt, nextSlot }));
        return Response.json(
          { ok: false, date, error: `no usable digest: ${err.reason}`, attempt: outcome.attempt, nextSlot },
          { status: 500 },
        );
      }
      console.error("[daily-current-affairs] generation failed", (err as Error)?.message);
      return Response.json({ ok: false, date, error: (err as Error)?.message, attempt: outcome.attempt, nextSlot }, { status: 500 });
    }
  }
}

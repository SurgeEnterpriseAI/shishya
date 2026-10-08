// Reserve credit pool (7 Oct 2026, build B4): a student is never left
// without the tutor because the shared balance ran dry.
//
// Why: one Anthropic organization's prepaid balance pays for students,
// crons and bulk scripts alike, and it hit zero 19 times in 19 days. Keys
// and workspaces inside one organization share that one balance (learned
// 26 Sep), so the reserve is a key from a SEPARATE organization with its own
// prepaid credit: ANTHROPIC_RESERVE_API_KEY. Unset (today), nothing here
// does anything and every call behaves exactly as before.
//
// The rule, for one model call:
//   1. the call goes to the main key, as always;
//   2. it failed with an empty balance or a spend limit — classifyTutorFailure
//      (src/lib/ai/tutor-failure.ts) says "credit"; an overload, a rate limit,
//      a 5xx, a timeout or a bad request is NOT retried here;
//   3. a person is waiting for this answer: the call's ledger feature is in
//      RESERVE_FEATURES (tutor chat, Explain, translation, mocks, Ask, the
//      essay check), we are inside the deployed app (a tsx script never
//      is — bulk scripts that reuse a student code path, like
//      scripts/prewarm-translations.ts, stay off the reserve even when the
//      key is in .env.local), and no withoutReserve() scope is around it;
//   4. then the SAME request is sent once on the reserve key.
// Served by the reserve: the student sees the same answer, and the AiUsage
// row's feature carries RESERVE_SUFFIX ("tutor:reserve", "explain:reserve"),
// so /admin/ai-spend lists reserve spend on its own lines. The background
// spend guard (src/lib/ai/spend-guard.ts) does not read such a row as "the
// main balance is back", because it is not.
// Both failed: the MAIN key's error is thrown, so every route's honest
// "AI unavailable — saved for later" copy and its analytics row are as
// before (the reserve's own failure is logged here).
//
// Background work never reaches the reserve, enforced three ways: the
// allowlist is closed (a cron label is not on it — spend-guard's job names,
// the late-answer run's "tutor-late*" labels); the teacher-request-sla cron
// shares Ask's label, so runAsk uses the reserve only when the /api/ask route
// opts in; and the late-answer run, whose tutor tools can build a warm-up
// mock under the student "mock-adaptive" label, runs inside withoutReserve().
// This file is the only reader of ANTHROPIC_RESERVE_API_KEY (a test checks).
//
// Setup for the founder: scratchpad inbox-fix/B4-reserve-key/founder-setup.md.
// Tests: tests/unit/ai-reserve.test.ts

import { AsyncLocalStorage } from "node:async_hooks";
import Anthropic from "@anthropic-ai/sdk";
import { classifyTutorFailure } from "@/lib/ai/tutor-failure";

/** Appended to the ledger feature of a call the reserve paid for. */
export const RESERVE_SUFFIX = ":reserve";

/**
 * The ledger features whose failed call may be retried on the reserve: each
 * is written only while a person waits for the answer on screen.
 * Not here on purpose: every cron and bulk label; "tutor-late*" (the hourly
 * late-answer run); "fresh-questions" (fresh sets have no model call since
 * 24de810); "coach-day" and "question-adjudicate" (shared with a cron);
 * "student-360" (the mentor desk, not a student).
 */
export const RESERVE_FEATURES: ReadonlySet<string> = new Set([
  "tutor", // signed-in chat turn (src/lib/ai/tutor.ts)
  "tutor-school", // Class 8-12 chat turn
  "tutor-anon", // guest chat turn
  "tutor-wrap", // the forced last call of a chat turn that ran out of tool rounds
  "explain", // Explain on a result
  "translate", // a mock or result in the student's language
  "mock-adaptive", // the AI pick of a mock's questions
  "mock-user-request", // a mock described in the student's own words
  "ask", // Ask Shishya — only when the route passes runAsk({ reserve: true })
  "descriptive-eval", // the essay / descriptive answer check
]);

/** The ledger feature of a call: the reserve's own label when the reserve served it. */
export function ledgerFeature(feature: string, servedByReserve: boolean): string {
  return servedByReserve ? `${feature}${RESERVE_SUFFIX}` : feature;
}

// ── Where the reserve is off ─────────────────────────────────────────

const offScope = new AsyncLocalStorage<true>();

/**
 * Run `fn` with the reserve off for every model call inside it, however deep
 * (tool calls included). For background work that reuses a student code path.
 */
export function withoutReserve<T>(fn: () => T): T {
  return offScope.run(true, fn);
}

/**
 * True inside the deployed app. `next build` writes NEXT_RUNTIME into the
 * server bundle ("nodejs"), so this must stay the literal expression
 * process.env.NEXT_RUNTIME; a tsx script (or vitest) has none.
 */
function inAppServer(): boolean {
  const runtime = process.env.NEXT_RUNTIME;
  return runtime === "nodejs" || runtime === "edge";
}

let cached: { key: string; client: Anthropic } | null = null;
let warnedSameKey = false;

/** The reserve client, or null when no separate reserve key is set. */
export function reserveClient(): Anthropic | null {
  const key = (process.env.ANTHROPIC_RESERVE_API_KEY ?? "").trim();
  if (!key) return null;
  // The main key again would draw on the same empty balance.
  if (key === (process.env.ANTHROPIC_API_KEY ?? "").trim()) {
    if (!warnedSameKey) console.warn("[ai-reserve] ANTHROPIC_RESERVE_API_KEY is the main key; the reserve stays off.");
    warnedSameKey = true;
    return null;
  }
  if (cached?.key !== key) cached = { key, client: new Anthropic({ apiKey: key }) };
  return cached.client;
}

/** The reserve client this call may fall back to, or null (see the rule above, step 3). */
export function reserveFor(feature: string | null | undefined): Anthropic | null {
  if (!feature || !RESERVE_FEATURES.has(feature)) return null;
  if (offScope.getStore()) return null;
  if (!inAppServer()) return null;
  return reserveClient();
}

// ── The call ─────────────────────────────────────────────────────────

/**
 * Run one model request on the main client and, when it failed for an empty
 * balance and `feature` may use the reserve, once more on the reserve client.
 * `run` sends the request on the client it is given; send the same request
 * both times. `reserve` says which client answered, for the ledger label.
 * Pass feature null for a call that must stay on the main key.
 */
export async function withReserve<T>(
  feature: string | null | undefined,
  primary: Anthropic,
  run: (client: Anthropic) => Promise<T>,
): Promise<{ value: T; reserve: boolean }> {
  try {
    return { value: await run(primary), reserve: false };
  } catch (err) {
    if (classifyTutorFailure(err) !== "credit") throw err;
    const reserve = reserveFor(feature);
    if (!reserve) throw err;
    try {
      const value = await run(reserve);
      console.warn(`[ai-reserve] ${feature}: the main balance is empty; served from the reserve.`);
      return { value, reserve: true };
    } catch (reserveErr) {
      // A person who left (Stop, a closed tab) is not an outage.
      if (reserveErr instanceof Anthropic.APIUserAbortError) throw reserveErr;
      console.error(
        `[ai-reserve] ${feature}: the reserve failed too (${classifyTutorFailure(reserveErr)}):`,
        String((reserveErr as Error)?.message ?? reserveErr).slice(0, 200),
      );
      throw err;
    }
  }
}

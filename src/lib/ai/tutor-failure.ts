// Why a tutor call failed, from the SDK's own error (1 Oct 2026).
//
// The chat's honest "our AI tutor is unavailable — your question is saved"
// copy and the late-answer run (src/lib/tutor-late-answer.ts) both need one
// answer to "was the AI unavailable, or was it us?". Before this the route
// matched the raw message text only ("credit balance", "overloaded", "429").
// Now the SDK's status and error type decide, the same way the bulk runners
// read an empty balance (src/lib/ai/batch.ts classifyProbeError: a 400
// invalid_request_error whose message says "credit balance is too low … Plans
// & Billing", or its typed form billing_error):
//   credit      — empty balance / billing (402, billing_error, the 400 text),
//                 and (1 Oct 2026 review) the org / workspace spend limit: a
//                 400 "You have reached your specified API usage limits. You
//                 will regain access on …" — the AI is unavailable to us
//                 until then, exactly like an empty balance
//   auth        — 401 / 403, authentication_error / permission_error (our key)
//   overloaded  — 529 / overloaded_error
//   rate-limit  — 429 / rate_limit_error
//   server      — any 5xx / api_error
//   timeout     — the SDK's connection timeout
//   network     — the SDK could not reach the API
//   other       — anything else (a 400 about this request, a DB error, a bug):
//                 NOT an outage, so no promise of a late answer is made.
// The student never sees any of this text; the route logs the error itself.
// Tests: tests/unit/tutor-late-answer.test.ts

import Anthropic from "@anthropic-ai/sdk";
import type { TutorFailReason } from "@/lib/tutor-unavailable";

export { isAiUnavailable, type TutorFailReason } from "@/lib/tutor-unavailable";

// The bulk runners' classifyProbeError (src/lib/ai/batch.ts) keeps its own
// narrower pattern on purpose (1 Oct 2026): it already stops on a spend-limit
// 400 (kind "error", the API's own words in the message), and its "billing"
// kind prints "the shared balance is empty; add credit first", which a spend
// limit is not.
export const BILLING_RE = /credit balance|billing|purchase credits|usage limits?|spend(ing)? limit|regain access/i;

export function classifyTutorFailure(err: unknown): TutorFailReason {
  if (err instanceof Anthropic.APIConnectionTimeoutError) return "timeout";
  if (err instanceof Anthropic.APIConnectionError) return "network";
  const e = err as { status?: unknown; error?: { error?: { type?: unknown; message?: unknown }; type?: unknown }; message?: unknown } | null;
  const status = typeof e?.status === "number" ? e.status : null;
  const type =
    typeof e?.error?.error?.type === "string" ? e.error.error.type : typeof e?.error?.type === "string" ? (e.error.type as string) : "";
  const message = typeof e?.error?.error?.message === "string" ? e.error.error.message : String(e?.message ?? err ?? "");
  const apiShaped = err instanceof Anthropic.APIError || status != null || type !== "";
  // The empty-balance text only ever comes from the API, so it counts whatever wraps it.
  if (type === "billing_error" || status === 402 || BILLING_RE.test(`${type} ${message}`)) return "credit";
  if (!apiShaped) return "other";
  if (status === 401 || status === 403 || type === "authentication_error" || type === "permission_error") return "auth";
  if (status === 529 || type === "overloaded_error") return "overloaded";
  if (status === 429 || type === "rate_limit_error") return "rate-limit";
  if ((status != null && status >= 500) || type === "api_error") return "server";
  return "other";
}

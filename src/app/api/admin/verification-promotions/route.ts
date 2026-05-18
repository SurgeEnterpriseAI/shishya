// POST /api/admin/verification-promotions
//
// Admin-only. Records a Trusted Verifier promotion decision:
//   PROMOTE — set User.badgeLevel = TRUSTED_VERIFIER, stamp badgeEarnedAt
//   DENY    — log the decision; user stays at current badge level
//   DEFER   — log; user remains in queue, admin notes what additional
//             signal they want to see before re-reviewing
//
// DENY and DEFER are currently log-only (console.info) — full audit
// trail lands in Phase 1.4 with the notifications system.

import { z } from "zod";
import { bad, ok, parseBody, serverError } from "@/lib/http";
import { requireAdmin } from "@/lib/admin";
import { applyPromotionDecision, computeEligibility } from "@/lib/db/verification-promotions";

export const runtime = "nodejs";

const Body = z.object({
  userId: z.string().min(1),
  kind: z.enum(["PROMOTE", "DENY", "DEFER"]),
  reason: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const { userId: adminUserId } = await requireAdmin();
    const body = await parseBody(req, Body);

    if (body.kind !== "PROMOTE" && !body.reason) {
      return bad("reason required for DENY and DEFER");
    }

    // Belt-and-braces: re-verify eligibility server-side at decision time.
    // The candidate list on the page was computed at page-load, the
    // admin may have stared at it for an hour. Re-check now.
    if (body.kind === "PROMOTE") {
      const all = await computeEligibility();
      const candidate = all.find((r) => r.userId === body.userId);
      if (!candidate) return bad("User no longer in eligibility pool", 409);
      if (candidate.gate !== "OK") {
        return bad(`User no longer eligible: ${candidate.gate}`, 409);
      }
    }

    await applyPromotionDecision({
      userId: body.userId,
      adminUserId,
      decision: body.kind === "PROMOTE"
        ? { kind: "PROMOTE" }
        : body.kind === "DENY"
        ? { kind: "DENY", reason: body.reason! }
        : { kind: "DEFER", reason: body.reason! },
    });

    return ok({ ok: true });
  } catch (err: any) {
    if (err?.status === 403) return new Response("forbidden", { status: 403 });
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

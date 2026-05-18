// POST /api/admin/verification-audits
//
// Admin-only. Records an audit decision on a community verification:
//   APPROVED  — the verifier was right; source matches the displayed claim
//   REJECTED  — the verifier was wrong; source does NOT match (this gets
//               counted as a "validated false claim" against the verifier
//               and gates their Trusted Verifier promotion)
//   CORRECTED — the source moved/changed; the verifier was right at the
//               time but the fact now needs updating. Doesn't penalise
//               the verifier.

import { z } from "zod";
import { bad, ok, parseBody, serverError } from "@/lib/http";
import { requireAdmin } from "@/lib/admin";
import { recordAudit } from "@/lib/db/verification-promotions";

export const runtime = "nodejs";

const Body = z.object({
  verificationId: z.string().min(1),
  factId: z.string().min(1),
  auditResult: z.enum(["APPROVED", "REJECTED", "CORRECTED"]),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const { userId: adminUserId } = await requireAdmin();
    const body = await parseBody(req, Body);

    // REJECTED and CORRECTED must include notes — they're consequential
    // outcomes (one penalises the verifier, the other queues a content
    // correction) and the audit log needs to say WHY.
    if (body.auditResult !== "APPROVED" && !body.notes) {
      return bad("notes required for REJECTED and CORRECTED outcomes");
    }

    await recordAudit({
      verificationId: body.verificationId,
      factId: body.factId,
      adminUserId,
      auditResult: body.auditResult,
      notes: body.notes,
    });

    return ok({ ok: true });
  } catch (err: any) {
    if (err?.status === 403) return new Response("forbidden", { status: 403 });
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

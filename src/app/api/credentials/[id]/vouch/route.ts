// POST /api/credentials/[id]/vouch
//
// Auth required. Only verified Domain Experts in the same credential
// domain can vouch (enforced inside addVouch()). If this is the 3rd
// distinct vouch, the credential auto-promotes to VERIFIED and the
// owner's badge moves to DOMAIN_EXPERT.

import { z } from "zod";
import { auth } from "@/lib/auth";
import { bad, ok, parseBody, serverError, unauth } from "@/lib/http";
import { addVouch } from "@/lib/db/credentials";

export const runtime = "nodejs";

const Body = z.object({
  comment: z.string().max(500).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();
    const { id } = await params;
    const body = await parseBody(req, Body);

    const result = await addVouch({
      credentialId: id,
      voucherUserId: session.user.id,
      comment: body.comment,
    });

    return ok(result);
  } catch (err: any) {
    if (err?.message === "Credential not found") return bad("Credential not found", 404);
    if (err?.message === "Credential is not pending — vouches not accepted") return bad(err.message, 409);
    if (err?.message === "Cannot vouch for yourself") return bad(err.message, 400);
    if (err?.message === "Voucher must hold a verified credential in the same domain") {
      return bad(err.message, 403);
    }
    if (err?.code === "P2002") return bad("You've already vouched for this claim", 409);
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

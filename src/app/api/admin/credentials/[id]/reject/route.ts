// POST /api/admin/credentials/[id]/reject — admin rejects a pending claim.

import { z } from "zod";
import { bad, ok, parseBody, serverError } from "@/lib/http";
import { requireAdmin } from "@/lib/admin";
import { rejectCredential } from "@/lib/db/credentials";

export const runtime = "nodejs";

const Body = z.object({
  reason: z.string().min(10).max(500),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId: adminUserId } = await requireAdmin();
    const { id } = await params;
    const body = await parseBody(req, Body);
    await rejectCredential({
      credentialId: id,
      adminUserId,
      reason: body.reason,
    });
    return ok({ ok: true });
  } catch (err: any) {
    if (err?.status === 403) return new Response("forbidden", { status: 403 });
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

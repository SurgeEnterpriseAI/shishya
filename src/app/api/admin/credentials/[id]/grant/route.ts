// POST /api/admin/credentials/[id]/grant — admin manually approves a
// credential. Promotes the user to DOMAIN_EXPERT if they aren't already.

import { ok, serverError } from "@/lib/http";
import { requireAdmin } from "@/lib/admin";
import { markCredentialVerified } from "@/lib/db/credentials";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId: adminUserId } = await requireAdmin();
    const { id } = await params;

    const rows = await prisma.$queryRaw<Array<{ userId: string; status: string }>>`
      SELECT "userId", "status"::text AS status
      FROM "UserCredential" WHERE "id" = ${id} LIMIT 1
    `;
    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "Credential not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }
    if (rows[0].status !== "PENDING") {
      return new Response(JSON.stringify({ error: `Credential is ${rows[0].status}, not PENDING` }), {
        status: 409,
        headers: { "content-type": "application/json" },
      });
    }
    await markCredentialVerified({
      credentialId: id,
      userId: rows[0].userId,
      via: "ADMIN_GRANT",
      approvedBy: adminUserId,
    });
    return ok({ ok: true });
  } catch (err: any) {
    if (err?.status === 403) return new Response("forbidden", { status: 403 });
    return serverError(err);
  }
}

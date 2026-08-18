// PATCH /api/admin/feedback/[id] — admin updates status + optional note.
// Used by the /admin/feedback triage table to mark requests as
// UNDER_REVIEW / PLANNED / SHIPPED / DECLINED and leave a short note.

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { bad, forbidden, ok, parseBody, serverError } from "@/lib/http";
import { requireAdmin } from "@/lib/admin";
import { createNotification } from "@/lib/db/notifications";

export const dynamic = "force-dynamic";

const Body = z.object({
  status: z.enum(["OPEN", "UNDER_REVIEW", "PLANNED", "SHIPPED", "DECLINED"]).optional(),
  adminNote: z.string().max(2000).nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await parseBody(req, Body);
    if (!body.status && body.adminNote === undefined) {
      return bad("nothing to update");
    }
    const updated = await prisma.featureRequest.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.adminNote !== undefined ? { adminNote: body.adminNote } : {}),
      },
      select: { id: true, status: true, adminNote: true, title: true, authorId: true },
    });

    // Tell the author when their idea ships — the loop was silent on both
    // sides before (audit 18 Aug 2026). Only on the outcome states, and
    // only if a signed-in author is attached.
    if (updated.authorId && (body.status === "SHIPPED" || body.status === "PLANNED")) {
      await createNotification({
        userId: updated.authorId,
        type: "SUGGESTION_ACCEPTED",
        title: body.status === "SHIPPED" ? "Your idea just shipped 🚀" : "We're building your idea",
        body:
          (body.status === "SHIPPED"
            ? "The feature you suggested is now live on Shishya: "
            : "The feature you suggested is now planned: ") + updated.title,
        link: "/ideas",
        dedupKey: `feature:${updated.id}:${body.status}`,
      }).catch(() => {});
    }
    return ok({ request: updated });
  } catch (err: any) {
    if (err?.status === 403) return forbidden();
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

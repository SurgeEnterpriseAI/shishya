// PATCH /api/admin/feature-requests/[id] — the admin marks a request's
// status (13 Sep 2026: close the /ideas loop).
//
// Body: { status?, shipNote?, shipLink?, depthChecked?, privateNote? }
//   * SHIPPED requires a one-line "what we built" note, a shishya.in deep
//     link and depthChecked: true — the system never decides something is
//     built; the admin does, after using it.
//   * On SHIPPED: one in-app notice + at most one plain mail to the author
//     and to people who upvoted before the ship moment. Idempotent — a
//     re-mark never tells anyone twice (see src/lib/feature-requests-ship.ts).
//   * Other statuses only store status + private note.
// All rules live in src/lib/feature-requests.ts (pure, unit-tested).

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { isCurrentUserAdmin } from "@/lib/admin";
import { bad, forbidden, notFound, ok, parseBody, serverError } from "@/lib/http";
import { parseAdminNote, planStatusChange } from "@/lib/feature-requests";
import { deliverShipNotice } from "@/lib/feature-requests-ship";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const Body = z.object({
  status: z.string().max(32).optional(),
  shipNote: z.string().max(600).optional(),
  shipLink: z.string().max(600).optional(),
  depthChecked: z.boolean().optional(),
  privateNote: z.string().max(4000).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) return forbidden();
  try {
    const { id } = await params;
    const body = await parseBody(req, Body);

    const current = await prisma.featureRequest.findUnique({
      where: { id },
      select: { id: true, title: true, body: true, status: true, adminNote: true, authorId: true, createdAt: true },
    });
    if (!current) return notFound("request");

    const plan = planStatusChange({ status: current.status, adminNote: current.adminNote }, body, new Date());
    if (!plan.ok) return bad(plan.error);

    const updated = await prisma.featureRequest.update({
      where: { id },
      data: { status: plan.status, adminNote: plan.adminNote },
      select: { id: true, status: true, adminNote: true },
    });

    const delivery = plan.notify && plan.ship ? await deliverShipNotice(current, plan.ship) : null;

    const parsed = parseAdminNote(updated.adminNote);
    return ok({
      request: { id: updated.id, status: updated.status, ship: parsed.ship, privateNote: parsed.privateNote },
      enteredShipped: plan.enteredShipped,
      delivery,
    });
  } catch (err: any) {
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

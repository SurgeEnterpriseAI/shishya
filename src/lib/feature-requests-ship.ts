// Feature requests — the I/O half of "tell the student who asked" (13 Sep 2026).
//
// Called ONLY from the admin status route after the admin marked a
// request SHIPPED with a note + link + depth check. Every decision (who,
// what copy, which dedup key, who is skipped) is a pure function in
// src/lib/feature-requests.ts; this file just reads the rows and writes.
//
// Idempotent by construction:
//   * in-app: Notification is unique on (userId, dedupKey) and the key is
//     one per request, so a re-mark inserts nothing new;
//   * email: sendEmail logs `sent:<tag>` in EmailTouch for every delivered
//     marketing-classed send; users with that row are skipped here, so a
//     re-mark only retries people whose mail did not go out.
// Opt-out is enforced inside sendEmail (unsubUserId). No LLM calls.

import { prisma } from "@/lib/db/prisma";
import { createNotification } from "@/lib/db/notifications";
import { sendEmail } from "@/lib/email";
import {
  planShipEmails,
  planShipNotifications,
  renderShipEmail,
  shipEmailTag,
  shipRecipients,
  type ShipRecord,
} from "@/lib/feature-requests";

/** Mails per mark. Anyone past the cap is picked up by a re-mark. */
export const SHIP_EMAIL_CAP = 300;

export interface ShipDeliveryReport {
  asked: number;
  upvoted: number;
  /** In-app notices attempted; the database drops repeats silently. */
  notified: number;
  emailed: number;
  emailFailedOrOptedOut: number;
  emailSkippedAlreadySent: number;
  emailSkippedNoAddress: number;
  emailSkippedOverCap: number;
  /**
   * Recipients NOT emailed because the EmailTouch guard could not be read
   * (so we could not tell who was already mailed). Nobody in this count was
   * emailed — a re-save retries them. Never folded into "already sent".
   */
  emailGuardUnavailable: number;
}

export async function deliverShipNotice(
  request: { id: string; title: string; body: string; authorId: string | null; createdAt: Date },
  ship: ShipRecord,
): Promise<ShipDeliveryReport> {
  const report: ShipDeliveryReport = {
    asked: 0,
    upvoted: 0,
    notified: 0,
    emailed: 0,
    emailFailedOrOptedOut: 0,
    emailSkippedAlreadySent: 0,
    emailSkippedNoAddress: 0,
    emailSkippedOverCap: 0,
    emailGuardUnavailable: 0,
  };

  const upvotes = await prisma.featureRequestUpvote.findMany({
    where: { requestId: request.id },
    select: { userId: true, createdAt: true },
  });
  const recipients = shipRecipients({ authorId: request.authorId, upvotes, shippedAt: ship.shippedAt });
  if (recipients.length === 0) return report;
  report.asked = recipients.filter((r) => r.role === "asked").length;
  report.upvoted = recipients.filter((r) => r.role === "upvoted").length;

  for (const n of planShipNotifications(request, ship, recipients)) {
    await createNotification(n); // never throws; ON CONFLICT DO NOTHING
    report.notified++;
  }

  const ids = recipients.map((r) => r.userId);
  const tag = shipEmailTag(request.id);
  const [users, touched] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true } }),
    prisma.$queryRaw<{ userId: string }[]>`
      SELECT DISTINCT "userId" FROM "EmailTouch"
      WHERE tag = ${"sent:" + tag} AND "userId" = ANY(${ids})`.catch(() => null),
  ]);
  if (touched === null) {
    // Cannot prove who was already mailed — send nothing rather than risk
    // a second mail. The in-app notices above already landed. Reported as
    // its own count so the admin is never told these people were mailed.
    report.emailGuardUnavailable = recipients.length;
    return report;
  }
  const emailById = new Map(users.map((u) => [u.id, u.email]));
  const plan = planShipEmails(
    recipients.map((r) => ({ ...r, email: emailById.get(r.userId) ?? null })),
    new Set(touched.map((t) => t.userId)),
    SHIP_EMAIL_CAP,
  );
  report.emailSkippedAlreadySent = plan.skippedAlreadySent;
  report.emailSkippedNoAddress = plan.skippedNoAddress;
  report.emailSkippedOverCap = plan.skippedOverCap;

  for (const c of plan.send) {
    const mail = renderShipEmail({
      role: c.role,
      requestTitle: request.title,
      askedText: request.body,
      askedAt: request.createdAt,
      ship,
    });
    const sent = await sendEmail({
      to: c.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      tag,
      unsubUserId: c.userId,
    }).catch(() => false);
    if (sent) report.emailed++;
    else report.emailFailedOrOptedOut++;
  }
  return report;
}

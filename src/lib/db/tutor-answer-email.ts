// Who may get "Your question is answered" (1 Oct 2026) — ONE rule, read by
// POST /api/chat (whether its "our AI tutor is unavailable" line may say
// "and email you") and by the late-answer run (whom it mails). Rules and why:
// src/lib/tutor-late-answer.ts, src/lib/tutor-unavailable.ts.
//
// The same audience as the existing student mails:
//   • an address on the account, and not unsubscribed (User.emailOptOut —
//     read in raw SQL, as src/lib/email-optout.ts explains; sendEmail checks
//     it again at send time, fail-closed);
//   • NOT a school-only account (src/lib/db/enrollment.ts schoolOnlyAccountSql
//     — the marker the day-3 nudge and every exam audience use to keep
//     Class 8-12 accounts, most likely 13-17, out of the mail loops);
//   • at most ONE such mail per student in 24 hours: the run reserves it with
//     an EmailTouch guard row (tag 'tutor-answered') under a per-student
//     transaction lock before it sends, and drops the row when the send
//     fails; the chat's promise reads the same row, so it never promises a
//     mail the cap would hold back.
// A school chat never promises a mail (the caller passes no userId for it).

import { randomUUID } from "node:crypto";
import { prisma } from "./prisma";
import { schoolOnlyAccountSql } from "./enrollment";
import { ANSWERED_EMAIL_TAG, type LateEmailTarget } from "@/lib/tutor-late-answer";

/** True when a late answer to this member's question would be mailed now. Fails closed (false). */
export async function tutorAnswerEmailable(userId: string): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT u.id FROM "User" u
      WHERE u.id = ${userId}
        AND u.email IS NOT NULL AND u.email <> '' AND u."emailOptOut" = FALSE
        AND NOT ${schoolOnlyAccountSql("u")}
        AND NOT EXISTS (
          SELECT 1 FROM "EmailTouch" t
          WHERE t."userId" = u.id AND t.tag = ${ANSWERED_EMAIL_TAG}
            AND t."sentAt" > NOW() - INTERVAL '24 hours'
        )
      LIMIT 1`;
    return rows.length === 1;
  } catch (err) {
    console.error("[tutor-answer-email] eligibility read failed:", err);
    return false;
  }
}

/** Of these students, the ones the mail may reach (the account rules; the 24-hour cap is reserveAnsweredEmail's). */
export async function answeredEmailTargets(userIds: readonly string[]): Promise<LateEmailTarget[]> {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return [];
  const rows = await prisma.$queryRaw<Array<{ id: string; email: string; name: string | null }>>`
    SELECT u.id, u.email, u.name FROM "User" u
    WHERE u.id = ANY(${ids})
      AND u.email IS NOT NULL AND u.email <> '' AND u."emailOptOut" = FALSE
      AND NOT ${schoolOnlyAccountSql("u")}`;
  return rows.map((r) => ({ userId: r.id, to: r.email, name: r.name }));
}

/**
 * Reserve today's one mail for this student: under a per-student
 * transaction lock, null when a 'tutor-answered' row exists in the last 24
 * hours, else a new guard row's id. Two runs at once cannot both reserve.
 */
export async function reserveAnsweredEmail(userId: string): Promise<string | null> {
  return prisma.$transaction(async (tx) => {
    // The lock's own value is void; only the outer 1 is read back.
    await tx.$queryRaw`SELECT 1 AS ok FROM (SELECT pg_advisory_xact_lock(hashtext(${`${ANSWERED_EMAIL_TAG}:${userId}`}))) AS l`;
    const recent = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "EmailTouch"
      WHERE "userId" = ${userId} AND tag = ${ANSWERED_EMAIL_TAG} AND "sentAt" > NOW() - INTERVAL '24 hours'
      LIMIT 1`;
    if (recent.length > 0) return null;
    const id = randomUUID();
    await tx.$executeRaw`INSERT INTO "EmailTouch" (id, "userId", tag) VALUES (${id}, ${userId}, ${ANSWERED_EMAIL_TAG})`;
    return id;
  });
}

/** Drop a reservation whose mail was not sent. */
export async function unreserveAnsweredEmail(guardId: string): Promise<void> {
  await prisma.$executeRaw`DELETE FROM "EmailTouch" WHERE id = ${guardId} AND tag = ${ANSWERED_EMAIL_TAG}`;
}

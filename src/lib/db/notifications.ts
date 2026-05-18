// Notification helpers — kept as raw SQL so the file works even when
// the typed Prisma client is stale (Windows file-lock workaround).
//
// Two surfaces use these:
//   * Application flows that trigger notifications (verification audit,
//     credential vouch, badge promotion).
//   * The /me/notifications page + bell dropdown that reads them.

import { prisma } from "@/lib/db/prisma";

export type NotificationType =
  | "VERIFICATION_APPROVED"
  | "VERIFICATION_REJECTED"
  | "VERIFICATION_CORRECTED"
  | "CREDENTIAL_VOUCHED"
  | "CREDENTIAL_VERIFIED"
  | "CREDENTIAL_REJECTED"
  | "BADGE_PROMOTED"
  | "FLAG_VALIDATED"
  | "SUGGESTION_ACCEPTED"
  | "ADMIN_MESSAGE";

export interface NotificationRow {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  dedupKey: string | null;
  readAt: Date | null;
  emailedAt: Date | null;
  createdAt: Date;
}

interface CreateInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  /** Stable string to prevent duplicate notifications for the same event. */
  dedupKey?: string;
}

/**
 * Insert a notification. Idempotent if dedupKey is provided — the
 * (userId, dedupKey) unique constraint quietly drops duplicates.
 *
 * Never throws on dedup collision; logs and swallows on other DB errors
 * so that a notification failure doesn't roll back the user-facing
 * action that triggered it.
 */
export async function createNotification(input: CreateInput): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO "Notification" ("id", "userId", "type", "title", "body", "link", "dedupKey", "createdAt")
      VALUES (
        ${"ntf_" + cuid()},
        ${input.userId},
        ${input.type}::"NotificationType",
        ${input.title},
        ${input.body ?? null},
        ${input.link ?? null},
        ${input.dedupKey ?? null},
        NOW()
      )
      ON CONFLICT ("userId", "dedupKey") DO NOTHING
    `;
  } catch (err) {
    console.error("[notifications] insert failed (non-fatal):", err);
  }
}

export async function listNotifications(userId: string, limit = 50): Promise<NotificationRow[]> {
  return prisma.$queryRaw<NotificationRow[]>`
    SELECT "id", "userId", "type"::text AS "type", "title", "body",
           "link", "dedupKey", "readAt", "emailedAt", "createdAt"
    FROM "Notification"
    WHERE "userId" = ${userId}
    ORDER BY "createdAt" DESC
    LIMIT ${limit}
  `;
}

export async function unreadCount(userId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS count
    FROM "Notification"
    WHERE "userId" = ${userId} AND "readAt" IS NULL
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "Notification"
    SET "readAt" = NOW()
    WHERE "userId" = ${userId} AND "readAt" IS NULL
  `;
}

export async function markRead(userId: string, notificationId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "Notification"
    SET "readAt" = NOW()
    WHERE "id" = ${notificationId} AND "userId" = ${userId} AND "readAt" IS NULL
  `;
}

// Tiny cuid-ish generator — Prisma normally provides @default(cuid())
// but raw INSERT bypasses that. Doesn't need crypto-grade uniqueness;
// only needs to be unique across this row's lifetime.
function cuid(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6)
  );
}

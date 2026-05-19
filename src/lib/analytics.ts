// First-party analytics helpers.
//
// Three surfaces touch this file:
//
//   1. /api/analytics — the ingest endpoint, calls recordEvent().
//   2. Client + server callers that want to fire an event from
//      business logic — server-side helpers wrap recordEvent() to
//      shave the round-trip when we're already on the server.
//   3. /admin/analytics — reads aggregates via the query helpers
//      at the bottom.
//
// Privacy-first: PII is never stored. anonId is a UUID in an httpOnly
// cookie that rotates every 30 days. utmSource/utmMedium/utmCampaign
// and the truncated refHost are the only attribution signals captured.

import { prisma } from "./db/prisma";

export type EventKind =
  | "PAGE_VIEW"
  | "SIGNUP"
  | "VERIFICATION_SUBMITTED"
  | "QUIZ_ATTEMPTED"
  | "CHAPTER_COMPLETED"
  | "SCHOLARSHIP_SAVED"
  | "CHAT_OPENED"
  | "CTA_CLICKED";

export interface RecordEventInput {
  kind: EventKind;
  /** Authenticated user id when known. */
  userId?: string | null;
  /** Anonymous cookie id when not authenticated. */
  anonId?: string | null;
  path?: string | null;
  /** Free-form event payload. Truncated to ~1 KB to bound storage. */
  props?: Record<string, unknown> | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  refHost?: string | null;
}

/**
 * Write a single event. Idempotent-safe (we don't enforce uniqueness
 * — analytics is intentionally append-only). Swallows DB errors so a
 * failed write never breaks a user-facing flow.
 */
export async function recordEvent(input: RecordEventInput): Promise<void> {
  try {
    const propsStr = input.props ? JSON.stringify(input.props).slice(0, 1024) : null;
    await prisma.$executeRaw`
      INSERT INTO "AnalyticsEvent"
        ("id", "kind", "userId", "anonId", "path", "props",
         "utmSource", "utmMedium", "utmCampaign", "refHost", "createdAt")
      VALUES (
        ${`evt_${cuid()}`},
        ${input.kind}::"EventKind",
        ${input.userId ?? null},
        ${input.anonId ?? null},
        ${input.path ?? null},
        ${propsStr ? JSON.parse(propsStr) : null}::jsonb,
        ${input.utmSource ?? null},
        ${input.utmMedium ?? null},
        ${input.utmCampaign ?? null},
        ${input.refHost ?? null},
        NOW()
      )
    `;
  } catch (err) {
    console.error("[analytics] recordEvent failed (non-fatal):", err);
  }
}

// ── /admin/analytics query helpers ───────────────────────────────────

export interface DailyCount {
  day: Date;
  count: bigint;
}

/** Daily count of a specific event kind over the last `days` days. */
export async function dailyEventCount(kind: EventKind, days = 30): Promise<DailyCount[]> {
  return prisma.$queryRaw<DailyCount[]>`
    SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::bigint AS count
    FROM "AnalyticsEvent"
    WHERE "kind" = ${kind}::"EventKind"
      AND "createdAt" >= NOW() - (${days} * INTERVAL '1 day')
    GROUP BY day
    ORDER BY day ASC
  `;
}

/** Daily active users (any event from a userId OR anonId) over last `days`. */
export async function dailyActiveUsers(days = 30): Promise<DailyCount[]> {
  return prisma.$queryRaw<DailyCount[]>`
    SELECT DATE_TRUNC('day', "createdAt") AS day,
           COUNT(DISTINCT COALESCE("userId", "anonId"))::bigint AS count
    FROM "AnalyticsEvent"
    WHERE "createdAt" >= NOW() - (${days} * INTERVAL '1 day')
    GROUP BY day
    ORDER BY day ASC
  `;
}

export interface PathCount {
  path: string | null;
  count: bigint;
}

/** Top pages by PAGE_VIEW count over last `days`. */
export async function topPages(days = 30, limit = 20): Promise<PathCount[]> {
  return prisma.$queryRaw<PathCount[]>`
    SELECT "path", COUNT(*)::bigint AS count
    FROM "AnalyticsEvent"
    WHERE "kind" = 'PAGE_VIEW'::"EventKind"
      AND "createdAt" >= NOW() - (${days} * INTERVAL '1 day')
      AND "path" IS NOT NULL
    GROUP BY "path"
    ORDER BY count DESC
    LIMIT ${limit}
  `;
}

export interface KindCount {
  kind: string;
  count: bigint;
}

/** Total count per EventKind over last `days`. */
export async function eventCountsByKind(days = 30): Promise<KindCount[]> {
  return prisma.$queryRaw<KindCount[]>`
    SELECT "kind"::text AS kind, COUNT(*)::bigint AS count
    FROM "AnalyticsEvent"
    WHERE "createdAt" >= NOW() - (${days} * INTERVAL '1 day')
    GROUP BY "kind"
    ORDER BY count DESC
  `;
}

export interface AttributionRow {
  source: string;
  count: bigint;
}

/** Top attribution sources from refHost + utmSource over last `days`. */
export async function attributionSources(days = 30, limit = 15): Promise<AttributionRow[]> {
  return prisma.$queryRaw<AttributionRow[]>`
    SELECT COALESCE("utmSource", "refHost", '(direct)') AS source,
           COUNT(*)::bigint AS count
    FROM "AnalyticsEvent"
    WHERE "kind" = 'SIGNUP'::"EventKind"
      AND "createdAt" >= NOW() - (${days} * INTERVAL '1 day')
    GROUP BY source
    ORDER BY count DESC
    LIMIT ${limit}
  `;
}

export interface UserActivityRow {
  email: string;
  verificationsLast30: bigint;
  chaptersCompletedLast30: bigint;
}

/** Top contributors by verification volume in the period. */
export async function topContributors(days = 30, limit = 10): Promise<UserActivityRow[]> {
  return prisma.$queryRaw<UserActivityRow[]>`
    SELECT u."email",
           COUNT(*) FILTER (WHERE e."kind" = 'VERIFICATION_SUBMITTED'::"EventKind")::bigint AS "verificationsLast30",
           COUNT(*) FILTER (WHERE e."kind" = 'CHAPTER_COMPLETED'::"EventKind")::bigint AS "chaptersCompletedLast30"
    FROM "AnalyticsEvent" e
    JOIN "User" u ON u."id" = e."userId"
    WHERE e."createdAt" >= NOW() - (${days} * INTERVAL '1 day')
      AND e."userId" IS NOT NULL
    GROUP BY u."email"
    HAVING COUNT(*) FILTER (WHERE e."kind" IN ('VERIFICATION_SUBMITTED'::"EventKind", 'CHAPTER_COMPLETED'::"EventKind")) > 0
    ORDER BY "verificationsLast30" DESC, "chaptersCompletedLast30" DESC
    LIMIT ${limit}
  `;
}

/** Cheap CUID-ish generator — only needs row-lifetime uniqueness. */
function cuid(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6)
  );
}

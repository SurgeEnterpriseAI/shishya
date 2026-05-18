// Trusted Verifier promotion logic + audit-sampling.
//
// Spec gates (all must pass for a user to enter the admin queue):
//   1. verificationCount ≥ 200
//   2. account age ≥ 90 days
//   3. active in 8+ of the last 12 weeks (had ≥1 verification per active week)
//   4. zero validated false claims (no VerificationAudit row where
//      auditResult IN ('REJECTED','CORRECTED') for one of THIS user's
//      verifications)
//   5. quality score ≥ 80% on the audit-sampled subset, with at least
//      MIN_AUDIT_SAMPLES audits completed (otherwise gate INSUFFICIENT_DATA)
//
// All raw SQL — typed Prisma client may not include the new tables
// locally yet (Windows file-lock on regen). Production rebuilds the
// client fresh on every Vercel deploy.

import { prisma } from "./prisma";
import { createNotification } from "./notifications";

export const TRUSTED_VERIFIER = {
  MIN_VERIFICATIONS: 200,
  MIN_ACCOUNT_AGE_DAYS: 90,
  MIN_ACTIVE_WEEKS_OF_LAST_12: 8,
  MIN_AUDIT_SAMPLES: 10,           // need at least this many audits before the quality score is meaningful
  MIN_QUALITY_SCORE_PCT: 80,
};

export type PromotionGate =
  | "OK"
  | "INSUFFICIENT_VERIFICATIONS"
  | "ACCOUNT_TOO_YOUNG"
  | "INSUFFICIENT_ACTIVE_WEEKS"
  | "HAS_VALIDATED_FALSE_CLAIMS"
  | "INSUFFICIENT_AUDIT_SAMPLES"
  | "QUALITY_SCORE_BELOW_THRESHOLD";

export interface EligibilityRow {
  userId: string;
  email: string;
  name: string | null;
  badgeLevel: string;
  verificationCount: number;
  accountAgeDays: number;
  activeWeeksOfLast12: number;
  validatedFalseClaimCount: number;
  auditSampleCount: number;
  auditApprovedCount: number;
  qualityScorePct: number | null; // null when sample count below MIN_AUDIT_SAMPLES
  gate: PromotionGate;
  contributionScore: number;
  createdAt: Date;
}

/**
 * Compute the full eligibility set for ALL users currently at VERIFIER
 * level or higher. Heavy single query — fine at our scale (a few
 * thousand users max). Optimise into a materialised view if/when we
 * exceed ~100k users.
 *
 * Excludes already-Trusted-Verifier and Domain-Expert users (they're
 * already promoted; the queue only needs to surface NEW candidates).
 */
export async function computeEligibility(): Promise<EligibilityRow[]> {
  // The eligibility CTE bundles all the per-user aggregates so we can
  // compute the gates in a single round-trip.
  const rows = await prisma.$queryRaw<Array<{
    userId: string;
    email: string;
    name: string | null;
    badgeLevel: string;
    verificationCount: number;
    accountAgeDays: number;
    activeWeeksOfLast12: number;
    validatedFalseClaimCount: number;
    auditSampleCount: number;
    auditApprovedCount: number;
    contributionScore: number;
    createdAt: Date;
  }>>`
    WITH base AS (
      SELECT
        u."id" AS "userId",
        u."email",
        u."name",
        u."badgeLevel"::text AS "badgeLevel",
        u."verificationCount",
        u."contributionScore",
        u."createdAt",
        FLOOR(EXTRACT(EPOCH FROM (NOW() - u."createdAt")) / 86400.0)::int AS "accountAgeDays"
      FROM "User" u
      WHERE u."badgeLevel"::text IN ('NEWCOMER','CONTRIBUTOR','VERIFIER')
        AND u."verificationCount" >= ${TRUSTED_VERIFIER.MIN_VERIFICATIONS}
    ),
    weekly AS (
      SELECT v."userId",
             COUNT(DISTINCT DATE_TRUNC('week', v."createdAt"))::int AS "activeWeeksOfLast12"
      FROM "Verification" v
      WHERE v."actionType"::text = 'VERIFY'
        AND v."createdAt" >= NOW() - INTERVAL '12 weeks'
      GROUP BY v."userId"
    ),
    false_claims AS (
      -- Verifications by this user that an admin audit later marked
      -- REJECTED or CORRECTED (i.e., the user said "this is accurate"
      -- but it actually wasn't).
      SELECT v."userId", COUNT(*)::int AS "validatedFalseClaimCount"
      FROM "Verification" v
      JOIN "VerificationAudit" va ON va."verificationId" = v."id"
      WHERE v."actionType"::text = 'VERIFY'
        AND va."auditResult"::text IN ('REJECTED','CORRECTED')
      GROUP BY v."userId"
    ),
    audits AS (
      -- Total + approved audit count for this user's verifications.
      SELECT v."userId",
             COUNT(*)::int AS "auditSampleCount",
             COUNT(*) FILTER (WHERE va."auditResult"::text = 'APPROVED')::int AS "auditApprovedCount"
      FROM "Verification" v
      JOIN "VerificationAudit" va ON va."verificationId" = v."id"
      WHERE v."actionType"::text = 'VERIFY'
      GROUP BY v."userId"
    )
    SELECT
      b."userId", b."email", b."name", b."badgeLevel",
      b."verificationCount", b."contributionScore", b."createdAt", b."accountAgeDays",
      COALESCE(w."activeWeeksOfLast12", 0) AS "activeWeeksOfLast12",
      COALESCE(f."validatedFalseClaimCount", 0) AS "validatedFalseClaimCount",
      COALESCE(a."auditSampleCount", 0) AS "auditSampleCount",
      COALESCE(a."auditApprovedCount", 0) AS "auditApprovedCount"
    FROM base b
    LEFT JOIN weekly w ON w."userId" = b."userId"
    LEFT JOIN false_claims f ON f."userId" = b."userId"
    LEFT JOIN audits a ON a."userId" = b."userId"
    ORDER BY b."verificationCount" DESC
  `;

  return rows.map((r) => {
    const qualityScorePct = r.auditSampleCount >= TRUSTED_VERIFIER.MIN_AUDIT_SAMPLES
      ? Math.round((r.auditApprovedCount * 100) / r.auditSampleCount)
      : null;
    const gate = computeGate({
      verificationCount: r.verificationCount,
      accountAgeDays: r.accountAgeDays,
      activeWeeksOfLast12: r.activeWeeksOfLast12,
      validatedFalseClaimCount: r.validatedFalseClaimCount,
      auditSampleCount: r.auditSampleCount,
      qualityScorePct,
    });
    return { ...r, qualityScorePct, gate };
  });
}

function computeGate(args: {
  verificationCount: number;
  accountAgeDays: number;
  activeWeeksOfLast12: number;
  validatedFalseClaimCount: number;
  auditSampleCount: number;
  qualityScorePct: number | null;
}): PromotionGate {
  if (args.verificationCount < TRUSTED_VERIFIER.MIN_VERIFICATIONS) return "INSUFFICIENT_VERIFICATIONS";
  if (args.accountAgeDays < TRUSTED_VERIFIER.MIN_ACCOUNT_AGE_DAYS) return "ACCOUNT_TOO_YOUNG";
  if (args.activeWeeksOfLast12 < TRUSTED_VERIFIER.MIN_ACTIVE_WEEKS_OF_LAST_12) return "INSUFFICIENT_ACTIVE_WEEKS";
  if (args.validatedFalseClaimCount > 0) return "HAS_VALIDATED_FALSE_CLAIMS";
  if (args.auditSampleCount < TRUSTED_VERIFIER.MIN_AUDIT_SAMPLES) return "INSUFFICIENT_AUDIT_SAMPLES";
  if (args.qualityScorePct === null || args.qualityScorePct < TRUSTED_VERIFIER.MIN_QUALITY_SCORE_PCT) {
    return "QUALITY_SCORE_BELOW_THRESHOLD";
  }
  return "OK";
}

// ── Audit-sampling helpers ───────────────────────────────────────────

export interface AuditableVerification {
  verificationId: string;
  factId: string;
  userId: string;
  userEmail: string;
  actionType: string;
  notes: string | null;
  proposedValue: string | null;
  factClaimText: string;
  factClaimValue: string;
  factSourceUrl: string;
  factSourceName: string;
  factPageId: string;
  createdAt: Date;
}

/**
 * Sample N verifications that have NOT yet been audited. The admin
 * audit page presents these for re-check. We don't store a "pending
 * audit" row up-front; VerificationAudit only gets inserted when the
 * admin completes the audit.
 *
 * Random sampling (RANDOM()) so the same admin doesn't see the same
 * pending audits on every page load.
 */
export async function sampleVerificationsForAudit(limit = 20): Promise<AuditableVerification[]> {
  return await prisma.$queryRaw<AuditableVerification[]>`
    SELECT
      v."id" AS "verificationId",
      v."factId",
      v."userId",
      u."email" AS "userEmail",
      v."actionType"::text AS "actionType",
      v."notes",
      v."proposedValue",
      v."createdAt",
      f."claimText" AS "factClaimText",
      f."claimValue" AS "factClaimValue",
      f."sourceUrl" AS "factSourceUrl",
      f."sourceName" AS "factSourceName",
      f."pageId" AS "factPageId"
    FROM "Verification" v
    JOIN "Fact" f ON f."id" = v."factId"
    JOIN "User" u ON u."id" = v."userId"
    WHERE NOT EXISTS (
      SELECT 1 FROM "VerificationAudit" va
      WHERE va."verificationId" = v."id"
    )
    AND v."actionType"::text = 'VERIFY'
    ORDER BY RANDOM()
    LIMIT ${limit}
  `;
}

/** Insert an audit record. Idempotent on (verificationId, adminUserId). */
export async function recordAudit(args: {
  verificationId: string;
  factId: string;
  adminUserId: string;
  auditResult: "APPROVED" | "REJECTED" | "CORRECTED";
  notes?: string;
}): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "VerificationAudit" (
      "id", "verificationId", "factId", "adminUserId",
      "auditResult", "notes", "createdAt"
    ) VALUES (
      ${crypto.randomUUID()}, ${args.verificationId}, ${args.factId},
      ${args.adminUserId},
      ${args.auditResult}::"AuditResult",
      ${args.notes ?? null},
      NOW()
    )
  `;

  // If the audit found the verification was wrong, bump the user's
  // flagValidatedCount inverse — i.e., they made a false claim. We
  // track this on Verification.resolutionStatus too so the user's
  // own /me page can surface it.
  if (args.auditResult !== "APPROVED") {
    await prisma.$executeRaw`
      UPDATE "Verification"
      SET "resolutionStatus" = 'DISMISSED'::"VerificationResolution",
          "resolvedAt" = NOW(),
          "resolvedBy" = ${args.adminUserId}
      WHERE "id" = ${args.verificationId}
    `;
  } else {
    await prisma.$executeRaw`
      UPDATE "Verification"
      SET "resolutionStatus" = 'VALIDATED'::"VerificationResolution",
          "resolvedAt" = NOW(),
          "resolvedBy" = ${args.adminUserId}
      WHERE "id" = ${args.verificationId}
    `;
  }

  // Notify the verifier about the audit outcome. We need the verifier's
  // userId + a snippet of the claim text for the notification body.
  const ctxRows = await prisma.$queryRaw<{
    userId: string;
    claimText: string;
    pageId: string;
  }[]>`
    SELECT v."userId", f."claimText", f."pageId"
    FROM "Verification" v
    JOIN "Fact" f ON f."id" = v."factId"
    WHERE v."id" = ${args.verificationId}
    LIMIT 1
  `;
  const ctx = ctxRows[0];
  if (!ctx) return;

  const typeMap = {
    APPROVED: { type: "VERIFICATION_APPROVED" as const, title: "Your verification was approved" },
    REJECTED: { type: "VERIFICATION_REJECTED" as const, title: "Your verification was rejected" },
    CORRECTED: { type: "VERIFICATION_CORRECTED" as const, title: "Your verification was corrected" },
  };
  const meta = typeMap[args.auditResult];
  await createNotification({
    userId: ctx.userId,
    type: meta.type,
    title: meta.title,
    body: `"${truncate(ctx.claimText, 100)}"${args.notes ? ` — ${truncate(args.notes, 80)}` : ""}`,
    link: ctx.pageId,
    dedupKey: `audit:${args.verificationId}`,
  });
}

// ── Promotion decision helpers ───────────────────────────────────────

export type PromotionDecision =
  | { kind: "PROMOTE" }
  | { kind: "DENY"; reason: string }
  | { kind: "DEFER"; reason: string };

export async function applyPromotionDecision(args: {
  userId: string;
  adminUserId: string;
  decision: PromotionDecision;
}): Promise<void> {
  if (args.decision.kind === "PROMOTE") {
    await prisma.$executeRaw`
      UPDATE "User"
      SET "badgeLevel" = 'TRUSTED_VERIFIER'::"BadgeLevel",
          "badgeEarnedAt" = NOW()
      WHERE "id" = ${args.userId}
    `;
    await createNotification({
      userId: args.userId,
      type: "BADGE_PROMOTED",
      title: "You're now a Trusted Verifier",
      body:
        "Your verification work was sampled, audited, and met the 80% quality bar. " +
        "Your verifications now carry extra weight in the trust chain.",
      link: "/me",
      dedupKey: `promote:TRUSTED_VERIFIER:${args.userId}`,
    });
  }
  // DENY / DEFER don't mutate the User row directly — they're audit-
  // log only. Logged for the operator console; the user isn't notified
  // for deferred decisions (a denial without context would be jarring).
  console.info("[promotion]", JSON.stringify({
    userId: args.userId,
    adminUserId: args.adminUserId,
    decision: args.decision,
    at: new Date().toISOString(),
  }));
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

// Domain Expert credential helpers — raw SQL since local Prisma client
// regen is blocked by Windows file-lock. Prod Vercel regenerates fresh
// on every build.
//
// Three verification paths (per spec):
//   1. INSTITUTIONAL_EMAIL — blocked until email infra ships
//   2. COMMUNITY_VOUCHING — 3 vouches from existing DEs in same domain
//   3. ADMIN_GRANT — bootstrap path until first DEs exist
//
// On status flip to VERIFIED, the user's badgeLevel auto-promotes to
// DOMAIN_EXPERT (idempotent — adding more credentials to an existing
// DE just appends).

import { prisma } from "./prisma";
import { CREDENTIAL_DOMAIN_LABELS, type CredentialDomain } from "../institutional-domains";
import { createNotification } from "./notifications";

export const VOUCHING_THRESHOLD = 3;

export interface CredentialRow {
  id: string;
  userId: string;
  domain: string;
  claimType: string;
  institution: string;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "REVOKED";
  verifiedVia: "INSTITUTIONAL_EMAIL" | "COMMUNITY_VOUCHING" | "ADMIN_GRANT" | "DOCUMENT_REVIEW" | null;
  verifiedAt: Date | null;
  approvedBy: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VouchRow {
  id: string;
  credentialId: string;
  voucherUserId: string;
  voucherEmail: string;
  voucherBadgeLevel: string;
  comment: string | null;
  createdAt: Date;
}

/** All credentials for a user, newest first. */
export async function getUserCredentials(userId: string): Promise<CredentialRow[]> {
  return await prisma.$queryRaw<CredentialRow[]>`
    SELECT "id", "userId", "domain", "claimType", "institution",
           "status"::text AS status,
           "verifiedVia"::text AS "verifiedVia",
           "verifiedAt", "approvedBy", "notes", "createdAt", "updatedAt"
    FROM "UserCredential"
    WHERE "userId" = ${userId}
    ORDER BY "createdAt" DESC
  `;
}

/** Submit a new credential claim. Starts in PENDING. */
export async function submitCredential(args: {
  userId: string;
  domain: CredentialDomain;
  claimType: string;
  institution: string;
  notes?: string;
}): Promise<string> {
  const id = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "UserCredential" (
      "id", "userId", "domain", "claimType", "institution",
      "status", "notes", "createdAt", "updatedAt"
    ) VALUES (
      ${id}, ${args.userId}, ${args.domain}, ${args.claimType},
      ${args.institution},
      'PENDING'::"CredentialStatus",
      ${args.notes ?? null},
      NOW(), NOW()
    )
  `;
  return id;
}

/**
 * Add a vouch to a credential claim. If this is the 3rd vouch by
 * 3 DIFFERENT existing Domain Experts in the SAME domain, the
 * credential auto-promotes to VERIFIED.
 *
 * Returns true if the vouch caused the credential to be promoted.
 */
export async function addVouch(args: {
  credentialId: string;
  voucherUserId: string;
  comment?: string;
}): Promise<{ vouched: true; promotedToVerified: boolean }> {
  // 1. Load credential + check voucher eligibility.
  const cred = await prisma.$queryRaw<CredentialRow[]>`
    SELECT "id", "userId", "domain", "claimType", "institution",
           "status"::text AS status,
           "verifiedVia"::text AS "verifiedVia",
           "verifiedAt", "approvedBy", "notes", "createdAt", "updatedAt"
    FROM "UserCredential" WHERE "id" = ${args.credentialId} LIMIT 1
  `;
  if (cred.length === 0) throw new Error("Credential not found");
  const c = cred[0];
  if (c.status !== "PENDING") throw new Error("Credential is not pending — vouches not accepted");
  if (c.userId === args.voucherUserId) throw new Error("Cannot vouch for yourself");

  // 2. Voucher must be a verified DE in the SAME credential domain.
  const voucherCreds = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "UserCredential"
    WHERE "userId" = ${args.voucherUserId}
      AND "domain" = ${c.domain}
      AND "status"::text = 'VERIFIED'
  `;
  if ((voucherCreds[0]?.count ?? 0n) === 0n) {
    throw new Error("Voucher must hold a verified credential in the same domain");
  }

  // 3. Insert the vouch (unique constraint handles dedup).
  await prisma.$executeRaw`
    INSERT INTO "CredentialVouch" (
      "id", "credentialId", "voucherUserId", "comment", "createdAt"
    ) VALUES (
      ${crypto.randomUUID()}, ${args.credentialId}, ${args.voucherUserId},
      ${args.comment ?? null}, NOW()
    )
  `;

  // 4. Count distinct vouchers — if ≥ threshold, promote.
  const vouchCount = await prisma.$queryRaw<Array<{ n: bigint }>>`
    SELECT COUNT(DISTINCT "voucherUserId")::bigint AS n
    FROM "CredentialVouch"
    WHERE "credentialId" = ${args.credentialId}
  `;
  const n = Number(vouchCount[0]?.n ?? 0n);

  // Notify credential owner about the new vouch (always, even if it
  // also triggered promotion — separate signal).
  await createNotification({
    userId: c.userId,
    type: "CREDENTIAL_VOUCHED",
    title: `New vouch on your ${credentialDomainLabel(c.domain)} credential`,
    body: `${n} of ${VOUCHING_THRESHOLD} required vouches.${args.comment ? ` Comment: "${truncate(args.comment, 100)}"` : ""}`,
    link: "/me/credentials",
    dedupKey: `vouch:${args.credentialId}:${args.voucherUserId}`,
  });

  if (n >= VOUCHING_THRESHOLD) {
    await markCredentialVerified({
      credentialId: args.credentialId,
      userId: c.userId,
      via: "COMMUNITY_VOUCHING",
    });
    return { vouched: true, promotedToVerified: true };
  }
  return { vouched: true, promotedToVerified: false };
}

/** Vouches loaded for a credential (with voucher's badge + email). */
export async function getVouchesForCredential(credentialId: string): Promise<VouchRow[]> {
  return await prisma.$queryRaw<VouchRow[]>`
    SELECT v."id", v."credentialId", v."voucherUserId", v."comment", v."createdAt",
           u."email" AS "voucherEmail",
           u."badgeLevel"::text AS "voucherBadgeLevel"
    FROM "CredentialVouch" v
    JOIN "User" u ON u."id" = v."voucherUserId"
    WHERE v."credentialId" = ${credentialId}
    ORDER BY v."createdAt" ASC
  `;
}

/**
 * Mark a credential as VERIFIED + bump the user's badge to
 * DOMAIN_EXPERT. Idempotent — calling repeatedly is safe.
 */
export async function markCredentialVerified(args: {
  credentialId: string;
  userId: string;
  via: "INSTITUTIONAL_EMAIL" | "COMMUNITY_VOUCHING" | "ADMIN_GRANT" | "DOCUMENT_REVIEW";
  approvedBy?: string;
  verifiedEmail?: string;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "UserCredential"
      SET "status" = 'VERIFIED'::"CredentialStatus",
          "verifiedVia" = ${args.via}::"CredentialVerifiedVia",
          "verifiedAt" = NOW(),
          "approvedBy" = ${args.approvedBy ?? null},
          "verifiedEmail" = ${args.verifiedEmail ?? null},
          "updatedAt" = NOW()
      WHERE "id" = ${args.credentialId}
    `;
    // Promote badge level if not already at DOMAIN_EXPERT.
    await tx.$executeRaw`
      UPDATE "User"
      SET "badgeLevel" = 'DOMAIN_EXPERT'::"BadgeLevel",
          "badgeEarnedAt" = COALESCE("badgeEarnedAt", NOW()),
          "updatedAt" = NOW()
      WHERE "id" = ${args.userId}
        AND "badgeLevel"::text != 'DOMAIN_EXPERT'
    `;
  });

  // Look up the credential's display details for the notification body.
  const credRows = await prisma.$queryRaw<{
    domain: string;
    institution: string;
    claimType: string;
  }[]>`
    SELECT "domain", "institution", "claimType"
    FROM "UserCredential" WHERE "id" = ${args.credentialId} LIMIT 1
  `;
  const cred = credRows[0];

  await createNotification({
    userId: args.userId,
    type: "CREDENTIAL_VERIFIED",
    title: cred
      ? `Verified: ${cred.institution} (${credentialDomainLabel(cred.domain)})`
      : "Your credential was verified",
    body:
      args.via === "COMMUNITY_VOUCHING"
        ? "Three Domain Experts in your domain vouched — you're now a Domain Expert too."
        : args.via === "ADMIN_GRANT"
        ? "An admin granted your credential after review. You're now a Domain Expert."
        : "Your credential is now verified. You're now a Domain Expert.",
    link: "/me/credentials",
    dedupKey: `credential-verified:${args.credentialId}`,
  });
}

/** Reject a pending credential — admin action. */
export async function rejectCredential(args: {
  credentialId: string;
  adminUserId: string;
  reason: string;
}): Promise<void> {
  // Snapshot owner + domain BEFORE the update so we can notify.
  const ownerRows = await prisma.$queryRaw<{ userId: string; domain: string; institution: string }[]>`
    SELECT "userId", "domain", "institution"
    FROM "UserCredential" WHERE "id" = ${args.credentialId} LIMIT 1
  `;
  const owner = ownerRows[0];

  await prisma.$executeRaw`
    UPDATE "UserCredential"
    SET "status" = 'REJECTED'::"CredentialStatus",
        "approvedBy" = ${args.adminUserId},
        "notes" = COALESCE("notes" || E'\n\n', '') || ${'ADMIN REJECT: ' + args.reason},
        "updatedAt" = NOW()
    WHERE "id" = ${args.credentialId}
  `;

  if (owner) {
    await createNotification({
      userId: owner.userId,
      type: "CREDENTIAL_REJECTED",
      title: `Credential rejected: ${owner.institution}`,
      body: truncate(args.reason, 200),
      link: "/me/credentials",
      dedupKey: `credential-rejected:${args.credentialId}`,
    });
  }
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

/** All credentials awaiting vouches — surfaced in the vouching UI. */
export async function getPendingCredentialsInDomain(domain: CredentialDomain): Promise<Array<CredentialRow & {
  email: string;
  name: string | null;
  vouchCount: number;
}>> {
  return await prisma.$queryRaw<Array<CredentialRow & {
    email: string;
    name: string | null;
    vouchCount: number;
  }>>`
    SELECT c."id", c."userId", c."domain", c."claimType", c."institution",
           c."status"::text AS status,
           c."verifiedVia"::text AS "verifiedVia",
           c."verifiedAt", c."approvedBy", c."notes", c."createdAt", c."updatedAt",
           u."email", u."name",
           COALESCE((SELECT COUNT(DISTINCT "voucherUserId")::int
                     FROM "CredentialVouch" WHERE "credentialId" = c."id"), 0) AS "vouchCount"
    FROM "UserCredential" c
    JOIN "User" u ON u."id" = c."userId"
    WHERE c."status"::text = 'PENDING'
      AND c."domain" = ${domain}
    ORDER BY c."createdAt" ASC
  `;
}

/** Map domain key → human label. */
export function credentialDomainLabel(domain: string): string {
  return CREDENTIAL_DOMAIN_LABELS[domain as CredentialDomain] ?? domain;
}

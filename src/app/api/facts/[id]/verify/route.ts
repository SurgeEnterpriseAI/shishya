// POST /api/facts/[id]/verify
//
// The community verification endpoint. Logged-in users hit this when
// they click "I checked the source — this is accurate", "This looks
// wrong", or "Suggest an update" on any verification badge across
// the platform.
//
// Body: { actionType: "VERIFY" | "FLAG" | "SUGGEST_UPDATE",
//         notes?: string, proposedValue?: string, proposedSourceUrl?: string }
//
// Per spec:
//   * Auth-required (NextAuth session)
//   * Rate limit: 50 verifications/day, 10 flags/day per user
//   * Dedup: same user can't VERIFY same fact twice (DB unique constraint)
//   * New accounts (under 14 days old) have reduced weight — for the
//     first iteration we just allow them through; weight is handled
//     downstream in computeFactStatus
//   * Same-fact rapid-fire pattern is captured here for later abuse
//     detection (we just record everything; admin queries the verifications
//     table for suspicious patterns)
//
// Response: { ok: true, factStatus, communityVerificationsCount, ... }
// On dedup: 409 ALREADY_VERIFIED
// On rate limit: 429 RATE_LIMITED
// On bad input: 400 with zod error

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { bad, ok, parseBody, serverError, unauth } from "@/lib/http";
import { recordEvent } from "@/lib/analytics";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  actionType: z.enum(["VERIFY", "FLAG", "SUGGEST_UPDATE"]),
  notes: z.string().max(500).optional(),
  proposedValue: z.string().max(500).optional(),
  proposedSourceUrl: z.string().url().max(500).optional(),
});

interface FactRow {
  id: string;
  status: string;
  communityVerificationsCount: number;
  trustedVerifierCount: number;
  domainExpertCount: number;
  flagCount: number;
  lastAiCheckDate: Date | null;
  lastAiCheckResult: string | null;
  aiCheckCount: number;
}

interface UserRow {
  id: string;
  badgeLevel: string;
  verificationCount: number;
  flagCount: number;
  flagValidatedCount: number;
  suggestionAcceptedCount: number;
  createdAt: Date;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();
    const userId = session.user.id;
    const { id: factId } = await params;
    const body = await parseBody(req, Body);

    // 1. Rate-limit. Different buckets for VERIFY vs FLAG so a user
    //    who's actively flagging incorrect facts can't accidentally
    //    use up their flag quota by verifying lots of facts first.
    const bucket = body.actionType === "FLAG" ? "flag" : "verify";
    const rl = await checkRateLimit(bucket, userId);
    if (!rl.ok) return rateLimited(rl);

    // 2. Confirm fact exists. Raw SQL because typed Prisma client may
    //    not include Fact locally yet (Windows file lock on regen).
    const factRows = await prisma.$queryRaw<FactRow[]>`
      SELECT "id", "status"::text AS status,
             "communityVerificationsCount", "trustedVerifierCount",
             "domainExpertCount", "flagCount",
             "lastAiCheckDate", "lastAiCheckResult"::text AS "lastAiCheckResult",
             "aiCheckCount"
      FROM "Fact" WHERE "id" = ${factId} LIMIT 1
    `;
    const fact = factRows[0];
    if (!fact) return bad("Fact not found", 404);

    // 3. Validation: FLAG and SUGGEST_UPDATE both require notes.
    if (body.actionType !== "VERIFY" && !body.notes) {
      return bad("notes required for FLAG and SUGGEST_UPDATE", 400);
    }
    if (body.actionType === "SUGGEST_UPDATE" && !body.proposedValue) {
      return bad("proposedValue required for SUGGEST_UPDATE", 400);
    }

    // 4. Insert verification + update counters in one transaction.
    //    Raw SQL keeps us off the typed client.
    const userRows = await prisma.$queryRaw<UserRow[]>`
      SELECT "id", "badgeLevel"::text AS "badgeLevel",
             "verificationCount", "flagCount", "flagValidatedCount",
             "suggestionAcceptedCount", "createdAt"
      FROM "User" WHERE "id" = ${userId} LIMIT 1
    `;
    const user = userRows[0];
    if (!user) return unauth();

    // Dedup pre-check (the unique constraint catches it too, but a
    // pre-check returns a friendlier error).
    const existing = await prisma.$queryRaw<Array<{id: string}>>`
      SELECT "id" FROM "Verification"
      WHERE "factId" = ${factId}
        AND "userId" = ${userId}
        AND "actionType"::text = ${body.actionType}
      LIMIT 1
    `;
    if (existing.length > 0) {
      return bad("You've already taken this action on this fact", 409);
    }

    // 5. Atomic: insert verification, increment user counters, bump fact counters.
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "Verification" (
          "id", "factId", "userId", "actionType", "notes",
          "proposedValue", "proposedSourceUrl",
          "resolutionStatus", "createdAt"
        ) VALUES (
          ${crypto.randomUUID()}, ${factId}, ${userId},
          ${body.actionType}::"VerificationActionType",
          ${body.notes ?? null},
          ${body.proposedValue ?? null},
          ${body.proposedSourceUrl ?? null},
          'PENDING'::"VerificationResolution",
          NOW()
        )
      `;

      // Bump the appropriate Fact counter.
      if (body.actionType === "VERIFY") {
        if (user.badgeLevel === "TRUSTED_VERIFIER") {
          await tx.$executeRaw`UPDATE "Fact" SET "trustedVerifierCount" = "trustedVerifierCount" + 1, "updatedAt" = NOW() WHERE "id" = ${factId}`;
        } else if (user.badgeLevel === "DOMAIN_EXPERT") {
          await tx.$executeRaw`UPDATE "Fact" SET "domainExpertCount" = "domainExpertCount" + 1, "updatedAt" = NOW() WHERE "id" = ${factId}`;
        } else {
          await tx.$executeRaw`UPDATE "Fact" SET "communityVerificationsCount" = "communityVerificationsCount" + 1, "updatedAt" = NOW() WHERE "id" = ${factId}`;
        }
      } else if (body.actionType === "FLAG") {
        await tx.$executeRaw`UPDATE "Fact" SET "flagCount" = "flagCount" + 1, "updatedAt" = NOW() WHERE "id" = ${factId}`;
      }

      // Bump the user's contribution score + per-action counter.
      const scoreBump = body.actionType === "VERIFY" ? 1 : body.actionType === "FLAG" ? 2 : 3;
      if (body.actionType === "VERIFY") {
        await tx.$executeRaw`UPDATE "User" SET "verificationCount" = "verificationCount" + 1, "contributionScore" = "contributionScore" + ${scoreBump} WHERE "id" = ${userId}`;
      } else if (body.actionType === "FLAG") {
        await tx.$executeRaw`UPDATE "User" SET "flagCount" = "flagCount" + 1, "contributionScore" = "contributionScore" + ${scoreBump} WHERE "id" = ${userId}`;
      } else {
        await tx.$executeRaw`UPDATE "User" SET "contributionScore" = "contributionScore" + ${scoreBump} WHERE "id" = ${userId}`;
      }
    });

    // 6. Re-fetch + recompute Fact status. Don't block the user — they
    //    just want acknowledgement that their action landed.
    const updatedFact = await prisma.$queryRaw<FactRow[]>`
      SELECT "id", "status"::text AS status,
             "communityVerificationsCount", "trustedVerifierCount",
             "domainExpertCount", "flagCount",
             "lastAiCheckDate", "lastAiCheckResult"::text AS "lastAiCheckResult",
             "aiCheckCount"
      FROM "Fact" WHERE "id" = ${factId} LIMIT 1
    `;
    const f = updatedFact[0]!;

    // Inline status recompute — same logic as facts.ts computeFactStatus
    // but inlined here so this route doesn't depend on the typed prisma.fact API.
    const aiFresh30 = f.lastAiCheckDate && (Date.now() - f.lastAiCheckDate.getTime() < 30 * 86_400_000);
    const aiFresh60 = f.lastAiCheckDate && (Date.now() - f.lastAiCheckDate.getTime() < 60 * 86_400_000);
    let nextStatus: string = f.status;
    if (f.flagCount >= 3) {
      nextStatus = "DISPUTED";
    } else if (
      aiFresh30 &&
      (f.communityVerificationsCount >= 5 ||
        (f.trustedVerifierCount >= 1 && f.communityVerificationsCount >= 2) ||
        f.domainExpertCount >= 1)
    ) {
      nextStatus = "FULLY";
    } else if (
      (aiFresh60 && f.communityVerificationsCount >= 3) ||
      f.trustedVerifierCount >= 1 ||
      f.domainExpertCount >= 1
    ) {
      nextStatus = "VERIFIED";
    }
    if (nextStatus !== f.status) {
      await prisma.$executeRaw`UPDATE "Fact" SET "status" = ${nextStatus}::"FactStatus" WHERE "id" = ${factId}`;
    }

    // Analytics — fire-and-forget. Captures the action type + the
    // resulting fact status so we can see "verify → FULLY" funnel.
    void recordEvent({
      kind: "VERIFICATION_SUBMITTED",
      userId,
      props: {
        actionType: body.actionType,
        factId,
        resultingStatus: nextStatus,
      },
    });

    return ok({
      ok: true,
      factStatus: nextStatus,
      communityVerificationsCount: f.communityVerificationsCount,
      trustedVerifierCount: f.trustedVerifierCount,
      domainExpertCount: f.domainExpertCount,
      flagCount: f.flagCount,
    });
  } catch (err: any) {
    // Catch the unique-constraint case if our pre-check missed.
    if (err?.code === "P2002") {
      return bad("You've already taken this action on this fact", 409);
    }
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

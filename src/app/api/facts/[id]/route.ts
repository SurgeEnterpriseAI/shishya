// GET /api/facts/[id]
//
// Read endpoint for a single Fact + its verification history. Used by
// the VerificationPanel client component when a user clicks a badge.
//
// Public — no auth required. Anything Shishya displays as a fact is
// already public info, so its verification history is too.

import { prisma } from "@/lib/db/prisma";
import { bad, ok, serverError } from "@/lib/http";

export const runtime = "nodejs";

interface FactRow {
  id: string;
  pageId: string;
  section: string;
  claimText: string;
  claimValue: string;
  sourceUrl: string;
  sourceName: string;
  originalIngestionDate: Date;
  lastAiCheckDate: Date | null;
  lastAiCheckResult: string | null;
  aiCheckCount: number;
  communityVerificationsCount: number;
  trustedVerifierCount: number;
  domainExpertCount: number;
  flagCount: number;
  status: string;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const rows = await prisma.$queryRaw<FactRow[]>`
      SELECT "id", "pageId", "section"::text AS section, "claimText", "claimValue",
             "sourceUrl", "sourceName", "originalIngestionDate",
             "lastAiCheckDate", "lastAiCheckResult"::text AS "lastAiCheckResult",
             "aiCheckCount", "communityVerificationsCount", "trustedVerifierCount",
             "domainExpertCount", "flagCount", "status"::text AS status
      FROM "Fact" WHERE "id" = ${id} LIMIT 1
    `;
    const fact = rows[0];
    if (!fact) return bad("Fact not found", 404);
    return ok({
      id: fact.id,
      pageId: fact.pageId,
      section: fact.section,
      claimText: fact.claimText,
      claimValue: fact.claimValue,
      sourceUrl: fact.sourceUrl,
      sourceName: fact.sourceName,
      lastAiCheckDate: fact.lastAiCheckDate?.toISOString() ?? null,
      communityVerificationsCount: fact.communityVerificationsCount,
      trustedVerifierCount: fact.trustedVerifierCount,
      domainExpertCount: fact.domainExpertCount,
      flagCount: fact.flagCount,
      status: fact.status,
    });
  } catch (err) {
    return serverError(err);
  }
}

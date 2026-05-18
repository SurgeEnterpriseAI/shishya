// Facts helper library — the read/write API for the verification system.
//
// Uses RAW SQL (via $queryRaw / $executeRaw) instead of the typed Prisma
// client so that local TypeScript doesn't depend on `prisma generate`
// having run after schema changes. Production gets the typed client
// fresh on every Vercel build, but local dev was hitting a Windows
// file lock when regenerating. Raw SQL sidesteps both problems.
//
// Migrate to typed client (prisma.fact.findMany etc.) once the local
// generate succeeds and we want join-friendly typed queries.

import { prisma } from "./prisma";

export type FactStatus =
  | "NONE"
  | "AI"
  | "VERIFIED"
  | "FULLY"
  | "NEEDS_REVIEW"
  | "DISPUTED";

export type FactSection =
  | "EXAM"
  | "COLLEGE"
  | "SCHOLARSHIP"
  | "BOARD"
  | "UNIVERSITY"
  | "VISA"
  | "CAREER"
  | "GENERAL";

export interface Fact {
  id: string;
  pageId: string;
  section: FactSection;
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
  status: FactStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** Deterministic Fact.id for a (pageId, claimKey). */
export function factIdFor(pageId: string, claimKey: string): string {
  const safe = `${pageId}::${claimKey}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `fkt-${safe}`;
}

/** Get every Fact for a page in one query. */
export async function getFactsForPage(pageId: string): Promise<Fact[]> {
  return await prisma.$queryRaw<Fact[]>`
    SELECT * FROM "Fact" WHERE "pageId" = ${pageId} ORDER BY "createdAt" ASC
  `;
}

/** Look up a single Fact by its deterministic id. */
export async function getFact(pageId: string, claimKey: string): Promise<Fact | null> {
  const id = factIdFor(pageId, claimKey);
  const rows = await prisma.$queryRaw<Fact[]>`
    SELECT * FROM "Fact" WHERE "id" = ${id} LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * Build a (claimKey → Fact) map for a page. The seed script uses
 * factIdFor() to derive ids; this function reverses that derivation
 * so callers can look up facts by their semantic claimKey
 * ("nirf_rank", "established_year", etc.).
 */
export async function getFactMap(pageId: string): Promise<Record<string, Fact>> {
  const facts = await getFactsForPage(pageId);
  const idPrefix = factIdFor(pageId, "");
  const map: Record<string, Fact> = {};
  for (const f of facts) {
    if (f.id.startsWith(idPrefix)) {
      const claimKey = f.id.slice(idPrefix.length).replace(/^-+/, "");
      map[claimKey] = f;
    }
  }
  return map;
}

/**
 * Translate a Fact row into the props the VerificationBadge component
 * expects. Use this in server components for badge rendering with
 * real verification data instead of the hardcoded "ai" fallback.
 *
 * Also surfaces the verification counts so the badge can render an
 * inline "1/3" progress indicator + a tooltip explaining how many
 * more community confirmations are needed to flip to the next status.
 */
export function factToBadgeProps(fact: Fact | null | undefined): {
  status: "fully" | "verified" | "ai" | "needs" | "none" | "disputed";
  lastCheckedAt?: string;
  source?: string;
  sourceUrl?: string;
  communityCount?: number;
  trustedVerifierCount?: number;
  domainExpertCount?: number;
  flagCount?: number;
} {
  if (!fact) {
    return { status: "ai" };
  }
  const statusMap: Record<FactStatus, "fully" | "verified" | "ai" | "needs" | "none" | "disputed"> = {
    NONE:         "none",
    AI:           "ai",
    VERIFIED:     "verified",
    FULLY:        "fully",
    NEEDS_REVIEW: "needs",
    DISPUTED:     "disputed",
  };
  return {
    status: statusMap[fact.status],
    lastCheckedAt: fact.lastAiCheckDate?.toISOString(),
    source: fact.sourceName,
    sourceUrl: fact.sourceUrl,
    communityCount: fact.communityVerificationsCount,
    trustedVerifierCount: fact.trustedVerifierCount,
    domainExpertCount: fact.domainExpertCount,
    flagCount: fact.flagCount,
  };
}

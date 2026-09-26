// Read-only counts behind /verification's "Where this stands today" table
// (26 Sep 2026). SELECT only; raw SQL like the rest of the fact library so
// local TypeScript does not depend on a fresh `prisma generate`.

import { prisma } from "./prisma";
import { FACT_STATUS_RULES, type VerificationStats } from "@/lib/verification-state";

export async function loadVerificationStats(): Promise<VerificationStats> {
  const [sections, statuses, recentlyChecked, checks, actions, levels] = await Promise.all([
    prisma.$queryRaw<{ section: string; facts: number; pages: number }[]>`
      SELECT section::text AS section, COUNT(*)::int AS facts, COUNT(DISTINCT "pageId")::int AS pages
        FROM "Fact" GROUP BY 1`,
    prisma.$queryRaw<{ section: string; status: string; facts: number }[]>`
      SELECT section::text AS section, status::text AS status, COUNT(*)::int AS facts
        FROM "Fact" GROUP BY 1, 2`,
    prisma.$queryRaw<{ section: string; facts: number }[]>`
      SELECT section::text AS section, COUNT(*)::int AS facts
        FROM "Fact"
       WHERE "lastAiCheckDate" > NOW() - (${FACT_STATUS_RULES.verifiedRecheckDays}::int * INTERVAL '1 day')
       GROUP BY 1`,
    prisma.$queryRaw<{ n: number; last: Date | null }[]>`
      SELECT COUNT(*)::int AS n, MAX("createdAt") AS last FROM "AiCheck"`,
    prisma.$queryRaw<{ action: string; n: number; users: number }[]>`
      SELECT "actionType"::text AS action, COUNT(*)::int AS n, COUNT(DISTINCT "userId")::int AS users
        FROM "Verification"
       WHERE "resolutionStatus"::text <> 'DISMISSED'
       GROUP BY 1`,
    prisma.$queryRaw<{ level: string; n: number }[]>`
      SELECT "badgeLevel"::text AS level, COUNT(*)::int AS n
        FROM "User" WHERE "badgeLevel"::text <> 'NEWCOMER' GROUP BY 1`,
  ]);
  const act = (a: string) => actions.find((r) => r.action === a);
  return {
    sections,
    statuses,
    recentlyChecked,
    aiChecks: checks[0]?.n ?? 0,
    lastAiCheckAt: checks[0]?.last ?? null,
    confirmations: act("VERIFY")?.n ?? 0,
    confirmers: act("VERIFY")?.users ?? 0,
    flags: act("FLAG")?.n ?? 0,
    suggestions: act("SUGGEST_UPDATE")?.n ?? 0,
    levels: Object.fromEntries(levels.map((l) => [l.level, l.n])),
  };
}

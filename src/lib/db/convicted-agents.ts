// The bot scrub's convicted user agents, for the guest tutor's crawler hold
// (14 Oct 2026, Release 2 — the rule and the data in src/lib/guest-seed-hold.ts).
//
// One SELECT (convictedAgentsSql), cached for an hour — the scrub that writes
// the tags runs hourly (/api/cron/scrub-bots), so a newly convicted agent is
// held within about two hours. Read only for a signed-out, cookie-less,
// auto-sent seed (seedHoldCandidate), never on any other turn. A failed read
// returns null and is not cached: the hold then holds nothing (fails open).

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { convictedAgentsSql } from "@/lib/guest-seed-hold";

const cachedAgents = unstable_cache(
  async (): Promise<string[]> => {
    const rows = await prisma.$queryRawUnsafe<Array<{ uaHash: string }>>(convictedAgentsSql());
    return rows.map((r) => r.uaHash).filter((h): h is string => typeof h === "string" && h.length > 0);
  },
  ["convicted-agents-v1"],
  { revalidate: 3600 },
);

/** The convicted user-agent hashes, or null when the read failed. */
export async function loadConvictedAgents(): Promise<Set<string> | null> {
  try {
    return new Set(await cachedAgents());
  } catch (err) {
    console.error("[seed-hold] convicted agents read failed — nothing held:", err);
    return null;
  }
}

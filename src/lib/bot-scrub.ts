// Shared high-confidence botnet scrub — used by the hourly cron
// (/api/cron/scrub-bots) and the manual CLI (scripts/scrub-ua-sweep.ts).
//
// Removes ONLY unmistakable botnet traffic and keeps everything ambiguous
// as human (founder rule, 20 Aug 2026: "if you are SURE about a bot move
// it away, keep the rest as human"). See scripts/scrub-ua-sweep.ts header
// for the full rationale. Self-correcting: each run RESTORES rows a prior
// run tagged whose cluster no longer meets the bar, then tags those that
// do. props.retroTag keeps every action auditable/reversible.

const MIN_IPS = 15;           // distinct IPs on one UA to be "sure" it's a botnet
const MAX_VIEWS_PER_IP = 1.5; // proxy-rotation signature (one page per IP)

export interface ScrubResult {
  convicted: number;
  restored: number;
  tagged: number;
  beacons: number;
}

// Accepts any Prisma-like client with $queryRaw/$executeRaw (the shared
// server client, or a standalone PrismaClient in the CLI).
export async function runBotScrub(p: {
  $queryRaw: <T = unknown>(q: TemplateStringsArray, ...v: unknown[]) => Promise<T>;
  $executeRaw: (q: TemplateStringsArray, ...v: unknown[]) => Promise<number>;
}): Promise<ScrubResult> {
  const tag = `ua-sweep-${new Date().toISOString().slice(0, 10)}`;

  const convictedRows = await p.$queryRaw<Array<{ uaHash: string }>>`
    SELECT "uaHash" FROM "AnalyticsEvent"
    WHERE kind = 'PAGE_VIEW' AND "userId" IS NULL AND "anonId" IS NULL AND "uaHash" IS NOT NULL
      AND (client = 'browser' OR (client = 'bot' AND props->>'retroTag' LIKE 'ua-sweep%'))
    GROUP BY "uaHash"
    HAVING COUNT(DISTINCT "ipHash") >= ${MIN_IPS}
      AND COUNT(*) FILTER (WHERE "refHost" IS NOT NULL) = 0
      AND COUNT(*)::numeric / GREATEST(COUNT(DISTINCT "ipHash"), 1) <= ${MAX_VIEWS_PER_IP}`;
  const convicted = convictedRows.map((r) => r.uaHash);

  const restored = await p.$executeRaw`
    UPDATE "AnalyticsEvent" SET client = 'browser', props = props - 'retroTag'
    WHERE client = 'bot' AND props->>'retroTag' LIKE 'ua-sweep%'
      AND ("uaHash" IS NULL OR NOT ("uaHash" = ANY(${convicted}::text[])))`;

  if (convicted.length === 0) {
    return { convicted: 0, restored: Number(restored), tagged: 0, beacons: 0 };
  }

  const tagged = await p.$executeRaw`
    UPDATE "AnalyticsEvent" SET client = 'bot',
      props = COALESCE(props, '{}'::jsonb) || jsonb_build_object('retroTag', ${tag}::text)
    WHERE kind = 'PAGE_VIEW' AND client = 'browser'
      AND "userId" IS NULL AND "anonId" IS NULL AND "refHost" IS NULL
      AND "uaHash" = ANY(${convicted}::text[])`;

  const beacons = await p.$executeRaw`
    UPDATE "AnalyticsEvent" SET client = 'bot',
      props = COALESCE(props, '{}'::jsonb) || jsonb_build_object('retroTag', ${tag}::text)
    WHERE kind <> 'PAGE_VIEW' AND client = 'browser'
      AND "userId" IS NULL AND "anonId" IS NULL AND "refHost" IS NULL
      AND "uaHash" = ANY(${convicted}::text[])`;

  return { convicted: convicted.length, restored: Number(restored), tagged: Number(tagged), beacons: Number(beacons) };
}

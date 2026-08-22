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

  // HUMAN-SAFETY (review 22 Aug 2026): within a convicted UA cluster we
  // cannot tell a botnet hit from a genuine direct first-touch human on
  // the same popular Android-Chrome UA — EXCEPT by where they land. A
  // real person typing the URL or opening a shared link lands on the
  // HOME page, an EXAM HUB, or one of a few entry pages. The crawler
  // hammers /chat (2,178 of 2,730 shallow hits measured 22 Aug), deep
  // topic/pyq pages and everything in between. So: rows on genuine
  // landing pages stay human (founder rule "keep the rest as human");
  // every other path in a 15+-IP botnet cluster is tagged as the sure
  // bot it is. Accepted cost: a bot hit on a hub/home stays counted.
  const restored = await p.$executeRaw`
    UPDATE "AnalyticsEvent" SET client = 'browser', props = props - 'retroTag'
    WHERE client = 'bot' AND props->>'retroTag' LIKE 'ua-sweep%'
      AND (
        "uaHash" IS NULL
        OR NOT ("uaHash" = ANY(${convicted}::text[]))
        OR (kind = 'PAGE_VIEW' AND (
             split_part(COALESCE(path,''),'?',1) IN ('/', '/ask', '/jobs-map', '/live-test', '/current-affairs', '/aptitude', '/find-your-exam')
             OR split_part(COALESCE(path,''),'?',1) ~ '^/exams/[^/]+/?$'
           ))
      )`;

  if (convicted.length === 0) {
    return { convicted: 0, restored: Number(restored), tagged: 0, beacons: 0 };
  }

  const tagged = await p.$executeRaw`
    UPDATE "AnalyticsEvent" SET client = 'bot',
      props = COALESCE(props, '{}'::jsonb) || jsonb_build_object('retroTag', ${tag}::text)
    WHERE kind = 'PAGE_VIEW' AND client = 'browser'
      AND "userId" IS NULL AND "anonId" IS NULL AND "refHost" IS NULL
      AND "uaHash" = ANY(${convicted}::text[])
      AND NOT (
        split_part(COALESCE(path,''),'?',1) IN ('/', '/ask', '/jobs-map', '/live-test', '/current-affairs', '/aptitude', '/find-your-exam')
        OR split_part(COALESCE(path,''),'?',1) ~ '^/exams/[^/]+/?$'
      )`;

  const beacons = await p.$executeRaw`
    UPDATE "AnalyticsEvent" SET client = 'bot',
      props = COALESCE(props, '{}'::jsonb) || jsonb_build_object('retroTag', ${tag}::text)
    WHERE kind <> 'PAGE_VIEW' AND client = 'browser'
      AND "userId" IS NULL AND "anonId" IS NULL AND "refHost" IS NULL
      AND "uaHash" = ANY(${convicted}::text[])`;

  return { convicted: convicted.length, restored: Number(restored), tagged: Number(tagged), beacons: Number(beacons) };
}

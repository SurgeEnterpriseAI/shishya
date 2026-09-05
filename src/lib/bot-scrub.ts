// Shared high-confidence botnet scrub — used by the hourly cron
// (/api/cron/scrub-bots) and the manual CLI (scripts/scrub-ua-sweep.ts).
//
// Removes ONLY unmistakable botnet traffic and keeps everything ambiguous
// as human (founder rule, 20 Aug 2026: "if you are SURE about a bot move
// it away, keep the rest as human"). See scripts/scrub-ua-sweep.ts header
// for the full rationale. Self-correcting: each run RESTORES rows a prior
// run tagged whose cluster no longer meets the bar, then tags those that
// do. props.retroTag keeps every action auditable/reversible.

// NOTE (5 Sep 2026): uaHash is stable across months, ipHash rotates
// monthly. A convicted UA therefore stays convicted across the 1st of the
// month (rows before 5 Sep carry per-month UA hashes and cluster only
// within their own month). Distinct-IP counts do include the same IP
// re-hashed in a later month — harmless for a "sure bot" bar this high.
const MIN_IPS = 15;           // distinct IPs on one UA to be "sure" it's a botnet
const MAX_VIEWS_PER_IP = 1.5; // proxy-rotation signature (one page per IP)

export interface ScrubResult {
  convicted: number;
  restored: number;
  tagged: number;
  beacons: number;
  /** /login rows minted by a convicted crawler's auth redirect (see below). */
  redirects: number;
  restoredRedirects: number;
}

// Auth-gated paths: a crawler that fetches one of these gets bounced to
// /login by the page itself. Its FIRST beacon (the gated page) is
// identity-less — fingerprinted and scrubbed by the UA rule — but that
// response also ISSUES the anon cookie, so the /login beacon 1-2 s later
// arrives identified and is never fingerprinted. Measured 18-21 Aug
// 2026: ~90 such phantom "people"/day, every one of them a single
// /login view, no referrer, no events, never seen again, flat across
// all 24 hours. Humans leave the same pair only ~4/day (expired
// sessions) — and their anchor row is UNTAGGED, which is how the rule
// below tells them apart.
const GATED_PATH_RE = "^/(mocks|attempts|dashboard|chat|coach|me|mentor|revision|notebook|onboarding)(/|$)";

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

  // LOGIN-REDIRECT PHANTOMS — restore first (self-correcting): a tagged
  // /login row whose anchor is no longer a convicted bot hit, or whose
  // anon id has since produced ANY other row (a real person came back),
  // goes back to human.
  const restoredRedirects = await p.$executeRaw`
    UPDATE "AnalyticsEvent" l SET client = 'browser', props = props - 'retroTag'
    WHERE l.client = 'bot' AND l.props->>'retroTag' LIKE 'login-redirect%'
      AND (
        EXISTS (SELECT 1 FROM "AnalyticsEvent" o WHERE o."anonId" = l."anonId" AND o.id <> l.id)
        OR NOT EXISTS (
          SELECT 1 FROM "AnalyticsEvent" b
          WHERE b.kind = 'PAGE_VIEW' AND b.client = 'bot' AND b."userId" IS NULL AND b."anonId" IS NULL
            AND b."createdAt" BETWEEN l."createdAt" - interval '5 seconds' AND l."createdAt"
            AND split_part(COALESCE(b.path,''),'?',1) ~ ${GATED_PATH_RE}
        )
      )`;

  if (convicted.length === 0) {
    return { convicted: 0, restored: Number(restored), tagged: 0, beacons: 0, redirects: 0, restoredRedirects: Number(restoredRedirects) };
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

  // Tag the phantom /login rows — only when ALL of these hold:
  //   • it is that anon id's ONLY row ever (no referrer, no UTM);
  //   • a CONVICTED bot hit on a gated page sits ≤5 s before it (the
  //     redirect anchor — bot rows tagged by the UA rule above or at
  //     ingest);
  //   • NO untagged human identity-less hit sits in that same window —
  //     a fresh-browser human bouncing off a gated page leaves exactly
  //     such a row, so its presence means "could be a person": keep.
  // Runs AFTER the UA tagging so this hour's anchors are already bots.
  const redirectTag = `login-redirect-${new Date().toISOString().slice(0, 10)}`;
  const redirects = await p.$executeRaw`
    UPDATE "AnalyticsEvent" l SET client = 'bot',
      props = COALESCE(l.props, '{}'::jsonb) || jsonb_build_object('retroTag', ${redirectTag}::text)
    WHERE l.kind = 'PAGE_VIEW' AND l.client = 'browser'
      AND split_part(COALESCE(l.path,''),'?',1) = '/login'
      AND l."userId" IS NULL AND l."anonId" IS NOT NULL
      AND l."refHost" IS NULL AND l."utmSource" IS NULL
      AND NOT EXISTS (SELECT 1 FROM "AnalyticsEvent" o WHERE o."anonId" = l."anonId" AND o.id <> l.id)
      AND EXISTS (
        SELECT 1 FROM "AnalyticsEvent" b
        WHERE b.kind = 'PAGE_VIEW' AND b.client = 'bot' AND b."userId" IS NULL AND b."anonId" IS NULL
          AND b."createdAt" BETWEEN l."createdAt" - interval '5 seconds' AND l."createdAt"
          AND split_part(COALESCE(b.path,''),'?',1) ~ ${GATED_PATH_RE}
      )
      AND NOT EXISTS (
        SELECT 1 FROM "AnalyticsEvent" h
        WHERE h.kind = 'PAGE_VIEW' AND h.client = 'browser' AND h."userId" IS NULL AND h."anonId" IS NULL
          AND h."createdAt" BETWEEN l."createdAt" - interval '5 seconds' AND l."createdAt"
      )`;

  return {
    convicted: convicted.length,
    restored: Number(restored),
    tagged: Number(tagged),
    beacons: Number(beacons),
    redirects: Number(redirects),
    restoredRedirects: Number(restoredRedirects),
  };
}

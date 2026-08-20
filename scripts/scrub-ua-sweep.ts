// scripts/scrub-ua-sweep.ts
//
// Remove ONLY high-confidence botnet traffic; keep everything ambiguous
// as human (founder rule, 20 Aug 2026: "if you are sure about a bot move
// it away, keep the rest as human"). Uses the forensic uaHash/ipHash
// fingerprints (18 Aug 2026).
//
// A single stealth-crawler hit is indistinguishable from a real
// first-touch human, so we NEVER judge one row. We convict a uaHash
// cluster as a botnet ONLY when it is unmistakable:
//   • ≥ MIN_IPS distinct IP addresses share the exact same browser UA
//     (no human audience has 15+ different people on one identical UA),
//   • ZERO of the cluster's views carry a referrer (humans arrive from
//     Google/WhatsApp/links; crawlers don't),
//   • ~1 view per IP (proxy rotation — one page per IP, then a new IP).
// Everything below that bar (a UA seen from 1–14 IPs) STAYS human.
//
// This is self-correcting AND reversible: each run RESTORES any rows a
// previous (stricter/looser) run tagged whose cluster no longer meets
// the bar (client back to 'browser', retroTag stripped), then tags the
// clusters that do. props.retroTag keeps every action auditable.
//
// USAGE: npx tsx --env-file=.env.local scripts/scrub-ua-sweep.ts
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const MIN_IPS = 15;          // distinct IPs on one UA to be "sure" it's a botnet
const MAX_VIEWS_PER_IP = 1.5; // proxy-rotation signature (one page per IP)

async function main() {
  const tag = `ua-sweep-${new Date().toISOString().slice(0, 10)}`;

  // 1) Convicted uaHash set — computed over ALL unidentified no-identity
  //    rows (currently 'browser' OR previously tagged 'bot'), so the
  //    verdict is stable across re-runs and independent of prior tagging.
  const convictedRows = await p.$queryRaw<Array<{ uaHash: string }>>`
    SELECT "uaHash" FROM "AnalyticsEvent"
    WHERE kind = 'PAGE_VIEW' AND "userId" IS NULL AND "anonId" IS NULL AND "uaHash" IS NOT NULL
      AND (client = 'browser' OR (client = 'bot' AND props->>'retroTag' LIKE 'ua-sweep%'))
    GROUP BY "uaHash"
    HAVING COUNT(DISTINCT "ipHash") >= ${MIN_IPS}
      AND COUNT(*) FILTER (WHERE "refHost" IS NOT NULL) = 0
      AND COUNT(*)::numeric / GREATEST(COUNT(DISTINCT "ipHash"), 1) <= ${MAX_VIEWS_PER_IP}`;
  const convicted = convictedRows.map((r) => r.uaHash);
  console.log(`convicted botnet UAs (≥${MIN_IPS} IPs, no referrer, 1 view/IP): ${convicted.length}`);

  // 2) RESTORE — anything previously tagged whose UA is NOT convicted now
  //    goes back to human. This is what "keep the rest as human" means:
  //    the small/ambiguous clusters the old ≥3-view rule over-removed
  //    return to the counts.
  const restored = await p.$executeRaw`
    UPDATE "AnalyticsEvent" SET client = 'browser',
      props = props - 'retroTag'
    WHERE client = 'bot' AND props->>'retroTag' LIKE 'ua-sweep%'
      AND ("uaHash" IS NULL OR NOT ("uaHash" = ANY(${convicted}::text[])))`;
  console.log(`restored ${restored} rows to human (below the botnet bar)`);

  if (convicted.length === 0) {
    console.log("no unmistakable botnet clusters — nothing tagged.");
    return;
  }

  // 3) TAG — page views in a convicted cluster.
  const tagged = await p.$executeRaw`
    UPDATE "AnalyticsEvent" SET client = 'bot',
      props = COALESCE(props, '{}'::jsonb) || jsonb_build_object('retroTag', ${tag}::text)
    WHERE kind = 'PAGE_VIEW' AND client = 'browser'
      AND "userId" IS NULL AND "anonId" IS NULL AND "refHost" IS NULL
      AND "uaHash" = ANY(${convicted}::text[])`;
  console.log(`tagged ${tagged} page-view rows as botnet (marker: ${tag})`);

  // 4) Beacons (CHAT_OPENED, CTA_CLICKED…) from the same convicted UAs.
  const beacons = await p.$executeRaw`
    UPDATE "AnalyticsEvent" SET client = 'bot',
      props = COALESCE(props, '{}'::jsonb) || jsonb_build_object('retroTag', ${tag}::text)
    WHERE kind <> 'PAGE_VIEW' AND client = 'browser'
      AND "userId" IS NULL AND "anonId" IS NULL AND "refHost" IS NULL
      AND "uaHash" = ANY(${convicted}::text[])`;
  console.log(`tagged ${beacons} non-PAGE_VIEW beacon rows`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());

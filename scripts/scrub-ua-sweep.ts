// scripts/scrub-ua-sweep.ts
//
// Retro-tag stealth-crawler sweep traffic as client='bot' using the
// forensic uaHash/ipHash fingerprints (added 18 Aug 2026).
//
// A row is tagged ONLY when ALL of these hold:
//   • unidentified browser PAGE_VIEW (no userId, no anonId)
//   • carries no referrer (crawlers essentially never send Referer)
//   • its uaHash belongs to a MACHINE-SHAPED cluster:
//       - ≥3 views (enough to have a shape)
//       - 0 views with a referrer across the whole cluster
//       - ≤1.3 views per distinct IP (proxy rotation: one page per IP;
//         humans navigate — same IP, several views)
//
// Every tagged row gets props.retroTag stamped so the action is
// auditable and reversible (`WHERE props->>'retroTag' = ...`).
// Safe to re-run any time (idempotent — already-tagged rows are
// client='bot' and no longer match). Run during stats pulls while a
// sweep is active; harmless when none is.
//
// USAGE: npx tsx --env-file=.env.local scripts/scrub-ua-sweep.ts
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const tag = `ua-sweep-${new Date().toISOString().slice(0, 10)}`;
  const n = await p.$executeRaw`
    UPDATE "AnalyticsEvent" SET client = 'bot',
      props = COALESCE(props, '{}'::jsonb) || jsonb_build_object('retroTag', ${tag}::text)
    WHERE kind = 'PAGE_VIEW' AND client = 'browser'
      AND "userId" IS NULL AND "anonId" IS NULL
      AND "refHost" IS NULL AND "uaHash" IN (
        SELECT "uaHash" FROM "AnalyticsEvent"
        WHERE kind = 'PAGE_VIEW' AND client = 'browser'
          AND "userId" IS NULL AND "anonId" IS NULL AND "uaHash" IS NOT NULL
        GROUP BY 1
        HAVING COUNT(*) >= 3
          AND COUNT(*) FILTER (WHERE "refHost" IS NOT NULL) = 0
          AND COUNT(*)::numeric / GREATEST(COUNT(DISTINCT "ipHash"), 1) <= 1.3
      )`;
  console.log(`retro-tagged ${n} sweep rows as client='bot' (marker: ${tag})`);
  // JS-executing crawlers fire non-PAGE_VIEW beacons too (CHAT_OPENED on
  // /chat, CTA_CLICKED…). Tag any unidentified browser event whose uaHash
  // is already convicted via the PAGE_VIEW cluster rule above.
  const n2 = await p.$executeRaw`
    UPDATE "AnalyticsEvent" SET client = 'bot',
      props = COALESCE(props, '{}'::jsonb) || jsonb_build_object('retroTag', ${tag}::text)
    WHERE kind <> 'PAGE_VIEW' AND client = 'browser'
      AND "userId" IS NULL AND "anonId" IS NULL AND "refHost" IS NULL
      AND "uaHash" IN (
        SELECT DISTINCT "uaHash" FROM "AnalyticsEvent"
        WHERE props->>'retroTag' LIKE 'ua-sweep-%' AND "uaHash" IS NOT NULL
      )`;
  console.log(`retro-tagged ${n2} non-PAGE_VIEW beacon rows from convicted sweep UAs`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());

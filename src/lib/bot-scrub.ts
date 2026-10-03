// Shared high-confidence botnet scrub — used by the hourly cron
// (/api/cron/scrub-bots) and the manual CLI (scripts/scrub-ua-sweep.ts).
//
// Removes ONLY unmistakable botnet traffic and keeps everything ambiguous
// as human (founder rule, 20 Aug 2026: "if you are SURE about a bot move
// it away, keep the rest as human"). See scripts/scrub-ua-sweep.ts header
// for the full rationale. Self-correcting: each run RESTORES rows a prior
// run tagged whose cluster no longer meets the bar, then tags those that
// do. props.retroTag keeps every action auditable/reversible.
//
// Three rules, run in this order: the botnet rule (one page per address,
// 15+ addresses on one user agent), the deep-reader rule (3 Oct 2026: one
// user agent, many addresses, all day, several different deep pages per
// address; remembered on every day once convicted on 3 days) and the
// login-redirect phantoms. Each only tags (client = 'bot'); nothing is
// ever deleted.

import { Prisma } from "@prisma/client";

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
  /** Deep-reader rule (3 Oct 2026): (user agent, IST day) clusters convicted. */
  readerDays: number;
  /** User agents convicted on READER_MEMORY_MIN_DAYS+ days (tagged on every day). */
  readerAgents: number;
  /** Page views tagged / restored by the deep-reader rule this run. */
  readerTagged: number;
  readerRestored: number;
}

// ── Entry pages (the human-safety list) ───────────────────────────────
// A real person typing the URL or opening a shared link lands on the home
// page, an exam hub or one of a few entry pages, so rows there are never
// tagged by a user-agent rule (review 22 Aug 2026, see the botnet rule
// below). The botnet rule spells the same list inline in its SQL;
// tests/unit/bot-scrub.test.ts pins the two equal. src/lib/learner-count.ts
// uses it too (pre-fingerprint landings).
export const ENTRY_PATHS = ["/", "/ask", "/jobs-map", "/live-test", "/current-affairs", "/aptitude", "/find-your-exam"] as const;
export const ENTRY_HUB_RE = "^/exams/[^/]+/?$";

/** SQL: is the page (query string dropped) an entry page? pathExpr is a column expression, never user input. */
export function entryPathSql(pathExpr: string): string {
  const p = `split_part(COALESCE(${pathExpr},''),'?',1)`;
  return `(${p} IN (${ENTRY_PATHS.map((x) => `'${x}'`).join(", ")}) OR ${p} ~ '${ENTRY_HUB_RE}')`;
}

/** The same test in JS (tests and read-only scripts). */
export function isEntryPath(path: string | null | undefined): boolean {
  const p = (path ?? "").split("?")[0];
  return (ENTRY_PATHS as readonly string[]).includes(p) || new RegExp(ENTRY_HUB_RE).test(p);
}

// ── Deep-reader rule (3 Oct 2026) ─────────────────────────────────────
// The botnet rule above convicts a user agent only when every address
// fetches about one page (≤ 1.5 views per IP). On 1–2 Oct 2026 an
// automated reader escaped it: one user agent, 52 addresses on 2 Oct, 173
// different deep pages in 181 views, never a referrer, never a tag, never
// the cookie back (so no identity), 7–8 pages an hour round the clock
// (RCA 2 Oct 2026). It made 3.5 views per address, so the botnet rule
// called it human and the strip counted 176 "learners" for it in one day.
//
// The rule, per (user agent, IST day), over identity-less page views with
// no referrer and no tag (rows this rule tagged before are kept in the
// count so a verdict does not flip on its own tags):
//   • at least READER_MIN_IPS distinct addresses (ipHash);
//   • pages in at least READER_MIN_HOURS distinct IST clock hours;
//   • deep pages (not an entry page) at least READER_MIN_DEEP_PER_IP times
//     the number of addresses — each address came back for more pages
//     without ever keeping the cookie a browser keeps.
// A person who arrives with no referrer leaves ONE identity-less row (the
// cookie comes back from the second page on), so people sit at about 1.0
// deep page per address; the reader sat at 1.5–3.6 on its heavy days.
// Thresholds picked on 3 Oct 2026 from every fingerprinted row since 18 Aug
// (scripts/tmp-strip-4.ts, read-only): the rule convicts one user agent only
// — the reader — on 6 days (22, 24, 25 Sep, 1, 2, 3 Oct). Of all other
// (agent, day) groups with 10+ addresses and 12+ hours, the most deep pages
// per address is 1.14; no other agent reaches 1.5 with more than 2 addresses.
// The grid 8–15 addresses × 8–12 hours × 1.3–2.0 convicts no other agent.
// A 4th condition (review, 3 Oct 2026) guards against a privacy or in-app
// browser that drops the cookie on every page: the day's deep pages are at
// least READER_MIN_DISTINCT_PAGE_SHARE distinct pages (query string dropped).
// People cluster on popular pages; the reader read a new page almost every
// time (823 different pages in 846 views, 5 Sep – 3 Oct 2026; 94.9–100% on
// each of its 6 convicted days, so the condition drops none of them). Other
// agents' (agent, day) groups with 5+ deep rows sit at a median of 100% but a
// 10th percentile of 17% (scripts/tmp-strip-8.ts, 3 Oct 2026).
// What is tagged: the deep-page rows of a convicted (agent, day) and of the
// same agent on the NEXT IST day (a reader that runs on past midnight is
// tagged from 00:00, not only once the new day has 12 hours of it).
// AGENT MEMORY (review, 3 Oct 2026): judged one day at a time, the reader
// stayed counted on its lighter days (5–21, 27–28 Sep: 1.0–1.48 deep pages
// per address; 322 page views, 268 device-days) and, on a first day back, until its
// 12th hour (1 Oct: from 11:56 to about 22:00 IST). So once a user agent is
// convicted on READER_MEMORY_MIN_DAYS or more days, its deep rows in the pool
// are tagged on EVERY day, from the first row of a new day. Evidence that
// this agent is one machine, not a browser shared by people: 846 rows on 823
// different pages, 0 referrers, 110 addresses, first seen 5 Sep 2026, and no
// row at all on 29–30 Sep — a browser version real people use is never
// silent for two days. To switch the memory off, raise
// READER_MEMORY_MIN_DAYS (e.g. to 1000): the next run restores those rows.
// Effect, read-only at 12:40 IST on 3 Oct 2026 (scripts/tmp-strip-8.ts):
// one user agent, 833 page views tagged (514 device-days), against 511 rows
// (246 device-days) for the day rule alone — the extra 322 rows are its
// lighter days, 5–21 and 27–28 Sep. All within the last 30 days. None has an
// identity, a referrer, a tag, another event kind, another rule's tag or an
// entry page; none is on a sign-in-gated page (so the login-redirect rule
// gains no anchors); 17 are Class 8-12 school pages, all this agent's.
// Entry pages are never tagged (the human-safety list above). Rows with an
// identity, a referrer or a tag never enter the rule, nor does any other
// event kind. Only tags, never deletes; props.retroTag = deep-reader-<date>
// keeps every tag auditable, and each run first restores every row this
// rule tagged that no longer qualifies (self-correcting, like the rest).
export const READER_TAG_PREFIX = "deep-reader";
export const READER_MIN_IPS = 10;
export const READER_MIN_HOURS = 12;
export const READER_MIN_DEEP_PER_IP = 1.5;
export const READER_MIN_DISTINCT_PAGE_SHARE = 0.9;
export const READER_MEMORY_MIN_DAYS = 3;

/** The rule's CTEs: reader_pool (the rows it looks at), reader_days (the
 *  convicted user agent + IST day pairs) and reader_agents (user agents
 *  convicted on READER_MEMORY_MIN_DAYS+ days). */
function readerCtesSql(): Prisma.Sql {
  return Prisma.sql`
    WITH reader_pool AS (
      SELECT id, "uaHash" AS ua, "ipHash" AS ip,
        ("createdAt" + interval '330 minutes')::date AS d,
        EXTRACT(HOUR FROM "createdAt" + interval '330 minutes') AS h,
        NOT ${Prisma.raw(entryPathSql("path"))} AS deep,
        split_part(COALESCE(path,''),'?',1) AS page
      FROM "AnalyticsEvent"
      WHERE kind = 'PAGE_VIEW' AND "userId" IS NULL AND "anonId" IS NULL
        AND "refHost" IS NULL AND "utmSource" IS NULL
        AND "uaHash" IS NOT NULL AND "ipHash" IS NOT NULL
        AND (client = 'browser' OR (client = 'bot' AND props->>'retroTag' LIKE ${READER_TAG_PREFIX + "%"}))
    ), reader_days AS (
      SELECT ua, d FROM reader_pool GROUP BY ua, d
      HAVING COUNT(DISTINCT ip) >= ${Prisma.raw(String(READER_MIN_IPS))}
        AND COUNT(DISTINCT h) >= ${Prisma.raw(String(READER_MIN_HOURS))}
        AND COUNT(*) FILTER (WHERE deep) >= ${Prisma.raw(String(READER_MIN_DEEP_PER_IP))} * COUNT(DISTINCT ip)
        AND COUNT(DISTINCT page) FILTER (WHERE deep) >= ${Prisma.raw(String(READER_MIN_DISTINCT_PAGE_SHARE))} * COUNT(*) FILTER (WHERE deep)
    ), reader_agents AS (
      SELECT ua FROM reader_days GROUP BY ua HAVING COUNT(*) >= ${Prisma.raw(String(READER_MEMORY_MIN_DAYS))}
    )`;
}

/** SQL (Prisma.Sql): ids of the page views the deep-reader rule tags now —
 *  deep pages of an agent convicted on READER_MEMORY_MIN_DAYS+ days (any
 *  day), or of a convicted (agent, day), or of the same agent the day after.
 *  Read-only on its own; runBotScrub wraps it in the restore and the tag. */
export function readerQualifyingIdsSql(): Prisma.Sql {
  return Prisma.sql`${readerCtesSql()}
    SELECT rp.id FROM reader_pool rp
    WHERE rp.deep AND (
      rp.ua IN (SELECT ua FROM reader_agents)
      OR EXISTS (SELECT 1 FROM reader_days rd WHERE rd.ua = rp.ua AND (rd.d = rp.d OR rd.d = rp.d - 1))
    )`;
}

/** SQL (Prisma.Sql): how many (agent, day) pairs the rule convicts now (n),
 *  and how many agents it remembers (agents). Read-only. */
export function readerDaysCountSql(): Prisma.Sql {
  return Prisma.sql`${readerCtesSql()}
    SELECT (SELECT COUNT(*) FROM reader_days)::int AS n, (SELECT COUNT(*) FROM reader_agents)::int AS agents`;
}

/** One identity-less page view as the JS mirror of the rule sees it. */
export interface ReaderRow {
  id: string;
  kind: string;
  userId: string | null;
  anonId: string | null;
  refHost: string | null;
  utmSource: string | null;
  uaHash: string | null;
  ipHash: string | null;
  client: string | null;
  retroTag?: string | null;
  path: string | null;
  createdAt: Date;
}

const IST_MS = 5.5 * 3600_000;
const istDay = (at: Date) => new Date(at.getTime() + IST_MS).toISOString().slice(0, 10);
const istHour = (at: Date) => new Date(at.getTime() + IST_MS).getUTCHours();
const dayBefore = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

function inReaderPool(r: ReaderRow): boolean {
  return (
    r.kind === "PAGE_VIEW" && r.userId === null && r.anonId === null && r.refHost === null && r.utmSource === null &&
    r.uaHash !== null && r.ipHash !== null &&
    (r.client === "browser" || (r.client === "bot" && (r.retroTag ?? "").startsWith(READER_TAG_PREFIX)))
  );
}

/** JS mirror of readerQualifyingIdsSql (tests and read-only scripts): the
 *  convicted "ua|day" keys, the remembered agents and the ids the rule tags. */
export function readerVerdict(rows: readonly ReaderRow[]): { days: Set<string>; agents: Set<string>; ids: Set<string> } {
  const pool = rows.filter(inReaderPool);
  const g = new Map<string, { ua: string; ips: Set<string>; hours: Set<number>; deep: number; pages: Set<string> }>();
  for (const r of pool) {
    const k = `${r.uaHash}|${istDay(r.createdAt)}`;
    const c = g.get(k) ?? { ua: r.uaHash!, ips: new Set<string>(), hours: new Set<number>(), deep: 0, pages: new Set<string>() };
    c.ips.add(r.ipHash!);
    c.hours.add(istHour(r.createdAt));
    if (!isEntryPath(r.path)) {
      c.deep++;
      c.pages.add((r.path ?? "").split("?")[0]);
    }
    g.set(k, c);
  }
  const days = new Set<string>();
  const perAgent = new Map<string, number>();
  for (const [k, c] of g) {
    if (
      c.ips.size >= READER_MIN_IPS &&
      c.hours.size >= READER_MIN_HOURS &&
      c.deep >= READER_MIN_DEEP_PER_IP * c.ips.size &&
      c.pages.size >= READER_MIN_DISTINCT_PAGE_SHARE * c.deep
    ) {
      days.add(k);
      perAgent.set(c.ua, (perAgent.get(c.ua) ?? 0) + 1);
    }
  }
  const agents = new Set([...perAgent].filter(([, n]) => n >= READER_MEMORY_MIN_DAYS).map(([ua]) => ua));
  const ids = new Set<string>();
  for (const r of pool) {
    if (isEntryPath(r.path)) continue;
    const d = istDay(r.createdAt);
    if (agents.has(r.uaHash!) || days.has(`${r.uaHash}|${d}`) || days.has(`${r.uaHash}|${dayBefore(d)}`)) ids.add(r.id);
  }
  return { days, agents, ids };
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

  // The pool keeps rows the deep-reader rule tagged (3 Oct 2026), so this
  // verdict is exactly what it was before that rule existed (checked 3 Oct:
  // 83 agents convicted either way).
  const convictedRows = await p.$queryRaw<Array<{ uaHash: string }>>`
    SELECT "uaHash" FROM "AnalyticsEvent"
    WHERE kind = 'PAGE_VIEW' AND "userId" IS NULL AND "anonId" IS NULL AND "uaHash" IS NOT NULL
      AND (client = 'browser' OR (client = 'bot' AND (props->>'retroTag' LIKE 'ua-sweep%' OR props->>'retroTag' LIKE ${READER_TAG_PREFIX + "%"})))
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

  let tagged = 0;
  let beacons = 0;
  if (convicted.length > 0) {
    tagged = await p.$executeRaw`
    UPDATE "AnalyticsEvent" SET client = 'bot',
      props = COALESCE(props, '{}'::jsonb) || jsonb_build_object('retroTag', ${tag}::text)
    WHERE kind = 'PAGE_VIEW' AND client = 'browser'
      AND "userId" IS NULL AND "anonId" IS NULL AND "refHost" IS NULL
      AND "uaHash" = ANY(${convicted}::text[])
      AND NOT (
        split_part(COALESCE(path,''),'?',1) IN ('/', '/ask', '/jobs-map', '/live-test', '/current-affairs', '/aptitude', '/find-your-exam')
        OR split_part(COALESCE(path,''),'?',1) ~ '^/exams/[^/]+/?$'
      )`;

    beacons = await p.$executeRaw`
    UPDATE "AnalyticsEvent" SET client = 'bot',
      props = COALESCE(props, '{}'::jsonb) || jsonb_build_object('retroTag', ${tag}::text)
    WHERE kind <> 'PAGE_VIEW' AND client = 'browser'
      AND "userId" IS NULL AND "anonId" IS NULL AND "refHost" IS NULL
      AND "uaHash" = ANY(${convicted}::text[])`;
  }

  // DEEP-READER RULE (3 Oct 2026, see above) — restore first, then tag. It
  // runs after the botnet tagging (so it never claims a row the older rule
  // takes) and before the login-redirect tagging (so this hour's reader rows
  // are already bots when that rule looks for its anchors). Every run, even
  // when the botnet rule convicts nothing.
  const readerTag = `${READER_TAG_PREFIX}-${new Date().toISOString().slice(0, 10)}`;
  const readerRestored = await p.$executeRaw`
    UPDATE "AnalyticsEvent" SET client = 'browser', props = props - 'retroTag'
    WHERE client = 'bot' AND props->>'retroTag' LIKE ${READER_TAG_PREFIX + "%"}
      AND id NOT IN (${readerQualifyingIdsSql()})`;
  const readerTagged = await p.$executeRaw`
    UPDATE "AnalyticsEvent" SET client = 'bot',
      props = COALESCE(props, '{}'::jsonb) || jsonb_build_object('retroTag', ${readerTag}::text)
    WHERE client = 'browser' AND id IN (${readerQualifyingIdsSql()})`;
  const [readerDaysRow] = await p.$queryRaw<Array<{ n: number; agents: number }>>`${readerDaysCountSql()}`;
  const reader = {
    readerDays: Number(readerDaysRow?.n ?? 0),
    readerAgents: Number(readerDaysRow?.agents ?? 0),
    readerTagged: Number(readerTagged),
    readerRestored: Number(readerRestored),
  };

  if (convicted.length === 0) {
    return { convicted: 0, restored: Number(restored), tagged: 0, beacons: 0, redirects: 0, restoredRedirects: Number(restoredRedirects), ...reader };
  }

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
    ...reader,
  };
}

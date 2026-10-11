// People-shaped user agents are not "sure bots" (11 Oct 2026, measurement build
// "after ChatGPT dropped link tags"). The condition the bot scrub's botnet rule
// (src/lib/bot-scrub.ts runBotScrub) adds once the patch in the build's
// patches folder is applied; until then only read-only scripts use it
// (scripts/restore-people-shaped-agents-2026-10.ts, scripts/tmp-latest-stats.ts).
//
// THE PROBLEM. The botnet rule convicts a user agent with 15+ addresses, about
// one page per address and never a referrer, over every identity-less page view
// it ever made, then tags its rows on every page except the entry pages (home,
// hub roots, a few entry pages). Since 16 Aug / 18 Sep an identity-less row can
// no longer carry a referrer or a tag (those get an id on the first hit), so the
// rule reduces to "15+ addresses, one page each". That is also exactly what
// people look like when they arrive on a popular browser build with no tag and
// no referrer: the cookie comes back from their 2nd event, so each leaves ONE
// identity-less row. Chrome sends one reduced user-agent string for every
// Android phone on a version ("Linux; Android 10; K ... Chrome/154.0.0.0
// Mobile"), so one hash is every phone on that Chrome.
// From 9 Oct 2026 ChatGPT's links carry no tag and no referrer, so its visitors
// land like that, and the rule convicted the phone builds they use.
//
// THE EVIDENCE (read SELECT-only on 11 Oct 2026, 9 Oct 00:00 IST to ~21:00 IST;
// growth-oct10/oct11/measure-untagged/probe/probe1-9). The user-agent hashes
// were matched to public browser strings by hashing those strings the way the
// analytics route does (keyed HMAC; no raw UA is stored or printed):
//   • The 9 Oct "top signature" is Android Chrome 154 (phone). Its 39 rows the
//     scrub tagged since 9 Oct (16 on /exams/{CODE}/build-mock): 39 addresses,
//     3% at night (00-06 IST); 82% were followed within 15 minutes by a NEW
//     browser id on the same exam or page (chance, measured an hour earlier: 0%),
//     after a median 12 s; 10 of those browsers signed up (9 from build-mock
//     landings). Its 70 hub rows the scrub keeps: 37% followed, 11 sign-ups.
//   • The crawlers it rightly convicts: a six-agent sweep on 11 Oct (Mac and
//     Windows Chrome 148-150, 1,099 rows, 1,029 addresses, 28% at night, 92%
//     different pages, 2% followed against 1% chance, 0 sign-ups); the /chat
//     crawler (Linux Chrome 150) and the deep reader (3% followed, 0 sign-ups).
//   • People with no tag on other builds (132 rows): 9% at night, 31% followed,
//     8 sign-ups.
// Over each convicted agent's whole pool (94 agents convicted on 11 Oct):
//   • the crawlers land on entry pages 0-18% of the time (no agent kept
//     convicted is above 33%) and 18-31% of their rows are at night;
//   • the phone builds (Android Chrome 149-154, Samsung Internet 30, iPhone
//     Safari) and current desktop Chrome/Edge 152-154 land on entry pages 48-84%
//     of the time, with 0-10% at night.
//
// THE CONDITION (narrowest found). An agent that meets the botnet bar is still
// NOT convicted when BOTH hold over its pool:
//   • at least RELEASE_MIN_ENTRY_SHARE (40%) of its rows are on entry pages —
//     people land where links point (hubs, home); crawlers sweep deep pages;
//   • under RELEASE_MAX_NIGHT_SHARE (20%) of its rows are 00:00-05:59 IST —
//     people sleep; the crawlers run round the clock (18-31%).
// Effect on 11 Oct 2026: 94 → 75 convicted agents; 19 released, all phone or
// people-shaped builds; 451 page views (67 since 9 Oct) and 153 beacons, back
// to 18 Aug, go back to human on the patched scrub's first run (its own
// restore step). Kept convicted by the night condition: Windows Chrome 144 (45%
// entry, 29% night) and 2 unmatched agents (82 and 17 rows). No crawler named
// above is released; of the 154 /chat rows the scrub tagged in the 14 days to
// 11 Oct, 2 are on a released agent (Windows Edge 154). Side effects, by the
// same restore: a released agent leaves the guest tutor's convicted list
// (src/lib/db/convicted-agents.ts reads ua-sweep tags of the last 30 days), and
// a /login phantom anchored on a restored row goes back to human.
// Cost: a crawler that hides behind a phone build and lands mostly on hubs
// stays human on its deep rows until it moves that build under 40% / over 20%;
// its hub rows were never tagged anyway.

/** The botnet bar — bot-scrub.ts MIN_IPS and MAX_VIEWS_PER_IP (private there;
 *  tests/unit/botnet-release.test.ts pins them equal to its source). */
export const BOTNET_MIN_IPS = 15;
export const BOTNET_MAX_VIEWS_PER_IP = 1.5;
/** The deep-reader rule's tag prefix (bot-scrub.ts READER_TAG_PREFIX; pinned equal by the test). */
const READER_TAG = "deep-reader";

/** At least this share of an agent's pool rows on entry pages … */
export const RELEASE_MIN_ENTRY_SHARE = 0.4;
/** … and under this share of them at night (IST hours 0-5), and it is not convicted. */
export const RELEASE_MAX_NIGHT_SHARE = 0.2;
/** Night = IST clock hours before this one. */
export const NIGHT_END_HOUR_IST = 6;

/** SQL (a HAVING condition over the botnet pool's rows, columns path and
 *  "createdAt"): true when the agent is people-shaped. entrySql is
 *  bot-scrub's entryPathSql("path") — passed in, so this file does not import
 *  bot-scrub (bot-scrub imports this file once patched). */
export function peopleShapedHavingSql(entrySql: string): string {
  return (
    `(COUNT(*) FILTER (WHERE ${entrySql}) >= ${RELEASE_MIN_ENTRY_SHARE} * COUNT(*)` +
    ` AND COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM "createdAt" + interval '330 minutes') < ${NIGHT_END_HOUR_IST}) < ${RELEASE_MAX_NIGHT_SHARE} * COUNT(*))`
  );
}

/** SQL (a whole SELECT, column ua) over the same pool and bar as runBotScrub's
 *  conviction query: "released" = the agents the bar convicts today that the
 *  release spares; "convicted" = the agents the PATCHED scrub convicts (bar
 *  and not people-shaped). For read-only scripts (the stats table, the
 *  restore script's plan); entrySql as above. */
export function botnetAgentsSql(entrySql: string, which: "released" | "convicted"): string {
  return `SELECT "uaHash" AS ua FROM "AnalyticsEvent"
    WHERE kind = 'PAGE_VIEW' AND "userId" IS NULL AND "anonId" IS NULL AND "uaHash" IS NOT NULL
      AND (client = 'browser' OR (client = 'bot' AND (props->>'retroTag' LIKE 'ua-sweep%' OR props->>'retroTag' LIKE '${READER_TAG}%')))
    GROUP BY "uaHash"
    HAVING COUNT(DISTINCT "ipHash") >= ${BOTNET_MIN_IPS}
      AND COUNT(*) FILTER (WHERE "refHost" IS NOT NULL) = 0
      AND COUNT(*)::numeric / GREATEST(COUNT(DISTINCT "ipHash"), 1) <= ${BOTNET_MAX_VIEWS_PER_IP}
      AND ${which === "convicted" ? "NOT " : ""}${peopleShapedHavingSql(entrySql)}`;
}

/** SQL (a whole SELECT, column ua): user agents the deep-reader rule has tagged (any row, any day). */
export function readerAgentsSql(): string {
  return `SELECT DISTINCT "uaHash" AS ua FROM "AnalyticsEvent" WHERE client = 'bot' AND props->>'retroTag' LIKE '${READER_TAG}%' AND "uaHash" IS NOT NULL`;
}

const IST_MS = 5.5 * 3600_000;
const istHour = (at: Date) => new Date(at.getTime() + IST_MS).getUTCHours();

/** JS mirror of peopleShapedHavingSql over one agent's pool rows (tests and read-only scripts). */
export function isPeopleShaped(
  rows: ReadonlyArray<{ path: string | null; createdAt: Date }>,
  isEntry: (path: string | null) => boolean,
): boolean {
  if (rows.length === 0) return false;
  const entry = rows.filter((r) => isEntry(r.path)).length;
  const night = rows.filter((r) => istHour(r.createdAt) < NIGHT_END_HOUR_IST).length;
  return entry >= RELEASE_MIN_ENTRY_SHARE * rows.length && night < RELEASE_MAX_NIGHT_SHARE * rows.length;
}

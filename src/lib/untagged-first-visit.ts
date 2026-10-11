// Untagged first visits (11 Oct 2026, measurement build "after ChatGPT dropped
// link tags"). Read-only helpers for the stats scripts (scripts/tmp-latest-
// stats.ts); nothing on the site imports this file.
//
// WHY. Checked 11 Oct 2026 in the founder's own ChatGPT: every link ChatGPT
// cites (shishya.in's and competitors') now carries NO utm_source and
// rel="noopener noreferrer". A ChatGPT visitor therefore arrives with no tag
// and no referrer. The analytics route (src/app/api/analytics/route.ts) gives
// a cookie-less first hit an id only when it carries a tag or an outside
// referrer, so this visitor's FIRST page is stored with no id at all (an
// "untagged landing"; the cookie is issued in that response):
//   • a one-page visitor is never a person, so never a walk-in;
//   • a multi-page visitor is a person from page 2, but page 2 has no outside
//     trail, so never a walk-in either.
// The untagged landing row is the one record of the arrival. It is one row
// per cookie-less browser (the cookie comes back from the 2nd event), and its
// two fingerprints (uaHash, ipHash) are the only grouping keys it has.
//
// THE RULE.
//   • Untagged first visit = a 'browser' PAGE_VIEW with no account, no browser
//     id, no utm_source and no referrer host, on a first-visit page.
//   • First-visit pages = exam hub roots /exams/{CODE} (+ the /hi and /te
//     twins), and the PYQ, practice (build-mock, quiz, mock) and topic pages
//     under /exams/{CODE}/. That is the frozen ChatGPT landing pattern of
//     definitions.md (hub, PYQ, practice) plus topic pages; the query string
//     is ignored.
//   • People-level: rows are counted once per (uaHash, ipHash) in the window.
//     One device on one connection is one person, so a cookie-blocking
//     browser that leaves one such row per page counts once. A row missing a
//     fingerprint counts on its own. Two people on one phone browser build
//     behind one carrier address would merge (none seen 9-11 Oct 2026: 109
//     rows of the top build came from 109 addresses).
//   • Sure-bot agents are left out, hub rows included: a user agent the bot
//     scrub convicts (the botnet rule as patched on 11 Oct — bar met and not
//     people-shaped, src/lib/botnet-release.ts — or any agent the deep-reader
//     rule has tagged). The scrub never tags hub roots (its human-safety
//     list), so a crawler's hub hits stay 'browser' rows: on 8 Oct all 36 of
//     the day's untagged hub/PYQ/practice/topic people were such hits (11 at
//     night), and on 11 Oct 25 of 81 came from the six-agent desktop sweep.
//     Cost: a real person on that exact desktop build who lands untagged on
//     a hub is dropped too — the cost the scrub already accepts on deep pages.
// It is NOT "new people": a returning visitor with a cleared or expired
// cookie, or in a private tab, lands the same way (about 5-15 a day on these
// pages before 9 Oct, sure-bot agents left out). Read it as arrivals, like
// definitions.md's arrivals line.
//
// Bot-tagged rows are not counted: the hourly scrub (src/lib/bot-scrub.ts)
// tags a convicted user agent's non-entry pages 'bot'. From 9 Oct that also
// takes phone-browser landings on practice/PYQ/topic pages (see
// src/lib/botnet-release.ts); the stats script prints those apart until the
// patched scrub puts them back.

/** The hub root (and its /hi, /te twins): /exams/{CODE} with an optional trailing slash. */
export const FIRST_VISIT_HUB_RE = "^(/(hi|te))?/exams/[A-Z][A-Z0-9_]*/?$";
/** PYQ, practice and topic pages under an exam (and the /hi, /te prefixed twins). */
export const FIRST_VISIT_DEEP_RE = "^(/(hi|te))?/exams/[A-Z][A-Z0-9_]*/(pyq|build-mock|quiz|mocks?|topics)(/|$)";

/** True for a first-visit page (query string ignored). */
export function isFirstVisitPath(path: string | null | undefined): boolean {
  const p = (path ?? "").split("?")[0];
  return new RegExp(FIRST_VISIT_HUB_RE).test(p) || new RegExp(FIRST_VISIT_DEEP_RE).test(p);
}

/** SQL: is the page a first-visit page? pathExpr is a column expression, never user input. */
export function firstVisitPathSql(pathExpr: string): string {
  const p = `split_part(COALESCE(${pathExpr},''),'?',1)`;
  return `(${p} ~ '${FIRST_VISIT_HUB_RE}' OR ${p} ~ '${FIRST_VISIT_DEEP_RE}')`;
}

/** One analytics row as the rule sees it. */
export interface FirstVisitRow {
  id: string;
  kind: string;
  client: string | null;
  userId: string | null;
  anonId: string | null;
  utmSource: string | null;
  refHost: string | null;
  uaHash: string | null;
  ipHash: string | null;
  path: string | null;
}

/** True when the row is an untagged first visit (see the header). */
export function isUntaggedFirstVisit(r: Omit<FirstVisitRow, "id" | "uaHash" | "ipHash">): boolean {
  return (
    r.kind === "PAGE_VIEW" &&
    r.client === "browser" &&
    r.userId === null &&
    r.anonId === null &&
    (r.utmSource ?? "") === "" &&
    (r.refHost ?? "") === "" &&
    isFirstVisitPath(r.path)
  );
}

/** The person key of an untagged first visit: its (uaHash, ipHash); a row missing either counts on its own. */
export function firstVisitPersonKey(r: Pick<FirstVisitRow, "id" | "uaHash" | "ipHash">): string {
  return r.uaHash && r.ipHash ? `${r.uaHash}|${r.ipHash}` : `row:${r.id}`;
}

/** People-level count of the untagged first visits among rows, leaving out
 *  rows on sure-bot agents (the JS mirror of the stats script's query). */
export function countUntaggedFirstVisitPeople(rows: readonly FirstVisitRow[], sureBotAgents: ReadonlySet<string> = new Set()): number {
  return new Set(
    rows.filter((r) => isUntaggedFirstVisit(r) && !(r.uaHash !== null && sureBotAgents.has(r.uaHash))).map(firstVisitPersonKey),
  ).size;
}

/** SQL: the row is not on a sure-bot agent; agentsSql is a SELECT of one column ua. A row with no uaHash stays. */
export function notOnAgentsSql(a: string, agentsSql: string): string {
  return `(${a}."uaHash" IS NULL OR ${a}."uaHash" NOT IN (${agentsSql}))`;
}

/** SQL: WHERE-clause predicate over alias a for an untagged first visit. */
export function untaggedFirstVisitWhereSql(a: string): string {
  return `(${a}.kind = 'PAGE_VIEW' AND ${a}.client = 'browser' AND ${a}."userId" IS NULL AND ${a}."anonId" IS NULL AND COALESCE(${a}."utmSource",'') = '' AND COALESCE(${a}."refHost",'') = '' AND ${firstVisitPathSql(`${a}.path`)})`;
}

/** SQL: the people-level person key over alias a (matches firstVisitPersonKey). */
export function firstVisitPersonKeySql(a: string): string {
  return `(CASE WHEN ${a}."uaHash" IS NOT NULL AND ${a}."ipHash" IS NOT NULL THEN ${a}."uaHash" || '|' || ${a}."ipHash" ELSE 'row:' || ${a}.id END)`;
}

/** Walk-ins counted the 11 Oct 2026 way: the old walk-ins (outside trail, new
 *  that day) plus the untagged first visits (people), even one-page ones. The
 *  two never hold the same arrival: the untagged landing has no id, and the
 *  same browser's later rows carry no outside trail, so they are never an old
 *  walk-in. The one overlap is a browser that lands untagged and comes back
 *  the same day from a tagged link or another site (counted twice; rare). */
export function walkInsWithUntagged(oldWalkIns: number, untaggedFirstVisitPeople: number): number {
  return oldWalkIns + untaggedFirstVisitPeople;
}

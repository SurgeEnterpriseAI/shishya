// The guest tutor's crawler hold (14 Oct 2026, Release 2, build kids-crawler).
//
// WHY. About 24 guest tutor turns a day reached the AI with no shishya_anon
// cookie (AnonTutorLog.anonId NULL), each just after an automated /chat page
// view. Read SELECT-only on 11 Oct 2026, 19:57 IST (scripts/measure-guest-
// seed-hold.ts), the 14 days before held 218 guest rows: 79 with the cookie,
// 139 without — 7 of those Class 8-12 school chats (logged without an id by
// design) and 132 others, of which:
//   • 131 came seconds after an identity-less /chat page view whose user
//     agent the bot scrub had CONVICTED at least 2 hours before the turn
//     (src/lib/bot-scrub.ts runBotScrub — 15+ addresses on one user agent,
//     about one page per address, never a referrer): 130 of those views carry
//     its ua-sweep tag, 1 came in the hour before the next run;
//   • 8 user agents in all (one of them 66 of the rows), first seen 5-29 Sep
//     2026, each seen from ~35-1,200 addresses at about one page each; no
//     view had a referrer or a utm tag;
//   • every one of the 131 messages is one of our own seed links' words
//     ("Walk me through these … practice questions" 33, "Give me 3 fastest
//     shortcuts" 19, "Go deeper on" 18 …, src/lib/landing-actions.ts's
//     "Tell me what I should know about …" 3), auto-sent at mount: the
//     failed ones were logged 0.6-0.9 s after the page view;
//   • they pass the client's navigator.webdriver hold (src/app/chat/
//     ChatInterface.tsx) and present a browser user agent, so classifyClient
//     (src/lib/client-class.ts) lets them through;
//   • the 132nd, spared, is a general question with no /chat page view on
//     record (28 Sep).
//
// THE RULE — the narrowest that stops them. A turn is HELD (no AI call, no
// row, nothing logged) only when ALL of these are true:
//   1. signed out — a signed-in student is never judged by their user agent;
//   2. the turn is a seed the chat sent by itself on page load (the client
//      marks that turn autoSeed: true) — a question a person typed or a
//      starter they tapped is never held;
//   3. the request carries no shishya_anon cookie — a guest who has loaded
//      any page before (the analytics beacon sets it) is never held;
//   4. its user agent's hash (src/lib/ua-fingerprint.ts, the analytics rows'
//      uaHash) is on the scrub's convicted list (src/lib/db/convicted-agents.ts:
//      user agents with a ua-sweep tag in the last 30 days — 41 today);
//   5. (review, 11 Oct 2026) the landing carried no campaign tag and no
//      outside referrer (taggedLanding — the middleware's own "trail" rule).
//      Why: the list also holds agents that tagged walk-ins use — 255
//      utm-tagged page views on 12 of the 41 listed agents in the 30 days to
//      11 Oct 2026 (228 utm_source=chatgpt.com, then copilot.com, perplexity;
//      read SELECT-only by scripts/measure-guest-seed-hold.ts); such a
//      walk-in carries no referrer and reads about one page per address, the
//      scrub's own signature. None of the 131 crawler turns had a utm tag or
//      a referrer, so this rule costs nothing and spares a walk-in who lands
//      straight on a seeded /chat.
// A real first-time guest is spared three times over: one who came from a
// tagged link or another site is never held (rule 5); a person who lands straight
// on a seeded /chat link from a browser that shares a convicted user agent
// sees their question waiting in the box with "press Send" — the seed is
// kept, unsent, exactly as the webdriver hold keeps it — and their Send is
// a typed turn (rule 2), which is never held. And a failed read of the list
// holds nothing (fails open: an error never stops a person).
// Effect on those 14 days: 131 of the 132 cookie-less non-school rows held
// (13, 43 and 26 on the busiest days, 29 Sep, 8 Oct and 11 Oct); spared: the
// 79 rows with the cookie and the general question above (rule 5 spares none
// of the 131: none had a utm tag or a referrer). A school chat's guest is
// judged by the same five rules.
//
// Pure: no Next, no DB — the route, the page and tests import it.

/** The analytics cookie (src/app/api/analytics/route.ts ANON_COOKIE). */
export const ANON_COOKIE = "shishya_anon";

/** The tag the bot scrub's botnet rule writes on a convicted agent's rows
 *  (src/lib/bot-scrub.ts: `ua-sweep-<date>`). A SQL LIKE pattern. */
export const CONVICTED_AGENT_TAG_LIKE = "ua-sweep%";

/** How far back the convicted list reads (an agent silent for 30 days drops off). */
export const CONVICTED_AGENT_WINDOW_DAYS = 30;

/** The route's refusal body ({ error }) for a held seed; the chat keeps the seed in the box. */
export const SEED_HELD_ERROR = "seed-held";

/** True when a Cookie header carries the analytics cookie with a value. */
export function hasAnonCookie(cookieHeader: string | null | undefined): boolean {
  if (typeof cookieHeader !== "string" || !cookieHeader) return false;
  const m = /(?:^|;\s*)shishya_anon=([^;]*)/.exec(cookieHeader);
  return !!m && m[1].trim().length > 0;
}

/** The campaign tags the middleware reads as a landing's trail (src/middleware.ts haveTrail). */
export const LANDING_TAGS = ["utm_source", "utm_medium", "utm_campaign"] as const;

const bareHost = (h: string) => h.trim().toLowerCase().replace(/^www\./, "");

/** Rule 5: true when the page was reached from a tagged link or from another
 *  site — the middleware's own trail rule (src/middleware.ts haveTrail): a
 *  utm_source / utm_medium / utm_campaign value, or a referrer whose host is
 *  neither this host nor shishya.in. A walk-in from ChatGPT, Google, WhatsApp
 *  or a share link; never one of the crawler's turns (see the header). A
 *  referrer that does not parse counts as none. */
export function taggedLanding(l: {
  /** The landing URL's query value for a name (null / undefined when absent). */
  param: (name: string) => string | null | undefined;
  referrer: string | null | undefined;
  /** This request's host (a Host header or location.host). */
  host: string | null | undefined;
}): boolean {
  if (LANDING_TAGS.some((t) => (l.param(t) ?? "").trim().length > 0)) return true;
  const ref = typeof l.referrer === "string" ? l.referrer.trim() : "";
  if (!ref) return false;
  let refHost: string;
  try {
    refHost = bareHost(new URL(ref).host);
  } catch {
    return false;
  }
  if (!refHost) return false;
  const self = typeof l.host === "string" ? bareHost(l.host) : "";
  return refHost !== self && refHost !== "shishya.in";
}

export interface SeedHoldInput {
  /** The caller is signed in. */
  signedIn: boolean;
  /** The client marked this turn as the seed it sent by itself on load. */
  autoSeed: boolean;
  /** Rule 5: the landing came from a tagged link or another site (taggedLanding). */
  taggedLanding?: boolean;
  /** The request carried the shishya_anon cookie. */
  anonCookie: boolean;
  /** The request's user-agent hash (uaFingerprint), or null. */
  uaHash: string | null;
  /** The scrub's convicted user-agent hashes; null when the read failed. */
  convicted: ReadonlySet<string> | null;
}

/** True when this guest turn is a convicted crawler's auto-sent seed (rules 1-5 above). */
export function guestSeedHold(i: SeedHoldInput): boolean {
  if (!seedHoldCandidate(i)) return false;
  if (!i.uaHash || !i.convicted) return false;
  return i.convicted.has(i.uaHash);
}

/** True when a held seed's own checks (1-3 and 5) apply — the convicted list
 *  is read only then, so a person with the cookie never waits on it. */
export function seedHoldCandidate(i: Pick<SeedHoldInput, "signedIn" | "autoSeed" | "anonCookie" | "taggedLanding">): boolean {
  return !i.signedIn && i.autoSeed && !i.anonCookie && i.taggedLanding !== true;
}

/** The read behind the list (SELECT only): the user agents the botnet rule
 *  tagged in the last `days` days. The scrub restores a user agent's tags on
 *  every run once it no longer meets the bar, so a tagged agent is a
 *  convicted one. Uses the "createdAt" index; no user input reaches it. */
export function convictedAgentsSql(days: number = CONVICTED_AGENT_WINDOW_DAYS): string {
  const d = Number.isInteger(days) && days > 0 && days <= 365 ? days : CONVICTED_AGENT_WINDOW_DAYS;
  return `SELECT DISTINCT "uaHash" FROM "AnalyticsEvent"
    WHERE "createdAt" > now() - interval '${d} days'
      AND client = 'bot' AND "uaHash" IS NOT NULL
      AND props->>'retroTag' LIKE '${CONVICTED_AGENT_TAG_LIKE}'`;
}

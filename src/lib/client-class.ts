// Browser-or-bot verdict on a request's User-Agent.
//
// 24 Sep 2026: moved here unchanged from src/app/api/analytics/route.ts so
// /api/chat can use the same verdict. JS-running crawlers load the
// /chat?seed=… links and the seed used to auto-fire a guest tutor turn for
// them: ~188 guest-tutor AI replies in September went to crawlers (182 of the
// 188 guest rows without an anonId came within 5 minutes of a client='bot'
// /chat page view). The guest tutor now refuses a 'bot' UA; signed-in
// students are never judged by their UA.
//
// A verdict, not a wall: analytics still RECORDS bot traffic (client='bot').
// A crawler with a spoofed browser UA reads as 'browser' here — the
// analytics route explains how identities stay crawler-proof regardless.

export type ClientClass = "browser" | "bot";

/** Automation / crawler user-agents (analytics, 31 Jul 2026). */
export const BOT_UA =
  /bot|crawl|spider|slurp|headless|phantomjs|puppeteer|playwright|selenium|scrapy|curl|wget|python-requests|python-httpx|aiohttp|axios|node-fetch|okhttp|java\/|go-http|libwww|lighthouse|pagespeed|gtmetrix|ahrefs|semrush|mj12|dotbot|petalbot|bytespider|dataforseo|screaming.?frog|netcraft|facebookexternalhit|preview|monitoring|uptime|pingdom|statuscake/i;

export function classifyClient(ua: string | null | undefined): ClientClass {
  if (!ua || ua.trim().length < 15) return "bot"; // empty/stub UA — no real browser sends this
  return BOT_UA.test(ua) ? "bot" : "browser";
}

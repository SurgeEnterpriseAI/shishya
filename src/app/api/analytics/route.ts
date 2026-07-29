// POST /api/analytics — ingest endpoint for first-party events.
//
// Body: { kind: EventKind, path?, props?, utmSource?, utmMedium?, utmCampaign? }
//
// Server attaches:
//   - userId from the session (if signed in)
//   - anonId from the shishya_anon cookie (rotating 30-day UUID), creating it if missing
//   - refHost parsed from the Referer header
//
// Behaviour:
//   - Always returns 204 No Content quickly (fire-and-forget)
//   - Swallows internal errors (analytics failures must not break user flows)
//   - Validates kind against the EventKind enum; rejects unknown kinds

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { recordEvent, type EventKind } from "@/lib/analytics";

export const runtime = "nodejs";

const ALLOWED: Set<EventKind> = new Set([
  "PAGE_VIEW",
  "SIGNUP",
  "VERIFICATION_SUBMITTED",
  "QUIZ_ATTEMPTED",
  "CHAPTER_COMPLETED",
  "SCHOLARSHIP_SAVED",
  "CHAT_OPENED",
  "CTA_CLICKED",
]);

const ANON_COOKIE = "shishya_anon";
const ANON_MAX_AGE_S = 30 * 24 * 3600;

// ── Bot filtering ─────────────────────────────────────────────────────
// Why this exists (29 Jul 2026): a JS-rendering crawler swept 526 pages
// in one hour. It executed our beacon but kept no cookies, so the API
// minted a FRESH anonId per page — 478 phantom "visitors" in a single
// hour, which made a flat day look like a 4× record. Two defences:
//
//   1. Known-automation user-agents are dropped outright.
//   2. Cookie-less requests are recorded WITHOUT minting a persistent
//      identity (anonId stays null → they count as views, never as
//      unique visitors). A real browser gets its cookie on the first
//      event and is counted normally from the second event onward.
//
// Deliberately conservative: we would rather under-count a visitor than
// let one crawler corrupt every growth number we make decisions on.
const BOT_UA =
  /bot|crawl|spider|slurp|headless|phantom|puppeteer|playwright|selenium|scrapy|curl|wget|python-requests|axios|http-client|node-fetch|okhttp|java\/|go-http|libwww|lighthouse|pagespeed|gtmetrix|ahrefs|semrush|mj12|dotbot|petalbot|dataforseo|screaming frog|preview|monitor|uptime|pingdom/i;

function looksAutomated(ua: string | null): boolean {
  if (!ua || ua.trim().length < 15) return true; // empty/stub UA = not a browser
  return BOT_UA.test(ua);
}

export async function POST(req: NextRequest) {
  let body: {
    kind?: string;
    path?: string;
    props?: Record<string, unknown>;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const kind = body.kind as EventKind | undefined;
  if (!kind || !ALLOWED.has(kind)) {
    return new NextResponse(null, { status: 204 });
  }

  // Defence 1 — drop known automation entirely (no row written).
  if (looksAutomated(req.headers.get("user-agent"))) {
    return new NextResponse(null, { status: 204 });
  }

  // Session is optional — anonymous events are allowed.
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;

  // Defence 2 — the identity cookie. A cookie-less request gets one
  // issued, but this FIRST event is stored with anonId = null so a
  // client that never returns the cookie (crawlers) can never inflate
  // the unique-visitor count. Real browsers send it back immediately
  // and are counted from their next event on.
  const existingAnon = req.cookies.get(ANON_COOKIE)?.value ?? null;
  const anonId = existingAnon;
  const issuedAnon = existingAnon ?? crypto.randomUUID();
  const shouldSetCookie = !existingAnon;
  // Once a user is signed in, we still write anonId for the audit trail
  // BUT prefer userId so dashboard joins are clean. Cookie persists either way.

  // Parse referrer host (cheap GROUP BY signal). Prefer the CLIENT-sent
  // document.referrer from the body — the fetch's own Referer header is
  // always our page URL (same-host → dropped), which silently blinded
  // channel attribution for weeks. Header kept as fallback.
  let refHost: string | null = null;
  const referer = (typeof body.referrer === "string" && body.referrer) || req.headers.get("referer");
  if (referer) {
    try {
      refHost = new URL(referer).hostname;
      // Treat same-host referrals as "(direct)" by dropping them
      if (refHost && req.headers.get("host")?.split(":")[0] === refHost) {
        refHost = null;
      }
    } catch { /* malformed referer */ }
  }

  // Bound path to keep table neat
  const path = body.path ? body.path.slice(0, 256) : null;

  await recordEvent({
    kind,
    userId: userId,
    anonId: userId ? null : anonId, // dedupe — if userId is set, don't store the anon side
    path,
    props: body.props,
    utmSource: body.utmSource?.slice(0, 64) ?? null,
    utmMedium: body.utmMedium?.slice(0, 64) ?? null,
    utmCampaign: body.utmCampaign?.slice(0, 128) ?? null,
    refHost,
  });

  const res = new NextResponse(null, { status: 204 });
  if (shouldSetCookie) {
    res.cookies.set(ANON_COOKIE, issuedAnon, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ANON_MAX_AGE_S,
      path: "/",
    });
  }
  return res;
}

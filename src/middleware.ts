// Edge middleware.
//
// Sole responsibility right now: capture signup attribution.
//
// Why this exists in middleware instead of /login (the obvious spot):
// in Next.js 15, `cookies().set()` inside a Server Component (which
// /login/page.tsx is) throws — and the try/catch around it silently
// dropped every attempt. Result: 12+ signups in 12h with zero
// attribution data even though the capture code was "deployed".
//
// Middleware runs at the edge BEFORE the page renders and CAN mutate
// the response's cookies. So this is the right home for the capture.
//
// Behavior:
//  - Intercepts /login (only when no attribution cookie is already
//    present — first /login visit wins so we record the original
//    source, not a later same-tab refresh).
//  - ALWAYS writes the `shishya_attrib` cookie, even on direct-typed
//    visits (no Referer, no UTM). The cookie carries `direct: true`
//    in that case so the dashboard can record `signupReferrerHost =
//    "direct"`. Without this, `ref=NULL` in the DB is ambiguous —
//    could mean "direct typed" OR "middleware didn't fire". We need
//    the difference to know whether marketing attribution is working
//    end-to-end.
//  - Lets the request through unchanged otherwise.

import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const COOKIE = "shishya_attrib";

// Known AI crawlers/fetchers, canonical-name first (order matters — the
// first match wins, so more specific names precede their prefixes:
// OAI-SearchBot before GPTBot, Claude-SearchBot before ClaudeBot).
// Logged fire-and-forget to /api/ops/bot-hit so we can SEE whether
// Gemini / Claude / Perplexity / Copilot are actually indexing us.
const AI_BOTS: [string, RegExp][] = [
  ["OAI-SearchBot", /OAI-SearchBot/i],
  ["ChatGPT-User", /ChatGPT-User/i],
  ["GPTBot", /GPTBot/i],
  ["Claude-SearchBot", /Claude-SearchBot/i],
  ["Claude-User", /Claude-User/i],
  ["ClaudeBot", /ClaudeBot|anthropic-ai/i],
  ["Perplexity-User", /Perplexity-User/i],
  ["PerplexityBot", /PerplexityBot/i],
  ["Google-Extended", /Google-Extended/i],
  ["GoogleOther", /GoogleOther/i],
  ["Googlebot", /Googlebot/i],
  ["Bingbot", /bingbot/i],
  ["CCBot", /CCBot/i],
  ["Meta", /meta-external|FacebookBot/i],
  ["Applebot", /Applebot/i],
  ["Bytespider", /Bytespider/i],
  ["Amazonbot", /Amazonbot/i],
  ["DuckAssistBot", /DuckAssistBot|DuckDuckBot/i],
  ["MistralAI-User", /MistralAI/i],
  ["Cohere", /cohere/i],
  ["YouBot", /YouBot/i],
];

export function middleware(req: NextRequest, event: NextFetchEvent): NextResponse {
  const res = NextResponse.next();
  const path = req.nextUrl.pathname;

  // ── AI-crawler observability (cheap: one regex pass, only on match) ──
  const ua = req.headers.get("user-agent") ?? "";
  if (ua) {
    const hit = AI_BOTS.find(([, rx]) => rx.test(ua));
    if (hit) {
      event.waitUntil(
        fetch(new URL("/api/ops/bot-hit", req.url), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ bot: hit[0], path }),
        }).catch(() => {}),
      );
    }
  }

  // We intercept several classes of request to make sure NO student
  // reaches sign-in without us first seeing where they came from:
  //   /                          — UTM trail before they click "Sign in"
  //   /exams/...                 — marketing links often deep-link here
  //   /schooling, /colleges,
  //   /post-graduation, /jobs,
  //   /worldwide, /insights      — Phase 1 section landings
  //   /login                     — last-mile catch
  //   /api/auth/signin/:provider — NextAuth flow if user clicks Google
  //                                signin directly on / (skips /login)
  // Everything else passes through unchanged.
  const isHome = path === "/";
  const isExamPage = path.startsWith("/exams/");
  const isSectionLanding =
    path === "/schooling" ||
    path === "/colleges" ||
    path === "/post-graduation" ||
    path === "/jobs" ||
    path === "/worldwide" ||
    path === "/insights" ||
    path === "/scholarships";
  const isLogin = path === "/login";
  const isOAuthEntry = path.startsWith("/api/auth/signin/");
  if (!isHome && !isExamPage && !isSectionLanding && !isLogin && !isOAuthEntry) {
    return res;
  }

  // Don't overwrite a previously-set attribution cookie. The FIRST landing
  // is the real signup source; later page loads inside the same session
  // (or OAuth round-trip refs) shouldn't clobber it.
  if (req.cookies.get(COOKIE)?.value) return res;

  const referer = req.headers.get("referer") ?? "";
  const sp = req.nextUrl.searchParams;
  const utmSource = sp.get("utm_source") ?? "";
  const utmMedium = sp.get("utm_medium") ?? "";
  const utmCampaign = sp.get("utm_campaign") ?? "";

  // On the homepage/exam/section pages we ONLY set the cookie if the
  // visitor actually came in with UTM tags OR a useful (external) Referer.
  // Random organic pageviews shouldn't burn the "first visit wins" slot
  // — wait for the /login or OAuth catch in that case.
  if (!isLogin && !isOAuthEntry) {
    const refererIsExternal =
      referer &&
      !referer.startsWith("https://shishya.in") &&
      !referer.startsWith("http://localhost") &&
      !referer.startsWith("https://www.shishya.in");
    const haveTrail = utmSource || utmMedium || utmCampaign || refererIsExternal;
    if (!haveTrail) return res;
  }

  // "Direct" = no Referer header AND no UTM params. Typed URL, bookmark,
  // pasted from a place that strips referers (most messenger apps, iOS).
  // We mark these explicitly so signupReferrerHost ends up as "direct"
  // instead of NULL — the latter would mean middleware silently failed.
  const isDirect =
    !referer && !utmSource && !utmMedium && !utmCampaign;

  const payload = JSON.stringify({
    ref: referer,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    direct: isDirect,
  });

  res.cookies.set({
    name: COOKIE,
    value: payload,
    path: "/",
    maxAge: 30 * 60, // 30 min — long enough to outlast OAuth round-trip
    httpOnly: true,
    sameSite: "lax",
  });

  return res;
}

// Match home + every Phase 1 section landing + login + OAuth entry.
// Static assets, dashboard, mocks, attempts, admin etc. bypass this
// middleware entirely so it stays cheap.
export const config = {
  matcher: [
    "/",
    "/login",
    "/exams/:path*",
    "/schooling",
    "/colleges",
    "/post-graduation",
    "/jobs",
    "/worldwide",
    "/insights",
    "/scholarships",
    "/current-affairs/:path*",
    "/find-your-exam",
    "/results",
    "/api/auth/signin/:path*",
  ],
};

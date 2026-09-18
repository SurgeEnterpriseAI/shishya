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
import { SESSION_HINT_COOKIE, SESSION_HINT_MAX_AGE_S, SESSION_HINT_VALUE } from "@/lib/session-hint";
import { isCachePilotTwin } from "@/lib/cache-pilot-routes";

const COOKIE = "shishya_attrib";
// NextAuth v4 JWT session cookie (no custom cookie names in src/lib/auth.ts);
// large tokens are chunked as .0, .1, …
const SESSION_COOKIE_RE = /^(__Secure-)?next-auth\.session-token(\.\d+)?$/;

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

// Crawler-facing files outside the page routes (14 Sep 2026): whether an AI
// engine ever reads llms.txt / llms-full.txt, robots.txt or the sitemap was
// invisible — none of them passed through this middleware. They are now
// logged and nothing else: the response is always the untouched
// pass-through, even if logging throws (a 5xx robots.txt reads to Google as
// "crawl nothing").
const OBSERVE_ONLY = new Set(["/llms.txt", "/llms-full.txt", "/robots.txt", "/sitemap.xml"]);

/** Fire-and-forget BotVisit row for a known AI crawler / fetcher. */
function logAiBot(req: NextRequest, event: NextFetchEvent, path: string): void {
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua) return;
  const hit = AI_BOTS.find(([, rx]) => rx.test(ua));
  if (!hit) return;
  event.waitUntil(
    fetch(new URL("/api/ops/bot-hit", req.url), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bot: hit[0], path }),
    }).catch(() => {}),
  );
}

// URL locales for SEO (23 Aug 2026): /hi/<path> and /te/<path> are
// crawlable twins of the English pages. We REWRITE them to the real
// route (no redirect — the URL stays in the address bar and in Google's
// index) and stamp x-shishya-lang so getLocale() renders that language.
// We also set the language cookie so the visitor's NEXT click (which
// goes to an un-prefixed internal link) stays in the same language.
// Exception (16 Sep 2026, cache pilot): the /guide and /tricks twins are
// real [lang] routes and pass through un-rewritten — see
// src/lib/cache-pilot-routes.ts. The cookie rule below still applies.
const URL_LOCALES = new Set(["hi", "te"]);
const LANG_HEADER = "x-shishya-lang";
const LANG_COOKIE = "shishya-lang";
// Only PUBLIC, indexable surfaces get locale twins. Anything else under
// /hi or /te (dashboard, api, mocks, login…) is redirected to the plain
// path so no private/duplicate page is ever served — or indexed — under
// a prefix. Keep in sync with src/app/sitemap.ts localeTwinUrls.
const TWIN_PUBLIC_RE =
  /^\/(exams(\/|$)|exam-calendar$|current-affairs(\/|$)|live-test$|ask$|jobs-map$|find-your-exam$|results$|mentors$|educators$|pricing$|about$|for\/)/;

export function middleware(req: NextRequest, event: NextFetchEvent): NextResponse {
  const rawPath = req.nextUrl.pathname;
  if (OBSERVE_ONLY.has(rawPath)) {
    try {
      logAiBot(req, event, rawPath);
    } catch {
      /* logging must never change what a crawler receives */
    }
    return NextResponse.next();
  }

  const localeMatch = rawPath.match(/^\/(hi|te)(\/.*)?$/);
  let res: NextResponse;
  let path = rawPath;
  if (localeMatch && URL_LOCALES.has(localeMatch[1])) {
    const lang = localeMatch[1];
    path = localeMatch[2] && localeMatch[2] !== "/" ? localeMatch[2] : "/";
    if (path !== "/" && !TWIN_PUBLIC_RE.test(path)) {
      const plain = req.nextUrl.clone();
      plain.pathname = path;
      return NextResponse.redirect(plain, 307);
    }
    if (isCachePilotTwin(rawPath)) {
      // Cache pilot (16 Sep 2026): the /guide and /tricks twins are real
      // routes — src/app/(cache-pilot)/[lang]/… — that read the language
      // from the URL segment, so they can be ISR-cached. No rewrite and no
      // language header: the request reaches that route as-is (a spoofed
      // header is still dropped, as on the un-prefixed paths below).
      if (req.headers.has(LANG_HEADER)) {
        const reqHeaders = new Headers(req.headers);
        reqHeaders.delete(LANG_HEADER);
        res = NextResponse.next({ request: { headers: reqHeaders } });
      } else {
        res = NextResponse.next();
      }
    } else {
      const url = req.nextUrl.clone();
      url.pathname = path;
      const reqHeaders = new Headers(req.headers);
      reqHeaders.set(LANG_HEADER, lang);
      res = NextResponse.rewrite(url, { request: { headers: reqHeaders } });
    }
    // Set the language cookie ONLY when the visitor has none (a Hindi
    // searcher landing cold stays in Hindi on the next click) — never
    // overwrite an explicit choice, and never on a Link PREFETCH (review
    // 23 Aug 2026: prefetching a /hi link flipped the visitor's language
    // without a click).
    const isPrefetch =
      req.headers.get("next-router-prefetch") === "1" ||
      req.headers.get("purpose") === "prefetch" ||
      (req.headers.get("sec-purpose") ?? "").includes("prefetch");
    if (!isPrefetch && !req.cookies.get(LANG_COOKIE)?.value) {
      res.cookies.set({ name: LANG_COOKIE, value: lang, path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
  } else if (req.headers.has(LANG_HEADER)) {
    // Header hygiene: the locale header is ours to set (from the URL), never
    // the client's — strip a spoofed one so it can't select a language that
    // the URL didn't promise.
    const reqHeaders = new Headers(req.headers);
    reqHeaders.delete(LANG_HEADER);
    res = NextResponse.next({ request: { headers: reqHeaders } });
  } else {
    res = NextResponse.next();
  }

  // ── Signed-in hint sync (13 Sep 2026, phone-first) ──
  // Client islands skip /api/auth/session when the non-httpOnly `shishya_in`
  // hint is absent (src/lib/session-hint.ts). The hint can vanish while the
  // session lives on (Safari and Brave cap script-written cookies at 7 days;
  // a cookie clear; a sign-in from before the hint shipped), and a signed-in
  // student would then look like a guest on public pages. Middleware can see
  // the httpOnly NextAuth cookie, so it re-issues the hint. Presence only, no
  // JWT decode: islands still ask the server before showing anything
  // signed-in. It only ever SETS the hint, so a session-cookie rename can
  // never turn a student into a guest — at worst the sync stops.
  if (!req.cookies.get(SESSION_HINT_COOKIE)?.value && req.cookies.getAll().some((c) => SESSION_COOKIE_RE.test(c.name))) {
    res.cookies.set({
      name: SESSION_HINT_COOKIE,
      value: SESSION_HINT_VALUE,
      path: "/",
      maxAge: SESSION_HINT_MAX_AGE_S,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      httpOnly: false,
    });
  }

  // ── AI-crawler observability (cheap: one regex pass, only on match) ──
  logAiBot(req, event, path);

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
  // Score-share landings (13 Sep 2026): a friend arriving from a WhatsApp
  // share carries utm_source=whatsapp&utm_medium=share — record it like any
  // other tagged landing so their signup is attributed to the share loop.
  // Challenge links (/c/{token}, 14 Sep 2026) are the same kind of landing.
  // Study group invites (/g/{token}, 14 Sep 2026) too.
  const isShareLanding = path.startsWith("/share/") || path.startsWith("/c/") || path.startsWith("/g/");
  if (!isHome && !isExamPage && !isSectionLanding && !isLogin && !isOAuthEntry && !isShareLanding) {
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
    maxAge: 24 * 60 * 60, // 24 h — a read-then-sign-in-tomorrow visitor still carries the trail (was 30 min; 11 Sep 2026 audit)
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
    "/hi",
    "/te",
    "/hi/:path*",
    "/te/:path*",
    "/exam-calendar",
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
    "/coach",
    "/ask",
    "/jobs-map",
    "/mentors",
    "/educators",
    "/revision",
    "/typing",
    "/descriptive",
    "/live-test",
    // Score-share landings (13 Sep 2026): a friend arriving from a WhatsApp
    // score share must set the attribution cookie so their signup carries
    // utm_source=whatsapp&utm_medium=share on the SIGNUP row.
    "/share/:path*",
    // Challenge links (14 Sep 2026) — same attribution as a score share.
    "/c/:path*",
    // Study group invites (14 Sep 2026) — same attribution as a challenge link.
    "/g/:path*",
    "/api/auth/signin/:path*",
    // Crawler-facing files — logged only (OBSERVE_ONLY above, 14 Sep 2026).
    "/llms.txt",
    "/llms-full.txt",
    "/robots.txt",
    "/sitemap.xml",
  ],
};

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

import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "shishya_attrib";

export function middleware(req: NextRequest): NextResponse {
  const res = NextResponse.next();

  // Only the /login page sets attribution. Everything else passes through.
  if (req.nextUrl.pathname !== "/login") return res;

  // Don't overwrite a previously-set attribution cookie. The FIRST landing
  // on /login is the real signup source; later refreshes inside the OAuth
  // round-trip shouldn't clobber it (they'd have referer=accounts.google.com).
  if (req.cookies.get(COOKIE)?.value) return res;

  const referer = req.headers.get("referer") ?? "";
  const sp = req.nextUrl.searchParams;
  const utmSource = sp.get("utm_source") ?? "";
  const utmMedium = sp.get("utm_medium") ?? "";
  const utmCampaign = sp.get("utm_campaign") ?? "";

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

// Only run on /login. Static assets, API routes, and everything else
// bypass this middleware entirely. Cheap.
export const config = {
  matcher: ["/login"],
};

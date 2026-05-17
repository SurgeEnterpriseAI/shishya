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
//  - Only intercepts /login (and only when no attribution cookie is
//    already present — first /login visit wins so we record the
//    original source, not a later same-tab refresh).
//  - Reads Referer header + utm_* query params.
//  - Writes `shishya_attrib` cookie (httpOnly, sameSite=lax, 30 min).
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

  // Treat same-origin referers as "no referrer" — those are just internal
  // navigation (homepage → login). We still want them because that's how
  // we'll distinguish "direct typed" from "clicked sign in on /". The
  // referrer in that case is `https://shishya.in/` which IS useful — it
  // tells us they came via the homepage and not a deep link.
  const haveSomething =
    Boolean(referer) || Boolean(utmSource) || Boolean(utmMedium) || Boolean(utmCampaign);
  if (!haveSomething) return res;

  const payload = JSON.stringify({
    ref: referer,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
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

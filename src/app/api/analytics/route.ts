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

  // Session is optional — anonymous events are allowed.
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;

  // Anonymous id from cookie (creates a fresh one if absent).
  let anonId = req.cookies.get(ANON_COOKIE)?.value ?? null;
  let shouldSetCookie = false;
  if (!anonId) {
    anonId = crypto.randomUUID();
    shouldSetCookie = true;
  }
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
    res.cookies.set(ANON_COOKIE, anonId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ANON_MAX_AGE_S,
      path: "/",
    });
  }
  return res;
}

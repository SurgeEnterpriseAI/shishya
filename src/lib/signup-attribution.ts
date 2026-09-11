// Signup attribution helper.
//
// src/middleware.ts sets a `shishya_attrib` cookie (24 h) capturing the
// Referer header + any UTM params on the visitor's first attributable
// landing. This helper reads the cookie, writes the data onto
// User.signupReferrer* if those columns are still null, and clears the
// cookie.
//
// WHERE IT RUNS (11 Sep 2026 signup-leak audit): a third of signups had
// no attribution because capture ran only from /dashboard, while every
// exam-surface CTA sends the new student back to /exams/CODE, /pyq or
// /mocks/ID — they never saw the dashboard inside the cookie window.
// The primary call is now the NextAuth `createUser` event (src/lib/auth.ts)
// — it fires exactly once per real signup, inside the OAuth callback
// route handler where cookies() is in scope — so capture happens
// regardless of the landing page. /dashboard keeps its call as an
// idempotent fallback: the UPDATE only fills empty columns, and once the
// cookie is gone the helper returns before touching the DB.
//
// Best-effort: any DB / cookie / parse error is swallowed silently —
// attribution must never block the auth callback or a page render.

import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";

const COOKIE = "shishya_attrib";
// First-party analytics identity (issued by /api/analytics, httpOnly).
const ANON_COOKIE = "shishya_anon";

interface AttribPayload {
  ref?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  // direct=true means middleware fired but the visitor had no Referer
  // and no UTM (typed URL / bookmark / messenger paste). We still record
  // them as `signupReferrerHost = "direct"` so DB NULL unambiguously
  // means "middleware didn't fire" rather than "unattributable user".
  direct?: boolean;
}

/** What the cookie said, in the shape both the User columns and the
 *  SIGNUP analytics row want. */
export interface SignupAttribution {
  /** Canonical source string written to User.signupReferrerUrl:
   *  the UTM triple when present, else the Referer URL, else "direct". */
  referrerUrl: string;
  /** utm_source when UTM-tagged, else the Referer hostname, else "direct". */
  referrerHost: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  /** EXTERNAL Referer hostname only (our own host and localhost are
   *  dropped, matching /api/analytics), for the SIGNUP row's refHost. */
  refHost: string | null;
}

type Jar = Awaited<ReturnType<typeof cookies>>;

async function jarOrNull(): Promise<Jar | null> {
  try {
    return await cookies();
  } catch {
    return null; // not inside a request scope
  }
}

function clearCookie(jar: Jar): void {
  // cookies().set() throws inside a Server Component render (Next 15) —
  // the /dashboard fallback path. Never let that escape: the UPDATE's
  // WHERE guard already makes a repeat call harmless.
  try {
    jar.set(COOKIE, "", { path: "/", maxAge: 0 });
  } catch {
    /* read-only scope */
  }
}

function isOwnHost(host: string): boolean {
  return host === "shishya.in" || host === "localhost" || host.endsWith(".shishya.in");
}

/** Parse the cookie payload. Null when there is nothing usable. */
function toAttribution(parsed: AttribPayload): SignupAttribution | null {
  // Build the canonical "referrerUrl" — UTM payload wins because it's
  // intentional; Referer is the fallback for organic traffic.
  const utmParts: string[] = [];
  if (parsed.utm_source) utmParts.push(`utm_source=${parsed.utm_source}`);
  if (parsed.utm_medium) utmParts.push(`utm_medium=${parsed.utm_medium}`);
  if (parsed.utm_campaign) utmParts.push(`utm_campaign=${parsed.utm_campaign}`);
  const utmJoined = utmParts.join("&");

  let referrerUrl = utmJoined || parsed.ref || "";
  let referrerHost = "";
  let refHost: string | null = null;
  if (!referrerUrl && parsed.direct) {
    // Direct visit: middleware fired, but visitor had no Referer + no UTM.
    // Record as "direct" so the column isn't NULL — a NULL value should
    // signal "capture pipeline broken", not "we have a typed-URL user".
    referrerUrl = "direct";
    referrerHost = "direct";
  } else if (!referrerUrl) {
    return null;
  } else {
    try {
      if (utmJoined) {
        // UTM-tagged → host is the utm_source value (treated as the
        // friendly source name: "reddit", "telegram", "whatsapp")
        referrerHost = parsed.utm_source ?? "utm";
      }
      if (parsed.ref) {
        const host = new URL(parsed.ref).hostname.replace(/^www\./, "");
        if (!utmJoined) referrerHost = host;
        if (host && !isOwnHost(host)) refHost = host;
      }
    } catch {
      if (!utmJoined) referrerHost = "";
    }
  }
  return {
    referrerUrl,
    referrerHost,
    utmSource: parsed.utm_source || null,
    utmMedium: parsed.utm_medium || null,
    utmCampaign: parsed.utm_campaign || null,
    refHost,
  };
}

/** Read the attribution cookie WITHOUT clearing it. Null when absent,
 *  malformed, or outside a request scope. */
export async function readSignupAttribution(): Promise<SignupAttribution | null> {
  const jar = await jarOrNull();
  const raw = jar?.get(COOKIE)?.value;
  if (!jar || !raw) return null;
  try {
    return toAttribution(JSON.parse(raw) as AttribPayload);
  } catch {
    return null;
  }
}

/** The visitor's first-party analytics id (the `shishya_anon` cookie), so
 *  the SIGNUP event can carry it and the pre-sign-in trail joins to the
 *  account. Null when the browser has none (or outside a request scope). */
export async function readAnalyticsAnonId(): Promise<string | null> {
  const jar = await jarOrNull();
  const v = jar?.get(ANON_COOKIE)?.value ?? null;
  return v && /^[0-9a-f-]{36}$/i.test(v) ? v : null;
}

/**
 * Write the cookie's trail onto the User row (empty columns only) and
 * clear the cookie. Returns what was captured, or null when there was
 * nothing to do — i.e. no cookie (already captured, or the visitor never
 * hit an attributable landing).
 *
 * Idempotent by construction: the UPDATE never overwrites a previously
 * captured source, and a call without the cookie is a no-op before any
 * DB access — so the createUser event and the /dashboard fallback can both
 * call it safely.
 */
export async function captureSignupAttribution(userId: string): Promise<SignupAttribution | null> {
  const jar = await jarOrNull();
  if (!jar) return null;
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;

  let attribution: SignupAttribution | null;
  try {
    attribution = toAttribution(JSON.parse(raw) as AttribPayload);
  } catch {
    attribution = null;
  }
  if (!attribution) {
    clearCookie(jar);
    return null;
  }

  try {
    // Only fill in if still empty — never overwrite a previously
    // captured signup source.
    await prisma.$executeRaw`
      UPDATE "User"
      SET "signupReferrerUrl"  = ${attribution.referrerUrl},
          "signupReferrerHost" = ${attribution.referrerHost}
      WHERE "id" = ${userId}
        AND ("signupReferrerUrl" IS NULL OR "signupReferrerUrl" = '')
    `;
  } catch {
    /* best-effort; cookie clears below either way */
  }

  // Clear the cookie so subsequent loads don't re-trigger.
  clearCookie(jar);
  return attribution;
}

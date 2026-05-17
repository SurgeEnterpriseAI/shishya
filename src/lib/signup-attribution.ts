// Signup attribution helper.
//
// /login sets a short-lived `shishya_attrib` cookie capturing the
// Referer header + any UTM params. After the Google OAuth round-trip
// the user lands on /dashboard authenticated; this helper reads the
// cookie, writes the data onto User.signupReferrer* if those columns
// are still null, and clears the cookie.
//
// Best-effort: any DB / cookie / parse error is swallowed silently —
// attribution must never block a real page render.

import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";

const COOKIE = "shishya_attrib";

interface AttribPayload {
  ref?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export async function captureSignupAttribution(userId: string): Promise<void> {
  let jar;
  try {
    jar = await cookies();
  } catch {
    return; // not inside a request scope
  }
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return;

  let parsed: AttribPayload;
  try {
    parsed = JSON.parse(raw);
  } catch {
    jar.set(COOKIE, "", { path: "/", maxAge: 0 });
    return;
  }

  // Build the canonical "referrerUrl" — UTM payload wins because it's
  // intentional; Referer is the fallback for organic traffic.
  const utmParts: string[] = [];
  if (parsed.utm_source) utmParts.push(`utm_source=${parsed.utm_source}`);
  if (parsed.utm_medium) utmParts.push(`utm_medium=${parsed.utm_medium}`);
  if (parsed.utm_campaign) utmParts.push(`utm_campaign=${parsed.utm_campaign}`);
  const utmJoined = utmParts.join("&");

  const referrerUrl = utmJoined || parsed.ref || "";
  if (!referrerUrl) {
    jar.set(COOKIE, "", { path: "/", maxAge: 0 });
    return;
  }

  let referrerHost = "";
  try {
    if (utmJoined) {
      // UTM-tagged → host is the utm_source value (treated as the
      // friendly source name: "reddit", "telegram", "whatsapp")
      referrerHost = parsed.utm_source ?? "utm";
    } else if (parsed.ref) {
      referrerHost = new URL(parsed.ref).hostname.replace(/^www\./, "");
    }
  } catch {
    referrerHost = "";
  }

  try {
    // Only fill in if still empty — never overwrite a previously
    // captured signup source.
    await prisma.$executeRaw`
      UPDATE "User"
      SET "signupReferrerUrl"  = ${referrerUrl},
          "signupReferrerHost" = ${referrerHost}
      WHERE "id" = ${userId}
        AND ("signupReferrerUrl" IS NULL OR "signupReferrerUrl" = '')
    `;
  } catch {
    /* best-effort; cookie clears below either way */
  }

  // Clear the cookie so subsequent dashboard loads don't re-trigger.
  jar.set(COOKIE, "", { path: "/", maxAge: 0 });
}

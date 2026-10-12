// Forensic fingerprints of unidentified traffic (18 Aug 2026; the UA key
// stable since 5 Sep 2026) — moved here unchanged from
// src/app/api/analytics/route.ts on 14 Oct 2026 (Release 2, build
// kids-crawler) so /api/chat computes the very same user-agent hash the
// analytics rows carry ("uaHash") and can ask whether the bot scrub has
// convicted it (src/lib/guest-seed-hold.ts). The analytics route imports it;
// the privacy bounds are written out there and hold here:
//   • HMAC-SHA256 truncated to 16 hex characters, keyed from NEXTAUTH_SECRET;
//   • the IP key rotates with the calendar month (linkability bounded to ~30
//     days); the UA key does not — a user-agent string identifies nobody,
//     and rotating it reset every scrub conviction on the 1st of the month;
//   • a raw UA or IP is never stored, and the chat route stores neither
//     the hash nor the UA: it only compares the UA hash with the scrub's list.

import { createHmac } from "node:crypto";

export type FingerprintScope = "ua" | "ip";

/** The keyed hash the analytics rows store in uaHash / ipHash, or null for no value. */
export function analyticsFingerprint(value: string | null | undefined, scope: FingerprintScope, now = new Date()): string | null {
  if (!value) return null;
  const secret = process.env.NEXTAUTH_SECRET ?? "shishya-analytics";
  const period =
    scope === "ip"
      ? `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`
      : "stable";
  const scopeKey = createHmac("sha256", secret).update(`fp-${scope}-${period}`).digest();
  return createHmac("sha256", scopeKey).update(value).digest("hex").slice(0, 16);
}

/** The user-agent hash (the analytics rows' uaHash). */
export function uaFingerprint(ua: string | null | undefined): string | null {
  return analyticsFingerprint(ua, "ua");
}

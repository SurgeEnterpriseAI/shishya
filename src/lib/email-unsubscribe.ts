// One-click email unsubscribe (18 Aug 2026).
//
// Every marketing/nudge email now carries a signed one-click opt-out
// link and the RFC 8058 List-Unsubscribe headers. The token is an
// HMAC-SHA256 of the userId keyed with NEXTAUTH_SECRET — no DB lookup
// to mint, tamper-proof, and it never expires (an opt-out link must
// keep working forever). Raw userId travels in the URL so the route can
// find the row after verifying the signature.

import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.NEXTAUTH_SECRET ?? "shishya-unsub";
const BASE = "https://shishya.in";

function sign(userId: string): string {
  return createHmac("sha256", SECRET).update(`unsub:${userId}`).digest("hex").slice(0, 24);
}

export function unsubUrl(userId: string): string {
  return `${BASE}/unsubscribe?u=${encodeURIComponent(userId)}&t=${sign(userId)}`;
}

export function verifyUnsubToken(userId: string, token: string): boolean {
  const expected = sign(userId);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

// Footer HTML appended to every opt-out-eligible email.
export function unsubFooterHtml(userId: string): string {
  return `<hr style="border:none;border-top:1px solid #eee;margin:24px 0 12px"/>
<p style="font-size:12px;color:#999;line-height:1.5">You're getting this because you signed up on Shishya. Not useful? <a href="${unsubUrl(userId)}" style="color:#999">Unsubscribe in one click</a> — your mocks, notes and plans stay free either way.</p>`;
}

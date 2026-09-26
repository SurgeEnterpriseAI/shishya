// The gate in front of Ask Shishya's AI (26 Sep 2026).
//
// POST /api/ask had no crawler check: /ask?q= auto-fired a model call on page
// load, and the WebSite SearchAction, llms.txt and llms-full.txt all advertise
// /ask?q={query} — the same shape that sent ~188 guest-tutor replies to
// crawlers in September (src/app/api/chat/route.ts, 24 Sep guard). Order,
// copied from the chat route:
//   1. who is asking (auth(): a JWT cookie read, no DB);
//   2. a signed-out caller with a bot user-agent → 403, BEFORE the rate
//      limiter, the DB and the model (a signed-in student is never judged by
//      their user-agent);
//   3. the "ask" rate limit (15 an hour per account, else per IP).
// It also hands back the pseudonymous anon id (the shishya_anon cookie, the
// chat route's regex) and the client verdict, so the ask analytics row can
// finally say how much of /ask is people.

import { auth } from "@/lib/auth";
import { classifyClient, type ClientClass } from "@/lib/client-class";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";

export type AskGuardResult =
  | { ok: true; userId: string | null; anonId: string | null; client: ClientClass; rlKey: string }
  | { ok: false; res: Response };

/** Best-effort client IP for the anonymous rate-limit key (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

/** The shishya_anon cookie (a random UUID; groups an anonymous visitor's events, not PII). */
export function anonIdOf(req: Request): string | null {
  return (req.headers.get("cookie") || "").match(/(?:^|;\s*)shishya_anon=([^;]+)/)?.[1] ?? null;
}

export async function askGuard(req: Request): Promise<AskGuardResult> {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  const client = classifyClient(req.headers.get("user-agent"));

  // Crawlers never reach the model (the chat route's 24 Sep rule).
  if (!userId && client === "bot") {
    return { ok: false, res: Response.json({ error: "BOT", message: "The AI answer is for people using a browser." }, { status: 403 }) };
  }

  const rlKey = userId ?? `anon:${clientIp(req)}`;
  const rl = await checkRateLimit("ask", rlKey);
  if (!rl.ok) return { ok: false, res: rateLimited(rl) };

  return { ok: true, userId, anonId: userId ? null : anonIdOf(req), client, rlKey };
}

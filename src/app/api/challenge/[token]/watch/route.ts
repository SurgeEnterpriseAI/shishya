// POST /api/challenge/:token/watch — the challenger turns on a phone
// notification for when a friend plays (14 Sep 2026).
//
// Header: x-challenge-key (or the signed-in account that made it)
// Body:   { subscription: { endpoint, keys: { p256dh, auth } } }
// Same allowed push services and first-sign-up confirmation as exam alerts
// (src/app/api/push/subscribe/route.ts).

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { CHALLENGE_TOKEN_RE } from "@/lib/challenge";
import { addChallengeWatch } from "@/lib/challenge-db";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(1000),
    keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
  }),
});

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!CHALLENGE_TOKEN_RE.test(token)) return NextResponse.json({ error: "challenge not found" }, { status: 404 });
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const rl = await checkRateLimit("challengePlay", `ip:${clientIp(req)}`);
  if (!rl.ok) return rateLimited(rl);

  const session = await auth().catch(() => null);
  try {
    const result = await addChallengeWatch(
      token,
      { key: req.headers.get("x-challenge-key"), userId: session?.user?.id ?? null },
      { endpoint: body.subscription.endpoint, p256dh: body.subscription.keys.p256dh, auth: body.subscription.keys.auth },
    );
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, fresh: result.fresh });
  } catch (err) {
    console.error("[challenge] watch failed:", (err as Error)?.message);
    return NextResponse.json({ error: "Could not turn on notifications. Please try again." }, { status: 500 });
  }
}

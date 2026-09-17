// POST /api/study-groups/:token/watch — the group's maker turns on a phone
// notification for when a friend joins (16 Sep 2026). Signed in, maker only.
//
// Body: { subscription: { endpoint, keys: { p256dh, auth } } } → { ok, fresh } | { error }
// Same allowed push services and first-sign-up confirmation as a challenge
// (src/app/api/challenge/[token]/watch/route.ts). At most one notification
// per 20 minutes per group: src/lib/study-group-db.ts notifyGroupOwner.

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { GROUP_TOKEN_RE } from "@/lib/study-group";
import { addGroupWatch } from "@/lib/study-group-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(1000),
    keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
  }),
});

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "sign-in" }, { status: 401 });
  const { token } = await params;
  if (!GROUP_TOKEN_RE.test(token)) return NextResponse.json({ error: "not-found" }, { status: 404 });
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  // Shares the per-user join/leave budget (30 an hour) — a phone sign-up is as rare.
  const rl = await checkRateLimit("studyGroupJoin", `user:${userId}`);
  if (!rl.ok) return rateLimited(rl);
  try {
    const result = await addGroupWatch(userId, token, {
      endpoint: body.subscription.endpoint,
      p256dh: body.subscription.keys.p256dh,
      auth: body.subscription.keys.auth,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, fresh: result.fresh }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("[study-groups] watch failed:", (err as Error)?.message);
    return NextResponse.json({ error: "Could not turn on notifications. Please try again." }, { status: 500 });
  }
}

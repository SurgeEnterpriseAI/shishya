// POST /api/study-groups/:token/join — join a study group, or rejoin after
// leaving (14 Sep 2026). Signed in only. → { token } | { error }.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { joinGroup } from "@/lib/study-group-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "sign-in" }, { status: 401 });
  const rl = await checkRateLimit("studyGroupJoin", `user:${userId}`);
  if (!rl.ok) return rateLimited(rl);
  const { token } = await params;
  try {
    const r = await joinGroup(userId, token);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ token: r.token }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("[study-groups] join failed:", (err as Error)?.message);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}

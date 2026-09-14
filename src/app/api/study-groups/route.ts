// POST /api/study-groups — make a study group (14 Sep 2026). Signed in only.
// Body: { name } → { token }. Rules: src/lib/study-group.ts.

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { createGroup } from "@/lib/study-group-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "sign-in" }, { status: 401 });
  const rl = await checkRateLimit("studyGroup", `user:${userId}`);
  if (!rl.ok) return rateLimited(rl);
  const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
  try {
    const r = await createGroup(userId, body?.name);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ token: r.token }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("[study-groups] create failed:", (err as Error)?.message);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}

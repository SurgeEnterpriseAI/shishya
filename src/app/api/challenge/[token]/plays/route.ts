// GET /api/challenge/:token/plays — the challenger's view of their challenge
// (14 Sep 2026): every friend who sent a score, newest first.
// Allowed for the browser holding the creator key (header x-challenge-key —
// a header, so the key never lands in request logs) or the signed-in
// account that made the challenge.

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { challengeCreatorView } from "@/lib/challenge-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" };

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth().catch(() => null);
  try {
    const view = await challengeCreatorView(token, {
      key: req.headers.get("x-challenge-key"),
      userId: session?.user?.id ?? null,
    });
    if (!view.ok) return NextResponse.json({ error: view.error }, { status: view.status, headers: NO_STORE });
    const { ok: _ok, ...data } = view;
    return NextResponse.json(data, { headers: NO_STORE });
  } catch (err) {
    console.error("[challenge] plays failed:", (err as Error)?.message);
    return NextResponse.json({ error: "Could not load the scores." }, { status: 500, headers: NO_STORE });
  }
}

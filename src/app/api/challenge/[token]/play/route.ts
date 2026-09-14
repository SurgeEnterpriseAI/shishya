// POST /api/challenge/:token/play — a friend sends their score (14 Sep 2026).
//
// Body: { playerKey, choices, name? } → { stored, correct, total, creatorCorrect, creatorName }
// Graded on the server; one stored play per browser (playerKey) — a repeat
// returns the first score with stored: false. Only a newly stored play tells
// the challenger, after the response is sent (notifyChallengeCreator).

import { after, NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { CHALLENGE_KEY_RE, CHALLENGE_TOKEN_RE, sanitizeChallengeName } from "@/lib/challenge";
import { notifyChallengeCreator, recordChallengePlay } from "@/lib/challenge-db";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { readAnalyticsAnonId } from "@/lib/signup-attribution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  playerKey: z.string().regex(CHALLENGE_KEY_RE),
  choices: z.array(z.string().max(8).nullable()).max(10),
  name: z.string().max(80).nullish(),
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
  const anonId = await readAnalyticsAnonId();
  try {
    const result = await recordChallengePlay(
      token,
      { playerKey: body.playerKey, choices: body.choices, name: sanitizeChallengeName(body.name) },
      { userId: session?.user?.id ?? null, anonId },
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error, self: result.self === true }, { status: result.status });
    }
    if (result.stored) after(() => notifyChallengeCreator(token));
    const { ok: _ok, ...play } = result;
    return NextResponse.json(play, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("[challenge] play failed:", (err as Error)?.message);
    return NextResponse.json({ error: "Could not send your score. Please try again." }, { status: 500 });
  }
}

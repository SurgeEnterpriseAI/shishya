// POST /api/challenge — make a Challenge a friend link (14 Sep 2026).
//
// Body, one of:
//   { source: "quiz" | "topic", examCode, questionIds, choices, name? }  anon / topic quiz result
//   { source: "challenge", parentToken, choices, name? }                 a friend's challenge result
//   { source: "mock", attemptId, name? }                                 the signed-in student's own mock
// → { token, creatorKey, creatorCorrect, questionCount, examCode, examShort, fromMock }
//
// The creator key comes back once and is kept only in that browser (the
// table stores its hash); it unlocks the challenge's scores. The score is
// graded here — src/lib/challenge-db.ts.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { CHALLENGE_TOKEN_RE, sanitizeChallengeName } from "@/lib/challenge";
import { createChallenge, type CreateChallengeInput } from "@/lib/challenge-db";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { readAnalyticsAnonId } from "@/lib/signup-attribution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Id = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);
const Choices = z.array(z.string().max(8).nullable()).max(10);
const Name = z.string().max(80).nullish();
const Body = z.union([
  z.object({
    source: z.enum(["quiz", "topic"]),
    examCode: z.string().regex(/^[A-Z0-9_]{2,40}$/),
    questionIds: z.array(Id).min(5).max(10),
    choices: Choices,
    name: Name,
  }),
  z.object({ source: z.literal("challenge"), parentToken: z.string().regex(CHALLENGE_TOKEN_RE), choices: Choices, name: Name }),
  z.object({ source: z.literal("mock"), attemptId: Id, name: Name }),
]);

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  const anonId = await readAnalyticsAnonId();
  const rl = await checkRateLimit("challenge", userId ?? anonId ?? `ip:${clientIp(req)}`);
  if (!rl.ok) return rateLimited(rl);

  const name = sanitizeChallengeName(body.name);
  const input: CreateChallengeInput =
    body.source === "mock"
      ? { source: "mock", attemptId: body.attemptId, name }
      : body.source === "challenge"
        ? { source: "challenge", parentToken: body.parentToken, choices: body.choices, name }
        : { source: body.source, examCode: body.examCode, questionIds: body.questionIds, choices: body.choices, name };
  try {
    const result = await createChallenge(input, { userId, anonId });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    const { ok: _ok, ...made } = result;
    return NextResponse.json(made, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("[challenge] create failed:", (err as Error)?.message);
    return NextResponse.json({ error: "Could not make the challenge. Please try again." }, { status: 500 });
  }
}

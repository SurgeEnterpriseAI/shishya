// POST /api/score-estimate — a candidate chooses to add their estimated
// score for the sitting being compared, and gets where it stands among the
// Shishya candidates who added theirs (14 Sep 2026).
//
// Body: { examCode, attempted, correct, wrong, key } → { score, maxMarks, view }
// The score is recomputed from the counts under the exam's own marking
// scheme (src/lib/score-standing-db.ts); `key` is a random browser key, so a
// second entry from the same browser replaces the first. No account, no
// analytics id is stored.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { CHALLENGE_KEY_RE } from "@/lib/challenge";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { addScoreEntry } from "@/lib/score-standing-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Count = z.number().int().min(0).max(1000);
const Body = z.object({
  examCode: z.string().regex(/^[A-Z0-9_]{2,40}$/),
  attempted: Count,
  correct: Count,
  wrong: Count,
  key: z.string().regex(CHALLENGE_KEY_RE),
});

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
  const rl = await checkRateLimit("scoreEntry", `ip:${clientIp(req)}`);
  if (!rl.ok) return rateLimited(rl);
  try {
    const result = await addScoreEntry({
      examCode: body.examCode,
      counts: { attempted: body.attempted, correct: body.correct, wrong: body.wrong },
      key: body.key,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    const { ok: _ok, ...standing } = result;
    return NextResponse.json(standing, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("[score-estimate] add failed:", (err as Error)?.message);
    return NextResponse.json({ error: "Could not add your score. Please try again." }, { status: 500 });
  }
}

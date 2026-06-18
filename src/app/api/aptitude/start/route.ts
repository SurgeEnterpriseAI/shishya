// POST /api/aptitude/start — generate a fresh, unique aptitude paper for
// this candidate. Returns the answer-stripped questions plus a sealed
// (encrypted) token carrying the answer key, which the client returns at
// submit time for server-side scoring. Open (guests).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { generateAptitudeTest } from "@/lib/aptitude/generate";
import { sealKey } from "@/lib/aptitude/seal";
import { APTITUDE_CONFIG } from "@/data/aptitude";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(req: Request) {
  const rl = await checkRateLimit("aptitude", `apt-start:${clientIp(req)}`);
  if (!rl.ok) return rateLimited(rl);

  const { questions, key } = generateAptitudeTest();
  const token = sealKey(key);

  return Response.json({
    ok: true,
    token,
    questions,
    durationMinutes: APTITUDE_CONFIG.durationMinutes,
    totalQuestions: APTITUDE_CONFIG.totalQuestions,
    passPercent: APTITUDE_CONFIG.passPercent,
  });
}

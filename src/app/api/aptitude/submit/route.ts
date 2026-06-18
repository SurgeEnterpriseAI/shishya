// POST /api/aptitude/submit — score + record a Surge admission aptitude
// attempt. Open (no auth) — candidates take it as guests.
//
// Body: { name, email, phone?, answers: { [questionId]: choiceIndex }, durationSec? }
// Scoring happens server-side against the answer keys in src/data/aptitude
// (never shipped to the browser), so the result can't be forged client-side.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { scoreAptitude } from "@/data/aptitude";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";

const Body = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(20).optional().nullable(),
  // questionId → chosen option index (0-3)
  answers: z.record(z.string(), z.number().int().min(0).max(3)),
  durationSec: z.number().int().min(0).max(7200).optional(),
});

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = await checkRateLimit("aptitude", `apt:${ip}`);
  if (!rl.ok) return rateLimited(rl);

  let body;
  try {
    body = Body.parse(await req.json());
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "invalid body" }, { status: 400 });
  }

  const result = scoreAptitude(body.answers);

  const attempt = await prisma.surgeAptitudeAttempt.create({
    data: {
      name: body.name,
      email: body.email,
      phone: body.phone ?? null,
      score: result.score,
      total: result.total,
      percent: result.percent,
      passed: result.passed,
      sections: result.sections,
      durationSec: body.durationSec ?? null,
      ip,
      userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
    select: { id: true },
  });

  return Response.json({
    ok: true,
    attemptId: attempt.id,
    score: result.score,
    total: result.total,
    percent: result.percent,
    passed: result.passed,
    sections: result.sections,
    passPercent: 60,
  });
}

// POST /api/aptitude/submit — score + record a Surge admission aptitude
// attempt. Open (no auth) — candidates take it as guests.
//
// Body: { name, email, phone?, token, answers: { [questionId]: choiceIndex }, durationSec? }
// `token` is the sealed answer key issued by /api/aptitude/start. Scoring
// happens server-side after decrypting it, so results can't be forged.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { openKey, scoreFromKey } from "@/lib/aptitude/seal";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { sendAptitudePassEmail } from "@/lib/email";

const Body = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(20).optional().nullable(),
  token: z.string().min(10).max(20000),
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

  const key = openKey(body.token);
  if (!key || key.length === 0) {
    return Response.json({ error: "Invalid or expired test session. Please restart the test." }, { status: 400 });
  }

  const result = scoreFromKey(body.answers, key);

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

  // Candidate cleared the cutoff → email them their next step (contact
  // Nikhil). Best-effort + awaited so the serverless function doesn't get
  // frozen before the send; a failure here never blocks the result. We
  // skip if this email was already notified (earlier pass / retake) so no
  // one gets the "you cleared" mail twice.
  if (result.passed) {
    try {
      const already = await prisma.surgeAptitudeAttempt.findFirst({
        where: { email: body.email, passEmailedAt: { not: null } },
        select: { id: true },
      });
      if (!already) {
        const sent = await sendAptitudePassEmail({
          email: body.email,
          name: body.name,
          score: result.score,
          total: result.total,
        });
        if (sent) {
          await prisma.surgeAptitudeAttempt.update({
            where: { id: attempt.id },
            data: { passEmailedAt: new Date() },
          });
        }
      }
    } catch (err) {
      console.error("[aptitude] pass email failed:", err);
    }
  }

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

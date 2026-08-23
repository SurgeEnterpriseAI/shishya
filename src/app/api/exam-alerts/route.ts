// POST /api/exam-alerts — subscribe to exam-tracker alerts for one exam
// (notification / admit card / exam date / answer key / result).
// Signed-in students send only the exam code; anonymous visitors add an
// email. Idempotent per (email, exam): a repeat tap re-activates a
// previously unsubscribed row and is otherwise a no-op.
//
// Body: { examCode: string, email?: string }

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { normaliseEmail } from "@/lib/exam-alerts";

export const runtime = "nodejs";

const Body = z.object({
  examCode: z.string().regex(/^[A-Z0-9_]{2,40}$/),
  email: z.string().email().max(200).optional().or(z.literal("")),
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

  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  const emailRaw = session?.user?.email ?? body.email ?? "";
  if (!emailRaw) {
    return NextResponse.json({ error: "Add your email so we can alert you." }, { status: 400 });
  }
  const email = normaliseEmail(emailRaw);

  // Own bucket — "aptitude" is the generous per-IP/day bucket (200) and
  // an alert subscription is cheap; the 3/day "mentor" bucket would block
  // a student who followed three exams in one sitting.
  const rl = await checkRateLimit("aptitude", `exam-alert:${userId ?? clientIp(req)}`);
  if (!rl.ok) return rateLimited(rl);

  const exam = await prisma.exam
    .findUnique({ where: { code: body.examCode }, select: { id: true, active: true } })
    .catch(() => null);
  if (!exam || !exam.active) return NextResponse.json({ error: "unknown exam" }, { status: 404 });

  const ok = await prisma
    .$executeRaw`
      INSERT INTO "ExamAlert" (id, "examId", email, "userId")
      VALUES (${crypto.randomUUID()}, ${exam.id}, ${email}, ${userId})
      ON CONFLICT (email, "examId") DO UPDATE
        SET "unsubscribedAt" = NULL,
            "userId" = COALESCE("ExamAlert"."userId", EXCLUDED."userId")
    `
    .then(() => true)
    .catch((e) => {
      console.error("exam-alert subscribe failed:", e);
      return false;
    });
  if (!ok) return NextResponse.json({ error: "Couldn't subscribe — try again." }, { status: 500 });

  return NextResponse.json({ ok: true });
}

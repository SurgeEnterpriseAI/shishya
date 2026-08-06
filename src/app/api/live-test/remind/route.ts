// POST /api/live-test/remind — register for Sunday's All-India Live
// Test reminder. Signed-in students need send nothing but the date;
// anonymous students supply an email (no account required — removing
// every excuse not to show up on Sunday).
//
// Idempotent per (email, sundayDate): re-tapping is a no-op, so the
// banner can be honest about "you're registered" either way.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  sundayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
  const email = session?.user?.email ?? body.email ?? "";
  if (!email) {
    return NextResponse.json(
      { error: "Add your email so we can remind you." },
      { status: 400 },
    );
  }

  const rl = await checkRateLimit("mentor", `ltr:${userId ?? clientIp(req)}`);
  if (!rl.ok) return rateLimited(rl);

  const ok = await prisma
    .$executeRaw`
      INSERT INTO "LiveTestReminder" (id, "userId", email, "sundayDate")
      VALUES (${crypto.randomUUID()}, ${userId}, ${email.toLowerCase()}, ${body.sundayDate}::date)
      ON CONFLICT (email, "sundayDate") DO NOTHING
    `
    .then(() => true)
    .catch((e) => {
      console.error("live-test remind failed:", e);
      return false;
    });
  if (!ok) return NextResponse.json({ error: "Couldn't register — try again." }, { status: 500 });

  return NextResponse.json({ ok: true });
}

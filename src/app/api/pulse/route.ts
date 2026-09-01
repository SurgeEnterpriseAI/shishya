// POST /api/pulse — PulseAsk micro-feedback ingestion (1 Sep 2026).
//
// One-tap chips from quiet inline rows (PulseAsk.tsx). Deliberately
// write-only and low-ceremony: no email, no SLA queue, no public board —
// founder reads the aggregate at /admin/pulse.
//
// Anti-spam contract (proxy-pool crawler lesson, Aug 17-18):
//   • anonymous submissions accept a CHIP ONLY — free text requires a
//     signed-in session, matching the FeedbackWidget precedent
//   • anonymous submissions must present the existing shishya_anon
//     cookie; cookieless posts are dropped (crawlers don't carry it)
//   • rate-limited via the shared "explain" bucket per user/anon id

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";

const ANON_COOKIE = "shishya_anon";

const SURFACES = new Set(["results", "coach", "exam", "updates", "pyq"]);

export async function POST(req: NextRequest) {
  let body: {
    surface?: string;
    chip?: string;
    text?: string;
    examCode?: string;
    topicCode?: string;
    attemptId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const surface = typeof body.surface === "string" ? body.surface : "";
  const chip = typeof body.chip === "string" ? body.chip.trim().slice(0, 40) : "";
  if (!SURFACES.has(surface) || chip.length === 0) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  const anonId = userId ? null : (req.cookies.get(ANON_COOKIE)?.value?.slice(0, 64) ?? null);
  if (!userId && !anonId) return NextResponse.json({ ok: false }, { status: 401 });

  const rl = await checkRateLimit("explain", userId ?? `pulse:${anonId}`);
  if (!rl.ok) return rateLimited(rl);

  // Free text is a signed-in privilege; silently drop it for anon so a
  // stale client never errors the whole tap.
  const text = userId && typeof body.text === "string" ? body.text.trim().slice(0, 280) || null : null;

  const examCode = typeof body.examCode === "string" ? body.examCode.slice(0, 64) : null;
  const topicCode = typeof body.topicCode === "string" ? body.topicCode.slice(0, 64) : null;
  const attemptId = typeof body.attemptId === "string" ? body.attemptId.slice(0, 40) : null;

  await prisma.$executeRaw`
    INSERT INTO "PulseFeedback" (id, surface, chip, text, "examCode", "topicCode", "attemptId", "userId", "anonId", "createdAt")
    VALUES (${crypto.randomUUID()}, ${surface}, ${chip}, ${text}, ${examCode}, ${topicCode}, ${attemptId}, ${userId}, ${anonId}, NOW())`;

  return NextResponse.json({ ok: true });
}

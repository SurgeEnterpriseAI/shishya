// POST   /api/push/subscribe — follow one exam's alerts as phone
//                             notifications (13 Sep 2026, reach program #3)
// DELETE /api/push/subscribe — stop them for that exam
//
// No account needed: the push subscription endpoint is the device's own
// identity, so holding it is what lets a device turn its alerts on or off.
// The first follow sends one confirmation notification — proof it works,
// and a dead subscription is caught at once instead of at the first alert.
//
// POST body:   { examCode, subscription: { endpoint, keys: { p256dh, auth } } }
// DELETE body: { examCode, endpoint }

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { realExamKey } from "@/lib/db/exam-scope";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { isAllowedPushEndpoint, welcomePushPayload } from "@/lib/push-alert-rules";
import { pushConfigured, sendPush } from "@/lib/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ExamCode = z.string().regex(/^[A-Z0-9_]{2,40}$/);
const Endpoint = z.string().url().max(1000);
const Subscribe = z.object({
  examCode: ExamCode,
  subscription: z.object({
    endpoint: Endpoint,
    keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
  }),
});
const Unsubscribe = z.object({ examCode: ExamCode, endpoint: Endpoint });

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

export async function POST(req: NextRequest) {
  if (!pushConfigured()) {
    return NextResponse.json({ error: "Phone alerts are not available right now." }, { status: 503 });
  }
  let body: z.infer<typeof Subscribe>;
  try {
    body = Subscribe.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const { endpoint, keys } = body.subscription;
  if (!isAllowedPushEndpoint(endpoint)) {
    return NextResponse.json({ error: "This browser's notifications are not supported yet." }, { status: 400 });
  }

  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  // Same budget as email alerts: 10 follows a day per person / IP.
  const rl = await checkRateLimit("examAlert", `push:${userId ?? clientIp(req)}`);
  if (!rl.ok) return rateLimited(rl);

  const exam = await prisma.exam
    .findUnique({ where: realExamKey({ code: body.examCode }), select: { id: true, active: true, shortName: true } })
    .catch(() => null);
  if (!exam || !exam.active) return NextResponse.json({ error: "unknown exam" }, { status: 404 });

  let fresh = false;
  try {
    const rows = await prisma.$queryRaw<{ fresh: boolean }[]>`
      INSERT INTO "ExamPushAlert" (id, "examId", endpoint, p256dh, auth, "userId", "createdAt")
      VALUES (${crypto.randomUUID()}, ${exam.id}, ${endpoint}, ${keys.p256dh}, ${keys.auth}, ${userId}, NOW())
      ON CONFLICT (endpoint, "examId") DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        "userId" = COALESCE(EXCLUDED."userId", "ExamPushAlert"."userId"),
        "unsubscribedAt" = NULL,
        "failCount" = 0
      RETURNING (xmax = 0) AS fresh`;
    fresh = rows[0]?.fresh === true;
  } catch (err) {
    console.error("[push/subscribe] store failed:", (err as Error)?.message);
    return NextResponse.json({ error: "Could not turn on alerts. Please try again." }, { status: 500 });
  }

  if (fresh) {
    // The first follow must prove delivery: a subscription the push service
    // refuses is retired now, not discovered at the first real alert.
    const outcome = await sendPush({ endpoint, p256dh: keys.p256dh, auth: keys.auth }, welcomePushPayload(exam.shortName, body.examCode));
    if (outcome !== "sent") {
      await prisma.$executeRaw`
        UPDATE "ExamPushAlert" SET "unsubscribedAt" = NOW() WHERE endpoint = ${endpoint} AND "examId" = ${exam.id}`.catch(() => {});
      return NextResponse.json(
        {
          error:
            outcome === "gone"
              ? "This browser turned the notification off. Please try again."
              : "Couldn't reach this browser's notification service. Please try again.",
        },
        { status: outcome === "gone" ? 410 : 502 },
      );
    }
  }
  return NextResponse.json({ ok: true, fresh });
}

export async function DELETE(req: NextRequest) {
  let body: z.infer<typeof Unsubscribe>;
  try {
    body = Unsubscribe.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const exam = await prisma.exam.findUnique({ where: realExamKey({ code: body.examCode }), select: { id: true } }).catch(() => null);
  if (!exam) return NextResponse.json({ error: "unknown exam" }, { status: 404 });
  await prisma.$executeRaw`
    UPDATE "ExamPushAlert" SET "unsubscribedAt" = NOW()
    WHERE endpoint = ${body.endpoint} AND "examId" = ${exam.id} AND "unsubscribedAt" IS NULL`.catch(() => {});
  return NextResponse.json({ ok: true });
}

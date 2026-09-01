// POST /api/admin/demand/ship — close the demand loop (1 Sep 2026).
//
// Founder marks a demand cluster as SHIPPED; every signed-in student
// who voiced that need gets the "you asked — it's live" email with
// their own words quoted back and a link personalised to their exam.
//
// Body: { clusterKey, title, note, urlTemplate }
//   urlTemplate may contain {exam} → replaced with the signal's
//   examCode (e.g. /exams/{exam}/build-mock); signals without an
//   examCode get the template with the placeholder segment resolved
//   to a sensible fallback (strip "/{exam}" path piece → site root
//   version supplied by caller via fallbackUrl, default shishya.in).
//
// Safety: admin-only; one email per user (latest signal wins); the
// EmailTouch tag guard makes re-shipping the same cluster a no-op per
// user; opt-out enforced centrally in sendEmail; capped per run.

import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { isCurrentUserAdmin } from "@/lib/admin";
import { sendDemandShippedEmail } from "@/lib/email";

export const maxDuration = 300;

const Body = z.object({
  clusterKey: z.string().min(1).max(48),
  title: z.string().min(3).max(90),
  note: z.string().min(3).max(400),
  urlTemplate: z.string().min(8).max(300),
  fallbackUrl: z.string().min(8).max(300).optional(),
  dry: z.boolean().optional(),
});

const MAX_SENDS = 200;

export async function POST(req: Request) {
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { clusterKey, title, note, urlTemplate, fallbackUrl, dry } = parsed.data;

  const cluster = await prisma.$queryRaw<{ key: string }[]>`
    SELECT key FROM "DemandCluster" WHERE key = ${clusterKey} LIMIT 1`;
  if (cluster.length === 0) return NextResponse.json({ error: "unknown cluster" }, { status: 404 });

  // Resolve every signed-in voice behind the cluster (incl. clusters
  // merged into it), one row per user — their LATEST ask wins so the
  // quoted words are the freshest thing they said.
  const voices = await prisma.$queryRaw<
    { userId: string; email: string; quote: string; examCode: string | null; saidAt: Date }[]
  >`
    WITH sig AS (
      SELECT s.* FROM "DemandSignal" s
      WHERE s."clusterKey" = ${clusterKey}
         OR s."clusterKey" IN (SELECT key FROM "DemandCluster" WHERE "mergedInto" = ${clusterKey})
    ),
    resolved AS (
      SELECT ses."userId" uid, sig.quote, sig."examCode", sig."saidAt"
      FROM sig JOIN "ChatMessage" cm ON sig.source = 'chat' AND cm.id = sig."sourceId"
      JOIN "ChatSession" ses ON ses.id = cm."sessionId"
      UNION ALL
      SELECT pf."userId", sig.quote, sig."examCode", sig."saidAt"
      FROM sig JOIN "PulseFeedback" pf ON sig.source = 'pulse' AND pf.id = sig."sourceId"
      WHERE pf."userId" IS NOT NULL
      UNION ALL
      SELECT tr."userId", sig.quote, sig."examCode", sig."saidAt"
      FROM sig JOIN "TeacherRequest" tr ON sig.source = 'teacher' AND tr.id = sig."sourceId"
      WHERE tr."userId" IS NOT NULL
      UNION ALL
      SELECT fr."authorId", sig.quote, sig."examCode", sig."saidAt"
      FROM sig JOIN "FeatureRequest" fr ON sig.source = 'ideas' AND fr.id = sig."sourceId"
    ),
    latest AS (
      SELECT DISTINCT ON (uid) uid, quote, "examCode", "saidAt"
      FROM resolved WHERE uid IS NOT NULL ORDER BY uid, "saidAt" DESC
    )
    SELECT l.uid "userId", u.email, l.quote, l."examCode", l."saidAt"
    FROM latest l JOIN "User" u ON u.id = l.uid
    WHERE u.email IS NOT NULL
    LIMIT ${MAX_SENDS}`;

  let sent = 0, skippedDupe = 0, failed = 0;
  for (const v of voices) {
    // Per-user re-ship guard: the send layer logs `sent:<tag>` rows.
    const seen = await prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(*) n FROM "EmailTouch"
      WHERE "userId" = ${v.userId} AND tag = ${"sent:demand-shipped-" + clusterKey}`;
    if (Number(seen[0]?.n ?? 0) > 0) {
      skippedDupe++;
      continue;
    }
    if (dry) {
      sent++;
      continue;
    }
    const url = v.examCode
      ? urlTemplate.replaceAll("{exam}", v.examCode)
      : (fallbackUrl ?? urlTemplate.replaceAll("/{exam}", "").replaceAll("{exam}", ""));
    const ok = await sendDemandShippedEmail({
      to: v.email,
      userId: v.userId,
      askedQuote: v.quote.slice(0, 180),
      askedOn: new Date(v.saidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      title,
      note,
      url: url.startsWith("http") ? url : `https://shishya.in${url}`,
      clusterKey,
    }).catch(() => false);
    if (ok) sent++;
    else failed++;
  }

  // Stamp shipped only when something actually went out (or there was
  // nobody to tell) — an all-failed run must stay retryable, not wear a
  // green badge (learned 1 Sep: 10/10 sends bounced on a bad tag and
  // the cluster still got stamped).
  if (!dry && (sent > 0 || voices.length === 0 || skippedDupe === voices.length)) {
    await prisma.$executeRaw`
      UPDATE "DemandCluster"
      SET "shippedAt" = NOW(), "shipTitle" = ${title}, "shipNote" = ${note}, "shipUrl" = ${urlTemplate}
      WHERE key = ${clusterKey}`;
  }

  return NextResponse.json({ ok: true, voices: voices.length, sent, skippedDupe, failed, dry: !!dry });
}

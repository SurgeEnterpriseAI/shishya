// POST /api/admin/aptitude/notify-passers — one-shot backfill: email every
// candidate who cleared the cutoff but hasn't yet received the "contact
// Nikhil" email. Idempotent (passEmailedAt guards re-sends). Bearer
// ${CRON_SECRET} auth.
//
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
//        "https://shishya.in/api/admin/aptitude/notify-passers"
//
// Add ?dry=1 to preview who would be emailed without sending.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { sendAptitudePassEmail } from "@/lib/email";

export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";

  // All passing attempts, best score first.
  const passers = await prisma.surgeAptitudeAttempt.findMany({
    where: { passed: true },
    orderBy: [{ percent: "desc" }, { createdAt: "asc" }],
    select: { id: true, name: true, email: true, score: true, total: true, passEmailedAt: true },
  });

  // Emails already notified anywhere — skip those addresses entirely.
  const notified = new Set(
    passers.filter((p) => p.passEmailedAt).map((p) => p.email.toLowerCase())
  );

  // One best attempt per still-unnotified email.
  const byEmail = new Map<string, (typeof passers)[number]>();
  for (const p of passers) {
    const key = p.email.toLowerCase();
    if (notified.has(key)) continue;
    if (!byEmail.has(key)) byEmail.set(key, p);
  }
  const targets = [...byEmail.values()];

  if (dry) {
    return Response.json({
      ok: true,
      dryRun: true,
      wouldEmail: targets.length,
      candidates: targets.map((t) => ({ name: t.name, email: t.email, score: `${t.score}/${t.total}` })),
    });
  }

  const sent: string[] = [];
  const failed: string[] = [];
  for (const t of targets) {
    const ok = await sendAptitudePassEmail({ email: t.email, name: t.name, score: t.score, total: t.total });
    if (ok) {
      sent.push(t.email);
      // Stamp every attempt row for this email so reruns skip it.
      await prisma.surgeAptitudeAttempt.updateMany({
        where: { email: t.email, passEmailedAt: null },
        data: { passEmailedAt: new Date() },
      });
    } else {
      failed.push(t.email);
    }
  }

  return Response.json({ ok: true, emailed: sent.length, failed: failed.length, sent, failedEmails: failed });
}

// GET /api/cron/day3-nudge
//
// Day-3 nudge cron. Runs nightly (configure schedule in Vercel cron
// or external job runner). Finds users who:
//   - signed up between 2.5 and 3.5 days ago (a 24h-wide window)
//   - have ZERO mock attempts
//   - have ZERO chat messages
// and sends them the day-3 nudge email — "your 5-question diagnostic
// is still waiting".
//
// The 24h-wide signup window is the dedup mechanism: each user falls
// inside it exactly ONE nightly run, so we never re-send. No
// schema column required.
//
// Auth: Bearer ${CRON_SECRET}, same as the other cron routes.

import { prisma } from "@/lib/db/prisma";
import { sendDay3NudgeEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_FROM_DAYS = 3.5;
const WINDOW_TO_DAYS = 2.5;

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${expected}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const from = new Date(now - WINDOW_FROM_DAYS * 86_400_000);
  const to = new Date(now - WINDOW_TO_DAYS * 86_400_000);

  // Candidate users: signed up 2.5-3.5 days ago AND zero engagement.
  // Single raw query — Prisma's where-clause for NOT-EXISTS gets
  // verbose, raw SQL is clearer.
  const candidates = await prisma.$queryRaw<
    Array<{ id: string; email: string; name: string | null; createdAt: Date }>
  >`
    SELECT u.id, u.email, u.name, u."createdAt"
    FROM "User" u
    WHERE u."createdAt" >= ${from}
      AND u."createdAt" < ${to}
      AND u.email IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "Attempt" a WHERE a."userId" = u.id)
      AND NOT EXISTS (
        SELECT 1 FROM "ChatSession" cs
          JOIN "ChatMessage" cm ON cm."sessionId" = cs.id
          WHERE cs."userId" = u.id AND cm.role = 'USER'
      )
    ORDER BY u."createdAt" ASC
  `;

  const log: Array<{ email: string; ok: boolean }> = [];
  for (const u of candidates) {
    const daysSinceSignup = Math.round(
      (now - u.createdAt.getTime()) / 86_400_000,
    );
    const ok = await sendDay3NudgeEmail({
      email: u.email,
      name: u.name,
      daysSinceSignup,
    });
    log.push({ email: u.email, ok });
  }

  return Response.json({
    ok: true,
    windowFrom: from.toISOString(),
    windowTo: to.toISOString(),
    candidates: candidates.length,
    sent: log.filter((l) => l.ok).length,
    failed: log.filter((l) => !l.ok).length,
    log,
  });
}

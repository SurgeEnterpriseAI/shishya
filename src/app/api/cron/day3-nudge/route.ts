// GET /api/cron/day3-nudge
//
// Day-3 nudge cron. Runs nightly (configure schedule in Vercel cron
// or external job runner). Finds users who:
//   - signed up between 2.5 and 3.5 days ago (a 24h-wide window)
//   - have ZERO mock attempts
//   - have ZERO chat messages
// and sends them the day-3 nudge email — since 7 Oct 2026 one action,
// "your 5 questions are ready" → /today (or "pick your exam" when /today
// has no exam to build the set on), coach invite as a secondary line.
//
// The 24h-wide signup window is the dedup mechanism: each user falls
// inside it exactly ONE nightly run, so we never re-send. No
// schema column required.
//
// 26 Sep 2026 (student mode, fixer): this audience is keyed on the User
// row alone — no enrolment, no exam — so a Class 8-12 student who signed
// in on a school page, answered the age-band card and only read (no
// attempt, no chat) was exactly a candidate for the exam-prep diagnostic
// mail ("talk to a real subject expert matched to your exam"). Founder
// rule: school-only accounts get no exam-prep email or nudge. The
// selection now drops every school-only account (src/lib/db/enrollment.ts
// schoolOnlyAccountSql: marked school by its class enrolment or the school
// code in onbPrepCodes, and no active enrolment on a real exam).
//
// 2 Oct 2026 (review of the school-age mail safeguards): "school-only" still
// let through the school student who follows an olympiad or picked a school
// stage in the wizard, and this mail invites them to an exam-prep diagnostic
// and a subject expert. The selection now also drops every school-age account
// (schoolAgeAccountSql; rule in src/lib/school-age.ts), as the win-back,
// lapse and evening nudges do.
// ?dry=1 → the candidates it would mail, sends nothing.
//
// Auth: Bearer ${CRON_SECRET}, same as the other cron routes.

import { prisma } from "@/lib/db/prisma";
import { schoolAgeAccountSql, schoolOnlyAccountSql } from "@/lib/db/enrollment";
import { sendDay3NudgeEmail } from "@/lib/email";
import { pickDailyFive } from "@/lib/study-day-five";

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

  const dry = new URL(req.url).searchParams.get("dry") === "1";
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
      AND u."emailOptOut" = FALSE
      AND NOT EXISTS (SELECT 1 FROM "Attempt" a WHERE a."userId" = u.id)
      AND NOT EXISTS (
        SELECT 1 FROM "ChatSession" cs
          JOIN "ChatMessage" cm ON cm."sessionId" = cs.id
          WHERE cs."userId" = u.id AND cm.role = 'USER'
      )
      -- 26 Sep 2026: never a school-only account (Class 8-12 student mode).
      AND NOT ${schoolOnlyAccountSql("u")}
      -- 2 Oct 2026: nor a school-age account (olympiad or class enrolment, school stage).
      AND NOT ${schoolAgeAccountSql("u")}
    ORDER BY u."createdAt" ASC
  `;

  if (dry) {
    return Response.json({
      ok: true,
      dry: true,
      windowFrom: from.toISOString(),
      windowTo: to.toISOString(),
      candidates: candidates.length,
      sample: candidates.map((u) => ({ id: u.id, email: u.email, createdAt: u.createdAt.toISOString() })),
    });
  }

  const log: Array<{ email: string; ok: boolean }> = [];
  for (const u of candidates) {
    // 7 Oct 2026: the mail leads with "your 5 questions are ready" → /today.
    // The same picker /today uses names the exam it will build the set on;
    // no pick (no enrolment on an exam with practice — most of this
    // audience) → the mail says "pick your exam" instead. A failed read
    // takes the honest no-exam copy.
    const pick = await pickDailyFive(u.id).catch(() => null);
    const ok = await sendDay3NudgeEmail({
      id: u.id,
      email: u.email,
      name: u.name,
      examShort: pick?.examShort ?? null,
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

// GET /api/cron/teacher-request-sla — the closure guarantee's safety net.
//
// Founder rule (1 Aug 2026): a teacher request may wait at most ONE DAY.
// Any request older than 24h that still has no written answer and isn't
// resolved gets an automatic AI-tutor answer (grounded via the Ask
// engine — same mentor voice, real Shishya data, no invented numbers).
// The answer lands on the student's follow-up card, labelled honestly
// as from Shishya with a personal follow-up promised, and the team gets
// one summary email so every AI-answered request is personally chased.
//
// The student experience this protects: "I asked, nobody responded, the
// loop just stayed open" can never happen — worst case they hear from
// us in writing within a day, and they still get to rate it.
//
// Runs every 2 hours (SLA precision of ±2h on a 24h promise is fine).
// Cap 8 answers per run to bound Anthropic spend on any backlog spike.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { prisma } from "@/lib/db/prisma";
import { runAsk } from "@/lib/ask-engine";
import { sendTeacherRequestEmail } from "@/lib/email";

const SLA_HOURS = 24;
const MAX_PER_RUN = 8;

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${expected}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // JS-side cutoff: make_interval(hours => $1) trips Prisma's parser
  // (the => named-arg syntax), so bind a plain timestamp instead.
  const cutoff = new Date(Date.now() - SLA_HOURS * 3600_000);
  const stale = await prisma.$queryRaw<
    { id: string; examCode: string | null; message: string; surface: string; contactName: string | null }[]
  >`
    SELECT id, "examCode", message, surface, "contactName"
    FROM "TeacherRequest"
    WHERE status IN ('PENDING', 'CONTACTED')
      AND "answerText" IS NULL
      AND "escalatedAt" IS NULL
      AND "createdAt" < ${cutoff}
    ORDER BY "createdAt" ASC
    LIMIT ${MAX_PER_RUN}
  `.catch(() => []);

  if (stale.length === 0) return Response.json({ ok: true, answered: 0 });

  const answered: { id: string; q: string }[] = [];
  for (const r of stale) {
    // Strip the internal tap-log wrapper; what remains is the student's
    // actual ask (contextLabel), e.g. "…about APPSC Group II — is my
    // self-study plan realistic?".
    const cleaned = r.message.replace(/^\[(WHATSAPP|CALL) tap\] Student initiated (a WhatsApp chat|a call)( about )?/i, "").replace(/\.$/, "").trim();
    const question = cleaned.length >= 8
      ? `${r.examCode ? `[Student preparing for ${r.examCode}] ` : ""}${cleaned}`
      : // Tap with no actual question — ask the engine for a warm,
        // useful check-in for this exam rather than a generic form letter.
        `A student preparing for ${r.examCode ?? "a government exam"} asked to talk to a teacher but didn't leave a specific question. Write a short, warm check-in: the 2-3 things most ${r.examCode ?? "government-exam"} aspirants need help with right now, with Shishya links for each, and an invitation to reply with their exact doubt.`;

    try {
      const result = await runAsk(question);
      if (!result.answer || result.answer.length < 50) continue;
      await prisma.$executeRaw`
        UPDATE "TeacherRequest"
        SET "answerText" = ${result.answer},
            "answeredAt" = NOW(),
            "answeredBy" = 'ai',
            "escalatedAt" = NOW(),
            status = CASE WHEN status = 'PENDING' THEN 'CONTACTED'::"TeacherRequestStatus" ELSE status END,
            "updatedAt" = NOW()
        WHERE id = ${r.id} AND "answerText" IS NULL
      `;
      void prisma.teacherRequestNote
        .create({
          data: {
            requestId: r.id,
            kind: "ANSWER",
            note: `[AI auto-answer after ${SLA_HOURS}h SLA]\n\n${result.answer.slice(0, 3500)}`,
            byEmail: "ai-tutor",
          },
        })
        .catch(() => {});
      answered.push({ id: r.id, q: question.slice(0, 90) });
    } catch (e) {
      console.error("teacher-request-sla: AI answer failed for", r.id, e);
      // Leave escalatedAt NULL so the next run retries this request.
    }
  }

  // One summary email — every AI-answered request still gets chased by
  // a human; the AI answer buys time, it doesn't close the human loop.
  if (answered.length) {
    const notifyTo =
      process.env.TEACHER_REQUEST_NOTIFY_EMAIL ??
      (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean)[0] ??
      null;
    if (notifyTo) {
      void sendTeacherRequestEmail({
        to: notifyTo,
        surface: "sla",
        examCode: null,
        topicCode: null,
        studentName: null,
        contactEmail: null,
        contactPhone: null,
        message:
          `🤖 24h SLA: the AI tutor auto-answered ${answered.length} waiting request(s). ` +
          `Each student now has a written answer on their follow-up card — please follow up personally:\n\n` +
          answered.map((a) => `• ${a.id} — ${a.q}`).join("\n") +
          `\n\nWork the queue: https://shishya.in/admin/teacher-requests`,
        signedIn: false,
      }).catch(() => {});
    }
  }

  return Response.json({ ok: true, answered: answered.length, of: stale.length });
}

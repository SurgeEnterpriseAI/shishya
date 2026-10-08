// POST /api/chat/carry-question — a guest's unanswered tutor question, kept
// at sign-up, becomes the new account's saved question (7 Oct 2026, B6 —
// the whole flow: src/lib/guest-question-carry.ts).
//
// Body: { examCode: string | null, text, topicCode?, sessionId? } — the
// question the chat kept in localStorage when the guest pressed sign-up on the
// "AI tutor unavailable" notice (30 minutes; nothing is kept without that
// press). sessionId: the guest chat the same sign-in just imported
// (/api/chat/import), to put the question at its end.
//
// Safety, as /api/chat/import:
//   • signed-in only; never a school chat (a class container, or an account
//     that declared a 13-17 school band — the chat route refuses those a
//     general or exam turn), never a kids' exam;
//   • nothing is taken on the client's word: the text must match a FAILED guest
//     turn (AnonTutorLog row, no reply) the chat route logged for THIS browser's
//     shishya_anon cookie, same exam scope, in the last 6 hours, not answered by
//     a later guest turn of the same text. The stored text is the logged one;
//   • one carry per guest turn per account (a repeat returns the saved row), at
//     most CARRY_MAX_PER_DAY per account in 24 hours, rate-limited per user;
//   • the row is the late-answer run's: USER, failedAt, sentAt = when the guest
//     asked (its 72 hours run from then), latePromised, the reply language the
//     chat route would resolve for that guest turn, the topic. createdAt is the
//     logged one, so the conversation reads in the order it happened.
// No model call, no email.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { realExamKey } from "@/lib/db/exam-scope";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { detectLanguageRequest, langToReplyLanguage, resolvePreferredLocale, TUTOR_LANG_COOKIE } from "@/lib/preferred-lang";
import { isMinorBand, schoolBandOfProfile } from "@/lib/school/student-classes";
import { chatQuestionDoorAllowed } from "@/lib/signin-cta";
import {
  CARRY_LOG_WINDOW_MS,
  CARRY_MAX_PER_DAY,
  CARRY_SESSION_SOURCE,
  CARRY_TOPIC_CODE_RE,
  appendTarget,
  carriedQuestionMeta,
  pickFailedGuestTurn,
} from "@/lib/guest-question-carry";

const Body = z.object({
  examCode: z.string().min(1).max(40).nullable(),
  text: z.string().min(1).max(2000),
  topicCode: z.string().regex(CARRY_TOPIC_CODE_RE).nullish(),
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/).nullish(),
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) return Response.json({ error: "sign in first" }, { status: 401 });

  // Its own bucket under the chat limit (30 a minute), keyed apart from chat turns and imports.
  const rl = await checkRateLimit("chat", `carry:${userId}`);
  if (!rl.ok) return rateLimited(rl);

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const anonId = (req.headers.get("cookie") || "").match(/(?:^|;\s*)shishya_anon=([^;]+)/)?.[1] ?? null;
  if (!anonId) return Response.json({ saved: false, reason: "no-guest-log" });
  if (!chatQuestionDoorAllowed(body.examCode)) return Response.json({ saved: false, reason: "not-here" });

  const profile = await prisma.user.findUnique({ where: { id: userId }, select: { onbStage: true, onbPrepCodes: true } });
  if (!profile) return Response.json({ error: "sign in first" }, { status: 401 });
  const band = schoolBandOfProfile(profile);
  if (band && isMinorBand(band.band)) return Response.json({ saved: false, reason: "not-here" });

  let examId: string | null = null;
  if (body.examCode) {
    const exam = await prisma.exam.findUnique({ where: realExamKey({ code: body.examCode }), select: { id: true, active: true } });
    if (!exam || !exam.active) return Response.json({ saved: false, reason: "exam" });
    examId = exam.id;
  }

  const now = Date.now();
  const logs = await prisma.anonTutorLog.findMany({
    where: { anonId, examCode: body.examCode ?? null, createdAt: { gte: new Date(now - CARRY_LOG_WINDOW_MS) } },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { id: true, userMessage: true, reply: true, createdAt: true },
  });
  const turn = pickFailedGuestTurn(logs, body.text, now);
  if (!turn) return Response.json({ saved: false, reason: "not-verified" });

  // This account's carries: the same guest turn again (a second tab, a retry
  // after a dropped response) returns the row already saved; and the daily cap.
  const [taken, recent] = await Promise.all([
    prisma.$queryRaw<{ id: string; sessionId: string; content: string; turnId: string | null }[]>`
      SELECT m.id, m."sessionId", m.content, m.metadata->>'turnId' AS "turnId"
      FROM "ChatMessage" m JOIN "ChatSession" s ON s.id = m."sessionId"
      WHERE s."userId" = ${userId} AND m.role = 'USER' AND m.metadata->>'guestLogId' = ${turn.id}
      LIMIT 1`,
    prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n
      FROM "ChatMessage" m JOIN "ChatSession" s ON s.id = m."sessionId"
      WHERE s."userId" = ${userId} AND m.role = 'USER' AND m.metadata->>'guestLogId' IS NOT NULL
        AND CASE WHEN jsonb_typeof(m.metadata->'carriedAt') = 'number'
          THEN (m.metadata->>'carriedAt')::numeric > ${String(now - 24 * 3600_000)}::numeric
          ELSE FALSE END`,
  ]);
  if (taken[0]) {
    return Response.json({ saved: true, already: true, sessionId: taken[0].sessionId, turnId: taken[0].turnId, text: taken[0].content });
  }
  if ((recent[0]?.n ?? 0) >= CARRY_MAX_PER_DAY) return Response.json({ saved: false, reason: "limit" });

  // The reply language the chat route resolved for that guest turn (a guest has
  // no stored preference): a language asked for in the message, else the
  // tutor's own cookie, else the site's language cookie, else English.
  const jar = await cookies();
  const replyLang = langToReplyLanguage(
    resolvePreferredLocale({
      explicit: detectLanguageRequest(turn.userMessage) ?? jar.get(TUTOR_LANG_COOKIE)?.value ?? null,
      preferredLang: null,
      cookie: jar.get("shishya-lang")?.value ?? null,
    }),
  );

  // Into the guest chat this sign-in just imported, when that is what the client names.
  let intoId: string | null = null;
  if (body.sessionId) {
    const s = await prisma.chatSession.findUnique({
      where: { id: body.sessionId },
      select: { id: true, userId: true, examId: true, contextSnapshot: true, messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } } },
    });
    const ok = appendTarget(
      s ? { userId: s.userId, examId: s.examId, contextSnapshot: s.contextSnapshot, lastMessageAt: s.messages[0]?.createdAt ?? null } : null,
      { userId, examId, askedAt: turn.createdAt },
    );
    if (ok && s) intoId = s.id;
  }

  const turnId = `carry-${randomUUID()}`;
  const metadata = carriedQuestionMeta({ turnId, nowMs: now, askedAt: turn.createdAt, replyLang, topicCode: body.topicCode ?? null, logId: turn.id });
  const sessionId = intoId ?? randomUUID();
  try {
    if (intoId) {
      await prisma.$transaction([
        prisma.chatMessage.create({ data: { sessionId, role: "USER", content: turn.userMessage, createdAt: turn.createdAt, metadata } }),
        prisma.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date(now) } }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.chatSession.create({
          data: {
            id: sessionId,
            userId,
            examId,
            createdAt: new Date(turn.createdAt.getTime() - 1),
            // A copy of a guest turn (counted once, as /api/chat/import's copies are).
            contextSnapshot: { source: CARRY_SESSION_SOURCE, kind: "question", logId: turn.id, carriedAt: new Date(now).toISOString() },
          },
        }),
        prisma.chatMessage.create({ data: { sessionId, role: "USER", content: turn.userMessage, createdAt: turn.createdAt, metadata } }),
      ]);
    }
  } catch (err) {
    console.error("[chat/carry-question] write failed:", err);
    return Response.json({ error: "could not save" }, { status: 500 });
  }

  return Response.json({ saved: true, sessionId, turnId, text: turn.userMessage, appended: intoId != null });
}
